# LogicN — Borrow, Move and Pinned Memory Semantics

## Overview

Heterogeneous compute introduces multiple memory domains:

```text
CPU memory          GPU VRAM
shared memory       edge device memory
distributed memory  WASM linear memory
```

Data movement between these domains is expensive and error-prone. LogicN requires
explicit ownership and memory-transfer semantics to make GPU planning safe, enable
zero-copy execution, and support deterministic scheduling.

Without borrow/move/pinned semantics, the memory model exists only as design documentation.
The parser and compiler must enforce it.

---

## Three Ownership Primitives

### Borrow

Temporary access without ownership transfer:

```logicn
borrow tensor -> gpu_kernel()
borrow mut tensor -> transform()
```

Properties:
```text
no ownership transfer
read-only or scoped mutable access
avoids unnecessary copies
compiler-enforced lifetime safety
```

### Move

Explicit ownership transfer — source becomes invalid:

```logicn
move tensor -> gpu_memory
```

Properties:
```text
source is no longer accessible after move
enables deterministic resource ownership
avoids double-frees
improves runtime planning
```

### Pinned Memory

Memory regions locked for high-performance DMA transfer:

```logicn
pinned Tensor<Float16, [1024, 1024]>
pinned buffer<Float16>(1024)
```

Properties:
```text
optimized DMA transfer
reduced transfer latency
zero-copy interoperability
accelerator-friendly allocation
```

---

## Ownership States

Every value has an explicit ownership state tracked by the compiler:

| State | Description |
|---|---|
| `owned` | Normal owned value on its own lifetime |
| `borrowed` | Temporary access; original owner retains ownership |
| `borrowed mut` | Exclusive mutable access for a scope |
| `moved` | Ownership transferred; source invalid |
| `pinned` | Locked in memory for device transfer |
| `shared` | Explicitly shared runtime-managed value |

---

## Zero-Copy Execution

```logicn
borrow pinned tensor -> inference_engine
```

Zero-copy allows compute targets to operate directly on shared/pinned memory:

```text
no allocation copy
accelerator reads from pinned CPU memory
or both operate on shared device memory
```

---

## Compiler Enforcement

### Track Ownership Through Control Flow

```logicn
move tensor -> gpu

tensor.read()     // COMPILE ERROR: tensor was moved
```

```text
ERROR: LLN-OWN-001: moved value used after move
  `tensor` moved here: move tensor -> gpu
  `tensor` used again here: tensor.read()
```

### Prevent Borrow/Move Conflicts

```logicn
let ref = borrow tensor
move tensor -> gpu   // COMPILE ERROR: cannot move while borrowed
```

### Validate Lifetimes

```logicn
let result = {
  borrow tensor -> inference()
  // borrow expires at end of block
}
// tensor is owned again here
```

---

## Placement-Aware Ownership

Ownership interacts with compute placement:

```logicn
move tensor -> placement gpu   // owned by GPU
```

Transfer policies:

```logicn
transfer async tensor -> gpu
transfer zero_copy tensor -> inference_engine
```

---

## Required AST Additions

```text
BorrowExpression
MutableBorrow
MoveExpression
PinnedAllocation
OwnershipTransfer
BorrowScope
SharedAllocation
```

---

## Compiler Analysis Passes

```text
lifetime analysis        — determine live ranges for each owned value
ownership propagation    — track ownership state through all control paths
move validation          — ensure moved values are not used afterward
borrow checking          — ensure borrows do not outlive owners
pinned memory planning   — identify pinnable allocations
transfer optimization    — minimize copies; batch transfers; colocate compute
```

---

## Multi-Target Ownership

| Target | Requirement |
|---|---|
| GPU | Pinned buffers, transfer scheduling, ownership tracking |
| WASM | Explicit linear memory safety, transfer-aware compilation |
| Edge devices | Constrained memory planning, deterministic allocation |
| Distributed | Explicit ownership boundaries, transfer-safe serialization |

---

## Future Extensions

```logicn
// Shared memory regions
shared tensor

// Placement-aware move
move tensor -> placement gpu

// Async transfer
transfer async tensor -> gpu_memory

// Remote borrow across nodes
remote borrow tensor from node "worker-2"
```

---

## Diagnostics

| Code | Meaning |
|---|---|
| `LLN-OWN-001` | Moved value used after move |
| `LLN-OWN-002` | Cannot move while value is borrowed |
| `LLN-OWN-003` | Borrow outlives owner |
| `LLN-OWN-004` | Pinned memory must be released before deallocation |
| `LLN-OWN-005` | Shared value requires explicit synchronization |
| `LLN-OWN-006` | Transfer to target requires ownership (borrow insufficient) |

---

## Architecture Placement

| Layer | Responsibility |
|---|---|
| `logicn-core` | Ownership primitives: `borrow`, `move`, `pinned`; ownership state model |
| `logicn-core-compiler` | Lifetime analysis, borrow checking, move validation, transfer optimization |
| `logicn-core-runtime` | Pinned memory allocator, transfer scheduling, DMA integration |
| `logicn-core-compute` | Target-aware placement hints, zero-copy path planning |
| `logicn-target-gpu` | GPU-specific pinned memory and transfer ABI |
| `logicn-core-reports` | Ownership/transfer report: moves, borrows, pinned regions |
