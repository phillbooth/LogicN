// bridge/interface.ts — re-export shim.
//
// The Brain/Brawn contract (InferenceBridge, BridgeOp, BridgeResult, BridgeRegistry,
// FixedScale, assertDeterminism, the bridge manifest schema, and the determinism
// oracle interface) now lives in the NEUTRAL package @logicn/inference-bridge-contract,
// so native Brawn packages depend on it instead of reaching into the Tower runtime.
//
// This shim preserves the historical `./bridge/interface.js` import path used
// throughout the Tower. New code should import from "@logicn/inference-bridge-contract".
export type { BridgeOp, BridgeResult, InferenceBridge, BridgeRegistry, FixedScale } from "@logicn/inference-bridge-contract";
export { assertDeterminism } from "@logicn/inference-bridge-contract";
export type { BridgeManifest, BridgeAttestation, DeterminismMode, CertificationProfile, TernaryOracle } from "@logicn/inference-bridge-contract";
export { canonicalManifestString, validateManifestShape, oracleAgrees } from "@logicn/inference-bridge-contract";
