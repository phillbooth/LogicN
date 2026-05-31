# LogicN — NVIDIA N1X / Arm64-NVIDIA Target

## Status

```
Provisional — target profile planned
Depends on: logicn-target-arm64-nvidia package
Note: N1X specs are pre-release / provisional as of 2026-05
```

## TL;DR
- N1X (Arm64 + Blackwell-class GPU) is supported through a target profile, NOT special source syntax
- LogicN source uses `compute target best { prefer [npu, gpu, cpu] }` unchanged
- The backend bridge handles N1X-specific lowering
- Key rule: N1X makes LogicN faster — it must not make LogicN less governed

---

## How LogicN Supports N1X

LogicN source stays portable. The N1X-specific optimisations live in the target bridge:

```logicn
// Source is unchanged — no N1X-specific syntax
secure flow classifyMessage(readonly request: Request) -> ClassifyMessageResult

contract {
  types {
    type ClassifyMessageResult = Result<Response, ApiError>
  }

  intent { "Classify inbound messages locally without remote execution." }

  effects {
    ai.inference
    audit.write
  }
}
{
  compute target best {
    prefer [npu, gpu, cpu]
    fallback cpu
    deny [remote.execution]
  }

  runtime adaptive {
    learn from intent
    optimise [batching, model_warmup, memory_layout, target_selection]
    preserve [security, effects, governance]
  }
  ...
}
```

The target profile `logicn-target-arm64-nvidia` maps:
- `gpu` → CUDA/TensorRT on Blackwell GPU
- `npu` → NVIDIA NPU if available
- `cpu` → Arm64 native (no x86 emulation)

---

## What N1X Enables

| Area | LogicN benefit |
|---|---|
| **Arm64 CPU** | Native `logicn-runtime-arm64` — no x86 emulation overhead |
| **Blackwell-class GPU** | AI inference, tensor ops, vector compute via CUDA |
| **Unified memory design** | Less copy overhead for `Tensor<T,Shape>` and `Array<T>` |
| **Windows-on-Arm** | Native Node.js/WASM runtime needed |
| **AI workloads** | `effects [ai.inference]` → GPU/NPU preference |
| **Adaptive runtime** | Learns whether CPU, GPU, or accelerator is best per flow |

---

## Proof Chain Example

```yaml
execution:
  requested: best
  candidates: [npu, gpu, cpu]
  selected: gpu
  reason: ai.inference workload matched NVIDIA Blackwell target capability
  remote_execution: false
  fallback_used: false
  target_profile: logicn-target-arm64-nvidia
  governance_changes: none
```

---

## Key Rule

```text
N1X can make LogicN faster.
It must not make LogicN less governed.
```

N1X is an optimisation target, not a language feature. Source governance
(protected values, effects, intent, audit) is enforced ABOVE the target selection layer.

---

## Compiler/Runtime Work Required

1. Build native Arm64 Node.js/WASM runtime
2. Add NVIDIA capability manifest to `logicn-target-arm64-nvidia`
3. Lower `Tensor<Float32, [B, N]>` ops to CUDA/TensorRT when Blackwell GPU available
4. CPU fallback when GPU/NPU unavailable
5. Emit audit proof showing selected target

---

## See Also

- `docs/Knowledge-Bases/logicn-compute-target-optimisation.md`
- `docs/Knowledge-Bases/logicn-tensor-arity-decision.md`
- `docs/Knowledge-Bases/logicn-quantum-target-bridge.md`
- `docs/Knowledge-Bases/logicn-adaptive-runtime-profiles.md`
