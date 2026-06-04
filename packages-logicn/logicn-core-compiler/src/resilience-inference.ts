// =============================================================================
// LogicN — Resilience Inference (Convention over Configuration)
//
// `contract { resilience {} }` is OPTIONAL and auto-by-default.
// The compiler infers retry strategy, fallback, and quarantine settings
// from the flow's declared effects and qualifier.
//
// Design approved: 2026-06-04 (logicn-resilience-observability-design.md)
//
// Key rules:
//   - retry is FORBIDDEN on database.write / gateway.charge without idempotent: true
//     → LLN-RES-001
//   - pure flows default to 0 retries (pure = side-effect-free, safe to retry but
//     only with explicit declaration)
//   - secure flows with network.outbound default to 1 retry
//   - database.write flows default to 0 retries
//   - circuit_breaker fallback integrates with DRCM V_DPM (DRCM Phase 5)
//
// AI generators: do NOT generate resilience blocks for simple flows.
// Only declare when overriding the inferred policy.
// =============================================================================

import { type AstNode, type FlowMeta } from "./parser.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResilienceFallback =
  | "propagate"       // default — return error as-is
  | "return_cached"   // return last successful cached result
  | "return_default"  // return flow's declared default value
  | "quarantine"      // immediately quarantine the flow
  | "circuit_breaker" // trip V_DPM → DPM_DEFENSIVE_MODE (DRCM Phase 5)
  | "escalate";       // surface to parent flow error handler

export type BackoffStrategy = "constant" | "linear" | "exponential";

export interface InferredResilience {
  /** Number of retry attempts on transient failure */
  readonly retryCount: number;
  /** Backoff strategy between retry attempts */
  readonly backoff: BackoffStrategy;
  /** Maximum delay between retry attempts (ms) */
  readonly maxDelayMs: number;
  /** Behaviour when retries exhausted */
  readonly fallback: ResilienceFallback;
  /** Quarantine after N consecutive failures (0 = disabled) */
  readonly quarantineAfter: number;
  /** Quarantine reset strategy ("manual" or "after_Ns") */
  readonly quarantineReset: string;
  /** Whether flow declares idempotency (enables retry for mutation effects) */
  readonly idempotent: boolean;
  /** DPM posture bit to set on quarantine (DRCM Phase 5, "" = none) */
  readonly onQuarantinePostureBit: string;
  /** True if resilience was explicitly declared in contract */
  readonly explicit: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MUTATION_EFFECTS = new Set([
  "database.write", "database.delete", "database.update",
  "gateway.charge", "ledger.mutate",
]);

const NETWORK_EFFECTS = new Set([
  "network.outbound", "http.outbound", "http.post", "http.put",
]);

function hasExplicitResilience(flowNode: AstNode): boolean {
  const contractNode = (flowNode.children ?? []).find(c => c.kind === "contractDecl");
  return (contractNode?.children ?? []).some(
    c => c.kind === "identifier" && c.value === "resilience:block",
  );
}

function extractResilienceField(flowNode: AstNode, field: string): string | null {
  const contractNode = (flowNode.children ?? []).find(c => c.kind === "contractDecl");
  if (contractNode === undefined) return null;
  const resBlock = (contractNode.children ?? []).find(
    c => c.kind === "identifier" && c.value === "resilience:block",
  );
  if (resBlock === undefined) return null;
  for (const child of resBlock.children ?? []) {
    if (child.kind === "identifier" && (child.value ?? "").startsWith(`decl:${field}`)) {
      return child.value ?? null;
    }
  }
  return null;
}

function extractIdempotentFlag(flowNode: AstNode): boolean {
  // idempotent may appear on its own line ("decl:idempotent : true") OR
  // on the same line as retry ("decl:retry 3 times idempotent : true").
  // Search for the keyword anywhere in any resilience block decl line.
  const contractNode = (flowNode.children ?? []).find(c => c.kind === "contractDecl");
  if (contractNode === undefined) return false;
  const resBlock = (contractNode.children ?? []).find(
    c => c.kind === "identifier" && c.value === "resilience:block",
  );
  if (resBlock === undefined) return false;
  return (resBlock.children ?? []).some(
    c => c.kind === "identifier" && (c.value ?? "").includes("idempotent"),
  );
}

function extractFallback(flowNode: AstNode): ResilienceFallback | null {
  const raw = extractResilienceField(flowNode, "fallback");
  if (raw === null) return null;
  const val = raw.replace(/^decl:fallback\s*/, "").trim();
  const valid: ResilienceFallback[] = [
    "propagate", "return_cached", "return_default",
    "quarantine", "circuit_breaker", "escalate",
  ];
  return valid.includes(val as ResilienceFallback) ? (val as ResilienceFallback) : null;
}

function extractRetryCount(flowNode: AstNode): number | null {
  const raw = extractResilienceField(flowNode, "retry");
  if (raw === null) return null;
  const match = raw.match(/retry\s+(\d+)/);
  return match !== undefined && match?.[1] !== undefined ? parseInt(match[1], 10) : null;
}

function extractOnQuarantine(flowNode: AstNode): string {
  const raw = extractResilienceField(flowNode, "on_quarantine");
  if (raw === null) return "";
  const match = raw.match(/set_posture_bit\s+(\w+)/);
  return match?.[1] ?? "";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Infer resilience policy for a flow from its declared effects and qualifier.
 *
 * Called by the governance verifier for every flow — explicit `resilience {}`
 * overrides defaults; absent block triggers convention-based inference.
 */
export function inferFlowResilience(
  flowNode: AstNode,
  flow: FlowMeta,
): InferredResilience {
  const hasMutationEffect = flow.declaredEffects.some(e => MUTATION_EFFECTS.has(e));
  const hasNetworkEffect  = flow.declaredEffects.some(e => NETWORK_EFFECTS.has(e));
  const isPure            = flow.qualifier === "pure";
  const idempotent        = extractIdempotentFlag(flowNode);

  if (hasExplicitResilience(flowNode)) {
    const retryCount = extractRetryCount(flowNode) ?? (hasMutationEffect && !idempotent ? 0 : 1);
    return {
      retryCount,
      backoff:                 "exponential",
      maxDelayMs:              5000,
      fallback:                extractFallback(flowNode) ?? "propagate",
      quarantineAfter:         0,
      quarantineReset:         "manual",
      idempotent,
      onQuarantinePostureBit:  extractOnQuarantine(flowNode),
      explicit:                true,
    };
  }

  // Auto-by-default inference:
  if (isPure) {
    // Pure flows: no retry needed (side-effect-free, safe to retry at caller level)
    return { retryCount: 0, backoff: "constant", maxDelayMs: 0, fallback: "propagate",
             quarantineAfter: 0, quarantineReset: "manual", idempotent: false,
             onQuarantinePostureBit: "", explicit: false };
  }
  if (hasMutationEffect) {
    // Mutation effects: NO retry by default (safety — avoid duplicate writes)
    return { retryCount: 0, backoff: "constant", maxDelayMs: 0, fallback: "propagate",
             quarantineAfter: 0, quarantineReset: "manual", idempotent: false,
             onQuarantinePostureBit: "", explicit: false };
  }
  if (hasNetworkEffect) {
    // Network effects: 1 retry with exponential backoff (transient fault tolerance)
    return { retryCount: 1, backoff: "exponential", maxDelayMs: 5000, fallback: "propagate",
             quarantineAfter: 0, quarantineReset: "manual", idempotent: false,
             onQuarantinePostureBit: "", explicit: false };
  }

  // Default: no retry
  return { retryCount: 0, backoff: "constant", maxDelayMs: 0, fallback: "propagate",
           quarantineAfter: 0, quarantineReset: "manual", idempotent: false,
           onQuarantinePostureBit: "", explicit: false };
}

// ---------------------------------------------------------------------------
// Governance check (LLN-RES-001)
// ---------------------------------------------------------------------------

export interface ResilienceViolation {
  readonly code: "LLN-RES-001";
  readonly message: string;
}

/**
 * LLN-RES-001: retry is forbidden on flows with database.write or gateway.charge
 * unless the flow explicitly declares idempotent: true in resilience {}.
 */
export function checkResilienceViolations(
  flowNode: AstNode,
  flow: FlowMeta,
): ResilienceViolation[] {
  const violations: ResilienceViolation[] = [];
  const inferred = inferFlowResilience(flowNode, flow);

  if (inferred.retryCount > 0 && !inferred.idempotent) {
    const mutationEffects = flow.declaredEffects.filter(e => MUTATION_EFFECTS.has(e));
    if (mutationEffects.length > 0) {
      violations.push({
        code: "LLN-RES-001",
        message:
          `Flow '${flow.name}' declares retry: ${inferred.retryCount} but has ` +
          `mutation effects [${mutationEffects.join(", ")}] without idempotent: true. ` +
          `Retrying mutations risks duplicate writes. Add 'idempotent: true' to ` +
          `resilience {} or remove the retry declaration.`,
      });
    }
  }

  return violations;
}
