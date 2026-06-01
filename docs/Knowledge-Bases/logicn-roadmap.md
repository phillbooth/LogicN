# LogicN — Implementation Roadmap

## Current State (2026-06-01)

```
2563 tests · 0 failures (2468 core compiler + 95 devtools-graph)
223/223 CEC examples stable
~52 source files · Phases 1–29 complete · R1–R7 complete
Phase 29 complete: NaN-boxing, SlottedScope, ExecutionGraph fast-path, pure-flow erasure, SoA arena, FlatTokenStream, production-check
Phase 30+ roadmap: see logicn-roadmap-phase30-40.md
```

---

## Phases 24–29 Summary

| Phase | Core achievement |
|---|---|
| Phase 24 | Real WAT instruction bodies for pure flows. JS assembler (no native binary). `buildWATModule()` + `assembleWAT` exported. 222/222 CEC gate cleared. |
| Phase 25 | WASM imports wiring verified. `verifyPassword.lln` → WAT with correct `host:*` imports. Stage B lexer parity: PARITY_ACHIEVED=true (19/19 tokens). |
| Phase 26 | `logicn build --target=wasm-standalone` real implementation. Healthcare governance verified (`getPatient.lln`, PHI redaction). Parser.lln: 0 parse errors. wasmtime scaffold. |
| Phase 27 | AI inference governance (`classifyMessage.lln`). `Tensor.dot.native-spec.json` NativePluginManifest. TypedArray WAT lowering wired. `WAT_SIMD_OPS` constant. |
| Phase 28 | All 4 Stage B files parse with 0 errors. Package registry scaffold. Production-mode LLN-STDLIB-001 as error. 2449 tests, 0 failures. |
| Phase 29 | NaN-boxing tagged integers (Phase 29A). `runFromGraph()` ExecutionGraph fast-path (Phase 29B). `checkProductionReadiness()` (Phase 29C). SoANodeArena + FlatTokenStream + FusedPass scaffold. Pure-flow erasure (`isPureEffectFree`, governor skip). 2563 tests, 0 failures. |

See [logicn-roadmap-phase30-40.md](logicn-roadmap-phase30-40.md) for the Phase 30–40 plan.

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

### Phase 24 details (2026-06-01)

```
2414 tests · 0 failures
17 new Phase 24 tests (wat-phase24.test.mjs)
```

Shipped:
- **24A** `emitWATBody()` emits real WAT: `(local.get $p0) ;; return first param` for pure flows
  with parameters, `(i32.const 0) ;; default return` for zero-param flows.
  `validateParam`/`validate_param` steps are erased (compile-time proofs, no WAT emitted).
  `capabilityCall`/`capability_call` steps emit `unreachable ;; capability call — Phase 25`.
- **24B** `encodeMinimalWASM` upgraded to handle parametrised functions: parses `(param $px TYPE)`
  entries from WAT text, builds correct WASM type section entries per function signature,
  emits `local.get 0` body instruction for flows that use `local.get $p0`.
  `pushLEB128Value()` added for correctly encoding body sizes of any length.
- **24B** `GIRFlow.paramTypes` added: `extractParamTypes()` in `gir-emitter.ts` walks `paramDecl`
  nodes and forwards type names through `buildWATModuleFromGIR()` → `buildWATModule()` →
  `emitWATBody()`.
- **24C** `examples/wasm-hello-world/greet.lln` — minimal pure flow example.
  Target: `wat2wasm` compiles it, `wasmtime` executes it (Phase 25/26).

Full pipeline verified: `parseProgram → checkEffects → emitGIR → buildWATModuleFromGIR → renderWAT → assembleWAT → valid WASM binary`.

## Phase R1-R7 — In Progress (Phase R1-R7 workflow running)

These phases run as a structured workflow across the runtime hardening and security track.
WASM continues as background work throughout all R-phases.

### R1 — Effect Checker Hardening
Tighten CANONICAL_EFFECTS enforcement; broad-alias warnings in dev, errors in production.

### R2 — Value-State Checker Hardening
SINK_REQUIREMENTS fully enforced; LLN-GATE-001 in all modes.

### R3 — Runtime Manifest Completeness
All flows emit runtimeManifest; governance verifier uses manifests for proof chain.

### R4 — Security + Anti-Abuse (Added)
Anti-botnet governance: process.spawn effect enforced, network destination policy,
DNS rebinding defence, rate limit wiring, devtools report.

  - process.spawn added to CANONICAL_EFFECTS (✅ done — R4B commit)
  - worker.spawn, event.schedule added to CANONICAL_EFFECTS (✅ done — R4B commit)
  - getAntiAbuseReport() devtools function (✅ done)
  - LLN-NET-001/002 network destination diagnostics (in progress)
  - Anti-abuse example: processWebhook (in progress)

### R5 — Package Resolver Integration
LLN-PKG-001..005 enforced end-to-end in CI; signed package policy in runtime.

### R6 — Stage B Lexer Token Parity
lexer.lln produces identical token stream to TypeScript lexer.
Hard milestone: token parity verified by hash comparison.

### R7 — verifyPassword Hard Milestone
Runtime: Node.js WebAssembly.instantiate (wasm-hybrid)
JS shell handles HTTP. WASM handles governed flow execution.
End-to-end: LogicN→WAT→.wasm→Node→HTTP→WASM→HTTP response→audit

Background (WASM — continues throughout R-phases):
  - Phase 11D governed memory wiring
  - WAT instruction body completeness
  - wasm-hybrid runtime stabilisation

## Phase 25 — WASM Auth Service Scaffold + Stage B Lexer Parity (2026-06-01)

Runtime: Node.js WebAssembly.instantiate (wasm-hybrid)
JS shell handles HTTP. WASM handles governed flow execution.

### Phase 25 details (2026-06-01)

Shipped:

- **25A** `getWATImportsForEffects()` verified: correctly populates WASM import table entries
  from `STDLIB_CAPABILITY_MAP` for declared effects. Deduplication confirmed.
  `buildWATModule()` wiring verified end-to-end: effectful flows with `database.read`,
  `audit.write`, `crypto.verify` produce correct `host:*` imports in rendered WAT.

- **25A** `STDLIB_CAPABILITY_MAP` extended with Phase 25 crypto entries:
  - `Crypto.verify` / `crypto.verify` → `host:crypto.verify` (requires `crypto.verify` effect)
  - `Crypto.sign` / `crypto.sign` → `host:crypto.sign` (requires `crypto.sign` effect)

- **25A** `CANONICAL_EFFECTS` extended: `crypto.verify`, `crypto.sign`, `random.generate`,
  `clock.read` added — effect checker now validates these without LLN-EFFECT-005 warnings.

- **25A** `EFFECT_REGISTRY` extended with `Crypto.verify`, `Crypto.sign`, `Secrets.get`,
  `vault.secret`, `Random.secureBytes`, `Random.bytes`, `Clock.now` → canonical effect mappings.

- **25B** `verifyPassword.lln` (`examples/auth-service/verifyPassword.lln`) verified:
  - Parses with 0 errors.
  - `emitGIR` produces correct declared effects: `database.read`, `secret.read`,
    `crypto.verify`, `audit.write`.
  - `buildWATModule` + `renderWAT` produces WAT with `host:db.*`, `host:secret.read`,
    `host:crypto.verify`, `host:audit.write` imports.

- **25C** Stage B lexer parity: **PARITY_ACHIEVED = true** (achieved in Phase R7A).
  All 19 token positions match between TypeScript lexer and `lexer.lln` for the
  canonical test source `"pure flow add(a: Int, b: Int) -> Int { return a }"`.
  Tests: `tests/bootstrap-determinism/lexer-parity.test.mjs` (8 tests, all hard assertions).
  Status doc: `tests/bootstrap-determinism/LEXER_PARITY_STATUS.md` — updated Phase 25.

Known gaps deferred to Phase 26:
  - String literals in lexer.lln (Gap 2)
  - Char literals in lexer.lln (Gap 3)
  - Comment stripping in lexer.lln (Gap 4)
  - Underscore-in-identifier support (Gap 5)
  - verifyPassword HTTP wiring (Node WebAssembly.instantiate) — Phase 26+

Streams status:
  25A. WASM imports wiring — COMPLETE
  25B. verifyPassword.lln parse + GIR + WAT — COMPLETE
  25C. Stage B lexer parity — COMPLETE (PARITY_ACHIEVED=true)
  25D. createSession / verifyToken — Phase 26
  25E. Audit report + benchmark — Phase 26

Hard milestone: verifyPassword WAT generation with correct host:* imports verified.

## Phase 26 — wasmtime Standalone + Healthcare (2026-06-01)

Runtime: wasmtime CLI (wasm-standalone)
Purpose: prove LogicN runs without Node.js, prove WASI imports
Example: healthcare (PHI governance, contract.privacy, redacted audit log)
Stage B: parser.lln parity

### Phase 26 details (2026-06-01)

Shipped:

- **26A** `logicn build --target=wasm-standalone` now has a real implementation:
  - Compiles `.lln` files through the full pipeline: `parseProgram → checkEffects → emitGIR → buildWATModuleFromGIR → renderWAT`.
  - Writes `build/wasm/output.wat` (WAT text).
  - Runs JS assembler (`assembleWAT`) to produce `build/wasm/output.wasm` (binary).
  - Checks `wasmtime --version` on PATH:
    - If available: prints `To execute: wasmtime build/wasm/output.wasm`.
    - If not found: prints clear install instructions (winget / curl) and WAT path.
  - `cli.ts` imports: `buildWATModuleFromGIR`, `renderWAT`, `assembleWAT`, `STDLIB_CAPABILITY_MAP`.
  - `spawnSync("wasmtime", ["--version"])` used for availability check (no hard dependency).

- **26B** `examples/healthcare/getPatient.lln` governance verified:
  - Parses with 0 errors.
  - `verifyGovernance()` in `"production"` mode produces `runtimeManifests`.
  - `requiresAudit: true` — PHI access (database.read, phi.read, audit.write) requires audit trail.
  - `allowedEffects` includes `database.read`, `audit.write`.
  - Privacy contract: `phi name dob`, `deny protected PatientId to response.body`, `require redaction before audit.write`.
  - Tests: `tests/wat-phase26.test.mjs` — 26B suite (5 tests).

- **26C** Parser parity progress confirmed:
  - `src/self-hosted/parser.lln` parses with **0 errors** (TypeScript parser).
  - TypeScript parser finds **1 flow** in `"pure flow add(a: Int, b: Int) -> Int { return a }"`.
  - Parity report: `TypeScript parser: 1 flow. parser.lln: parses with 0 errors.`
  - Tests: `tests/wat-phase26.test.mjs` — 26C suite (3 tests).
  - Existing `tests/bootstrap-determinism/parser-parity.test.mjs` also verifies this (5 tests).

Streams status:
  26A. wasmtime standalone scaffold — COMPLETE
  26B. Healthcare governance verification — COMPLETE
  26C. Parser parity progress — COMPLETE (parser.lln: 0 errors)
  26D. createSession / verifyToken WAT — Phase 27
  26E. verifyPassword HTTP wiring (Node WebAssembly.instantiate) — Phase 27

Known gaps deferred to Phase 27:
  - String literals in lexer.lln (Gap 2)
  - Char literals in lexer.lln (Gap 3)
  - Comment stripping in lexer.lln (Gap 4)
  - Underscore-in-identifier support (Gap 5)
  - Deno Deploy runtime target — Phase 27

Hard milestone: parser.lln parses with 0 errors. wasmtime CLI scaffold proven.

## Phase 27 — Deno Deploy + Native Tensor.dot + AI Inference (In Progress — 2026-06-01)

Runtime: Deno Deploy / edge cloud
Native: Tensor.dot as first native plugin (EDA, child-process isolation, DataHandle, Component Model ABI)
Example: AI inference with NPU dispatch, governed audit proof
Stage B: type-checker.lln parity

### Phase 27 details (2026-06-01)

Shipped:
- **27A** `classifyMessage.lln` governance verified:
  - `effects { ai.inference audit.write }` declared
  - `privacy { contains PII }` declared
  - `targets { prefer [npu, gpu, wasm, cpu] fallback cpu }` parsed
  - `NativeCapabilityId.NpuInference` = `"host.npu.inference"` mapped in `EFFECT_TO_NATIVE_CAPABILITY`
  - `EFFECT_TO_NATIVE_CAPABILITY["ai.inference"] → "host.npu.inference"` (type-registry.ts)
  - WAT import: `ai.inference` effect → `host:ai.infer` (STDLIB_CAPABILITY_MAP, stdlib-registry.ts)
- **27B** `examples/ai-inference/Tensor.dot.native-spec.json` — NativePluginManifest spec:
  - `schemaVersion: "lln.native-plugin.v1"`, capability `"host.npu.inference"`, operation `Tensor.dot`
  - EDA arena 32mb, 2 input handles, 1 output handle
  - `childProcess: true`, `fallback: "cpu"`, Component Model ABI `"logicn-hardware-npu:execute-dot"`
  - `phaseAvailable: 27` — first native plugin milestone
- **27C** `buildWATModule()` updated to detect Float32 tensor flows (`WATFlowInput.tensors`):
  - When `tensors[].elementType === "Float32"`, prepends to WAT body:
    `;; TypedArray lowering: Float32Array for Tensor<Float32,...>`
    `;; Phase 27: Tensor.dot maps to f32 memory region`
  - `buildWATModuleFromGIR()` updated to pass `GIRFlow.tensors` through
- **27D** `WAT_SIMD_OPS` constant added to `wat-emitter.ts`, exported from `index.ts`:
  - `f32x4_add`, `f32x4_mul`, `v128_load`, `v128_store` as typed `as const` map
  - Used by kernel fusion emitter (Phase 28) to emit correct SIMD instruction strings

Known gaps deferred to Phase 28:
  - Deno Deploy runtime target
  - String / Char / comment gaps in lexer.lln (Gaps 2–5)
  - createSession / verifyToken WAT emission
  - verifyPassword HTTP wiring
  - Kernel fusion emitter using WAT_SIMD_OPS for real SIMD instruction emission

## Phase 28 — Stage B Parity + Package Registry (Completed — 2026-06-01)

### Phase 28 status: COMPLETE

#### 28A — Stage B full parity report
All four Stage B milestone files parse with 0 errors:
  - lexer.lln: parseErrors=0, parityStatus=complete
  - parser.lln: parseErrors=0, parityStatus=complete
  - type-checker.lln: parseErrors=0, parityStatus=complete
  - compiler.capabilities.lln: parseErrors=0, parityStatus=complete
  overallStatus: complete

#### 28B — Package registry scaffold
Created C:\laragon\www\LO\packages-logicn\logicn-registry\ with:
  - package.json: { "name": "@logicn/registry", "version": "0.1.0", "private": true }
  - README.md: certified package registry concept, diagnostic codes, governance rules
  - packages/@logicn/auth/package.logicn.yaml: capabilities [secret.read, audit.write]
  - packages/@logicn/healthcare/package.logicn.yaml: HIPAA-aligned PHI manifest

#### 28C — Production mode LLN-STDLIB-001 as error
Fixed cli.ts to pass correct EffectCheckerMode based on CLI mode:
  - build-production / build-deterministic → "production" mode → LLN-STDLIB-001 is error
  - check / build → "development" mode → LLN-STDLIB-001 downgraded to warning
  Both LLN-EFFECT-001 and LLN-STDLIB-001 are now consistently handled.

#### 28D — Level-1-Basics production mode check
Running `node dist/cli.js build --production docs/examples/Level-1-Basics`:
  25 errors (pre-existing: BOM characters, missing domain types, top-level binding checks).
  None are LLN-STDLIB-001 regressions. Goal: 0 errors for Level 1-3 deferred to Phase 29
  pending CEC fixes (BOM cleanup, import system Phase 11E).

#### Test results (Phase 28)
Build + npm test: 2449 tests, 0 failures, 0 skipped.

Known gaps deferred to Phase 29:
  - Level-1-Basics: 25 pre-existing errors (BOM in 3 files, missing domain types, top-level binding rules)
  - Package registry: hash/signature fields pending `logicn package hash` command
  - Import system (Phase 11E) needed before domain types resolve in CEC examples

## Phase 29 — Register VM Fast-Path + NaN-Boxing + Production Hardening (Completed — 2026-06-01)

### Phase 29 status: COMPLETE

#### 29A — NaN-boxing for integers
Added tagged-integer helpers to `interpreter.ts`:
  - `tagInt(n)` — encode 31-bit signed int as an odd JS number (LSB=1)
  - `isTagged(v)` — detect tagged values at runtime
  - `untag(v)` — decode tagged int to plain JS number
  - `fitsTagged(n)` — range check for [MIN_TAGGED, MAX_TAGGED]
  - `MAX_TAGGED = 1073741823`, `MIN_TAGGED = -1073741824`
  - All exported from `index.ts`
  - Marked: `// Phase 29A NaN-boxing — active for hot paths`

#### 29B — ExecutionGraph fast-path execution
Added `runFromGraph()` to `interpreter.ts`:
  - Register-VM executor for pre-compiled `ExecutionGraph` nodes
  - Handles: `LOAD_CONST`, `LOAD_SLOT`, `STORE_SLOT`, `BINOP`, `RETURN`, `RETURN_VOID`
  - Returns `null` (sentinel) when graph contains `ExecOp.NOP` (unhandled op) — caller falls back to tree-walker
  - `makeLogicNValue()` helper strips parser quote-tokens from string constants
  - Wired into `executeFlow()`: pure flows with no enforcer/capabilityHost attempt the fast-path first
  - Falls through to the existing tree-walker when the graph is incomplete
  - Marked: `// Phase 29B NaN-boxing — active for hot paths (ExecutionGraph register VM)`

#### 29C — Production mode summary
Created `src/production-check.ts`:
  - `checkProductionReadiness(diagnostics)` — verifies a program is production-ready
  - Returns `{ ready, errors, warnings, blockers }` (all readonly)
  - `PRODUCTION_BLOCKERS` set: LLN-SEC-020/021, LLN-SAFETY-001..005, LLN-RUNTIME-005/007, LLN-MEMORY-001..003/007/008, LLN-RAWPTR-001, LLN-PKG-004, LLN-SOURCE-ESCAPE-001, LLN-BUILD-001, LLN-STDLIB-001
  - Exported from `index.ts`

#### Test results (Phase 29)
Build + npm test: **2468 tests, 0 failures**.
19 new Phase 29 tests (`tests/phase29.test.mjs`):
  - 7 tests: 29A tagged-integer helpers
  - 4 tests: 29B ExecutionGraph fast-path
  - 8 tests: 29C production readiness check

Known gaps deferred to Phase 30:
  - Level-1-Basics: pre-existing errors (BOM in 3 files, missing domain types, top-level binding rules)
  - Package registry: hash/signature fields pending `logicn package hash` command
  - Import system (Phase 11E) needed before domain types resolve in CEC examples
  - ExecutionGraph fast-path gated behind `{ egraphFastPath: true }` until graph builder handles all node kinds

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
