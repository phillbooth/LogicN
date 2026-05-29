# 360 — AI audit redacted

**Concept:** protected patient data redacted in AI audit log entry

`redact(patientId)` replaces the protected value with a hash or token before it is written to the audit log. This allows the audit trail to reference the record without storing the raw PII, satisfying GDPR and HIPAA data-minimisation requirements.

**AI rule:** Always wrap `protected` values in `redact()` before passing them to `AuditLog.write`.
