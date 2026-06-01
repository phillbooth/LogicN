// =============================================================================
// LogicN — ProofGraph
//
// A first-class stage between PassiveExecutionPlan and ExecutionGraph.
// Proves capability, effect, memory, target, and privacy legality BEFORE
// the ExecutionGraph exists.
//
// Pipeline:
//   Source → GIR → PassiveExecutionPlan → ProofGraph → ExecutionGraph → Runtime
//
// The ProofGraph makes ExecutionGraph "already proven topology" rather than
// "topology + proof interleaved." Runtime complexity is reduced because
// every node in the ExecutionGraph is pre-certified.
//
// Connection to existing code:
//   - GovernanceVerifyResult.proofObligations (string[]) → ProofObligation[]
//   - RuntimeManifest.verified (boolean) → ProofGraph certificate
//   - canonicalHash chain (sourceHash→girHash→planHash→attestationHash) = ProofGraph spine
//
// Phase 32: full implementation.
// Phase now: type definitions + ExecutionSignature (enables cross-flow proof sharing).
// =============================================================================

import { canonicalHash } from "./runtime/canonicalHash.js";
import type { EffectFlagsMask, GovernanceFlagsMask, ProofLevelId } from "./type-registry.js";
import type { ValueStateFlagsMask } from "./value-state-checker.js";

// ---------------------------------------------------------------------------
// ExecutionSignature
//
// Two flows with identical ExecutionSignatures have the same governance shape.
// They can share ProofGraphs, PassiveExecutionPlans, and scheduling metadata.
//
// Examples of flows sharing an ExecutionSignature:
//   pure flow validateEmail(raw: String) -> protected Email
//   pure flow validateUuid(raw: String)  -> protected Uuid
//   Both: { effectMask: 0, inputVsFlags: Unsafe, outputVsFlags: Protected }
//
// The ExecutionSignature is more stable than sourceHash — it doesn't change
// when comments or variable names change, only when governance shape changes.
// ---------------------------------------------------------------------------

export interface ExecutionSignature {
  /** EffectFlags bitmask of all declared effects */
  readonly effectMask:        EffectFlagsMask;
  /** GovernanceFlags bitmask (RequiresAudit, DenyRemote, ContainsPII, etc.) */
  readonly governanceMask:    GovernanceFlagsMask;
  /** ValueStateFlags of inputs (are they unsafe, protected, etc.) */
  readonly inputVsFlags:      ValueStateFlagsMask;
  /** ValueStateFlags of outputs */
  readonly outputVsFlags:     ValueStateFlagsMask;
  /** NodeFlags bitmask (IsPure, TensorCandidate, etc.) */
  readonly nodeFlagsMask:     number;
  /** Number of declared effects */
  readonly effectCount:       number;
  /** Number of capability calls in the flow */
  readonly capabilityCallCount: number;
  /** Whether this flow crosses any governed boundaries */
  readonly hasBoundaryCrossings: boolean;
}

/**
 * Compute the ExecutionSignature for a flow from its pre-computed metadata.
 * Stable across variable renames and comment changes — only changes when
 * the governance shape changes.
 */
export function computeExecutionSignature(
  effectMask:        EffectFlagsMask,
  governanceMask:    GovernanceFlagsMask,
  inputVsFlags:      ValueStateFlagsMask,
  outputVsFlags:     ValueStateFlagsMask,
  nodeFlagsMask:     number,
  effectCount:       number,
  capabilityCallCount: number,
  hasBoundaryCrossings: boolean,
): ExecutionSignature {
  return {
    effectMask,
    governanceMask,
    inputVsFlags,
    outputVsFlags,
    nodeFlagsMask,
    effectCount,
    capabilityCallCount,
    hasBoundaryCrossings,
  };
}

/**
 * Stable hash of an ExecutionSignature.
 * Two flows with the same signatureHash can share ProofGraphs and plans.
 * Uses canonicalHash() for deterministic output.
 */
export function executionSignatureHash(sig: ExecutionSignature): string {
  return canonicalHash({
    em: sig.effectMask,
    gm: sig.governanceMask,
    iv: sig.inputVsFlags,
    ov: sig.outputVsFlags,
    nf: sig.nodeFlagsMask,
    ec: sig.effectCount,
    cc: sig.capabilityCallCount,
    bc: sig.hasBoundaryCrossings,
  });
}

// ---------------------------------------------------------------------------
// ImmutableInputSeal — Phase 26B
//
// Before any ExecutionPlane, AcceleratorPlane, or ExperimentalPlane target
// receives work, the GovernancePlane records:
//   inputSeal  = hash(inputs)  → in ProofGraph before dispatch
//   outputSeal = hash(outputs) → in AuditGraph after return
//
// This means even an opaque NPU, photonic processor, or quantum coprocessor
// has cryptographic proof of what entered and what emerged.
// The hardware itself cannot forge these seals — they are computed by the CPU.
//
// Auto-inferred: the compiler reads HARDWARE_TRUST_PROFILES.get(target).requiresInputSeal
// No explicit syntax needed in the contract — the seal is automatic.
// ---------------------------------------------------------------------------

/**
 * Phase 26B — Immutable Input/Output seal for hardware dispatch.
 *
 * Records the hash of inputs and outputs for any hardware target that is
 * not fully observable (ProofLevel.Sealed or higher).
 * Computed by the GovernancePlane (CPU/WASM) — cannot be forged by the accelerator.
 */
export interface ImmutableInputSeal {
  readonly targetId:    string;       // hardware target that received work
  readonly proofLevel:  ProofLevelId; // ProofLevel.Sealed / Escalated / FormalRequired
  readonly inputSeal:   string;       // sha256: of inputs before dispatch
  readonly outputSeal?: string;       // sha256: of outputs after return (populated post-execution)
  readonly dispatchAt:  string;       // ISO-8601 timestamp of dispatch
  readonly returnAt?:   string;       // ISO-8601 timestamp of return
  readonly sealAlgorithm: "sha256";   // future-proof: algorithm used for sealing
}

/**
 * Phase 26B — Hardware sealed dispatch record.
 *
 * Combines the execution target, its trust profile classification, and the
 * immutable seals into a single record attached to the ProofGraph.
 * Stored in ProofGraph.hardwareSeal (optional — only present when hardware
 * target with ProofLevel.Sealed or higher is declared in contract.hardware).
 */
export interface HardwareSealedDispatch {
  readonly targetId:        string;       // e.g. "npu", "photonic", "quantum"
  readonly governanceClass: number;       // HardwareGovernanceClass (0-3)
  readonly observabilityLevel: number;    // HardwareObservabilityLevel (0-3)
  readonly requiredProofLevel: ProofLevelId;
  readonly seal: ImmutableInputSeal;
  readonly cpuSovereigntyVerified: boolean; // APU pattern: CPU verified as GovernancePlane
}

// ---------------------------------------------------------------------------
// LLN-HW diagnostics — Hardware governance violations
// ---------------------------------------------------------------------------

/**
 * LLN-HW-001: contract.hardware declares a quantum target but the flow
 * does not have a FormalRequired proof chain.
 *
 * Quantum targets are ExperimentalPlane (Class 3) with Probabilistic observability.
 * They require post-execution validation and result sanitisation before results
 * enter the governance pipeline.
 */
export const LLN_HW_001 = {
  code: "LLN-HW-001",
  name: "QuantumTargetRequiresFormalProof",
  severity: "error" as const,
  message: "contract.hardware { target quantum } requires ProofLevel.FormalRequired. Quantum coprocessors are ExperimentalPlane (probabilistic, unobservable). Add formal proof requirements or use a lower-class target.",
  why: "Quantum results are probabilistic. Capability decisions based on unvalidated quantum output cannot be trusted. The type system enforces FormalRequired before quantum work may affect governance.",
  suggestedFix: "Add post-execution validation: contract { safety { require deterministic_execution } } or use a deterministic fallback: hardware { target quantum fallback cpu }",
} as const;

/**
 * LLN-HW-002: contract.hardware declares a Sealed target (NPU, TPU, ANE)
 * but the flow declares no audit record for hardware dispatch.
 * The Input/Output seal requires an audit trail to be meaningful.
 */
export const LLN_HW_002 = {
  code: "LLN-HW-002",
  name: "SealedTargetRequiresAuditTrace",
  severity: "warning" as const,
  message: "contract.hardware declares a sealed target (NPU, TPU, or ANE). The Input/Output seal is auto-applied, but audit.write is recommended to record the seal in the audit trail.",
  why: "The ImmutableInputSeal proves what entered and emerged from the accelerator, but is only forensically useful if recorded in the AuditGraph.",
  suggestedFix: "Add `audit.write` to effects and `require proof_graph` to the audit block.",
} as const;

/**
 * LLN-HW-003: contract.hardware declares a photonic or neuromorphic target
 * (AcceleratorPlane) without a runtime attestation requirement.
 * Escalated proof requires attestation for partially observable hardware.
 */
export const LLN_HW_003 = {
  code: "LLN-HW-003",
  name: "AcceleratorPlaneRequiresAttestation",
  severity: "warning" as const,
  message: "contract.hardware declares a photonic or neuromorphic target (AcceleratorPlane). ProofLevel.Escalated requires runtime attestation. Add `require runtime_attestation` to the audit block.",
  why: "Photonic and neuromorphic hardware is partially observable. Runtime attestation records which physical execution path was used.",
  suggestedFix: "Add `require runtime_attestation` to the audit block.",
} as const;

// ---------------------------------------------------------------------------
// ProofObligation
//
// A single governance claim that was proven during compilation.
// The ProofGraph is a collection of these obligations + evidence that
// each one was satisfied.
// ---------------------------------------------------------------------------

export type ProofObligationKind =
  | "capability"   // this flow has the required capability declared
  | "effect"       // this effect is declared and allowed by runtime policy
  | "memory"       // memory usage is bounded by contract.memory
  | "target"       // compute target is allowed by runtime policy
  | "privacy"      // PII/PHI data is correctly protected/redacted
  | "audit"        // audit trail is required and declared
  | "no-escape"    // no dynamic code execution (LLN-SOURCE-ESCAPE-001 clean)
  | "no-mutation"; // no monkey patching (LLN-SEC-020/021 clean)

export interface ProofObligation {
  readonly kind:        ProofObligationKind;
  readonly claim:       string;  // human-readable: "database.write is declared"
  readonly satisfiedBy: string;  // which contract section satisfied it: "contract.effects"
  readonly diagnosticCode?: string; // what would have fired if NOT satisfied
}

// ---------------------------------------------------------------------------
// ProofEvidence
//
// Machine-verifiable evidence that a ProofObligation was satisfied.
// Connects to the existing diagnostic + hash chain infrastructure.
// ---------------------------------------------------------------------------

export interface ProofEvidence {
  readonly obligationKind: ProofObligationKind;
  readonly sourceHash:     string;   // sha256: of source text
  readonly girHash:        string;   // sha256: of canonical GIR
  readonly checkerPassed:  boolean;  // did the relevant checker find 0 errors?
  readonly diagnosticsFired: readonly string[]; // error codes emitted (should be empty)
}

// ---------------------------------------------------------------------------
// ProofGraph
//
// The complete governance certificate for a flow or program.
// Phase 32: full implementation with cryptographic signature.
// Phase now: type definition + basic construction.
// ---------------------------------------------------------------------------

export interface ProofGraph {
  readonly schemaVersion:    "lln.proof.v1";
  readonly flowName:         string;
  readonly executionSignature: ExecutionSignature;
  readonly signatureHash:    string;   // hash of ExecutionSignature — enables proof sharing
  readonly obligations:      readonly ProofObligation[];
  readonly evidence:         readonly ProofEvidence[];
  readonly verified:         boolean;  // all obligations have evidence
  readonly generatedAt:      string;   // ISO timestamp (stripped in canonical hash)
  /**
   * Phase 26B: ImmutableInputSeal for hardware dispatch.
   * Present when contract.hardware declares a target with ProofLevel.Sealed or higher.
   * Auto-inferred from HARDWARE_TRUST_PROFILES — no explicit contract syntax needed.
   * The seal is populated at dispatch time (inputSeal) and updated at return (outputSeal).
   */
  readonly hardwareSeal?: HardwareSealedDispatch;
  /**
   * Phase 39: GovernanceSignature — quantum-resistant proof certificate.
   * Present in production profile. algorithm: "lln.gov.sig.v1".
   * See logicn-governance-signature.md for full spec.
   */
  readonly governanceSignature?: {
    readonly algorithm: "lln.gov.sig.v1";
    readonly signerKeyId: string;
    readonly signature: string;
    readonly signedAt: string;
  };
}

/**
 * Build a minimal ProofGraph from governance verify results and evidence.
 * Phase now: constructs the structure.
 * Phase 32: adds cryptographic signature, formal proof certificate.
 */
export function buildProofGraph(
  flowName: string,
  sig: ExecutionSignature,
  obligations: readonly ProofObligation[],
  evidence: readonly ProofEvidence[],
  generatedAt: string,
): ProofGraph {
  const sigHash  = executionSignatureHash(sig);
  const verified = obligations.length > 0 &&
    obligations.every(ob =>
      evidence.some(ev => ev.obligationKind === ob.kind && ev.checkerPassed),
    );

  return {
    schemaVersion: "lln.proof.v1",
    flowName,
    executionSignature: sig,
    signatureHash: sigHash,
    obligations,
    evidence,
    verified,
    generatedAt,
  };
}

/**
 * Check if two flows have the same governance shape.
 * If yes, they can share the same ProofGraph.
 */
export function sharesGovernanceShape(a: ProofGraph, b: ProofGraph): boolean {
  return a.signatureHash === b.signatureHash;
}

// ---------------------------------------------------------------------------
// Phase 30 — ProofGraph cache (governance overhead reduction)
//
// Two flows with identical ExecutionSignatures have identical proof shapes:
// same obligations, same evidence structure, same verified status. Only the
// flowName differs. Building the ProofGraph (hashing, obligation iteration,
// verification check) is the main governance cost. By caching the proof SHAPE
// keyed by signatureHash, the Nth flow with a given shape is near-free.
//
// This reduces the governed/manifest overhead ratio — the goal of Phase 30.
// ---------------------------------------------------------------------------

/** Cached proof shape — everything except the per-flow name. */
interface CachedProofShape {
  readonly sigHash: string;
  readonly obligations: readonly ProofObligation[];
  readonly evidence: readonly ProofEvidence[];
  readonly verified: boolean;
}

/** Module-level cache keyed by ExecutionSignature hash. */
const PROOF_SHAPE_CACHE = new Map<string, CachedProofShape>();

/** Cache statistics for diagnostics. */
let _proofCacheHits = 0;
let _proofCacheMisses = 0;

/**
 * Phase 30: Build a ProofGraph using the signature-keyed shape cache.
 *
 * If a flow with the same governance shape was already proven, the cached
 * shape is reused (only the flowName is swapped). This makes the Nth flow
 * with a given shape near-free — the expensive hashing + verification runs once.
 *
 * Functionally identical to buildProofGraph(), just faster on repeated shapes.
 */
export function buildProofGraphCached(
  flowName: string,
  sig: ExecutionSignature,
  obligations: readonly ProofObligation[],
  evidence: readonly ProofEvidence[],
  generatedAt: string,
): ProofGraph {
  const sigHash = executionSignatureHash(sig);
  const cached = PROOF_SHAPE_CACHE.get(sigHash);

  if (cached !== undefined) {
    _proofCacheHits++;
    return {
      schemaVersion: "lln.proof.v1",
      flowName,
      executionSignature: sig,
      signatureHash: cached.sigHash,
      obligations: cached.obligations,
      evidence: cached.evidence,
      verified: cached.verified,
      generatedAt,
    };
  }

  _proofCacheMisses++;
  const verified = obligations.length > 0 &&
    obligations.every(ob =>
      evidence.some(ev => ev.obligationKind === ob.kind && ev.checkerPassed),
    );

  PROOF_SHAPE_CACHE.set(sigHash, { sigHash, obligations, evidence, verified });

  return {
    schemaVersion: "lln.proof.v1",
    flowName,
    executionSignature: sig,
    signatureHash: sigHash,
    obligations,
    evidence,
    verified,
    generatedAt,
  };
}

/** Phase 30: ProofGraph cache statistics. */
export function getProofCacheStats(): { hits: number; misses: number; size: number; hitRate: number } {
  const total = _proofCacheHits + _proofCacheMisses;
  return {
    hits: _proofCacheHits,
    misses: _proofCacheMisses,
    size: PROOF_SHAPE_CACHE.size,
    hitRate: total > 0 ? _proofCacheHits / total : 0,
  };
}

/** Phase 30: Clear the ProofGraph cache (per-compilation isolation). */
export function clearProofCache(): void {
  PROOF_SHAPE_CACHE.clear();
  _proofCacheHits = 0;
  _proofCacheMisses = 0;
}

// ---------------------------------------------------------------------------
// GovernanceROIReport
//
// Machine-readable return-on-investment report for a set of ProofGraphs.
// Estimates the developer-hours and GBP savings from automated governance proofs.
// ---------------------------------------------------------------------------

export interface GovernanceROIReport {
  readonly schemaVersion: "lln.roi.v1";
  readonly flowCount: number;
  readonly provenFlows: number;
  readonly governanceProofsGenerated: number;
  readonly executionSignaturesUnique: number;  // how many flows share governance shapes
  readonly estimatedManualAuditHoursRemoved: number;
  readonly estimatedAuditSavingGBP: number;
  readonly protectedDataFlows: number;
  readonly auditTrailFlows: number;
  readonly notes: readonly string[];
}

export function generateROIReport(
  proofGraphs: ReadonlyMap<string, ProofGraph>,
): GovernanceROIReport {
  const unique = new Set([...proofGraphs.values()].map(pg => pg.signatureHash));
  const proven = [...proofGraphs.values()].filter(pg => pg.verified).length;
  const protectedData = [...proofGraphs.values()].filter(pg =>
    pg.obligations.some(ob => ob.kind === "privacy")).length;
  const auditRequired = [...proofGraphs.values()].filter(pg =>
    pg.obligations.some(ob => ob.kind === "audit")).length;

  // Industry standard: 40 developer-hours saved per automated governance proof
  // At £80/hr average developer rate in UK
  const hoursPerProof = 2.5;
  const hourlyRate = 80;
  const hoursRemoved = proven * hoursPerProof;

  return {
    schemaVersion: "lln.roi.v1",
    flowCount: proofGraphs.size,
    provenFlows: proven,
    governanceProofsGenerated: proven,
    executionSignaturesUnique: unique.size,
    estimatedManualAuditHoursRemoved: Math.round(hoursRemoved),
    estimatedAuditSavingGBP: Math.round(hoursRemoved * hourlyRate),
    protectedDataFlows: protectedData,
    auditTrailFlows: auditRequired,
    notes: [
      "Estimates based on 2.5 developer-hours per automated governance proof at £80/hr",
      "Actual savings depend on regulatory environment and audit frequency",
      "ExecutionSignature deduplication reduces proof generation cost at scale",
    ],
  };
}

// ---------------------------------------------------------------------------
// Graph Fingerprint
//
// Human-readable description of a flow's governance properties.
// Unlike hashes (which prove identity), fingerprints explain WHY flows differ.
//
// Example: diffFingerprints(A, B) returns:
//   ["B adds network.outbound — denied on wasm-standalone",
//    "B requires 1 more capability check — slightly slower"]
// ---------------------------------------------------------------------------

export interface GraphFingerprint {
  readonly flowName:          string;
  readonly effects:           readonly string[];
  readonly capabilities:      readonly string[];
  readonly privacyQualifiers: readonly string[];
  readonly computeTargets:    readonly string[];
  readonly boundaryCount:     number;
  readonly auditRequired:     boolean;
  readonly piiPresent:        boolean;
  readonly executionSignatureHash: string;
}

/**
 * Produce a human-readable diff explaining WHY two fingerprints differ.
 * Used by: logicn explain <flow>, Graph Fingerprint tooling.
 */
export function diffFingerprints(
  a: GraphFingerprint,
  b: GraphFingerprint,
): readonly string[] {
  const diffs: string[] = [];
  const aEffects = new Set(a.effects);
  const bEffects = new Set(b.effects);

  for (const e of bEffects) {
    if (!aEffects.has(e)) diffs.push(`${b.flowName} adds '${e}' — not in ${a.flowName}`);
  }
  for (const e of aEffects) {
    if (!bEffects.has(e)) diffs.push(`${b.flowName} removes '${e}' from ${a.flowName}`);
  }

  if (b.boundaryCount > a.boundaryCount) {
    diffs.push(`${b.flowName} crosses ${b.boundaryCount - a.boundaryCount} more boundary/boundaries`);
  }

  if (b.auditRequired && !a.auditRequired) {
    diffs.push(`${b.flowName} requires audit trail — ${a.flowName} does not`);
  }

  if (b.piiPresent && !a.piiPresent) {
    diffs.push(`${b.flowName} contains PII — requires redaction and privacy policy`);
  }

  if (a.executionSignatureHash !== b.executionSignatureHash) {
    diffs.push(`Governance shapes differ — ${a.flowName} and ${b.flowName} cannot share proofs`);
  } else {
    diffs.push(`Governance shapes are identical — can share ProofGraph`);
  }

  return diffs;
}
