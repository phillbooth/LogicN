# 061 — Redacted Email

**Concept:** edacted Email label

A protected Email can be converted to a edacted Email via edact(). Redacted values are safe to pass to audit sinks — they carry the type identity but mask the raw content.

**AI rule:** Use edact() to convert a protected value to a redacted value for audit logging.
