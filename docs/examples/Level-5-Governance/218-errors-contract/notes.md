# 218 — Errors contract block

The `errors {}` block inside a flow contract declares the complete error surface of the flow.

## Sub-clauses

| Clause | Purpose |
|--------|---------|
| `returns { ... }` | All error variants this flow may return |
| `map X to Y` | Maps an internal error type to a safe API variant |
| `expose { ... }` | Which variants are visible to the caller |
| `redact { ... }` | Which variants are stripped of internal detail |
| `audit { ... }` | Which variants trigger an audit.write event |

## Rules

- Every error variant in `expose {}` should have a corresponding entry in `returns {}`
- Variants in `redact {}` must not reveal internal stack traces or DB messages to the caller
- Variants in `audit {}` should be accompanied by an `audit.write` effect on the flow

## Key principle

The errors contract gives the API a precise, reviewable error taxonomy. Callers only see
variants listed in `expose {}`. Internal detail is automatically redacted. Audit variants
require `audit.write` in the flow's effects.
