// =============================================================================
// Phase 11C — Runtime Context
//
// Per-flow execution context carrying actor identity, trace ID, and deadline.
// =============================================================================

import { type RuntimeManifest } from "../type-registry.js";

export interface RuntimeContext {
  readonly flowName: string;
  readonly traceId?: string;
  readonly actor?: string;
  /** Absolute timestamp (ms since epoch) when the flow must complete. */
  readonly deadlineMs?: number;
  /** Date.now() captured when the flow started. */
  readonly startedAt: number;
}

/**
 * Creates a new RuntimeContext for the named flow.
 */
export function createContext(
  flowName: string,
  opts?: { traceId?: string; actor?: string; deadlineMs?: number },
): RuntimeContext {
  return {
    flowName,
    startedAt: Date.now(),
    ...(opts?.traceId !== undefined ? { traceId: opts.traceId } : {}),
    ...(opts?.actor !== undefined ? { actor: opts.actor } : {}),
    ...(opts?.deadlineMs !== undefined ? { deadlineMs: opts.deadlineMs } : {}),
  };
}

/**
 * Returns true when the context has a deadline and it has already passed.
 */
export function isExpired(ctx: RuntimeContext): boolean {
  if (ctx.deadlineMs === undefined) {
    return false;
  }
  return Date.now() > ctx.deadlineMs;
}

/**
 * Returns the number of milliseconds remaining until the deadline,
 * or undefined when no deadline is set.
 */
export function remainingMs(ctx: RuntimeContext): number | undefined {
  if (ctx.deadlineMs === undefined) {
    return undefined;
  }
  return Math.max(0, ctx.deadlineMs - Date.now());
}

/**
 * R6B: Verify that a RuntimeManifest is suitable for fast-path execution.
 *
 * Returns true when:
 *   - manifest.verified is true (compiler-attested), AND
 *   - manifest.governanceFlagsMask > 0 (at least one governance flag is set)
 *
 * When this returns true, the executor may use manifest.allowedEffects as the
 * pre-approved capability list and skip the full contract re-check.
 *
 * @param manifest  The RuntimeManifest to verify.
 * @param _girHash  The canonical GIR hash of the current compilation unit.
 *                  Reserved for future cross-manifest integrity verification.
 */
export function verifyRuntimeManifestHash(manifest: RuntimeManifest, _girHash: string): boolean {
  return manifest.verified && manifest.governanceFlagsMask > 0;
}
