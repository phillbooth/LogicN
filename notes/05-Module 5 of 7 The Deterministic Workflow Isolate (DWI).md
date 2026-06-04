# LogicN Architecture Blueprint

## Module 5 of 7: The Deterministic Workflow Isolate (DWI)

---

### 1. Metadata and Classification

* **Layer:** Software Pattern / Memory Architecture Layer
* **System Responsibility:** Establishes the physical layout of memory and data passing across execution tracks. It enforces the rigid boundary of "mutable within a flow, immutable between flows," ensuring that application execution remains deterministic and entirely crash-resilient.
* **Target Components:** `logicn-core-runtime` (isolate manager, memory allocator), `logicn-core-compiler` (`gir-emitter.lln`).

---

### 2. What It Is

The **Deterministic Workflow Isolate (DWI)** is the structural architecture pattern that governs how LogicN structures memory allocation and state composition during execution chaining. Traditional runtimes allow functions to share mutable references, pointer addresses, or global heap memories, which introduces race conditions, invalidates replay data, and allows memory leaks to spread horizontally.

DWI solves this by enforcing a binary division of execution code surfaces: **Local Flows** and **Managed Steps**. All execution occurs inside a shared-nothing memory sandbox where pointers cannot cross the boundary of a runtime-managed `step`.

---

### 3. What It Does

* **Enforces Localized Mutation Boundaries:** Confines mutable variables strictly to a single, ephemeral WebAssembly memory instance context.
* **Provides Zero-Copy Serialization Gates:** Passes inter-flow data payloads across step boundaries as immutable pointer offsets in read-only memory blocks, satisfying durable execution requirements without serialization lag.
* **Eliminates Shared-State Resource Leaks:** Completely discards the internal scratchpad memory of an isolate the second it encounters a local failure, preventing memory corruption or leaks from destabilizing parallel tasks.
* **Guarantees Identical Execution Replay:** Ensures that because inter-flow snapshots are immutable and uniquely keyed, any subsequent replay of the execution log yields identical outputs, making debugging predictable.

---

### 4. What It Does NOT Do

* **It does NOT replace distributed network scheduling:** DWI structures memory layouts on a single runtime node. It does not handle cross-cluster networks or remote cluster load balancing (which is handled later in Stage C).
* **It does NOT dictate business logic flow charts:** It does not force a specific directed acyclic graph (DAG) or visual pipeline layout on the developer. Code is authored imperatively using the `step` keyword.
* **It does NOT store the data permanently on disk:** DWI manages the memory layout and pointer mechanics of active isolates. The permanent logging of these states belongs to the append-only journal controlled by the **Deterministic State Sentinel (DSS)**.

---

### 5. Core Concept and Mathematical Grounding

The DWI formalizes the law of **Isolation Contiguity**. Let an active program execution be composed of individual isolate heaps $H_1, H_2, \dots, H_n$.

The memory model enforces two mathematical rules:

1. **Intra-Flow Mutation:** Inside isolate $H_i$, memory addresses can mutate procedurally:

$$\Delta H_i \subseteq H_i$$


2. **Inter-Flow Immutability:** For any data projection $x$ moving from isolate $H_i$ to $H_j$ via a `step` boundary, the transfer function $f$ must ensure that $x$ becomes read-only ($\text{RO}$) within the target workspace:

$$f: H_i \to H_j \implies x \in H_j \land \text{Access}(x) = \text{RO}$$



No pointer address in $H_j$ can modify the backing memory cells of $H_i$. This ensures that if $H_j$ fails, $H_i$ remains pure and uncorrupted, allowing the system to safely drop, rollback, or resume execution tracks.

---

### 6. Architectural Flowchart

```
   [ Isolate Sandbox A (Flow Space) ]     [ Isolate Sandbox B (Flow Space) ]
  +----------------------------------+   +----------------------------------+
  | Mutable Stack & Local Heap       |   | Isolated Memory Heap             |
  | let parsed = parse(input)        |   | Reads Snapshot as Read-Only      |
  | (Fast, local mutation allowed)   |   |                                  |
  +----------------------------------+   +----------------------------------+
                   |                                       ^
        [Hits 'step' Boundary]                             |
                   |                             [Zero-Copy Pointer Passed]
                   v                                       |
  +-------------------------------------------------------------------------+
  |                       Runtime Supervisor Intercept                      |
  |  1. Serializes input shape to fixed offset                             |
  |  2. Records entry {chain_id, step_id} to append-only log                |
  |  3. Sets target memory segment attributes to Read-Only                  |
  +-------------------------------------------------------------------------+

```

---

### 7. How to Add DWI to LogicN: Implementation Blueprint

To establish this shared-nothing isolate memory layout within your self-hosted Stage B compiler and runtime engines, integrate this structural pattern:

#### Step 1: Implement the `step` Syntax Parsing Loop (`parser.lln`)

Modify your language parsing compiler to distinguish between standard procedural function calls and runtime-managed step fences.

Add this parsing branch to `logicn-core-compiler/src/parser.lln`:

```rust
;; Location: logicn-core-compiler/src/parser.lln

type Expr =
  | LocalCall(name: String, args: List<String>)
  | ManagedStep(name: String, args: List<String>, idempotency_key: String)

flow parseExpressionBody(tokens: TokenStream, activeFlowId: String, stepCounter: mut U32) -> Expr {
  match tokens.peek() {
    Token::Keyword("step") => {
      tokens.next(); ;; Consume the 'step' keyword
      let targetName = parseIdentifier(tokens);
      let arguments = parseArgumentList(tokens);
      
      ;; Generate a deterministic idempotency key for this step boundary
      stepCounter = stepCounter + 1;
      let key = String.concat([activeFlowId, "::step_", Int.toStr(stepCounter)]);
      
      return Expr.ManagedStep(targetName, arguments, key);
    }
    _ => {
      return parseStandardLocalCall(tokens);
    }
  }
}

```

#### Step 2: Configure Isolate Instantiation and Shared Host Memory (`runtime.lln`)

The runtime execution plane must assign each step execution its own sandboxed WebAssembly memory instance allocation, preventing hidden pointer sharing.

```rust
;; Location: logicn-core-runtime/src/runtime.lln

type WasmIsolateHandle = {
  instance_id: U64,
  memory_offset: U32,
  memory_size: U32
}

flow instantiateDeterministicIsolate(stepExpr: Expr, inputSnapshot: List<U8>) -> Result<WasmIsolateHandle, AllocationError> {
  ;; 1. Request a completely fresh, zeroed-out WebAssembly memory block (Shared-Nothing Isolate)
  let isolate = runtime::allocateNewWasmInstance(64.Pages); ;; 4MB clean buffer
  
  ;; 2. Write the inbound immutable snapshot payload into the start of the isolate memory region
  runtime::copyToInstanceMemory(isolate.instance_id, isolate.memory_offset, inputSnapshot);
  
  ;; 3. Flip memory segment protection bits for the input area to Read-Only inside the guest sandbox
  runtime::protectMemorySegment(isolate.instance_id, isolate.memory_offset, inputSnapshot.length(), MemoryProtection::ReadOnly);
  
  return Ok(isolate);
}

```

#### Step 3: Wire Step Traps and Execution Resumption (`runtime.lln`)

When an isolate encounters an execution failure or contract breach, the engine must discard the sandbox memory completely, protecting neighboring tasks.

```rust
;; Location: logicn-core-runtime/src/runtime.lln

flow handleIsolateExecutionTermination(isolate: WasmIsolateHandle, runStatus: ExitCode) -> Void {
  match runStatus {
    ExitCode::Success => {
      ;; Cleanly extract output state, seal it via an Epilogue Receipt, and release memory
      runtime::commitIsolateState(isolate.instance_id);
      runtime::deallocateWasmInstance(isolate.instance_id);
    }
    ExitCode::Failure(diagnosticCode) => {
      ;; A failure occurred (e.g., LLN-INV-001). Free memory cells immediately.
      log::error("DWI-ISOLATE-FAULT: Execution breached. Discarding active memory sandbox.");
      runtime::zeroizeInstanceMemoryRange(isolate.instance_id, isolate.memory_offset, isolate.memory_size);
      runtime::deallocateWasmInstance(isolate.instance_id);
      
      ;; Instruct the orchestration layer to queue a retry from the last valid checkpoint
      runtime::triggerStepRollbackRecovery(isolate.instance_id);
    }
  }
}

```

---

### 8. Verification and Operational Metrics

To confirm that the DWI architecture pattern is successfully managing memory boundaries, execute these verification test cases:

1. **Pointer Leakage Prevention:** Write a custom integration test where a local flow attempts to pass a mutable reference variable straight across a `step` boundary parameter. Run the compiler pass. The parser must intercept this operation during compilation and raise an explicit compile-time error (`LLN-VALUESTATE-003`).
2. **Fault Contamination Resilience:** Spawn a test loop that instantiates 50 concurrent WebAssembly components executing parallel transaction tracks. Deliberately trigger an unhandled failure state inside worker isolate index #12. Check the platform telemetry. Isolate #12 must be wiped and discarded within **less than 15 microseconds**, while the remaining 49 isolated sandboxes continue running with zero downtime or memory fluctuations.

---

*This concludes Module 5 of 7. Please request **Module 6: DSS** when you are ready to proceed.*