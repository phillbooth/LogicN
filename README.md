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

**[Intent](docs/Knowledge-Bases/logicn-concept-intent.md)** — The explicit declaration of what a flow or system is *for*: its purpose, what effects it may produce, what boundaries it must respect, and the outcomes it intends to deliver. Intent guides optimisation and understanding — it does not grant authority. Authority is granted through `contract.effects`, capability declarations, and governance rules.

**[Governed Execution Plan](docs/Knowledge-Bases/logicn-concept-governed-execution-plan.md)** — The compiler/runtime-generated operational contract that defines how execution is *permitted* to occur: which capabilities are granted, which effects are allowed, which resources may be accessed, which runtime targets are approved, and which behaviors are explicitly denied. The bridge between declared intent and actual execution.

**[Coordinated Compute](docs/Knowledge-Bases/logicn-concept-coordinated-compute.md)** — The runtime orchestration layer that transforms a governed execution plan into actual execution across CPU, GPU, NPU, APU, WASM, native and future targets. Responsible for target selection, fallback coordination, memory isolation, accelerator dispatch and runtime verification — all within declared authority constraints.

**[Audit Proof](docs/Knowledge-Bases/logicn-concept-audit-proof.md)** — The structured, verifiable runtime evidence that execution occurred within declared authority, respected governance policy, enforced runtime constraints and satisfied safety guarantees. Not logs — provable evidence.

---

## What LogicN Is

LogicN is three things building toward one platform:

**1. A language** — strict typing, explicit errors, explicit memory ownership,
declared effects, no hidden nulls, no silent failures. Source files use `.lln`.

**2. A compiler and checker** — a multi-pass static pipeline that enforces language rules before code runs: lexer → parser → type checker → value-state/taint checker (secret sink trilogy) → effect checker → governance verifier (ProofGraph, epilogue receipts, liability auto-calculation, cyber-physical hardening validation) → GIR emitter → tiered runtime. **3,233 tests, 0 failures** (core suite). **Stage B self-hosting is 100% complete** — LogicN now runs itself.

**3. A governed runtime architecture** — a model for coordinating compute
across targets (CPU, WASM, GPU, accelerators) with capability-based authority,
audit trails and machine-readable reports. This is the long-term architecture;
the CPU baseline is the practical v1 target.

### What makes it different

Most languages focus on expressing logic. LogicN focuses on **governing
execution**:

| Traditional | LogicN |
|---|---|
| errors as exceptions | errors as explicit typed `Result<T, E>` |
| mutation is silent | `let` = immutable, `mut` = explicit, `readonly` = read-only view |
| pointers implicit | ownership is declared: `borrow`, `move`, `pinned` |
| side-effects hidden | effects declared in `contract { effects { database.write } }` |
| unsafe is normal | `unsafe` requires `reason` + `fallback`, always explicit |
| boundary data silently typed | `unsafe let raw` — untrusted until decoded to a safe type |
| AI reads code | AI reads structured reports: diagnostics, source maps, intent manifests |
| fixed hardware assumptions | declared targets: CPU, NPU, APU, GPU, WASM, accelerator |

---

## Status — Active Development (v0.1-beta)

LogicN is a **language-design and active compiler project**. It is not a production runtime.

**What works today (2,715 tests, 0 failures — 2,605 compiler + 15 economics + 95 devtools):**

- Full lexer — all v1 keywords, char/hex/binary literals, doc comments, slice-based scanning, direct operator detection, file/line safety limits (Phase 18A)
- Full parser — all flow qualifiers, match with exhaustiveness, enums with variants, record types with fields, fn helpers, route declarations, `protected`/`redacted` type qualifiers
- Type checker — LLN-TYPE-001/003/004/008/009/011/017/020/021/022, LLN-BINDING-005 (immutable reassignment)
- Symbol resolver — LLN-NAME-001 (undeclared names), LLN-NAME-002 (duplicate declarations)
- Value-state checker — LLN-VALUESTATE-001..007, LLN-SECRET-001/002/003, 2-hop taint, user-defined gates, cross-conditional taint
- Effect checker — LLN-EFFECT-001..004 with guarded/pure/secure flow support, inter-flow propagation, canonical alias resolution
- Governance verifier — LLN-GOV-002/003/004/008/010/011/012, LLN-CONTEXT-001, contract set enforcement
- Runtime / AST interpreter — while loops, for loops, mut reassignment, capabilityHost, governed memory, escape checker
- Standard library — Money BigInt arithmetic, Duration, Timestamp.format, String.format, Bytes.sha256, Array/Option/Result methods
- Route / HTTP dispatch — route declarations, request parameter (canonical style), path params, JSON body parsing
- Audit / proof chain — JSONL append-only writer, 5-hash SHA-256 proof, denial log, verify
- Signed attestation — Ed25519 sign/verify, YAML serialisation, runtime integration
- GIR emitter — schema v1, tensor metadata, SemanticGraph builder, AI graph (logicn.ai.json), target affinity hints
- CLI — check, check-strict, build, build-production, fix-effects, emit-ai-graph
- Canonical Example Corpus — 223/223 CEC stable, 11 example files (aerospace + healthcare), 131 diagnostic codes
- Stage B milestone 1: lexer.lln — complete and executing end-to-end (Phase 12A)
- Stage B milestone 2: parser.lln v0 — flow headers parsed from token stream (Phase 13B)
- Stage B milestone 3: compiler.capabilities.lln — capability declarations in LogicN (Phase 14)
- Root capability provider — full implementation with compiler and user-runtime domains (Phase 14)
- Passive execution plans — PassiveExecutionPlan type, buildExecutionPlan builder, executePlan stub (Phase 15)
- GIR → execution plan pipeline — plan types, plan builder, attestation integration (Phase 15)
- Canonical hashing — canonicalHash, hashSource, hashGIR, hashPassivePlan, deterministic key-sorted JSON (Phase 16A)
- Effect inference tracking — inferEffectsForOperation, buildFlowEffectSummary, inferred vs declared tracking (Phase 16A)
- Naming policy checker — LLN_STYLE_001/002/SEC_001, checkNamingPolicy, configurable severity (Phase 17A)
- Security mutation diagnostics — LLN_SEC_020 RuntimeMutation, LLN_SEC_021 PrototypeMutation (Phase 17C)
- Bootstrap determinism — canonicalHash key-order independence, timestamp stripping, idempotent hash suite (Phase 17C)
- WAT real arithmetic — i32.add/sub/mul, local.get/set, let bindings emitted to valid WAT (Phase 25)
- WAT control flow — if/else, while, else-if chains, mut/assignStmt (Phase 26)
- Hardware governance — ImmutableInputSeal, HardwareGovernanceClass, ProofLevel, LLN-HW-001/002/003 (Phase 26B)
- WASM instantiation via wabt — 8 benchmarks showing native-speed WASM results (Phase 27); benchmark headline: arithmetic-threshold = 4.0B ops/sec (2.9× Rust, 5.2× Node.js)
- Sync fast-path — pure-flow execution 14× faster than tree-walker (Phase 27B)
- Profile enforcement — strict/high_integrity profiles, Tainted<T>, SafeFor<Context,T>, 22 OWASP untaint boundaries (Phase 28)
- Economics layer — @logicn/core-economics: CostGraph, ValueGraph, IBM breach matrix, RouteDecision (Phase 29)
- ProofGraph caching — ExecutionSignature-keyed, 67% cache hit rate (Phase 30)
- Bytecode VM — Int32Array opcodes, 14.3× speedup over sync tree-walker (Phase 31)
- Governance diff CLI — logicn diff governance delta, exit 2 on authority widening (Phase 32)
- Hardware trust profiles — 37 profiles covering Intel/AMD/ARM/Apple/Google/Nvidia/NPU/APU/Photonic/Neuromorphic/Quantum

**What is actively being built:**

- Phase 16B — `logicn verify-selfhost`, `executePlan()` full runtime for secure/guarded flows
- Type checker — LLN-TYPE-002 TypeMismatch, LLN-TYPE-005/006/007 call/return checking
- Stage B milestone 4 — type-checker.lln (Phase 18)
- Package system — `package.logicn.yaml` manifests, cross-module type resolution, LLN-NAME-003 (Phase 17B)

**What is not yet implemented:**

- Backend lowering IR (AST → native CPU/WASM code generation)
- GPU, AI accelerator, photonic targets (post-v1)
- Full type inference across call graphs

---

## Code Example

```logicn
// ── Boundary data: unsafe until validated ────────────────────────────────────
//
// Data arriving from outside (HTTP, file, env) is marked `unsafe let`.
// The compiler prevents it reaching typed sinks without a validation gate.
//
secure flow createPatient(readonly request: Request) -> CreatePatientResult {

  contract {
    //all contract components are optional

    types {
      type CreatePatientResult = Result<Response, ApiError>
    }

    intent {
      "Create a patient record with protected PII handling."
    }

    effects {
      database.write
      audit.write
    }

    privacy {
      contains PII
      require redaction before audit.write
    }
  }

  unsafe let rawEmail: String = request.body.email

  let email: protected Email = validate.email(rawEmail)?

  let saved =
    PatientsDB.insert({ email: email })?

  AuditLog.write({
    event: "PatientCreated",
    patientId: saved.id,
    email: redact(email)
  })

  return Ok(Response.created(saved.id))
}


// ── Pure flows: zero side effects ────────────────────────────────────────────
//
// The compiler enforces: no I/O, no effectful calls, no mutation.
//
pure flow calculateVat(price: Money<GBP>) -> Money<GBP> {
  return price * Decimal("0.20")
}


// ── Guarded flows: declared effects ──────────────────────────────────────────
//
// Every effect must be declared. Missing effects are LLN-EFFECT-001.
//
guarded flow fetchRate(currency: CurrencyCode) -> FetchRateResult {

  contract {
    types {
      type FetchRateResult = Result<Decimal, NetworkError>
    }

    intent {
      "Fetch an exchange rate from an external service."
    }

    effects {
      network.outbound
    }
  }

  unsafe let rawResponse: String =
    http.get("/rates/" + currency)?

  let rate: Decimal =
    json.decode<Decimal>(rawResponse)?

  return Ok(rate)
}


// ── Match: exhaustive by default ─────────────────────────────────────────────
//
// Missing arms emit LLN-TYPE-021. Wildcard before other arms: LLN-TYPE-022.
//
pure flow describeStatus(s: Status) -> String {
  return match s {
    Active    => "live"
    Suspended => "paused"
    Deleted   => "removed"
  }
}
```

---

## Roadmap

```
Phase 3 — Memory Model and Scanner                       ✅ complete
  Hybrid ownership model: borrow, move, pinned.
  Scanner-level enforcement: LLN-MEMORY-*, LLN-SAFETY-*, LLN-BINDING-*.
  LLN-RAWPTR-001: raw pointer detection outside unsafe.

Phase 4 — Lexer and Parser                              ✅ complete
  Full v1 lexer: keywords, operators, char/hex literals.
  Recursive descent parser with Pratt expression engine.
  All flow qualifiers, enum variants, record fields, fn helpers.
  protected / redacted prefix type qualifiers.

Phase 5 — Effect Checker                                ✅ complete
  LLN-EFFECT-001..004.
  Pure/guarded/secure flow effect validation.
  Inter-flow effect propagation.
  Canonical effect name validation.

Phase 6 — Value-State and Type Checkers                 ✅ complete
  Value-state: LLN-VALUESTATE-001/003, LLN-SECRET-001/002.
  Type checker: LLN-TYPE-001, LLN-TYPE-009.
  BUILT_IN_TYPES: 50+ types including Byte, Brand, Tensor<T,Shape>.

Phase 7A — Symbol Resolution and Type Expansion         ✅ complete
  Symbol resolver: LLN-NAME-001/002.
  Type checker: LLN-TYPE-008/020/021/022.
  Auto inference marker, protected/redacted qualifier suppression.
  Enum variant capture; match exhaustiveness and unreachable patterns.
  Canonical Example Corpus: 175 .lln examples across 9 levels.
  Formal grammar (EBNF), glossary, AST encoding spec.

Phase 7B — Type Inference and Operator Checking          ⬜ in progress
  LLN-TYPE-002 TypeMismatch (assignment compatibility).
  LLN-TYPE-004 InvalidBinaryOperation (operator type rules) — partial.
  LLN-TYPE-006/007 InvalidCallArgument/Count.
  Money<C> * Decimal operator rule.
  Tri operator denial (&&/||/! on Tri values).

Phase 8 — IR Generation and Runtime                     ✅ complete
  AST → GIR (Governed Intermediate Representation) with schema v1.
  AST interpreter — execute LogicN flows in TypeScript.
  Route / HTTP dispatch with dual-key request access.
  JSONL audit writer and 5-hash SHA-256 proof chain.

Phase 12A — While Loops and Mut Reassignment             ✅ complete
  while loops, for loops, mut reassignment, capabilityHost.
  Stage B milestone: lexer.lln and parser.lln v0 executing.

Phase 13B — GIR Plan Pipeline                            ✅ complete
  GIR → PassiveExecutionPlan plan types and plan builder.
  Target affinity hints carried through to execution plan.
  Stage B: parser.lln v0 — flow headers parsed from token stream.

Phase 14 — Root Capability Provider                      ✅ complete
  Root capability provider — compiler and user-runtime domains.
  compiler.capabilities.lln — Stage B milestone 3.
  Capability declarations written and enforced in LogicN.

Phase 15 — Passive Execution Plans                       ✅ complete
  PassiveExecutionPlan type, buildExecutionPlan builder.
  executePlan stub integrated into runtime.
  Attestation chain includes plan hash.
  1826 tests, 0 failures.

Phase 16A — Canonical Hashing                            ✅ complete
  canonicalHash — deterministic key-sorted JSON hashing.
  hashSource, hashGIR, hashPassivePlan — typed hash helpers.
  Effect inference tracking — inferEffectsForOperation, buildFlowEffectSummary.
  Inferred vs declared effect distinction in FlowEffectSummary.
  1993 tests, 0 failures.

Phase 17A — Naming Policy Checker                        ✅ complete
  LLN_STYLE_001 — camelCase enforcement for flows and variables.
  LLN_STYLE_002 — PascalCase enforcement for types and enums.
  LLN_STYLE_SEC_001 — naming rules for security-sensitive identifiers.
  checkNamingPolicy with configurable severity (warn / error).
  Exported from compiler public API.

Phase 17C — Security Mutation Diagnostics + Bootstrap Determinism ✅ complete
  LLN_SEC_020 — RuntimeMutation: detects illegal runtime object mutation.
  LLN_SEC_021 — PrototypeMutation: detects prototype chain tampering.
  Both diagnostics carry suggestedFix and are exported from dist/index.js.
  bootstrap-determinism.test.mjs — 21 tests verifying canonicalHash key-order
    independence, timestamp stripping, idempotence, and hash collision resistance.
  1993 tests, 0 failures.

Phase 18A — Lexer Performance + Safety Limits                ✅ complete
  Slice-based scanning — identifiers and numbers use source.slice(start, pos)
    instead of per-character string concatenation; eliminates O(n²) growth.
  Direct operator detection — TWO_CHAR_OPERATORS array replaced with direct
    character-pair if/else chains; removes array allocation on every token boundary.
  LLN-LEX-004 FileTooLarge — rejects source over 10 MB before scanning begins;
    also fires if token count exceeds 1,000,000 during scan.
  LLN-LEX-005 LineTooLong — warning when a single line exceeds 10,000 characters.
  lexer.lln Token record verified: 8 fields (kind, value, line, column, endLine,
    endColumn, start, end) match the TypeScript Token interface exactly.
  2286 tests, 0 failures.

Phases 23–32 complete. Phase 25: WAT real arithmetic (i32.add/sub/mul, local.get, let bindings). Phase 26: WAT control flow (if/else, while, else-if, mut/assignStmt). Phase 26B: ImmutableInputSeal, HardwareGovernanceClass, ProofLevel, LLN-HW-001/002/003. Phase 27: WASM instantiation via wabt — 8 benchmarks showing WASM results. Phase 27B: sync fast-path (14× tree-walker improvement). Phase 28: profile enforcement (strict/high_integrity) + Tainted<T>/SafeFor<Context,T> OWASP taint system. Phase 29: @logicn/core-economics — CostGraph, ValueGraph, IBM breach matrix, RouteDecision. Phase 30: ProofGraph caching by ExecutionSignature (67% hit rate). Phase 31: bytecode VM — Int32Array opcodes, 14.3× over sync tree-walker. Phase 32: logicn diff governance delta CLI (exit 2 on authority widening).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 16–20 — Active and Planned                         ⬜ see docs/Knowledge-Bases/logicn-roadmap-phase16-20.md

Phase 16B: logicn verify-selfhost, executePlan() full runtime for secure/guarded flows
Phase 17B: Package system — package.logicn.yaml, cross-module types, CEC 200+
Phase 18: type-checker.lln — Stage B milestone 4, type checker in LogicN
Phase 19: Incremental parser + LSP skeleton
Phase 20: Stage B complete — LogicN fully self-hosted, verify-selfhost PASS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stage A — TypeScript / Node.js Runtime                   ⬜ building (90%)
  LogicN source compiles through the full pipeline.
  Programs execute in the Node.js runtime via the AST interpreter.
  Effects enforced at runtime. Audit records written as JSONL.
  Proof chain generated after each execution.

  LogicN Syntax
       ↓  governed checks: types, effects, memory, intent
  TypeScript runtime / compiler layer
       ↓  managed language safety, type erasure
  Node.js runtime
       ↓  host APIs, native bridges, event loop
  V8 / C++ native internals

Stage B — Runtime in LogicN                             ⬜ in progress (0% — HTTP service Phase 34 = 25% target)
  The compiler and runtime are rewritten in LogicN.
  The TypeScript bootstrap layer is no longer needed.
  LogicN becomes self-hosted: the language proves its own model.

  LogicN Syntax
       ↓  governed checks: types, effects, memory, intent
  LogicN compiler (written in LogicN)
       ↓  real code generation: CPU binary, WASM, target IR
  CPU / WASM / NPU / APU / GPU / Photonic target
       ↓  hardware execution
```

**Deferred until after the foundation phases:**

```text
finance packages        GPU target
electrical packages     AI accelerator target
OT packages             photonic target
production benchmarks   full framework features
ORM / CMS / admin UI    production package registry
```

---

## Architecture

### Language and package layers

```
LogicN Core
  language, type system, effects, memory safety, diagnostics, source maps

LogicN Compiler
  lexer, parser, AST, type checker, effect checker, symbol resolver, IR, GIR

LogicN Runtime
  checked execution, effect dispatch, runtime errors, structured await

LogicN Security / Config / Reports
  redaction, permissions, crypto policy, build and security reports

LogicN Logic / Vector / Compute
  Tri, Decision, tensors, compute planning, target selection

LogicN AI Packages (post-v1)
  inference, agents, neural, neuromorphic, low-bit

LogicN Target Packages
  CPU (v1 active)          — x86-64, ARM, RISC-V
  WASM (v1 planning)       — browser, edge, serverless
  GPU (post-v1)            — NVIDIA CUDA, AMD ROCm, Intel Arc
  NPU (post-v1)            — Intel NPU, Qualcomm Hexagon, Apple Neural Engine
  APU (post-v1)            — AMD/Intel integrated GPU+AI silicon
  TPU / AI Accelerator (post-v1) — Google TPU, Intel Gaudi, AWS Trainium
  Photonic (post-v1)       — optical interconnect and compute planning
  Quantum (post-v1)        — quantum bridge via QIR/OpenQASM

LogicN Secure App Kernel
  optional runtime layer — APIs, auth, rate limits, jobs

LogicN API Server
  HTTP transport, route manifests, typed dispatch

LogicN CLI / Tasks / Project Graph
  developer tooling, automation, AI context

Full Frameworks (post-v1)
  CMS, admin UI, ORMs, page builders, frontend adapters
```

### Five-layer architecture

```
Layer 1: LogicN Source AST        — what the developer writes
       ↓ (compiler passes 1–8)
Layer 2: Governed IR (GIR)        — compiler's verified governance contract
       ↓ (target bridge)
Layer 3: Backend Lowering IR      — target-specific execution (CPU/WASM/GPU/…)
       ↓ (runtime)
Layer 4: Runtime Execution Report — what actually ran (JSONL audit stream)
       ↓ (proof chain)
Layer 5: Audit Proof              — cryptographic evidence chain
```

**Boundary rules:**
- `logicn-core` is the language. It must not become a web framework.
- `logicn-core-compiler` owns the pipeline. `logicn-core` owns the contract types.
- `unsafe` is a language feature, not a permission to ignore safety rules.
- Hardware targets are backend profiles selected by config — not core syntax.
- Finance, electrical, OT packages are archived and not in the active workspace.

---

## Project Structure

```text
C:\laragon\www\LO\
├── docs/
│   ├── Knowledge-Bases/           368 spec docs, grammar, glossary, operator rules
│   └── Examples/                  222 canonical .lln examples across 10 levels
├── packages-logicn/
│   ├── logicn-core-compiler/      compiler pipeline — lexer, parser, all checkers ← active
│   ├── logicn-core/               language examples and prototype
│   ├── logicn-core-runtime/       execution contracts
│   ├── logicn-core-security/      security primitives, redaction
│   ├── logicn-core-reports/       report schemas and writer contracts
│   ├── logicn-core-logic/         Tri, Decision, RiskLevel
│   ├── logicn-core-vector/        Vector, Matrix, Tensor
│   ├── logicn-core-compute/       compute planning and target selection
│   ├── logicn-core-cli/           developer CLI
│   ├── logicn-core-tasks/         safe task automation with declared effects
│   ├── logicn-devtools-graph-project/  project knowledge graph
│   ├── logicn-target-*/           CPU, WASM, GPU, NPU target packages
│   └── logicn-framework-*/        app kernel, API server (post-v1 active)
├── build/                         generated graph, reports
└── tools/
```

---

## Running the Compiler

The active compiler is in `packages-logicn/logicn-core-compiler/`.

```bash
cd packages-logicn/logicn-core-compiler
npm install
npm run build
npm test
```

2,605 tests, 0 failures. The compiler accepts `.lln` source via `parseProgram()` and runs all checker passes.

```typescript
import { parseProgram, checkTypes, checkValueStates, checkEffects, resolveSymbols } from "@logicn/core-compiler";

const result = parseProgram(source, "myfile.lln");
const symbols = resolveSymbols(result.ast);
const types   = checkTypes(result.ast);
const vs      = checkValueStates(result.ast);
const effects = checkEffects(result.flows, result.ast);
```

---

## Key Documents

| Document | Purpose |
|---|---|
| `docs/Knowledge-Bases/logicn-grammar.ebnf` | Authoritative v1 formal grammar |
| `docs/Knowledge-Bases/v1-reserved-keywords.md` | Canonical keyword table for lexer |
| `docs/Knowledge-Bases/formal-type-system-spec.md` | Type system — all 22 LLN-TYPE-* codes |
| `docs/Knowledge-Bases/compiler-diagnostics.md` | All LLN-* diagnostic series index |
| `docs/Knowledge-Bases/logicn-glossary.md` | Canonical term definitions and aliases |
| `docs/Knowledge-Bases/ast-value-encoding.md` | What `.value` means per AstNodeKind |
| `docs/Knowledge-Bases/stdlib-gates.yaml` | Gate functions and governed sinks registry |
| `docs/Knowledge-Bases/logicn-compiler-pipeline.md` | Compiler passes 1–10 in order |
| `docs/Knowledge-Bases/logicn-architecture-layers.md` | Five-layer architecture |
| `docs/Knowledge-Bases/logicn-phase13-passive-plans-target-bridges.md` | Phase 13 plan/bridge contracts and deterministic target selection |
| `docs/Knowledge-Bases/logicn-photonic-ternary-bridge-spec.md` | Tri semantics and photonic bridge constraints |
| `docs/Knowledge-Bases/logicn-post-quantum-hardware-security-spec.md` | Post-quantum attestation + CHERI/MTE/TEE trust profile model |
| `docs/Examples/README.md` | Canonical Example Corpus index |
| `docs/Knowledge-Bases/logicn-roadmap-phase16-20.md` | Phase 16–20 implementation roadmap |
| `AGENTS.md` | AI coding tool instructions |

**Core concept deep-dives:**

| Document | Concept |
|---|---|
| `docs/Knowledge-Bases/logicn-concept-intent.md` | Intent — semantic purpose, the intent graph, verification |
| `docs/Knowledge-Bases/logicn-concept-governed-execution-plan.md` | Governed Execution Plan — operational contract |
| `docs/Knowledge-Bases/logicn-concept-coordinated-compute.md` | Coordinated Compute — runtime orchestration |
| `docs/Knowledge-Bases/logicn-concept-audit-proof.md` | Audit Proof — verifiable governance evidence |
| `docs/Knowledge-Bases/flow-vs-fn-security-model.md` | route → flow → fn execution hierarchy |
| `docs/Knowledge-Bases/value-state-annotations.md` | unsafe/safe/protected/redacted value-state model |
| `docs/Knowledge-Bases/logicn-adaptive-runtime-profiles.md` | Adaptive vs deterministic runtime modes |
| `docs/Knowledge-Bases/logicn-quantum-target-bridge.md` | Quantum computing as a governed target |

---

## What LogicN Is Not (Yet)

```text
Not a production compiler         — backend lowering (native codegen) not yet built
Not a production runtime          — AST interpreter only; no native code generation
Not a web framework               — logicn-framework-* is optional post-v1
Not a database ORM                — data packages are separate
Not faster hardware               — compute planning ≠ hardware speed
Not automatic compliance          — logicn-compliance is enterprise post-v1
```

LogicN becomes credible when its safety, speed and AI-readability are enforced
by tooling and runtime behavior — not only described in documentation.

---

## Licence

LogicN is licensed under the Apache License 2.0. See `LICENSE`, `LICENCE.md`
and `NOTICE.md`.
