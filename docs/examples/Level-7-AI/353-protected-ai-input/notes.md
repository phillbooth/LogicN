# 353 — Protected AI input

**Concept:** protected PII validated and passed through an AI risk model with redacted audit

Raw request data is promoted to a `protected PatientId` via validation. The protected value flows into feature extraction and then into the model. The audit log uses `redact()` to strip the PII before writing. This is the required pattern for AI flows handling patient data.

**AI rule:** Always validate raw input into a `protected` type before passing it to an AI model.
