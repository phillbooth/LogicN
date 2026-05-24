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
