/**
 * hybrid-engine.ts — The Unified Hybrid Inference Engine
 *
 * ONE bespoke engine that blends the best of three open-source engines inside a
 * single governed inference pass:
 *
 *   BitNet (ternary)  +  NVFP4 (fp4 block)  +  Groq LPU (static schedule)
 *
 * It is NOT a router that dispatches a whole request to one of three backends.
 * It is a single engine whose internal operations each run the technique best
 * suited to that operation — and every choice is recorded in the AuditEvent
 * ledger so the mixed-precision pass is fully provable after the fact.
 *
 * Governance lifecycle per inference call (LOAD → EXEC → ERASE):
 *   1. LOAD   — sandbox created, artifact hash + correlation ID bound
 *   2. PLAN   — precision router produces a per-op HybridPlan
 *   3. EXEC   — each op dispatched to its technique's kernel (FFI seam)
 *   4. AUDIT  — per-op precision decisions + final receipt → audit log
 *   5. ERASE  — sandbox state wiped (stateless by default)
 *
 * The actual math kernels live in the source repos and are reached through FFI
 * seams (documented below). This module is the GOVERNANCE + ORCHESTRATION layer
 * — the part that is LogicN's distinctive value.
 */

import { createHash } from "node:crypto";
import { TowerRuntime } from "./tower-runtime.js";
import type { PluginMetadata, ExecutionResult } from "./plugin-sandbox.js";
import {
  planHybridInference,
  type HybridPlan,
  type InferenceOpClass,
  type RoutingContext,
  type PrecisionDecision,
  type PrecisionTechnique,
} from "./precision-strategy.js";
import { createStubRegistry } from "./bridge/stub-provider.js";
import { assertDeterminism, type BridgeRegistry, type BridgeOp, type BridgeResult } from "./bridge/interface.js";

// The canonical layer sequence of a transformer inference pass.
// Real models repeat the attention/feedforward block N times; we route by class,
// so one decision per class covers all repeated layers of that class.
const STANDARD_INFERENCE_OPS: readonly InferenceOpClass[] = [
  "embedding",
  "attention",
  "normalization",
  "feedforward",
  "kv_cache",
  "output_head",
];

export interface HybridInferenceRequest {
  readonly prompt:         string;
  readonly correlationId:  string;
  readonly maxNewTokens?:  number;
  /** Operation classes to route. Defaults to the standard transformer sequence. */
  readonly opClasses?:     readonly InferenceOpClass[];
  /**
   * Model the caller wants to invoke. Enforced against the flow's
   * `ai { approved_models }` allow-list — an unapproved model traps the call.
   */
  readonly model?:         string;
}

/**
 * Governance constraints sourced from a `.lln` flow's `ai {}` contract block.
 * The engine enforces these as hard limits: a violation traps the inference
 * BEFORE any compute runs (Hold-First), so the trail proves the boundary held.
 */
export interface AiGovernance {
  /** `ai { approved_models { … } }` — allow-list; an unlisted model is denied. */
  readonly approvedModels?: readonly string[];
  /** `ai { max_model_calls N }` — per-engine inference budget across its lifetime. */
  readonly maxModelCalls?:  number;
}

export interface HybridInferenceReceipt {
  readonly correlationId:  string;
  readonly text:           string;
  readonly tokenCount:     number;
  readonly latencyMs:      number;
  readonly plan:           HybridPlan;
  readonly outputHash:     string;
  readonly enginesBlended: readonly string[];
  readonly avgBitsPerWeight: number;
  readonly deterministic:  boolean;
  readonly trapFired:      boolean;
  readonly trapCode?:      string;
  /** Distinct execution bridges that actually ran ops (Brawn provenance). */
  readonly bridgesUsed:    readonly string[];
  /** True if any op ran on a real native kernel (vs. the deterministic simulator). */
  readonly executedNatively: boolean;
  /**
   * Deterministic checksum of every ternary bridge result in this pass.
   * Bit-identical across CPU/GPU/photonic (Citizen Standard 1) — the provable
   * "same answer everywhere" fingerprint for the ternary path.
   */
  readonly ternaryChecksum: number;
}

/** Default governance metadata for the unified hybrid engine. */
const HYBRID_METADATA: PluginMetadata = {
  engineId:        "logicn-hybrid-uhie-v1",
  artifactPath:    "packages-logicn/logicn-tower-citizen",
  artifactHash:    "sha256:uhie-v1-orchestrator",
  governanceTier:  1, // defaults to most-governed tier; raised by RoutingContext
  license:         "Apache-2.0", // blends MIT (BitNet/Groq) + Apache-2.0 (NVFP4); aggregate = Apache-2.0
  maxMemoryMB:     512,
  capabilityMask:  0b00100000, // V_DPM bit 5 (ai.inference)
};

// ── Deterministic demonstration op ───────────────────────────────────────────
// Stage A has no real model weights loaded, so each routed op is exercised with a
// small FIXED ternary vector derived purely from its op class. "Fixed" is the
// point: the result is bit-identical on every run and every machine, which is
// exactly the Citizen Standard 1 (TPL Determinism) property the bridge must
// uphold. Production replaces this with a zero-copy handle into the real weights.
const DEMO_COUNT = 16; // one packed i32 word of BitNet I2_S trits

function fnv1a(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/** Pack a trit array into BitNet I2_S i32 words (must mirror the stub decoder). */
function packTrits(trits: readonly number[]): Int32Array {
  const words = Math.max(1, Math.ceil(trits.length / 16));
  const out = new Int32Array(words);
  for (let idx = 0; idx < trits.length; idx++) {
    const v = trits[idx] ?? 0;
    const enc = v === -1 ? 0 : v === 0 ? 1 : 2; // +1 → 2; never 3 (corruption sentinel)
    const w = (idx / 16) | 0;
    const local = idx % 16;
    const byteIdx = (local / 4) | 0;
    const posInByte = local % 4;
    const shift = byteIdx * 8 + (3 - posInByte) * 2;
    out[w] = (out[w]! | (enc << shift)) | 0;
  }
  return out;
}

function buildDemoTernaryOp(
  opClass: InferenceOpClass,
  precision: PrecisionTechnique,
  correlationId: string,
): BridgeOp {
  const trits: number[] = [];
  const activations = new Int32Array(DEMO_COUNT);
  let r = fnv1a(opClass + ":" + precision) || 1; // seed from op identity only — reproducible
  for (let i = 0; i < DEMO_COUNT; i++) {
    r ^= (r << 13); r >>>= 0; r ^= (r >>> 17); r ^= (r << 5); r >>>= 0; // xorshift32
    trits.push((r % 3) - 1);              // {-1, 0, +1}
    activations[i] = ((r >>> 3) % 7) - 3; // small int domain, no floating point
  }
  return {
    opClass,
    precision,
    correlationId,
    weights: packTrits(trits),
    activations,
    count: DEMO_COUNT,
    scale: 1,
    offset: 0,
  };
}

export class HybridInferenceEngine {
  private readonly tower: TowerRuntime;
  private readonly ctx: RoutingContext;
  private readonly bridges: BridgeRegistry;
  private readonly governance: AiGovernance;
  private bridgesInitialized = false;
  private callCount = 0;
  private initialized = false;

  constructor(
    ctx: Partial<RoutingContext> = {},
    tower?: TowerRuntime,
    bridges?: BridgeRegistry,
    governance?: AiGovernance,
  ) {
    this.ctx = {
      governanceTier: ctx.governanceTier ?? 1,
      fp4HardwareAvailable: ctx.fp4HardwareAvailable ?? false,
      airGapped: ctx.airGapped ?? true, // safe default: assume regulated/air-gapped
      ...(ctx.maxLatencyMs !== undefined ? { maxLatencyMs: ctx.maxLatencyMs } : {}),
    };
    this.tower = tower ?? new TowerRuntime({ assimilationMemoryBudgetMB: 512, auditDepth: "full" });
    // The Brain→Brawn seam: default to the in-package stub registry (the real
    // TPLSimulator for ternary), which runs on ANY machine. A deployment with
    // native silicon passes a registry built from logicn-ext-bridge-* instead.
    this.bridges = bridges ?? (createStubRegistry() as BridgeRegistry);
    this.governance = governance ?? {};
  }

  initialize(): { plan: HybridPlan } {
    // Pre-plan the standard pass so the deployment can be inspected before any
    // real inference runs. The plan is deterministic for a fixed context.
    const plan = planHybridInference(STANDARD_INFERENCE_OPS, this.ctx);
    this.initialized = true;
    return { plan };
  }

  /**
   * Run a governed hybrid inference pass.
   *
   * FFI seam — in production each precision technique dispatches to its kernel:
   *   ternary   → ggml_bitnet_mul_mat_task_compute()   (C:\wwwprojects\BitNet)
   *   fp4_block → te_fp4_gemm()                         (C:\wwwprojects\TransformerEngine)
   *   scheduled → static plan replay                    (Groq-derived scheduler)
   * Stage A returns a governed stub; the governance/audit path is fully real.
   */
  async infer(request: HybridInferenceRequest): Promise<HybridInferenceReceipt> {
    if (!this.initialized) this.initialize();

    const ops = request.opClasses ?? STANDARD_INFERENCE_OPS;
    const plan = planHybridInference(ops, this.ctx);

    const { sandbox, correlationId } = await this.tower.load(HYBRID_METADATA, request.correlationId);
    const audit = this.tower.getAudit();
    const t0 = Date.now();

    try {
      // ── Hold-First governance gate — trap BEFORE any compute runs ────────────
      // The boundary must hold before the Brawn ever sees the op. An unapproved
      // model or an exhausted call budget is denied here, leaving an audit trail
      // that proves no compute happened.
      const govTrap = this.checkAiGovernance(request);
      if (govTrap) {
        audit.trap(correlationId, HYBRID_METADATA.artifactHash, HYBRID_METADATA.engineId,
          govTrap.code, govTrap.details);
        const latencyMs = Date.now() - t0;
        await this.tower.erase(sandbox, correlationId);
        return this.buildReceipt(request, plan, "", latencyMs, "sha256:0", [], false, 0, true, govTrap.code);
      }
      this.callCount++;

      const execResult: ExecutionResult = await this.tower.execute(sandbox, request, correlationId);

      let bridgesUsed: string[] = [];
      let executedNatively = false;
      let ternaryChecksum = 0;

      if (!execResult.trapFired) {
        // EXEC — dispatch each precision decision through its registered bridge
        // (the Brain→Brawn seam), then record the decision + its provenance.
        const dispatch = this.dispatchPlan(plan, correlationId);
        bridgesUsed = dispatch.bridgesUsed;
        executedNatively = dispatch.executedNatively;
        ternaryChecksum = dispatch.ternaryChecksum;
        for (const decision of plan.decisions) {
          this.auditPrecisionDecision(audit, correlationId, decision, dispatch.byOp.get(decision.opClass));
        }
      }

      const latencyMs = Date.now() - t0;

      // Enforce the latency invariant if one was declared.
      if (this.ctx.maxLatencyMs !== undefined && latencyMs > this.ctx.maxLatencyMs) {
        audit.trap(correlationId, HYBRID_METADATA.artifactHash, HYBRID_METADATA.engineId,
          "ERR_LATENCY_INVARIANT", { latencyMs, boundMs: this.ctx.maxLatencyMs });
        await this.tower.erase(sandbox, correlationId, execResult);
        return this.buildReceipt(request, plan, "", latencyMs, "sha256:0", bridgesUsed, executedNatively, ternaryChecksum, true, "ERR_LATENCY_INVARIANT");
      }

      if (execResult.trapFired) {
        await this.tower.erase(sandbox, correlationId, execResult);
        return this.buildReceipt(request, plan, "", latencyMs, execResult.outputHash, bridgesUsed, executedNatively, ternaryChecksum, true, execResult.trapCode);
      }

      // Stage A governed result — the ternary path is REAL (executed via the
      // bridge/simulator above); the natural-language detokenisation is the
      // documented seam (production wires a real decoder).
      const text = `[UHIE hybrid pass: ${plan.enginesBlended.length} engines blended, ` +
        `avg ${plan.avgBitsPerWeight} bits/weight, ${plan.deterministic ? "deterministic" : "dynamic"} schedule, ` +
        `ternary checksum ${ternaryChecksum}]`;
      const outputHash = "sha256:" + createHash("sha256").update(text + correlationId).digest("hex").slice(0, 16);

      await this.tower.erase(sandbox, correlationId, execResult);
      return this.buildReceipt(request, plan, text, latencyMs, outputHash, bridgesUsed, executedNatively, ternaryChecksum, false);
    } catch (err) {
      await this.tower.erase(sandbox, correlationId);
      throw err;
    }
  }

  /**
   * Enforce the `ai {}` contract constraints. Returns a trap descriptor when a
   * governance boundary is crossed, or null when the call is permitted.
   */
  private checkAiGovernance(request: HybridInferenceRequest): { code: string; details: Record<string, unknown> } | null {
    const { approvedModels, maxModelCalls } = this.governance;
    if (approvedModels && approvedModels.length > 0 && request.model !== undefined &&
        !approvedModels.includes(request.model)) {
      return { code: "ERR_AI_MODEL_NOT_APPROVED", details: { requested: request.model, approved: approvedModels } };
    }
    if (maxModelCalls !== undefined && this.callCount >= maxModelCalls) {
      return { code: "ERR_AI_CALL_BUDGET", details: { used: this.callCount, budget: maxModelCalls } };
    }
    return null;
  }

  /**
   * Dispatch every op in the plan to its registered bridge (the Brain→Brawn
   * seam). Techniques with no registered bridge (fp8/fp16) are skipped — they
   * have no accelerator and run in the host's native float domain.
   */
  private dispatchPlan(plan: HybridPlan, correlationId: string): {
    bridgesUsed: string[];
    executedNatively: boolean;
    ternaryChecksum: number;
    byOp: Map<InferenceOpClass, BridgeResult>;
  } {
    if (!this.bridgesInitialized) {
      for (const bridge of this.bridges.values()) bridge.initialize();
      this.bridgesInitialized = true;
    }
    const used = new Set<string>();
    const byOp = new Map<InferenceOpClass, BridgeResult>();
    let executedNatively = false;
    let ternaryChecksum = 0;

    for (const decision of plan.decisions) {
      const bridge = this.bridges.get(decision.precision);
      if (!bridge) continue; // fp8 / fp16 — no accelerator bridge, host-native path
      const op = buildDemoTernaryOp(decision.opClass, decision.precision, correlationId);
      const result = bridge.execute(op);
      assertDeterminism(result); // Citizen Standard 1 — abort on ternary drift
      used.add(result.bridgeId);
      byOp.set(decision.opClass, result);
      if (result.executedNatively) executedNatively = true;
      if (result.technique === "ternary") {
        // Order-independent, deterministic accumulation of ternary results.
        ternaryChecksum = (ternaryChecksum + (result.value | 0)) | 0;
      }
    }
    return { bridgesUsed: [...used], executedNatively, ternaryChecksum, byOp };
  }

  private auditPrecisionDecision(
    audit: ReturnType<TowerRuntime["getAudit"]>,
    correlationId: string,
    decision: PrecisionDecision,
    bridgeResult?: BridgeResult,
  ): void {
    audit.append({
      phase: "EXEC",
      correlationId,
      artifactHash: HYBRID_METADATA.artifactHash,
      engineId: HYBRID_METADATA.engineId,
      severity: "INFO",
      category: "AUDIT_TRAIL",
      details: {
        action: "precision_decision",
        op: decision.opClass,
        precision: decision.precision,
        scheduling: decision.scheduling,
        sourceEngine: decision.sourceEngine,
        reason: decision.reason,
        // Brawn provenance — which bridge actually executed this op, and whether
        // it ran on real silicon or the deterministic simulator.
        ...(bridgeResult
          ? { bridgeId: bridgeResult.bridgeId, executedNatively: bridgeResult.executedNatively, deterministic: bridgeResult.deterministic }
          : { bridgeId: "host-native", executedNatively: false }),
      },
      governancePass: true,
    });
  }

  private buildReceipt(
    request: HybridInferenceRequest,
    plan: HybridPlan,
    text: string,
    latencyMs: number,
    outputHash: string,
    bridgesUsed: readonly string[],
    executedNatively: boolean,
    ternaryChecksum: number,
    trapFired: boolean,
    trapCode?: string,
  ): HybridInferenceReceipt {
    return {
      correlationId: request.correlationId,
      text,
      tokenCount: request.maxNewTokens ?? 0,
      latencyMs,
      plan,
      outputHash,
      enginesBlended: plan.enginesBlended,
      avgBitsPerWeight: plan.avgBitsPerWeight,
      deterministic: plan.deterministic,
      trapFired,
      bridgesUsed,
      executedNatively,
      ternaryChecksum,
      ...(trapCode !== undefined ? { trapCode } : {}),
    };
  }

  getAudit() { return this.tower.getAudit(); }
}

/**
 * Convenience factory — detects the deployment profile and configures the engine.
 * Air-gapped is the default safe assumption; callers opt into cloud/GPU explicitly.
 */
export function createHybridEngine(profile: {
  airGapped?: boolean;
  fp4Hardware?: boolean;
  governanceTier?: 1 | 2 | 3;
  maxLatencyMs?: number;
  /** Native bridge registry (e.g. from logicn-ext-bridge-cpp). Defaults to the stub registry. */
  bridges?: BridgeRegistry;
  /** `ai {}` contract constraints to enforce at the boundary. */
  governance?: AiGovernance;
} = {}): HybridInferenceEngine {
  return new HybridInferenceEngine(
    {
      governanceTier: profile.governanceTier ?? 1,
      airGapped: profile.airGapped ?? true,
      fp4HardwareAvailable: profile.fp4Hardware ?? false,
      ...(profile.maxLatencyMs !== undefined ? { maxLatencyMs: profile.maxLatencyMs } : {}),
    },
    undefined,
    profile.bridges,
    profile.governance,
  );
}
