# 113 — Secure flow with full effects

**Concept:** secure flow with full effects pattern

A secure flow combines operational effects (database.write) with udit.write. Both must be declared. This example shows the complete canonical pattern: unsafe input -> validation -> protected type -> database write -> redaction -> audit log.

**AI rule:** Secure flows require udit.write alongside operational effects.
