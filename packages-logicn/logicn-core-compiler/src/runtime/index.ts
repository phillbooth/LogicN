// =============================================================================
// Phase 11C — Runtime Contract Enforcement
//
// Barrel export for the runtime/ module.
// =============================================================================

export {
  createContractEnforcer,
  type ContractEnforcer,
} from "./contractEnforcer.js";

export {
  createContext,
  isExpired,
  remainingMs,
  type RuntimeContext,
} from "./runtimeContext.js";

export {
  parseTimeoutConfig,
  checkDeadline,
  type TimeoutConfig,
} from "./timeoutPolicy.js";

export {
  parseRetryPolicy,
  withRetry,
  type RetryConfig,
  type EffectRetryPolicy,
} from "./retryPolicy.js";

export {
  parseLimitConfig,
  checkRequestSize,
  checkBatchSize,
  type LimitConfig,
  type LimitViolation,
} from "./limitPolicy.js";

export type { ContractEnforcementRecord } from "./runtimeReport.js";

export {
  createEnforcementRecord,
  recordRetryAttempt,
  recordLimitViolation,
  formatEnforcementRecord,
} from "./runtimeReport.js";
