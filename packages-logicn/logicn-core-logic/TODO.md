# LogicN Logic TODO

```text
[ ] Align older v0.2 KB/developer-guide examples with current README canonical kind/evidence/review shape
[x] Create /packages-logicn/logicn-core-logic
[x] Document package boundary
[x] Add package metadata
[x] Add initial typed exports
[x] Define LogicN language syntax for Tri
[x] Define initial LogicN validation rules
[x] Define Omni logic rules
[ ] Upgrade TriState to discriminated union: {kind:"true"} | {kind:"false"} | {kind:"unknown", reason?}
[ ] Define TRI_TRUE, TRI_FALSE constants; implement triUnknown(reason?): TriState
[ ] Implement triNot(a: TriState): TriState
[ ] Implement triAnd(a, b): TriState — false short-circuits
[ ] Implement triOr(a, b): TriState — true short-circuits
[ ] Implement combineUnknownReasons(a, b): string | undefined
[ ] Define LN-TRI-001 (invalid tri-state operation), LN-TRI-002 (unresolved in deterministic path), LN-TRI-003
[ ] Create tri/ dir: tri-state.ts, tri-ops.ts, tri-diagnostics.ts
[ ] Upgrade Decision to discriminated union: allow|deny|unknown|notApplicable|conflict with reason
[ ] Implement constructors: allow(), deny(), unknown(), notApplicable(), conflict()
[ ] Implement decisionToRuntimeBool(d): boolean — fails closed (unknown → deny)
[ ] Implement requireDeterministicDecision(d): "allow"|"deny" — throws on non-deterministic
[ ] Define CapabilityRequest: capability, requestedBy, context
[ ] Define PolicyContext: environment, trustLevel, activeEffects, grantedCapabilities
[ ] Implement evaluateCapability(request): Decision — deny-first
[ ] Implement combineDecisions(decisions[]): Decision — priority: conflict > deny > unknown > allow > notApplicable
[ ] Define LN-DECISION-001 through LN-DECISION-003 diagnostic codes
[ ] Create decision/ dir: decision-state.ts, decision-runtime.ts, decision-combine.ts, decision-evaluate.ts, decision-diagnostics.ts
[ ] Upgrade BoolBoundaryResult to interface: safe, diagnostics[]
[ ] Implement validateBoolBoundary(value: TriState|Decision, context): BoolBoundaryResult
[ ] Implement enforceDeterministicPath(value, context): void — throws on non-deterministic
[ ] Define LN-BOOL-BOUNDARY-001 (non-deterministic logic in restricted path) through LN-BOOL-BOUNDARY-003
[ ] Create bool-boundary/ dir: bool-boundary.ts, bool-enforce.ts, bool-diagnostics.ts
[ ] Define Omni logic safety boundaries (must not override runtime policy, capability checks, compiler)
[ ] Define binary safety rule documentation (deterministic systems that Omni must not touch)
[ ] Define Omni state enum: TRUE, FALSE, UNKNOWN, PENDING, CONFLICT, PROBABLE, IMPROBABLE, DEFERRED
[ ] Define Omni advisory vs deterministic execution model
[ ] Define `feature omni_logic` explicit enablement requirement
[ ] Define Omni audit event shape (reasoning trace, advisory flag, confidence metadata)
[ ] Define LN-OMNI-001 through LN-OMNI-005 diagnostic codes
[ ] Phase 1: advisory OmniState types
[ ] Phase 2: runtime reasoning traces
[ ] Phase 3: AI orchestration integration (deferred until Phase 3)
[x] Define initial Tri conversion rules
[x] Define initial truth table report format
[x] Move or cross-reference relevant logicn-core logic docs when package extraction is ready
[x] Add examples
[x] Add tests
```
