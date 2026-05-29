# 162 — Invalid audit log

**Concept:** Passing protected value to audit sink without redaction

AuditLog.write expects edacted values for sensitive fields. Passing a protected Email directly is a security error — redaction must be explicit.

**AI rule:** Redact protected values before passing to audit sinks.
