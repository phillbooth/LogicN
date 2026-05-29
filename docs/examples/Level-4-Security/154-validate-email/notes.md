# 154 — Validate email

**Concept:** Validating unsafe email to protected Email

alidate.email(rawEmail)? parses and validates the raw string. On success it returns a protected Email. On failure the ? propagates the error as a Result. This is the standard email validation gate.

**AI rule:** Email values come from alidate.email(). The ? propagates validation failure.
