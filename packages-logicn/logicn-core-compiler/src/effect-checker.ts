// =============================================================================
// LogicN Phase 5 — Effect Checker
//
// Validates that effects declared on flows are consistent with their content.
// Spec: docs/Knowledge-Bases/effect-checker-and-boundary-checker.md
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
  readonly suggestedCode?: string;
}

export interface EffectCheckResult {
  readonly flowName: string;
  readonly qualifier: "flow" | "secure" | "pure" | "guarded";
  readonly declaredEffects: readonly string[];
  readonly observedEffects: readonly string[];
  readonly diagnostics: readonly EffectDiagnostic[];
}

const CANONICAL_EFFECTS = new Set([
  "database.read", "database.write",
  "network.outbound", "network.inbound",
  "network.external", "network.internal",
  "secret.read", "secret.write",
  "audit.write",
  "filesystem.read", "filesystem.write",
  "ai.inference",
  "compute.gpu", "compute.npu", "compute.cpu",
  "desktop.user.read",
  "unsafe.native",
  "payment.charge",
  "pii.read", "pii.write",
  "phi.read", "phi.write",
]);

const EFFECT_NAME_ALIASES: ReadonlyMap<string, string> = new Map([
  ["network", "network.outbound"],
  ["database", "database.read"],
  ["filesystem", "filesystem.read"],
  ["secret", "secret.read"],
  ["ai", "ai.inference"],
  ["audit", "audit.write"],
  ["pii", "pii.read"],
  ["phi", "phi.read"],
]);

// ---------------------------------------------------------------------------
// Known effect-producing call patterns
// ---------------------------------------------------------------------------

const EFFECT_CALL_PATTERNS: ReadonlyMap<RegExp, string> = new Map([
  // Database
  [/\b\w+DB\.insert\b/, "database.write"],
  [/\b\w+DB\.update\b/, "database.write"],
  [/\b\w+DB\.update\w+/, "database.write"],
  [/\b\w+DB\.delete\b/, "database.write"],
  [/\b\w+DB\.\w+/, "database.read"],
  // Audit log
  [/\bAuditLog\.write\b/, "audit.write"],
  // HTTP client
  [/\bhttp\.get\b/, "network.outbound"],
  [/\bhttp\.post\b/, "network.outbound"],
  [/\bhttp\.put\b/, "network.outbound"],
  [/\bhttp\.patch\b/, "network.outbound"],
  [/\bhttp\.delete\b/, "network.outbound"],
  // Network adapters
  [/\b\w+Api\.charge\b/, "network.outbound"],
  [/\b\w+Api\.send\b/, "network.outbound"],
  [/\b\w+Adapter\.\w+/, "network.outbound"],
  [/\bEmailService\.\w+/, "network.outbound"],
  // Filesystem
  [/\bfs\.readText\b/, "filesystem.read"],
  [/\bfs\.read\b/, "filesystem.read"],
  [/\bFile\.read\b/, "filesystem.read"],
  [/\bfs\.writeText\b/, "filesystem.write"],
  [/\bfs\.write\b/, "filesystem.write"],
  [/\bFileSystem\.\w+/, "filesystem.write"],
  // Environment and secrets
  [/\bEnv\.get\b/, "secret.read"],
  [/\benv\.get\b/, "secret.read"],
  [/\benv\.secret\b/, "secret.read"],
  [/\bvault\.secret\b/, "secret.read"],
  // AI / inference
  [/\w+Model\.run\b/, "ai.inference"],
  [/\w+Model\.infer\b/, "ai.inference"],
  // Payment
  [/\w+Payment\.\w+/, "payment.charge"],
  [/\w+Payments\.\w+/, "payment.charge"],
  // Desktop / host
  [/\bHost\.\w+/, "desktop.user.read"],
  // Native / FFI
  [/\bNative\w+\.\w+/, "unsafe.native"],
]);

const PURE_FORBIDDEN_EFFECTS = new Set([
  "database.read", "database.write",
  "network.outbound", "network.external", "network.inbound", "network.internal",
  "secret.read", "secret.write",
  "audit.write",
  "filesystem.write", "filesystem.read",
  "desktop.user.read",
  "unsafe.native",
  "payment.charge",
  "ai.inference",
  "pii.read", "pii.write",
  "phi.read", "phi.write",
]);

const PLAIN_FLOW_PRIVILEGED_EFFECTS = new Set([
  "secret.read",
  "payment.charge",
]);

// ---------------------------------------------------------------------------
// Public checker entry points
// ---------------------------------------------------------------------------

export function checkEffects(
  flows: readonly FlowMeta[],
  ast: AstNode,
): readonly EffectCheckResult[] {
  const effectfulFlows = new Set(
    flows
      .filter((flow) => flow.qualifier !== "pure" && flow.declaredEffects.length > 0)
      .map((flow) => flow.name),
  );
  const callGraph = buildFlowCallGraph(flows, ast);

  return flows.map((flow) => checkFlowEffects(flow, ast, flows, callGraph, effectfulFlows));
}

export function checkFlowEffects(
  flow: FlowMeta,
  ast: AstNode,
  allFlows: readonly FlowMeta[] = [flow],
  callGraph: ReadonlyMap<string, ReadonlySet<string>> = buildFlowCallGraph(allFlows, ast),
  effectfulFlows: ReadonlySet<string> = new Set(
    allFlows
      .filter((candidate) => candidate.qualifier !== "pure" && candidate.declaredEffects.length > 0)
      .map((candidate) => candidate.name),
  ),
): EffectCheckResult {
  const diagnostics: EffectDiagnostic[] = [];
  const flowNode = findFlowNode(ast, flow.name);
  const observedEffects = flowNode === undefined ? new Set<string>() : inferEffectsFromNode(flowNode);

  validateDeclaredEffectNames(flow, diagnostics);

  if (flow.qualifier === "pure" && flow.declaredEffects.length > 0) {
    diagnostics.push({
      code: "LLN-EFFECT-003",
      name: "EFFECT_BOUNDARY_VIOLATION",
      severity: "error",
      message: `pure flow "${flow.name}" declares effects ${formatEffects(flow.declaredEffects)}. Pure flows must have no effects.`,
      location: flow.location,
      suggestedFix: `Remove the effects declaration, or change "pure flow" to "guarded flow" if side effects are needed.`,
      suggestedCode: `pure flow ${flow.name}`,
    });
  }

  if (flow.qualifier === "pure" && flowNode !== undefined) {
    for (const effect of observedEffects) {
      if (PURE_FORBIDDEN_EFFECTS.has(effect)) {
        diagnostics.push({
          code: "LLN-EFFECT-003",
          name: "EFFECT_BOUNDARY_VIOLATION",
          severity: "error",
          message: `pure flow "${flow.name}" uses "${effect}" which is forbidden in pure flows.`,
          location: flow.location,
          suggestedFix: `Move this call to a guarded or secure flow and declare the required effect.`,
          suggestedCode: `guarded flow ${flow.name}`,
        });
      }
    }

    for (const callName of unique(findCallsToEffectfulFlows(flowNode, effectfulFlows))) {
      diagnostics.push({
        code: "LLN-EFFECT-003",
        name: "EFFECT_BOUNDARY_VIOLATION",
        severity: "error",
        message: `pure flow "${flow.name}" calls "${callName}" which has declared effects. Pure flows cannot call effectful flows.`,
        location: flow.location,
        suggestedFix: `Change "pure flow" to "guarded flow" and declare the required effects.`,
        suggestedCode: `guarded flow ${flow.name}`,
      });
    }
  }

  if ((flow.qualifier === "secure" || flow.qualifier === "guarded") && flowNode !== undefined) {
    const declared = new Set(flow.declaredEffects);

    for (const effect of observedEffects) {
      if (!declared.has(effect)) {
        diagnostics.push({
          code: "LLN-EFFECT-001",
          name: "UNDECLARED_EFFECT",
          severity: "error",
          message: `${flow.qualifier} flow "${flow.name}" uses effect "${effect}" which is not declared.`,
          location: flow.location,
          suggestedFix: `Add "${effect}" to the effects declaration: effects [${[...declared, effect].join(", ")}]`,
          suggestedCode: `effects [${[...declared, effect].join(", ")}]`,
        });
      }
    }

    for (const effect of flow.declaredEffects) {
      if (!observedEffects.has(effect) && !hasTransitiveEffect(flow.name, effect, allFlows, callGraph, new Set())) {
        diagnostics.push({
          code: "LLN-EFFECT-002",
          name: "OVERDECLARED_EFFECT",
          severity: "warning",
          message: `${flow.qualifier} flow "${flow.name}" declares effect "${effect}" but no matching operation was observed.`,
          location: flow.location,
          suggestedFix: `Remove "${effect}" from the effects declaration if it is not required.`,
        });
      }
    }
  }

  validateInterFlowPropagation(flow, allFlows, callGraph, diagnostics);

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
          suggestedCode: `secure flow ${flow.name}`,
        });
      }
    }
  }

  return {
    flowName: flow.name,
    qualifier: flow.qualifier,
    declaredEffects: flow.declaredEffects,
    observedEffects: [...observedEffects],
    diagnostics,
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateDeclaredEffectNames(flow: FlowMeta, diagnostics: EffectDiagnostic[]): void {
  for (const effect of flow.declaredEffects) {
    const canonical = EFFECT_NAME_ALIASES.get(effect);
    if (canonical !== undefined) {
      diagnostics.push({
        code: "LLN-EFFECT-004",
        name: "NON_CANONICAL_EFFECT",
        severity: "error",
        message: `Effect "${effect}" is not a canonical effect name. Use "${canonical}".`,
        location: flow.location,
        suggestedFix: `Replace "${effect}" with "${canonical}" in the effects declaration.`,
        suggestedCode: canonical,
      });
    } else if (!CANONICAL_EFFECTS.has(effect)) {
      diagnostics.push({
        code: "LLN-EFFECT-004",
        name: "UNKNOWN_EFFECT",
        severity: "error",
        message: `Effect "${effect}" is not a recognised LogicN effect name.`,
        location: flow.location,
        suggestedFix: `Use a canonical effect name such as: network.outbound, database.write, audit.write, secret.read, filesystem.read`,
      });
    }
  }
}

function validateInterFlowPropagation(
  flow: FlowMeta,
  allFlows: readonly FlowMeta[],
  callGraph: ReadonlyMap<string, ReadonlySet<string>>,
  diagnostics: EffectDiagnostic[],
): void {
  const declared = new Set(flow.declaredEffects);
  const requiredEffects = collectTransitiveCalledEffects(flow.name, allFlows, callGraph, new Set([flow.name]));

  for (const [effect, calledName] of requiredEffects) {
    if (!declared.has(effect)) {
      diagnostics.push({
        code: "LLN-EFFECT-002",
        name: "TRANSITIVE_EFFECT_NOT_DECLARED",
        severity: "error",
        message: `Flow "${flow.name}" calls "${calledName}" which requires effect "${effect}", but "${flow.name}" does not declare it.`,
        location: flow.location,
        suggestedFix: `Add "${effect}" to effects: effects [${[...declared, effect].join(", ")}]`,
        suggestedCode: `effects [${[...declared, effect].join(", ")}]`,
      });
    }
  }
}

function collectTransitiveCalledEffects(
  flowName: string,
  allFlows: readonly FlowMeta[],
  callGraph: ReadonlyMap<string, ReadonlySet<string>>,
  seen: Set<string>,
): Map<string, string> {
  const effects = new Map<string, string>();
  const calledFlows = callGraph.get(flowName) ?? new Set<string>();

  for (const calledName of calledFlows) {
    const calledMeta = allFlows.find((candidate) => candidate.name === calledName);
    if (calledMeta === undefined) continue;

    for (const effect of calledMeta.declaredEffects) {
      if (!effects.has(effect)) {
        effects.set(effect, calledName);
      }
    }

    if (!seen.has(calledName)) {
      seen.add(calledName);
      for (const [effect, introducer] of collectTransitiveCalledEffects(calledName, allFlows, callGraph, seen)) {
        if (!effects.has(effect)) {
          effects.set(effect, introducer);
        }
      }
    }
  }

  return effects;
}

function hasTransitiveEffect(
  flowName: string,
  effect: string,
  allFlows: readonly FlowMeta[],
  callGraph: ReadonlyMap<string, ReadonlySet<string>>,
  seen: Set<string>,
): boolean {
  if (seen.has(flowName)) return false;
  seen.add(flowName);

  const calledFlows = callGraph.get(flowName) ?? new Set<string>();
  for (const calledName of calledFlows) {
    const calledMeta = allFlows.find((candidate) => candidate.name === calledName);
    if (calledMeta?.declaredEffects.includes(effect) === true) return true;
    if (hasTransitiveEffect(calledName, effect, allFlows, callGraph, seen)) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

function findFlowNode(ast: AstNode, name: string): AstNode | undefined {
  const kinds: AstNodeKind[] = ["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl"];

  function walk(node: AstNode): AstNode | undefined {
    if (kinds.includes(node.kind) && node.value === name) {
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

function buildFlowCallGraph(
  flows: readonly FlowMeta[],
  ast: AstNode,
): ReadonlyMap<string, ReadonlySet<string>> {
  const graph = new Map<string, Set<string>>();
  const knownFlows = new Set(flows.map((flow) => flow.name));

  for (const flow of flows) {
    const node = findFlowNode(ast, flow.name);
    if (node !== undefined) {
      const calls = new Set<string>();
      findDirectFlowCalls(node, knownFlows, calls);
      graph.set(flow.name, calls);
    }
  }

  return graph;
}

function findDirectFlowCalls(
  node: AstNode,
  knownFlows: ReadonlySet<string>,
  result: Set<string>,
): void {
  if (node.kind === "callExpr" && node.value !== undefined && knownFlows.has(node.value)) {
    result.add(node.value);
  }
  for (const child of node.children ?? []) {
    findDirectFlowCalls(child, knownFlows, result);
  }
}

function findCallsToEffectfulFlows(
  node: AstNode,
  effectfulFlows: ReadonlySet<string>,
): string[] {
  const calls: string[] = [];

  function walk(n: AstNode): void {
    if (n.kind === "callExpr" && n.value !== undefined && effectfulFlows.has(n.value)) {
      calls.push(n.value);
    }
    for (const child of n.children ?? []) {
      walk(child);
    }
  }

  walk(node);
  return calls;
}

function inferEffectsFromNode(node: AstNode): Set<string> {
  const effects = new Set<string>();

  function walk(n: AstNode): void {
    if (n.kind === "callExpr" || n.kind === "memberExpr") {
      const callText = buildCallText(n);
      for (const [pattern, effect] of EFFECT_CALL_PATTERNS) {
        if (pattern.test(callText)) {
          effects.add(effect);
          break;
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

function buildCallText(node: AstNode): string {
  if (node.kind === "callExpr") {
    const methodName = node.value ?? "";
    const receiver = node.children?.[0];
    if (receiver !== undefined) {
      const receiverText = buildCallText(receiver);
      if (receiverText !== "" && receiverLooksLikeMemberReceiver(receiver)) {
        return `${receiverText}.${methodName}`;
      }
    }
    return methodName;
  }
  if (node.kind === "memberExpr") {
    const receiver = node.children?.[0];
    const member = node.value ?? "";
    if (receiver !== undefined) {
      const receiverText = buildCallText(receiver);
      return receiverText !== "" ? `${receiverText}.${member}` : member;
    }
    return member;
  }
  if (node.kind === "identifier") {
    return node.value ?? "";
  }
  return "";
}

function receiverLooksLikeMemberReceiver(node: AstNode): boolean {
  if (node.kind === "memberExpr") return true;
  if (node.kind !== "identifier") return false;
  const value = node.value ?? "";
  return /^[A-Z]/.test(value) || value === "http" || value === "fs" || value === "env" || value === "json" || value === "toml" || value === "vault";
}

function formatEffects(effects: readonly string[]): string {
  return `[${effects.join(", ")}]`;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

// ---------------------------------------------------------------------------
// Flat diagnostic converter (for merging into CompilerResult)
// ---------------------------------------------------------------------------

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
      ...(d.suggestedCode !== undefined ? { suggestedCode: d.suggestedCode } : {}),
    })),
  );
}
