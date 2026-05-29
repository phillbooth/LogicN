# 402 — Target GPU

**Concept:** explicit GPU compute target with CPU fallback

`compute target gpu` routes the workload to the GPU. Vision models with large batch dimensions benefit most from GPU parallelism. `fallback cpu` ensures the flow runs on machines without a GPU.

**AI rule:** Use `compute target gpu` for large dense tensor workloads; always add `fallback cpu`.
