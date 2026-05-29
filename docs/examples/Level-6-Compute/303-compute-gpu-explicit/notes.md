# 303 — Compute GPU explicit

**Concept:** explicit GPU targeting with CPU fallback

When a flow is known to be GPU-optimal (e.g., large convolution or dense tensor operations), `compute target gpu` pins execution to the GPU. The `fallback cpu` clause allows deployment on CPU-only machines during development and testing.

**AI rule:** Explicitly target `gpu` when the workload is known to saturate the GPU; always add `fallback cpu` for portability.
