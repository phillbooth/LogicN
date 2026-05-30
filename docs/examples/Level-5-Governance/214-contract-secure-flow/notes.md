# 214 — contract on secure flow

**Concept:** Flow contract with governance intent

The contract declares:
- `types { }` — flow-local CreatePatientResult alias
- `intent { }` — what the flow does and what it protects (feeds IGO and governance verifier)
- `events { }` — PatientCreated and PatientCreationRejected

The intent "protecting all PII" signals to the governance verifier that protected values
must be redacted before audit sinks — matching the `email: redact(email)` call.

**AI rule:** Contract intent makes governance decisions visible before reading the body.
