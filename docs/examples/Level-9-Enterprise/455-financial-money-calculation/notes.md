# 455 — Financial money calculation

**Concept:** financial tax calculation using Money and Decimal

`amount * rate` where `rate` is a `Decimal` (e.g., `Decimal("0.20")` for 20% VAT) produces a `Money<GBP>` result. Using `Decimal` rather than `Float` avoids IEEE 754 rounding errors that can accumulate across many transactions.

**AI rule:** Use `Decimal` for all tax rate multiplication to avoid floating-point rounding in financial flows.
