# 002 — guarded flow

**Concept:** guarded flow with declared effects

A `guarded flow` performs effectful operations and must declare them in the
`effects [...]` clause. The compiler rejects undeclared effects.

External HTTP response data is `unsafe` — it must be decoded through a gate
(`json.decode`) before use as a typed value.

**AI rule:** Use `guarded flow` when the flow performs declared effects.
