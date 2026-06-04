# LogicN

LogicN aims to be the language of choice for software that handles money, personal information, healthcare data, and public services.

Built for financial, medical, government, and enterprise platforms, LogicN introduces governance, privacy, authority, and auditability directly into the architecture of an application, helping organisations reduce risk while building secure and transparent systems.

---

The language is designed from the ground up so that execution intent, capability boundaries, memory ownership, and effects are **declared in source and enforced by tooling** — not inferred, guessed, or left to convention. It targets CPUs, GPUs, NPUs, APUs, WASM and future heterogeneous hardware.

> **New here?** → [**SETUP.md**](SETUP.md) — install on Windows, Linux, or macOS · run your first benchmark · explore the examples · Hello World with full comments

---

## Build Progress

> **Benchmark headline (Phase 27 WASM):** arithmetic-threshold = **4.0B ops/sec** — 2.9× faster than Rust, 5.2× faster than Node.js
> **GPU headline (Phase 38 Deno WebGPU):** NVIDIA RTX 2060 = **4.01M ops/sec** — first real GPU number

**Post-Quantum and Hardware Security** — CHERI capability hardware, ML-DSA-65 attestation (NIST FIPS 204), ARM MTE, TEE

```
▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   8%  (Ed25519 Phase 39 · ML-DSA-65 hybrid Phase 55 · HW trust profiles spec · CUDA backend Phase 58 pending PATH)
```

**Photonic / Ternary Computing** — TriState types, balanced ternary logic, photonic backend bridge

```
▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   3%  (TriState type · Tri stdlib ops · GIRTensorInfo.photonic_compatible · NativeCapabilityId.PhotonicBridge reserved)
```

**Passive Execution Plans and Target Bridges** — Phase 13: GIR → Plan → CPU/GPU/NPU/WASM/Photonic

```
▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░  22%  (plan types + builder + executePlan wired · WAT emitter Phase 24 · wasm-hybrid Phase 25)
```

**Runtime written in LogicN** — Stage B: LogicN compiler compiles itself ← Major achievement milestone

```
████████████████████████████████  100%  (cross-module imports, record literals, for loops, observable effects, String/Int methods. 21 bootstrap tests. LogicN is its own runtime.)
```


**TypeScript Runtime** — Stage A: compiler pipeline + execution engine running on Node.js

```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  100%  (3,109 compiler · 15 economics · 95 graph · 14 security = 3,233 (core) · 127 devtools/ext = 3,360 full total · 0 failures · reproduce: `node scripts/run-all-tests.js --core`)
```

| Layer | Status | % |
|---|---|---|
| **Specification / KB** | 400+ docs, 223/223 CEC stable, governed-runtime research, ASIC/cyber-physical hardening, C++ bridge, fortified typed logic, wasmtime roadmap | 100% |
| **Lexer** | All v1 keywords, TokenKindId, LLN-LEX-001..006, FlatTokenStream; `Array<Int>=` fused-token fix | 98% |
| **Parser** | `for` loops (range + iterator), record literals, `match Some(x)` destructuring, cross-module `import`, generic type skip | 96% |
| **Type checker** | LLN-TYPE-001..022 + tensor, `Auto` deferral (LLN-TYPE-023), `Int.toStr()` + `String.length()` + method dispatch widened | 84% |
| **Value-state checker** | Secret sink trilogy (LLN-SECRET-001/002/003); list/record/inter-flow taint; `source_from` annotation (Network → auto-tainted) | 100% |
| **Effect checker** | LLN-EFFECT-001..005, LLN-STDLIB-001, EffectCheckerFlags | 84% |
| **Governance verifier** | LLN-GOV-001..020 + LLN-TERM-001; ProofGraph + sha256_seal EpilogueReceipt; LiabilityProfile auto-calc; `decreases` annotation | 100% |
| **Contract blocks** | All 16 blocks parsed + validated — `limits {}` typo (GOV-019), broad authority (GOV-020), high-risk proof nudge (GOV-006), intent mismatch (GOV-001) | 100% |
| **GIR emitter** | GIR v1, tensor metadata, `field`/`arrlit`/`reclit`/`matche`/`arm` ops, WAT emitter + SIMD ops | 80% |
| **Stdlib** | 40+ functions: path sandbox, ReDoS guard, BCrypt/Argon2, SSRF guard, `toStr()` `length()` `contains()` `append()` `unwrapOr()` | 75% |
| **Runtime interpreter** | sync fast-path (14×), tier telemetry (5 tiers); Stage B: `RunResult{retVal, auditLog}`, record literals, for loops, cross-module imports | 85% |
| **WAT emitter + assembler** | i32 arithmetic, if/else, while, locals — Phase 27 complete; wabt assembly; governance-cost: **3.2K/s → 1.88M/s via WASM (588×)** | 88% |
| **WASM Execution** | 10/10 benchmarks; arithmetic-threshold **4.0B/s**; gpu-compute 4.17M/s (RTX 2060); governed wins data-query outright | 100% |
| **Economics Layer** | CostGraph, ValueGraph, IBM breach-risk matrix, RouteDecision; `contract.economics {}` auto-by-default | 68% |
| **Governance Signatures** | Ed25519 v1 + ML-DSA-65 hybrid (NIST FIPS 204); sha256_seal live; zk_snark_receipt Phase 1 stub | 65% |
| **Security (Taint/Profiles)** | LLN-TAINT-001..006, LLN-PROFILE-001..007+005B, OWASP 24-boundary, **PCI DSS 4.0.1** (LLN-PCI-001..010) | 80% |
| **Stage B self-hosting** | **100%** — LogicN compiles and runs itself. 21 bootstrap tests. Strings, records, lists, for/match, observable effects, cross-module imports. | **100%** |
| **DevTools** | naming · context receipts · BM25 search · data lineage · **PCI DSS 4.0.1 audit** · security audit (3,127 tests) | 100% |
| **Ext packages** | `logicn-ext-secrets-vault` (Vault, dual-token rotation, zero-wipe) · `logicn-ext-proof-snarkjs` (Groth16 Phase 1) | 75% |
| **Live .lln services** | 39 files: auth-service routes + aerospace/healthcare/AI/wasm examples — all parse 0 errors | 97% |
| **Password API** | BCrypt → Password facade → Argon2id → auto-migration | 90% |
| **Tier Telemetry** | executionTier + fallbackReason on every FlowExecutionResult — 5 tiers | 100% |
| **Governance Diff CLI** | `logicn diff` — governance delta, exit 2 on authority widening | 82% |
| **Package resolver** | LLN-PKG-001..005, 11-package type registry, cross-module import resolution | 75% |

---

### Roadmap — next phases

| Layer | Current | Target | Notes |
|---|---|---|---|
| **Bytecode VM** | 50% | 80% | Int32Array opcodes, callExpr support — accelerates the tree-walker interim tier |
| **Passive execution plans** | 40% | 70% | Plan types + hashPassivePlan + executePlan — needed for multi-target dispatch |
| **CLI / Package layout** | 75% | 100% | Refactoring to support `npm install -g @logicn/cli`, Linux server deployment |
| **Stage B → native WASM** | — | — | Compile `runtime.lln` itself through WAT emitter → `wasmtime logicn-runtime.wasm program.lln` (no Node.js). Baseline recorded: governance-cost 3.2K/s → target ~500M/s |
| **SoA Arena** | 35% | 60% | SoANodeArena, FlatTokenStream — high-performance data layout for hot paths |
| **GPU/NPU/APU dispatch** | 16% | 40% | WebGPUComputePlan, NPUKernelPlan — full heterogeneous hardware routing |

---

*Stage A (TypeScript Runtime) remains the production path.
Stage B (Runtime in LogicN) is now **100% complete** — LogicN compiles and runs itself end-to-end with no TypeScript in the pipeline.
The TypeScript bootstrap is the production-hardened entry point; Stage B proves the governance model applies to the compiler itself.*

---

```text
intent
    ↓
governed execution plan
    ↓
coordinated compute
    ↓
audit proof
```

**[Intent](docs/Knowledge-Bases/logicn-concept-intent.md)** — The explicit declaration of what a flow is *for*: purpose, effects it may produce, boundaries it must respect. Intent guides optimisation; it does not grant authority. Authority is granted through `contract.effects` and capability declarations.

**[Governed Execution Plan](docs/Knowledge-Bases/logicn-concept-governed-execution-plan.md)** — The compiler-generated operational contract: which capabilities are granted, which effects are allowed, which targets are approved, and which behaviours are explicitly denied.

**[Coordinated Compute](docs/Knowledge-Bases/logicn-concept-coordinated-compute.md)** — The runtime orchestration layer that transforms a governed execution plan into actual execution across CPU, GPU, NPU, APU, WASM and future targets — all within declared authority constraints.

**[Audit Proof](docs/Knowledge-Bases/logicn-concept-audit-proof.md)** — The structured, verifiable runtime evidence that execution occurred within declared authority. Not logs — cryptographically signed, provable evidence.

---

## What LogicN Is

LogicN is three things building toward one platform:

**1. A language** — strict typing, explicit errors, declared effects, no hidden nulls, no silent failures. Source files use `.lln`.

**2. A compiler and checker pipeline** — lexer → parser → type checker → value-state/taint checker → effect checker → governance verifier → GIR emitter → tiered runtime. Every check has a diagnostic code. **3,127+ tests, 0 failures**. Stage B self-hosting is **100% complete** — LogicN compiles and runs itself.

**3. A governed runtime architecture** — capability-based authority, machine-readable ProofGraph, post-quantum governance signatures, PCI DSS 4.0.1 audit, Deterministic Runtime Containment Model (DRCM) with monotonic security overlays.

### What makes it different

| Traditional | LogicN |
|---|---|
| Errors as exceptions | Explicit `Result<T, E>` — no silent failure |
| Mutation is silent | `let` = immutable · `mut` = explicit · `readonly` = view |
| Side-effects hidden | Effects declared: `contract { effects { database.write } }` |
| Boundary data silently typed | `unsafe let raw` — untrusted until gated |
| AI guesses at structure | Machine-readable ProofGraph + intent manifests |
| Security checked at runtime | Compile-time: taint, secrets, PCI DSS, governance proofs |
| Fixed hardware | Declared targets: CPU · WASM · GPU · NPU · APU · Photonic |

---

## Code Examples

> **LogicN three-block structure:** every flow has up to three outer blocks:
> 1. `flow name(params) -> ReturnType` — signature
> 2. `contract { ... }` — compile-time governance declaration (outside the body, not inside it)
> 3. `policy { ... }` — runtime monotonic overlay (optional, DRCM Phase 4)
> 4. `{ body }` — the runtime code
>
> `contract {}` and `policy {}` are **separate blocks**, not nested. Most flows only need `contract {}` and `{ body }`.

```logicn
// ── Governed secure flow: PII handling ───────────────────────────────────────
//
// contract {} is OUTSIDE the body braces — it is a compile-time declaration.
// The compiler reads it before any code runs, verifies intent against effects,
// builds the ProofGraph, and enforces data-flow rules.
//
// Anatomy:
//   secure flow name(params) -> ReturnType    ← signature
//   contract { ... }                          ← compile-time governance declaration
//   {                                         ← body opens here
//     ...runtime code...
//   }

secure flow createPatient(readonly request: Request) -> CreatePatientResult
contract {
  types   { type CreatePatientResult = Result<Response, ApiError> }
  intent  { "Create a patient record with protected PII handling." }
  effects { database.write  audit.write }
  privacy { contains PII  require redaction before audit.write }
}
{
  unsafe let rawEmail: String = request.body.email
  let email: protected Email  = validate.email(rawEmail)?
  let saved = PatientsDB.insert({ email: email })?
  AuditLog.write({ event: "PatientCreated", patientId: saved.id, email: redact(email) })
  return Ok(Response.created(saved.id))
}


// ── Pure flow: zero side effects, compiler-proved ────────────────────────────
pure flow calculateVat(price: Money<GBP>) -> Money<GBP>
contract { intent { "Calculate 20% VAT on a GBP price." } }
{
  return price * Decimal("0.20")
}


// ── Match: exhaustive by default ─────────────────────────────────────────────
pure flow describeStatus(s: Status) -> String
contract { intent { "Map a status enum to a display string." } }
{
  match s {
    Active    => { return "live" }
    Suspended => { return "paused" }
    Deleted   => { return "removed" }
  }
}


// ── Secrets: vault-backed, never in plaintext ─────────────────────────────────
// contract.secrets {} is auto-by-default (uses .env).
// Declare only when vault/KMS rotation is needed.
secure flow charge(amount: Int) -> Result<Int, String>
contract {
  intent  { "Charge a customer using a vault-backed API key." }
  effects { audit.write  network.outbound }
  secrets {
    credential payment_key { provider "hashicorp_vault"  path "secret/data/payment" }
    rotation { interval 1h  strategy smooth_handshake  on_rotation_fault halt }
  }
}
{
  AuditLog.write("Charge initiated")
  return Ok(amount)
}
```

---

## Architecture Patterns

LogicN has nine canonical patterns. Patterns 1–6 compile today (`drcm_stable_v0`). Patterns 7–9 require DRCM phases (marked `drcm_core_v1`). Each has a verified `.lln` example in `tests/patterns/`.

| # | Pattern | Profile | When to use |
|---|---|---|---|
| 1 | [Pure Transform](tests/patterns/pattern-01-pure-transform.lln) | stable | Math, string transforms, data mapping — no I/O, no side effects |
| 2 | [Governed API Route](tests/patterns/pattern-02-governed-api-route.lln) | stable | HTTP routes, webhooks, event handlers — external ingress |
| 3 | [High-Trust Mutation](tests/patterns/pattern-03-high-trust-mutation.lln) | stable | Payments, medical records, government data — full contract |
| 4 | [Cross-Boundary Workflow](tests/patterns/pattern-04-cross-boundary-interim.lln) | stable | External APIs / third-party calls — uses `security.interim` until `step` ships |
| 5 | [Secret-Using Flow](tests/patterns/pattern-05-secret-using-flow.lln) | stable | Any flow that reads a credential — `secrets {}` + `SecureString` taint guards |
| 6 | [Multi-Tier Service](tests/patterns/pattern-06-multi-tier-service.lln) | stable | API → business logic → data layer — three separate governed flows |
| 7 | [Governed WASM Module](tests/patterns/pattern-07-governed-wasm-module.lln) | `drcm_core_v1` | DRCM Phase 5 — DSS supervision, DWI isolates, fuel injection |
| 8 | [Emergency Policy Overlay](tests/patterns/pattern-08-emergency-policy.lln) | `drcm_core_v1` | DRCM Phase 4 — auto-tightening `policy { emergency { ... } }` |
| 9 | [.lmanifest Compliance](tests/patterns/pattern-09-lmanifest.md) | `drcm_core_v1` | DRCM Phase 3 — machine-verifiable compliance artifact for PCI DSS / SOC 2 |

> Full reference: [`docs/Knowledge-Bases/logicn-architecture-patterns.md`](docs/Knowledge-Bases/logicn-architecture-patterns.md)

---

## Architecture

### Compiler pipeline

```
.lln source
  ↓ lexer          — tokenise, LLN-LEX-001..006
  ↓ parser         — AST, flow/contract/match/record/for/import
  ↓ symbol resolver — LLN-NAME-001..003
  ↓ type checker   — LLN-TYPE-001..023
  ↓ value-state    — LLN-VALUESTATE/SECRET/TAINT/GATE
  ↓ effect checker — LLN-EFFECT-001..005
  ↓ governance     — LLN-GOV-001..020, LLN-TERM-001, ProofGraph
  ↓ GIR emitter    — Governed Intermediate Representation
  ↓ tiered runtime — cache · bytecode VM · sync · WASM · tree-walker
```

### Package layout

```
packages-logicn/
├── logicn-core-compiler/     ← active: full pipeline, 3,127 tests
├── logicn-core-runtime/      execution contracts + WASI boundaries
├── logicn-core-economics/    CostGraph, ValueGraph, breach-risk matrix
├── logicn-core-security/     taint profiles, redaction, OWASP boundaries
├── logicn-core-logic/        Tri, Decision, RiskLevel
├── logicn-core-vector/       Vector, Matrix, Tensor
├── logicn-core-compute/      target planning and selection
├── logicn-core-cli/          developer CLI (check/build/diff)
├── logicn-devtools-security/ runSecurityAudit, PCI DSS 4.0.1
├── logicn-devtools-naming/   LLN-NAMING-001..005
├── logicn-devtools-context/  context receipts (51-97% token reduction)
├── logicn-devtools-intelligence/ BM25 hybrid code search
├── logicn-devtools-provenance/ data lineage, W3C PROV-JSON
├── logicn-devtools-pci/      PCI DSS 4.0.1 (LLN-PCI-001..010)
├── logicn-devtools-benchmarks/ 23 benchmarks across all runtimes
├── logicn-ext-secrets-vault/ HashiCorp Vault — dual-token rotation
├── logicn-ext-proof-snarkjs/ Groth16 Phase 1 zk-SNARK prover
└── logicn-target-*/          CPU · WASM · GPU · NPU target packages

examples/
└── auth-service/             31 governed flows (verifyPassword, charge, sovereign...)

docs/Knowledge-Bases/        400+ specification documents
```

### Five-layer execution stack

```
Layer 1: LogicN Source          — what the developer writes (.lln)
       ↓ compiler pipeline
Layer 2: Governed IR (GIR)      — verified governance contract
       ↓ target bridge
Layer 3: WASM / bytecode / native — compiled execution
       ↓ runtime
Layer 4: RunResult              — retVal + auditLog (observable effects)
       ↓ governance
Layer 5: ProofGraph + .lmanifest — cryptographic audit proof (Ed25519 + ML-DSA-65)
```

---

## Running the Tools

```bash
# Run tests (core suite)
node scripts/run-all-tests.cjs --core        # 3,233 tests, 0 failures

# Full benchmark suite (~5-10 min)
cd packages-logicn/logicn-devtools-benchmarks
npm run run && npm run compare

# Compile a .lln program to WASM and run it
logicn build examples/auth-service/sovereignTransaction.lln
logicn run   examples/auth-service/verifyPassword.lln --invoke verifyPassword
logicn check examples/auth-service/verifyPassword.lln

# Run .wasm binary without Node.js
wasmtime --invoke main build/benchmark.wasm   # → 5050

# Security + PCI audit sweep
node packages-logicn/logicn-devtools-security/dist/cli.js audit examples/auth-service/verifyPassword.lln
node packages-logicn/logicn-devtools-pci/dist/cli.js audit examples/auth-service/
```

---

## Key Documents

### Start here
| Document | What it covers |
|---|---|
| [SETUP.md](SETUP.md) | Install on Windows / Linux / macOS, benchmarks, Hello World |
| [`docs/Knowledge-Bases/KNOWLEDGE-BASE-INDEX.md`](docs/Knowledge-Bases/KNOWLEDGE-BASE-INDEX.md) | **Master navigation guide** — 4-layer KB hierarchy, conflict resolution, feature gate manifest |

### Language reference
| Document | What it covers |
|---|---|
| `docs/Knowledge-Bases/logicn-governance-rules.md` | Numbered rule registry — 35+ LLN codes, enforce status, correct/wrong examples |
| `docs/Knowledge-Bases/logicn-architecture-patterns.md` | 9 canonical patterns with `@experimental_profile` feature gates |
| `docs/Knowledge-Bases/logicn-contract-authoring-guide.md` | How to write correct contracts — clause optionality, AI safety pipeline |
| `docs/Knowledge-Bases/logicn-contract-economics.md` | `economics {}` block — auto-inference, explicit override |
| `docs/Knowledge-Bases/logicn-design-secrets-epilogue-blocks.md` | `secrets {}` and `epilogue {}` — auto-by-default, vault/KMS rotation |
| `docs/Knowledge-Bases/logicn-grammar.ebnf` | Authoritative v1 formal grammar |

### Architecture and security
| Document | What it covers |
|---|---|
| `docs/Knowledge-Bases/logicn-engineering-goals.md` | **3 architectural goals** — native speed, single-cycle bitmask, no system crash; acceptance tests |
| `docs/Knowledge-Bases/logicn-deterministic-runtime-containment.md` | DRCM — DSS, DWI, V_DPM monotonic security, `.lmanifest`, 7-module architecture |
| `docs/Knowledge-Bases/logicn-domain-guard-policies.md` | Domain guard policies — `[conforms_to: X]` static manifest clamping |
| `docs/Knowledge-Bases/logicn-governed-design-synthesis.md` | Research synthesis — 14-category mediation model, change-class review workflow |
| `docs/Knowledge-Bases/logicn-governed-runtime-research-2026-06-03.md` | 113-agent deep research: Cedar/OPA/Pony/Austral/Koka/in-toto/W3C-PROV enhancements |

### Benchmarks and deployment
| Document | What it covers |
|---|---|
| `docs/Knowledge-Bases/logicn-wasmtime-baseline.md` | Benchmark baseline (governance-cost 3.2K/s → 1.88M/s after WASM = 588×) |
| `docs/Knowledge-Bases/logicn-completion-roadmap-2026-06-03.md` | Six-layer path to full platform |
| `docs/Knowledge-Bases/logicn-wasmtime-roadmap.md` | Path from Stage B → `wasmtime logicn-runtime.wasm` |
| `docs/Examples/README.md` | Canonical Example Corpus (223 CEC stable) |

---

## Licence

LogicN is licensed under the Apache License 2.0. See `LICENSE`, `LICENCE.md` and `NOTICE.md`.
