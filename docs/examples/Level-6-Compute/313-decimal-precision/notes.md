# 313 — Decimal precision

**Concept:** dividing Money by a Decimal value for precise splitting

`Money<GBP> / Decimal` performs exact decimal division. Converting `n` to `Decimal` via `Decimal(n.toString())` ensures no floating-point representation errors are introduced during the division.

**AI rule:** Use `Decimal` arithmetic for all monetary division to avoid floating-point rounding errors.
