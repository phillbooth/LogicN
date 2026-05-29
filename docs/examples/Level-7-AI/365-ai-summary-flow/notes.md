# 365 — AI summary flow

**Concept:** complete AI governance pattern — healthcare risk scoring with PII, audit, and compute governance

This is the canonical Level 7 summary example. It demonstrates every AI governance pattern: `secure flow` with `readonly` input; `unsafe` raw promotion to `protected PatientId`; static tensor shape `[1, 128]`; `compute target best` with NPU/GPU/CPU preference, `fallback cpu`, and `deny [remote.execution]`; declared effects `[ai.inference, audit.write]`; and a redacted audit log entry. Copy this pattern for any flow that runs an AI model against patient or sensitive data.

**AI rule:** The complete AI pattern is: `secure flow` + `protected` input + `compute target` + `deny` + `ai.inference` + `audit.write` + `redact`.
