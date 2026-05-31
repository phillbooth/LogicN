# LogicN — PII Handling

## Status

```
Implemented — compiler-enforced
Core qualifiers: protected, redacted, unsafe let
Contract sections: privacy {}, response {}, audit {}
Diagnostics: LLN-VALUESTATE-003/006, LLN-VALUESTATE-005, LLN-GOV-003
```

## TL;DR

- LogicN makes PII **explicit in the language** — not a runtime convention or documentation note
- Every piece of PII follows a compiler-enforced lifecycle: raw input → validated → protected use → redacted → audit/output
- The `privacy {}` contract block declares PII rules that the governance verifier enforces

---

## The PII Lifecycle

```logicn
// 1. Raw untrusted input — not yet validated
unsafe let rawEmail: String =
  request.body.email

// 2. Validated but sensitive — safe to use in governed operations
let email: protected Email =
  validate.email(rawEmail)?

// 3. Masked for logs and audit — safe to write anywhere
let auditEmail: redacted Email =
  redact(email)
```

Each step is a different **type qualifier** — not just a comment or convention.

---

## Core Qualifiers

| Qualifier | Meaning | Allowed operations |
|---|---|---|
| `unsafe let raw` | Untrusted input, not yet validated | Must pass through a validation gate |
| `protected Email` | Validated, sensitive PII | database.write (governed), redact(), authorised response |
| `redacted Email` | Masked, safe for all outputs | audit.write, logs, response body |

### Binding rules

```logicn
unsafe let rawEmail: String = request.body.email   // ← boundary origin, untrusted
let email: protected Email = validate.email(rawEmail)?  // ← validated, now sensitive
let auditEmail: redacted Email = redact(email)          // ← masked, safe for output
```

**Key invariant:**
- `protected X` cannot be assigned where plain `X` is required → LLN-VALUESTATE-006
- `unsafe` value cannot reach a governed sink without a gate → LLN-VALUESTATE-003
- Derived value from unsafe (e.g. `rawEmail.trim()`) still tainted → LLN-VALUESTATE-005

---

## Privacy Contract Section

```logicn
secure flow createPatient(readonly request: Request) -> CreatePatientResult

contract {
  types {
    type CreatePatientResult = Result<Response, ApiError>
  }

  intent {
    "Create a patient record while protecting PII."
  }

  privacy {
    contains PII                                // declares this flow handles PII
    require redaction before audit.write        // all audit writes must use redact()
    deny protected Email to response            // protected Email may not leave in response
    retention 7 years                           // data retention policy
  }

  response {
    returns PatientProfileResponse
    exposes { patientId name }    // only these fields may appear in response
    denies { email nhsNumber }    // PII explicitly blocked from response body
  }

  audit {
    require runtime report        // execution must produce proof
    require signed attestation    // cryptographically signed audit chain
  }
}
```

---

## What the Compiler Enforces

| Rule | Diagnostic | When it fires |
|---|---|---|
| `unsafe` value reaches database.write | LLN-VALUESTATE-003 | `rawEmail` used at DB sink |
| Derived unsafe value reaches sink | LLN-VALUESTATE-005 | `rawEmail.trim()` at DB sink |
| `protected X` used where plain `X` required | LLN-VALUESTATE-006 | Type boundary crossing |
| Field in `response.denies` returned in body | LLN-GOV-003 | `email` in `Response.okJson({email: ...})` |
| `require redaction` violated | (audit phase) | `email` written unredacted to audit |
| Governed sink without audit evidence | LLN-GOV-002 | `database.write` without `audit.write` |

---

## Canonical PII Pattern

The gold standard pattern — enforced by compiler at every step:

```logicn
{
  // Step 1: receive unsafe boundary input
  unsafe let rawEmail: String = request.body.email

  // Step 2: validate into a protected type (gate breaks taint chain)
  let email: protected Email = validate.email(rawEmail)?

  // Step 3: use in a governed operation
  let saved = PatientsDB.insert({ email: email })?

  // Step 4: redact before audit
  AuditLog.write({
    event: "PatientCreated",
    patientId: saved.id,
    email: redact(email)   // ← redacted Email, safe for audit log
  })

  // Step 5: return only allowed fields (email denied by contract.response.denies)
  return Ok(Response.created(saved.id))
}
```

Each step is compiler-verified. Skipping any step produces a diagnostic.

---

## Why This Approach

Most frameworks treat PII protection as:
- Runtime checks (fail at execution time)
- Documentation conventions ("remember to redact before logging")
- External compliance tools (scan code after the fact)

LogicN makes PII protection **structural**:
- The compiler refuses to compile code that handles PII incorrectly
- The type system tracks sensitivity from entry to exit
- The contract declares intent; the body must satisfy it
- The audit proof records that protection was applied

---

## See Also

- `value-state-annotations.md` — full qualifier system (unsafe/safe/protected/redacted)
- `logicn-contract-privacy-observability.md` — privacy {} and observability {} contract sections
- `logicn-contract-full-model.md` — canonical 16-section contract reference
- `logicn-trust-sensitivity-type-rules.md` — trust and sensitivity as independent axes
- `logicn-governance-verifier-spec.md` — LLN-GOV-* diagnostics
