// =============================================================================
// LogicN Phase 6 — Value-State Checker
//
// Enforces value-state annotation rules on the parsed AST.
// Runs after the parser, before the effect checker.
//
// Spec: docs/Knowledge-Bases/value-state-checker.md
//
// Implemented rules:
//   Rule 1/3 — unsafe bindings cannot reach governed sinks
//              (LLN-VALUESTATE-003: UnsafeValueReachedGovernedSink)
//   Rule 2   — safe mut requires a recognised gate function
//              (LLN-VALUESTATE-001: UnsafeToSafeTransitionDenied)
//   Rule 4   — SecureString cannot use == or be passed to log functions
//              (LLN-SECRET-001: SecretValueLogged)
//              (LLN-SECRET-002: SecretComparisonDenied)
//   Phase 8B — String taint propagation
//              (LLN-VALUESTATE-004: TaintedValuePropagation)
//   Phase 11B.1 — Two-hop taint propagation
//              (LLN-VALUESTATE-005: DerivedUnsafeValueAtSink)
//   Phase 11B.2 — User-defined gate functions
//              Functions whose names start with recognised gate prefixes
//              (validate*, sanitize*, check*, verify*, parse*, decode*)
//              automatically break the taint chain, just like stdlib gates.
//
// Phase 6 defers:
//   - LLN-VALUESTATE-002
//   - LLN-SECRET-003 (SecretSerializationDenied)
// =============================================================================

import { type AstNode, type SourceLocation } from "./parser.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A secondary source location that gives context for a diagnostic.
 * Used for Rust-style "declared here... used here" error messages.
 */
export interface DiagnosticRelatedLocation {
  readonly message: string;
  readonly location: SourceLocation;
}

export interface ValueStateDiagnostic {
  readonly code: string;
  readonly name: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly location?: SourceLocation;
  readonly suggestedFix?: string;
  /** Machine-applicable fix — the exact LogicN snippet to insert/replace, without prose. */
  readonly suggestedCode?: string;
  /** Rust-style: secondary locations (e.g. where unsafe value was declared). */
  readonly relatedLocations?: readonly DiagnosticRelatedLocation[];
  /** Elm-style: why this is a problem. */
  readonly why?: string;
  /** Elm-style: what goes wrong if ignored. */
  readonly risk?: string;
}

export interface ValueStateCheckResult {
  readonly diagnostics: readonly ValueStateDiagnostic[];
}

// ---------------------------------------------------------------------------
// Diagnostic factory
//
// Branches explicitly on location to satisfy exactOptionalPropertyTypes.
// ---------------------------------------------------------------------------

function makeVSDiag(
  code: string,
  name: string,
  message: string,
  location: SourceLocation | undefined,
  suggestedFix: string,
  suggestedCode?: string,
  opts?: {
    relatedLocations?: readonly DiagnosticRelatedLocation[];
    why?: string;
    risk?: string;
  },
): ValueStateDiagnostic {
  const sc   = suggestedCode !== undefined ? { suggestedCode } : {};
  const rel  = opts?.relatedLocations !== undefined ? { relatedLocations: opts.relatedLocations } : {};
  const why  = opts?.why  !== undefined ? { why:  opts.why  } : {};
  const risk = opts?.risk !== undefined ? { risk: opts.risk } : {};
  const extras = { ...sc, ...rel, ...why, ...risk };
  if (location !== undefined) {
    return { code, name, severity: "error", message, location, suggestedFix, ...extras };
  }
  return { code, name, severity: "error", message, suggestedFix, ...extras };
}

// ---------------------------------------------------------------------------
// Governed sinks
//
// Calls whose arguments must not be unsafe bindings.
// Matched on the reconstructed full call name (receiver.method or method).
//
// Canonical registry (source of truth):
//   docs/Knowledge-Bases/stdlib-gates.yaml  §sinks
//
// When adding a new sink, update stdlib-gates.yaml first, then mirror here.
// ---------------------------------------------------------------------------

function isGovernedSink(node: AstNode): boolean {
  const methodName = node.value ?? "";
  const receiver = node.children?.[0];
  const receiverName =
    receiver?.kind === "identifier" ? (receiver.value ?? "")
    : receiver?.kind === "memberExpr" ? getNodeName(receiver)
    : "";
  const fullName =
    receiverName !== "" ? `${receiverName}.${methodName}` : methodName;

  // Database patterns: *DB.insert / update / delete / write / query / find / select
  if (/\w*DB\.(insert|update\w*|delete|write|query|find|select\w*)$/.test(fullName)) return true;
  // Audit log
  if (fullName === "AuditLog.write") return true;
  // Shell and filesystem
  if (/^(shell\.exec|FileSystem\.write|fs\.write\w*)$/.test(fullName)) return true;
  // HTTP write methods — unsafe data must not cross network boundary unvalidated
  if (/^https?\.(post|put|patch|delete)$/.test(fullName)) return true;
  // Email / payment sinks
  if (/^EmailService\.(send\w*|deliver)$/.test(fullName)) return true;
  if (/\w+Payment\.(charge|process|submit)$/.test(fullName)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Log / print functions
//
// Calls whose arguments must not include SecureString bindings.
//
// Canonical registry (source of truth):
//   docs/Knowledge-Bases/stdlib-gates.yaml  §sinks  (log_receiver, print_output)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Serialization functions
//
// Calls whose arguments must not include SecureString bindings.
// Serializing a secret value would expose it in the output stream.
// ---------------------------------------------------------------------------

function isSerializationCall(node: AstNode): boolean {
  const methodName = node.value ?? "";
  if (methodName === "serialize" || methodName === "stringify") return true;
  const receiver = node.children?.[0];
  const receiverName = receiver?.kind === "identifier" ? (receiver.value ?? "") : "";
  const fullName = receiverName !== "" ? `${receiverName}.${methodName}` : methodName;
  return /^(json\.encode|json\.stringify|JSON\.stringify|toml\.encode|xml\.encode|serialize)$/.test(fullName);
}

function isLogCall(node: AstNode): boolean {
  const methodName = node.value ?? "";
  // Standalone: print(...)
  if (methodName === "print") return true;
  // Method: log.info / log.error / log.warn / log.write, Logger.*, console.*
  const receiver = node.children?.[0];
  if (receiver?.kind === "identifier") {
    const rcvName = receiver.value ?? "";
    if (rcvName === "log" || rcvName === "Logger" || rcvName === "console") return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Governance qualifier helpers
//
// Used for LLN-VALUESTATE-006 / LLN-VALUESTATE-007 boundary checks.
// ---------------------------------------------------------------------------

/**
 * Returns true when the AST node produces a protected value.
 *
 * Mirrors the type-checker's inferType protected-value inference:
 *   protect(x)                              → "protected X"
 *   validate.email(x) [receiver=validate]   → "protected Email"
 *   method.startsWith("validate.")          → "protected String" (qualified method name)
 *
 * Note: validate.sanitize(x), validate.text(x) etc. have unqualified method names
 * ("sanitize", "text") so they do NOT produce a protected type and must not fire
 * this check.
 *
 * Also: errorPropagation (?) wrapping any of the above is unwrapped.
 */
function isProtectedValueExpression(node: AstNode): boolean {
  // Unwrap errorPropagation (?)
  if (node.kind === "errorPropagation") {
    const inner = node.children?.[0];
    return inner !== undefined && isProtectedValueExpression(inner);
  }
  if (node.kind !== "callExpr") return false;
  const methodName = node.value ?? "";
  // protect(x) → protected X
  if (methodName === "protect") return true;
  // validate.email(x) — method is "email", receiver is identifier "validate"
  // or method starts with "validate." (fully-qualified method name)
  const receiver = node.children?.[0];
  const receiverIsValidateNamespace =
    receiver?.kind === "identifier" && receiver.value === "validate";
  if (receiverIsValidateNamespace && methodName === "email") return true;
  // Fully-qualified validate method names (method itself starts with "validate.")
  if (methodName.startsWith("validate.")) return true;
  return false;
}

/**
 * Returns true when the AST node is a `redact(...)` call expression (or wrapped in ?).
 * Assigning redact(x) to a plain binding is a LLN-VALUESTATE-007 violation.
 */
function isRedactCall(node: AstNode): boolean {
  // Unwrap errorPropagation (?)
  if (node.kind === "errorPropagation") {
    const inner = node.children?.[0];
    return inner !== undefined && isRedactCall(inner);
  }
  return node.kind === "callExpr" && (node.value === "redact");
}

// ---------------------------------------------------------------------------
// Gate function recognition
//
// The right-hand side of `safe mut name = gate(name)?` must match one of these.
//
// Canonical registry (source of truth):
//   docs/Knowledge-Bases/stdlib-gates.yaml  §gates
//
// Phase 6 uses prefix-based matching. Phase 7+ should load from the registry.
// When adding a new gate, update stdlib-gates.yaml first, then mirror here.
// ---------------------------------------------------------------------------

const GATE_PREFIXES = [
  "validate.",
  "sanitize.",
  "json.decode",
  "toml.decode",
  "parse.",
  "constantTimeEquals",
  "redact",
] as const;

// ---------------------------------------------------------------------------
// Phase 11B.2 — User-defined gate function prefixes
//
// Functions whose names start with any of these prefixes are automatically
// treated as gate functions that break the taint chain. This covers the common
// naming conventions for validation helpers (validateAge, sanitizeHtml, etc.)
// without requiring explicit @gate annotations in the AST.
// ---------------------------------------------------------------------------

const USER_GATE_NAME_PREFIXES = [
  "validate",
  "sanitize",
  "check",
  "verify",
  "parse",
  "decode",
] as const;

/**
 * Phase 11B.2: Walk the AST and collect user-defined gate function names.
 *
 * A function is a user gate if its unqualified name starts with one of the
 * recognised gate name prefixes (validate*, sanitize*, check*, verify*,
 * parse*, decode*). This mirrors the stdlib gate convention and requires no
 * additional annotation syntax.
 *
 * In addition to name-prefix matching, the set contains ALL fnDecl names that
 * appear at the top level of the program so that call-site checks can find
 * them by simple Set lookup.
 */
function collectUserGates(ast: AstNode): Set<string> {
  const gates = new Set<string>();

  function walk(node: AstNode): void {
    if (node.kind === "fnDecl") {
      const fnName = node.value ?? "";
      if (
        fnName !== "" &&
        USER_GATE_NAME_PREFIXES.some((prefix) => fnName.startsWith(prefix))
      ) {
        gates.add(fnName);
      }
    }
    for (const child of node.children ?? []) walk(child);
  }

  walk(ast);
  return gates;
}

function isGateCallName(fullName: string, userGates?: ReadonlySet<string>): boolean {
  if (GATE_PREFIXES.some((prefix) => fullName.startsWith(prefix))) return true;
  // Phase 11B.2: user-defined gate by name prefix (e.g. validateAge)
  if (USER_GATE_NAME_PREFIXES.some((prefix) => fullName.startsWith(prefix))) return true;
  // Phase 11B.2: user-defined gate by explicit registry
  if (userGates !== undefined && userGates.has(fullName)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// AST name reconstruction helpers
// ---------------------------------------------------------------------------

function getNodeName(node: AstNode): string {
  if (node.kind === "identifier") return node.value ?? "";
  if (node.kind === "memberExpr") {
    const parent = node.children?.[0];
    const parentName = parent !== undefined ? getNodeName(parent) : "";
    const memberName = node.value ?? "";
    return parentName !== "" ? `${parentName}.${memberName}` : memberName;
  }
  return "";
}

function buildFullCallName(node: AstNode): string {
  const methodName = node.value ?? "";
  const receiver = node.children?.[0];
  if (receiver === undefined) return methodName;
  const receiverName = getNodeName(receiver);
  return receiverName !== "" ? `${receiverName}.${methodName}` : methodName;
}

// ---------------------------------------------------------------------------
// Binding value parser
//
// Parses the encoded `value` field of letDecl / mutDecl AST nodes.
// Format: [safetyPrefix " "] name [":" " " typeName [...postfixQualifiers]]
// ---------------------------------------------------------------------------

interface BindingInfo {
  readonly name: string;
  readonly safetyPrefix: "unsafe" | "safe" | undefined;
  readonly typeName: string;
  /** Location where this binding was declared — used for Rust-style related diagnostics. */
  readonly declaredAt?: SourceLocation;
  /**
   * Phase 11B.1 — Two-hop taint propagation.
   * True when this binding was derived from an unsafe or tainted binding via
   * a non-gate expression (e.g. rawQuery.trim()). Such bindings emit
   * LLN-VALUESTATE-005 when they reach governed sinks.
   */
  readonly tainted?: boolean;
  /** The original unsafe binding name this taint was derived from (for diagnostics). */
  readonly taintSource?: string;
}

function parseBindingValue(value: string): BindingInfo {
  let rest = value.trim();
  let safetyPrefix: "unsafe" | "safe" | undefined;

  if (rest.startsWith("unsafe ")) {
    safetyPrefix = "unsafe";
    rest = rest.slice("unsafe ".length).trim();
  } else if (rest.startsWith("safe ")) {
    safetyPrefix = "safe";
    rest = rest.slice("safe ".length).trim();
  }

  // rest = "name: Type [qualifiers]" or "name"
  const colonIdx = rest.indexOf(":");
  if (colonIdx === -1) {
    return { safetyPrefix, name: rest.trim(), typeName: "" };
  }

  const name = rest.slice(0, colonIdx).trim();
  const typeSection = rest.slice(colonIdx + 1).trim();
  // Base type name is the first space-delimited or angle-bracket-delimited token
  const baseName = typeSection.split(/[<\s]/)[0] ?? typeSection;

  return { safetyPrefix, name, typeName: baseName };
}

// ---------------------------------------------------------------------------
// Phase 11B.1 — Taint expression analysis
//
// Determines whether an expression tree is derived from an unsafe or
// tainted binding. Validation / redaction calls break the taint chain.
// ---------------------------------------------------------------------------

/**
 * Returns true if `expr` references an unsafe or tainted binding anywhere in
 * its tree, UNLESS the expression is a recognised validation/redaction gate
 * (which breaks the taint chain).
 *
 * Phase 11B.2: accepts an optional `userGates` set so that user-defined gate
 * functions also break the taint chain.
 */
function isTaintedExpression(
  expr: AstNode,
  lookupBinding: (name: string) => BindingInfo | undefined,
  userGates?: ReadonlySet<string>,
): boolean {
  if (expr.kind === "identifier" && expr.value) {
    const binding = lookupBinding(expr.value);
    if (binding === undefined) return false;
    return binding.safetyPrefix === "unsafe" || (binding.tainted === true);
  }

  if (expr.kind === "memberExpr") {
    const receiver = expr.children?.[0];
    return receiver !== undefined && isTaintedExpression(receiver, lookupBinding);
  }

  if (expr.kind === "callExpr") {
    // Reconstruct the full qualified call name (e.g. "validate.searchQuery")
    // by combining the receiver identifier/memberExpr name with the method name.
    const fullCallName = buildFullCallName(expr);
    const methodNameOnly = expr.value ?? "";
    // Gate calls break the taint chain — validate.*, sanitize.*, redact*, etc.
    // Phase 11B.2: also check user-defined gates.
    // Also check the unqualified method name because buildFullCallName may incorrectly
    // treat the first argument as the receiver for standalone function calls like
    // validateAge(rawAge) → builds "rawAge.validateAge" instead of just "validateAge".
    if (isGateCallName(fullCallName, userGates) || isGateCallName(methodNameOnly, userGates)) return false;

    // For non-gate calls, check whether the receiver binding is itself tainted/unsafe,
    // OR whether any of the call arguments are tainted.
    // Note: the first child is the receiver (could be a namespace identifier or binding).
    const firstChild = expr.children?.[0];
    const args = expr.children?.slice(1) ?? [];

    // Check if receiver is a tainted/unsafe BINDING (not a namespace like "UsersDB")
    const receiverIsTainted =
      firstChild !== undefined &&
      firstChild.kind === "identifier" &&
      (() => {
        const b = lookupBinding(firstChild.value ?? "");
        return b?.safetyPrefix === "unsafe" || b?.tainted === true;
      })();

    // Also recurse into memberExpr receivers (e.g. obj.prop.method())
    const receiverMemberTainted =
      firstChild !== undefined &&
      firstChild.kind === "memberExpr" &&
      isTaintedExpression(firstChild, lookupBinding, userGates);

    const argsTainted = args.some((a) => isTaintedExpression(a, lookupBinding, userGates));
    return receiverIsTainted || receiverMemberTainted || argsTainted;
  }

  if (expr.kind === "binaryExpr") {
    const [left, right] = expr.children ?? [];
    return (
      (left !== undefined && isTaintedExpression(left, lookupBinding, userGates)) ||
      (right !== undefined && isTaintedExpression(right, lookupBinding, userGates))
    );
  }

  // errorPropagation (?) — the wrapped expression might be tainted
  if (expr.kind === "errorPropagation") {
    const inner = expr.children?.[0];
    return inner !== undefined && isTaintedExpression(inner, lookupBinding, userGates);
  }

  return false;
}

/**
 * Walks an expression tree to find the name of the first unsafe or tainted
 * binding identifier it references. Used for building diagnostic messages.
 */
function findTaintSourceName(
  expr: AstNode,
  lookupBinding: (name: string) => BindingInfo | undefined,
): string | undefined {
  if (expr.kind === "identifier" && expr.value) {
    const binding = lookupBinding(expr.value);
    if (binding?.safetyPrefix === "unsafe") return binding.name;
    if (binding?.tainted === true) return binding.taintSource ?? binding.name;
  }
  for (const child of expr.children ?? []) {
    const found = findTaintSourceName(child, lookupBinding);
    if (found !== undefined) return found;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Value-state checker implementation
// ---------------------------------------------------------------------------

class ValueStateChecker {
  private readonly diagnostics: ValueStateDiagnostic[] = [];
  // Binding scope stack — innermost scope is last
  private readonly scopes: Array<Map<string, BindingInfo>> = [];
  // Phase 11B.2: user-defined gate function names (collected from fnDecl nodes)
  private readonly userGates: ReadonlySet<string>;

  constructor(userGates: ReadonlySet<string> = new Set()) {
    this.userGates = userGates;
  }

  check(ast: AstNode): void {
    this.pushScope();
    this.walkNode(ast);
    this.popScope();
  }

  getResult(): ValueStateCheckResult {
    return { diagnostics: [...this.diagnostics] };
  }

  // ── Scope management ─────────────────────────────────────────────────────

  private pushScope(): void {
    this.scopes.push(new Map());
  }

  private popScope(): void {
    this.scopes.pop();
  }

  private currentScope(): Map<string, BindingInfo> {
    return this.scopes[this.scopes.length - 1] ?? new Map();
  }

  private lookupBinding(name: string): BindingInfo | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const info = this.scopes[i]!.get(name);
      if (info !== undefined) return info;
    }
    return undefined;
  }

  private registerBinding(info: BindingInfo): void {
    this.currentScope().set(info.name, info);
  }

  // ── AST walker ───────────────────────────────────────────────────────────

  private walkNode(node: AstNode): void {
    switch (node.kind) {
      case "program":
        this.walkChildren(node);
        break;

      case "flowDecl":
      case "secureFlowDecl":
      case "pureFlowDecl":
        this.pushScope();
        // Register parameter bindings so SecureString params are tracked
        for (const child of node.children ?? []) {
          if (child.kind === "paramDecl") {
            this.registerParamBinding(child);
          }
        }
        this.walkChildren(node);
        this.popScope();
        break;

      case "block":
        this.pushScope();
        this.walkChildren(node);
        this.popScope();
        break;

      case "letDecl":
        this.handleLetDecl(node);
        break;

      case "mutDecl":
        this.handleMutDecl(node);
        break;

      case "callExpr":
        this.handleCallExpr(node);
        // Walk children to catch nested governed-sink / log calls
        this.walkChildren(node);
        break;

      case "binaryExpr":
        this.handleBinaryExpr(node);
        this.walkChildren(node);
        break;

      default:
        this.walkChildren(node);
        break;
    }
  }

  private walkChildren(node: AstNode): void {
    for (const child of node.children ?? []) {
      this.walkNode(child);
    }
  }

  // ── Binding handlers ─────────────────────────────────────────────────────

  private registerParamBinding(node: AstNode): void {
    // paramDecl.value = "name: Type"
    const paramValue = node.value ?? "";
    const colonIdx = paramValue.indexOf(":");
    if (colonIdx === -1) return;
    const name = paramValue.slice(0, colonIdx).trim();
    const typeSection = paramValue.slice(colonIdx + 1).trim();
    const typeName = typeSection.split(/[<\s]/)[0] ?? typeSection;
    const locField = node.location !== undefined ? { declaredAt: node.location } : {};
    this.registerBinding({ name, safetyPrefix: undefined, typeName, ...locField });
  }

  private handleLetDecl(node: AstNode): void {
    const info = parseBindingValue(node.value ?? "");
    // Attach declaration location for Rust-style "declared here" diagnostics
    const locField = node.location !== undefined ? { declaredAt: node.location } : {};

    // Phase 11B.1: propagate taint — if the init expression references an
    // unsafe or tainted binding (via a non-gate call), the new binding is tainted.
    // Phase 11B.2: user-defined gate functions also break the taint chain.
    const init = node.children?.[0];
    const taintField: { tainted?: boolean; taintSource?: string } = {};
    if (init !== undefined && info.safetyPrefix !== "unsafe") {
      // unsafe bindings already have safetyPrefix tracking; we only need taint
      // propagation for plain let bindings derived from unsafe/tainted ones.
      if (isTaintedExpression(init, (name) => this.lookupBinding(name), this.userGates)) {
        const sourceName = findTaintSourceName(init, (name) => this.lookupBinding(name));
        taintField.tainted = true;
        if (sourceName !== undefined) taintField.taintSource = sourceName;
      }
    }

    // LLN-VALUESTATE-006: protected value assigned to plain binding
    // LLN-VALUESTATE-007: redacted value assigned to plain binding
    // Only fire when:
    //   1. The binding has an explicit type annotation (colonIdx present in value string)
    //   2. The declared type annotation is plain — no "protected" or "redacted" anywhere in the type
    const rawNodeValue = (node.value ?? "").trim();
    const colonIdx2 = rawNodeValue.indexOf(":");
    const hasExplicitType = colonIdx2 !== -1;
    // Extract the full type annotation section (after the colon)
    const typeAnnotationSection = hasExplicitType ? rawNodeValue.slice(colonIdx2 + 1).trim() : "";
    const hasGovernanceQualifier =
      typeAnnotationSection.includes("protected") || typeAnnotationSection.includes("redacted");
    if (hasExplicitType && !hasGovernanceQualifier && info.typeName !== "" && init !== undefined) {
      if (isProtectedValueExpression(init)) {
        this.diagnostics.push(makeVSDiag(
          "LLN-VALUESTATE-006",
          "ProtectedBoundaryViolation",
          `Cannot assign a 'protected' value to plain binding '${info.name}'. Declare the binding as 'protected ${info.typeName}', or pass the value through an authorised access gate.`,
          node.location,
          `Change the type annotation to: protected ${info.typeName}`,
          `protected ${info.typeName}`,
        ));
      } else if (isRedactCall(init)) {
        this.diagnostics.push(makeVSDiag(
          "LLN-VALUESTATE-007",
          "RedactedBoundaryViolation",
          `Cannot assign a 'redacted' value to plain binding '${info.name}'. Redaction is irreversible — a redacted value cannot be converted back to its original type.`,
          node.location,
          `Use the redacted value as-is with type 'redacted ${info.typeName}', or do not redact before this point.`,
        ));
      }
    }

    this.registerBinding({ ...info, ...locField, ...taintField });
    // Walk the init expression
    if (init !== undefined) this.walkNode(init);
  }

  private handleMutDecl(node: AstNode): void {
    const info = parseBindingValue(node.value ?? "");
    const init = node.children?.[0];

    // Rule 2: safe mut upgrade must use a recognised gate
    if (info.safetyPrefix === "safe" && init !== undefined) {
      if (!this.isGateExpression(init)) {
        this.diagnostics.push(makeVSDiag(
          "LLN-VALUESTATE-001",
          "UnsafeToSafeTransitionDenied",
          `'safe mut ${info.name}' requires a recognised gate function on the right-hand side (validate.*, sanitize.*, json.decode<T>, parse.*).`,
          node.location,
          `Use: safe mut ${info.name} = validate.${info.name}(${info.name})?`,
          `safe mut ${info.name} = validate.${info.name}(${info.name})?`,
        ));
      }
    }

    // Overwrite the previous unsafe registration with the new (possibly safe) one.
    // Phase 11B.1: propagate taint unless a gate clears it.
    // Phase 11B.2: user-defined gate functions also break the taint chain.
    const mutLocField = node.location !== undefined ? { declaredAt: node.location } : {};
    const mutTaintField: { tainted?: boolean; taintSource?: string } = {};
    if (init !== undefined && info.safetyPrefix !== "safe" && info.safetyPrefix !== "unsafe") {
      if (isTaintedExpression(init, (name) => this.lookupBinding(name), this.userGates)) {
        const sourceName = findTaintSourceName(init, (name) => this.lookupBinding(name));
        mutTaintField.tainted = true;
        if (sourceName !== undefined) mutTaintField.taintSource = sourceName;
      }
    }
    // When safetyPrefix is "safe" and a gate is used, taint is intentionally cleared
    // (the gate call gates are already excluded by isTaintedExpression).
    this.registerBinding({ ...info, ...mutLocField, ...mutTaintField });

    if (init !== undefined) this.walkNode(init);
  }

  // ── Gate recognition ─────────────────────────────────────────────────────

  private isGateExpression(node: AstNode): boolean {
    // Accept `gate(args)?` — errorPropagation wrapping a callExpr
    if (node.kind === "errorPropagation") {
      const inner = node.children?.[0];
      return inner !== undefined && this.isGateExpression(inner);
    }
    // Accept `gate(args)` — callExpr with a recognised gate name
    // Phase 11B.2: also check user-defined gates.
    // Also check the unqualified method name (node.value) because buildFullCallName
    // may treat the first argument as the receiver for standalone calls like
    // validateEmail(rawEmail) → "rawEmail.validateEmail" instead of "validateEmail".
    if (node.kind === "callExpr") {
      const methodNameOnly = node.value ?? "";
      return (
        isGateCallName(buildFullCallName(node), this.userGates) ||
        isGateCallName(methodNameOnly, this.userGates)
      );
    }
    return false;
  }

  // ── Call expression rules ────────────────────────────────────────────────

  private handleCallExpr(node: AstNode): void {
    // Rule 1/3: governed sink — check all argument children for unsafe bindings
    if (isGovernedSink(node)) {
      const sinkName = buildFullCallName(node);
      for (const child of node.children ?? []) {
        this.checkArgForUnsafeBinding(child, sinkName, node.location);
      }
    }

    // Rule 4 (log side): log call — check for SecureString arguments
    if (isLogCall(node)) {
      const callName = buildFullCallName(node);
      for (const child of node.children ?? []) {
        this.checkArgForSecretLogging(child, callName, node.location);
      }
    }

    // Rule 4 (serialization side): LLN-SECRET-003 — SecureString in json.encode / serialize
    if (isSerializationCall(node)) {
      const callName = buildFullCallName(node);
      for (const child of node.children ?? []) {
        this.checkArgForSecretSerialization(child, callName, node.location);
      }
    }
  }

  /**
   * Recursively checks whether `node` or any of its descendants is an
   * identifier that resolves to an `unsafe` binding (LLN-VALUESTATE-003) or
   * a tainted-but-not-directly-unsafe binding (LLN-VALUESTATE-005).
   */
  private checkArgForUnsafeBinding(
    node: AstNode,
    sinkName: string,
    location: SourceLocation | undefined,
  ): void {
    if (node.kind === "identifier") {
      const binding = this.lookupBinding(node.value ?? "");
      if (binding?.safetyPrefix === "unsafe") {
        // Rust-style: show where the unsafe binding was declared AND where it reaches the sink
        const related: DiagnosticRelatedLocation[] = [];
        if (binding.declaredAt !== undefined) {
          related.push({
            message: `'${binding.name}' declared as unsafe here`,
            location: binding.declaredAt,
          });
        }
        this.diagnostics.push(makeVSDiag(
          "LLN-VALUESTATE-003",
          "UnsafeValueReachedGovernedSink",
          `Unsafe binding '${binding.name}' cannot flow into governed sink '${sinkName}'.`,
          location,
          `Add before the sink call: safe mut ${binding.name} = validate.${binding.name}(${binding.name})?`,
          `safe mut ${binding.name} = validate.${binding.name}(${binding.name})?`,
          {
            ...(related.length > 0 ? { relatedLocations: related } : {}),
            why: `'${binding.name}' was declared with 'unsafe let', meaning its value comes from an untrusted boundary source and has not been validated.`,
            risk: `Sending unvalidated boundary data to '${sinkName}' can cause injection attacks, data corruption, or governance violations.`,
          },
        ));
      } else if (binding?.tainted === true) {
        // Phase 11B.1 — LLN-VALUESTATE-005: derived unsafe value at sink
        const sourceName = binding.taintSource ?? binding.name;
        const related: DiagnosticRelatedLocation[] = [];
        if (binding.declaredAt !== undefined) {
          related.push({
            message: `'${binding.name}' derived from unsafe binding '${sourceName}' here`,
            location: binding.declaredAt,
          });
        }
        this.diagnostics.push(makeVSDiag(
          "LLN-VALUESTATE-005",
          "DerivedUnsafeValueAtSink",
          `Binding '${binding.name}' is derived from unsafe binding '${sourceName}' and cannot flow into governed sink '${sinkName}'. Even after transformation (e.g. .trim()), a value derived from unsafe input is still tainted.`,
          location,
          `Use a validation gate before the sink: let safe${binding.name.charAt(0).toUpperCase() + binding.name.slice(1)} = validate.${sourceName}(${sourceName})?`,
          `validate.${sourceName}(${sourceName})?`,
          {
            ...(related.length > 0 ? { relatedLocations: related } : {}),
            why: `'${binding.name}' was derived from '${sourceName}', which was declared with 'unsafe let'. String methods like .trim() and .toLower() do not remove taint.`,
            risk: `Sending a transformed-but-tainted value to '${sinkName}' can cause injection attacks. Taint can only be removed by a validate.* or sanitize.* gate.`,
          },
        ));
      }
    }
    // Recurse into nested children (e.g. named-argument wrappers, blocks)
    for (const child of node.children ?? []) {
      this.checkArgForUnsafeBinding(child, sinkName, location);
    }
  }

  /**
   * Recursively checks whether `node` or any of its descendants is an
   * identifier that resolves to a `SecureString` binding.
   */
  private checkArgForSecretLogging(
    node: AstNode,
    callName: string,
    location: SourceLocation | undefined,
  ): void {
    if (node.kind === "identifier") {
      const binding = this.lookupBinding(node.value ?? "");
      if (binding?.typeName === "SecureString") {
        const related: DiagnosticRelatedLocation[] = [];
        if (binding.declaredAt !== undefined) {
          related.push({
            message: `'${binding.name}' declared as SecureString here`,
            location: binding.declaredAt,
          });
        }
        this.diagnostics.push(makeVSDiag(
          "LLN-SECRET-001",
          "SecretValueLogged",
          `SecureString binding '${binding.name}' must not be passed to '${callName}'.`,
          location,
          `Replace with: log.info("...", { key: redact(${binding.name}) })`,
          `redact(${binding.name})`,
          {
            ...(related.length > 0 ? { relatedLocations: related } : {}),
            why: `'${binding.name}' is a SecureString — its raw value must never appear in logs, audit output, or error messages.`,
            risk: `Logging a secret exposes credentials, tokens, or keys in plaintext. Use redact() to produce a safe '[REDACTED]' placeholder.`,
          },
        ));
      }
    }
    for (const child of node.children ?? []) {
      this.checkArgForSecretLogging(child, callName, location);
    }
  }

  /**
   * LLN-SECRET-003: SecureString must not be passed to serialization functions.
   * Serializing a secret value would expose it in the output stream.
   */
  private checkArgForSecretSerialization(
    node: AstNode,
    callName: string,
    location: SourceLocation | undefined,
  ): void {
    if (node.kind === "identifier") {
      const binding = this.lookupBinding(node.value ?? "");
      if (binding?.typeName === "SecureString") {
        this.diagnostics.push(makeVSDiag(
          "LLN-SECRET-003",
          "SecretSerializationDenied",
          `SecureString binding '${binding.name}' must not be serialized via '${callName}'. Secrets must not appear in serialized output.`,
          location,
          `Use redact(${binding.name}) to produce a safe placeholder before serialization.`,
          `redact(${binding.name})`,
        ));
      }
    }
    for (const child of node.children ?? []) {
      this.checkArgForSecretSerialization(child, callName, location);
    }
  }

  // ── Binary expression rules ──────────────────────────────────────────────

  private handleBinaryExpr(node: AstNode): void {
    // Rule 4 (equality side): SecureString == or != is forbidden
    if (node.value === "==" || node.value === "!=") {
      const left = node.children?.[0];
      const right = node.children?.[1];
      if (left !== undefined) this.checkSecureStringEquality(left, node.location);
      if (right !== undefined) this.checkSecureStringEquality(right, node.location);
    }

    // Phase 8B: String taint propagation — LLN-VALUESTATE-004
    // "SELECT " + rawInput produces a tainted string that must not reach sinks
    // Partial implementation: detect when string + contains an unsafe binding
    if (node.value === "+") {
      const left  = node.children?.[0];
      const right = node.children?.[1];
      if (left !== undefined && right !== undefined) {
        this.checkStringConcatTaint(left, right, node.location);
      }
    }
  }

  /**
   * Phase 8B: LLN-VALUESTATE-004 — String taint propagation.
   * If a string concatenation includes an unsafe binding, the result is tainted.
   * This is the SQL injection pattern: "SELECT " + rawInput.
   */
  private checkStringConcatTaint(
    left: AstNode,
    right: AstNode,
    location: SourceLocation | undefined,
  ): void {
    // Find any unsafe identifier in either operand
    const unsafeLeft  = this.findUnsafeIdentifier(left);
    const unsafeRight = this.findUnsafeIdentifier(right);
    const unsafeBinding = unsafeLeft ?? unsafeRight;

    if (unsafeBinding === undefined) return;

    const related: DiagnosticRelatedLocation[] = [];
    if (unsafeBinding.declaredAt !== undefined) {
      related.push({
        message: `'${unsafeBinding.name}' declared as unsafe here`,
        location: unsafeBinding.declaredAt,
      });
    }

    this.diagnostics.push(makeVSDiag(
      "LLN-VALUESTATE-004",
      "TaintedValuePropagation",
      `String concatenation includes unsafe binding '${unsafeBinding.name}'. The result is tainted and must not reach governed sinks.`,
      location,
      `Validate '${unsafeBinding.name}' before concatenation: let safe = validate.${unsafeBinding.name}(${unsafeBinding.name})?`,
      `validate.${unsafeBinding.name}(${unsafeBinding.name})?`,
      {
        ...(related.length > 0 ? { relatedLocations: related } : {}),
        why: `'${unsafeBinding.name}' is unsafe — it came from an untrusted boundary and has not been validated.`,
        risk: `Concatenating unsafe input into strings sent to databases, shells, or HTML produces injection vulnerabilities.`,
      },
    ));
  }

  /**
   * Recursively finds the first unsafe binding identifier in an expression tree.
   */
  private findUnsafeIdentifier(node: AstNode): BindingInfo | undefined {
    if (node.kind === "identifier") {
      const binding = this.lookupBinding(node.value ?? "");
      if (binding?.safetyPrefix === "unsafe") return binding;
    }
    for (const child of node.children ?? []) {
      const found = this.findUnsafeIdentifier(child);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  private checkSecureStringEquality(
    node: AstNode,
    location: SourceLocation | undefined,
  ): void {
    if (node.kind === "identifier") {
      const binding = this.lookupBinding(node.value ?? "");
      if (binding?.typeName === "SecureString") {
        this.diagnostics.push(makeVSDiag(
          "LLN-SECRET-002",
          "SecretComparisonDenied",
          `SecureString binding '${binding.name}' must not be compared with == / !=. Use constantTimeEquals(${binding.name}, other) instead.`,
          location,
          `Replace with: let valid: Bool = constantTimeEquals(${binding.name}, other)`,
          `constantTimeEquals(${binding.name}, other)`,
        ));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Runs the value-state checker on a parsed LogicN AST.
 *
 * Call this after `parseProgram()`. The checker enforces:
 *   - `unsafe let` bindings cannot reach governed sinks without a gate upgrade
 *   - `safe mut` upgrades must use a recognised gate function
 *   - `SecureString` bindings must not appear in log calls or equality comparisons
 *
 * Phase 11B.2: user-defined gate functions are collected from fnDecl nodes
 * before checking. Functions whose names start with validate*, sanitize*,
 * check*, verify*, parse*, or decode* automatically break the taint chain.
 *
 * @param ast  The root `program` node from `parseProgram()`.
 * @returns    A result object containing all value-state diagnostics.
 */
export function checkValueStates(ast: AstNode): ValueStateCheckResult {
  // Phase 11B.2: collect user-defined gate functions before running the checker
  const userGates = collectUserGates(ast);
  const checker = new ValueStateChecker(userGates);
  checker.check(ast);
  return checker.getResult();
}
