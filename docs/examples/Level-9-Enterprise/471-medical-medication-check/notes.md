# 471 — Medical medication check

**Concept:** Medical domain flow using `record` types `Patient` and `Medication`

This example shows the canonical pattern for a clinical decision-support flow
that checks whether two medications have a known interaction for a patient.

## Record types

```
record Patient { id, name, nhsNumber }
record Medication { code, name, doseUnit }
```

Both are plain structural types. The sensitive fields (nhsNumber) are handled
as `protected` primitives once validated from raw unsafe input.

## Validation pattern

```
unsafe let rawPatientId: String = request.params.patientId
let patientId: protected PatientId = validate.patientId(rawPatientId)?
```

Raw boundary input is always `unsafe`. The `validate.*` step produces a
`protected` typed value that the compiler tracks through the rest of the flow.

## fn checkInteraction

There is no explicit `fn checkInteraction` in this example — the interaction
logic is delegated to `InteractionDB.check`. In a larger codebase, a local
helper `fn checkInteraction` could encapsulate the validation and lookup steps,
making the flow body a pure orchestration layer.

## Privacy invariants

- `privacy.contains PII` and `privacy.contains PHI` declare the sensitivity class.
- `deny protected NhsNumber to response` prevents NHS numbers from leaking.
- All `protected` values in the audit log are wrapped with `redact()`.

## Clinical access control

- `require clinical_role on actor` in `contract.rules` enforces that only
  authorised clinical staff can invoke this flow.
- `require actor before database.read` ensures the actor is verified first.

**AI rule:** Medical flows must use protected types for all PII (PatientId, MedicationCode),
declare pii.read and audit.write effects, and redact protected values in audit entries.
