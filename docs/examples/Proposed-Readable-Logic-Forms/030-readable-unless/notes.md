# 030 — readable unless (PROPOSED)

`unless condition { body }` → `if !condition { body }` in the AST.

Especially valuable in governance/approval contexts where the readable form
matches the business rule more clearly: "unless approved, deny".
