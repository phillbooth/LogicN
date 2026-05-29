# 208 — Audit proof required

**Concept:** Delete flow with full audit evidence

Deleting sensitive records is a high-risk operation. The flow must produce audit evidence: udit.write must be declared and AuditLog.write must be called with a edacted identifier and a timestamp.

**AI rule:** Destructive operations on sensitive data require audit evidence. Declare udit.write and call AuditLog.write.
