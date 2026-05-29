// =============================================================================
// LogicN Phase 6 — Type Checker
//
// Validates type references in the parsed AST against the built-in type set
// and user-defined declarations.
//
// Spec: docs/Knowledge-Bases/formal-type-system-spec.md
//
// Implemented diagnostics (Phase 6):
//   LLN-TYPE-001  UnknownType              — type name not in scope
//   LLN-TYPE-009  InvalidGenericInstantiation — wrong generic arity
//
// Phase 6 defers:
//   LLN-TYPE-002  TypeMismatch             — assignment compatibility
//   LLN-TYPE-003  InvalidNominalConversion — String → Email requires gate
//   LLN-TYPE-004..008  Operator / call / return type checking
//   LLN-TYPE-010..022  Constraint, collection, match, symbol checks
//   Module-level import resolution
// =============================================================================

import { type AstNode, type SourceLocation } from "./parser.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TypeDiagnostic {
  readonly code: string;
  readonly name: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly location?: SourceLocation;
  readonly suggestedFix?: string;
  /** Machine-applicable fix — the exact LogicN snippet to insert/replace, without prose. */
  readonly suggestedCode?: string;
}

export interface TypeCheckResult {
  readonly diagnostics: readonly TypeDiagnostic[];
}

// ---------------------------------------------------------------------------
// Diagnostic factory
//
// Branches explicitly on location/suggestedFix to satisfy
// exactOptionalPropertyTypes without assigning undefined to optional fields.
// suggestedCode is added via conditional spread — same safe pattern as parser.
// ---------------------------------------------------------------------------

function makeTCDiag(
  code: string,
  name: string,
  message: string,
  location: SourceLocation | undefined,
  suggestedFix: string | undefined,
  suggestedCode?: string,
): TypeDiagnostic {
  const sc = suggestedCode !== undefined ? { suggestedCode } : {};
  if (location !== undefined && suggestedFix !== undefined) {
    return { code, name, severity: "error", message, location, suggestedFix, ...sc };
  }
  if (location !== undefined) {
    return { code, name, severity: "error", message, location, ...sc };
  }
  if (suggestedFix !== undefined) {
    return { code, name, severity: "error", message, suggestedFix, ...sc };
  }
  return { code, name, severity: "error", message, ...sc };
}

// ---------------------------------------------------------------------------
// Inference markers
//
// These are NOT types — they are compile-time keywords that tell the type
// checker to defer resolution to the inference pass.
// Do NOT emit LLN-TYPE-001 for these names.
// Canonical source: docs/Knowledge-Bases/formal-type-system-spec.md §Auto
// ---------------------------------------------------------------------------

const INFERENCE_MARKERS: ReadonlySet<string> = new Set([
  "Auto",
]);

// ---------------------------------------------------------------------------
// Built-in type registry
// Canonical source: docs/Knowledge-Bases/formal-type-system-spec.md Section 2
// ---------------------------------------------------------------------------

const BUILT_IN_TYPES: ReadonlySet<string> = new Set([
  // Primitive
  "Bool", "Char", "Void",
  // Numeric
  "Int", "Int8", "Int16", "Int32", "Int64",
  "UInt8", "UInt16", "UInt32", "UInt64",
  "Float", "Float16", "Float32", "Float64", "Decimal",
  // Text
  "String", "SecureString",
  // Temporal
  "Timestamp", "Duration",
  // Binary
  "Byte", "Bytes", "ReadOnlyView",
  // JSON
  "Json", "JsonNull", "JsonBool", "JsonNumber", "JsonString", "JsonArray", "JsonObject",
  // Collections
  "Array", "Set", "Map", "Channel",
  // Algebraic
  "Option", "Result",
  // Numeric science / compute
  "Vector", "Matrix", "Tensor", "AnyTensor",
  // Domain / financial
  "Money", "GBP", "USD", "EUR", "JPY",
  // HTTP / API
  "Request", "Response",
  // Error types
  "Error", "ApiError", "EmailError", "PaymentError", "ValidationError", "WebhookError",
  "DecodeError",
  // Branded types
  "Brand",
]);

// ---------------------------------------------------------------------------
// Generic arity rules
// Canonical source: docs/Knowledge-Bases/formal-type-system-spec.md Section 3
// ---------------------------------------------------------------------------

const GENERIC_ARITY: ReadonlyMap<string, number> = new Map([
  ["Option",       1],
  ["Result",       2],
  ["Array",        1],
  ["Set",          1],
  ["Map",          2],
  ["Channel",      1],
  ["Vector",       2],
  ["Matrix",       3],
  ["Money",        1],
  ["Tensor",       2],  // Tensor<ElementType, Shape> — see logicn-tensor-arity-decision.md
  ["ReadOnlyView", 1],  // ReadOnlyView<T>
  ["Brand",        2],  // Brand<T, "Name">
]);

// Example strings for each generic type — used in fix suggestions (suggestedFix prose)
// and as suggestedCode (machine-applicable snippet)
const GENERIC_EXAMPLES: ReadonlyMap<string, string> = new Map([
  ["Option",       "Option<T>"],
  ["Result",       "Result<T, E>"],
  ["Array",        "Array<T>"],
  ["Set",          "Set<T>"],
  ["Map",          "Map<K, V>"],
  ["Channel",      "Channel<T>"],
  ["Vector",       "Vector<T, N>"],
  ["Matrix",       "Matrix<T, R, C>"],
  ["Money",        "Money<GBP>"],
  ["Tensor",       "Tensor<Float32, [Batch, Features]>"],
  ["ReadOnlyView", "ReadOnlyView<T>"],
  ["Brand",        "Brand<String, \"MyType\">"],
]);

// ---------------------------------------------------------------------------
// Type string parser
//
// Converts a raw type value string like "Result<User,ValidationError>" into
// { base: "Result", args: ["User", "ValidationError"] }.
//
// Handles:
//   - Plain types:              "Int"        → { base: "Int", args: [] }
//   - Generic types:            "Option<String>" → { base: "Option", args: ["String"] }
//   - Nested generics:          "Map<String,Array<Int>>"
//   - Postfix value-state words: "String unsafe" → { base: "String", args: [] }
//   - Numeric literal args:     "Matrix<Float32,4,4>" (4 is a numeric dim arg)
// ---------------------------------------------------------------------------

interface ParsedTypeRef {
  readonly base: string;
  readonly args: readonly string[];
}

const GOVERNANCE_QUALIFIER_PREFIXES = ["protected ", "redacted "] as const;

function parseTypeString(raw: string): ParsedTypeRef {
  let input = raw.trim();

  for (const prefix of GOVERNANCE_QUALIFIER_PREFIXES) {
    if (input.startsWith(prefix)) {
      input = input.slice(prefix.length).trim();
      break;
    }
  }

  const ltIdx = input.indexOf("<");
  const baseSection = ltIdx === -1 ? input : input.slice(0, ltIdx);
  // Strip postfix qualifiers (space-separated after the type name)
  const base = baseSection.split(/\s/)[0]?.trim() ?? baseSection;

  if (ltIdx === -1) {
    return { base, args: [] };
  }

  const gtIdx = input.lastIndexOf(">");
  if (gtIdx === -1) {
    // Malformed — missing closing >; return base only
    return { base, args: [] };
  }

  const innerStr = input.slice(ltIdx + 1, gtIdx).trim();
  if (innerStr === "") return { base, args: [] };

  // Split at top-level commas (not nested inside <...>)
  const args: string[] = [];
  let depth = 0;
  let current = "";

  for (const ch of innerStr) {
    if (ch === "<") {
      depth++;
      current += ch;
    } else if (ch === ">") {
      depth--;
      current += ch;
    } else if (ch === "," && depth === 0) {
      const trimmed = current.trim();
      if (trimmed !== "") args.push(trimmed);
      current = "";
    } else {
      current += ch;
    }
  }
  const lastArg = current.trim();
  if (lastArg !== "") args.push(lastArg);

  return { base, args };
}

// ---------------------------------------------------------------------------
// Type checker implementation
// ---------------------------------------------------------------------------

class TypeChecker {
  private readonly diagnostics: TypeDiagnostic[] = [];
  private readonly userDefinedTypes = new Set<string>();
  private readonly enumVariants = new Map<string, Set<string>>();
  private readonly bindingScopes: Array<Set<string>> = [];

  check(ast: AstNode): void {
    // Pass 1: Collect all user-defined type and enum names
    this.collectDeclarations(ast);
    // Pass 2: Validate all type references
    this.pushBindingScope();
    this.walkNode(ast);
    this.popBindingScope();
  }

  getResult(): TypeCheckResult {
    return { diagnostics: [...this.diagnostics] };
  }

  // ── Declaration collection ────────────────────────────────────────────────

  private collectDeclarations(node: AstNode): void {
    if ((node.kind === "typeDecl" || node.kind === "recordDecl" || node.kind === "enumDecl") && node.value) {
      this.userDefinedTypes.add(node.value.trim());
    }
    if (node.kind === "enumDecl" && node.value) {
      const variants = new Set<string>();
      for (const child of node.children ?? []) {
        if ((child.kind === "identifier" || child.kind === "enumVariant") && child.value) {
          variants.add(child.value.trim());
        }
      }
      if (variants.size > 0) {
        this.enumVariants.set(node.value.trim(), variants);
      }
    }
    for (const child of node.children ?? []) {
      this.collectDeclarations(child);
    }
  }

  private pushBindingScope(): void {
    this.bindingScopes.push(new Set());
  }

  private popBindingScope(): void {
    this.bindingScopes.pop();
  }

  private lookupBinding(name: string): boolean {
    for (let i = this.bindingScopes.length - 2; i >= 0; i--) {
      if (this.bindingScopes[i]!.has(name)) return true;
    }
    return false;
  }

  private lookupBindingInCurrentScope(name: string): boolean {
    return this.bindingScopes[this.bindingScopes.length - 1]?.has(name) ?? false;
  }

  private registerBinding(name: string): void {
    const scope = this.bindingScopes[this.bindingScopes.length - 1];
    if (scope !== undefined && name !== "") scope.add(name);
  }

  // ── AST walker ────────────────────────────────────────────────────────────

  private walkNode(node: AstNode): void {
    switch (node.kind) {
      case "flowDecl":
      case "secureFlowDecl":
      case "pureFlowDecl":
      case "guardedFlowDecl":
        this.pushBindingScope();
        for (const child of node.children ?? []) {
          if (child.kind === "paramDecl") {
            this.registerBinding(parseParamName(child.value ?? ""));
          }
        }
        for (const child of node.children ?? []) {
          this.walkNode(child);
        }
        this.popBindingScope();
        return;

      case "block":
        this.pushBindingScope();
        for (const child of node.children ?? []) {
          this.walkNode(child);
        }
        this.popBindingScope();
        return;

      case "identifier": {
        const val = node.value ?? "";
        if (val === "null" || val === "undefined") {
          this.diagnostics.push(makeTCDiag(
            "LLN-TYPE-008",
            "SilentNullDenied",
            `'${val}' is not a valid LogicN value. Use Option<T> to represent absence.`,
            node.location,
            `Use None for absent values, or Option<T> as the type annotation.`,
            val === "null" ? "None" : undefined,
          ));
        }
        return;
      }

      case "matchExpr":
        this.checkMatchExhaustiveness(node);
        for (const child of node.children ?? []) {
          this.walkNode(child);
        }
        return;

      default:
        break;
    }

    if (node.kind === "typeRef") {
      this.checkTypeRef(node.value ?? "", node.location);
      // The type value is fully in .value; no children to walk
      return;
    }

    // Extract the type annotation embedded in letDecl / mutDecl value strings
    if (node.kind === "letDecl" || node.kind === "mutDecl") {
      this.checkShadowedBinding(node);
      this.checkBindingTypeAnnotation(node);
    }

    for (const child of node.children ?? []) {
      this.walkNode(child);
    }
  }

  private checkShadowedBinding(node: AstNode): void {
    const bindingName = parseBindingName(node.value ?? "");
    if (bindingName === "") return;

    if (this.lookupBinding(bindingName) && !this.lookupBindingInCurrentScope(bindingName)) {
      this.diagnostics.push({
        code: "LLN-TYPE-020",
        name: "ShadowedBinding",
        severity: "warning",
        message: `Binding '${bindingName}' shadows an outer-scope binding with the same name.`,
        ...(node.location !== undefined ? { location: node.location } : {}),
        suggestedFix: `Rename this binding to avoid shadowing the outer '${bindingName}'.`,
      });
    }

    this.registerBinding(bindingName);
  }

  // ── Binding type annotation extraction ───────────────────────────────────

  private checkBindingTypeAnnotation(node: AstNode): void {
    // letDecl / mutDecl value format:
    //   [safetyPrefix " "] name ": " typeAnnotation
    // e.g. "unsafe rawEmail: String" or "counter: Int"
    let rest = (node.value ?? "").trim();

    // Strip safetyPrefix
    if (rest.startsWith("unsafe ")) rest = rest.slice("unsafe ".length).trim();
    else if (rest.startsWith("safe ")) rest = rest.slice("safe ".length).trim();

    const colonIdx = rest.indexOf(":");
    if (colonIdx === -1) return; // no type annotation

    const typeSection = rest.slice(colonIdx + 1).trim();
    if (typeSection === "") return;

    this.checkTypeRef(typeSection, node.location);
  }

  // ── Type reference validation ─────────────────────────────────────────────

  private checkTypeRef(rawValue: string, location: SourceLocation | undefined): void {
    if (rawValue === "" || rawValue === "<unknown>") return;

    const { base, args } = parseTypeString(rawValue);

    if (base === "") return;

    // Skip numeric literals used as dimension args (Matrix<Float32, 4, 4>)
    if (/^\d/.test(base)) return;

    // Skip inference markers — Auto defers to the inference pass, never LLN-TYPE-001
    if (INFERENCE_MARKERS.has(base)) return;

    // ── LLN-TYPE-001: Unknown type ──────────────────────────────────────────
    if (!BUILT_IN_TYPES.has(base) && !this.userDefinedTypes.has(base)) {
      const suggestion = this.fuzzyTypeSuggestion(base);
      const singleCandidate = this.fuzzySingleCandidate(base);
      this.diagnostics.push(makeTCDiag(
        "LLN-TYPE-001",
        "UnknownType",
        `Type '${base}' is not defined. It is not a built-in type and no 'type ${base}' or 'enum ${base}' declaration was found in scope.`,
        location,
        suggestion,
        singleCandidate,  // suggestedCode: unambiguous single match, undefined otherwise
      ));
      // Don't check arity of an unknown type — it would be noise
      return;
    }

    // ── LLN-TYPE-009: Generic arity mismatch ─────────────────────────────────
    const expectedArity = GENERIC_ARITY.get(base);
    if (expectedArity !== undefined) {
      const argCount = args.filter((a) => a.trim() !== "").length;
      if (argCount !== expectedArity) {
        const example = GENERIC_EXAMPLES.get(base) ?? `${base}<T>`;
        this.diagnostics.push(makeTCDiag(
          "LLN-TYPE-009",
          "InvalidGenericInstantiation",
          `Generic type '${base}' expects ${expectedArity} type argument${expectedArity === 1 ? "" : "s"} but received ${argCount}.`,
          location,
          `${base} requires exactly ${expectedArity} type argument${expectedArity === 1 ? "" : "s"}. Example: ${example}`,
          example,  // suggestedCode: the canonical example form, without prose
        ));
      }
    }

    // Recursively check each type argument
    for (const arg of args) {
      const trimmed = arg.trim();
      if (trimmed === "" || /^\d/.test(trimmed)) continue; // skip numeric dimension args
      // Pass parent location; source locations for nested args are Phase 7
      this.checkTypeRef(trimmed, location);
    }
  }

  // ── Fuzzy suggestion ──────────────────────────────────────────────────────

  private checkMatchExhaustiveness(node: AstNode): void {
    const arms = (node.children ?? []).slice(1);
    const armPatterns = new Set(
      arms.map((a) => a.value ?? "").filter((v) => v !== ""),
    );

    if (armPatterns.has("_")) return;

    if (armPatterns.has("Some") || armPatterns.has("None")) {
      const missing: string[] = [];
      if (!armPatterns.has("Some")) missing.push("Some");
      if (!armPatterns.has("None")) missing.push("None");
      if (missing.length > 0) {
        this.diagnostics.push(makeTCDiag(
          "LLN-TYPE-021",
          "NonExhaustiveMatch",
          `match is missing arm(s): ${missing.map((m) => `'${m}'`).join(", ")}.`,
          node.location,
          `Add the missing arm(s): ${missing.join(", ")}`,
          missing.length === 1 ? `${missing[0]} => ...` : undefined,
        ));
      }
      return;
    }

    if (armPatterns.has("Ok") || armPatterns.has("Err")) {
      const missing: string[] = [];
      if (!armPatterns.has("Ok")) missing.push("Ok");
      if (!armPatterns.has("Err")) missing.push("Err");
      if (missing.length > 0) {
        this.diagnostics.push(makeTCDiag(
          "LLN-TYPE-021",
          "NonExhaustiveMatch",
          `match is missing arm(s): ${missing.map((m) => `'${m}'`).join(", ")}.`,
          node.location,
          `Add the missing arm(s): ${missing.join(", ")}`,
          missing.length === 1 ? `${missing[0]}(value) => ...` : undefined,
        ));
      }
      return;
    }

    for (const [enumName, variants] of this.enumVariants) {
      const someMatch = [...armPatterns].some((p) => variants.has(p));
      if (someMatch) {
        const missing = [...variants].filter((v) => !armPatterns.has(v));
        if (missing.length > 0) {
          this.diagnostics.push(makeTCDiag(
            "LLN-TYPE-021",
            "NonExhaustiveMatch",
            `match on '${enumName}' is missing variant(s): ${missing.map((m) => `'${m}'`).join(", ")}.`,
            node.location,
            `Add the missing variant arm(s): ${missing.join(", ")}`,
          ));
        }
        return;
      }
    }
  }

  private fuzzyTypeSuggestion(typeName: string): string | undefined {
    const lower = typeName.toLowerCase();
    const candidates: string[] = [];

    for (const t of BUILT_IN_TYPES) {
      const tLower = t.toLowerCase();
      if (
        (lower.length >= 3 && tLower.startsWith(lower.slice(0, 3))) ||
        levenshtein(tLower, lower) <= 2
      ) {
        candidates.push(t);
      }
    }

    if (candidates.length === 1) {
      return `Did you mean '${candidates[0]}'?`;
    }
    if (candidates.length > 1 && candidates.length <= 4) {
      return `Did you mean one of: ${candidates.map((c) => `'${c}'`).join(", ")}?`;
    }
    return undefined;
  }

  /**
   * Returns the single unambiguous candidate type name when there is exactly
   * one fuzzy match — used as suggestedCode so tooling can apply the fix
   * directly without parsing prose.
   */
  private fuzzySingleCandidate(typeName: string): string | undefined {
    const lower = typeName.toLowerCase();
    const candidates: string[] = [];

    for (const t of BUILT_IN_TYPES) {
      const tLower = t.toLowerCase();
      if (
        (lower.length >= 3 && tLower.startsWith(lower.slice(0, 3))) ||
        levenshtein(tLower, lower) <= 2
      ) {
        candidates.push(t);
      }
    }

    return candidates.length === 1 ? candidates[0] : undefined;
  }
}

// ---------------------------------------------------------------------------
// Levenshtein distance (for fuzzy type suggestions)
// ---------------------------------------------------------------------------

function parseParamName(value: string): string {
  const colonIdx = value.indexOf(":");
  return (colonIdx === -1 ? value : value.slice(0, colonIdx)).trim();
}

function parseBindingName(value: string): string {
  let rest = value.trim();
  if (rest.startsWith("unsafe ")) rest = rest.slice("unsafe ".length).trim();
  else if (rest.startsWith("safe ")) rest = rest.slice("safe ".length).trim();

  const colonIdx = rest.indexOf(":");
  return (colonIdx === -1 ? rest : rest.slice(0, colonIdx)).trim();
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const m = a.length;
  const n = b.length;
  const row: number[] = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const val =
        a[i - 1] === b[j - 1]
          ? (row[j - 1] ?? j - 1)
          : 1 + Math.min(row[j] ?? j, prev, row[j - 1] ?? j - 1);
      row[j - 1] = prev;
      prev = val;
    }
    row[n] = prev;
  }

  return row[n] ?? 0;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Runs the type checker on a parsed LogicN AST.
 *
 * Call this after `parseProgram()`. The checker validates:
 *   - All type references resolve to a built-in or user-declared type
 *   - All generic type instantiations use the correct number of type arguments
 *
 * @param ast  The root `program` node from `parseProgram()`.
 * @returns    A result object containing all type diagnostics.
 */
export function checkTypes(ast: AstNode): TypeCheckResult {
  const checker = new TypeChecker();
  checker.check(ast);
  return checker.getResult();
}
