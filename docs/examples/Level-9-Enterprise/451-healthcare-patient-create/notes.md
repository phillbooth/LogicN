# 451 — Healthcare patient create

**Concept:** healthcare PII governance pattern — create patient record with NHS number, protected types, and audit

The canonical patient-create flow: raw request fields are promoted to `protected` types via validation, the patient record is written to the database, and the audit log records only redacted identifiers. Effects `pii.write`, `database.write`, and `audit.write` are all declared.

**AI rule:** All healthcare flows must validate raw PII into `protected` types, declare `pii.write` and `audit.write` effects, and redact in audit.
