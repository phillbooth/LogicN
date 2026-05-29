# 120 — Effects summary example

**Concept:** Comprehensive effects example showing all patterns

This example brings together all three major effect categories: database.write, 
etwork.outbound, and udit.write. Each must be declared. The body demonstrates: unsafe input, validation, protected types, database write, network call, redaction, and audit log.

**AI rule:** Declare every effect used. pure = no effects. guarded/secure = explicit effect list.
