# 101 — Pure flow has no effects

**Concept:** pure flow has no effects

A pure flow is fully deterministic: no I/O, no network, no database, no audit writes. The compiler enforces this statically. Any attempt to call an effectful operation inside a pure flow is a compile error.

**AI rule:** Pure flows cannot perform I/O or call effectful operations.
