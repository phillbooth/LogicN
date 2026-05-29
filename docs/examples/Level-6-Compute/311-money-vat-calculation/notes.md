# 311 — Money VAT calculation

**Concept:** multiplying Money by a Decimal rate

`Money<GBP> * Decimal` is a legal operation that produces `Money<GBP>`. Using `Decimal` (arbitrary-precision) rather than `Float` avoids floating-point rounding errors in financial calculations.

**AI rule:** Multiply `Money<C>` by `Decimal` to scale an amount; the result preserves the currency type.
