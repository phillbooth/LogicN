# 003 — secure flow

**Concept:** secure flow at an HTTP trust boundary

A `secure flow` handles external request data with full security enforcement:
- `readonly request` — the request cannot be reassigned
- `unsafe let rawEmail` — boundary data starts untrusted
- `protected Email` — validated but sensitive
- `redact(email)` — explicit redaction before audit sink

This is the canonical pattern for any flow that receives external input,
writes to a database, and produces an audit record.

**AI rule:** Use `secure flow` at trust boundaries such as HTTP/API requests.
