# LogicN Compute: GPU and Photonic Backends

## Definition

The LogicN compute layer manages how workloads are planned and dispatched
across CPU, GPU, AI accelerators, and future photonic/optical systems. It is
governance-first: application code describes *intent*, the runtime decides
*how execution occurs*.

## Status

```text
CPU runtime: primary, stable
GPU and photonic support: planning only (v0.1)
AI accelerator targeting: planning only (v0.1)
```

---

## Core Principles

The compute layer must be:

```text
backend-neutral          — no vendor syntax in application code
runtime-controlled       — runtime owns scheduling and backend selection
policy-governed          — deployment policy may deny or restrict targets
portable                 — CPU fallback always available
explainable              — every decision is auditable
fallback-safe            — graceful degradation on every path
future-compatible        — photonic/optical support designed in from start
```

The compute layer must avoid:

```text
vendor lock-in (CUDA, ROCm, DirectML, Metal, Vulkan hardcoded in source)
unsafe memory access
hidden runtime switching
magic acceleration
unsafe DMA assumptions
hardcoded GPU syntax
backend-specific source semantics
```

LogicN source code must remain stable even if runtime backends change.

---

## Core Execution Philosophy

```text
intent → governed execution plan → coordinated compute → audit proof
```

The compute layer exists to:
- understand workload characteristics
- estimate backend suitability
- coordinate execution safely
- enforce policy constraints
- provide deterministic fallback behaviour
- produce audit-grade execution metadata

---

## Long-Term Target

```text
CPU + GPU + AI accelerator + optical interconnect
```

Managed under:

```text
one governed runtime
one execution planner
one audit system
one capability/effect model
```

---

## Architecture Layers

```text
LogicN source
    ↓
compiler
    ↓
execution graph
    ↓
compute planner
    ↓
runtime scheduler
    ↓
backend adapter layer
    ↓
CPU / GPU / accelerator / optical transport
```

---

## Compute Intent vs Hardware Control

Bad approach — hardcodes vendor dependency:

```logicn
target nvidia_cuda
```

Recommended — runtime resolves actual backend:

```logicn
target gpu
```

---

## Package Structure

Suggested packages:

```text
logicn-core-compute               — planning contracts and intent
logicn-core-compute-cpu           — CPU backend
logicn-core-compute-gpu           — GPU scheduling
logicn-core-compute-accelerator   — AI accelerator targets
logicn-core-compute-optical       — optical/photonic transport
logicn-core-compute-scheduler     — execution queue and balancing
logicn-core-compute-runtime       — runtime coordination
```

Vendor adapters (as runtime plugins, not language syntax):

```text
logicn-core-compute-gpu-cuda
logicn-core-compute-gpu-rocm
logicn-core-compute-gpu-metal
logicn-core-compute-gpu-vulkan
```

---

## Compute Effects

| Effect | Meaning |
| --- | --- |
| `accelerator` | uses GPU or AI accelerator execution |
| `optical_io` | uses optical transport planning |
| `distributed_compute` | distributed execution across nodes |
| `high_memory` | elevated memory pressure |
| `parallel_compute` | high parallel execution |

---

## Compute Capabilities

| Capability | Meaning |
| --- | --- |
| `ComputeRuntime` | runtime compute coordination |
| `GpuRuntime` | GPU execution access |
| `AcceleratorRuntime` | AI accelerator access |
| `OpticalTransport` | optical data movement |
| `DistributedScheduler` | distributed execution planning |

---

## Example: Compute-Aware Function

```logicn
fn run_inference(batch: TensorBatch)
    -> InferenceResult
    effect accelerator
{
    runtime.compute(batch)
}
```

Meaning: workload may benefit from accelerator execution; runtime decides
actual backend.

---

## Part A: CPU Runtime

### CPU as Baseline

The CPU runtime is primary, stable, portable, safe, and fully governed.

All workloads must be able to execute on CPU unless explicitly impossible.

CPU execution provides:

```text
predictable execution
high compatibility
safe fallback for all other targets
lower runtime complexity
simpler debugging
```

GPU and optical systems enhance execution — they do not replace governance.

### Example CPU Plan

```json
{
  "module": "app/users/service",
  "recommendedTarget": "cpu",
  "reason": [
    "storage-bound workload",
    "minimal parallel gain"
  ]
}
```

---

## Part B: GPU Runtime

### GPU Purpose

GPU execution is useful for:

```text
parallel tensor operations
matrix multiplication
AI inference
AI training
high throughput workloads
parallel simulation
```

Not every workload benefits from GPU execution.

### GPU Runtime Responsibilities

The GPU runtime layer handles (runtime-owned, not application-managed):

```text
kernel scheduling
buffer allocation
copy planning
memory pressure
execution coordination
fallback handling
runtime isolation
```

### Example GPU Candidate

```logicn
fn classify_batch(batch: TensorBatch)
    -> ClassificationResult
    effect accelerator, parallel_compute
{
    return runtime.classify(batch)
}
```

Planner reasoning:

```text
parallel workload
high tensor throughput
accelerator-friendly
```

### Example GPU Plan

```json
{
  "module": "app/ai/classifier",
  "recommendedTarget": "gpu",
  "fallbackTarget": "cpu",
  "parallelism": "high",
  "memoryPressure": "high"
}
```

### GPU Fallback Rules

The runtime must always support safe fallback:

```text
GPU unavailable         → fallback to CPU
GPU overheating         → fallback to CPU
GPU policy denied       → fallback to CPU
GPU memory exhausted    → fallback to CPU
```

All fallbacks must appear in audit logs.

### GPU Fallback Audit Event

```json
{
  "traceId": "trace-500",
  "plannedTarget": "gpu",
  "actualTarget": "cpu",
  "reason": "gpu memory exhausted"
}
```

### GPU Policy Rules

Deployment policy may deny GPU usage:

```json
{
  "allowTargets": ["cpu"],
  "denyEffects": ["accelerator"]
}
```

Deployment denial:

```text
Deployment denied.
Reason: accelerator effect denied by deployment policy
```

### GPU Runtime Architecture

```text
LogicN runtime
    ↓
compute planner
    ↓
GPU scheduler
    ↓
buffer manager
    ↓
kernel adapter
    ↓
GPU backend
```

### Vendor-Neutral Design

LogicN must not hardcode CUDA, ROCm, DirectML, Metal, or Vulkan in source.
Backend adapters map LogicN runtime operations onto available systems.
Adapters are runtime plugins, not language syntax.

### GPU Internal Structure

```text
packages-logicn/logicn-core-compute/src/gpu/
```

Suggested files:

```text
gpu-planner.ts
gpu-runtime.ts
gpu-fallback.ts
gpu-reports.ts
gpu-estimator.ts
```

### GPU Plan Types

```ts
export interface GpuPlan {
    module: string
    recommendedTarget: string
    fallbackTarget: string
    parallelism: string
    memoryPressure: string
}
```

### GPU Estimator Function

```ts
function estimateGpuSuitability(
    graph: ExecutionGraph
): boolean {
    return graph.parallelism === "high"
}
```

### GPU Planner Function

```ts
function buildGpuPlan(
    graph: ExecutionGraph
): GpuPlan {
    return {
        module: graph.module,
        recommendedTarget: "gpu",
        fallbackTarget: "cpu",
        parallelism: "high",
        memoryPressure: "high"
    }
}
```

---

## Part C: AI Accelerators

Future accelerator targets:

```text
TPUs
NPUs
AI inference chips
edge AI processors
FPGA AI systems
```

LogicN treats these as runtime targets, not separate language modes.

### Example Accelerator Plan

```json
{
  "module": "app/ai/inference",
  "recommendedTarget": "accelerator",
  "fallbackTarget": "gpu",
  "reason": [
    "tensor inference",
    "accelerator-compatible workload"
  ]
}
```

---

## Part D: Photonic and Optical

### Philosophy

LogicN treats photonics primarily as:

```text
optical interconnect
high-speed transport
distributed memory movement
accelerator coordination
```

Not as a magical replacement for boolean logic. The runtime still requires
deterministic governance and binary-safe enforcement.

### Why Optical Matters

Optical systems may help:

```text
high bandwidth transport
low latency distributed coordination
accelerator pooling
memory disaggregation
cluster-scale AI coordination
```

### Optical Transport Example

```logicn
fn distribute_training_batch(batch: TensorBatch)
    effect optical_io, distributed_compute
{
    runtime.distribute(batch)
}
```

Meaning: runtime may coordinate distributed accelerator execution and may
use optical transport — application code does not manage routing directly.

### Example Optical Execution Plan

```json
{
  "module": "app/ai/training",
  "recommendedTransport": "optical_io",
  "distributed": true,
  "reason": [
    "large tensor movement",
    "high bandwidth requirement"
  ]
}
```

### Optical Governance

Optical execution must still obey:

```text
runtime policy
capability rules
effect declarations
audit logging
execution proof
```

### Photonic Internal Structure

```text
packages-logicn/logicn-core-compute/src/photonic/
```

Suggested files:

```text
photonic-planner.ts
optical-routing.ts
distributed-graph.ts
optical-runtime.ts
photonic-audit.ts
```

### Optical Plan Types

```ts
export interface OpticalPlan {
    module: string
    distributed: boolean
    recommendedTransport: string
    reasoning: string[]
}
```

### Optical Estimator Function

```ts
function estimateOpticalNeed(
    graph: ExecutionGraph
): boolean {
    return graph.transferPressure === "high"
}
```

### Optical Planner Function

```ts
function buildOpticalPlan(
    graph: ExecutionGraph
): OpticalPlan {
    return {
        module: graph.module,
        distributed: true,
        recommendedTransport: "optical_io",
        reasoning: [
            "high bandwidth requirement"
        ]
    }
}
```

---

## Part E: Scheduler and Planner

### Scheduler Responsibilities

```text
execution queues
parallel task coordination
backend assignment
fallback handling
thermal balancing
resource pressure management
runtime fairness
```

### Scheduler Inputs

```text
planner recommendations
runtime policy
available hardware
thermal pressure
memory pressure
queue depth
capability permissions
```

### Scheduler Example

```text
Planner recommends GPU.
Runtime detects GPU overheating.
Scheduler falls back to CPU.
Audit event recorded.
```

### Scheduler Audit Event

```json
{
  "category": "scheduler",
  "event": "target_reassigned",
  "traceId": "trace-800",
  "plannedTarget": "gpu",
  "actualTarget": "cpu",
  "reason": "thermal pressure"
}
```

### Planner Responsibilities

The planner estimates, the runtime decides:

```text
parallelism estimate
memory usage estimate
transfer pressure
backend suitability
energy cost
fallback options
```

---

## Part F: Compute Graphs

### Parallel Execution Graph

```text
input
  ↓
preprocess
  ↓
parallel tensor stage
  ├── gpu kernel 1
  ├── gpu kernel 2
  └── gpu kernel 3
  ↓
merge
  ↓
output
```

### Distributed Graph

```text
node-1 preprocess
      ↓
optical transport
      ↓
node-2 gpu execution
      ↓
optical transport
      ↓
node-3 aggregation
```

---

## Part G: Governance Rules

The compute layer must not:

```text
bypass runtime policy
silently escalate authority
access unsafe memory
execute unapproved kernels
ignore effect declarations
ignore capability rules
```

### Example Policy

```json
{
  "allowTargets": ["cpu", "gpu"],
  "denyTargets": ["distributed-gpu"],
  "denyEffects": ["optical_io"]
}
```

---

## Part H: Audit Integration

### Compute Audit Event

```json
{
  "traceId": "trace-900",
  "plannedTarget": "gpu",
  "actualTarget": "gpu",
  "effects": ["accelerator"],
  "durationMs": 24,
  "memoryUsageMb": 1024
}
```

### Execution Proof Fields

```json
{
  "executionTarget": "gpu",
  "fallback": false,
  "distributed": false,
  "transport": null
}
```

### Distributed Audit Event

```json
{
  "traceId": "trace-901",
  "distributed": true,
  "transport": "optical_io",
  "nodes": ["node-1", "node-2"]
}
```

---

## Part I: Compiler and CLI Integration

### Compiler Hints

Compiler emits compute hints in the module report:

```json
{
  "module": "app/ai/inference",
  "parallelism": "high",
  "recommendedTargets": ["gpu", "accelerator"]
}
```

### CLI Integration

```bash
logicn plan app/ai/inference
```

Output:

```text
Recommended target: gpu
Fallback target: cpu
Estimated memory pressure: high
```

```bash
logicn explain app/ai/inference
```

Output:

```text
Reasoning:
- tensor-heavy workload
- high parallelism
- accelerator-compatible execution
```

---

## Part J: WASM Target

### Purpose

A WASM target allows LogicN execution inside sandboxed environments:

```text
browsers
sandboxed runtimes
edge runtimes
portable execution environments
embedded systems
```

### Status

```text
Not implemented.
Conceptual architecture only.
```

### WASM Design Goals

The WASM target must remain:

```text
portable
sandboxed
governance-aware
deterministic
runtime-compatible
```

### WASM Governance Constraints

WASM execution must still obey:

```text
capability rules
effect declarations
deployment policy
runtime manifests
audit generation
```

### WASM Sandbox Restrictions

Restricted effects in WASM contexts:

```text
filesystem      — restricted in sandbox
process         — forbidden in sandbox
unsafe memory   — forbidden in sandbox
kernel ops      — unavailable in sandbox
```

### Example Build Command

```bash
logicn build --target wasm
```

### Example WASM Manifest

```json
{
  "target": "wasm",
  "sandboxed": true,
  "effects": ["network"],
  "capabilities": ["HttpClient"]
}
```

### WASM Build Flow

```text
AST
    ↓
effect checker
    ↓
boundary checker
    ↓
runtime graph
    ↓
WASM emitter
    ↓
sandbox manifest
```

### WASM Internal Structure

```text
packages-logicn/logicn-core-compute/src/wasm/
```

Suggested files:

```text
wasm-emitter.ts
wasm-runtime.ts
wasm-bindings.ts
wasm-sandbox.ts
```

### WASM Types

```ts
export interface WasmTarget {
    sandboxed: boolean
    allowedEffects: string[]
}
```

### WASM Validator Function

```ts
function validateWasmEffect(
    effect: string
): boolean {
    return effect !== "process"
}
```

### Diagnostic Codes (LN-WASM series)

| Code | Meaning |
| --- | --- |
| `LN-WASM-001` | unsupported effect for WASM |
| `LN-WASM-002` | WASM sandbox violation |
| `LN-WASM-003` | native capability unavailable |
| `LN-WASM-004` | unsupported runtime target |

---

## Part K: Target Compatibility Reports

### Purpose

The compatibility report explains whether workloads are compatible with
available runtime targets.

### What Compatibility Validates

```text
CPU compatibility
GPU compatibility
WASM compatibility
distributed execution support
optical transport support
runtime fallback support
```

### Example Command

```bash
logicn plan app/ai/inference --compatibility
```

### Compatibility Output (human)

```text
Compatibility Report

CPU:
    compatible

GPU:
    compatible

WASM:
    incompatible
    reason: accelerator effect unsupported

Optical:
    unavailable
```

### Compatibility Output (JSON)

```json
{
  "targets": {
    "cpu": {
      "compatible": true
    },
    "gpu": {
      "compatible": true
    },
    "wasm": {
      "compatible": false,
      "reason": "accelerator unsupported"
    }
  }
}
```

### Compatibility Rules

```text
accelerator effect
    → incompatible with WASM

optical_io effect
    → requires distributed runtime

process effect
    → restricted in sandbox runtimes
```

### Compatibility Internal Structure

```text
packages-logicn/logicn-core-compute/src/compatibility/
```

Suggested files:

```text
target-compatibility.ts
compatibility-report.ts
compatibility-rules.ts
target-validator.ts
```

### Compatibility Types

```ts
export interface CompatibilityResult {
    target: string
    compatible: boolean
    reason?: string
}
```

### Compatibility Validator Function

```ts
function validateTarget(
    target: string,
    effects: string[]
): CompatibilityResult {
    if (
        target === "wasm" &&
        effects.includes("accelerator")
    ) {
        return {
            target,
            compatible: false,
            reason: "accelerator unsupported"
        }
    }

    return {
        target,
        compatible: true
    }
}
```

### Compatibility Report Builder

```ts
function buildCompatibilityReport(
    targets: string[],
    effects: string[]
): CompatibilityResult[] {
    return targets.map(
        target => validateTarget(target, effects)
    )
}
```

### Diagnostic Codes (LN-COMPAT series)

| Code | Meaning |
| --- | --- |
| `LN-COMPAT-001` | runtime target incompatible |
| `LN-COMPAT-002` | unsupported effect on target |
| `LN-COMPAT-003` | required runtime unavailable |
| `LN-COMPAT-004` | distributed transport unavailable |

---

## Diagnostic Codes (LN-COMPUTE series)

| Code | Meaning |
| --- | --- |
| `LN-COMPUTE-001` | requested compute target unavailable |
| `LN-COMPUTE-002` | accelerator effect denied by policy |
| `LN-COMPUTE-003` | optical transport unavailable |
| `LN-COMPUTE-004` | distributed scheduler unavailable |
| `LN-COMPUTE-005` | runtime fallback occurred |
| `LN-COMPUTE-006` | GPU memory pressure exceeded |
| `LN-COMPUTE-007` | backend adapter failure |

---

## Test Cases

### CPU tests

```text
CPU execution succeeds
CPU fallback succeeds
runtime policy respected
```

### GPU tests

```text
GPU planner recommendation generated
GPU fallback works
GPU denial respected
memory pressure handled
```

### Optical tests

```text
optical planning generated
policy denial enforced
runtime audit events recorded
```

---

## Implementation Order

### Phase 1

```text
CPU compatibility reports
basic GPU planning metadata
```

### Phase 2

```text
target compatibility reports
runtime fallback reports
```

### Phase 3

```text
WASM target planning
sandbox validation
```

### Phase 4

```text
future optical planning
distributed runtime coordination
```

---

## v0.1 Scope

Implement first:

```text
CPU runtime
compute planner
basic GPU planning metadata
runtime target selection
fallback system
runtime audit integration
partial compatibility reports
```

Defer:

```text
real GPU kernel engine
real optical runtime
cluster orchestration
photonic execution engine
advanced distributed balancing
WASM runtime
distributed optical scheduling
```

---

## Relationship to Other Systems

```text
logicn-core-compute      → compute planning contracts
logicn-target-gpu        → vendor-specific GPU adapter
logicn-target-photonic   → photonic transport planning
logicn-core-runtime      → runtime execution and scheduling
logicn-core-reports      → audit and compute report shapes
logicn-core-cli          → logicn plan, logicn explain
```

See also: `ai-compute-plan.md`, `specialist-ai-hardware-compute-targets.md`,
`hybrid-electronic-optical-compute.md`, `native-photonic-compute-future.md`,
`package-completion-status.md`.
