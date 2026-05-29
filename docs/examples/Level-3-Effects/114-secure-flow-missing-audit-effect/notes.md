# 114 — Secure flow missing audit.write

**Concept:** secure flow calls AuditLog.write but does not declare udit.write

AuditLog.write is an udit.write operation. Even in a secure flow, the effect must be explicitly declared. This ensures audit writes are always intentional and traceable.

**AI rule:** AuditLog.write requires udit.write to be declared in the effect list.
