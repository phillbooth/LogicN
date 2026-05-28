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
}

export interface TypeCheckResult {
  readonly diagnostics: readonly TypeDiagnostic[];
}

// ---------------------------------------------------------------------------
// Diagnostic factory
//
// Branches explicitly on location/suggestedFix to satisfy
// exactOptionalPropertyTypes without assigning undefined to optional fields.
// ---------------------------------------------------------------------------

function makeTCDiag(
  code: string,
  name: string,
  message: string,
  location: SourceLocation | undefined,
  suggestedFix: string | undefined,
): TypeDiagnostic {
  if (location !== undefined && suggestedFix !== undefined) {
    return { code, name, severity: "error", message, location, suggestedFix };
  }
  if (location !== undefined) {
    return { code, name, severity: "error", message, location };
  }
  if (suggestedFix !== undefined) {
    return { code, name, severity: "error", message, suggestedFix };
  }
  return { code, name, severity: "error", message };
}

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
  "Bytes",
  // JSON
  "Json", "JsonNull", "JsonBool", "JsonNumber", "JsonString", "JsonArray", "JsonObject",
  // Collections
  "Array", "Set", "Map", "Channel",
  // Algebraic
  "Option", "Result",
  // Numeric science / compute
  "Vector", "Matrix", "Tensor",
  // Domain / financial
  "Money", "GBP", "USD", "EUR", "JPY",
  // HTTP / API
  "Request", "Response",
  // Error types
  "Error", "ApiError", "EmailError", "PaymentError", "ValidationError", "WebhookError",
]);

// ---------------------------------------------------------------------------
// Generic arity rules
// Canonical source: docs/Knowledge-Bases/formal-type-system-spec.md Section 3
// ---------------------------------------------------------------------------

const GENERIC_ARITY: ReadonlyMap<string, number> = new Map([
  ["Option",  1],
  ["Result",  2],
  ["Array",   1],
  ["Set",     1],
  ["Map",     2],
  ["Channel", 1],
  ["Vector",  2],
  ["Matrix",  3],
  ["Money",   1],
]);

// Example strings for each generic type — used in fix suggestions
const GENERIC_EXAMPLES: ReadonlyMap<string, string> = new Map([
  ["Option",  "Option<T>"],
  ["Result",  "Result<T, E>"],
  ["Array",   "Array<T>"],
  ["Set",     "Set<T>"],
  ["Map",     "Map<K, V>"],
  ["Channel", "Channel<T>"],
  ["Vector",  "Vector<T, N>"],
  ["Matrix",  "Matrix<T, R, C>"],
  ["Money",   "Money<GBP>"],
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

function parseTypeString(raw: string): ParsedTypeRef {
  const input = raw.trim();

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

  check(ast: AstNode): void {
    // Pass 1: Collect all user-defined type and enum names
    this.collectDeclarations(ast);
    // Pass 2: Validate all type references
    this.walkNode(ast);
  }

  getResult(): TypeCheckResult {
    return { diagnostics: [...this.diagnostics] };
  }

  // ── Declaration collection ────────────────────────────────────────────────

  private collectDeclarations(node: AstNode): void {
    if ((node.kind === "typeDecl" || node.kind === "enumDecl") && node.value) {
      this.userDefinedTypes.add(node.value.trim());
    }
    for (const child of node.children ?? []) {
      this.collectDeclarations(child);
    }
  }

  // ── AST walker ────────────────────────────────────────────────────────────

  private walkNode(node: AstNode): void {
    if (node.kind === "typeRef") {
      this.checkTypeRef(node.value ?? "", node.location);
      // The type value is fully in .value; no children to walk
      return;
    }

    // Extract the type annotation embedded in letDecl / mutDecl value strings
    if (node.kind === "letDecl" || node.kind === "mutDecl") {
      this.checkBindingTypeAnnotation(node);
    }

    for (const child of node.children ?? []) {
      this.walkNode(child);
    }
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

    // ── LLN-TYPE-001: Unknown type ──────────────────────────────────────────
    if (!BUILT_IN_TYPES.has(base) && !this.userDefinedTypes.has(base)) {
      const suggestion = this.fuzzyTypeSuggestion(base);
      this.diagnostics.push(makeTCDiag(
        "LLN-TYPE-001",
        "UnknownType",
        `Type '${base}' is not defined. It is not a built-in type and no 'type ${base}' or 'enum ${base}' declaration was found in scope.`,
        location,
        suggestion,
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
}

// ---------------------------------------------------------------------------
// Levenshtein distance (for fuzzy type suggestions)
// ---------------------------------------------------------------------------

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
