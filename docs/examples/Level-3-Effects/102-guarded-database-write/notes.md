# 102 — Guarded flow with database.write

**Concept:** guarded flow declaring database.write effect

A guarded flow must explicitly declare every effect it uses. Writing to a database requires database.write in the effect list. The compiler verifies the declaration matches actual operations.

**AI rule:** Declare database.write when writing to a database.
