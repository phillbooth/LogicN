# 164 — Safe database write

**Concept:** protected value is safe to write to database

After validation, protected Email can be written to the database. The database.write effect is declared and the value is validated — no further transformation is needed for storage.

**AI rule:** Validated protected values can be stored in a database sink with database.write declared.
