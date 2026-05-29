# 359 — Embedding with fallback

**Concept:** embedding flow with NPU/GPU preference and CPU fallback

Embedding models benefit significantly from hardware acceleration. This flow prefers NPU then GPU, but falls back to CPU so it can run in any environment — including local development machines without accelerators.

**AI rule:** Declare `compute fallback cpu` on all embedding flows to allow CPU-only deployment.
