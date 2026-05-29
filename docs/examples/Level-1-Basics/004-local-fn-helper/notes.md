# 004 — local fn helper

**Concept:** fn as a local tidy helper inside a flow

`fn` is defined inside a flow to keep logic readable. It has no effects,
no authority, and no governance declarations. It is purely local computation.

Key rules:
- `fn` cannot declare `effects [...]`
- `fn` cannot request authority
- `fn` inherits effects from its containing flow only
- Top-level `fn` declarations are not permitted (see 020)

**AI rule:** `fn` is a local helper defined inside a flow. It cannot declare effects.
