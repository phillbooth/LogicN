# 062 — Invalid redacted Email assignment

**Concept:** protected Email cannot be directly assigned to edacted Email

Redaction must be explicit. Assigning a protected Email directly to a edacted Email binding is a type error — you must call edact(email) to explicitly produce the redacted form.

**AI rule:** Use edact(email) to explicitly redact a protected value before assigning to a edacted binding.
