# LogicN Compute

`logicn-core-compute` is the package for LogicN compute planning concepts.

It belongs in:

```text
/packages-logicn/logicn-core-compute
```

Use this package for:

```text
compute plans
compute capabilities
compute budgets
compute effects
target selection
offload planning
fallback planning
AI accelerator selection
specialist AI hardware target planning
low-bit AI fallback planning
optical I/O data-movement planning
topology-aware placement planning
compute reports
```

## Boundary

`logicn-core-compute` should describe how work can be planned across targets. It should
not own target-specific binary output, AI model formats, CPU kernels or
photonic mapping.

Quantum compute, if supported later, is target planning rather than normal
application runtime behaviour. Ordinary LogicN routes do not run on quantum
computers. Future quantum compute blocks must use isolated quantum types,
explicit measurement, declared fallback and reports.

`optical_io` is a data-movement and interconnect target, not a compute device
that runs application code by itself. LogicN uses it to estimate transfer cost,
prefer data locality, choose efficient transfer formats and report fallback to
PCIe, Ethernet or standard network paths.

For AI inference, `logicn-core-compute` may express preference and fallback order such
as:

```text
prefer gpu
prefer ai_accelerator
prefer tpu
fallback npu
fallback vpu
fallback low_bit_ai
fallback cpu.generic
```

Specialist target terminology:

```text
cpu            general compute
gpu            parallel graphics/general accelerator compute
npu            neural processing unit
tpu            tensor processing unit / AI ASIC
vpu            vision processing unit
fpga           field-programmable gate array
asic           application-specific integrated circuit
ai_accelerator generic governed AI accelerator
```

Every specialist target must declare hardware type, provider, runtime/driver,
supported precision, supported model formats, memory limits, isolation level,
data sensitivity allowed, fallback target and audit requirements.

For distributed tensor or AI workloads, `logicn-core-compute` may express interconnect
preference:

```text
prefer gpu
prefer optical_io for large tensor transfer
fallback ethernet
fallback cpu.generic
```

The actual AI model contracts belong in `logicn-ai`, low-bit AI backend support
belongs in `logicn-ai-lowbit`, CPU capability planning belongs in `logicn-target-cpu`,
and optimized CPU kernel contracts belong in `logicn-cpu-kernels`.

## Contracts

The package includes typed contracts for compute capabilities, budgets, target
selection, compute-auto fallback reports, offload stages, data movement totals
and aggregate compute reports.

## Compute Architecture Layers

```text
LogicN source
    ↓ compiler
    ↓ execution graph
    ↓ compute planner
    ↓ runtime scheduler
    ↓ backend adapter layer
    ↓ CPU / GPU / accelerator / optical transport
```

The compute layer is hardware-neutral. Application code declares intent
(`target gpu`, `effect accelerator`); the runtime resolves actual backend.

## Compute Effects

| Effect | Meaning |
| --- | --- |
| `accelerator` | GPU or AI accelerator execution |
| `optical_io` | optical transport planning |
| `distributed_compute` | distributed execution |
| `high_memory` | elevated memory pressure |
| `parallel_compute` | high parallel execution |

## Compute Capabilities

| Capability | Meaning |
| --- | --- |
| `ComputeRuntime` | runtime compute coordination |
| `GpuRuntime` | GPU execution access |
| `AcceleratorRuntime` | AI accelerator access |
| `OpticalTransport` | optical data movement |
| `DistributedScheduler` | distributed execution planning |

## GPU and Photonic Status

GPU and photonic support are planning-only for v0.1. The CPU runtime is the
primary stable target. GPU planning metadata and fallback design are specified;
real kernel execution and optical transport are deferred.

Fallback rules: GPU unavailable / overheating / policy denied / memory exhausted
→ all fall back to CPU and record an audit event.

Diagnostic codes: `LN-COMPUTE-001` through `LN-COMPUTE-007`.

TypeScript types: `GpuPlan` interface, `OpticalPlan` interface.

Internal dirs: `gpu/` (gpu-planner.ts, gpu-runtime.ts, gpu-fallback.ts,
gpu-reports.ts, gpu-estimator.ts), `photonic/` (photonic-planner.ts,
optical-routing.ts, distributed-graph.ts, optical-runtime.ts, photonic-audit.ts).

## WASM Target

WASM target is not yet implemented. When implemented it will allow LogicN
execution in sandboxed environments (browsers, edge runtimes).

WASM governance constraints: capability rules, effect declarations, deployment
policy, runtime manifests, and audit generation remain enforced.

Sandbox restrictions (forbidden effects): `filesystem`, `process`, unsafe memory.

TypeScript type: `WasmTarget { sandboxed: boolean; allowedEffects: string[] }`.

Diagnostic codes: `LN-WASM-001` through `LN-WASM-004`.

Internal dir: `wasm/` (wasm-emitter.ts, wasm-runtime.ts, wasm-bindings.ts,
wasm-sandbox.ts).

## Target Compatibility Reports

Target compatibility reports explain whether workloads are compatible with
available runtime targets. Accessed via `logicn plan --compatibility`.

Output explains CPU/GPU/WASM/optical compatibility and incompatibility reasons.

TypeScript types: `CompatibilityResult { target: string; compatible: boolean; reason?: string }`.

Functions: `validateTarget()`, `buildCompatibilityReport()`.

Diagnostic codes: `LN-COMPAT-001` through `LN-COMPAT-004`.

Internal dir: `compatibility/` (target-compatibility.ts, compatibility-report.ts,
compatibility-rules.ts, target-validator.ts).

See `docs/Knowledge-Bases/logicn-core-compute-gpu-and-photonic-backends.md`
for the full architecture specification.

Final rule:

```text
logicn-core-compute plans work.
logicn-ai describes AI inference.
logicn-ai-lowbit describes low-bit AI backend inference.
logicn-target-ai-accelerator describes passive accelerator backend profiles.
logicn-target-native emits future native executable target plans.
logicn-target-photonic emits photonic target plans and optical I/O reports.
future quantum target support must remain explicit, measured and reportable.
```
