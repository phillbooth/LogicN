// =============================================================================
// LogicN Type Checker (Phase 6 → Phase 7A)
//
// Validates type references and structural rules in the parsed AST.
//
// Spec: docs/Knowledge-Bases/formal-type-system-spec.md
//
// Implemented diagnostics:
//   LLN-TYPE-001  UnknownType              — type name not in scope
//   LLN-TYPE-008  SilentNullDenied         — null / undefined used as value
//   LLN-TYPE-009  InvalidGenericInstantiation — wrong generic arity
//   LLN-TYPE-010  CollectionElementTypeMismatch — Array<T> element type mismatch
//   LLN-TYPE-017  NumericPrecisionLoss     — implicit numeric narrowing (warning)
//   LLN-TYPE-018  ProtectedBoundaryViolation — protected value assigned to plain type
//   LLN-TYPE-019  RedactedBoundaryViolation  — redacted value cannot revert to plain type
//   LLN-TYPE-020  ShadowedBinding          — binding shadows outer-scope name (warning)
//   LLN-TYPE-021  NonExhaustiveMatch       — match missing arm(s)
//   LLN-TYPE-022  UnreachablePattern       — arm after wildcard or exhausted set
//   LLN-NAME-002  DuplicateName            — same name declared twice in same scope
//
// Implemented (continued):
//   LLN-TYPE-003  InvalidNominalConversion — String → BrandedType requires gate (Phase 9A-2)
//   LLN-TYPE-004  InvalidBinaryOperation   — extended with String+non-String, Bool arithmetic,
//                                            String ordering comparisons
//   LLN-BINDING-005  ImmutableBindingReassigned — let/param reassignment rejected (Phase 11A.2)
//
// Deferred (require full expression type inference or call graph):
//   LLN-TYPE-002  TypeMismatch             — assignment compatibility (partial Phase 8A)
//   LLN-TYPE-005..007  Operator / call / return type checking
//   LLN-TYPE-011..016  MapKey, Tensor, Channel, Enum, Generic, constraint checks
//   Module-level import resolution
//
// Symbol resolver (LLN-NAME-001, LLN-NAME-003) lives in symbol-resolver.ts
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
  /** Rust-style: secondary source locations giving context (e.g. "declared here"). */
  readonly relatedLocations?: readonly { message: string; location: SourceLocation }[];
  /** Elm-style: why this is a problem. */
  readonly why?: string;
  /** Elm-style: what goes wrong if ignored. */
  readonly risk?: string;
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
  "Bool", "Boolean", "Char", "Void",
  // Numeric
  "Int", "Int8", "Int16", "Int32", "Int64",
  "UInt8", "UInt16", "UInt32", "UInt64",
  "Float", "Float16", "Float32", "Float64", "Double", "Decimal",
  // Text
  "String", "SecureString",
  // Temporal
  "Timestamp", "Duration",
  "Date", "Time", "DateTime",
  // Binary
  "Byte", "Bytes", "ReadOnlyView",
  // JSON
  "Json", "JsonNull", "JsonBool", "JsonNumber", "JsonString", "JsonArray", "JsonObject",
  // Collections
  "Array", "Set", "Map", "Channel",
  // Algebraic
  "Option", "Result",
  // Unit type — the singleton value type (like () in Haskell/Rust); returned by Ok(unit)
  "Unit",
  // List — canonical ordered collection alias for Array
  "List",
  // Numeric science / compute
  "Vector", "Matrix", "Tensor", "AnyTensor",
  // Compute / AI dimension labels
  "DynamicShape",
  // Domain / financial
  "Money", "GBP", "USD", "EUR", "JPY", "CHF", "CAD", "AUD",
  // HTTP / API
  "Request", "Response", "Context",
  // Error types
  "Error", "ApiError", "EmailError", "PaymentError", "ValidationError", "WebhookError",
  "DecodeError", "ParseError",
  // Branded types
  "Brand",
  // ── Security types ───────────────────────────────────────────────────────
  "Hash", "Signature", "Secret",
  // ── AI / ML types ────────────────────────────────────────────────────────
  "Prompt", "Embedding", "Classification", "ModelOutput", "Token",
  // ── Enterprise / governance types ────────────────────────────────────────
  "Policy", "AuditRecord", "AuditProof", "ExecutionPlan", "RuntimeReport",
  // ── Phase 11E: Domain identity types ────────────────────────────────────
  "Email", "Url", "Path", "Hostname", "Port", "CurrencyCode", "Reference",
  // Healthcare domain
  "PatientId", "NhsNumber", "PatientName", "DateOfBirth",
  // Financial domain
  "AccountId", "CardNumber", "SortCode", "TransactionId", "CustomerId",
  "OrderId",
  // Identity / access domain
  "UserId", "Actor", "TraceId", "TenantId", "Deadline",
  // ── Phase 11E: Domain error types ───────────────────────────────────────
  "AiError", "HealthError", "PatientError", "ReferralError", "NotificationError",
  "ExportError", "RecordError", "UserError", "OrderError",
  "AuthError", "PermissionError", "NetworkError",
  // ── Phase 11E: AI / ML types ────────────────────────────────────────────
  "Label", "ClassificationResult", "EmbeddingResult", "RiskScore",
  "Score",   // AI/ML generic confidence/relevance score
  // ── Phase 11E: Record / request / response types ─────────────────────────
  "PatientReadRequest", "PatientProfileResponse", "PatientProfileRequest",
  "CreatePatientRequest", "CreateOrderRequest", "CreateOrderResponse",
  // ── Phase 11E: import-resolved types (populated at runtime via import declarations) ──
  // These are registered here so the type checker accepts them without a local declaration.
  "PatientRecord", "HealthRecord", "ClinicalActor", "HealthRecord",
  "FinancialActor",
]);

// ---------------------------------------------------------------------------
// Generic arity rules
// Canonical source: docs/Knowledge-Bases/formal-type-system-spec.md Section 3
// ---------------------------------------------------------------------------

const GENERIC_ARITY: ReadonlyMap<string, number> = new Map([
  ["Option",       1],
  ["Result",       2],
  ["Array",        1],
  ["List",         1],  // List<T> — ordered collection alias for Array<T>
  ["Set",          1],
  ["Map",          2],
  ["Channel",      1],
  ["Vector",       2],
  ["Matrix",       3],
  ["Money",        1],
  ["Tensor",       2],  // Tensor<ElementType, Shape> — see logicn-tensor-arity-decision.md
  ["ReadOnlyView", 1],  // ReadOnlyView<T>
  ["Brand",        2],  // Brand<T, "Name">
  ["Embedding",    1],  // Embedding<768> — dimensioned embedding vector
  ["Secret",       1],  // Secret<ApiKey> — parameterised secret wrapper
]);

// Example strings for each generic type — used in fix suggestions (suggestedFix prose)
// and as suggestedCode (machine-applicable snippet)
const GENERIC_EXAMPLES: ReadonlyMap<string, string> = new Map([
  ["Option",       "Option<T>"],
  ["Result",       "Result<T, E>"],
  ["Array",        "Array<T>"],
  ["List",         "List<T>"],
  ["Set",          "Set<T>"],
  ["Map",          "Map<K, V>"],
  ["Channel",      "Channel<T>"],
  ["Vector",       "Vector<T, N>"],
  ["Matrix",       "Matrix<T, R, C>"],
  ["Money",        "Money<GBP>"],
  ["Tensor",       "Tensor<Float32, [Batch, Features]>"],
  ["ReadOnlyView", "ReadOnlyView<T>"],
  ["Brand",        "Brand<String, \"MyType\">"],
  ["Embedding",    "Embedding<768>"],
  ["Secret",       "Secret<ApiKey>"],
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
// Phase 8A — Type inference helpers
// ---------------------------------------------------------------------------

/** Numeric types that support arithmetic operators. */
const NUMERIC_TYPES: ReadonlySet<string> = new Set([
  "Int", "Int8", "Int16", "Int32", "Int64",
  "UInt8", "UInt16", "UInt32", "UInt64",
  "Float", "Float16", "Float32", "Float64",
  "Decimal", "Byte",
]);

/** Types that support ordering operators (<, <=, >, >=). */
const ORDERABLE_TYPES: ReadonlySet<string> = new Set([
  ...NUMERIC_TYPES, "Timestamp", "Duration", "String",
]);

/**
 * Returns true when a value of `inferred` type can be used where `declared`
 * type is expected. Phase 8A: covers literals, numeric widening, and
 * algebraic wrappers.
 */
function isAssignmentCompatible(declared: string, inferred: string): boolean {
  if (declared === inferred) return true;
  if (declared === "Auto" || declared === "" || inferred === "") return true;

  // Strip governance qualifiers (protected/redacted) from inferred before comparing.
  // "protected Email" is assignment-compatible with "Email" because the qualifier
  // is additive. LLN-TYPE-018/019 handle the reverse case (plain X ← protected X).
  let nInferred = inferred;
  if (nInferred.startsWith("protected ")) nInferred = nInferred.slice(10).trim();
  else if (nInferred.startsWith("redacted ")) nInferred = nInferred.slice(9).trim();
  if (declared === nInferred) return true;

  // Strip generic args for comparison
  const declaredBase = declared.split("<")[0]?.trim() ?? declared;
  const inferredBase = nInferred.split("<")[0]?.trim() ?? nInferred;
  if (declaredBase === inferredBase) return true;

  // Numeric widening: Int literal is compatible with all numeric types
  if (nInferred === "Int"     && NUMERIC_TYPES.has(declared)) return true;
  if (nInferred === "Float"   && (declared === "Float"   || declared.startsWith("Float"))) return true;
  if (nInferred === "Decimal" && (declared === "Decimal" || declared.startsWith("Float"))) return true;
  if (nInferred === "Byte"    && (declared === "Byte"    || declared === "UInt8"))          return true;

  // Algebraic type wrappers — coarse match for Phase 8A
  if (inferredBase === "Result"  && declaredBase === "Result")  return true;
  if (inferredBase === "Option"  && declaredBase === "Option")  return true;
  if (inferredBase === "Money"   && declaredBase === "Money")   return true;

  // Void for bare return in Void flows
  if (nInferred === "Void" && declared === "Void") return true;

  return false;
}

// ---------------------------------------------------------------------------
// Type checker implementation
// ---------------------------------------------------------------------------

class TypeChecker {
  private readonly diagnostics: TypeDiagnostic[] = [];
  private readonly userDefinedTypes: Set<string>;
  private readonly enumVariants = new Map<string, Set<string>>();
  private readonly bindingScopes: Array<Set<string>> = [];

  constructor(importedTypes: readonly string[] = []) {
    this.userDefinedTypes = new Set(importedTypes);
  }
  /**
   * Phase 9A-2: user-defined types declared as `type X = Brand<T, "Name">`.
   * Bindings with these declared types require a validation gate — direct
   * String assignment (or unsafe let) is rejected with LLN-TYPE-003.
   */
  private readonly brandedTypes = new Set<string>();

  // ── Phase 11A.2: binding kind tracking (let / mut / readonly) ────────────
  /** Per-scope map from binding name → declaration kind (for reassignment checks). */
  private readonly bindingKindScopes: Array<Map<string, "let" | "mut" | "readonly">> = [];

  // ── Phase 8A: type inference state ───────────────────────────────────────
  /** Maps binding name → inferred base type string (per scope). */
  private readonly typeScopes: Array<Map<string, string>> = [];
  /** Flow return type registry, built during collectDeclarations. */
  private readonly flowReturnTypes = new Map<string, string>();
  /** Flow parameter type list, built during collectDeclarations. */
  private readonly flowParamTypes = new Map<string, readonly string[]>();
  /** Declared return type of the flow currently being walked. */
  private currentReturnType = "";

  check(ast: AstNode): void {
    // Pass 1: Collect all user-defined type, enum, and flow signature names
    this.collectDeclarations(ast);
    // Pass 2: Validate all type references and infer/check types
    this.pushBindingScope();
    this.pushTypeScope();
    this.walkNode(ast);
    this.popTypeScope();
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

    // Phase 9A-2: detect Brand<T, "Name"> aliases → register as branded type
    // These types require a validation gate before assignment (LLN-TYPE-003).
    if (node.kind === "typeDecl" && node.value) {
      const aliasChild = node.children?.[0];
      if (aliasChild?.kind === "typeRef") {
        const parsed = parseTypeString(aliasChild.value ?? "");
        if (parsed.base === "Brand") {
          this.brandedTypes.add(node.value.trim());
        }
      }
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

    // Phase 8A: Build flow signature registry for call argument checking
    const FLOW_DECL_KINDS = new Set([
      "flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl",
    ]);
    if (FLOW_DECL_KINDS.has(node.kind) && node.value) {
      const children = node.children ?? [];
      // Extract return type from the first typeRef child (the return type annotation)
      const retTypeNode = children.find((c) => c.kind === "typeRef");
      if (retTypeNode?.value) {
        this.flowReturnTypes.set(node.value, parseTypeString(retTypeNode.value).base);
      }
      // Extract parameter types
      const paramTypes = children
        .filter((c) => c.kind === "paramDecl")
        .map((c) => {
          const typeRef = c.children?.find((t) => t.kind === "typeRef");
          return typeRef?.value ? parseTypeString(typeRef.value).base : "";
        });
      this.flowParamTypes.set(node.value, paramTypes);
    }

    for (const child of node.children ?? []) {
      this.collectDeclarations(child);
    }
  }

  private pushBindingScope(): void {
    this.bindingScopes.push(new Set());
    this.bindingKindScopes.push(new Map());
  }

  private popBindingScope(): void {
    this.bindingScopes.pop();
    this.bindingKindScopes.pop();
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

  // ── Phase 11A.2: binding kind registration + lookup ──────────────────────

  private registerBindingKind(name: string, kind: "let" | "mut" | "readonly"): void {
    const scope = this.bindingKindScopes[this.bindingKindScopes.length - 1];
    if (scope !== undefined && name !== "") scope.set(name, kind);
  }

  /** Walk all scopes innermost-first; returns undefined if not found. */
  private lookupBindingKind(name: string): "let" | "mut" | "readonly" | undefined {
    for (let i = this.bindingKindScopes.length - 1; i >= 0; i--) {
      const kind = this.bindingKindScopes[i]!.get(name);
      if (kind !== undefined) return kind;
    }
    return undefined;
  }

  // ── Phase 8A: type scope management ──────────────────────────────────────

  private pushTypeScope(): void {
    this.typeScopes.push(new Map());
  }

  private popTypeScope(): void {
    this.typeScopes.pop();
  }

  private registerBindingType(name: string, type: string): void {
    const scope = this.typeScopes[this.typeScopes.length - 1];
    if (scope !== undefined && name !== "" && type !== "") scope.set(name, type);
  }

  private lookupBindingType(name: string): string | undefined {
    for (let i = this.typeScopes.length - 1; i >= 0; i--) {
      const t = this.typeScopes[i]!.get(name);
      if (t !== undefined) return t;
    }
    return undefined;
  }

  /**
   * Infers the base type of an expression node.
   * Phase 8A: covers literals, bound identifiers, and simple binary expressions.
   * Returns undefined when type cannot be determined without full inference.
   */
  private inferType(node: AstNode): string | undefined {
    switch (node.kind) {
      case "numberLiteral": {
        const v = node.value ?? "";
        if (v.startsWith("0x") || v.startsWith("0b") || v.startsWith("0o")) return "Byte";
        if (v.includes(".")) return "Float";
        return "Int";
      }
      case "stringLiteral": return "String";
      case "charLiteral":   return "Char";
      case "boolLiteral":   return "Bool";

      case "identifier": {
        const name = node.value ?? "";
        if (name === "None")           return "Option";
        if (name === "true" || name === "false") return "Bool";
        if (name === "null" || name === "undefined") return "Null"; // caught separately
        // Return the full stored type (may include generic args: "Money<GBP>")
        return this.lookupBindingType(name);
      }

      case "memberExpr": {
        // member.field — infer base type from the receiver, then the field type
        const receiverNode = node.children?.[0];
        if (receiverNode === undefined) return undefined;
        const receiverType = this.inferType(receiverNode);
        const field = node.value ?? "";

        if (receiverType === undefined) return undefined;

        // Request object fields — any field access on Request → String
        // This is the common case: request.body.email, request.params.id, etc.
        if (receiverType === "Request") return "String";

        // Protected/redacted wrapper: protected Email → access returns String
        if (receiverType.startsWith("protected ") || receiverType.startsWith("redacted ")) {
          return "String";
        }

        // Record field access: if the receiver is a known record type,
        // try to look up the field type from the record schema
        // For now: return String as a conservative approximation for field access
        // More accurate inference comes in Phase 11B with full type propagation
        if (field !== "" && receiverType !== "") {
          // Common HTTP/API fields
          if (field === "body" || field === "params" || field === "query" || field === "headers") {
            return "String";
          }
          if (field === "id" || field === "name" || field === "email" || field === "status" || field === "message") {
            return "String";
          }
          // Numeric fields
          if (field === "length" || field === "count" || field === "size") return "Int";
          if (field === "amount" || field === "score" || field === "value") return "Decimal";
          // Boolean fields
          if (field === "ok" || field === "success" || field === "active" || field === "enabled") return "Bool";
        }

        // For any other field access, conservatively return undefined
        // (let later passes handle it)
        return undefined;
      }

      case "listLiteral": {
        const firstElement = node.children?.[0];
        if (firstElement !== undefined) {
          const elemType = this.inferType(firstElement);
          if (elemType !== undefined) return `Array<${elemType}>`;
        }
        return "Array";
      }

      case "callExpr": {
        const method = node.value ?? "";
        // Algebraic constructors
        if (method === "Ok" || method === "Err") return "Result";
        if (method === "Some")                   return "Option";
        if (method === "Decimal")                return "Decimal";
        // Money constructors (receiver = Money)
        if (method === "gbp" || method === "usd" || method === "eur" || method === "jpy") return "Money";
        // Record literal { field: value }
        if (method === "#record") return "Record";

        // Existing: use flowReturnTypes
        const knownReturn = this.flowReturnTypes.get(method);
        if (knownReturn !== undefined) return knownReturn;

        // Stdlib return type inference
        const receiverNode = node.children?.[0];
        const receiverType = receiverNode !== undefined ? this.inferType(receiverNode) : undefined;

        // Validation gates: validate.email(raw) → protected Email
        if (method === "email" && receiverType === undefined) return "protected Email";
        if (method.startsWith("validate.")) return "protected String";

        // protect/redact helpers
        if (method === "redact") return `redacted ${receiverType ?? ""}`.trim();
        if (method === "protect") return `protected ${receiverType ?? ""}`.trim();

        // String methods → String
        if (receiverType === "String") {
          if (["toLower", "toUpper", "trim", "trimStart", "trimEnd", "replace", "replaceAll", "slice"].includes(method)) {
            return "String";
          }
          if (["length", "charCount", "indexOf", "lastIndexOf"].includes(method)) return "Int";
          if (["startsWith", "endsWith", "contains", "isEmpty"].includes(method)) return "Bool";
        }

        // Array/list methods
        if (receiverType?.startsWith("Array") || receiverType === "Array") {
          if (method === "length" || method === "count") return "Int";
          if (method === "isEmpty") return "Bool";
        }

        // Map methods
        if (receiverType?.startsWith("Map<") || receiverType === "Map") {
          if (method === "size") return "Int";
          if (method === "has") return "Bool";
          if (method === "isEmpty") return "Bool";
          if (method === "get") {
            // Map<K,V>.get() → Option<V>
            const match = receiverType?.match(/^Map<[^,]+,\s*([^>]+)>/);
            if (match?.[1] !== undefined) return `Option<${match[1].trim()}>`;
            return "Option";
          }
        }

        // Timestamp/Duration methods
        if (method === "toMs" || method === "toSeconds" || method === "toMinutes") return "Int";
        if (method === "toIso" || method === "toString" || method === "format") return "String";
        if (method === "add" || method === "subtract") {
          if (receiverType?.includes("Timestamp")) return "Timestamp";
          if (receiverType?.includes("Duration")) return "Duration";
        }
        if (method === "before" || method === "after" || method === "equals") return "Bool";

        // Option methods
        if (receiverType === "Option" || receiverType?.startsWith("Option<")) {
          if (method === "isSome" || method === "isNone") return "Bool";
          if (method === "unwrapOr") return undefined; // returns T
          if (method === "map") return "Option"; // returns Option<mapped>
        }

        // Result methods
        if (receiverType === "Result" || receiverType?.startsWith("Result<")) {
          if (method === "isOk" || method === "isErr") return "Bool";
          if (method === "map" || method === "mapErr") return "Result";
        }

        // Numeric methods
        if (["toFixed", "toString"].includes(method)) return "String";
        if (["floor", "ceil", "round", "abs"].includes(method)) {
          return receiverType === "Float" ? "Float" : "Int";
        }
        if (["clamp", "min", "max"].includes(method)) return receiverType ?? "Int";
        if (method === "toInt") return "Result";
        if (method === "toFloat") return "Result";

        // Bytes methods
        if (receiverType === "Bytes") {
          if (method === "length" || method === "size") return "Int";
          if (method === "isEmpty") return "Bool";
          if (method === "toHex" || method === "toBase64" || method === "sha256Hex") return "String";
          if (method === "sha256") return "Bytes";
          if (method === "decode" || method === "toString") return "Result";
        }

        return undefined;
      }

      case "errorPropagation": {
        const inner = node.children?.[0];
        if (inner === undefined) return undefined;
        const innerType = this.inferType(inner);
        // ? on Result<T, E> → infers T (the Ok branch)
        if (innerType === "Result" || innerType?.startsWith("Result<")) {
          const match = innerType?.match(/^Result<([^,>]+)/);
          return match?.[1]?.trim() ?? undefined;
        }
        // ? on Option<T> → infers T
        if (innerType === "Option" || innerType?.startsWith("Option<")) {
          const match = innerType?.match(/^Option<([^>]+)/);
          return match?.[1]?.trim() ?? undefined;
        }
        return innerType;
      }

      case "binaryExpr": {
        const op = node.value ?? "";
        const left  = node.children?.[0];
        const right = node.children?.[1];
        if (!left || !right) return undefined;
        const leftType  = this.inferType(left);
        const rightType = this.inferType(right);
        if (!leftType || !rightType) return undefined;
        // String concatenation
        if (op === "+" && leftType === "String" && rightType === "String") return "String";
        // Comparison and logical → Bool
        if (["==","!=","<","<=",">",">=","&&","||"].includes(op)) return "Bool";
        // Numeric arithmetic → numeric result
        if (NUMERIC_TYPES.has(leftType) && NUMERIC_TYPES.has(rightType)) {
          if (leftType === "Decimal" || rightType === "Decimal") return "Decimal";
          if (leftType === "Float"   || rightType === "Float")   return "Float";
          return leftType;
        }
        return undefined;
      }

      case "unaryExpr": {
        const op = node.value ?? "";
        if (op === "!")  return "Bool";
        const operand = node.children?.[0];
        return operand ? this.inferType(operand) : undefined;
      }

      default:
        return undefined;
    }
  }

  // ── AST walker ────────────────────────────────────────────────────────────

  private walkNode(node: AstNode): void {
    switch (node.kind) {
      case "flowDecl":
      case "secureFlowDecl":
      case "pureFlowDecl":
      case "guardedFlowDecl": {
        // Save + set the current flow's return type for return statement checking
        const prevReturnType = this.currentReturnType;
        this.currentReturnType = this.flowReturnTypes.get(node.value ?? "") ?? "";
        this.pushBindingScope();
        this.pushTypeScope();
        // Register params first so they're in scope throughout the body
        for (const child of node.children ?? []) {
          if (child.kind === "paramDecl") {
            const paramName = parseParamName(child.value ?? "");
            this.registerBinding(paramName);
            // Phase 11A.2: flow parameters are immutable (readonly) by default
            this.registerBindingKind(paramName, "readonly");
            // Register param type for inference.
            // Use the full type string (including generic args) so that Money<GBP>
            // parameters carry their currency parameter through to cross-currency checks.
            const typeRef = child.children?.find((c) => c.kind === "typeRef");
            if (typeRef?.value) {
              const parsed = parseTypeString(typeRef.value);
              // Preserve generic args for Money (cross-currency checks) and other
              // parameterised types; fall back to base for simple types.
              const fullType = parsed.args.length > 0
                ? `${parsed.base}<${parsed.args.join(",")}>`
                : parsed.base;
              this.registerBindingType(paramName, fullType);
            }
            for (const typeChild of child.children ?? []) {
              if (typeChild.kind === "typeRef") {
                this.checkTypeRef(typeChild.value ?? "", typeChild.location);
              }
            }
          }
        }
        for (const child of node.children ?? []) {
          this.walkNode(child);
        }
        this.popTypeScope();
        this.popBindingScope();
        this.currentReturnType = prevReturnType;
        return;
      }

      case "fnDecl": {
        // fn gets its own scope for parameters; save return type
        const prevReturnTypeFn = this.currentReturnType;
        this.currentReturnType = "";
        this.pushBindingScope();
        this.pushTypeScope();
        for (const child of node.children ?? []) {
          if (child.kind === "paramDecl") {
            const paramName = parseParamName(child.value ?? "");
            this.registerBinding(paramName);
            // Phase 11A.2: fn parameters are also immutable (readonly)
            this.registerBindingKind(paramName, "readonly");
            const typeRef = child.children?.find((c) => c.kind === "typeRef");
            if (typeRef?.value) {
              this.registerBindingType(paramName, parseTypeString(typeRef.value).base);
            }
            for (const typeChild of child.children ?? []) {
              if (typeChild.kind === "typeRef") {
                this.checkTypeRef(typeChild.value ?? "", typeChild.location);
              }
            }
          }
        }
        for (const child of node.children ?? []) {
          this.walkNode(child);
        }
        this.popTypeScope();
        this.popBindingScope();
        this.currentReturnType = prevReturnTypeFn;
        return;
      }

      case "block":
        this.pushBindingScope();
        this.pushTypeScope();
        for (const child of node.children ?? []) {
          this.walkNode(child);
        }
        this.popTypeScope();
        this.popBindingScope();
        return;

      // ── Phase 8A: return type checking ─────────────────────────────────────
      case "returnStmt": {
        const returnExpr = node.children?.[0];
        if (returnExpr !== undefined && this.currentReturnType !== "" && this.currentReturnType !== "Void") {
          const inferredType = this.inferType(returnExpr);
          if (inferredType !== undefined) {
            // Allow Ok/Err/Some/None for Result/Option return types
            const isOkErrReturn = returnExpr.kind === "callExpr" &&
              (returnExpr.value === "Ok" || returnExpr.value === "Err" || returnExpr.value === "Some");
            const declaredBase = this.currentReturnType.split("<")[0]?.trim() ?? this.currentReturnType;
            if (!isOkErrReturn && !isAssignmentCompatible(declaredBase, inferredType)) {
              this.diagnostics.push(makeTCDiag(
                "LLN-TYPE-008",
                "InvalidReturnType",
                `Flow declares return type '${this.currentReturnType}' but this return expression has type '${inferredType}'.`,
                node.location,
                `Return a value of type '${this.currentReturnType}', or correct the flow return type declaration.`,
              ));
            }
          }
        }
        for (const child of node.children ?? []) this.walkNode(child);
        return;
      }

      // ── Phase 11A.2: assignment to existing binding (LLN-BINDING-005) ───────
      case "assignStmt": {
        const targetName = node.value ?? "";
        if (targetName !== "") {
          const kind = this.lookupBindingKind(targetName);
          if (kind === "let" || kind === "readonly") {
            this.diagnostics.push(makeTCDiag(
              "LLN-BINDING-005",
              "IMMUTABLE_BINDING_REASSIGNED",
              `Cannot reassign immutable binding '${targetName}'. Use 'mut' if reassignment is intended.`,
              node.location,
              `Change the declaration to: mut ${targetName}: ...`,
            ));
          }
        }
        for (const child of node.children ?? []) this.walkNode(child);
        return;
      }

      // ── Phase 8A: binary operator type checking ───────────────────────────
      case "binaryExpr": {
        const op = node.value ?? "";
        const leftNode  = node.children?.[0];
        const rightNode = node.children?.[1];
        if (leftNode !== undefined && rightNode !== undefined) {
          const leftType  = this.inferType(leftNode);
          const rightType = this.inferType(rightNode);
          if (leftType !== undefined && rightType !== undefined) {
            this.checkBinaryOperatorTypes(op, leftType, rightType, node.location);
          }
        }
        for (const child of node.children ?? []) this.walkNode(child);
        return;
      }

      // ── Phase 8A: call argument count checking ────────────────────────────
      case "callExpr": {
        const flowName = node.value ?? "";
        const paramTypes = this.flowParamTypes.get(flowName);
        if (paramTypes !== undefined) {
          // children[0] may be receiver — args start after receiver for method calls
          const isMethodCall = node.children?.[0]?.kind === "identifier" ||
            node.children?.[0]?.kind === "memberExpr";
          const argNodes = isMethodCall ? (node.children ?? []).slice(1) : (node.children ?? []);

          // LLN-TYPE-007: wrong argument count
          if (argNodes.length !== paramTypes.length) {
            this.diagnostics.push(makeTCDiag(
              "LLN-TYPE-007",
              "InvalidArgumentCount",
              `Flow '${flowName}' expects ${paramTypes.length} argument${paramTypes.length === 1 ? "" : "s"} but received ${argNodes.length}.`,
              node.location,
              `Provide exactly ${paramTypes.length} argument${paramTypes.length === 1 ? "" : "s"} to '${flowName}'.`,
            ));
          } else {
            // LLN-TYPE-006: argument type mismatch (for inferrable types only)
            for (let i = 0; i < argNodes.length; i++) {
              const argNode = argNodes[i];
              const expectedType = paramTypes[i];
              if (argNode === undefined || !expectedType) continue;
              const inferredArgType = this.inferType(argNode);
              if (inferredArgType !== undefined && !isAssignmentCompatible(expectedType, inferredArgType)) {
                this.diagnostics.push(makeTCDiag(
                  "LLN-TYPE-006",
                  "InvalidCallArgument",
                  `Argument ${i + 1} to '${flowName}' expects '${expectedType}' but received '${inferredArgType}'.`,
                  argNode.location,
                  `Pass a value of type '${expectedType}' as argument ${i + 1}.`,
                ));
              }
            }
          }
        }
        for (const child of node.children ?? []) this.walkNode(child);
        return;
      }

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

    // Extract the type annotation embedded in letDecl / mutDecl / readonlyDecl value strings
    if (node.kind === "letDecl" || node.kind === "mutDecl" || node.kind === "readonlyDecl") {
      this.checkShadowedBinding(node);
      this.checkBindingTypeAnnotation(node);
      // Phase 8A: register binding type and check assignment compatibility
      this.checkAndRegisterBindingType(node);
      // Phase 11A.2: register binding kind for reassignment enforcement
      const bkName = parseBindingName(node.value ?? "");
      if (bkName !== "") {
        const declKind: "let" | "mut" | "readonly" =
          node.kind === "mutDecl" ? "mut"
          : node.kind === "readonlyDecl" ? "readonly"
          : "let";
        this.registerBindingKind(bkName, declKind);
      }
    }

    for (const child of node.children ?? []) {
      this.walkNode(child);
    }
  }

  private checkShadowedBinding(node: AstNode): void {
    const bindingName = parseBindingName(node.value ?? "");
    if (bindingName === "") return;

    if (this.lookupBindingInCurrentScope(bindingName)) {
      // ── LLN-NAME-002: Duplicate name in the SAME scope ─────────────────────
      this.diagnostics.push({
        code: "LLN-NAME-002",
        name: "DuplicateName",
        severity: "error",
        message: `'${bindingName}' is already declared in this scope.`,
        ...(node.location !== undefined ? { location: node.location } : {}),
        suggestedFix: `Rename this binding — '${bindingName}' was already declared earlier in the same block.`,
      });
    } else if (this.lookupBinding(bindingName)) {
      // ── LLN-TYPE-020: Shadowing an OUTER scope binding ─────────────────────
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

  // ── Phase 8A: binding type registration + assignment checking ────────────

  private checkAndRegisterBindingType(node: AstNode): void {
    // Preserve the raw value before stripping prefixes (needed for unsafe-let detection below)
    const rawNodeValue = (node.value ?? "").trim();
    const isUnsafeLet = rawNodeValue.startsWith("unsafe ");

    let rest = rawNodeValue;
    if (rest.startsWith("unsafe ")) rest = rest.slice("unsafe ".length).trim();
    else if (rest.startsWith("safe "))   rest = rest.slice("safe ".length).trim();

    const colonIdx = rest.indexOf(":");
    const bindingName = (colonIdx === -1 ? rest : rest.slice(0, colonIdx)).trim();
    if (bindingName === "") return;

    // Extract the declared type annotation
    if (colonIdx !== -1) {
      const typeSection = rest.slice(colonIdx + 1).trim();
      const declaredBase = parseTypeString(typeSection).base;

      if (declaredBase !== "" && declaredBase !== "Auto") {
        // Register the binding with its declared type.
        // For generic types (Money<GBP>, Tensor<Float32,...>), preserve the full
        // type annotation so cross-generic comparisons (e.g. Money<GBP> vs Money<USD>)
        // can be detected. Strip governance qualifiers first.
        let registeredType = typeSection;
        for (const q of ["protected ", "redacted "]) {
          if (registeredType.startsWith(q)) { registeredType = registeredType.slice(q.length).trim(); break; }
        }
        this.registerBindingType(bindingName, registeredType !== "" ? registeredType : declaredBase);

        // Phase 8A: check assignment compatibility with init expression
        // Skip LLN-TYPE-002 when the declared type has a governance qualifier (protected/redacted)
        // — those bindings accept inferred protected/redacted types and the boundary checks
        // (LLN-TYPE-018/019) cover the reverse direction.
        const hasGovernanceQualifier = typeSection.startsWith("protected ") || typeSection.startsWith("redacted ");
        const initNode = node.children?.[0];
        if (!hasGovernanceQualifier && initNode !== undefined) {
          const inferredType = this.inferType(initNode);
          if (inferredType !== undefined && !isAssignmentCompatible(declaredBase, inferredType)) {
            this.diagnostics.push(makeTCDiag(
              "LLN-TYPE-002",
              "TypeMismatch",
              `Cannot assign '${inferredType}' to '${declaredBase}'. The declared type and the value type are incompatible.`,
              node.location,
              `Change the value to a '${declaredBase}' expression, or update the type annotation.`,
              inferredType === "Int" && NUMERIC_TYPES.has(declaredBase)
                ? undefined  // numeric widening — no code suggestion needed
                : undefined,
            ));
          }
        }

        // Phase 9A-2: LLN-TYPE-003 — branded type enforcement
        // A branded type (e.g. CustomerId = Brand<String, "CustomerId">) cannot be
        // assigned a raw String. The value must pass through a validation gate first.
        if (this.brandedTypes.has(declaredBase)) {
          // Case 1: `unsafe let x: BrandedType = ...` is always invalid.
          // The unsafe prefix means boundary-origin data — it bypasses the gate.
          let emitBrandedError = isUnsafeLet;
          // Case 2: inferred init type is String/SecureString — direct string literal
          // or an identifier known to be String is assigned without validation.
          if (!emitBrandedError && initNode !== undefined) {
            const inferredInitType = this.inferType(initNode);
            if (inferredInitType === "String" || inferredInitType === "SecureString") {
              emitBrandedError = true;
            }
          }
          if (emitBrandedError) {
            const gateName = `validate.${declaredBase.charAt(0).toLowerCase()}${declaredBase.slice(1)}`;
            this.diagnostics.push(makeTCDiag(
              "LLN-TYPE-003",
              "InvalidNominalConversion",
              `Cannot assign a raw String to branded type '${declaredBase}'. `
                + `Branded types require a validation gate (e.g. ${gateName}(raw)?).`,
              node.location,
              `Replace direct assignment with a validation gate call.`,
              `${gateName}(raw)?`,
            ));
          }
        }

        // LLN-TYPE-018 / LLN-TYPE-019: protected/redacted boundary violations
        // Only check when the declared type is plain (no protection qualifier)
        if (declaredBase !== "" && !typeSection.startsWith("protected ") && !typeSection.startsWith("redacted ")) {
          const initNode2 = node.children?.[0];
          if (initNode2 !== undefined) {
            const inferredRhsType = this.inferType(initNode2);
            if (inferredRhsType?.startsWith("protected ")) {
              const protectedBase = inferredRhsType.slice("protected ".length).trim();
              // Only flag if the base types match (it's clearly the same domain type)
              if (protectedBase === declaredBase || protectedBase.endsWith(declaredBase)) {
                this.diagnostics.push(makeTCDiag(
                  "LLN-TYPE-018",
                  "ProtectedBoundaryViolation",
                  `Cannot assign 'protected ${protectedBase}' to '${declaredBase}'. The 'protected' qualifier is part of the type — either the binding should be 'protected ${declaredBase}', or the value must go through an authorised access gate.`,
                  node.location,
                  `Change the type annotation to: protected ${protectedBase}`,
                  `protected ${protectedBase}`,
                ));
              }
            }
            // LLN-TYPE-019: redacted X assigned where plain X is required
            if (inferredRhsType?.startsWith("redacted ")) {
              const redactedBase = inferredRhsType.slice("redacted ".length).trim();
              if (redactedBase === declaredBase || redactedBase.endsWith(declaredBase)) {
                this.diagnostics.push(makeTCDiag(
                  "LLN-TYPE-019",
                  "RedactedBoundaryViolation",
                  `Cannot convert 'redacted ${redactedBase}' back to '${declaredBase}'. Redaction is irreversible — a redacted value cannot be de-redacted.`,
                  node.location,
                  `Use the redacted value as-is, or do not redact it before this point.`,
                ));
              }
            }
          }
        }

        // LLN-TYPE-010: Array<T> element type mismatch
        if (declaredBase === "Array") {
          const parsed = parseTypeString(typeSection);
          const elementType = parsed.args[0];
          if (elementType && elementType !== "" && initNode !== undefined) {
            if (initNode.kind === "listLiteral") {
              for (const element of initNode.children ?? []) {
                const elemInferred = this.inferType(element);
                if (elemInferred !== undefined && elemInferred !== elementType &&
                    !isAssignmentCompatible(elementType, elemInferred)) {
                  this.diagnostics.push(makeTCDiag(
                    "LLN-TYPE-010",
                    "CollectionElementTypeMismatch",
                    `Array<${elementType}> contains a '${elemInferred}' element. All elements must be '${elementType}'.`,
                    element.location,
                    `Change the element to a '${elementType}' value, or change the array type to Array<${elemInferred}>.`,
                  ));
                }
              }
            }
          }
        }

        // LLN-TYPE-017: numeric precision loss (warning)
        const PRECISION_ORDER: ReadonlyMap<string, number> = new Map([
          ["Float16", 1], ["Float32", 2], ["Float", 3], ["Float64", 4],
          ["Int8", 1], ["Int16", 2], ["Int32", 3], ["Int", 4], ["Int64", 5],
        ]);
        const declaredPrecision = PRECISION_ORDER.get(declaredBase);
        const inferredPrecision = initNode !== undefined ? PRECISION_ORDER.get(this.inferType(initNode) ?? "") : undefined;
        if (declaredPrecision !== undefined && inferredPrecision !== undefined &&
            inferredPrecision > declaredPrecision) {
          const inferred = this.inferType(initNode!) ?? "higher-precision type";
          this.diagnostics.push({
            code: "LLN-TYPE-017",
            name: "NumericPrecisionLoss",
            severity: "warning",
            message: `Assigning '${inferred}' to '${declaredBase}' may lose precision. Use explicit conversion if narrowing is intended.`,
            ...(node.location !== undefined ? { location: node.location } : {}),
            suggestedFix: `Use an explicit cast or change the type to '${inferred}'.`,
          });
        }

      } else if (declaredBase === "Auto") {
        // Auto inference: register the inferred type
        const initNode = node.children?.[0];
        if (initNode !== undefined) {
          const inferredType = this.inferType(initNode);
          if (inferredType !== undefined) {
            this.registerBindingType(bindingName, inferredType);
          }
        }
      }
    } else {
      // No type annotation — try to infer from init expression
      const initNode = node.children?.[0];
      if (initNode !== undefined) {
        const inferredType = this.inferType(initNode);
        if (inferredType !== undefined) {
          this.registerBindingType(bindingName, inferredType);
        }
      }
    }
  }

  /**
   * Phase 8A: check binary operator type compatibility.
   * Emits LLN-TYPE-004 for incompatible operand types.
   */
  private checkBinaryOperatorTypes(
    op: string,
    leftType: string,
    rightType: string,
    location: SourceLocation | undefined,
  ): void {
    // ── Phase 8B: Money<C> cross-currency enforcement ────────────────────────
    // Extract base type for Money checking (e.g. "Money" from "Money<GBP>")
    const leftBase  = leftType.split("<")[0]?.trim()  ?? leftType;
    const rightBase = rightType.split("<")[0]?.trim() ?? rightType;

    if (leftBase === "Money" && rightBase === "Money") {
      if (op === "+" || op === "-") {
        if (leftType !== rightType) {
          // Cross-currency addition/subtraction: Money<GBP> + Money<USD> → LLN-TYPE-004
          this.diagnostics.push(makeTCDiag(
            "LLN-TYPE-004",
            "InvalidBinaryOperation",
            `Cannot ${op === "+" ? "add" : "subtract"} '${leftType}' and '${rightType}'. Money arithmetic requires the same currency.`,
            location,
            `Use fx.convert() for explicit currency conversion before arithmetic.`,
            `fx.convert(amount, TargetCurrency)?`,
          ));
        }
        return; // same-currency is valid
      }
      if (op === "*") {
        // Money<C> * Money<C> is dimensionally invalid (produces Money²)
        this.diagnostics.push(makeTCDiag(
          "LLN-TYPE-004",
          "InvalidBinaryOperation",
          `Operator '*' cannot be applied to two Money values. Use 'Money<C> * Decimal' for scaling.`,
          location,
          `Multiply by a Decimal rate instead: amount * Decimal("0.20")`,
        ));
        return;
      }
      if (op === "/" && leftType !== rightType) {
        // Money<GBP> / Money<USD> is invalid (ratio requires same currency)
        this.diagnostics.push(makeTCDiag(
          "LLN-TYPE-004",
          "InvalidBinaryOperation",
          `Cannot divide '${leftType}' by '${rightType}'. Currency ratio requires same currency.`,
          location,
          `Use fx.convert() first, or divide same-currency values.`,
        ));
        return;
      }
      return; // Money<C> / Money<C> → Decimal ratio, valid
    }

    // String + non-String = error
    // Exception: if the non-String operand is an unknown/user-defined type (not in
    // BUILT_IN_TYPES), skip TYPE-004 — TYPE-001 was already emitted for the unknown
    // type, and user types may legitimately support concatenation via toString().
    if (op === "+") {
      if (leftBase === "String" && rightBase !== "String" && rightBase !== "") {
        if (BUILT_IN_TYPES.has(rightBase)) {
          this.diagnostics.push(makeTCDiag(
            "LLN-TYPE-004",
            "InvalidBinaryOperation",
            `Cannot use '+' between 'String' and '${rightBase}'. String concatenation requires both operands to be String.`,
            location,
            `Convert the '${rightBase}' to String first using .toString()`,
          ));
        }
        return;
      }
      if (rightBase === "String" && leftBase !== "String" && leftBase !== "") {
        if (BUILT_IN_TYPES.has(leftBase)) {
          this.diagnostics.push(makeTCDiag(
            "LLN-TYPE-004",
            "InvalidBinaryOperation",
            `Cannot use '+' between '${leftBase}' and 'String'. String concatenation requires both operands to be String.`,
            location,
            `Convert the '${leftBase}' to String first using .toString()`,
          ));
        }
        return;
      }
    }

    // Bool arithmetic = error
    if (["+", "-", "*", "/", "%"].includes(op)) {
      if (leftBase === "Bool" || rightBase === "Bool") {
        this.diagnostics.push(makeTCDiag(
          "LLN-TYPE-004",
          "InvalidBinaryOperation",
          `Arithmetic operator '${op}' cannot be applied to Bool. Bool supports only '&&', '||', and '!'.`,
          location,
          `Use '&&' or '||' for boolean logic, not arithmetic operators.`,
        ));
        return;
      }
    }

    // Arithmetic operators
    if (["+", "-", "*", "/", "%"].includes(op)) {
      if (op === "+" && leftType === "String" && rightType === "String") return; // concat OK
      if (NUMERIC_TYPES.has(leftType) && NUMERIC_TYPES.has(rightType)) {
        // Decimal precision warning when used in Money context (per Stage 1 decision)
        // Full Decimal precision checking in Stage 2
        return; // numeric arithmetic is valid
      }
      // Invalid: string + int, bool + int, etc.
      if (!NUMERIC_TYPES.has(leftType) || !NUMERIC_TYPES.has(rightType)) {
        // Allow Money<C> * Decimal (Decimal is numeric, Money is not in NUMERIC_TYPES)
        if (leftBase === "Money" && NUMERIC_TYPES.has(rightType)) return;  // Money * Decimal: valid
        if (rightBase === "Money" && NUMERIC_TYPES.has(leftType)) return;  // Decimal * Money: valid
        this.diagnostics.push(makeTCDiag(
          "LLN-TYPE-004",
          "InvalidBinaryOperation",
          `Operator '${op}' cannot be applied to '${leftType}' and '${rightType}'. Both operands must be numeric, or both String for '+'.`,
          location,
          `Use compatible types: two numeric values, or two Strings for concatenation.`,
        ));
      }
      return;
    }

    // Equality operators
    if (op === "==" || op === "!=") {
      // SecureString equality is caught by value-state checker (LLN-SECRET-002)
      // Cross-type equality: warn but allow for now (Phase 8B will tighten)
      if (leftType !== rightType && !NUMERIC_TYPES.has(leftType) && !NUMERIC_TYPES.has(rightType)) {
        this.diagnostics.push(makeTCDiag(
          "LLN-TYPE-004",
          "InvalidBinaryOperation",
          `Equality operator '${op}' used on different types: '${leftType}' and '${rightType}'.`,
          location,
          `Ensure both sides of '${op}' have the same type.`,
        ));
      }
      return;
    }

    // Comparison operators
    if (["<", "<=", ">", ">="].includes(op)) {
      // String comparison with non-String = error
      if ((leftBase === "String" && rightBase !== "String" && rightBase !== "") ||
          (rightBase === "String" && leftBase !== "String" && leftBase !== "")) {
        this.diagnostics.push(makeTCDiag(
          "LLN-TYPE-004",
          "InvalidBinaryOperation",
          `Operator '${op}' cannot compare 'String' with '${leftBase === "String" ? rightBase : leftBase}'. Only same-type comparison is allowed.`,
          location,
          `Compare values of the same type.`,
        ));
        return;
      }
      if (!ORDERABLE_TYPES.has(leftType) || !ORDERABLE_TYPES.has(rightType)) {
        this.diagnostics.push(makeTCDiag(
          "LLN-TYPE-004",
          "InvalidBinaryOperation",
          `Comparison operator '${op}' requires comparable types, got '${leftType}' and '${rightType}'.`,
          location,
          `Use numeric or Timestamp values with comparison operators.`,
        ));
      }
      return;
    }

    // Logical operators
    if (op === "&&" || op === "||") {
      if (leftType !== "Bool") {
        this.diagnostics.push(makeTCDiag(
          "LLN-TYPE-004",
          "InvalidBinaryOperation",
          `Logical operator '${op}' requires Bool operands, but left operand is '${leftType}'.`,
          location,
          `Ensure both operands are Bool.`,
        ));
      }
      return;
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

    // ── LLN-TYPE-022: Unreachable pattern ──────────────────────────────────
    // Any arm that follows a wildcard _ is unreachable
    for (let i = 0; i < arms.length; i++) {
      const arm = arms[i]!;
      if (arm.value === "_" && i < arms.length - 1) {
        // Every arm after the wildcard is unreachable
        for (let j = i + 1; j < arms.length; j++) {
          const unreachable = arms[j]!;
          this.diagnostics.push(makeTCDiag(
            "LLN-TYPE-022",
            "UnreachablePattern",
            `Pattern '${unreachable.value ?? "?"}' is unreachable — the wildcard arm '_' already covers all remaining cases.`,
            unreachable.location,
            `Remove this unreachable arm, or move it before the wildcard '_'.`,
          ));
        }
        break;
      }
    }

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
 * @param ast            The root `program` node from `parseProgram()`.
 * @param importedTypes  Optional list of type names resolved from import declarations
 *                       (Phase 11E). These are added to the user-defined type set so
 *                       LLN-TYPE-001 is not emitted for them.
 * @returns    A result object containing all type diagnostics.
 */
export function checkTypes(ast: AstNode, importedTypes?: readonly string[]): TypeCheckResult {
  const checker = new TypeChecker(importedTypes ?? []);
  checker.check(ast);
  return checker.getResult();
}
