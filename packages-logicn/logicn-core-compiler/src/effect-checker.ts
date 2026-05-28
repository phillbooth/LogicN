// =============================================================================
// LogicN Phase 5 — Effect Checker
//
// Validates that effects declared on flows are consistent with their content.
// Spec: docs/Knowledge-Bases/logicn-core-effect-checker-v02.md
//
// Diagnostic codes: LLN-EFFECT-001..004 (compiler-diagnostics.md)
// =============================================================================

import { type AstNode, type AstNodeKind, type ParseDiagnostic, type FlowMeta, type SourceLocation } from "./parser.js";

// ---------------------------------------------------------------------------
// Effect checker diagnostics
// ---------------------------------------------------------------------------

export interface EffectDiagnostic {
  readonly code: string;
  readonly name: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
  readonly location?: SourceLocation;
  readonly suggestedFix?: string;
}

export interface EffectCheckResult {
  readonly flowName: string;
  readonly qualifier: "flow" | "secure" | "pure";
  readonly declaredEffects: readonly string[];
  readonly diagnostics: readonly EffectDiagnostic[];
}

// ---------------------------------------------------------------------------
// Known effect-producing call patterns
//
// Maps call patterns (dotted names) to the effect they require.
// This is a heuristic used until full type-level effect tracking is available.
// Phase 5 full implementation will use the effect graph from the AST.
// ---------------------------------------------------------------------------

const EFFECT_CALL_PATTERNS: ReadonlyMap<RegExp, string> = new Map([
  // Database
  [/\b\w+DB\.\w+/,           "database.read"],   // *DB.* calls default to read
  [/\b\w+DB\.insert\b/,      "database.write"],
  [/\b\w+DB\.update\b/,      "database.write"],
  [/\b\w+DB\.update\w+/,     "database.write"],
  [/\b\w+DB\.delete\b/,      "database.write"],
  // Audit log
  [/\bAuditLog\.write\b/,    "audit.write"],
  // Secrets
  [/\benv\.secret\b/,        "secret.read"],
  [/\bvault\.secret\b/,      "secret.read"],
  // Network adapters
  [/\b\w+Api\.charge\b/,     "network.outbound"],
  [/\b\w+Api\.send\b/,       "network.outbound"],
  [/\b\w+Adapter\.\w+/,      "network.outbound"],
  // Desktop / host
  [/\bHost\.\w+/,            "desktop.user.read"],
  // Native / FFI
  [/\bNative\w+\.\w+/,       "unsafe.native"],
  // Filesystem
  [/\bFileSystem\.\w+/,      "filesystem.write"],
]);

// Effects that are forbidden in pure flows
const PURE_FORBIDDEN_EFFECTS = new Set([
  "database.read", "database.write",
  "network.outbound", "network.external",
  "secret.read",
  "audit.write",
  "filesystem.write", "filesystem.read",
  "desktop.user.read",
  "unsafe.native",
]);

// Effects that are forbidden in plain flows (should use secure flow)
// Currently just a warning set — the checker will warn, not error.
const PLAIN_FLOW_PRIVILEGED_EFFECTS = new Set([
  "secret.read",
  "payment.charge",
]);

// ---------------------------------------------------------------------------
// Checker implementation
// ---------------------------------------------------------------------------

/**
 * Checks effect consistency for all flows in a parsed program.
 *
 * @param flows  Flow metadata from ParseResult.
 * @param ast    Root AST node from ParseResult.
 * @returns      One EffectCheckResult per flow.
 */
export function checkEffects(
  flows: readonly FlowMeta[],
  ast: AstNode,
): readonly EffectCheckResult[] {
  return flows.map((flow) => checkFlowEffects(flow, ast));
}

/**
 * Checks effect consistency for a single flow.
 */
export function checkFlowEffects(
  flow: FlowMeta,
  ast: AstNode,
): EffectCheckResult {
  const diagnostics: EffectDiagnostic[] = [];

  // Find the flow's body node in the AST
  const flowNode = findFlowNode(ast, flow.name);

  // ── Rule 1: pure flow must declare no effects (LLN-EFFECT-003) ────────────
  if (flow.qualifier === "pure" && flow.declaredEffects.length > 0) {
    diagnostics.push({
      code: "LLN-EFFECT-003",
      name: "EFFECT_BOUNDARY_VIOLATION",
      severity: "error",
      message: `pure flow "${flow.name}" declares effects ${formatEffects(flow.declaredEffects)}. Pure flows must have no effects.`,
      location: flow.location,
      suggestedFix: `Remove the effects declaration, or change "pure flow" to "secure flow" if side effects are needed.`,
    });
  }

  // ── Rule 2: pure flow body must not call effectful operations (LLN-EFFECT-003) ─
  if (flow.qualifier === "pure" && flowNode !== undefined) {
    const usedEffects = inferEffectsFromNode(flowNode);
    for (const effect of usedEffects) {
      if (PURE_FORBIDDEN_EFFECTS.has(effect)) {
        diagnostics.push({
          code: "LLN-EFFECT-003",
          name: "EFFECT_BOUNDARY_VIOLATION",
          severity: "error",
          message: `pure flow "${flow.name}" uses "${effect}" which is forbidden in pure flows.`,
          location: flow.location,
          suggestedFix: `Move this call to a separate secure flow and call it from a non-pure flow.`,
        });
      }
    }
  }

  // ── Rule 3: secure flow — check that used effects are declared (LLN-EFFECT-001) ─
  if (flow.qualifier === "secure" && flowNode !== undefined) {
    const usedEffects = inferEffectsFromNode(flowNode);
    const declared = new Set(flow.declaredEffects);

    for (const effect of usedEffects) {
      if (!declared.has(effect) && effect !== "audit.write") {
        // audit.write is commonly added implicitly; warn rather than error
        const code = effect === "audit.write" ? "LLN-EFFECT-002" : "LLN-EFFECT-001";
        diagnostics.push({
          code,
          name: code === "LLN-EFFECT-001" ? "UNDECLARED_EFFECT" : "TRANSITIVE_EFFECT_NOT_DECLARED",
          severity: "warning",
          message: `Flow "${flow.name}" uses effect "${effect}" which is not declared in its effects list.`,
          location: flow.location,
          suggestedFix: `Add "${effect}" to the effects declaration: effects [${[...declared, effect].join(", ")}]`,
        });
      }
    }
  }

  // ── Rule 4: plain flow using privileged effects should use secure flow (warning) ─
  if (flow.qualifier === "flow") {
    for (const effect of flow.declaredEffects) {
      if (PLAIN_FLOW_PRIVILEGED_EFFECTS.has(effect)) {
        diagnostics.push({
          code: "LLN-EFFECT-001",
          name: "UNDECLARED_EFFECT",
          severity: "warning",
          message: `Plain flow "${flow.name}" declares privileged effect "${effect}". Use "secure flow" for security-sensitive operations.`,
          location: flow.location,
          suggestedFix: `Change "flow" to "secure flow".`,
        });
      }
    }
  }

  return {
    flowName: flow.name,
    qualifier: flow.qualifier,
    declaredEffects: flow.declaredEffects,
    diagnostics,
  };
}

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

/**
 * Walks the AST to find the body block of the named flow.
 */
function findFlowNode(ast: AstNode, name: string): AstNode | undefined {
  const kinds: AstNodeKind[] = ["flowDecl", "secureFlowDecl", "pureFlowDecl"];

  function walk(node: AstNode): AstNode | undefined {
    if (kinds.includes(node.kind) && node.value === name) {
      // Return the block child (last child is the body)
      return node;
    }
    for (const child of node.children ?? []) {
      const found = walk(child);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  return walk(ast);
}

/**
 * Infers effects from a node's subtree by matching call patterns.
 * Returns a set of effect names that appear to be used.
 */
function inferEffectsFromNode(node: AstNode): Set<string> {
  const effects = new Set<string>();

  function walk(n: AstNode): void {
    // Check call expressions against known patterns
    if (n.kind === "callExpr" || n.kind === "memberExpr") {
      const callText = buildCallText(n);
      for (const [pattern, effect] of EFFECT_CALL_PATTERNS) {
        if (pattern.test(callText)) {
          effects.add(effect);
        }
      }
    }
    for (const child of n.children ?? []) {
      walk(child);
    }
  }

  walk(node);
  return effects;
}

/**
 * Reconstructs a dotted call string from a call or member expression node
 * for pattern matching.
 */
function buildCallText(node: AstNode): string {
  if (node.kind === "callExpr") {
    const receiver = node.children?.[0];
    const methodName = node.value ?? "";
    if (receiver !== undefined) {
      return `${buildCallText(receiver)}.${methodName}`;
    }
    return methodName;
  }
  if (node.kind === "memberExpr") {
    const receiver = node.children?.[0];
    const member = node.value ?? "";
    if (receiver !== undefined) {
      return `${buildCallText(receiver)}.${member}`;
    }
    return member;
  }
  if (node.kind === "identifier") {
    return node.value ?? "";
  }
  return "";
}

function formatEffects(effects: readonly string[]): string {
  return `[${effects.join(", ")}]`;
}

// ---------------------------------------------------------------------------
// Flat diagnostic converter (for merging into CompilerResult)
// ---------------------------------------------------------------------------

/**
 * Converts EffectCheckResults into a flat ParseDiagnostic array
 * compatible with the compiler's CompilerDiagnostic shape.
 */
export function effectResultsToDiagnostics(
  results: readonly EffectCheckResult[],
): readonly ParseDiagnostic[] {
  return results.flatMap((r) =>
    r.diagnostics.map((d) => ({
      code: d.code,
      name: d.name,
      severity: d.severity,
      message: d.message,
      ...(d.location !== undefined ? { location: d.location } : {}),
      ...(d.suggestedFix !== undefined ? { suggestedFix: d.suggestedFix } : {}),
    })),
  );
}
