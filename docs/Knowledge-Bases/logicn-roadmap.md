# LogicN — Implementation Roadmap

## Current State (2026-05-31)

```
2305 tests · 0 failures · ~72% Stage A weighted
222/222 CEC examples stable (all examples stable — gate cleared for Phase 25)
~22,000 lines TypeScript source (~52 source files)
~314 KB documents
```

---

## Completed Phases

| Phase | What shipped |
|---|---|
| Phase 1–4 | Lexer, parser, AST, flow/fn/route/match/enum/record |
| Phase 5–6 | Effect checker, value-state checker, type checker foundation |
| Phase 7A | Symbol resolver, generic arity, LLN-NAME-001/002 |
| Phase 7B | Type-check improvements, tensor arity decision |
| Phase 8A | Type inference (partial), Money cross-currency (LLN-TYPE-004) |
| Phase 8B | Standard library foundation |
| Phase 9A | Async interpreter, branded types (LLN-TYPE-003), BigInt decimal, Bytes.sha256, String.format(named), Timestamp.format |
| Phase 9B | Event checker (LLN-EVENT-001/002), contract set validation (LLN-GOV-011/012) |
| Phase 9C | Readable Logic Forms (`and`, `or`, `unless`, `is greater than`, …) |
| Phase 10A | Contract model expansion (16 sections), Ed25519 attestation |
| Phase 10B | errors/timeouts/retries/limits/privacy/observability contract sections |
| Phase 10C | LLN-GOV-003 response.denies, LLN-CONTEXT-001 context enforcement |
| Phase 11A | `mut` reassignment (LLN-BINDING-005), member access inference, record literal parser fix |
| Phase 11B | Two-hop taint propagation (LLN-VALUESTATE-005) |
| Phase 11C | Runtime layer skeleton: contractEnforcer, timeoutPolicy, retryPolicy, limitPolicy, capabilityHost, governedMemory |
| Type checker 98% | LLN-TYPE-010..019, complete inferType(), isAssignmentCompatible governess qualifier fix |
| Phase 12A | Loops (while/for each), assignment runtime, lexer.lln executing |
| Phase 13A/B | SemanticGraph, AI graph v2, CLI (logicn check/build/emit), LLN-SOURCE-ESCAPE-001 |
| Phase 14 | Root capability provider, compiler.capabilities.lln, LLN-BUILD-001 |
| Phase 15 | Passive execution plans, hashPassivePlan, executePlan wired, attestation integration |
| Lexer 99% | endLine/endColumn spans, slice-based scanning, direct operator lookahead |
| KB cleanup | 00-KB-INDEX.md, 11 v02 docs marked superseded, 24 aspirational docs marked future |
| Phase 16A | canonicalHash, hashGIR, hashSource, hashPassivePlan, bootstrap determinism tests (12 tests) |
| Phase 17A | Package manifest resolver, naming policy checker, LLN-STYLE-001/002 |
| Phase 17C | LLN_SEC_020/021 constants, project security audit (0 monkey patching found) |
| Phase 18A | Lexer: LLN-LEX-004..006, TokenKindId numeric enum, V1_DEPRECATED_RESERVED |
| Phase 18B | Package resolver: hash/signature/targets/compute/installScript, LLN-PKG-001..005, getResolverReport() |
| Phase 18 | Parser: full source spans, byteSpan, makeNode factory, emitWarning, recovery helpers (recoverToStatement/Block/ContractSection), LLN-SYNTAX-LEGACY-001, req→request |
| Phase 18 | NodeFlags (8 flags: HasContract/HasEffects/HasCompute/TensorCandidate/ReadonlyInputs/IsPure/IsSecure/HasPrivacy), prefer [gpu/npu/apu], preferHint AST node |
| Phase 18 | Monkey-patch checker: LLN-SEC-020/021 source-level detection |
| Phase 18C | ValueStateFlags (8 flags), SINK_REQUIREMENTS (structured registry), getSinkRequirement(), LLN-GATE-001 |
| Phase 18D | TypeId (56 IDs), EffectFlags (14 flags), ComputeCompatibilityFlags (7 flags), parseTensorType(), LLN-TYPE-030/031 |
| Phase 18E | EffectCheckerFlags (6 flags), FlowEffectSummary bitsets, EffectCheckerMode, LLN-EFFECT-005 (BroadAliasUsed — broad aliases now warning not error) |
| Phase 18F | GovernanceFlags (8 flags), RuntimeManifest type, governanceFlagsByFlow, runtimeManifests in GovernanceVerifyResult |
| Phase 18G | GIR: expanded tensor metadata (wasmSimd/gpu/npu/apu/fixedShape/quantized), sourceHash, entryPoints, allowedEffectsMask, paramDecl tensor extraction |
| Phase 18H | Stdlib registry: STDLIB_CAPABILITY_MAP (35+ functions), STDLIB_MODULE_KIND, TENSOR_STDLIB_OPS, TRI_STDLIB_OPS, getStdlibWasmImport(), LLN-STDLIB-001 |
| Phase 19A | LLN-STDLIB-001 enforcement wired into effect checker (File.readText without filesystem.read → compile error) |
| Phase 19B/C | WAT emitter improved, LEGACY_EFFECT_CALL_PATTERNS_COUNT tracked, WASM CLI modes added |
| Phase 20A/B | RuntimeManifest.requiredContext from contract.context, LLN-GOV-013 BoundaryViolation, BoundaryGraph types |
| Phase 21A-D | TypedArrayLoweringPlan, MonomorphisationPlan, KernelFusionPlan, LazyIteratorChain, PRODUCTION_ERASURE/DEV_ERASURE |
| Phase 22A-C | WASMSIMDCapability, WebGPUComputePlan, NPUKernelPlan, Arena from contract.memory |
| Phase 23A-D | APUSharedMemoryPlan, RegisterBytecodeModule (full opcode set), StringView/BytesView/TensorView, WASMLinearMemoryLayout |

---

## Phase 24 — Complete

Real WAT instruction bodies for pure flows. JS-based WAT assembler (no native binary dependency).
buildWATModule(), getWATImportsForEffects() exported. NativeCapabilityId constants defined.
222/222 CEC stable — Phase 25 gate cleared.

## Phase 25 — WASM Auth + Stage B Lexer Parity (In Progress)

Runtime: Node.js WebAssembly.instantiate (wasm-hybrid)
JS shell handles HTTP. WASM handles governed flow execution.

Streams:
  25A. verifyPassword: end-to-end LogicN→WAT→.wasm→Node→HTTP→WASM→HTTP response→audit
  25B. createSession
  25C. verifyToken  
  25D. Audit report + benchmark

Background: Phase 11D governed memory wiring, Stage B lexer token parity

Hard milestone: verifyPassword deployed, serving real HTTP, with audit trail

## Phase 26 — wasmtime Standalone + Healthcare

Runtime: wasmtime CLI (wasm-standalone)
Purpose: prove LogicN runs without Node.js, prove WASI imports
Example: healthcare (PHI governance, contract.privacy, redacted audit log)
Stage B: parser.lln parity

## Phase 27 — Deno Deploy + Native Tensor.dot + AI Inference

Runtime: Deno Deploy / edge cloud
Native: Tensor.dot as first native plugin (EDA, child-process isolation, DataHandle, Component Model ABI)
Example: AI inference with NPU dispatch, governed audit proof
Stage B: type-checker.lln parity

## Phase 28-29 — Stage B + Production

Phase 28: Full Stage B self-hosting (all milestones match TypeScript compiler)
Phase 29: Package registry, register VM, all 222 examples in --production mode

Rule: Every phase ships at least one production-grade example alongside the compiler work.

---

## Phase 11 — Remaining Items

### 11D — Governed Memory Blocks (skeleton done, full enforcement pending)

The `governedMemory.ts` skeleton tracks protected/redacted values. Phase 11D makes it real:

- [ ] Attach `GovernedValueTag` to `protected`/`redacted` `LogicNValue` instances at creation
- [ ] Capability check in `capabilityHost.ts`: verify the calling flow has access to a governed value
- [ ] `canAccess()` enforces that `protected Email` owned by `createPatient` can only be read by flows with the right capability
- [ ] Runtime report includes governed memory access log
- [ ] `LLN-RUNTIME-005`: attempt to access governed value from unauthorized flow

**Prerequisite for:** High-security deployments, TEE integration, CHERI capability mapping

---

### 11E — Package/Import System (biggest CEC unlock)

Currently all examples are single-file. Domain types like `Email`, `PatientId`, `CurrencyCode` are unresolved, keeping ~60 Level 8/9 examples as draft.

- [ ] `import Email from "@logicn/healthcare-types"` — AST resolution
- [ ] Module-scoped symbol registry
- [ ] `package.logicn.yaml` manifest per package
- [ ] Cross-module type sharing
- [ ] `use ContractSetName` resolving across packages
- [ ] **LLN-NAME-003**: cross-module shadow

**Impact:** CEC stable count jumps from ~108 → ~170+

---

### 11C Wiring — Connect contractEnforcer into interpreter

The `contractEnforcer.ts` and `capabilityHost.ts` are built but not connected to the actual execution path.

- [ ] Wire `contractEnforcer` into `executeFlow()` — extract contract from AST, create enforcer
- [ ] Connect `capabilityHost` to `executeFlow()` — pass to Interpreter constructor
- [ ] `timeoutPolicy` actually aborts flows after deadline
- [ ] `retryPolicy` actually retries failed capability calls
- [ ] `limitPolicy` actually rejects requests over size
- [ ] Runtime report emitted per secure flow execution

---

### 11B.2 — Custom Gate Annotations *(in progress)*

- [x] User-defined gate detection by name prefix (`validate*`, `sanitize*`, `check*`, `verify*`, `parse*`, `decode*`) — implemented in `value-state-checker.ts`, `collectUserGates()` + `isGateCallName()` updated
- [x] `collectUserGates(ast)` walks fnDecl nodes and registers gate functions
- [x] Gate functions break the taint chain in `isTaintedExpression()` and `isGateExpression()`
- [x] Tests added to `tests/value-state-checker.test.mjs` (6 new test cases)
- [ ] `@gate` annotation syntax in parser (deferred — name-prefix convention covers common cases)
- [ ] Flow-level gate registry (`stdlib-gates.yaml` formal `@gate` entry)
- [ ] Cross-file gate declarations (blocked on Phase 11E package/import system)

---

## Phase 12 — Stage B: LogicN Compiles LogicN

**Goal:** The TypeScript bootstrap is replaced. The compiler and runtime are written in LogicN and compiled by themselves.

### Stage B Prerequisites

| Component | Required | Current |
|---|---|---|
| Parser | 95%+ | 91% |
| Type checker | 90%+ | 97% ✅ |
| Symbol resolver | 90%+ | 80% |
| Standard library | 85%+ | 68% |
| Runtime execution | 85%+ | 78% |
| Package/import system | Working | Phase 17A+ in progress |
| Loops/iteration | Basic while/for each | ✅ Phase 12A |
| Assignment expressions | mut x = x + 1 | ✅ Phase 12A |

### Stage B Milestones

```
Milestone 1: src/lexer.lln                    [SPEC WRITTEN]
  The LogicN lexer written in LogicN.
  Compiled by TypeScript bootstrapper.
  Produces identical token stream.
  First proof that LogicN can describe its own tools.
  Spec: docs/Knowledge-Bases/logicn-lexer-lln.md
  Target: Phase 25 (token parity).

Milestone 2: src/parser.lln
  The LogicN parser written in LogicN.
  Uses lexer.lln output.

Milestone 3: src/type-checker.lln
  Type checking written in LogicN.

Milestone 4: self-hosted compilation
  logicn build src/lexer.lln --target native
  produces a binary that lexes LogicN source.

Milestone 5: full bootstrap
  logicn build src/ --self-hosted
  removes the TypeScript compiler entirely.
```

### Stage B Gap (currently ~14%)

Primary blockers:
1. **Package/import system** (11E) — the compiler is multi-file; Phase 17A manifest resolver done, AST import resolution pending
2. **Stdlib completeness** — String processing, file I/O, collections
3. **WAT instruction bodies** (Phase 24) — needed before lexer.lln can be compiled to WASM

---

## Phase 13 — Execution Targets

### Passive Execution Plans

Convert the current AST-walking interpreter into a plan-based executor:

```yaml
flow: getPatient
steps:
  - read_context: [actor, trace_id]
  - validate: patientId
  - capability: host.database.read
  - capability: host.audit.write
  - response.okJson: [patientId, name]
```

Benefits: auditable, cacheable, faster, easier to compile to WASM/native.

### Target Bridges

| Target | Status | Priority |
|---|---|---|
| Native/CPU | Current interpreter | ✅ Working |
| WASM | Sandboxed execution | Phase 13A |
| GPU | Tensor/matrix workloads | Phase 13B |
| NPU | Local AI inference | Phase 13B |
| Photonic | High-throughput tensor | Phase 13C |
| Quantum | Optimisation sampling | Phase 13D |

### WASM Sandbox (Phase 13A)

```text
logicn-parser.wasm    — sandboxed parsing
logicn-runtime.wasm   — sandboxed execution with controlled capabilities
```

Tree-sitter-style incremental parsing + WASM isolation = safe AI-agent edit loops.

---

## Phase 13 — Semantic Graph System

- [ ] SemanticGraph as canonical semantic layer (built from AST, queryable)
- [ ] logicn check --emit-semantic-graph → build/semantic/semantic-graph.json
- [ ] logicn check --emit-ai-graph → build/semantic/logicn.ai.json
- [ ] TypeGraph (supports LLN-TYPE-* diagnostics via graph)
- [ ] IntentGraph (supports LLN-INTENT-* diagnostics via graph)
- [ ] Gradual capability/effect inference in dev mode (logicn dev --infer-effects)
- [ ] logicn fix --effects command
- [ ] IDE direct graph query (callers, capability chain, effect propagation, trust boundaries)

---

## Phase 14 — Stage B Self-Hosting Infrastructure

- [ ] Root Capability Provider (compiler authority isolated from user program authority)
- [ ] Compiler declares its own capabilities in LogicN source
- [ ] Compiler Phase Memory Boundaries (arena-based, deterministic cleanup)
- [ ] Deterministic Self-Host Verification (B1 → B2 → B3 output hash comparison)
- [ ] logicn verify-selfhost command
- [ ] LLN-BUILD-001 NON_DETERMINISTIC_BUILD diagnostic
- [ ] CompilerGraph in LLN-Graph (self-analysis)

---

## Phase 14 — Security Hardening

### Capability Hardware

- **CHERI capability model**: protected values carry access rights at the reference level — maps directly to LogicN's `protected`/`redacted` governed memory blocks
- **ARM Memory Tagging Extension (MTE)**: hardware tagging of protected value regions
- **Trusted Execution Environments (TEE)**: high-security signed runtime reports, FIPS 140-3 cryptographic modules for attestation
- **Post-quantum signing**: ML-DSA (FIPS 204) replacing Ed25519 for signed attestation

### Parser Security (incremental + bounded)

- [ ] Parser depth limits (max nested braces, max generic depth)
- [ ] Token count limits per file
- [ ] Tree-sitter-style incremental parsing for IDE/AI-agent mode
- [ ] Parser fuzz testing with AFL/libFuzzer
- [ ] `logicn-parser.wasm` as isolated parser service

---

## Execution Order Recommendation

```
NOW (active):
  25   — WASM Auth + Stage B lexer token parity (verifyPassword hard milestone)
  11D  — Governed Memory Blocks (full enforcement)
  11E  — Package/import system (CEC unlock)
  11C  — Wire contractEnforcer into execution

NEXT:
  26   — wasmtime standalone, Healthcare example, Stage B parser parity
  27   — Deno Deploy, native Tensor.dot, AI inference, Stage B type-checker parity

THEN:
  28   — Stage B full self-hosting (all milestones match)
  29   — Package registry, Register VM production, all 222 examples in --production
```

---

## Key Principles (driving all decisions)

```
Interpreter for correctness.
Execution plan for speed.
Capability host for security.
Runtime report for proof.

Lexer/parser: boring, deterministic, bounded, recoverable.
Fast parser = better AI loop.
Safe parser = trustworthy compiler.
Stable parser = stronger audit proof.

Source stays stable.
Targets evolve.
Governance remains above every target.
```

---

## Phase 17 — Application Pattern Keywords

Adds the first-class keywords needed to express the Application Patterns handbook
(see `docs/patterns/applications/README.md`).

| Feature | Pattern | Description |
|---|---|---|
| `resource {}` | 01 — CRUD Resource | Declares a governed CRUD resource with effect-bounded read/write/delete flows |
| `command`/`query` annotations | 03 — Commands & Queries | Separates read and write flows; compiler infers effects from annotation |
| `stateMachine {}` | 06 — State Machines | Named states with guarded, compiler-checked transitions |
| `service {}` keyword | 10 — Microservices | Declares a service boundary with its own manifest and capability set |
| `logicn docker init` | Docker integration | Generates a governed Dockerfile + capability manifest from a `service {}` declaration |

### Phase 17 Prerequisites

- Phase 11E (package/import system) — `service {}` needs cross-module types; Phase 17A manifest resolver complete, full import AST resolution pending
- Phase 15 (passive execution plans) — complete; `stateMachine {}` transitions map to plan steps
- Semantic graph (Phase 13A/B) — complete; `resource {}` and `command`/`query` need graph-queryable intent nodes

---

## See Also

- `logicn-phase-11-decisions.md` — decisions 1-11 recorded
- `logicn-phase-10-roadmap.md` — Phase 10 completion notes
- `logicn-governed-memory-blocks.md` — Phase 11D spec
- `capability-registry.yaml` — capability ↔ effect mapping
- `logicn-contract-full-model.md` — 16-section contract reference
- `logicn-signed-attestation.md` — Ed25519 / ML-DSA attestation pipeline
- `logicn-semantic-graph-system.md` — Phase 13 SemanticGraph canonical semantic layer
- `logicn-intent-graph.md` — IntentGraph and LLN-INTENT-* diagnostics via graph
- `logicn-stage-b-root-capability-provider.md` — Root Capability Provider for Stage B self-hosting
- `logicn-compiler-phase-memory-boundaries.md` — Compiler Phase Memory Boundaries (arena-based)
- `logicn-deterministic-selfhost-verification.md` — Deterministic Self-Host Verification (B1→B2→B3)
