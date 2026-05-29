# 314 — Compute NPU AI inference

**Concept:** full AI text classification flow with NPU targeting and governance

This example shows the complete pattern for on-device AI classification: an `intent` clause declares the governance contract, `compute target best` selects the hardware, `deny [remote.execution]` enforces local execution, and the effect `ai.inference` is declared. The two-step pipeline (embed then classify) uses the `?` propagation operator to surface errors cleanly.

**AI rule:** Combine `compute target best` with `deny [remote.execution]` to enforce on-device AI inference.
