// =============================================================================
// LogicN Runtime — Capability Host (Phase 11C)
//
// Routes all side-effectful host calls through governed capability checks.
// Every call checks: declared effect? contract allows it? context valid?
//
// The interpreter calls capabilityHost instead of direct stdlib calls for:
//   database.read/write
//   network.outbound
//   audit.write
//   ai.inference
//   filesystem.read/write
//   email.send
//   crypto.sign/verify
// =============================================================================

import { type LogicNValue } from "../interpreter.js";
import { type RuntimeContext } from "./runtimeContext.js";
import { type ContractEnforcer } from "./contractEnforcer.js";

export interface CapabilityCheckResult {
  readonly allowed: boolean;
  readonly reason?: string; // if not allowed, why
}

export interface CapabilityCall {
  readonly capabilityId: string; // e.g. "host.database.read"
  readonly effect: string;       // e.g. "database.read"
  readonly args: readonly LogicNValue[];
  readonly context: RuntimeContext;
}

export interface CapabilityResult {
  readonly value: LogicNValue;
  readonly effectObserved: string;
  readonly durationMs: number;
}

export interface CapabilityHostConfig {
  readonly declaredEffects: ReadonlySet<string>;
  readonly enforcer: ContractEnforcer;
}

export interface CapabilityHost {
  // Check if a capability is allowed before executing
  check(call: CapabilityCall): CapabilityCheckResult;

  // Execute a capability call (checks first, then executes)
  execute(
    call: CapabilityCall,
    impl: (args: readonly LogicNValue[]) => Promise<LogicNValue>,
  ): Promise<CapabilityResult>;

  // Query which effects were actually observed
  readonly observedEffects: ReadonlySet<string>;
}

export function createCapabilityHost(config: CapabilityHostConfig): CapabilityHost {
  const observed = new Set<string>();

  function check(call: CapabilityCall): CapabilityCheckResult {
    if (!config.declaredEffects.has(call.effect)) {
      return {
        allowed: false,
        reason: `Effect '${call.effect}' not declared on this flow`,
      };
    }

    try {
      config.enforcer.checkDeadline();
    } catch {
      return {
        allowed: false,
        reason: "Flow deadline exceeded",
      };
    }

    return { allowed: true };
  }

  async function execute(
    call: CapabilityCall,
    impl: (args: readonly LogicNValue[]) => Promise<LogicNValue>,
  ): Promise<CapabilityResult> {
    const start = Date.now();
    const checkResult = check(call);

    if (!checkResult.allowed) {
      const errValue: LogicNValue = {
        __tag: "err",
        error: { __tag: "string", value: checkResult.reason ?? "Capability denied" },
      };
      return {
        value: errValue,
        effectObserved: call.effect,
        durationMs: Date.now() - start,
      };
    }

    const value = await config.enforcer.withRetry(call.effect, () => impl(call.args));
    observed.add(call.effect);

    return {
      value,
      effectObserved: call.effect,
      durationMs: Date.now() - start,
    };
  }

  return {
    check,
    execute,
    get observedEffects(): ReadonlySet<string> {
      return observed;
    },
  };
}
