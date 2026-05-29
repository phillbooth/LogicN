# 405 — Target photonic

**Concept:** photonic (optical) compute target with GPU fallback

Photonic hardware uses light rather than electrons, enabling extremely high-throughput matrix operations. Because photonic accelerators are not yet ubiquitous, `fallback gpu` provides a high-performance classical alternative.

**AI rule:** Use `compute target photonic` for extremely high-throughput linear algebra; always include a classical fallback.
