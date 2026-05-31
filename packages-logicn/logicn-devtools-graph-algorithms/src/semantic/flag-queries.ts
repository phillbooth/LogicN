// =============================================================================
// LogicN Phase 18–23 — Flag-Aware Query Functions
//
// NodeFlags, GovernanceFlags, and EffectFlags bitmask constants plus
// query helpers for SemanticGraph.  Mirror the values from parser.ts and
// type-registry.ts — keep in sync when those evolve.
// =============================================================================

import type { SemanticGraph, SemanticNode } from "./SemanticGraph.js";

// ---------------------------------------------------------------------------
// Bitmask constants
// ---------------------------------------------------------------------------

/** NodeFlags — mirrors parser.ts */
export const NodeFlagQuery = {
  HasContract:     1 << 0,
  HasEffects:      1 << 1,
  HasCompute:      1 << 2,
  TensorCandidate: 1 << 3,
  ReadonlyInputs:  1 << 4,
  IsPure:          1 << 5,
  IsSecure:        1 << 6,
  HasPrivacy:      1 << 7,
} as const;

/** GovernanceFlags — mirrors type-registry.ts */
export const GovernanceFlagQuery = {
  RequiresAudit:    1 << 0,
  DenyRemote:       1 << 1,
  ContainsPII:      1 << 2,
  AllowsNetwork:    1 << 3,
  RequiresActor:    1 << 4,
  ProductionStrict: 1 << 5,
  RequiresIntent:   1 << 6,
  HasPolicy:        1 << 7,
} as const;

/** EffectFlags — mirrors type-registry.ts */
export const EffectFlagQuery = {
  DatabaseRead:    1 << 0,
  DatabaseWrite:   1 << 1,
  NetworkOutbound: 1 << 2,
  AuditWrite:      1 << 3,
  AiInference:     1 << 4,
  SecretAccess:    1 << 9,   // secret.access / secret.read
  ProcessSpawn:    1 << 14,  // process.spawn
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function flowNodes(graph: SemanticGraph): readonly SemanticNode[] {
  return graph.nodes.filter((n) => n.kind === "flow" || n.kind === "fn");
}

/**
 * The SemanticGraph prefixes node IDs with their kind: "flow:embed", "fn:helper".
 * Flags maps (NodeFlags, GovernanceFlags) are keyed by plain flow name ("embed").
 * This helper normalises the id for map lookup.
 */
function flowName(nodeId: string): string {
  return nodeId.replace(/^(flow|fn):/, "");
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * Find all flow/fn nodes in a SemanticGraph whose entry in `nodeFlagsByFlow`
 * matches the given NodeFlags bitmask.
 *
 * Because NodeFlags live on the AST (not inside SemanticNode), they must be
 * supplied via `nodeFlagsByFlow` — a map from flow id to its flags value.
 *
 * Usage:
 *   findFlowsByNodeFlags(graph, nodeFlagsMap, NodeFlagQuery.IsPure | NodeFlagQuery.TensorCandidate)
 */
export function findFlowsByNodeFlags(
  graph: SemanticGraph,
  nodeFlagsByFlow: ReadonlyMap<string, number>,
  requiredFlags: number,
): SemanticNode[] {
  return flowNodes(graph).filter((node) => {
    const flags = nodeFlagsByFlow.get(flowName(node.id)) ?? 0;
    return (flags & requiredFlags) === requiredFlags;
  });
}

/**
 * Find all flow/fn nodes matching the given GovernanceFlags bitmask.
 *
 * `governanceFlagsByFlow` is typically sourced from
 * `GovernanceVerifyResult.governanceFlagsByFlow`.
 */
export function findFlowsByGovernanceFlags(
  graph: SemanticGraph,
  governanceFlagsByFlow: ReadonlyMap<string, number>,
  requiredFlags: number,
): SemanticNode[] {
  return flowNodes(graph).filter((node) => {
    const flags = governanceFlagsByFlow.get(flowName(node.id)) ?? 0;
    return (flags & requiredFlags) === requiredFlags;
  });
}

/**
 * Find flow/fn nodes that declare at least the given EffectFlags.
 *
 * Useful for: "find all flows that write to the database AND write an audit
 * record" — pass `EffectFlagQuery.DatabaseWrite | EffectFlagQuery.AuditWrite`.
 */
export function findFlowsByEffectFlags(
  graph: SemanticGraph,
  effectFlagsByFlow: ReadonlyMap<string, number>,
  requiredFlags: number,
): SemanticNode[] {
  return flowNodes(graph).filter((node) => {
    const flags = effectFlagsByFlow.get(node.id) ?? 0;
    return (flags & requiredFlags) === requiredFlags;
  });
}

/** NativeCapabilityId — mirrors type-registry.ts */
export const NativeCapabilityQuery = {
  NpuInference:    "host.npu.inference",
  GpuCompute:      "host.gpu.compute",
  GpuMatmul:       "host.gpu.matmul",
  ApuSharedMemory: "host.apu.shared_memory",
  WasmSimd:        "host.wasm.simd",
  PhotonicBridge:  "host.photonic.bridge",
} as const;

/**
 * Find flows that require a specific native capability.
 * capabilityUsageByFlow: Map<flowName, string[]> of native capabilities each flow uses.
 */
export function findFlowsByNativeCapability(
  graph: SemanticGraph,
  capabilityUsageByFlow: ReadonlyMap<string, readonly string[]>,
  requiredCapability: string,
): SemanticNode[] {
  return flowNodes(graph).filter((node) => {
    const caps = capabilityUsageByFlow.get(flowName(node.id));
    return caps !== undefined && caps.includes(requiredCapability);
  });
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface GraphFlagSummary {
  readonly totalFlows: number;
  readonly pureFlows: number;
  readonly secureFlows: number;
  readonly tensorCandidates: number;
  readonly requiresAudit: number;
  readonly containsPII: number;
  readonly allowsNetwork: number;
  readonly denyRemote: number;
}

/**
 * Get a summary of flag counts across all flow/fn nodes in the graph.
 *
 * NodeFlags (pure, secure, tensor) are derived from `nodeFlagsByFlow`.
 * GovernanceFlags (requiresAudit, containsPII, allowsNetwork, denyRemote)
 * are derived from `governanceFlagsByFlow`.
 */
export function getGraphFlagSummary(
  graph: SemanticGraph,
  nodeFlagsByFlow: ReadonlyMap<string, number>,
  governanceFlagsByFlow: ReadonlyMap<string, number>,
): GraphFlagSummary {
  const flows = flowNodes(graph);
  let pureFlows = 0;
  let secureFlows = 0;
  let tensorCandidates = 0;
  let requiresAudit = 0;
  let containsPII = 0;
  let allowsNetwork = 0;
  let denyRemote = 0;

  for (const node of flows) {
    const name = flowName(node.id);
    const nf = nodeFlagsByFlow.get(name) ?? 0;
    const gf = governanceFlagsByFlow.get(name) ?? 0;

    if ((nf & NodeFlagQuery.IsPure) !== 0)          pureFlows++;
    if ((nf & NodeFlagQuery.IsSecure) !== 0)         secureFlows++;
    if ((nf & NodeFlagQuery.TensorCandidate) !== 0)  tensorCandidates++;
    if ((gf & GovernanceFlagQuery.RequiresAudit) !== 0) requiresAudit++;
    if ((gf & GovernanceFlagQuery.ContainsPII) !== 0)   containsPII++;
    if ((gf & GovernanceFlagQuery.AllowsNetwork) !== 0) allowsNetwork++;
    if ((gf & GovernanceFlagQuery.DenyRemote) !== 0)    denyRemote++;
  }

  return {
    totalFlows: flows.length,
    pureFlows,
    secureFlows,
    tensorCandidates,
    requiresAudit,
    containsPII,
    allowsNetwork,
    denyRemote,
  };
}

// ---------------------------------------------------------------------------
// Anti-abuse query functions
// ---------------------------------------------------------------------------

/**
 * Returns flow/fn nodes that declare network.outbound — these need network
 * destination policy review.
 */
export function findFlowsWithNetworkPolicy(
  graph: SemanticGraph,
  effectFlagsByFlow: ReadonlyMap<string, number>,
): SemanticNode[] {
  return flowNodes(graph).filter((node) => {
    const flags = effectFlagsByFlow.get(node.id) ?? 0;
    return (flags & EffectFlagQuery.NetworkOutbound) !== 0;
  });
}

/**
 * Returns flow/fn nodes that declare process.spawn — background workers that
 * need governance review.
 */
export function findFlowsWithProcessSpawn(
  graph: SemanticGraph,
  effectFlagsByFlow: ReadonlyMap<string, number>,
): SemanticNode[] {
  return flowNodes(graph).filter((node) => {
    const flags = effectFlagsByFlow.get(node.id) ?? 0;
    return (flags & EffectFlagQuery.ProcessSpawn) !== 0;
  });
}

/**
 * Returns flow/fn nodes that declare secret.access or secret.read — secret
 * handling flows.
 */
export function findFlowsWithSecretAccess(
  graph: SemanticGraph,
  effectFlagsByFlow: ReadonlyMap<string, number>,
): SemanticNode[] {
  return flowNodes(graph).filter((node) => {
    const flags = effectFlagsByFlow.get(node.id) ?? 0;
    return (flags & EffectFlagQuery.SecretAccess) !== 0;
  });
}

export interface AntiAbuseReport {
  readonly networkFlows: number;           // flows with network.outbound
  readonly auditedFlows: number;           // flows with audit.write
  readonly unauditedNetworkFlows: number;  // network.outbound WITHOUT audit.write (risk)
  readonly processSpawnFlows: number;      // flows with process.spawn
  readonly piiFlows: number;               // flows with ContainsPII governance flag
}

/**
 * Returns a summary of the anti-abuse posture for a graph.
 *
 * `effectFlagsByFlow` is keyed by full node id (e.g. "fetchUser").
 * `governanceFlagsByFlow` is keyed by plain flow name (prefixes stripped).
 */
export function getAntiAbuseReport(
  graph: SemanticGraph,
  effectFlagsByFlow: ReadonlyMap<string, number>,
  governanceFlagsByFlow: ReadonlyMap<string, number>,
): AntiAbuseReport {
  const flows = flowNodes(graph);
  let networkFlows = 0;
  let auditedFlows = 0;
  let unauditedNetworkFlows = 0;
  let processSpawnFlows = 0;
  let piiFlows = 0;

  for (const node of flows) {
    const ef = effectFlagsByFlow.get(node.id) ?? 0;
    const gf = governanceFlagsByFlow.get(flowName(node.id)) ?? 0;

    const hasNetwork = (ef & EffectFlagQuery.NetworkOutbound) !== 0;
    const hasAudit   = (ef & EffectFlagQuery.AuditWrite) !== 0;

    if (hasNetwork)  networkFlows++;
    if (hasAudit)    auditedFlows++;
    if (hasNetwork && !hasAudit) unauditedNetworkFlows++;
    if ((ef & EffectFlagQuery.ProcessSpawn) !== 0)         processSpawnFlows++;
    if ((gf & GovernanceFlagQuery.ContainsPII) !== 0)      piiFlows++;
  }

  return { networkFlows, auditedFlows, unauditedNetworkFlows, processSpawnFlows, piiFlows };
}
