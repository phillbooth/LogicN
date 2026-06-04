# LogicN Architecture Blueprint

## Module 4 of 7: Monotonic State Regression

---

### 1. Metadata and Classification

* **Layer:** Mathematical Rule / State Transition Layer
* **System Responsibility:** Enforces the absolute one-way security ratchet across execution tracks. It mathematically guarantees that capabilities and resource boundaries can only narrow or stay equal, but never expand, during a session's lifecycle.
* **Target Components:** `logicn-core-compiler` (monotonic compliance passes), `logicn-core-runtime` (state mutation validators).

---

### 2. What It Is

**Monotonic State Regression** (also formalized as *Monotonic Capability Revocation*) is the core mathematical constraint governing all runtime state transitions within LogicN. Derived from the security principles of CHERI (Capability Hardware Enhanced RISC Instructions) and Biba-style integrity models, it mandates that an active execution session cannot elevate its privileges, authority envelope, or memory allocations once instantiated.

If a threat event or a software exception triggers a change in the active security posture, the system can only regress to a more restrictive state.

---

### 3. What It Does

* **Locks Authority Downwards:** Provides a structural guarantee that any security shift inside a thread reduces system access, preventing privilege escalation exploits.
* **Eliminates Time-of-Check to Time-of-Use (TOCTOU) Flaws:** Because capability states can never be re-amplified by code execution, a verified check remains permanently valid for that session's remaining life.
* **Secures Autonomous AI Tool Use:** Allows AI agents to safely suggest policy updates or execute functions. Even if the AI generates a malicious recursive call or attempts a sandbox escape, it is physically constrained by a decreasing privilege boundary.
* **Enforces Clean Failure Paths:** Transitions failing or compromised threads into strict, low-privilege "Quarantine" or "Zeroize" footprints instantly, rather than risking an uncontained process panic.

---

### 4. What It Does NOT Do

* **It does NOT manage static privilege assignment:** It does not configure initial user roles, group structures, or access control lists. It manages the *dynamic decay curve* of permissions after a session starts.
* **It does NOT prevent execution errors:** Monotonic State Regression does not clean up application logic errors or prevent bugs. It contains the security blast radius of those bugs.
* **It does NOT allow dynamic escalation overrides:** There is no "sudo" or runtime override capability within an active session. Privilege widening requires stopping execution, passing back through the out-of-band compiler pipeline, verifying static proofs, and securing manual authorization.

---

### 5. Core Concept and Mathematical Grounding

Monotonic State Regression treats execution authority as a bounded semi-lattice $(A, \sqsubseteq)$, where $A$ is the set of all authorization profiles, and $\sqsubseteq$ is the partial ordering of authority (where $x \sqsubseteq y$ means $x$ has less than or equal authority to $y$).

Let $\sigma_t \in A$ represent the capability profile of an execution session at time $t$. For any state transition event happening between time $t$ and $t+1$, the Monotonicity Rule states:

$$\sigma_{t+1} \sqsubseteq \sigma_t$$

If an entry in the system state matrix attempts a transition where $\sigma_{t+1} \not\sqsubseteq \sigma_t$, the transition is undefined and treated as a fatal execution failure. This ensures that the authority envelope functions as a cryptographic ratchet:

$$\sigma_{initial} \sqsupseteq \sigma_1 \sqsupseteq \sigma_2 \sqsupseteq \dots \sqsupseteq \sigma_{final}$$

---

### 6. Architectural Flowchart

```
                 +-----------------------------------+
                 |      Active Session Running       |
                 |  Capability Profile = Sigma (t)   |
                 +-----------------------------------+
                                   |
                  [System State Transition Triggered]
                                   |
                                   v
                 +-----------------------------------+
                 |    Monotonicity Validator Gate    |
                 |  Evaluate: Is Sigma(t+1) <= Sigma(t)?|
                 +-----------------------------------+
                                   |
                     [Is the Ratchet Maintained?]
                                   |
                    +--------------+--------------+
                    |                             |
                 (Yes)                          (No)
                    |                             |
                    v                             v
     +------------------------------+     +-------------------------------+
     |   Atomic Register Update     |     |      Halt Runtime Core        |
     | Apply New Restrictive State  |     |   Emit Code: LLN-MONO-002     |
     |   Sigma(t+1) Is Now Active   |     |   Prevent State Corruption    |
     +------------------------------+     +-------------------------------+
                    |
                    v
     +------------------------------+
     |   Downstream Instructions    |
     | Bounded by Decreased Matrix  |
     +------------------------------+

```

---

### 7. How to Add Monotonic State Regression to LogicN: Implementation Blueprint

To embed this mathematical ratchet mechanism directly into the core engine architecture, apply this technical specification to your target repository files:

#### Step 1: Define the Security Posture Lattice (`compiler.capabilities.lln`)

Establish the capability bit flags and specify their partial ordering structure within the internal systems orchestration types.

```rust
;; Location: logicn-core-compiler/src/compiler.capabilities.lln

type CapabilityVector = {
  network_bit: U8,   ;; 1 = Full Socket Access, 0 = Blocked
  storage_bit: U8,   ;; 2 = Read-Write, 1 = Append-Only, 0 = Blocked
  ledger_bit: U8     ;; 1 = Mutable, 0 = Immutable Read-Only
}

flow assertMonotonicStep(currentCap: CapabilityVector, nextCap: CapabilityVector) -> Bool {
  ;; Every bit assignment field must evaluate to less than or equal to its precursor
  let netValid = (nextCap.network_bit <= currentCap.network_bit);
  let storeValid = (nextCap.storage_bit <= currentCap.storage_bit);
  let ledgerValid = (nextCap.ledger_bit <= currentCap.ledger_bit);
  
  return (netValid && storeValid && ledgerValid);
}

```

#### Step 2: Inject Monotonic Constraints Into the State Transition Pipeline (`runtime.lln`)

The runtime state engine must run every requested profile transition through the monotonicity validator gate before applying changes to the active global tracking variables.

```rust
;; Location: logicn-core-runtime/src/runtime.lln

flow transitionSessionPosture(requestedState: CapabilityVector) -> Result<Void, PostureFault> {
  let activeState = runtime::getActiveCapabilityVector();
  
  ;; Execute the mathematical comparison check
  let isValidRatchet = assertMonotonicStep(activeState, requestedState);
  
  if (!isValidRatchet) {
    ;; Halt execution immediately. Someone is trying to escalate permissions within an active thread.
    runtime::triggerHardwareTrap(1002); ;; Diagnostic Code: LLN-MONO-002 (IllegalPrivilegeWidening)
    return Err(PostureFault::PrivilegeAmplificationDenied);
  }
  
  ;; Commit the mutation atomically to the active register state
  runtime::setActiveCapabilityVector(requestedState);
  return Ok(Void);
}

```

#### Step 3: Enforce Single-Cycle Bit-Gate Gating (`logicn-target-wasm`)

Emit WebAssembly Text instruction wrappers that intercept capability use sites and validate them directly against the active capability vector.

```wat
;; Location: logicn-target-wasm/src/gates/network_gate.wat

(module
  (import "env" "active_capability_register" (global $active_cap (mut i32)))
  (import "env" "trap_execution" (func $trap (param i32)))
  
  (func $enforceNetworkGate (export "enforceNetworkGate")
    ;; Mask out the network tracking bit field (e.g., bit index 0)
    global.get $active_cap
    i32.const 1
    i32.and
    
    ;; If the result is 0, the capability has been monotonically revoked
    i32.eqz
    if
      i32.const 1002 ;; LLN-MONO-002 Diagnostic Target
      call $trap
    end
  )
)

```

---

### 8. Verification and Operational Metrics

To confirm that the monotonic security ratchet is actively containing execution scopes, evaluate your deployment against these verification scripts:

1. **Static Escalation Blocker:** Create a test run where an active code component calls `transitionSessionPosture` with a bit configuration that attempts to restore a previously dropped network bit from `0` back to `1`. Execute the harness. The engine must immediately fire a hardware-level trap loop (`LLN-MONO-002`) and abort the thread without updating the active environment.
2. **Instruction-Level Performance Verification:** Benchmark the capability bitmask check using `logicn-devtools-benchmarks`. Confirm that executing the bitwise `AND` evaluation at a `step` boundary takes exactly **one CPU instruction cycle**, validating that security enforcement matches native hardware execution speeds without software pipeline delays.

---

*This concludes Module 4 of 7. Please request **Module 5: DWI** when you are ready to proceed.*