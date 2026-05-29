# 001 — pure flow

**Concept:** pure flow

A `pure flow` is deterministic and has no side effects. The compiler enforces
that no I/O, network, database, or effectful operations appear inside it.

`Money<GBP> * Decimal` is valid — scaling a monetary amount by a factor.

**AI rule:** Use `pure flow` for deterministic logic with no effects.
