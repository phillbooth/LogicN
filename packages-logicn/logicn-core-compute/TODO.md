# LogicN Compute TODO

V1 freeze rule: compute planning must keep active target selection to CPU and
WASM. GPU, AI accelerator, optical I/O, photonic, low-bit AI and other advanced
targets are post-v1 planning unless needed to describe core type-system
semantics.

Quantum compute is future/research target planning. It must not be treated as an
active v1 runtime target.

```text
[x] Create /packages-logicn/logicn-core-compute
[x] Document package boundary
[x] Add package metadata
[x] Add initial typed exports
[x] Define compute capability model
[x] Define compute budget model
[x] Define target selection rules
[ ] Define specialist AI hardware target taxonomy for CPU, GPU, NPU, TPU, VPU, FPGA and ASIC
[ ] Define specialist compute capability, data-sensitivity and audit report fields
[x] Add generic low-bit AI fallback target concept
[x] Define offload planning reports
[ ] Define compute effects model (accelerator, optical_io, distributed_compute, high_memory, parallel_compute)
[ ] Define compute capabilities model (ComputeRuntime, GpuRuntime, AcceleratorRuntime, OpticalTransport, DistributedScheduler)
[ ] Define GPU planning metadata and fallback rules (LN-COMPUTE-001 through LN-COMPUTE-007)
[ ] Define GPU runtime architecture: compute planner → GPU scheduler → buffer manager → kernel adapter → GPU backend
[ ] Define vendor-neutral adapter model (CUDA/ROCm/Metal/Vulkan as runtime plugins, not language syntax)
[ ] Define optical/photonic transport planning (optical_io effect, OpticalTransport capability)
[ ] Define scheduler responsibilities (thermal balancing, queue depth, fairness, fallback)
[ ] Define planner responsibilities (parallelism, memory, energy cost, backend suitability)
[ ] Define compute audit event shapes for planner, scheduler, fallback, and distributed execution
[ ] Define GpuPlan interface (module/recommendedTarget/fallbackTarget/parallelism/memoryPressure)
[ ] Implement estimateGpuSuitability(graph: ExecutionGraph): boolean
[ ] Implement buildGpuPlan(graph: ExecutionGraph): GpuPlan
[ ] Create gpu/ dir: gpu-planner.ts, gpu-runtime.ts, gpu-fallback.ts, gpu-reports.ts, gpu-estimator.ts
[ ] Define OpticalPlan interface (module/distributed/recommendedTransport/reasoning)
[ ] Implement estimateOpticalNeed(graph: ExecutionGraph): boolean
[ ] Implement buildOpticalPlan(graph: ExecutionGraph): OpticalPlan
[ ] Create photonic/ dir: photonic-planner.ts, optical-routing.ts, distributed-graph.ts, optical-runtime.ts, photonic-audit.ts
[ ] Define WasmTarget interface (sandboxed/allowedEffects)
[ ] Implement validateWasmEffect(effect: string): boolean — reject process, filesystem, unsafe memory
[ ] Create wasm/ dir: wasm-emitter.ts, wasm-runtime.ts, wasm-bindings.ts, wasm-sandbox.ts
[ ] Define LN-WASM-001 through LN-WASM-004 diagnostic codes
[ ] Define CompatibilityResult interface (target/compatible/reason?)
[ ] Implement validateTarget(target: string, effects: string[]): CompatibilityResult
[ ] Implement buildCompatibilityReport(targets: string[], effects: string[]): CompatibilityResult[]
[ ] Create compatibility/ dir: target-compatibility.ts, compatibility-report.ts, compatibility-rules.ts, target-validator.ts
[ ] Define LN-COMPAT-001 through LN-COMPAT-004 diagnostic codes
[ ] Define future quantum target planning rules after core compute reports stabilise
[x] Add examples
[x] Add tests
```
