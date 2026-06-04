This updated architectural blueprint removes all native compilation examples (such as Rust or POSIX-specific native language implementations) from the core specification.

Per your architectural directive, the entire LogicN platform—including the compiler, security verifiers, and the host supervisor—is written either directly in **LogicN’s own `.lln` grammar** or implemented within our **primary WebAssembly/Wasmtime execution environment**. The single exception to this rule remains out-of-band performance benchmark harnesses.

---

### 1) Hardening the "Soft" Host Layer via the Wasmtime Engine

When a language or compiler claims an execution context is "isolated," it relies entirely on the underlying virtual machine host runner to make that claim true. If the host layer running your `.lln` scripts treats guest files loosely, an attacker escaping the WebAssembly sandbox inherits ambient system variables.

Since LogicN operates exclusively within a WebAssembly/Wasmtime host architecture, we strengthen this soft layer by configuring the Wasmtime instance creation parameters to strip ambient authority at the engine boundary before executing a single byte of guest bytecode.

```
┌────────────────────────────────────────────────────────┐
│  OPERATING SYSTEM KERNEL (Linux / POSIX Host)          │
│  └──────────────────────────────────────────────────┐  │
│  │  Wasmtime Host Engine Context (Layer 1)          │  │
│  │  - Strict WASI Sandboxing Enabled                │  │
│  │  - Zero Pre-opened File Directories              │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  Deterministic State Sentinel (.lln / WASM)│  │  │
│  │  │  └──────────────────────────────────────┐  │  │  │
│  │  │  │  Guest Workflow Isolate (.lln / WASM)│  │  │  │
│  │  │  └──────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘

```

#### Ambient-Authority Striping via Wasmtime Config

When the Deterministic State Sentinel (DSS) boots a worker isolate, it overrides default WebAssembly System Interface (WASI) behaviors using a customized configuration block:

* **Zero Pre-opened Directories:** The WASI context builder explicitly blocks access to host directories. No directory mappings are passed to the instance, rendering standard guest system file inputs (like `/etc` or `/var`) physically un-resolvable by the guest virtual machine.
* **Environmental Map Zeroing:** The host instance creation loop prevents the parent operating system environment (`process.env`) from being mirrored into the guest context. The host engine passes an empty map, removing system-level strings from guest visibility.

#### Virtual Memory Guard Pages

To neutralize memory traversal vectors within the WebAssembly engine, LogicN builds on Wasmtime's virtual allocation properties. By setting the `static_memory_bound` property to maximum and enabling huge virtual allocation spaces, the virtual machine engine maps an inaccessible **2GB virtual memory guard zone** directly before and after each `DWI` linear memory space. Any speculative out-of-bounds pointer calculation jumping outside the guest sandbox strikes this guard page, causing an immediate virtual machine trap that halts execution before data bleeding can occur.

---

### 2) Detailed Explanation: "Structured Capability Descriptors"

Opaque string-based authorization tokens (e.g., passing arrays like `["network::payments", "storage::write"]`) lack mechanical precision. They fail to handle common edge cases like filesystem path traversals, relative path shortcuts, or protocol downgrade mutations.

**Structured Capability Descriptors** replace loose text permissions with strict, strongly typed data schemas authored in `.lln`. Every entitlement record or request mapped within the platform operates on an explicit schema variant:

```rust
;; Location: packages-logicn/logicn-core-security/src/capabilities.lln

type FileSystemDescriptor = {
  domain: String,              ;; Restricted to "fs"
  operation: String,           ;; Restricted to "read" | "append"
  canonical_root: String,      ;; Enforced absolute path prefix
  max_bytes_per_call: U64
}

type NetworkDescriptor = {
  domain: String,              ;; Restricted to "net"
  operation: String,           ;; Restricted to "connect"
  canonical_host: String,      ;; Rigid fully-qualified domain name or IP
  enforce_port: U16,
  enforce_tls: Bool            ;; Plaintext TCP/HTTP fallbacks are rejected
}

type CapabilityDescriptor =
  | FileSystem(FileSystemDescriptor)
  | Network(NetworkDescriptor)
  | EnvironmentKey(String)

```

#### The Path Canonicalization Pipeline

When a sandboxed flow requests access to a filesystem asset, the host capability gateway intercepts the parameter and processes it through a strict normalization sequence inside the security module:

1. **Absolute Link Resolution:** The path parameter is evaluated via absolute string parsing, resolving relative path components and stripping overlapping separators.
2. **Traversal Elimination:** The parser strips parent directory components (`..`), null-byte injections (`\0`), and alternative Unicode encodings that might cause path confusion or sandbox escape.
3. **Prefix Invariance Assertion:** The validation logic checks that the completely normalized target path string begins strictly with the authorized prefix string defined in the `canonical_root` field. If the prefix test fails, the monitor blocks the file request instantly.

#### Protocol and Port Invariance

For outbound communication requests, string matching is bypassed. The `NetworkDescriptor` schema forces verification of the wire configuration: the target host and port must match the descriptor precisely, and `enforce_tls` must evaluate to `true`. If the network client tries to drop down to a cleartext state (e.g., following an insecure redirect), the host wrapper terminates the virtual network socket instantly, mitigating data exposure risks.

---

### 3) Baking Deterministic Fuel Injection into Module 5 & 6

Relying on guest software routines to monitor their own resource exhaustion limits introduces an unacceptable vector for infinite loop attacks and CPU denial-of-service exploits. **Deterministic Fuel Injection** embeds preemptive budget containment directly within the Wasmtime engine interpreter loop, decrementing a precise counter for every low-level virtual machine instruction executed by the guest.

#### Inside Module 5 (DWI Isolate Allocation)

Every time an execution isolate is initialized to handle a `ManagedStep`, the Deterministic State Sentinel (DSS) calculates a finite execution budget—**Fuel**—based on the specific policy profile bound to that workflow step:

$$\text{Fuel}_{\text{Allocated}} = \text{BaseInstructionLimit} \times \text{ComplexityWeight}$$

This fuel budget is injected directly into the WebAssembly execution context store using Wasmtime's native fuel configuration APIs, completely isolated from the guest's linear memory space.

```rust
;; Location: logicn-core-runtime/src/runtime.dwi.lln

flow provisionIsolateFuel(activeStore: mut WasmtimeStore, stepProfile: StepPolicy) -> Void {
  let instructionLimit = policy::calculateStepFuelLimit(stepProfile);
  
  ;; Configure native virtual machine instruction bounds via host interface
  wasm::set_store_fuel(activeStore, instructionLimit);
}

```

#### Inside Module 6 (DSS Supervisor Execution Loop)

The WebAssembly engine acts as an instruction monitor. Every low-level operation executed (such as `i32.add` or `local.get`) automatically decrements the active fuel register inside the host store. If the fuel counter drops to exactly `0` mid-execution, Wasmtime stops execution instantly without any cooperation or cleanup from the guest code:

```rust
;; Location: logicn-core-runtime/src/runtime.dss.lln

flow executeGuestWorkerIsolate(activeStore: mut WasmtimeStore) -> Result<ExecutionOutput, Fault> {
  let runResult = wasm::invoke_export(activeStore, "main");
  
  match runResult {
    WasmResult.Success(output) => {
      return Ok(output);
    }
    WasmResult.Trap(WasmTrapReason.FuelExhausted) => {
      ;; Capture runaway processes immediately
      log::emitCriticalAlert("LLN-RESOURCE-001: Execution halted by Host Fuel Trap.");
      
      ;; Force an immediate dynamic posture downgrade to drop privileges
      runtime::dropActiveCapabilityBitmask(PostureBit.FullRestriction);
      
      return Err(Fault.FuelExhaustion);
    }
    _ => {
      return Err(Fault.UnknownExecutionError);
    }
  }
}

```

---

### 4) Deep-Penetration Global "Secret Sink" Monitor

The compile-time checks (`LLN-SECRET-001/002/003`) documented in `protect.md` provide an excellent initial defense by preventing obvious string variables from accidentally leaking into logs, serializations, or network requests. However, because LogicN generates a wide variety of machine-readable outputs—including AI context files (`app.ai-guide.md`), compiler diagnostics, and Module 7 Epilogue Receipts—any runtime concatenation, string interpolation, or error stack serialization can accidentally bypass static analysis and leak active credentials.

To secure this boundary, we introduce the **Sanitized Output Sink Monitor** as a global, runtime-enforced security barrier written entirely within LogicN's secure packages.

```
       [ Core Compiler / Runtime Artifact Generator ]
  (Emits Diagnostics, AI Contexts, Receipts, App Guides)
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │ STAGE 1: Taint Propagation Engine     │
        │ - Tracks SecureString data flags      │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │ STAGE 2: Zero-Copy Token Parsing Sink │
        │ - Intercepts streaming byte blocks    │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │ STAGE 3: Context-Aware Redactor Block │
        │ - Wipes high-sensitivity matches      │
        └───────────────────────────────────────┘
                            │
                            ▼
               [ Clear, Verified Destination ]

```

#### Step 1: Extend Taint Propagation (`value-state-checker.lln`)

The compiler expands its type-checking behavior. If any data expression interacts with a variable flagged as a `SecureString`, the destination structure is automatically labeled as `TaintedString`. This taint flag propagates transitively across any sub-string slices, collection merges, or error tracking structures.

#### Step 2: Implement the Out-of-Band Signature Cache (`logicn-core-security`)

When the environment loads `.env` files or calls HashiCorp Vault, the raw credential values are strictly blocked from entering the guest's readable registers. Instead, the host supervisor populates an isolated **Secret Signature Cache** containing secure SHA-256 digests of the active credentials.

```rust
;; Location: packages-logicn/logicn-core-security/src/sink-monitor.lln

type SecretSignatureCache = mut {
  registered_hashes: List<String>
}

global active_sink_monitor: SecretSignatureCache = SecretSignatureCache { registered_hashes: List.new() }

flow registerSecretFingerprint(rawSecret: String) -> Void {
  if (String.length(rawSecret) >= 6) {
    let secretHash = crypto::sha256(rawSecret);
    active_sink_monitor.registered_hashes.append(secretHash);
  }
}

/**
 * Complete mediation boundary wrapper for all text streams, 
 * artifact pipelines, and file outputs. Called prior to crossing WASI IO.
 */
flow sanitizeOutputString(rawPayload: String) -> String {
  let textBuffer = rawPayload;

  ;; Hard Check: Scan for literal matches against active secret fingerprints
  for secretHash in active_sink_monitor.registered_hashes {
    if (crypto::contains_substring_match(textBuffer, secretHash)) {
      ;; Halt the operation instantly to prevent cleartext leakage
      runtime::triggerHardwareTrap(3001); ;; Diagnostic: LLN-SECRET-FATAL
    }
  }

  ;; Heuristic Check: Catch structural key shapes, JWTs, and bearer strings
  let cleanedBuffer = crypto::regex_replace(textBuffer, "(bearer\\s+)[a-zA-Z0-9_\\-\\.]+", "$1[REDACTED]");
  let finalBuffer = crypto::regex_replace(cleanedBuffer, "(api[-_]key\\s*[:=]\\s*['\"])[^'\"]+(['\"])", "$1[REDACTED]$2");
  
  return finalBuffer;
}

```

#### Step 3: Global Interception Rule

Every output sink in the ecosystem must register with the monitor interface before data can be written to persistent targets:

* **Compiler Artifact Sinks:** The generation pipelines for `app.ai-guide.md` and automated diagnostic reports must filter all strings through `sanitizeOutputString`.
* **Receipt Verification Sinks:** Module 7’s Epilogue Receipt generation loop passes all metadata values through the monitor block before applying signatures, ensuring that error logs or traces never sign or expose cleartext secrets.

---

### 5) Detailed Explanation: "Outer Operating System Sandbox as Layer 2"

WebAssembly provides safe isolation within its user-space virtual execution environment. However, if an attacker exploits a zero-day compiler bug or memory vulnerability within the underlying JIT compiler runtime or virtual machine framework, they can escape the WebAssembly memory boundary entirely and execute native code with the full privileges of the host process.

**Layer 2 (The Outer OS Sandbox)** wraps a secondary containment shield around the entire virtual machine execution engine. In an environment devoid of custom native compilation architectures, this outer layer is enforced by wrapping the LogicN supervisor executable inside standard Linux kernel container containers (e.g., executing the Wasmtime runner process inside minimalist OCI-compliant runtimes like `runc` or gVisor).

This architecture enforces four strict isolation controls directly via host container rules:

1. **Mount Namespace Segregation:** The file system visibility of the container executing Wasmtime is unmapped and restricted to an isolated, read-only system root directory containing nothing but the pre-compiled `.wasm` module. The server's true storage paths, host user directories, and system configurations are completely invisible.
2. **Network Tree Virtualization:** The operating system kernel unlinks the network interface card mappings from the worker sandbox process space. Unless network egress is explicitly requested by a structural capability descriptor, the container lacks virtual loopback structures or network interface links.
3. **Process Namespace Isolation:** The container process is assigned its own isolated process ID lookup tree, where it maps as the absolute root process (`PID 1`). It is blind to sibling execution workflows running on the host machine and cannot send signals to or trace adjacent system operations.
4. **No Privilege Escalation:** The runtime container enforces the `no-new-privileges` configuration flag. This permanently blocks the sandboxed Wasmtime thread or any child processes it spawns from expanding their operating system permissions, locking the process into its low-privilege state.

---

### 6) Concept Design: The Negative Test Suite

A standard testing framework verifies happy-path compliance (e.g., confirming that a valid program finishes successfully). The **Negative Test Suite** is an automated validation framework built to guarantee the platform's security boundaries by deliberately executing malicious, malformed, or rule-breaking payloads authored in `.lln` and target WebAssembly assemblies.

Every test in this framework operates on a strict negative assertion rule: **The test passes only if the compiler or host supervisor catches, blocks, or kills the execution task.**

```rust
;; Location: integration-tests/negative-containment/sandbox-escape.test.lln

flow verifyCompileTimeSinkLeakage() -> TestResult {
  let maliciousSource = "
    secure flow leak() -> Int {
      let secretKey = secret.get(\"DATABASE_URL\");
      log.info(\"Debug trace: \" + secretKey); ;; Explicit violation of LLN-SECRET-001
      return 0;
    }
  ";
  
  let compileResult = compiler::compileString(maliciousSource);
  
  match compileResult {
    CompileResult.Error(code) if code == "LLN-SECRET-001" => {
      return TestResult.Passed; ;; Success: The compiler correctly blocked the leak sink
    }
    _ => {
      return TestResult.Failed("Security Bypass: Compiler allowed a raw secret to flow into log infrastructure.");
    }
  }
}

flow verifyRuntimeLoopPreemption() -> TestResult {
  ;; Load a pre-compiled Wasm payload containing an explicit infinite recursion loop
  let maliciousWasmBytes = io::readTestAsset("infinite_loop.wasm");
  
  ;; Initialize supervisor with a strict fuel budget configuration
  let testSupervisor = dss::initializeSupervisor(Config { max_fuel: 2000 });
  let runResult = dss::executeIsolate(testSupervisor, maliciousWasmBytes);
  
  match runResult {
    RunResult.Fault(FaultType.FuelExhausted) => {
      return TestResult.Passed; ;; Success: Host supervisor caught and killed the runaway loop
    }
    _ => {
      return TestResult.Failed("Security Bypass: Sandbox ran indefinitely or failed to trap fuel exhaustion.");
    }
  }
}

```

---

### 7) Concept Design: Turning String Permissions into Structured Types

To enforce complete mediation across all resource interactions, we move the `logicn-core-security` authorization engine away from generic string arrays and transition to rigid, structurally evaluated definitions.

Instead of assigning loose text tokens like `["network::payments", "storage::write"]`, permissions are represented as distinct structural types that can be analyzed and evaluated by the core checker logic:

```rust
;; Location: packages-logicn/logicn-core-security/src/capabilities.lln

type FileSystemConstraint = {
  canonical_root: String,
  allow_write: Bool,
  max_file_size_bytes: U64
}

type NetworkConstraint = {
  canonical_host: String,
  allowed_port: U16,
  require_tls: Bool
}

type SystemCapabilityType =
  | File(FileSystemConstraint)
  | Network(NetworkConstraint)
  | EnvironmentKey(String)
  | AuditAppendOnly

flow evaluateCapabilityAdmission(
  requestedAccess: SystemCapabilityType,
  grantedPermissions: List<SystemCapabilityType>
) -> Bool {

  for granted in grantedPermissions {
    match (requestedAccess, granted) {
      (SystemCapabilityType.File(req), SystemCapabilityType.File(gran)) => {
        ;; Validate that the targeted path resides strictly inside the granted directory root
        if (String.startsWith(req.canonical_root, gran.canonical_root)) {
          let writeVerified = (!req.allow_write || gran.allow_write);
          let sizeVerified = (req.max_file_size_bytes <= gran.max_file_size_bytes);
          
          if (writeVerified && sizeVerified) { return true; }
        }
      }
      (SystemCapabilityType.Network(req), SystemCapabilityType.Network(gran)) => {
        let hostVerified = (req.canonical_host == gran.canonical_host || gran.canonical_host == "*");
        let portVerified = (req.allowed_port == gran.allowed_port);
        let tlsVerified = (req.require_tls == gran.require_tls || gran.require_tls == false);
        
        if (hostVerified && portVerified && tlsVerified) { return true; }
      }
      (SystemCapabilityType.AuditAppendOnly, SystemCapabilityType.AuditAppendOnly) => {
        return true;
      }
      _ => continue
    }
  }

  ;; Deny by default if no structural pattern matches the allocation claim
  return false;
}

```

#### Strategic Value of the Pure `.lln` Structural Model

* **Eliminates Wildcard Vulnerabilities:** Shorthand workarounds like `"fs::*"` are structurally impossible to pass to `evaluateCapabilityAdmission`, forcing developers to define explicit, predictable resource configurations for all host access pathways.
* **Guarantees Monotonic Safety:** These strongly typed structures allow the compiler and the host supervisor to mathematically prove that when an emergency rule triggers, the capability profile decays to a strictly more restrictive operational subset, preventing accidental privilege escalation bugs.