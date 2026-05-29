# 073 — Cross-currency Money addition (invalid)

**Concept:** Cross-currency Money addition is forbidden

The compiler prevents adding Money<GBP> to Money<USD>. Currency is part of the type, so mismatched currencies are a type error, not a runtime check.

**AI rule:** Money types with different currency parameters cannot be added together.
