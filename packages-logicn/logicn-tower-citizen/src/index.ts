export { TowerRuntime } from "./tower-runtime.js";
export { AuditLogger } from "./audit-logger.js";
export { PluginSandbox } from "./plugin-sandbox.js";
export type { TowerConfig } from "./tower-runtime.js";
export type { TowerAuditEvent, AuditFilter } from "./audit-logger.js";
export type { PluginMetadata, ExecutionResult } from "./plugin-sandbox.js";

// ── Unified Hybrid Inference Engine — best-of-all-three (BitNet + NVFP4 + Groq) ──
export { HybridInferenceEngine, createHybridEngine } from "./hybrid-engine.js";
export type { HybridInferenceRequest, HybridInferenceReceipt, AiGovernance } from "./hybrid-engine.js";
export {
  routePrecision,
  planHybridInference,
  TECHNIQUE_SOURCE,
  TECHNIQUE_BITS,
  OP_SENSITIVITY,
} from "./precision-strategy.js";
export type {
  PrecisionTechnique,
  SchedulingTechnique,
  InferenceOpClass,
  PrecisionDecision,
  RoutingContext,
  HybridPlan,
} from "./precision-strategy.js";

// ── Virtual Photonic Processor — BitNet-faithful ternary core (TPL Standard v1.0) ──
export { TPLSimulator, TritState, SecurityTrap, TPLIntegrityFault } from "./tpl-simulator.js";
export { GovernanceEnforcer, TPL_DEFAULT_POLICY } from "./governance-enforcer.js";
export type { TransitionPolicy, RestrictedTransition } from "./governance-enforcer.js";

// ── Hardware Execution Bridge — the Brain/Brawn seam (native FFI contract) ──
export { assertDeterminism } from "./bridge/interface.js";
export type { InferenceBridge, BridgeOp, BridgeResult, BridgeRegistry } from "./bridge/interface.js";
export { StubTernaryBridge, StubFp4Bridge, createStubRegistry } from "./bridge/stub-provider.js";
