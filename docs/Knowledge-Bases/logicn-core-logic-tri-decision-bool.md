# LogicN Core Logic: Tri Logic, Decision Logic and Bool Boundary Rules

## Definition

Tri logic, Decision logic, and Bool boundary rules are three complementary logic
systems in the `logicn-core-logic` package. Together with Omni Logic, they form
the full reasoning and governance semantics layer of LogicN.

| System | Purpose |
| --- | --- |
| Tri logic | explicit uncertainty modelling |
| Decision logic | structured governance outcomes |
| Bool boundary rules | deterministic safety enforcement |
| Omni logic | advisory future reasoning (see `logicn-core-logic-omni-logic.md`) |

## Status

```text
Tri logic:       defined in KB — implementation stubs only
Decision logic:  defined in KB — implementation stubs only
Bool boundaries: defined in KB — implementation stubs only
```

Referenced KBs:

```text
mathematics-and-tri-logic.md
authority-model.md
logicn-core-logic-omni-logic.md
package-completion-status.md
```

---

## Logic Layer Philosophy

LogicN treats logic systems as runtime governance primitives rather than simple
language syntax.

The logic layer exists to support:

```text
deterministic governance
safe reasoning
runtime planning
capability evaluation
AI orchestration
distributed coordination
future heterogeneous compute planning
```

All logic systems must remain:

```text
auditable
explainable
deterministic where required
runtime-safe
governance-aware
policy-compatible
```

No logic layer may bypass:

```text
runtime policy
capability enforcement
deployment validation
compiler correctness
memory safety
```

---

## Part 1: Tri Logic Operations

### Purpose

Tri logic extends binary logic with an explicit third state.

Traditional boolean systems allow:

```text
true
false
```

Tri logic introduces:

```text
unknown
```

This allows LogicN to model incomplete information explicitly without unsafe
assumptions.

### Why Tri Logic Exists

Binary logic is insufficient for some runtime conditions.

Examples:

```text
unverified cluster state
pending runtime checks
distributed consensus delay
partial trust information
capability resolution in progress
```

### Core Tri States

| State | Meaning |
| --- | --- |
| `TRUE` | confirmed true |
| `FALSE` | confirmed false |
| `UNKNOWN` | insufficient information |

The `UNKNOWN` state is intentional rather than implicit failure.

### Tri State Type

```ts
export type TriState =
    | "TRUE"
    | "FALSE"
    | "UNKNOWN"
```

### Example Tri Logic Declaration

```logicn
type Tri =
    | TRUE
    | FALSE
    | UNKNOWN
```

### Example Runtime Check

```logicn
fn verify_cluster(node: ClusterNode) -> Tri {
    if node.online {
        return TRUE
    }

    if node.failed {
        return FALSE
    }

    return UNKNOWN
}
```

### Tri Logic AND Truth Table

| A | B | Result |
| --- | --- | --- |
| TRUE | TRUE | TRUE |
| TRUE | UNKNOWN | UNKNOWN |
| FALSE | UNKNOWN | FALSE |
| UNKNOWN | UNKNOWN | UNKNOWN |

### Tri Logic OR Truth Table

| A | B | Result |
| --- | --- | --- |
| TRUE | UNKNOWN | TRUE |
| FALSE | UNKNOWN | UNKNOWN |
| UNKNOWN | UNKNOWN | UNKNOWN |

### Tri Logic NOT Truth Table

| Input | Output |
| --- | --- |
| TRUE | FALSE |
| FALSE | TRUE |
| UNKNOWN | UNKNOWN |

### TypeScript Tri Evaluator

```ts
export function triAnd(
    a: TriState,
    b: TriState
): TriState {
    if (a === "FALSE" || b === "FALSE") {
        return "FALSE"
    }

    if (a === "UNKNOWN" || b === "UNKNOWN") {
        return "UNKNOWN"
    }

    return "TRUE"
}
```

### Governance Purpose

Tri logic allows runtime systems to distinguish:

```text
denied
unknown
approved
```

without silently collapsing uncertainty into false assumptions.

### Governance Rules

Tri logic must never bypass deterministic enforcement.

Forbidden:

```logicn
if UNKNOWN {
    bypass_security()
}
```

The runtime must explicitly resolve governance-critical uncertainty.

### Suggested Internal Structure

```text
packages-logicn/logicn-core-logic/src/tri/
```

Suggested files:

```text
tri-types.ts
tri-operators.ts
tri-runtime.ts
tri-compiler.ts
```

### Diagnostic Codes (LN-TRI series)

| Code | Meaning |
| --- | --- |
| `LN-TRI-001` | invalid tri-state operation |
| `LN-TRI-002` | unresolved tri-state in deterministic path |
| `LN-TRI-003` | unsupported tri-state conversion |

---

## Part 2: Decision Logic

### Purpose

Decision logic provides structured governance outcomes.

Unlike simple booleans, decision logic models:

```text
approval
denial
review required
deferred execution
runtime escalation
```

This helps runtime governance systems remain explainable.

### Why Decision Logic Exists

Traditional booleans are often insufficient for governance workflows.

Example:

```text
deployment approved?
```

Binary result:

```text
true / false
```

Governance-aware result:

```text
approved
denied
review_required
deferred
```

This creates safer runtime orchestration.

### Core Decision States

| State | Meaning |
| --- | --- |
| `APPROVE` | execution permitted |
| `DENY` | execution rejected |
| `REVIEW_REQUIRED` | manual or policy review needed |
| `DEFER` | postpone decision |
| `ESCALATE` | forward to higher authority |

### TypeScript Decision Type

```ts
export type Decision =
    | "APPROVE"
    | "DENY"
    | "REVIEW_REQUIRED"
    | "DEFER"
    | "ESCALATE"
```

### LogicN Decision Type Declaration

```logicn
type Decision =
    | APPROVE
    | DENY
    | REVIEW_REQUIRED
    | DEFER
    | ESCALATE
```

### Example Policy Evaluation

```logicn
fn evaluate_policy(policy: Policy) -> Decision {
    if policy.valid {
        return APPROVE
    }

    if policy.requires_review {
        return REVIEW_REQUIRED
    }

    return DENY
}
```

### Example Runtime Governance Evaluation

```logicn
fn evaluate_runtime(request: RuntimeRequest) -> Decision {
    if request.capability_missing {
        return ESCALATE
    }

    if request.policy_pending {
        return DEFER
    }

    return APPROVE
}
```

### TypeScript Decision Evaluator

```ts
export function evaluateCapability(
    granted: boolean
): Decision {
    if (granted) {
        return "APPROVE"
    }

    return "DENY"
}
```

### Decision Trace

Decision logic must remain auditable.

```json
{
  "decision": "REVIEW_REQUIRED",
  "reason": [
    "network effect detected",
    "manual review policy enabled"
  ]
}
```

### Governance Rules

Decision systems must remain deterministic for security-critical operations.

Forbidden:

```text
automatic approval escalation
hidden governance overrides
non-auditable runtime approvals
```

### Suggested Internal Structure

```text
packages-logicn/logicn-core-logic/src/decision/
```

Suggested files:

```text
decision-types.ts
decision-runtime.ts
decision-policy.ts
decision-traces.ts
```

### Diagnostic Codes (LN-DECISION series)

| Code | Meaning |
| --- | --- |
| `LN-DECISION-001` | invalid decision transition |
| `LN-DECISION-002` | unresolved governance decision |
| `LN-DECISION-003` | decision escalation unavailable |

---

## Part 3: Bool Boundary Rules

### Purpose

Bool boundary rules enforce deterministic truth boundaries between:

```text
governance systems
runtime execution
advisory reasoning
uncertain states
```

They guarantee that critical runtime systems remain binary-safe.

### Why Bool Boundaries Exist

Future reasoning systems may involve:

```text
tri logic
decision logic
Omni logic
AI orchestration
distributed uncertainty
```

But critical runtime enforcement must remain:

```text
true
false
```

The boundary rules prevent uncertain reasoning from leaking into deterministic
security enforcement.

### Protected Runtime Systems

Bool boundary rules protect:

```text
memory safety
capability enforcement
runtime policy
deployment approval
compiler correctness
cryptographic validation
module integrity
```

These systems must never become probabilistic.

### Runtime Enforcement Rule

```text
deployment approval:
    TRUE / FALSE only

capability grants:
    TRUE / FALSE only

cryptographic validation:
    TRUE / FALSE only
```

This rule is absolute.

### Example Safe Boundary

```logicn
let recommendation = evaluate_ai()

if recommendation == APPROVE {
    require_manual_review()
}
```

Meaning:

```text
advisory reasoning informs workflow
deterministic systems still decide execution
```

### Example Unsafe Boundary

```logicn
if omni_result == PROBABLE {
    grant_capability()
}
```

Compiler/runtime result:

```text
LN-BOOL-BOUNDARY-001
non-deterministic logic used in restricted path
```

### Boundary Enforcement Rules

The compiler/runtime must reject:

```text
probabilistic capability grants
advisory deployment approvals
uncertain cryptographic validation
non-deterministic memory safety checks
```

### TypeScript Boundary Validator

```ts
export function validateBoolBoundary(
    state: string
): boolean {
    return (
        state === "TRUE" ||
        state === "FALSE"
    )
}
```

### TypeScript Compiler Enforcement

```ts
export function enforceDeterministicPath(
    state: string
): void {
    if (state !== "TRUE" && state !== "FALSE") {
        throw new Error(
            "non-deterministic logic forbidden in restricted path"
        )
    }
}
```

### Suggested Internal Structure

```text
packages-logicn/logicn-core-logic/src/boundaries/
```

Suggested files:

```text
bool-boundaries.ts
boundary-validator.ts
governance-boundaries.ts
runtime-boundaries.ts
```

### Diagnostic Codes (LN-BOOL-BOUNDARY series)

| Code | Meaning |
| --- | --- |
| `LN-BOOL-BOUNDARY-001` | non-deterministic logic in restricted path |
| `LN-BOOL-BOUNDARY-002` | advisory logic attempted capability escalation |
| `LN-BOOL-BOUNDARY-003` | unresolved logic state at execution boundary |

---

## Shared Runtime Integration

All three logic systems integrate with:

```text
logicn-core-runtime
logicn-core-compiler
logicn-core-compute
logicn-core-cli
```

The runtime always remains authoritative.

## Shared Audit Requirements

All logic systems must generate:

```text
reasoning traces
decision metadata
state transitions
governance explanations
runtime audit events
```

This preserves explainability.

## Shared Governance Rules

The logic layer must never allow:

```text
hidden probabilistic execution
silent authority escalation
non-auditable runtime reasoning
unsafe self-modifying logic
policy bypass
```

---

## Recommended Implementation Order

### Phase 1

```text
tri logic primitives
basic decision types
bool boundary enforcement
```

### Phase 2

```text
runtime traces
governance explanations
decision metadata
```

### Phase 3

```text
compiler integration
runtime planning integration
CLI explain integration
```

### Phase 4

```text
future Omni experimentation
distributed reasoning
advanced orchestration
```

---

## v0.1 Scope

Implement first:

```text
tri logic primitives
decision logic primitives
basic bool boundary validation
compiler/runtime stubs
```

Defer:

```text
full Omni runtime
AI orchestration
distributed reasoning
probabilistic execution planning
photonic coordination
```

---

## Relationship to Other Systems

```text
logicn-core-logic       → owns Tri, Decision, Bool boundary and Omni contracts
logicn-core-runtime     → runtime must stay deterministic regardless
logicn-core-compiler    → compiler must remain binary-safe
logicn-core-compute     → Omni/Tri may eventually assist GPU/accelerator planning
```

See also: `mathematics-and-tri-logic.md`, `logicn-core-logic-omni-logic.md`,
`authority-model.md`, `package-completion-status.md`.
