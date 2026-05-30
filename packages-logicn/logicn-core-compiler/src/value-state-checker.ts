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
//
// Phase 6 defers:
//   - Full taint tracking through arbitrary expression trees
//   - Custom @gate annotations
//   - LLN-VALUESTATE-002, LLN-VALUESTATE-004, LLN-VALUESTATE-005
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

  // Database write patterns: *DB.insert / update / delete / write
  if (/\w*DB\.(insert|update\w*|delete|write)$/.test(fullName)) return true;
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

function isGateCallName(fullName: string): boolean {
  return GATE_PREFIXES.some((prefix) => fullName.startsWith(prefix));
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
// Value-state checker implementation
// ---------------------------------------------------------------------------

class ValueStateChecker {
  private readonly diagnostics: ValueStateDiagnostic[] = [];
  // Binding scope stack — innermost scope is last
  private readonly scopes: Array<Map<string, BindingInfo>> = [];

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
    this.registerBinding({ ...info, ...locField });
    // Walk the init expression
    const init = node.children?.[0];
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

    // Overwrite the previous unsafe registration with the new (possibly safe) one
    const mutLocField = node.location !== undefined ? { declaredAt: node.location } : {};
    this.registerBinding({ ...info, ...mutLocField });

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
    if (node.kind === "callExpr") {
      return isGateCallName(buildFullCallName(node));
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
   * identifier that resolves to an `unsafe` binding.
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
 * @param ast  The root `program` node from `parseProgram()`.
 * @returns    A result object containing all value-state diagnostics.
 */
export function checkValueStates(ast: AstNode): ValueStateCheckResult {
  const checker = new ValueStateChecker();
  checker.check(ast);
  return checker.getResult();
}
