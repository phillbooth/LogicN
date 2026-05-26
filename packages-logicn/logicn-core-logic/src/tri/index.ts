// =============================================================================
// @logicn/core-logic/tri — TriState v0.2 sub-path export
// =============================================================================

export type { TriState } from "./tri-state.js";
export {
  TRI_STATE_TRUE,
  TRI_STATE_FALSE,
  triUnknown,
  triUnknownFromReasons,
  isTriTrue,
  isTriFalse,
  isTriUnknown,
} from "./tri-state.js";

export type { UnknownReason } from "./tri-unknown-reason.js";
export { deduplicateUnknownReasons } from "./tri-unknown-reason.js";

export {
  triStateNot,
  triStateAnd,
  triStateOr,
  triStateNor,
  combineUnknownReasons,
} from "./tri-ops.js";

export {
  LLN_TRI_001_INVALID_TRISTATE,
  LLN_TRI_002_EMPTY_UNKNOWN_REASONS,
  LLN_TRI_003_INVALID_OPERAND,
  LLN_TRI_004_UNKNOWN_LEAKED,
  LLN_TRI_005_MALFORMED_UNKNOWN_REASON,
  triDiagnosticInvalidTriState,
  triDiagnosticEmptyUnknownReasons,
  triDiagnosticInvalidOperand,
  triDiagnosticUnknownLeaked,
  triDiagnosticMalformedUnknownReason,
} from "./tri-diagnostics.js";
