# 401 — Target CPU

**Concept:** explicit CPU compute target

`compute target cpu` pins the workload to the CPU. This is appropriate for small models, latency-sensitive inference on tiny inputs, or compliance environments where GPU execution is not certified.

**AI rule:** Use `compute target cpu` for workloads that are latency-sensitive on small inputs or that require deterministic single-threaded execution.
