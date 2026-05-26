// =============================================================================
// @logicn/core-logic/omni — OmniState v0.2 sub-path export
// =============================================================================

export type { OmniState, OmniEvidence, OmniDecision } from "./omni-state.js";
export {
  OMNI_UNCERTAIN_STATES,
  OMNI_STATES,
  isOmniState,
  isOmniUncertain,
} from "./omni-state.js";

export {
  OMNI_MIN_ALLOW_CONFIDENCE,
  omniToDecision,
} from "./omni-to-decision.js";

export {
  LLN_OMNI_001_DIRECT_BOUNDARY_USE,
  LLN_OMNI_002_ADVISORY_ONLY_VIOLATED,
  LLN_OMNI_003_CONFIDENCE_OUT_OF_RANGE,
  LLN_OMNI_004_MALFORMED_EVIDENCE,
  LLN_OMNI_005_INVALID_STATE,
  omniDiagnosticDirectBoundaryUse,
  omniDiagnosticAdvisoryOnlyViolated,
  omniDiagnosticConfidenceOutOfRange,
  omniDiagnosticMalformedEvidence,
  omniDiagnosticInvalidState,
} from "./omni-diagnostics.js";
