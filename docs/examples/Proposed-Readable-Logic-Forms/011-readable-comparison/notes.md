# 011 — readable comparison (PROPOSED)

`amount is greater than limit` → `amount > limit` in the AST.

Parser design: when `is` follows an expression, read the comparison tail:
`greater than` → `>`, `less than` → `<`, `greater than or equal to` → `>=`, etc.
