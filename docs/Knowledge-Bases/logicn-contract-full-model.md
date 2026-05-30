# LogicN Flow Contract — Full Reference Model

## Status

```
Phase 10A — Canonical specification
Sections: types/intent/events/rules/audit/targets/examples implemented; request/response/model/context Phase 10A
Governance enforcement: Phase 10B+
```

## TL;DR

- A flow contract is the complete declaration of what a flow is allowed, expected, and required to do
- The body describes how it executes; the contract describes what it means
- Canonical section order must be followed by formatters and code generators

---

## Principle

The contract is the meaning layer of a flow. The body is the execution layer.

```
request  = allowed incoming shape and trust state
response = allowed outgoing shape and exposure policy
model    = domain / data model used by the flow
types    = flow-local type aliases
intent   = machine-readable purpose
context  = required execution context fields
effects  = declared side-effects (alternative to 'with effects [...]')
rules    = governance rules and requirements
events   = events this flow may emit
audit    = audit and integrity requirements
```

A reader should be able to understand what a flow is for, what it accepts,
what it returns, and what it is not allowed to do by reading the contract
alone — without reading the body.

---

## Canonical Section Order (16 sections)

Formatters and code generators must emit contract sections in this order.
All sections are optional. A section may be omitted if it has no declarations.

```logicn
contract {
  types   {}          // Flow-local type aliases (incl. named result type)
  intent  {}          // Why the flow exists

  request {}          // Incoming shape, trust state, params/body expectations
  response {}         // Outgoing shape and exposure policy (exposes/denies)

  context {}          // Required actor, trace_id, deadline, tenant, etc.
  model   {}          // Domain model or AI model dependency

  effects {}          // Declared external capabilities / side-effects

  timeouts {}         // Deadlines, cancellation, per-operation timeouts
  retries  {}         // Retry policy for network/database/effectful calls
  limits   {}         // Request size, batch size, memory, prompt size

  privacy  {}         // PII rules, retention, exposure, redaction

  errors   {}         // Error mapping, exposure, redaction, audit

  rules    {}         // Enforceable governance/security constraints

  observability {}    // Metrics/traces/logging metadata (never data values)

  events {}           // Events the flow may emit
  audit  {}           // Required runtime report/proof/attestation
}
```

The formatter enforces this order. A contract with sections in a different
order is valid source but will be reordered by `logicn fmt`.

### Named Result Types

Flows with contracts should declare the result type as a flow-local alias in `contract.types`, not inline in the signature:

```logicn
// Preferred — result type named and documented in contract
secure flow createOrder(readonly request: Request) -> CreateOrderResult

contract {
  types {
    type CreateOrderResult = Result<Response, ApiError>
  }
  ...
}

// Also valid — direct in signature (fine for simple flows without full contracts)
secure flow simpleFlow(x: Int) -> Result<String, ApiError>
{ ... }
```

The named form is preferred for any flow with a `contract {}` block because it makes the return type discoverable without reading the signature, and it allows the contract to reference the result type by name in `errors {}` and `response {}`.

---

## Section: types {}

Already documented in `logicn-flow-contracts.md`.

Flow-local type aliases that only exist inside this flow. The compiler never
promotes them to global scope.

```logicn
types {
  type GetPatientResult = Result<PatientProfile, PatientError>
}
```

**Rule:** Flow-local aliases belong in `contract.types`. Shared domain types
(`Email`, `PatientId`, `Money<GBP>`) remain global.

---

## Section: intent {}

Already documented in `logicn-flow-contracts.md`.

Machine-readable purpose string for the flow. Feeds IGO, documentation
generation, governance review, and audit reporting.

```logicn
intent {
  "Retrieve a patient profile by ID for an authenticated clinical actor."
}
```

**Rule:** Intent is descriptive. Intent never grants authority.

---

## Section: request {}

New in Phase 10A. Declares the allowed incoming boundary for the flow.

```logicn
request {
  accepts PatientReadRequest

  params {
    patientId: unsafe String
  }

  requires {
    actor
    trace_id
    deadline
  }
}
```

**Sub-declarations:**

| Declaration | Meaning |
|---|---|
| `accepts TypeName` | Expected request shape (body type) |
| `params { name: TrustState TypeName }` | Path, query, or body parameters with trust state |
| `requires { field, ... }` | Context fields that must be present before execution begins |

Parameters in `params` use value-state prefixes (`unsafe`, `safe`,
`protected`) to express the trust state at the boundary. An `unsafe` param
requires a validation gate before it can reach a governed sink.

`requires` declarations are checked by the governance verifier in Phase 10B
(see `LLN-CONTEXT-001`).

---

## Section: response {}

New in Phase 10A. Declares the allowed outgoing boundary for the flow.

```logicn
response {
  returns PatientProfileResponse

  exposes {
    patientId
    name
  }

  denies {
    email
    nhsNumber
    dateOfBirth
  }
}
```

**Sub-declarations:**

| Declaration | Meaning |
|---|---|
| `returns TypeName` | Expected response shape |
| `exposes { fields }` | Fields explicitly permitted to leave the flow in the response body |
| `denies { fields }` | Fields that must NOT appear in the response body |

If a `protected` field appears in the response body without being listed in
`exposes`, the governance verifier emits `LLN-GOV-003` (Phase 10B).

`denies` is an explicit blocklist. A field in `denies` that appears in the
response body triggers `LLN-GOV-003` regardless of its type.

---

## Section: context {}

New in Phase 10A. Declares required execution context fields that must be
read before the flow performs protected work.

```logicn
context {
  require actor
  require trace_id
  require deadline
}
```

Each `require` line names a field from the runtime execution context. The
governance verifier checks (Phase 10B) that each required field is accessed
before the first protected operation in the flow body. A required field that
is never read emits `LLN-CONTEXT-001`.

---

## Section: model {}

New in Phase 10A. Declares the domain or AI model dependency for the flow.

**Domain model:**

```logicn
model {
  uses Patient
  reads PatientRecord
}
```

**AI model with governance constraints:**

```logicn
model {
  uses RiskModel
  constraints {
    local_only
    deny training
  }
}
```

`uses` declares a model or domain type the flow depends on. `reads` declares
data models the flow accesses for reading. `constraints` applies governance
restrictions to model usage — `local_only` forbids remote model calls;
`deny training` forbids the flow's data from being used as training input.

---

## Section: effects {}

Alternative form for declaring side-effects, equivalent to `with effects [...]`
at the flow signature.

```logicn
effects {
  database.read
  audit.write
}
```

Both forms are valid. The formatter normalises to `effects {}` inside the
contract when rewriting. `with effects [...]` at the signature level is not
deprecated and remains supported.

**Equivalence:**

```logicn
// These two are equivalent after formatting:

secure flow getPatient(...) -> Result<Response, ApiError>
with effects [database.read, audit.write] { ... }

secure flow getPatient(...) -> Result<Response, ApiError>
contract {
  effects { database.read, audit.write }
} { ... }
```

---

## Section: rules {}

Already documented in `logicn-flow-contracts.md` and
`logicn-governance-verifier-spec.md`.

Governance rules and requirements that apply to this flow.

```logicn
rules {
  protect memory for protected values
  deny runtime injection
  require redaction before audit.write
}
```

---

## Section: events {}

Already documented in `logicn-flow-contracts.md`.

Events this flow may emit. Each event listed here must have a global `event`
declaration before it can be used with `emit`.

```logicn
events {
  emits PatientProfileRead
  emits PatientNotFound
}
```

---

## Section: audit {}

Audit and integrity requirements for this flow. These declarations are
checked at compile time and enforced at runtime.

```logicn
audit {
  require proof
  require runtime report
  require signed attestation
  require audit.write
}
```

| Declaration | Meaning |
|---|---|
| `require proof` | An execution proof chain must be generated for every run |
| `require runtime report` | A runtime execution report must be produced |
| `require signed attestation` | The attestation artifact must be signed before the flow result is returned |
| `require audit.write` | `audit.write` must appear in the declared effects |

---

## Full Example: getPatient

```logicn
secure flow getPatient(readonly request: Request)
-> Result<Response, ApiError>

contract {

  types {
    type GetPatientResult = Result<PatientProfile, PatientError>
  }

  intent {
    "Retrieve a patient profile by ID for an authenticated clinical actor."
  }

  request {
    accepts PatientReadRequest

    params {
      patientId: unsafe String
    }

    requires {
      actor
      trace_id
    }
  }

  response {
    returns PatientProfileResponse

    exposes {
      patientId
      name
    }

    denies {
      email
      nhsNumber
      dateOfBirth
    }
  }

  context {
    require actor
    require trace_id
  }

  model {
    uses Patient
    reads PatientRecord
  }

  effects {
    database.read
    audit.write
  }

  rules {
    require redaction before audit.write
  }

  events {
    emits PatientProfileRead
    emits PatientNotFound
  }

  audit {
    require proof
    require runtime report
    require signed attestation
  }

}
{
  unsafe let rawId: String = request.params.patientId
  safe mut rawId = validate.uuid(rawId)?

  let patient = PatientsDB.find(rawId)?

  AuditLog.write({
    event: "PatientProfileRead",
    patientId: rawId,
    actor: context.actor
  })

  emit PatientProfileRead

  return Ok(Response.ok({
    patientId: patient.id,
    name: patient.name
  }))
}
```

---

## Diagnostics

New diagnostics introduced by the Phase 10A contract model.

| Code | Meaning | Phase |
|---|---|---|
| `LLN-GOV-003` | Protected field returned in response without an `exposes` declaration | Phase 10B |
| `LLN-CONTEXT-001` | Required context field not accessed before protected work begins | Phase 10B |
| `LLN-CONTRACT-001` | Contract section order violation (formatter only; not a compiler error) | Phase 10B |

These diagnostics are specified in Phase 10A and enforced in Phase 10B.
Existing `LLN-GOV-*` and `LLN-EFFECT-*` codes from Phase 9 are unchanged.

---

## Contract vs Body Principle

> Contract = what this flow is allowed, expected, and required to do.
> Body = how it does it.

The contract is the governed boundary. The body is the implementation.
A flow with a complete contract and no body is a valid specification artifact.
A flow with a body and no contract is allowed but ungoverned.

---

## Rules at a Glance

- Canonical section order is: types, intent, request, response, context, model, effects, rules, events, audit
- The formatter enforces section order; the compiler does not error on order violations in Phase 10A
- `response.denies` fields must not appear in the response body — enforced in Phase 10B
- `context.require` fields must be read before the first protected operation — enforced in Phase 10B
- `with effects [...]` and `effects {}` inside a contract are equivalent; both remain valid
- `audit.require signed attestation` requires `src/attestation.ts` to run before the response is returned
- Intent never grants authority — it guides optimisation and documentation only

---

## See Also

- `docs/Knowledge-Bases/logicn-flow-contracts.md` — types, intent, and events sections (implemented)
- `docs/Knowledge-Bases/logicn-signed-attestation.md` — how signed attestation is produced
- `docs/Knowledge-Bases/logicn-contract-sets.md` — shared contracts across flows
- `docs/Knowledge-Bases/logicn-governance-verifier-spec.md` — compiler governance pass
