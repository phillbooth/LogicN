# 465 — Enterprise summary

**Concept:** complete enterprise-grade healthcare flow — patient create with PII, NHS number, AI risk scoring, audit, and governance proof

This is the canonical Level 9 summary and the most complete example in the CEC. It demonstrates every enterprise governance layer in a single flow:

- `secure flow` with `readonly` request input
- `protected` PII types: `NhsNumber`, `PatientName`, `DateOfBirth`, `PatientId`
- Multiple effects: `pii.write`, `phi.read`, `ai.inference`, `database.write`, `audit.write`
- `intent` and `policy` blocks with purpose and retention
- `compute target best` with NPU/GPU/CPU preference, `fallback cpu`, `deny [remote.execution]`
- Static tensor shape `[1, 128]` for AI features
- All PII redacted in the audit entry
- `Result` propagation with `?` throughout

Copy this pattern for any enterprise healthcare onboarding or clinical decision-support flow.

**AI rule:** The enterprise summary combines every governance layer: `secure flow`, `protected` PII, AI inference, `compute target`, `policy`, `audit`, and `redact`.
