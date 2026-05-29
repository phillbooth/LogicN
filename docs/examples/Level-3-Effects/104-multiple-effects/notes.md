# 104 — Multiple effects

**Concept:** Flow declaring multiple effects

A flow may declare multiple effects in a single with effects [...] list. The compiler verifies that every effect used in the body is declared, and that no undeclared effects are used.

**AI rule:** List all required effects in the with effects [...] declaration.
