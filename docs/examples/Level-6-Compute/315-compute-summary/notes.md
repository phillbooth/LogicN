# 315 — Compute summary

**Concept:** complete governed AI inference flow with audit, hardware targeting, and deny clause

This example is the canonical Level 6 summary. It combines every compute-level concept: a `secure flow` with `readonly` input, `protected` types via `FraudFeatures`, typed tensor shapes, `compute target best` with a full `prefer` / `fallback` / `deny` block, `ai.inference` and `audit.write` effects, redacted audit logging, and `Result` propagation with `?`.

**AI rule:** The summary pattern combines `secure flow`, protected types, `compute target`, `deny`, audit, and `Result` propagation.
