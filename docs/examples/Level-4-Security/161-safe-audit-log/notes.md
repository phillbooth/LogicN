# 161 — Safe audit log

**Concept:** Safe audit log write with redacted value

Passing edact(email) inline to AuditLog.write is the compact form of the canonical pattern. The audit sink receives a edacted Email, not the raw protected value.

**AI rule:** Protected -> Redacted -> Audit is the canonical LogicN trust flow for sensitive data.
