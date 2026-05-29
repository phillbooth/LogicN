# 158 — Redact email

**Concept:** edact() converts protected Email to edacted Email

edact(email) produces a edacted Email — a value safe to write to audit logs. The redacted form carries the type identity but masks the raw content.

**AI rule:** Protected values become edacted through edact(). Use for audit logging.
