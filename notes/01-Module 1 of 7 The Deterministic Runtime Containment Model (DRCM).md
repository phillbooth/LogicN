# LogicN Architecture Blueprint

## Module 1 of 7: The Deterministic Runtime Containment Model (DRCM)

---

### 1. Metadata and Classification

* **Layer:** Architectural Philosophy / Foundation Layer
* **System Responsibility:** Establishes the foundational design invariants for the compiler and execution planes. It dictates that security and fault isolation must be deterministic, language-native, and mathematically verifiable rather than reactive, ambient, or out-of-band.
* **Target Components:** `logicn-core-compiler`, `logicn-core-runtime`, and `.lmanifest` generation pipelines.

---

### 2. What It Is

The **Deterministic Runtime Containment Model (DRCM)** is the primary architectural security philosophy of the LogicN platform. It rejects the industry-standard "fortress-and-reactive-firewall" paradigm of security. Instead of treating code execution as an unmonitored zone wrapped by outer security daemons, logging frameworks, or kernel-level runtime interceptors, DRCM enforces safety *inside the language semantics themselves*.

Under DRCM, an execution context is modeled as a tightly bound, deterministic capability envelope. Every computational step must carry its safety guarantees and resource boundaries natively, ensuring that the runtime can mathematically prove execution safety before a single byte of code runs.

---

### 3. What It Does

* **Forces Explicit Invariants:** Eliminates ambient authority. Every flow must operate within a declared envelope of capabilities, resource budgets, and data-flow policies.
* **Eliminates Out-of-Band Interception Overhead:** Replaces heavy kernel context switches, operating system process forks, and remote policy daemon queries (e.g., OPA, Cedar) with local compiler proofs and direct runtime primitives.
* **Generates Machine-Verifiable Evidence:** Translates source-level constraints directly into a cryptographically signed, machine-verifiable `.lmanifest` artifact, enabling third-party compliance verification (like PCI DSS 4.0.1) without source-code disclosure.
* **Binds Code Structure to Isolation Lifecycles:** Maps the structural declaration of a program directly to low-level WebAssembly memory structures and isolation boundaries.

---

### 4. What It Does NOT Do

* **It is NOT a Runtime Policy Modification Engine:** DRCM does not allow arbitrary runtime inflation of permissions. It is strictly restrictive and cannot be used to dynamically grant ambient authority.
* **It is NOT an Intrusion Detection System (IDS):** It does not parse network packet signatures, scan binaries for malicious heuristics, or look for known vulnerability CVE patterns. It relies entirely on structural execution boundaries.
* **It does NOT provide arbitrary OS-level Sandboxing:** It operates at the language runtime and component layer. It does not replace low-level kernel virtualization structures (such as cgroups, namespaces, or hypervisors) but rather hyper-optimizes the compute *within* those targets.

---

### 5. Core Concept and Mathematical Grounding

The DRCM treats execution as a deterministic state transition space. In standard runtimes, a function invocation $f(x)$ inherits the global, ambient environment permissions of the host process $E_{ambient}$. If $f(x)$ is compromised via an exploit payload, it can abuse $E_{ambient}$ to leak files or open sockets.

Under DRCM, an execution context is defined as a tuple:

$$\Omega = \langle S, C, B, L \rangle$$

Where:

* $S$ is the isolated local state (linear memory sandbox).
* $C$ is the explicit Capability Bitmask ($C \subseteq \text{Total Allowed System Effects}$).
* $B$ is the Remaining Financial/Resource Budget ($B \in \mathbb{R}^+$).
* $L$ is the Taint/Privacy Label Lattice.

A program can never execute an effect $e$ unless $e \in C$. Because the transition mechanics are deterministic and proven by the compiler's `ProofGraph`, the runtime execution plane can safely execute the underlying operations at native hardware speeds, knowing that out-of-bounds execution is mathematically impossible.

---

### 6. Architectural Flowchart

```
       +---------------------------------------------+
       |             Source Language (.lln)          |
       |  Explicit contract {}, invariant {}, policy|
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |            logicn-core-compiler             |
       |  Value-State Pass  ->  Effect Checker Pass  |
       +---------------------------------------------+
                              |
         [ProofGraph Built / Invariants Proven]
                              |
                              v
       +---------------------------------------------+
       |         Code Generation & Artifacts         |
       |  - program.wasm (Stripped of redundant checks)
       |  - .lmanifest   (Signed Data-Flow Assertions)
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |             logicn-core-runtime             |
       |  Deterministic State Sentinel (DSS) Loading |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |           Execution Isolation Plane         |
       |  Single-Cycle Capability Bitmask Execution  |
       +---------------------------------------------+

```

---

### 7. How to Add DRCM to LogicN: Implementation Blueprint

To introduce DRCM as the core behavioral protocol of your engineering stack, follow this exact development mapping across the target repository packages:

#### Step 1: Update the Manifest Specification (`logicn-core-compiler`)

You must define the standalone `.lmanifest` output format. This file serves as the cryptographically signed record of the static assertions proven during compilation.

Modify the compiler pipeline to export a structured JSON/CBOR payload matching this schema definition:

```json
{
  "$schema": "https://logicn.org/schemas/manifest.v1.json",
  "sourceHash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "compiledAt": "2026-06-04T08:12:00Z",
  "governanceSignature": {
    "algorithm": "ML-DSA-65",
    "publicKey": "0x0a2f...",
    "signature": "0x8f3c..."
  },
  "staticAssertions": {
    "flows": [
      {
        "name": "settleTransaction",
        "purity": false,
        "allowedEffects": ["state::billing::ledger", "network::payments"],
        "requiredCapabilities": ["0x00000003"],
        "taintTransitions": [
          { "source": "CardholderData", "sink": "TelemetryLog", "status": "BLOCKED" }
        ]
      }
    ]
  }
}

```

#### Step 2: Inject the DRCM Verification Pass into the Compiler Pipeline

In `logicn-core-compiler/src/pipeline.ts` (or the equivalent `pipeline.lln` file in your self-hosted Stage B compiler), add an explicit DRCM validation phase immediately following the `governance-verifier` pass:

```typescript
// Location: logicn-core-compiler/src/pipeline.ts

import { parseAST } from './parser';
import { checkValueStates } from './value-state';
import { checkEffects } from './effects';
import { verifyGovernance, ProofGraph } from './governance';

export interface DRCMArtifacts {
  wasmBytecode: Uint8Array;
  manifestPayload: string;
}

export function compileDRCM(sourceCode: string): DRCMArtifacts {
  // 1. Lex and Parse down to the Abstract Syntax Tree
  const ast = parseAST(sourceCode);
  
  // 2. Perform Type and Taint Check Loops
  const valueStateContext = checkValueStates(ast);
  const effectContext = checkEffects(ast);
  
  // 3. Build the Cryptographic ProofGraph
  const proofGraph: ProofGraph = verifyGovernance(ast, valueStateContext, effectContext);
  
  if (proofGraph.hasViolations()) {
    throw new Error(`DRCM-STATIC-FAIL: Compiler obligations could not be proven.\n${proofGraph.getDiagnostics()}`);
  }
  
  // 4. Structural lowering to Governed IR (GIR) and WebAssembly Text (WAT)
  const gir = emitGIR(ast, proofGraph);
  const wasmBytecode = assembleWAT(gir);
  
  // 5. Generate the final signed .lmanifest
  const manifestPayload = generateSignedLManifest(proofGraph, wasmBytecode);
  
  return {
    wasmBytecode,
    manifestPayload
  };
}

```

#### Step 3: Wire the Runtime Admission Gate (`logicn-core-runtime`)

The runtime plane must reject any execution request that cannot supply a matching, cryptographically authentic `.lmanifest` pairing.

Add an admission gate to the worker instantiation loop in `logicn-core-runtime/src/admission.lln`:

```rust
;; Location: logicn-core-runtime/src/admission.lln

flow validateRuntimeAdmission(wasmBytes: List<U8>, manifestRaw: String) -> Result<Bool, AdmissionError> {
  let manifest = parseManifestJson(manifestRaw);
  
  ;; 1. Verify Source Cryptographic Binding Hash
  let calculatedHash = crypto::sha256(wasmBytes);
  if (calculatedHash != manifest.sourceHash) {
    return Err(AdmissionError::HashMismatch);
  }
  
  ;; 2. Verify Post-Quantum Governance Signature
  let isSignatureValid = crypto::mldsa65::verify(
    manifest.governanceSignature.signature,
    manifest.sourceHash,
    manifest.governanceSignature.publicKey
  );
  
  if (!isSignatureValid) {
    return Err(AdmissionError::InvalidGovernanceSignature);
  }
  
  ;; 3. Register Permitted Capability Envelope Matrix
  runtime::registerSystemEnvelope(manifest.staticAssertions.flows);
  
  return Ok(true);
}

```

---

### 8. Verification and Operational Metrics

To confirm the successful integration of DRCM into LogicN, verify that your test harness yields these outcomes:

1. **Static Rejection Performance:** Attempt to compile a module that maps a source marked `@source_from(CardholderData)` straight to a sink marked `@deny_to(TelemetryLog)`. The compiler must halt immediately during step 2 of the code pipeline, returning an explicit structural diagnostic code (`LLN-SECRET-001`).
2. **Zero Runtime Safety-Instruction Overhead:** Inspect the compiled `.wasm` file using `wasm-objdump`. Confirm that internal loops do not contain compiler-injected runtime bounds arrays or redundant memory protection function calls. All protection parameters must reside entirely in the external WASM heap boundaries and global bitmasks managed by the supervisor layer.

---

*This concludes Module 1 of 7. Please request **Module 2: invariant** when you are ready to proceed.*