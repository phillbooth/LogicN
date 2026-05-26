# LogicN Photonic

`logicn-core-photonic` is the package for photonic concepts, types, models and APIs.

## Coverage Reconciliation Status

`docs/COVERAGE.md` currently records unresolved photonic documentation conflicts.
This package remains the owner for photonic runtime target semantics, photonic
execution plan semantics and eventual `LLN-PHOTONIC-*` diagnostic meanings, but
the following are not implementation-ready yet:

- one canonical `OpticalTransportMode` enum
- one canonical `LLN-PHOTONIC-001` through `LLN-PHOTONIC-006` diagnostic table
- final boundary between `logicn-core-photonic`, `logicn-core-vector`,
  `logicn-core-compute` and `logicn-target-photonic`

Until those are reconciled, older three-value transport examples, v0.2 enum
examples and governance-layer enum examples are documentation candidates, not
stable public contracts.

It belongs in:

```text
/packages-logicn/logicn-core-photonic
```

Think of it as:

```text
logicn-core-photonic teaches LogicN what photonic computing means.
```

Use this package for:

```text
Wavelength
Phase
Amplitude
OpticalSignal
OpticalChannel
PhotonicMode
PhotonicPlan
Mach-Zehnder models
wavelength-division multiplexing models
optical matrix multiplication models
photonic simulation
logic-to-light mapping
```

`logicn-core-photonic` is about what the developer can express.

It answers:

```text
What is a wavelength?
What is a phase?
What is an optical signal?
How do we model photonic compute?
How do we describe photonic matrix operations?
How do we simulate photonic behaviour?
```

## Governance-First Architecture

`logicn-core-photonic` is the governance-first runtime coordination architecture
for future optical compute systems. It is not a vendor-specific hardware wrapper.

Photonic execution must never bypass:

```text
runtime policy
deployment validation
capability enforcement
effect declarations
audit generation
```

### Optical Transport Effect

Optical coordination requires explicit effects:

```logicn
fn distribute_training_batch(batch: TensorBatch)
    effect optical_io, distributed_compute
{
    runtime.distribute(batch)
}
```

### Core Governance Types

```ts
export type OpticalTransportMode = "photonic" | "electrical" | "hybrid"

export interface PhotonicRuntimeTarget {
  name: string
  distributed: boolean
  transportMode: OpticalTransportMode
  fallbackTarget: string
}

export interface PhotonicExecutionPlan {
  module: string
  distributed: boolean
  recommendedTransport: string
  fallbackTarget: string
  reasoning: string[]
}
```

Functions: `estimateOpticalSuitability()`, `buildPhotonicPlan()`, `resolveFallback()`.

### Diagnostic Codes (LLN-PHOTONIC series)

| Code | Meaning |
| --- | --- |
| `LLN-PHOTONIC-001` | optical runtime unavailable |
| `LLN-PHOTONIC-002` | optical transport denied by policy |
| `LLN-PHOTONIC-003` | distributed optical scheduler unavailable |
| `LLN-PHOTONIC-004` | photonic fallback occurred |
| `LLN-PHOTONIC-005` | unsupported optical target |
| `LLN-PHOTONIC-006` | invalid distributed transport graph |

Internal structure: `photonic-runtime.ts`, `photonic-planner.ts`,
`photonic-routing.ts`, `photonic-fallback.ts`, `photonic-audit.ts`,
`photonic-targets.ts`.

Planned sub-packages: `logicn-target-photonic-runtime`,
`logicn-target-photonic-routing`, `logicn-target-photonic-audit`.

See `docs/Knowledge-Bases/logicn-core-photonic-backend-architecture.md` for the
prior governance specification.

See `docs/Knowledge-Bases/logicn-core-photonic-v02.md` for the v0.2 formal spec.

## v0.2 Architecture Depth

The v0.2 formal specification (`logicn-core-photonic-v02.md`) introduces a
complete governance architecture for optical runtime control. The types below
supersede the prior KB types above.

### OpticalTransportMode Enum (v0.2)

```ts
enum OpticalTransportMode {
    Waveguide,
    Coherent,
    Mesh,
    FreeSpace,
    Hybrid,
    Experimental
}
```

Note: The prior KB used `"photonic" | "electrical" | "hybrid"` (3-value string
union). The v0.2 formal spec defines this 6-value enum.

| Mode | Description |
| ------------ | ------------------------------- |
| Waveguide | Structured optical wave routing |
| Coherent | Coherent optical transport |
| Mesh | Distributed optical mesh |
| FreeSpace | Open optical propagation |
| Hybrid | Mixed electronic/optical |
| Experimental | Unsafe or research mode |

### PhotonicRuntimeTarget (v0.2)

```ts
interface PhotonicRuntimeTarget {
    id: string;
    transport: OpticalTransportMode;
    realtime: boolean;
    deterministic: boolean;
    supportsIsolation: boolean;
    maxPropagationDepth: number;
}
```

Note: The prior KB had `name`, `distributed`, `transportMode`, `fallbackTarget`.
The v0.2 formal spec uses `id`, `transport`, `realtime`, `deterministic`,
`supportsIsolation`, `maxPropagationDepth`.

### PhotonicExecutionPlan (v0.2)

```ts
interface PhotonicExecutionPlan {
    target: PhotonicRuntimeTarget;
    topology: string;
    propagationDepth: number;
    estimatedLatencyNs: number;
    isolated: boolean;
    warnings: string[];
}
```

Note: The prior KB had `module`, `distributed`, `recommendedTransport`,
`fallbackTarget`, `reasoning[]`. The v0.2 formal spec uses the interface above.

### buildPhotonicPlan() (v0.2)

```ts
function buildPhotonicPlan(
    target: PhotonicRuntimeTarget
): PhotonicExecutionPlan {
    return {
        target,
        topology: "OpticalMesh",
        propagationDepth: 12,
        estimatedLatencyNs: 8,
        isolated: true,
        warnings: []
    };
}
```

### Validation Functions

```ts
// Prevents cross-runtime optical leakage.
function validateIsolation(target: PhotonicRuntimeTarget): boolean {
    return target.supportsIsolation;
}

// Prevents unstable execution and non-deterministic signal routing.
function validatePropagation(
    depth: number,
    target: PhotonicRuntimeTarget
): boolean {
    return depth <= target.maxPropagationDepth;
}

// Hybrid runtimes require determinism.
function validateHybridMode(target: PhotonicRuntimeTarget): boolean {
    return (
        target.transport === OpticalTransportMode.Hybrid &&
        target.deterministic
    );
}

// Real-time constraint: must be under 100ns.
function validateRealtime(plan: PhotonicExecutionPlan): boolean {
    return plan.estimatedLatencyNs < 100;
}
```

### PhotonicCapability Enum (v0.2)

```ts
enum PhotonicCapability {
    OpticalExecution,
    HybridExecution,
    ExperimentalRouting,
    RealtimeScheduling
}
```

`ExperimentalRouting` is blocked by default. Requires explicit override.

### Optical Topologies (v0.2)

| Topology | Purpose |
| ------------ | ----------------------- |
| OpticalMesh | Distributed propagation |
| WaveguideBus | Structured routing |
| CoherentRing | Low-latency execution |
| HybridBridge | CPU/GPU bridging |

### Diagnostic Codes (v0.2)

| Code | Meaning |
| --------------- | ---------------------------------- |
| `LLN-PHOTONIC-001` | Isolation guarantee missing |
| `LLN-PHOTONIC-002` | Propagation depth exceeded |
| `LLN-PHOTONIC-003` | Experimental runtime prohibited |
| `LLN-PHOTONIC-004` | Invalid optical topology |
| `LLN-PHOTONIC-005` | Non-deterministic runtime detected |
| `LLN-PHOTONIC-006` | Unsafe hybrid transition |

Note: These meanings differ from the prior KB. See `logicn-core-photonic-v02.md`
for full details on the v0.2 code meanings vs prior KB codes.

### File Layout (v0.2)

```text
logicn-core-photonic/

  runtime/
    PhotonicRuntime.ts
    transport.ts            (OpticalTransportMode enum)
    isolation.ts            (validateIsolation)

  planning/
    PhotonicExecutionPlan.ts
    topology.ts             (topologies list)
    scheduling.ts           (validateRealtime)

  governance/
    validation.ts           (validatePropagation, validateHybridMode)
    capabilities.ts         (PhotonicCapability enum, validateCapability)
    policies.ts

  diagnostics/
    PhotonicDiagnostic.ts
    codes.ts                (LLN-PHOTONIC-001–006)

  targets/
    runtimeTargets.ts       (PhotonicRuntimeTarget)
    OpticalTransportMode.ts
```

### Determinism Rule

Given identical workloads, runtime targets, optical topology, and transport
modes — the runtime must produce:
- identical execution plans
- identical propagation routes
- identical runtime schedules
- identical diagnostics

## Boundary

`logicn-core-photonic` must not own `Tri`, `LogicN` or Omni logic semantics. Those
belong in `logicn-core-logic`.

`logicn-core-photonic` must not own compiler backend output, hardware mapping files,
target reports or fallback decisions. Those belong in `logicn-target-photonic`.

Photonic may map logic states to light properties:

```text
Tri.Negative / -1 -> phase 180deg
Tri.Neutral  /  0 -> amplitude 0
Tri.Positive / +1 -> phase 0deg

Decision.Deny   -> phase 180deg
Decision.Review -> amplitude 0
Decision.Allow  -> phase 0deg
```

This is a representation mapping, not ownership of `Tri`. The truth semantics
for `-1`, `0` and `+1` stay in `logicn-core-logic`.

Example signal:

```LogicN
import photonic

let signal: OpticalSignal = photonic.signal {
  wavelength 1550 nm
  phase 90 deg
  amplitude 0.75
}
```

Example model:

```LogicN
photonic model MatrixMultiply {
  channels {
    wavelength 1550 nm
    wavelength 1551 nm
    wavelength 1552 nm
  }
}
```

Used together with the target package:

```LogicN
import vector
import photonic

photonic vector flow multiplyFast(input: Matrix<Float32>) -> Matrix<Float32> {
  compute target photonic fallback cpu {
    return photonic.matmul(input)
  }
}
```

In that example, `logicn-core-photonic` provides `photonic.matmul()` and the modelling
types. `logicn-target-photonic` checks whether the flow can target photonic
execution and generates the target plan/report.

## Related Packages

| Package | Responsibility |
| --- | --- |
| `logicn-core-photonic` | Photonic types, models, APIs and simulations |
| `logicn-target-photonic` | Compiler backend, output target and hardware or simulator mapping |
| `logicn-core-vector` | Vector, matrix, tensor types and operations |
| `logicn-core-compute` | `compute auto`, target selection and fallback planning |
| `logicn-target-native` | Future native executable output |
| `logicn-ai-neural` | Neural model, layer, inference and training boundaries |
| `logicn-target-ai-accelerator` | NPU, TPU and AI-chip target planning |

Final rule:

```text
logicn-core-logic handles the logic model.
logicn-core-photonic handles what photonic means.
logicn-target-photonic handles how LogicN outputs to photonic systems.
```
