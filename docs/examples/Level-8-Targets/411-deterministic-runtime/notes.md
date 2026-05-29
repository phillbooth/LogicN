# 411 — Deterministic runtime

**Concept:** deterministic runtime for regulated environments requiring identical execution planning

`runtime deterministic` disables all adaptive and speculative optimisations, ensuring that the execution plan is identical across runs. This is required in regulated environments (e.g., medical device software, financial audit) where reproducibility must be provable.

**AI rule:** Use `runtime deterministic` for compliance environments requiring identical execution planning.
