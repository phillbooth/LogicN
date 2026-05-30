# 226 — Full 16-section minimal contract

**Concept:** All 16 contract sections in canonical order — minimal but complete

Use this as a copy-paste template when starting a new governed flow.
Every section is present with the smallest valid content. Inline comments
explain the purpose of each section.

## Canonical section order

| # | Section | Purpose |
|---|---------|---------|
| 1 | `types` | Name the result type — keeps the signature readable |
| 2 | `intent` | Human-readable governance statement (required for `secure` flows) |
| 3 | `request` | Accepted input type, params, and required context fields |
| 4 | `response` | Output type, exposed fields, and denied fields |
| 5 | `context` | Execution context fields the body must read |
| 6 | `model` | Domain model types this flow reads or writes |
| 7 | `effects` | Canonical list of declared side effects |
| 8 | `timeouts` | Hard deadline and per-effect timeouts |
| 9 | `retries` | Retry policy per effect |
| 10 | `limits` | Request size, rate limits, result limits |
| 11 | `privacy` | Sensitivity class (PII/PHI), retention, redaction rules |
| 12 | `errors` | Error taxonomy — returns, map, expose, redact, audit |
| 13 | `rules` | Pre-condition and invariant rules |
| 14 | `observability` | Trace, latency, log hygiene |
| 15 | `events` | Domain events emitted by this flow |
| 16 | `audit` | Audit reporting requirements |

## Minimal population strategy

Each section contains the one or two lines most likely to be needed.
Add, remove, or expand sections based on the actual requirements of the flow.

Sections you almost always need:
- `types`, `intent`, `effects`, `events`, `audit`

Sections to add when the flow handles sensitive data:
- `privacy`, `rules`, `observability`

Sections to add for production hardening:
- `timeouts`, `retries`, `limits`, `errors`

## Relationship to 468-full-contract-model

Example 468 shows the same 16 sections on a healthcare flow with a rich body.
This example (226) keeps the body minimal so the contract structure is the focus.

**AI rule:** Always follow the canonical 16-section order. Sections may be omitted but must not be reordered.
