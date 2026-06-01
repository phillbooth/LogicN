# LogicN

LogicN aims to be the language of choice for software that handles money, personal information, healthcare data, and public services.

Built for financial, medical, government, and enterprise platforms, LogicN introduces governance, privacy, authority, and auditability directly into the architecture of an application, helping organisations reduce risk while building secure and transparent systems.

---

The language is designed from the ground up so that execution intent, capability boundaries, memory ownership, and effects are **declared in source and enforced by tooling** — not inferred, guessed, or left to convention. It targets CPUs, GPUs, NPUs, APUs, WASM and future heterogeneous hardware.

---

## Build Progress

> **Benchmark headline (Phase 27 WASM):** arithmetic-threshold = **4.0B ops/sec** — 2.9× faster than Rust, 5.2× faster than Node.js

**Post-Quantum and Hardware Security** — CHERI capability hardware, ML-DSA attestation, ARM MTE, TEE

```
▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5%
```

**Photonic / Ternary Computing** — TriState types, balanced ternary logic, photonic backend bridge, Tri.and/or/not/match

```
▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   3%  (TriState type · Tri stdlib ops · GIRTensorInfo.photonic_compatible · NativeCapabilityId.PhotonicBridge reserved)
```

**Passive Execution Plans and Target Bridges** — Phase 13: GIR → Plan → CPU/GPU/NPU/WASM/Photonic

```
▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░  22%  (plan types + builder + executePlan wired · WAT emitter Phase 24 · wasm-hybrid Phase 25)
```

**Runtime written in LogicN** — Stage B: LogicN compiler compiles itself ← Major achievement milestone

```
███████▌░░░░░░░░░░░░░░░░░░░░░░░  25%  (Phase 34 ACHIEVED — verifyPasswordService.lln IS a live governed HTTP service)
```

**TypeScript Runtime** — Stage A: compiler pipeline + execution engine running on Node.js

```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  100%  (2,696 tests · 0 failures · 223/223 CEC stable · Phases 25-34 complete · Security Audit Pass 2 complete)
```

| Layer | Status | % |
|---|---|---|
| Specification / KB | 368+ docs, 223/223 examples stable, hybrid WASM v1.0, security anti-abuse, Phase 32 complete | 99% |
| Lexer | All v1 keywords, TokenKindId, V1_DEPRECATED_RESERVED, LLN-LEX-001..006, slice scanning, FlatTokenStream | 97% |
| Parser | NodeFlags (8 flags), byteSpan, recovery helpers, prefer [gpu/npu], contract.memory/network/hardware | 92% |
| Type checker | LLN-TYPE-001..022, LLN-TYPE-030/031 (tensor), branded types, TypeId registry (R5 complete) | 80% |
| Value-state checker | Taint, 2-hop, ValueStateFlags, SINK_REQUIREMENTS, LLN-GATE-001 | 85% |
| Effect checker | LLN-EFFECT-001..005, LLN-STDLIB-001 wired, EffectCheckerFlags, 31 legacy regex tracked | 84% |
| Governance verifier | LLN-GOV-002..014, GovernanceFlags, RuntimeManifest, LLN-HW-001/002/003, ProofGraph caching | 85% |
| GIR emitter | GIR v1, tensor metadata (7 flags), TypedArray lowering plan wired, WAT emitter + SIMD ops | 74% |
| Stdlib | STDLIB_CAPABILITY_MAP (35+ functions), path sandbox (F3), regex ReDoS guard (F8) | 65% |
| Package resolver | LLN-PKG-001..005, 11-package type registry, cross-module import resolution (R3 complete) | 75% |
| Runtime interpreter | sync fast-path (14× tree-walker), bytecode VM (auto-routed), ProofGraph caching (67% hit rate) | 78% |
| WAT emitter + assembler | i32.add/sub/mul, if/else, while, mut/assign, WASM instantiation via wabt — Phase 27 complete | 88% |
| WASM Execution | 8/8 benchmarks at native speed; arithmetic-threshold 3.7B/s (4.7× faster than Node.js) | 95% |
| Economics Layer | CostGraph, ValueGraph, IBM breach matrix, RouteDecision, economics auto-inferred — Phase 29+33 | 65% |
| Security (Taint/Profiles) | LLN-TAINT-001..006, LLN-PROFILE-001..007/005B, OWASP 24-boundary catalogue, F1-F8 hardened | 72% |
| Bytecode VM | Int32Array opcodes, 14.3× over sync tree-walker, auto-routed in executeFlow — Phase 31 | 45% |
| Governance Diff CLI | logicn diff — governance delta, exit 2 on authority widening, AI_INDEX, spec manifest | 82% |
| Type registry | TypeId (56 IDs), EffectFlags (14), GovernanceFlags (8), NativeCapabilityId (6) | 78% |
| Security policy | Tainted<T>, LLN-PROFILE-001..007, LLN-TAINT-001..004, profile enforcement (strict/high_integrity) | 65% |
| SoA Arena | SoANodeArena (Int16/Int32 parallel arrays), FlatTokenStream (stride-4), FusedPass scaffold | 35% |
| Lowering plans | TypedArrayLoweringPlan wired in GIR, MonomorphisationPlan/KernelFusionPlan stubs | 22% |
| Register VM | runFromGraph() fast-path live (LOAD_CONST/SLOT/BINOP/RETURN), emitBytecode stub | 20% |
| Views | StringView, BytesView, TensorView<T>, WASMLinearMemoryLayout — WASM linear memory types | 20% |
| GPU/NPU/APU plans | WebGPUComputePlan, NPUKernelPlan, APUSharedMemoryPlan, NativePluginManifest | 16% |
| Hybrid WASM–Native | v1.0 architecture document, EDA model, DataHandle, Component Model ABI spec | 18% |
| Boundary graph | BoundaryGraph types, getUnauthorisedCrossings() in devtools | 28% |
| Monkey-patch checker | LLN-SEC-020/021 source-level detection, AST + text level | 85% |
| devtools-graph | BFS/DFS/topo, flag queries, CapabilityGraph, BoundaryGraph, WASMModuleGraph, NativeCapabilityQuery | 74% |
| Stage B self-hosting | All 4 files parse with 0 errors: lexer.lln, parser.lln, type-checker.lln, compiler.capabilities.lln | 32% |
| Passive execution plans | Plan types + builder + attestation + hashPassivePlan + executePlan wired | 40% |
| Examples | 223/223 CEC stable + 11 example files (aerospace + healthcare) | 92% |
| Photonic / Ternary | TriState type, Tri stdlib ops, photonic_compatible flag, NativeCapabilityId.PhotonicBridge | 3% |
| CLI | check, check-strict, build, build-production, build-deterministic, --target wasm-standalone/hybrid | 88% |

---

*Stage A (TypeScript Runtime) and Stage B (Runtime in LogicN) proceed in parallel.
Stage A is the production path; Stage B proves the governance model by applying it
to the compiler itself. When Stage B is complete, the TypeScript bootstrap is no
longer needed.*

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

**2. A compiler and checker** — a pipeline that enforces the language rules
before code runs. Phases 3–15, 16A, 17A, 17C, 18A–32, and R1-R7 runtime enforcement are complete (2,605 tests, 0 failures, 223/223 CEC stable). The
HTTP service (Phase 34) and Stage B self-hosting compiler are the current focus.

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
secure flow createPatient(readonly request: Request) -> CreatePatientResult

contract {
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
{
  unsafe let rawEmail: String =
    request.body.email

  let email: protected Email =
    validate.email(rawEmail)?

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
guarded flow fetchRate(currency: CurrencyCode) -> FetchRateResult

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
{
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
  match s {
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
