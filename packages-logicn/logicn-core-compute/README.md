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
