# 369 — AI classification flow (full pattern)

**Concept:** Full AI classify flow with compute targeting, protected input, and redacted audit

This example assembles the complete on-device classification pattern:

## Contract sections used

| Section | Purpose |
|---------|---------|
| `types` | Named result type `ClassifyInputResult` |
| `intent` | Human-readable governance purpose |
| `request` | Accepts `ClassifyRequest`; marks text as `unsafe String` |
| `response` | Exposes `label`, `confidence`; denies `rawInput`, `modelWeights` |
| `model` | Declares `uses ClassifierModel` |
| `effects` | `ai.inference`, `audit.write` |
| `privacy` | Denies protected values in logs; requires redaction before audit.write |
| `rules` | Requires `trace_id` before `audit.write` |
| `observability` | Trace flow, latency measurement, deny protected values in logs |
| `events` | `ClassificationStarted`, `ClassificationCompleted` |
| `audit` | Runtime report + signed attestation |

## Body pipeline

1. `compute target best { prefer [npu, gpu, cpu] deny [remote.execution] }` — hardware governance
2. Validate unsafe input before classification
3. `emit ClassificationStarted` — domain event before expensive work
4. Classify and score via `ClassifierModel`
5. Audit with `redact(safeText)` — never log raw model input
6. `emit ClassificationCompleted`
7. Return only the allowed fields

## Key invariants

- `deny [remote.execution]` ensures the model runs on-device
- `redact(safeText)` in the audit log satisfies `privacy.require redaction before audit.write`
- `response.denies { rawInput modelWeights }` prevents model internals from leaking

**AI rule:** Always redact protected inputs before writing them to the audit log.
