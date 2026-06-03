# LogicN — Deterministic Runtime Containment Model (DRCM)

**Author:** Design analysis + architecture mapping (2026-06-03)  
**Status:** Design proposal — three tiers have different implementation readiness.  
**Research:** Deep-research workflow findings folded in where verified.

---

## My honest read of the concept

The revised document (vs the original "digital fortress" version) is substantially better —
but it still conflates three things that should be kept architecturally distinct:

1. **Compile-time invariants** — things the compiler proves before any code runs
2. **Runtime pre/post checks** — expressions evaluated immediately before/after each flow executes
3. **Emergency policy overlays** — reactive boundary tightening triggered by host-level signals

LogicN already covers category 1 almost completely. Category 2 is the genuinely new piece.
Category 3 requires a new `policy {}` contract block and a WASI host shim.

The most powerful single idea in the document is the **Monotonic Security Rule**:
*a runtime policy transition can only shrink the execution authority, never expand it.*
This is formally clean, directly implementable, and has no analogues in existing governed runtimes.

---

## What LogicN already covers

| DRCM concept | Already in LogicN | Gap |
|---|---|---|
| Derive taint constraints from `privacy {}` | ✅ `checkValueStates`, `source_from` annotation | Constraints not yet exported to `.lmanifest` |
| Compile-time proof that secrets don't reach sinks | ✅ LLN-SECRET-001/002/003 | Inter-flow taint (partial) |
| Monotonic deny-by-default for effects | ✅ effects are deny-by-default; omitted = pure | Emergency *overlay* tightening not wired |
| Cryptographic build evidence | ✅ GovernanceSignature (Ed25519 + ML-DSA-65), ProofGraph | Not yet exported as a standalone `.lmanifest` artifact |
| Termination proof | ✅ `decreases` annotation + LLN-TERM-001 | Full pre/post arithmetic invariants not checked |
| Per-flow audit trail | ✅ `RunResult.auditLog`, `AuditLog.write` | Not yet structured for QSA consumption |

---

## The Three-Tier Model — precisely defined

```mermaid
graph TB
    subgraph T1["Tier 1 — Explicit Invariants (Source file)"]
        EI1["contract { invariant { ensure ledger.credits == ledger.debits } }"]
        EI2["Verified: ProofGraph static pass + runtime pre/post check"]
        EI3["Scope: per-flow, declared by the developer"]
    end

    subgraph T2["Tier 2 — Derived Invariants (Compiler output)"]
        DI1["Automatically derived from privacy { deny CardholderData to TelemetryLog }"]
        DI2["Compiler emits: ensure CardholderData never_touches TelemetryLog"]
        DI3["Exported to: .lmanifest (signed, QSA-consumable)"]
    end

    subgraph T3["Tier 3 — Emergency Overlays (Runtime reactive)"]
        EO1["policy { emergency { on system_integrity_anomaly { deny Network.outbound } } }"]
        EO2["Monotonic rule: overlays can only TIGHTEN boundaries"]
        EO3["Triggered by: WASI host integrity signals"]
    end

    T1 -->|"ProofGraph builds T2 constraints"| T2
    T2 -->|"Manifest feeds T3 policy evaluation"| T3
    T3 -->|"Tightened authority feeds back to T1 checks"| T1

    style T1 fill:#1a3a5c,color:#fff
    style T2 fill:#1a5c3a,color:#fff
    style T3 fill:#5c1a1a,color:#fff
```

---

## Runtime execution with DRCM

```mermaid
flowchart TD
    A([".lln source"]) --> B["parseProgram"]
    B --> C["checkTypes\ncheckValueStates\ncheckEffects"]
    C --> D["verifyGovernance\n→ ProofGraph\n→ Derive T2 constraints"]
    D --> E["emit .lmanifest\n(signed: Ed25519 + ML-DSA-65)"]
    D --> F["emitGIR → WASM / tree-walker"]

    F --> G{{"FLOW INVOCATION"}}

    G --> H["① Pre-invariant check\ncontract.invariant.ensure()"]
    H -->|"PASS"| I["Execute flow body"]
    H -->|"FAIL"| J["❌ Abort: LLN-INV-001\nInvariantViolated"]

    I --> K["② Post-invariant check\ncontract.invariant.ensure() after"]
    K -->|"PASS"| L["Return result\nAppend to auditLog"]
    K -->|"FAIL"| M["❌ Abort: LLN-INV-002\nPostconditionViolated"]

    subgraph WASI["WASI Host Monitor (parallel)"]
        N["readIntegrityVector()\nBit 0: mesh tamper\nBit 1: clock anomaly\nBit 2: voltage fault\nBit 3: lockstep fail"]
        N -->|"anomaly detected"| O["Trigger T3 Emergency Overlay"]
    end

    O --> P["Apply policy.emergency\nMonotonic tightening only"]
    P --> G

    style J fill:#8b0000,color:#fff
    style M fill:#8b0000,color:#fff
    style O fill:#8b4000,color:#fff
    style WASI fill:#1a1a2e,color:#fff
```

---

## .lmanifest generation pipeline

```mermaid
flowchart LR
    subgraph COMPILE["Compile time"]
        A["Source .lln"] --> B["ProofGraph\n(per-flow obligations)"]
        B --> C["Derived T2 constraints\n(from privacy/taint)"]
        C --> D["GovernanceSignature\n(Ed25519 + ML-DSA-65)"]
    end

    subgraph MANIFEST[".lmanifest artifact"]
        E["schemaVersion: lln.manifest.v1"]
        F["sourceHash: sha256:..."]
        G["derivedConstraints: [\n  'CardholderData never_touches TelemetryLog',\n  'PAN requires redact() before AuditLog'\n]"]
        H["proofObligations: [...]"]
        I["signature: { ed25519: ..., mlDsa65: ... }"]
        J["generatedAt: ISO-8601"]
    end

    subgraph QSA["QSA / Compliance Consumer"]
        K["PCI DSS v4.0 assessor"]
        L["SOC 2 Type II auditor"]
        M["HIPAA compliance tool"]
    end

    D --> E
    D --> F
    D --> G
    D --> H
    D --> I
    D --> J

    I -->|"machine-verifiable"| K
    G -->|"data flow proof"| L
    H -->|"obligation evidence"| M

    style MANIFEST fill:#1a2a1a,color:#fff
    style QSA fill:#1a1a3a,color:#fff
```

---

## Emergency overlay activation

```mermaid
stateDiagram-v2
    [*] --> NORMAL : program starts

    NORMAL : Normal execution\nFull declared authority
    note right of NORMAL
        contract.effects{} fully active
        All network routes available
        Standard memory limits
    end note

    NORMAL --> ANOMALY_DETECTED : WASI integrity signal\n(clock/voltage/mesh fault)

    ANOMALY_DETECTED : Anomaly detected\nEvaluating risk tier

    ANOMALY_DETECTED --> TIER1_TIGHTEN : Low anomaly score\n(single bit flag)
    ANOMALY_DETECTED --> TIER2_QUARANTINE : Medium anomaly score\n(multiple flags)
    ANOMALY_DETECTED --> TIER3_ZEROIZE : High anomaly score\n(mesh tamper confirmed)

    TIER1_TIGHTEN : Tier 1 — Capability gate\ndeny Network.outbound\nrequire local_only_execution
    note right of TIER1_TIGHTEN
        Monotonic: cannot re-enable
        network.outbound once denied
    end note

    TIER2_QUARANTINE : Tier 2 — Demote + quarantine\nflush ephemeral scratchpad\nsuspend external connections\ndrop to immutable local loop
    
    TIER3_ZEROIZE : Tier 3 — Zeroize\nDestroy all key material\nTerminate execution\nLog final audit entry

    TIER1_TIGHTEN --> NORMAL : anomaly cleared\n(boundary stays tightened — monotonic)
    TIER1_TIGHTEN --> TIER2_QUARANTINE : escalation
    TIER2_QUARANTINE --> TIER3_ZEROIZE : escalation
    TIER3_ZEROIZE --> [*] : process terminated

    state "THE MONOTONIC RULE" as MONO {
        [*] --> bounded
        bounded : Once a T3 overlay fires,\nit CANNOT be reverted.\nAuthority can only shrink.
    }
```

---

## How it fits into the current LogicN runtime stack

```mermaid
graph TD
    subgraph STAGE_A["Stage A — TypeScript runtime (current)"]
        P["parseProgram"] --> TC["checkTypes\ncheckValueStates\ncheckEffects"]
        TC --> GV["verifyGovernance\n→ ProofGraph\n→ LiabilityProfile\n→ EpilogueReceipt"]
        GV --> GIR["emitGIR"]
        GIR --> RT["executeFlow\n(tree-walker / WASM / bytecode)"]
    end

    subgraph DRCM_LAYER["DRCM additions (proposed)"]
        INV["RuntimeInvariantChecker\n① pre-check before body\n② post-check after body"]
        MAN["ManifestEmitter\n.lmanifest (T2 constraints + sig)"]
        POL["EmergencyPolicyEngine\npolicy { emergency { ... } }\nMonotonic overlay application"]
        WASI["WasiIntegrityMonitor\nreadIntegrityVector()"]
    end

    subgraph STAGE_B["Stage B — self-hosted (100% complete)"]
        SBL["lexer.lln\nparser.lln\ntype-checker.lln\neffect-checker.lln\ngovernance-verifier.lln\ngir-emitter.lln\nruntime.lln"]
    end

    GV -->|"T2 constraints"| MAN
    RT -->|"before body"| INV
    INV -->|"after body"| RT
    WASI -->|"integrity signal"| POL
    POL -->|"tighten RuntimeManifest"| GV

    GIR --> SBL
    SBL -->|"pure LogicN execution"| RT

    style DRCM_LAYER fill:#2a1a0a,color:#fff,stroke:#ff8c00
    style STAGE_A fill:#0a1a2a,color:#fff
    style STAGE_B fill:#0a2a0a,color:#fff
```

---

## Implementation phases — what to build and in what order

```mermaid
gantt
    title DRCM Implementation Phases
    dateFormat  YYYY-MM
    section Phase 1 — .lmanifest (Low effort, HIGH audit value)
    Define .lmanifest schema          :done, 2026-06, 2026-07
    Export ProofGraph + T2 constraints :      2026-07, 2026-08
    Ed25519 + ML-DSA-65 signing        :      2026-07, 2026-08

    section Phase 2 — Runtime invariants (Medium effort)
    contract { invariant {} } grammar  :      2026-08, 2026-09
    RuntimeInvariantChecker (pre/post) :      2026-08, 2026-10
    LLN-INV-001/002 diagnostics        :      2026-09, 2026-10

    section Phase 3 — Emergency overlays (Medium effort)
    policy { emergency {} } grammar    :      2026-10, 2026-11
    MonotonicPolicyEngine              :      2026-10, 2026-12
    WASI host shim (integrity vector)  :      2026-11, 2027-01

    section Phase 4 — Full arithmetic invariants (High effort, research)
    SMT solver integration (Z3/CVC5)   :      2027-01, 2027-06
    Ledger-balance invariant proofs    :      2027-03, 2027-09
```

---

## The novel contribution — precisely stated

Most governed runtimes (OPA, Cedar, WASM Component Model) enforce policy *at call boundaries*.
LogicN's DRCM proposes something different:

> **Policy is a monotonically-shrinking state machine across the lifetime of a session,
> not a per-call decision.**

The difference:
- OPA: "is this *specific request* allowed?" → per-request evaluation
- Cedar: "does this *principal* have *permission* on this *resource*?" → per-authorization
- LogicN DRCM: "what is the *current authority envelope* for this session, given everything that has happened?" → monotonically-evolving state

This is closer to **CHERI capability revocation** (hardware-enforced monotonic capability loss)
or the **Biba integrity model** (no-write-up: data at a lower integrity level cannot contaminate
a higher level) — but applied at the *runtime session layer*, driven by *host telemetry*,
and expressed in the *source language* via `policy { emergency { ... } }`.

To the author's knowledge, no production programming language exposes this as a first-class
language construct. It would be genuinely novel.

---

## What I'd challenge in the original document

1. **"Compilation aborts when invariants are violated"** for `ensure ledger.credits == ledger.debits` —
   this requires a full SMT solver (Z3/CVC5) to check statically. Our `decreases` annotation
   checks *termination* (simpler). Arithmetic equality invariants across execution paths are
   generally undecidable. The honest position: LogicN can check them *at runtime* cheaply
   (just evaluate the expression), but static proof requires Dafny/Lean-level infrastructure.
   Phase 2 (runtime pre/post checks) is implementable now. Static proofs are Phase 4.

2. **`ensure CardholderData never_touches PublicTelemetryLog`** is already enforced — the
   value-state checker's `privacy { deny }` + `source_from` annotation already blocks this at
   compile time. The *novel* part is exporting that proof as a signed `.lmanifest` artifact
   that an auditor can machine-verify without reading source code.

3. **The WASI integrity vector** (readIntegrityVector() returning a 4-bit hardware status) does
   not currently exist in WASI Preview 2. It's a proposed extension. For a software-only
   implementation, the `policy.emergency` block can be triggered by *software* signals:
   abnormal memory growth, unexpected exception patterns, failed invariant checks.
   Hardware signals (mesh tamper, voltage fault) require the ASIC tier — which is correctly
   placed in the Future Research Appendix.

---

## Sources (from deep-research — to be filled in when workflow completes)

*This section will be updated with verified citations from the deep-research workflow.*
