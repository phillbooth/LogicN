Based on the definitive design selections made across your specification branches, the architectural blueprint for the **LogicN Deterministic Runtime Containment Model (DRCM)** has been locked.

Below is the implementation-ready specification for the self-hosted, pure WebAssembly containment layer.

---

## 1. Syntax Integration: The Unified `contract {}` Block

To prevent structural fragmentation and optimize parser performance, the compiler implements the **inside-contract model**. This unites `intent`, runtime `effects`, and formal safety invariants within a single declarative scope directly attached to the flow signature.

```rust
;; Syntax Location Reference: packages-logicn/logicn-core-compiler/src/parser.ts

secure flow processTransaction(walletId: String, amount: U64) -> Result<Void, Fault> 
contract {
  intent { "Transfer funds securely while verifying balance constraints." }
  effects { ledger.mutate }
  invariant {
    ensure amount > 0;
    ensure runtime::getAvailableBalance(walletId) >= amount;
  }
}
{
  ;; Execution body isolates cleanly here
}

```

---

## 2. Supervisor Architecture: Self-Hosted DSS on Wasmtime

The Trusted Computing Base (TCB) resolves to **Option 1: Wasmtime directly hosts the DSS WASM**.

The Deterministic State Sentinel (`DSS.wasm`) acts as the privileged entrypoint module instantiated by the host runtime environment. It ingests raw, untrusted guest logic (`DWI.wasm`) as standard WASM components or instances, brokering all downstream resource workflows.

```
  ┌────────────────────────────────────────────────────────┐
  │ Wasmtime System Host Environment (Core TCB Engine)      │
  │                                                        │
  │ ┌────────────────────────────────────────────────────┐ │
  │ │ Deterministic State Sentinel (DSS.wasm Supervisor) │ │
  │ │                                                    │ │
  │ │  [ V_DPM Register ] -> Encoded 32-bit Bitmask      │ │
  │ │  - Channel 0: Network Access Active/Inactive       │ │
  │ │  - Channel 1: Storage Layer Mounted/Unmounted      │ │
  │ └─────────────────────────┬──────────────────────────┘ │
  │                           │                            │
  │            Exposes Read-  │ Intercepts System Call     │
  │            Only Interface │ & Traps on Violation       │
  │                           ▼                            │
  │ ┌────────────────────────────────────────────────────┐ │
  │ │ Ephemeral Guest Workflows (DWI.wasm Isolates)      │ │
  │ │                                                    │ │
  │ │  - Isolated 4MB Linear Memory Segments             │ │
  │ │  - Zero Shared Pointers or Cross-Context State     │ │
  │ └────────────────────────────────────────────────────┘ │
  └────────────────────────────────────────────────────────┘

```

### State Persistence & Inter-Isolate Propagation

The **Dynamic Posture Matrix (DPM)** state persistence model maps to **Option 1: DSS owns DPM in its own linear memory**.

* **Memory Isolation:** The 32-bit $V_{\text{DPM}}$ capability vector is strictly isolated inside the supervisor module's internal memory footprint. Sibling guest isolates (`DWI`) cannot access or scan this pointer.
* **Mediation Interface:** When a guest module attempts an I/O interaction, it invokes a read-only capability check function imported from the DSS layer. The DSS evaluates the requested action against the bitmask register state and instantly terminates the calling thread with a runtime trap if an infraction occurs.

---

## 3. Boundary Policy: The `step` Keyword Specification

The compiler enforces a strict **trust-boundary isolation model** for execution control.

```rust
;; Core Execution Flow Pattern
secure flow processOrder(orderId: String) -> Result<Void, Fault> {
  ;; Internal pure logic runs inside the local isolate context
  let sanitizedId = internal_utils::clean(orderId);
  
  ;; Crossing a major trust boundary forces separate process allocation
  let networkResult = step network_client::transmitOrder(sanitizedId);
  
  return networkResult;
}

```

### Operational Isolation Metrics

* **Boundary Condition:** The `step` keyword must be explicitly declared whenever execution targets external subsystems, multi-tenant dependencies, or state-mutating network sinks.
* **Resource Profile:** Each initialized `step` isolate is provisioned with a strict **4MB linear memory ceiling**.
* **State Cleanliness:** Isolates leverage a shared-nothing paradigm. Pointers are never copied across boundaries; state transfers use structured, immutable serialised arrays verified during entry.

---

## 4. Root-Cause Defect Engineering (Phase 1 Checklist)

To establish sandbox integrity before proceeding with the core compiler migration, the following logic flaws within the reference code must be refactored:

### 1. Complete Removal of String Wildcards (`"*"`)

* **Vulnerability:** Opaque string matching against the character `*` drops ambient capability privileges due to variable truncation or parser-bypass flaws.
* **Remediation:** Enforce structured algebraic variants inside `packages-logicn/logicn-core-security/src/capabilities.lln`. Loose text strings are banned in policy declarations.

### 2. Rewrite of Substring Secret Hashing

* **Vulnerability:** The legacy `scanForSecretLiteral` pipeline evaluated SHA-256 digests against raw, streaming byte outputs. This approach fails mathematically for continuous data streams because cryptographic digests cannot verify variable length-prefix substring matches.
* **Remediation:** Refactor `packages-logicn/logicn-core-security/src/sink-monitor.lln` to store short, unhashed cleartext search tokens (8-character prefixes) within write-only lookup slots. Stream matching can then perform immediate lookups to halt execution loops instantly via hardware traps before data exits the boundary.

---

## 5. Declarative WASI Capability Mapping

Operating as a pure guest inside Wasmtime means the DSS cannot emit native kernel extensions or modify host network bindings dynamically. It relies strictly on **WASI Preview 2 (Wasmtime 22+)** configuration flags.

| Capability Scope | WASI Interface Interface Requirement | Native Containment Strategy |
| --- | --- | --- |
| **Storage Isolation** | `wasi:filesystem/preopens` | Paths are clamped to pre-opened directory descriptors. Escaping via relative path traversal results in an immediate filesystem fault. |
| **Network Egress** | `wasi:sockets/tcp` | Connections are tied to declarative sockets mapped during startup. The DPM can drop connection privileges dynamically but cannot create new outbound routes. |
| **Context Safety** | `wasi:cli/environment` | Ambient host environment vectors are dropped during instantiation to prevent info leaks. |
| **Tamper-Evident Logs** | `wasi:cli/stdout` | System streams pipe directly to write-only host collectors, creating immutable execution records. |

> **Monotonic Modification Property:** The supervisor can downgrade or revoke capabilities instantly if an execution exception triggers, but it cannot expand privileges beyond the limits set when the host environment booted. The DPM enforces safety through reduction—allowing permissions to narrow dynamically but preventing runtime escalation bugs.

---

## 6. End-to-End Runtime Execution Topology

The end-to-end architecture operates as a series of nested containment rings:

```
┌────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: HOST PLATFORM CONTAINERIZATION (OCI / gVisor)                │
│  - Restricts host kernel access via absolute seccomp-bpf system filters │
│  - Strips native execution environments completely                     │
│  └──────────────────────────────────────────────────────────────────┐  │
│  │ LAYER 1: PRIVILEGED RUNTIME MONITOR (Wasmtime Host Engine)        │  │
│  │  - Manages hard page allocations and linear stack guard tracking  │
│  │  - Configures strict runtime fuel injection pools for CPU bounds │  │
│  │  └────────────────────────────────────────────────────────────┐  │  │
│  │  │ LAYER 0: DETERMINISTIC STATE SENTINEL (DSS.wasm Supervisor)│  │  │
│  │  │  - Manages the sovereign 32-bit $V_{\text{DPM}}$ capability vector  │  │  │
│  │  │  ┌──────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ GUEST WORKFLOWS (Ephemeral DWI.wasm Isolates)        │  │  │  │
│  │  │  │  - Constrained strictly to 4MB of local linear memory│  │  │  │
│  │  │  │  - Intercepted by streaming length-prefix sink filters│  │  │  │
│  │  │  └──────────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘

```

---

## 7. Operational Transition Roadmap

```
gantt
    title LogicN DRCM Implementation Roadmap — Hardened WASI Transition
    dateFormat YYYY-MM
    axisFormat %b %Y

    section Phase 1 — Critical Security Fixes
    Fix: canonical manifest (RFC 8785 / CBOR)         :crit, p1a, 2026-06, 1w
    Fix: CAS atomic monotonic transition               :crit, p1b, 2026-06, 1w
    Fix: strip wildcard "*" from capability checks      :crit, p1c, 2026-06, 3d
    Fix: length-prefix framing for receipt fragments   :crit, p1e, 2026-06, 3d
    Fix: scanForSecretLiteral cleartext token search   :crit, p1f, 2026-07, 1w

    section Phase 2 — invariant block (Module 2)
    Parser: invariant {} inside contract block          :p2a, 2026-07, 1w
    Governance verifier: static proof pass             :p2b, 2026-07, 2w
    WAT emitter: dynamic assertion gate injection      :p2c, 2026-07, 2w
    LLN-INV-001/002 diagnostics                       :p2d, 2026-07, 1w
    Tests: static bypass + runtime trip                :p2e, 2026-08, 1w

    section Phase 3 — .lmanifest (Module 1 §3)
    Define canonical manifest schema (CBOR/JSON-C)    :p3a, 2026-08, 1w
    Export ProofGraph + T2 taint constraints           :p3b, 2026-08, 2w
    ML-DSA-65 signing at compile time                 :p3c, 2026-08, 1w
    Admission gate: hash + signature verify            :p3d, 2026-08, 2w
    Tests: tamper detection + forged sig rejection     :p3e, 2026-09, 1w

    section Phase 4 — Structured Capabilities (Modules 3+4)
    Replace string grants with SystemCapabilityType    :p4a, 2026-09, 2w
    Path canonicalization pipeline (.lln)              :p4b, 2026-09, 1w
    CAS monotonic state transition (atomic)            :p4c, 2026-09, 1w
    LLN-MONO-001/002 diagnostics                      :p4d, 2026-09, 1w
    policy {} grammar + monotonicity verifier          :p4e, 2026-09, 2w
    Tests: path traversal + privilege escalation       :p4f, 2026-10, 1w

    section Phase 5 — DWI + Self-Hosted DSS (Modules 5+6)
    step keyword parsing + ManagedStep AST node        :p5a, 2026-10, 2w
    DWI isolate allocation (Declarative WASI bounds)   :p5b, 2026-10, 2w
    Fuel injection via Wasmtime store engine API       :p5c, 2026-10, 1w
    Compile self-hosted DSS to Wasmtime entry module   :p5d, 2026-10, 2w
    DSS host import broker (DPM bitmask evaluation)    :p5e, 2026-11, 2w
    emergency {} block parser + signal routing         :p5f, 2026-11, 2w
    Tests: fuel exhaustion + isolation breach          :p5g, 2026-11, 1w

    section Phase 6 — Epilogue Receipt (Module 7)
    Receipt struct + canonical serialization           :p6a, 2026-12, 1w
    DSS signing loop (ML-DSA-65 post-quantum)          :p6b, 2026-12, 1w
    Admission verification gate                        :p6c, 2026-12, 1w
    Append-only ledger integration                     :p6d, 2026-12, 1w
    Tests: tamper + forgery + quarantine flag          :p6e, 2026-12, 1w

    section Phase 7 — Negative Test Suite + Hardening
    Full negative test suite (all OWASP vectors)       :p7a, 2027-01, 3w
    Secret sink monitor (real prefix checking)         :p7b, 2027-01, 2w
    Layer 2 OS sandbox config (OCI/gVisor wrapper)     :p7c, 2027-01, 2w
    PCI DSS 4.0.1 + SOC 2 evidence validation          :p7d, 2027-02, 2w
    Linux server deployment verification               :p7e, 2027-02, 2w

```