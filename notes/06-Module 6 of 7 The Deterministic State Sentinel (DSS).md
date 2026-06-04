# LogicN Architecture Blueprint

## Module 6 of 7: The Deterministic State Sentinel (DSS)

---

### 1. Metadata and Classification

* **Layer:** Runtime Execution Engine / Supervisor Layer
* **System Responsibility:** Functions as the out-of-process, lightweight WebAssembly host supervisor. It manages the execution of `policy {}` tracks, coordinates memory handoffs between Deterministic Workflow Isolates (DWIs), tracks the Dynamic Posture Matrix (DPM), and enforces real-time capability checks.
* **Target Components:** `logicn-core-runtime` (core engine wrapper, Wasmtime integration layer), `logicn-target-wasm`.

---

### 2. What It Is

The **Deterministic State Sentinel (DSS)** is the concrete runtime supervisor engine of LogicN. While the Deterministic Runtime Containment Model (DRCM) provides the security philosophy and the Deterministic Workflow Isolate (DWI) defines the memory layout, the **DSS is the active orchestrator**.

Operating outside the application's guest WebAssembly linear memory space, the DSS acts as an un-spoofable host kernel. It maintains system posture variables in dedicated, read-only hardware registers (or Wasm global variables) and evaluates the threat triggers defined within `policy.emergency` modules.

---

### 3. What It Does

* **Orchestrates Step Transitions:** Manages the handoff when an application exits a guest context and hits a `step` boundary, serializing the immutable data payloads and setting up the target sandboxes.
* **Enforces Single-Cycle Capability Checkpoints:** Manages the WebAssembly global variables that act as permission bitmasks, enabling low-level host wrappers to grant or block system actions in a single clock cycle.
* **Aggregates and Routes System Signals:** Traps runtime faults, performance anomalies, and local invariant drops, feeding them to the `emergency` policy state machine.
* **Secures the Audit Trail:** Injects un-spoofable calling metadata (`trace_id`, `workload_identity`, and the signed `.lmanifest` hash) directly into the host-level audit stream, ensuring that applications cannot alter their own compliance tracking records.

---

### 4. What It Does NOT Do

* **It does NOT execute application-level business code:** The DSS is strictly a supervisor. It never parses business metrics, evaluates application equations, or directly manipulates business flow structures.
* **It does NOT compile code:** It does not translate source language text into executable files. It consumes the pre-verified `.lmanifest` and `.wasm` bytecode packages built by `logicn-core-compiler`.
* **It is NOT an OS-level hypervisor:** It runs inside user space as an execution runtime. It relies on standard host operating system environments but creates a specialized, micro-segmented capability structure *within* the application space.

---

### 5. Core Concept and Mathematical Grounding

The DSS implements a **Reference Monitor** pattern that satisfies the properties of complete mediation, tamperproofness, and verifiability.

Let a system call or sensitive effect invocation be modeled as a request $R = \langle \text{Subject}, \text{Effect}, \text{Target} \rangle$. The DSS maintains the Dynamic Posture Matrix register $V_{DPM} \in \{0, 1\}^{32}$. The validation function $V$ executed by the host wrapper is defined as:

$$V(R, V_{DPM}) = 
\begin{cases} 
\text{Allow} & \text{if } (V_{DPM} \ \text{bitand} \ \text{Mask}(\text{Effect})) \neq 0 \\ 
\text{Trap} & \text{otherwise} 
\end{cases}$$

Because $V_{DPM}$ resides outside the guest WebAssembly instance's address space, guest code is physically incapable of writing to, modifying, or reading the register directly. The security check is completely separated from the execution workspace.

---

### 6. Architectural Flowchart

```
  +-------------------------------------------------------------------------+
  |                        Host OS Processes Space                          |
  |                                                                         |
  |   +-----------------------------------------------------------------+   |
  |   |           Deterministic State Sentinel (DSS Supervisor)        |   |
  |   |   - Tracks global V_DPM Bitmask                                 |   |
  |   |   - Un-spoofable Audit Logger Engine                            |   |
  |   +-----------------------------------------------------------------+   |
  |          |                                            ^                 |
  |    [Spawns Worker Instance]                     [Dispatches Signal]     |
  |          v                                            |                 |
  |   +---------------------------------+   +---------------------------+   |
  |   | Guest Isolate Sandbox A (DWI)   |   | Guest Isolate Sandbox B   |   |
  |   | App Flow Memory Heap            |   | App Flow Memory Heap      |   |
  |   | (Pointers completely isolated)  |   | (Pointers isolated)       |   |
  |   +---------------------------------+   +---------------------------+   |
  |                                                                         |
  +-------------------------------------------------------------------------+

```

---

### 7. How to Add the DSS to LogicN: Implementation Blueprint

To deploy the DSS host supervisor as the core orchestrator of your runtime plane, implement this engine layout inside your codebase:

#### Step 1: Implement the Host-to-Guest Linkage Matrix (`runtime.lln`)

Create the supervisor tracking structures that maintain active session states, trace mappings, and the Dynamic Posture Matrix registers.

```rust
;; Location: logicn-core-runtime/src/runtime.dss.lln

type DynamicPostureMatrix = mut {
  network_egress:  U8,  ;; Bit 0
  storage_write:   U8,  ;; Bit 1
  ledger_mutate:   U8,  ;; Bit 2
  quarantine_mode: U8   ;; Bit 3
}

type SessionContext = {
  session_id: String,
  trace_id: String,
  manifest_digest: String,
  posture: DynamicPostureMatrix
}

global active_session_registry: Map<String, SessionContext> = Map.new();

```

#### Step 2: Inject the Host-Mediated Audit Interceptor (`runtime.lln`)

Ensure that the guest worker sandbox is structurally incapable of writing directly to the logging channels. All audit actions must pass through the DSS host gate to append un-spoofable context metadata.

```rust
;; Location: logicn-core-runtime/src/runtime.audit.lln

flow dssEmitHostAuditRecord(guestInstanceId: String, rawMessage: String) -> Void {
  ;; Extract the un-spoofable calling context from the supervisor registry
  let context = active_session_registry.get(guestInstanceId);
  
  let structuralRecord = {
    timestamp: time::now_utc(),
    session_id: context.session_id,
    trace_id: context.trace_id,
    manifest_hash: context.manifest_digest,
    active_dpm: Int.toHex(context.posture.network_egress),
    payload: rawMessage
  };
  
  ;; Commit straight to the secure, out-of-band append-only ledger
  host::writeToAppendOnlyDiskLedger(json::serialize(structuralRecord));
}

```

#### Step 3: Wire the Wasmtime Linkage Engine (`logicn-target-wasm`)

Configure the low-level WebAssembly linker to expose the DSS capability bits to host functions, wrapping all system actions (like network socket interaction) in single-cycle validation checks.

```rust
// Location: logicn-target-wasm/src/linker.rs
// Using Rust syntax here as this file interfaces directly with the raw Wasmtime JIT compiler engine

import library Wasmtime;

pub fn configure_dss_linker(engine: &Engine) -> Linker<SessionContext> {
  let mut linker = Linker::new(engine);
  
  // Bind the host-managed network egress check to the guest WASI layer
  linker.func_wrap("wasi_snapshot_preview1", "sock_connect", |caller: Caller<'_, SessionContext>, fd: i32, addr: i32| {
    let context = caller.data();
    
    // Check Bit 0 of the host-managed posture matrix
    if context.posture.network_egress == 0 {
      // Monotonic restriction triggered. Intercept execution and halt the guest sandbox instantly.
      return Err(Trap::new("LLN-INV-003: Authority Enclosure Violation. Egress blocked by DSS."));
    }
    
    // Proceed with native host socket execution if permission bit evaluates to 1
    native_host_socket_connect(fd, addr)
  }).unwrap();
  
  return linker;
}

```

---

### 8. Verification and Operational Metrics

To confirm that the DSS supervisor layer is fully mediating system behavior, run these verification scenarios:

1. **Host-Mediated Audit Integrity Check:** Inside a test guest flow, write a routine that attempts to call `dssEmitHostAuditRecord` with a spoofed `session_id` parameter string. Execute the flow. Inspect the resulting audit trail block. Verify that the DSS completely ignored the guest-supplied value and applied the authentic session context from the supervisor registry.
2. **Zero Privilege Escape Assertion:** Run a benchmark suite where a guest WebAssembly module deliberately forces an internal buffer overflow or stack exhaustion attack. The DSS host supervisor must trap the instance panic, isolate the memory footprint, update the local DPM to full restriction (`0x0`), and continue coordinating parallel execution processes without experiencing any master runtime degradation or system crashes.

---

*This concludes Module 6 of 7. Please request **Module 7: Epilogue Receipt** when you are ready to proceed.*