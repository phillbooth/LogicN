# 355 — AI governance denied remote

**Concept:** AI inference with remote execution denied for patient data governance

Patient data must not leave the local device. `deny [remote.execution]` enforces this at the compute-placement level, while `intent` documents the governance rationale. The `ai.inference` effect is still declared so the compiler can track the side effect.

**AI rule:** Pair `ai.inference` with `deny [remote.execution]` for any flow that handles patient data.
