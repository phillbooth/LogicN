# 457 — Compliance PHI effect

**Concept:** handling HIPAA PHI without declaring the phi.read effect

HIPAA Protected Health Information (PHI) requires a separate `phi.read` effect on top of `pii.read`. The compiler distinguishes PHI from general PII because PHI carries stricter HIPAA access-logging obligations. The fix is `with effects [phi.read, pii.read, audit.write]`.

**AI rule:** Declare `effects [phi.read]` on every flow that accesses HIPAA Protected Health Information.
