# LogicN Architecture Blueprint

## Module 7 of 7: The Epilogue Receipt

---

### 1. Metadata and Classification

* **Layer:** Cryptographic / Data Attestation Layer
* **System Responsibility:** Emits immutable, cryptographically signed proofs at the closure of every `step` boundary. It acts as the verifiable token that secures zero-copy value-passing and provides instantaneous state legitimacy when moving workloads between different target execution environments.
* **Target Components:** `logicn-core-runtime` (receipt generation, token verification), `logicn-core-compiler` (schema hash definitions), and `.lmanifest` validation blocks.

---

### 2. What It Is

The **Epilogue Receipt** is the final closing mechanic of the LogicN Stage B safety model. In a distributed or multi-tiered runtime environment, verifying that a piece of inbound data is safe, pristine, and compliant typically requires re-running expensive data audits, re-checking historical logs, or parsing complex lineage graphs.

The Epilogue Receipt eliminates this operational friction by converting a completed `step` execution into a self-contained, cryptographically signed cryptographic token. This token encapsulates the identity of the completed step, the cryptographic hashes of the input and output data shapes, the remaining session budget, and the exact state of the security matrix at the millisecond of termination.

---

### 3. What It Does

* **Binds Data Outputs to Execution Provenance:** Stamped directly by the host supervisor runtime, it guarantees that an output payload was generated under a specific, approved `.lmanifest` configuration.
* **Enables Fast Multi-Target Handoffs:** Allows high-performance, lower-isolation engines (like a `Native trusted kernel` or a Zig-compiled math module) to instantly accept and run data from a `WASM component` without re-verifying the upstream application execution history.
* **Secures Exactly-Once Processing (Idempotency):** Combines the `chain_id` and `step_id` to form a permanent, deterministic lookup handle, preventing duplicate execution attempts during network or worker retries.
* **Exports Immutable Audit Evidence:** Emits a standardized compliance block that can be stored on any external append-only ledger, giving security auditors unalterable proof of transaction data-flow validity.

---

### 4. What It Does NOT Do

* **It does NOT store the raw application payload data:** The receipt contains cryptographic signatures and hashes of data structures. It does not carry raw, high-sensitivity fields (like plain-text cardholder data or personally identifiable information).
* **It does NOT replace the active capability bitmask:** It is a static, past-tense attestation record of a completed step. It does not actively mediate ongoing memory reads or system writes while a thread is running.
* **It does NOT handle automatic database data mutations:** It certifies that a step completed its mutation logic successfully. The actual physical persistence commit to a database or ledger is handled by the underlying host adapter.

---

### 5. Core Concept and Mathematical Grounding

The Epilogue Receipt functions as a cryptographic proof of a valid state transition under the rules of the **Deterministic State Sentinel (DSS)**.

Let a completed step execution be defined by its constituent parameters. The Epilogue Receipt Receipt ($R_E$) is defined as a signed cryptographic hash block:

$$R_E = \text{Sign}_{DSS}\Big( H\big( \text{Step}_{ID} \mathbin{\Vert} \text{Hash}(In) \mathbin{\Vert} \text{Hash}(Out) \mathbin{\Vert} V_{DPM} \mathbin{\Vert} \text{Budget}_{Remaining} \big) \Big)$$

Where:

* $\text{Sign}_{DSS}$ is a secure, post-quantum signature applied by the host runtime private signing key.
* $H$ is a secure cryptographic hashing function (SHA-256).
* $\text{Hash}(In)$ and $\text{Hash}(Out)$ are the content-addressed hashes of the input and output parameter structures.
* $V_{DPM}$ is the final 32-bit vector value of the Dynamic Posture Matrix.

Any downstream target component can authenticate the legitimacy of the output payload instantly by checking if the signature matches the public key of the trusting runtime platform and validating that $\text{Hash}(Out)$ accurately reflects the inbound bytes.

---

### 6. Architectural Flowchart

```
    [ Guest Worker Isolate (DWI) ]
  +---------------------------------+
  | Executes step logic             |
  | Emits final output payload data |
  +---------------------------------+
                   |
     [Execution Completes Cleanly]
                   |
                   v
  +-------------------------------------------------------------------------+
  |               Deterministic State Sentinel (DSS Host Layer)             |
  |                                                                         |
  |  1. Calculates SHA-256 hashes of input and output data structures       |
  |  2. Captures final DPM bitmask register state                           |
  |  3. Combines into structured payload block                              |
  |  4. Signs payload block using Host Private Key -> Generates Receipt     |
  +-------------------------------------------------------------------------+
                   |
                   +-----------------------+
                   |                       |
       [Write to Local Audit Log]          | [Forward Output Data + Receipt]
                   |                       v
                   v               +---------------------------------+
  +------------------------------+ |  Target Compute Environment     |
  | Append-Only Secure Ledger    | |  (e.g., Native Trusted Kernel)  |
  | Unsamplable Compliance Trail | |  Validates receipt in 1 check   |
  +------------------------------+ +---------------------------------+

```

---

### 7. How to Add the Epilogue Receipt to LogicN: Implementation Blueprint

To introduce the Epilogue Receipt generation and verification pipelines into your self-hosted Stage B engine packages, apply this operational codebase layout:

#### Step 1: Establish the Epilogue Receipt Core Data Structure (`runtime.receipts.lln`)

Define the explicit structural fields that comprise the token signature block inside your runtime systems definition module.

```rust
;; Location: logicn-core-runtime/src/runtime.receipts.lln

type EpilogueReceipt = {
  step_identity: String,
  idempotency_key: String,
  input_schema_hash: String,
  output_data_hash: String,
  final_dpm_state: U32,
  remaining_fuel: U64,
  host_signature: String
}

flow generateReceiptPayloadString(receipt: EpilogueReceipt) -> String {
  return String.concat([
    receipt.step_identity, "|",
    receipt.idempotency_key, "|",
    receipt.input_schema_hash, "|",
    receipt.output_data_hash, "|",
    Int.toStr(receipt.final_dpm_state), "|",
    Int.toStr(receipt.remaining_fuel)
  ]);
}

```

#### Step 2: Implement Token Generation in the DSS Handoff Loop (`runtime.lln`)

The host supervisor must intercept the precise moment a guest WebAssembly module finishes executing a `step` routine, calculating hashes and signing the resulting tracking token before releasing the worker.

```rust
;; Location: logicn-core-runtime/src/runtime.lln

flow sealStepExecutionEpilogue(
  stepId: String, 
  idemKey: String,
  inBytes: List<U8>, 
  outBytes: List<U8>, 
  currentDpm: U32, 
  fuelLeft: U64
) -> EpilogueReceipt {
  
  let inHash = crypto::sha256(inBytes);
  let outHash = crypto::sha256(outBytes);
  
  let mut receipt: EpilogueReceipt = {
    step_identity: stepId,
    idempotency_key: idemKey,
    input_schema_hash: inHash,
    output_data_hash: outHash,
    final_dpm_state: currentDpm,
    remaining_fuel: fuelLeft,
    host_signature: ""
  };
  
  ;; Extract the raw string layout representation of the metadata fields
  let serializationPayload = generateReceiptPayloadString(receipt);
  
  ;; Cryptographically sign using the host runtime platform's master private key
  let hostPrivateKey = host::getHostSigningKey();
  let signature = crypto::mldsa65::sign(serializationPayload, hostPrivateKey);
  
  receipt.host_signature = signature;
  
  ;; Dispatch the signed token block straight to the unsampled ledger stream
  host::writeToAppendOnlyDiskLedger(json::serialize(receipt));
  
  return receipt;
}

```

#### Step 3: Wire the Receipt Verification Gate for Native Targets (`runtime.admission.lln`)

Configure high-performance, lower-isolation target execution blocks (like native execution hot-paths) to run an explicit admission check against incoming data packets using the Epilogue Receipt.

```rust
;; Location: logicn-core-runtime/src/runtime.admission.lln

flow verifyStepHandoffAdmission(inboundData: List<U8>, receipt: EpilogueReceipt) -> Bool {
  ;; 1. Regenerate data hash and verify it matches the assertion inside the token
  let calculatedDataHash = crypto::sha256(inboundData);
  if (calculatedDataHash != receipt.output_data_hash) {
    log::error("RECEIPT-FAULT: Input payload bytes do not match the signed receipt metadata.");
    return false;
  }
  
  ;; 2. Reconstruct the signature payload string verification block
  let serializationPayload = generateReceiptPayloadString(receipt);
  
  ;; 3. Check signature validity against the trusted Host Supervisor Public Key
  let hostPublicKey = host::getHostPublicKey();
  let isVerified = crypto::mldsa65::verify(receipt.host_signature, serializationPayload, hostPublicKey);
  
  if (!isVerified) {
    log::error("RECEIPT-FAULT: Epilogue Receipt signature is corrupt or forged.");
    return false;
  }
  
  ;; 4. Check that the final posture of the receipt did not state a quarantine flag
  if ((receipt.final_dpm_state & 8) != 0) {
    log::error("RECEIPT-FAULT: Refusing handoff. Upstream step closed inside a Quarantine state.");
    return false;
  }
  
  return true;
}

```

---

### 8. Verification and Operational Metrics

To confirm that the Epilogue Receipt is successfully protecting data provenance boundaries across runtime hops, validate your implementation with these test procedures:

1. **Tampered Payload Interception:** Set up a target environment handoff harness where a worker processes a step, emits an Epilogue Receipt, and passes the output to a native kernel task. Before the native task reads the input, use a mock pipeline tool to alter a single byte of the payload data array while leaving the receipt intact. Execute the verification check. The admission gate must evaluate to `false` instantly, logging a data-hash variance fault.
2. **Signature Forgery Interception:** Author a mock attack tool that attempts to craft a fake Epilogue Receipt token featuring legitimate data hashes but containing a forged or self-signed signature block. Run the verification track against a native admission gate. The runtime engine must reject the payload immediately, blocking the data from reaching the internal execution stack of the trusted kernel.

---

*This concludes Module 7 of 7 and completes the full core architectural specification documentation series for the LogicN Stage B Safety Model.*