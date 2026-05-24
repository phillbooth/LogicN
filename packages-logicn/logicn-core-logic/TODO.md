# LogicN Logic TODO

```text
[x] Create /packages-logicn/logicn-core-logic
[x] Document package boundary
[x] Add package metadata
[x] Add initial typed exports
[x] Define LogicN language syntax for Tri
[x] Define initial LogicN validation rules
[x] Define Omni logic rules
[ ] Define TriState type: "TRUE" | "FALSE" | "UNKNOWN"
[ ] Implement triAnd(a: TriState, b: TriState): TriState
[ ] Implement triOr(a: TriState, b: TriState): TriState
[ ] Implement triNot(a: TriState): TriState
[ ] Define LN-TRI-001 (invalid tri-state operation), LN-TRI-002 (unresolved in deterministic path), LN-TRI-003
[ ] Create tri/ dir: tri-types.ts, tri-operators.ts, tri-runtime.ts, tri-compiler.ts
[ ] Define Decision type: "APPROVE" | "DENY" | "REVIEW_REQUIRED" | "DEFER" | "ESCALATE"
[ ] Implement evaluateCapability(granted: boolean): Decision
[ ] Define decision trace shape (decision/reason[] JSON)
[ ] Define LN-DECISION-001 through LN-DECISION-003 diagnostic codes
[ ] Create decision/ dir: decision-types.ts, decision-runtime.ts, decision-policy.ts, decision-traces.ts
[ ] Implement validateBoolBoundary(state: string): boolean
[ ] Implement enforceDeterministicPath(state: string): void
[ ] Define LN-BOOL-BOUNDARY-001 (non-deterministic logic in restricted path) through LN-BOOL-BOUNDARY-003
[ ] Create boundaries/ dir: bool-boundaries.ts, boundary-validator.ts, governance-boundaries.ts, runtime-boundaries.ts
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
