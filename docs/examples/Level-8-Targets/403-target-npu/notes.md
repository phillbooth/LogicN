# 403 — Target NPU

**Concept:** explicit NPU compute target with GPU fallback

NPUs (Neural Processing Units) are optimised for low-power inference. Falling back to `gpu` rather than `cpu` preserves performance on devices that have a GPU but not an NPU.

**AI rule:** Use `compute target npu` for on-device edge inference; fall back to `gpu` before `cpu` for performance.
