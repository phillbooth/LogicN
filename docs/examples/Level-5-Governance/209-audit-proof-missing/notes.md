# 209 — Audit proof missing

**Concept:** Intent requires audit but no udit.write sink used

The intent declares a "full audit trail" but no AuditLog.write is called and udit.write is not declared. The policy engine detects the contradiction between intent and observed behaviour.

**AI rule:** If intent or policy requires audit evidence, AuditLog.write must be called.
