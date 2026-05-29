# 160 — Protected not redacted

**Concept:** protected value cannot be directly assigned to edacted binding

protected Email and edacted Email are distinct labels. Direct assignment without calling edact() is a type error — this forces explicit, intentional redaction decisions.

**AI rule:** Protected values must be explicitly redacted. Use edact(email).
