# 010 — readable equality (PROPOSED)

`status is Active` would produce the same AST as `status == Active`.

Both would be valid. The formatter would preserve the author's chosen style.

Adoption requires: lexer recognises `is`, parser handles `is Variant` → `== Variant`.
