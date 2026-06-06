/**
 * bridge/interface.ts — The formal Hardware Execution Bridge contract
 *
 * This is the seam between the Brain (policy/routing — complete) and the Brawn
 * (native silicon kernels — future ext packages). The hybrid router talks ONLY
 * to this interface; it does not care whether the other side is BitNet on CPU,
 * NVFP4 on a Blackwell GPU, or a future photonic chip.
 *
 * A concrete bridge (e.g. logicn-ext-bridge-cpp) implements InferenceBridge and
 * registers itself for a PrecisionTechnique. When no native bridge is present for
 * a technique, the StubBridge fallback runs the in-package TPLSimulator (ternary)
 * or a governed no-op (fp4) — so the package runs on any machine.
 *
 * ── The three Citizen One Standards every bridge MUST uphold ──────────────────
 *
 *   1. TPL Determinism
 *      A ternary op must produce the exact same packed-trit / scaled-integer
 *      result on CPU, GPU, or photonic silicon. Floating-point drift on the
 *      ternary path is a CRITICAL security failure, not a rounding nuisance.
 *
 *   2. The Hold-First Rule
 *      No kernel may advance a value to State +1 (COMMIT) without the
 *      GovernanceEnforcer authorising the 0 → +1 transition. Bridges must honour
 *      a pause-and-verify interrupt before committing.
 *
 *   3. Zero-Copy Memory
 *      Bridges interact with WASM linear memory directly. Serialising data across
 *      the JS↔WASM boundary in the hot path is prohibited; pass handles/offsets.
 */

import type { PrecisionTechnique, InferenceOpClass } from "../precision-strategy.js";

/** A single unit of work handed to a bridge for execution. */
export interface BridgeOp {
  readonly opClass:       InferenceOpClass;
  readonly precision:     PrecisionTechnique;
  readonly correlationId: string;
  /**
   * Packed ternary weights (BitNet I2_S layout) for the ternary path, OR an
   * opaque handle/offset into WASM linear memory for native bridges (zero-copy).
   * Stub/ternary path reads this directly; native bridges treat it as a handle.
   */
  readonly weights:       Int32Array | number;
  /** Activation vector (int8/int32 domain — no floating point on the ternary path). */
  readonly activations:   Int32Array;
  /** Number of elements in the dot product / GEMM row. */
  readonly count:         number;
  /** Per-tensor scale (BitNet i2_scale = max|w|). */
  readonly scale:         number;
  /** Starting trit/element offset within `weights`. */
  readonly offset?:       number;
}

/** The result of a bridge execution, with provenance for the audit trail. */
export interface BridgeResult {
  readonly value:            number;        // scaled accumulator
  readonly executedNatively: boolean;       // true = real kernel, false = stub/simulation
  readonly bridgeId:         string;        // "bitnet-cpu" | "nvfp4-cuda" | "stub-ternary" | ...
  readonly technique:        PrecisionTechnique;
  readonly latencyMs:        number;
  readonly deterministic:    boolean;       // ternary bridges MUST report true (Standard 1)
}

/**
 * The contract every execution bridge implements. The hybrid router depends on
 * this abstraction only — adding a new accelerator is "implement this interface".
 */
export interface InferenceBridge {
  /** Stable identifier for audit attribution. */
  readonly bridgeId: string;
  /** Which precision technique this bridge executes. */
  readonly technique: PrecisionTechnique;
  /** Whether a real native kernel is loaded (false ⇒ this is a simulation fallback). */
  readonly nativeAvailable: boolean;

  /** Initialise the bridge (load native lib, allocate memory). Idempotent. */
  initialize(): void | Promise<void>;

  /** Release native resources. Part of the Erase lifecycle. */
  shutdown(): void | Promise<void>;

  /**
   * Execute one op. Implementations MUST uphold the three Citizen One Standards.
   * The router has already made the precision decision; the bridge only computes.
   */
  execute(op: BridgeOp): BridgeResult;
}

/**
 * A registry mapping each precision technique to the bridge that executes it.
 * The hybrid engine consults this; absent entries fall through to the stub.
 */
export type BridgeRegistry = ReadonlyMap<PrecisionTechnique, InferenceBridge>;

/** Self-check helper: assert a bridge result honours TPL Determinism (Standard 1). */
export function assertDeterminism(result: BridgeResult): void {
  const isTernary = result.technique === "ternary";
  if (isTernary && !result.deterministic) {
    throw new Error(
      `[CITIZEN_STANDARD_VIOLATION]: ternary bridge '${result.bridgeId}' reported ` +
      `non-deterministic result — Standard 1 (TPL Determinism) is mandatory on the ternary path`,
    );
  }
}
