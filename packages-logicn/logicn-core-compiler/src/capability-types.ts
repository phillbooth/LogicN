/**
 * SystemCapabilityType — typed capability objects for DRCM Phase 4.
 *
 * Replaces string-based effect name matching with a structured enum + bitmask.
 * The compiler uses these at compile time; DSS.wasm uses the bitmasks at runtime.
 *
 * MONOTONICITY RULE: capability bits can ONLY be CLEARED during emergency transitions.
 * The emergency state machine verifier (LLN-MONO-001/002) enforces this.
 *
 * Bit layout matches V_DPM register in DSS.wasm (vdpm.lln):
 *   0 = network.outbound   4 = database.write
 *   1 = storage.write      5 = ai.inference
 *   2 = secret.access      6 = shell.execute
 *   3 = audit.write        7 = native.call
 */

/** Canonical capability names — the typed enum for V_DPM bit positions. */
export const enum SystemCapabilityType {
  // Capability bits (0-7, matching V_DPM layout)
  NetworkOutbound  = "network.outbound",
  StorageWrite     = "storage.write",
  SecretAccess     = "secret.access",
  AuditWrite       = "audit.write",
  DatabaseWrite    = "database.write",
  AiInference      = "ai.inference",
  ShellExecute     = "shell.execute",
  NativeCall       = "native.call",
  // Composite families
  LedgerMutate     = "ledger.mutate",  // storage.write + audit.write
  NetworkInbound   = "network.inbound", // same bit as outbound
  DatabaseRead     = "database.read",  // read-only, no V_DPM bit
}

/** Map every canonical effect name to its V_DPM bit position (0-7, or -1 for read-only). */
export const CAPABILITY_BIT_POSITION: Readonly<Record<string, number>> = {
  [SystemCapabilityType.NetworkOutbound]: 0,
  [SystemCapabilityType.NetworkInbound]:  0,
  [SystemCapabilityType.StorageWrite]:    1,
  [SystemCapabilityType.SecretAccess]:    2,
  "secret.read":                          2,  // alias
  [SystemCapabilityType.AuditWrite]:      3,
  [SystemCapabilityType.DatabaseWrite]:   4,
  [SystemCapabilityType.AiInference]:     5,
  [SystemCapabilityType.ShellExecute]:    6,
  [SystemCapabilityType.NativeCall]:      7,
  [SystemCapabilityType.DatabaseRead]:   -1,  // read-only, no bit needed
};

/** Bitmask for a single capability (2^bit_position). Returns 0 for read-only effects. */
export function capabilityToBitmask(effect: string): number {
  const bit = CAPABILITY_BIT_POSITION[effect];
  if (bit === undefined || bit < 0) return 0;
  return 1 << bit;
}

/**
 * Resolve a composite effect to its component bitmask.
 * e.g. "ledger.mutate" → storage.write bit | audit.write bit
 */
export function resolveCompositeBitmask(effect: string): number {
  if (effect === SystemCapabilityType.LedgerMutate) {
    return capabilityToBitmask(SystemCapabilityType.StorageWrite)
         | capabilityToBitmask(SystemCapabilityType.AuditWrite);
  }
  return capabilityToBitmask(effect);
}

/**
 * All known canonical capability names (for exhaustive checking).
 * Governance verifier uses this to detect unrecognised capability names.
 */
export const KNOWN_CAPABILITIES = new Set<string>([
  SystemCapabilityType.NetworkOutbound,
  SystemCapabilityType.NetworkInbound,
  SystemCapabilityType.StorageWrite,
  SystemCapabilityType.SecretAccess,
  "secret.read",
  SystemCapabilityType.AuditWrite,
  SystemCapabilityType.DatabaseWrite,
  SystemCapabilityType.AiInference,
  SystemCapabilityType.ShellExecute,
  SystemCapabilityType.NativeCall,
  SystemCapabilityType.LedgerMutate,
  SystemCapabilityType.DatabaseRead,
  // Wildcard roots (banned by LLN-CAP-001 but known)
  "network.*", "storage.*", "database.*",
]);

/** Emergency signal types — what can trigger an emergency {} transition. */
export const enum EmergencySignalType {
  InvariantFailure   = "invariant_failure",   // LLN-INV-000 trap fired
  CapabilityDenied   = "capability_denied",   // V_DPM & mask === 0
  FuelExhausted      = "fuel_exhausted",      // Wasmtime fuel ran out
  ManifestTampered   = "manifest_tampered",   // sourceHash mismatch
  QuarantineRequest  = "quarantine_request",  // explicit quarantine
  AnyFailure         = "any_failure",         // catch-all
}

/** All valid signal type names. */
export const KNOWN_SIGNALS = new Set<string>([
  EmergencySignalType.InvariantFailure,
  EmergencySignalType.CapabilityDenied,
  EmergencySignalType.FuelExhausted,
  EmergencySignalType.ManifestTampered,
  EmergencySignalType.QuarantineRequest,
  EmergencySignalType.AnyFailure,
]);

/** Emergency transition action — what a signal handler can do. */
export interface EmergencyTransition {
  readonly signal:   string;   // EmergencySignalType value
  readonly deny:     string[]; // capabilities to clear (bitmask clear operations)
  readonly quarantine: boolean;  // set quarantine_engaged bit
  readonly emergency:  boolean;  // set emergency_mode bit
}

/** Tower floor names for `governed` flow qualifier (task #77 foundation). */
export const enum FloorType {
  Execution    = "floor_1",   // Compute Dispatch
  Containment  = "floor_2",   // Isolation + Enforcement
  ProofZone    = "floor_3",   // Analysis + Logic
  Attestation  = "floor_4",   // Governance + Identity
}

/** Canonical floor names (short + long forms). */
export const KNOWN_FLOORS = new Set<string>([
  "floor_1", "floor_2", "floor_3", "floor_4",
  "execution", "containment", "proof", "proof_zone", "attestation",
]);

/** Map short form to canonical floor name. */
export function normaliseFloor(name: string): string {
  const map: Record<string, string> = {
    "execution": "floor_1",
    "containment": "floor_2",
    "proof": "floor_3",
    "proof_zone": "floor_3",
    "attestation": "floor_4",
  };
  return map[name] ?? name;
}

/**
 * Validate an EmergencyTransition for LLN-MONO-001 (monotonicity).
 * Returns error messages; empty array = valid.
 *
 * Rule: transitions may ONLY clear capability bits (deny) or set mode flags.
 * They CANNOT add new capabilities or expand existing permissions.
 */
export function validateTransitionMonotonicity(t: EmergencyTransition): string[] {
  const errors: string[] = [];
  for (const cap of t.deny) {
    const mask = resolveCompositeBitmask(cap);
    if (mask === 0 && !KNOWN_CAPABILITIES.has(cap)) {
      errors.push(
        `Emergency transition on '${t.signal}' denies unknown capability '${cap}'. ` +
        `Known capabilities: ${[...KNOWN_CAPABILITIES].filter(c => !c.includes("*")).join(", ")}`
      );
    }
    // No "allow" actions in emergency transitions — that would expand permissions (LLN-MONO-001)
  }
  return errors;
}
