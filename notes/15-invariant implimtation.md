## 1. Root-Cause Remediation of Critical Vulnerabilities

### 🔴 Defect 1: The Wildcard (`*`) Host Leak

**Architectural Risk:** Treating the wildcard character `*` as a string match inside the runtime logic introduces parsing vulnerabilities, ambiguity, and unintended ambient authority drops. If an input payload splits or malforms a string validation parameter, it can match against the wildcard, allowing traffic to exit the sandbox.

**The Pure `.lln` Fix:** We eliminate string-based wildcards entirely. Broad egress capabilities must be explicitly declared using strongly typed algebraic variant types, forcing security profiles to flag them at compile time.

```rust
;; Core Capability Model: packages-logicn/logicn-core-security/src/capabilities.lln

type NetworkTarget =
  | ExplicitHost(String)  ;; Must match FQDN or literal IP exactly
  | UnrestrictedInternet  ;; Only valid if bound to a high-audit explicit policy

type NetworkConstraint = {
  target: NetworkTarget,
  allowed_port: U16,
  require_tls: Bool
}

flow evaluateNetworkEgress(req: NetworkConstraint, gran: NetworkConstraint) -> Bool {
  let hostVerified = match (req.target, gran.target) {
    (NetworkTarget.ExplicitHost(r_host), NetworkTarget.ExplicitHost(g_host)) => r_host == g_host,
    (_, NetworkTarget.UnrestrictedInternet) => true,
    _ => false
  };
  
  return hostVerified && (req.allowed_port == gran.allowed_port) && (req.require_tls == gran.require_tls);
}

```

### 🔴 Defect 2: Broken `scanForSecretLiteral` Substring Hashing

**Architectural Risk:** Checking a continuous, streaming byte array against static SHA-256 hashes of known secrets is mathematically broken for substring identification. You cannot discover whether a variable-length cleartext string is a subset of an output stream by comparing hashes, because the hash changes entirely based on adjacent data bytes.

**The Pure `.lln` Fix:** When the DSS loads sensitive credentials via its security layer, it extracts a fixed length-prefix token (minimum 8 characters) into an isolated, write-only lookaside memory tracking register inside the monitor.

```rust
;; Location: packages-logicn/logicn-core-security/src/sink-monitor.lln

type SecretSinkCache = mut {
  ;; Stores cleartext prefix tokens under memory protection (Never signed or outputted)
  tracked_prefixes: List<String> 
}

global active_sink_monitor: SecretSinkCache = SecretSinkCache { tracked_prefixes: List.new() }

flow registerSecretTrackingPrefix(rawSecret: String) -> Void {
  if (String.length(rawSecret) >= 12) {
    ;; Capture a signature slice long enough to prevent accidental false-positives
    let fingerprintPrefix = String.substring(rawSecret, 0, 8); 
    active_sink_monitor.tracked_prefixes.append(fingerprintPrefix);
  }
}

flow evaluateStreamingSinkBytes(rawPayload: String) -> String {
  for prefix in active_sink_monitor.tracked_prefixes {
    if (crypto::contains_substring_match(rawPayload, prefix)) {
      ;; Instantly trigger a hardware fault exception trap to abort execution
      runtime::triggerHardwareTrap(3001); ;; Trap Code: LLN-SECRET-BREACH
    }
  }
  return rawPayload;
}

```

---

## 2. Syntactic Placement of `invariant {}`

To avoid separating security logic from structural contract expectations, the **inside-contract model alongside intent/effects** is selected. This ensures that when the compiler validates value-state tracking profiles, it cross-references the capability gates alongside the mathematical truths required by the flow block.

```rust
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
  ;; Implementation logic executed within the DWI isolate
}

```

---

## 3. Dynamic Posture Matrix (DPM) State Persistence and Inter-Isolate Transfer

The selected pattern is **Option 1: The DSS owns the DPM within its own linear memory space; guests read it exclusively via a restricted WASI import function**.

```
  ┌────────────────────────────────────────────────────────┐
  │ Wasmtime Host Engine Context                           │
  │                                                        │
  │ ┌────────────────────────────────────────────────────┐ │
  │ │ Deterministic State Sentinel (DSS.wasm)            │ │
  │ │                                                    │ │
  │ │  [ V_DPM: 32-bit Register ]                        │ │
  │ │  (Bit 0: Net, Bit 1: Storage, Bit 2: Quarantine)   │ │
  │ └─────────────────────────┬──────────────────────────┘ │
  │                           │                            │
  │               Provides    │ Intercepts Call            │
  │               Read-Only   │ & Evaluates Bitmask        │
  │               WASI Import │                            │
  │                           ▼                            │
  │ ┌────────────────────────────────────────────────────┐ │
  │ │ Ephemeral Guest Isolate (DWI.wasm)                 │ │
  │ │                                                    │ │
  │ │  - Shared-nothing memory space                    │ │
  │ │  - Trapped instantly if an illegal effect occurs   │ │
  │ └────────────────────────────────────────────────────┘ │
  └────────────────────────────────────────────────────────┘

```

### The Dynamic Posture Decoupling Pipeline

* **Isolation of Sovereign Bitmasks:** The 32-bit $V_{\text{DPM}}$ register is structurally stored in the private memory space of the DSS loop. It cannot be mutated, addressed, or target-scanned by guest workflow instances (`DWI`) running in sibling linear memory pools.
* **Strict Complete Mediation via Imports:** Guest instances access resource channels exclusively through bound WASI functional interfaces (e.g., calling an imported `.lln` permission broker). The broker validates the caller's request against the current bitmask state within the supervisor, trapping the calling thread immediately if a restriction flag is active.

---

## 4. Pure WASI Constraint & Capability Mapping

Moving from custom Rust host extensions to a pure declarative WASI framework is a major security improvement, but it introduces strict technical boundaries. Since the DSS is itself a WebAssembly module running inside Wasmtime, it cannot dynamically generate native kernel extensions or arbitrary socket hooks at runtime. It is bounded entirely by the capability configuration passed to it by the outer OCI container engine.

We map our structured capability types onto the standard declarative constraints of **WASI Preview 2 (Wasmtime 22+)** to ensure completeness:

| LogicN Capability Object | Underlyling WASI Core Interface Requirement | Native Host Enforcement Mechanic |
| --- | --- | --- |
| `FileSystem(FileSystemConstraint)` | `wasi:cli/environment`, `wasi:filesystem/preopens` | Wasmtime CLI mapping locks directories to individual paths using read-only filesystem markers. |
| `Network(NetworkConstraint)` | `wasi:sockets/tcp`, `wasi:http/outgoing-handler` | The OCI runtime restricts outgoing traffic to specified host network targets at the container level. |
| `EnvironmentKey(String)` | `wasi:cli/environment` | Dropping environment variables isolates execution context entirely from the parent machine. |
| `AuditAppendOnly` | `wasi:cli/stdout`, `wasi:cli/stderr` | System execution data streams directly into an un-spoofable, append-only container log collector. |

> **Warning for Phase 5 Component Design:** Because pure WASI does not support real-time path configuration adjustments mid-execution, your Dynamic Posture Matrix (DPM) can change state during execution, but it cannot expand its base permissions beyond what the host container allowed when the process launched. **The DPM functions purely as a monotonic subtraction engine—it can drop permissions instantly, but it can never expand them.**

---

## 5. Refactored DRCM Implementation Roadmap

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

---

## 6. Hardened Pure-Runtime Component Structure

```
                     ┌──────────────────────────────────────────────────────────┐
                     │ LAYER 2: HOST CONTAINER SYSTEM (OCI / gVisor Environment)│
                     │  - Mount Namespace Isolation (Read-Only Root File Map)   │
                     │  - Network Namespace Decoupling (No Ambient Interfaces)  │
                     │  - Native Process ID Segregation (Process as PID 1)      │
                     │  - Hardened Privileges Posture (no-new-privileges Flag)  │
                     └────────────────────────────┬─────────────────────────────┘
                                                  │
                                                  ▼
                     ┌──────────────────────────────────────────────────────────┐
                     │ LAYER 1: WASMTIME RUNTIME HOST CONTEXT                   │
                     │  - Declarative WASI Configuration Boundary               │
                     │  - Virtual Guard Segments (2GB Isolated Buffer Spaces)   │
                     └────────────────────────────┬─────────────────────────────┘
                                                  │
                                                  ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ DETERMINISTIC STATE SENTINEL ENGINE (Self-Hosted DSS.wasm Module)                                    │
 │                                                                                                      │
 │  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐   ┌─────────────────────┐ │
 │  │ ADMISSION CONTROL GATEWAY       │   │ DYNAMIC POSTURE REGISTER (DPM)  │   │ FUEL INJECTION      │ │
 │  │ - Validates Manifest CBOR Hashes│   │ - 32-bit Sovereign Control Word │   │ - Allocates Finely  │ │
 │  │ - Enforces ML-DSA-65 Signatures │   │ - Monotonic Subtraction Routing │   │   Bounded Budgets   │ │
 │  └────────────────┬────────────────┘   └─────────────────────────────────┘   └──────────┬──────────┘ │
 │                   │                                                                     │            │
 └───────────────────┼─────────────────────────────────────────────────────────────────────┼────────────┘
                     │                                                                     │
                     ▼                                                                     ▼
 ┌───────────────────┴─────────────────────────────────────────────────────────────────────┴────────────┐
 │ LAYER 0: EPHEMERAL GUEST WORKFLOW ISOLATES (Isolate-Per-Step Architecture)                           │
 │                                                                                                      │
 │  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐   ┌─────────────────────┐ │
 │  │ WORKFLOW STEP INSTANCE A       │   │ WORKFLOW STEP INSTANCE B       │   │ WORKFLOW STEP N     │ │
 │  │ - Sealed 4MB Linear Memory      │   │ - Complete Shared-Nothing State │   │ - Ephemeral Bounds  │ │
 │  │ - Immutable Input Snapshot Array│   │ - Pointer Traversal Prevention  │   │ - Isolated Context  │ │
 │  └────────────────┬────────────────┘   └────────────────┬────────────────┘   └──────────┬──────────┘ │
 └───────────────────┼─────────────────────────────────────┼───────────────────────────────┼────────────┘
                     │                                     │                               │
                     └─────────────────────────────────────┴───────────────┬───────────────┘
                                                                           │
                                                                           ▼
                     ┌─────────────────────────────────────────────────────┴────────────────────────────┐
                     │ STREAMING SECURITY INTERCEPTORS                                                  │
                     │                                                                                  │
                     │  ┌──────────────────────────────────────┐   ┌──────────────────────────────────┐ │
                     │  │ SECURE OUTPUT SINK MONITOR           │   │ EPILOGUE RECEIPT PIPELINE        │ │
                     │  │ - Length-Prefix Token Search Blocks  │   │ - Multi-Hash Generation Blocks   │ │
                     │  │ - Direct Cleartext Prefix Scanning   │   │ - Append-Only Ledger Packaging   │ │
                     │  └──────────────────────────────────────┘   └──────────────────────────────────┘ │
                     └──────────────────────────────────────────────────────────────────────────────────┘

```

---

## 7. Implementation Validation Procedures

To verify your Phase 1 security milestones before proceeding to compiler updates, execute these validation procedures against your Wasmtime runtime engine configuration:

1. **The WASI Directory Leak Test:** Attempt to run a compiled `.lln` module that explicitly tries to read the host engine system paths (such as `wasi:filesystem/preopens.get_directories`). The Wasmtime configuration pass must fail with an instantiation trap or return a zero-length array, validating complete filesystem containment.
2. **The Zero-Prefix Sink Trap:** Insert a dummy credential into the Secret Signature Cache monitor (e.g., `supersecretkey`). Execute a routine that formats a long diagnostic block containing that substring mixed into a text trace. The sink pipeline must capture the substring prefix and trigger an immediate termination exception, proving that data scrubbing happens before the payload reaches an external device.