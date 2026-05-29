# 086 — Protected not redacted

**Concept:** protected value cannot be directly assigned to edacted binding

A protected Email and a edacted Email are distinct type labels. You must call edact(email) explicitly to produce a edacted value. This forces intentional, auditable redaction decisions.

**AI rule:** Use edact(email) to convert a protected value to a redacted value.
