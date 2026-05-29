# 310 — Compute fallback required

**Concept:** mandatory fallback declaration when targeting npu or gpu

When targeting accelerators such as `npu` or `gpu`, a `fallback` clause is mandatory. Without it, the flow cannot be dispatched on machines that lack those devices. `fallback cpu` is the universal safety net.

**AI rule:** Always declare `fallback cpu` when targeting `npu` or `gpu`.
