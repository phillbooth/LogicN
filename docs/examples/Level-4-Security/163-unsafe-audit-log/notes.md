# 163 — Unsafe audit log

**Concept:** Passing unsafe value to audit sink

awEmail is an unsafe String. Passing it to AuditLog.write is doubly wrong: it is neither validated nor redacted. The compiler rejects unsafe values at all sinks.

**AI rule:** Unsafe values must be validated before reaching any sink.
