# LogicN Logic

`logicn-core-logic` is the package for LogicN multi-state logic concepts.

It belongs in:

```text
/packages-logicn/logicn-core-logic
```

Use this package for:

```text
Tri
LogicN
Decision
RiskLevel
Omni logic
multi-state logic
conversion rules
truth tables
logic reports
```

## Safety Contracts

`logicn-core-logic` treats logic values as explicit finite states. The package
provides helpers for:

```text
Tri constants: -1 false, 0 unknown, 1 true
tri.not / tri.and / tri.or / tri.nor
explicit Tri -> Bool conversion policy
LogicN definition validation
logic state bounds checks
truth table validation and reports
```

Failure and exploit cases that must be blocked:

```text
unknown silently becoming true or Allow
invalid state indexes escaping a declared width
duplicate state names making reports ambiguous
incomplete or duplicate truth table rows hiding unhandled states
LogicN definitions whose state count does not match their width
```

## Canonical States

The package exposes canonical `Tri` and `Decision` state definitions:

```text
Tri      = [Negative, Neutral, Positive]
Decision = [Deny, Review, Allow]
```

The runtime value `Tri` remains `-1 | 0 | 1` for deterministic operations.
`triToLogicState` maps those runtime values onto the reportable state indexes:

```text
-1 -> Negative
 0 -> Neutral
 1 -> Positive
```

LogicN source should branch on `Tri` with exhaustive `match`, not by treating
`Tri` as `Bool`:

```text
match signal {
  Negative => deny()
  Neutral => review()
  Positive => allow()
}
```

`triToBool` requires a policy such as `unknown_as_false`,
`unknown_as_true` or `unknown_as_error`. Security-sensitive callers should use
`unknown_as_error` or `unknown_as_false`; they must not allow unknown values to
become access grants by default.

## Logic Systems Summary

| System | Purpose | Status |
| --- | --- | --- |
| Tri logic | explicit uncertainty modelling (TRUE/FALSE/UNKNOWN) | stubs |
| Decision logic | structured governance outcomes | stubs |
| Bool boundary rules | deterministic safety enforcement | stubs |
| Omni logic | advisory future reasoning (8 states) | planning only |

## Tri Logic Operations

The `TriState` TypeScript type: `"TRUE" | "FALSE" | "UNKNOWN"`.

AND truth table:

| A | B | Result |
| --- | --- | --- |
| TRUE | TRUE | TRUE |
| TRUE | UNKNOWN | UNKNOWN |
| FALSE | UNKNOWN | FALSE |
| UNKNOWN | UNKNOWN | UNKNOWN |

Governance rule: `UNKNOWN` must never silently become an access grant.

Diagnostic codes: `LN-TRI-001` through `LN-TRI-003`.

Internal dir: `packages-logicn/logicn-core-logic/src/tri/`

## Decision Logic

The `Decision` TypeScript type:
`"APPROVE" | "DENY" | "REVIEW_REQUIRED" | "DEFER" | "ESCALATE"`.

Decision traces must remain auditable. Non-auditable runtime approvals are forbidden.

Diagnostic codes: `LN-DECISION-001` through `LN-DECISION-003`.

Internal dir: `packages-logicn/logicn-core-logic/src/decision/`

## Bool Boundary Rules

Bool boundary rules prevent uncertain reasoning from leaking into deterministic
security enforcement.

Protected systems (must remain TRUE/FALSE only):

```text
memory safety
capability enforcement
runtime policy
deployment approval
compiler correctness
cryptographic validation
module integrity
```

Forbidden: `if omni_result == PROBABLE { grant_capability() }`

Diagnostic codes: `LN-BOOL-BOUNDARY-001` through `LN-BOOL-BOUNDARY-003`.

Internal dir: `packages-logicn/logicn-core-logic/src/boundaries/`

See `docs/Knowledge-Bases/logicn-core-logic-tri-decision-bool.md` for the full
specification including all truth tables, TypeScript types, and implementation order.

## Omni Logic (Future)

Omni Logic extends binary reasoning to multi-valued states for AI orchestration,
distributed systems, and uncertainty modelling. It is advisory only and must
never override deterministic runtime governance.

Eight Omni states: `TRUE`, `FALSE`, `UNKNOWN`, `PENDING`, `CONFLICT`,
`PROBABLE`, `IMPROBABLE`, `DEFERRED`.

Binary safety rule: memory safety, runtime policy, capability enforcement,
cryptography, and compiler correctness remain deterministic regardless of Omni
Logic. Final execution approval is always binary (yes/no — never "probably approved").

Omni Logic requires explicit opt-in: `feature omni_logic`.

Diagnostic codes: `LN-OMNI-001` through `LN-OMNI-005`.

v0.1 implementation: none — concept and safety boundaries documented only.

See `docs/Knowledge-Bases/logicn-core-logic-omni-logic.md` for the full
specification including all state examples, unsafe vs safe patterns, audit
requirements, and phased implementation plan.

## Architecture Depth: TypeScript Contracts (v0.2 Specification)

### TriState (Discriminated Union)

```ts
export type TriState =
    | { kind: "true" }
    | { kind: "false" }
    | { kind: "unknown"; reason?: string }

export const TRI_TRUE: TriState = { kind: "true" }
export const TRI_FALSE: TriState = { kind: "false" }
export function triUnknown(reason?: string): TriState {
    return { kind: "unknown", reason }
}

export function triNot(a: TriState): TriState
export function triAnd(a: TriState, b: TriState): TriState
// false short-circuits: if either is false, result is false
export function triOr(a: TriState, b: TriState): TriState
// true short-circuits: if either is true, result is true
export function combineUnknownReasons(a: TriState, b: TriState): string | undefined
```

### Decision (Discriminated Union)

```ts
export type Decision =
    | { kind: "allow";         reason?: string }
    | { kind: "deny";          reason: string  }
    | { kind: "unknown";       reason?: string }
    | { kind: "notApplicable"; reason?: string }
    | { kind: "conflict";      reason: string  }

export function allow(reason?: string): Decision
export function deny(reason: string): Decision
export function unknown(reason?: string): Decision
export function notApplicable(reason?: string): Decision
export function conflict(reason: string): Decision

// Fails closed: deny and conflict are runtime errors; unknown is deny
export function decisionToRuntimeBool(d: Decision): boolean

// Throws if decision is not allow or deny
export function requireDeterministicDecision(d: Decision): "allow" | "deny"
```

### Capability Evaluation

```ts
export interface CapabilityRequest {
    capability: string
    requestedBy: string
    context: PolicyContext
}

export interface PolicyContext {
    environment: string
    trustLevel: "untrusted" | "validated" | "internal" | "privileged"
    activeEffects: string[]
    grantedCapabilities: string[]
}

// Deny-first: any deny rule wins over allow
export function evaluateCapability(
    request: CapabilityRequest
): Decision

// Priority: conflict > deny > unknown > allow > notApplicable
export function combineDecisions(decisions: Decision[]): Decision
```

### Bool Boundary Enforcement

```ts
export interface BoolBoundaryResult {
    safe: boolean
    diagnostics: BoolBoundaryDiagnostic[]
}

export function validateBoolBoundary(
    value: TriState | Decision,
    context: BoolBoundaryContext
): BoolBoundaryResult

// Throws on non-deterministic value in deterministic context
export function enforceDeterministicPath(
    value: TriState | Decision,
    context: string
): void
```

### Practical LogicN Match Example

```
// Safe: exhaustive match on Decision
let decision = evaluateCapability(request)

match decision {
    allow => grantAccess()
    deny  => denyAccess(decision.reason)
    _     => denyAccess("non-deterministic decision")
}
```

### Internal File Layout

```text
packages-logicn/logicn-core-logic/src/
  tri/
    tri-state.ts          ← TriState, TRI_TRUE, TRI_FALSE, triUnknown()
    tri-ops.ts            ← triNot(), triAnd(), triOr(), combineUnknownReasons()
    tri-diagnostics.ts    ← LN-TRI-001–003
  decision/
    decision-state.ts     ← Decision, constructors
    decision-runtime.ts   ← decisionToRuntimeBool(), requireDeterministicDecision()
    decision-combine.ts   ← combineDecisions()
    decision-evaluate.ts  ← CapabilityRequest, PolicyContext, evaluateCapability()
    decision-diagnostics.ts ← LN-DECISION-001–003
  bool-boundary/
    bool-boundary.ts      ← BoolBoundaryResult, validateBoolBoundary()
    bool-enforce.ts       ← enforceDeterministicPath()
    bool-diagnostics.ts   ← LN-BOOL-BOUNDARY-001–003
  omni/
    omni-state.ts         ← 8-state Omni (planning only)
    omni-diagnostics.ts   ← LN-OMNI-001–005
```

## Boundary

`Tri` is a language-level logic model. `Omni` is a wider logic model. Photonic
support is a hardware or compute mapping.

`Omni` support is planning-only and must remain bounded. `logicn-core-logic`
models Omni as a named finite state set with explicit state names, not as an
unlimited truth space. This lets reports, truth tables and match coverage stay
auditable.

Some low-bit AI backends, including BitNet-style ternary models, also use
`-1`, `0` and `+1`, but they are model weights for AI inference, not LogicN logic
truth semantics. Low-bit AI backend integration belongs in `logicn-ai-lowbit`.

Final rule:

```text
logicn-core-logic handles Tri, LogicN and Omni.
logicn-ai-lowbit handles low-bit and ternary model weights.
logicn-core-photonic handles how logic may be represented using light.
```

## Naming Decision

Use `logicn-core-logic`, not `LogicN-tri`.

`LogicN-tri` is too narrow because LogicN may support `Tri`, `Logic<4>`, `Logic<5>`,
`LogicN`, `Decision`, `RiskLevel`, Omni logic and multi-state compute.
