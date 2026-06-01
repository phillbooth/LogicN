# LogicN — Roadmap: Phase 26 → Phase 41

**Version: 1.0 — 2026-06-01**
**Status: Planned — post Phase 25 completion**
**Base state: 2518 tests passing, Phase 25 WAT arithmetic complete**

---

## North Star

> By Phase 41: A deployed governed LogicN service running in WASM/WASI, serving real
> HTTP traffic, with Stage B compiler achieving partial self-hosting and the economics
> layer routing execution to Intel P/E-cores and NPU based on risk-adjusted cost.

---

## Phase 26 — WAT Control Flow
**Focus: real if/else and bounded loops in WAT output**
**Dependencies: Phase 25 (WAT arithmetic)**

Add to `emitWATFromFlowAST`:
- `ifStmt` → `(if (result i32) <cond> (then ...) (else ...))`
- `whileStmt` with bounded iteration → WAT loop + br_if
- Block labels and break targets
- `matchExpr` → nested if chains

Expected test count: +30
Expected performance impact: whileStmt flows now compile to O(N) WAT instead of O(N) recursive calls

---

## Phase 27 — WASM Instantiation
**Focus: pure flows execute inside WebAssembly.instantiate (Node.js)**
**Dependencies: Phase 26 (control flow in WAT)**

- Compile WAT → binary WASM via `wat-wasm` npm assembler (already decided)
- `WebAssembly.instantiate(wasm, imports)` for pure flows
- Wire WASM result back into LogicN value system
- Benchmark: pure flow compute-mix should reach 1-10M ops/s (vs 60K tree-walker)
- Both targets: `wasm-standalone` and `wasm-hybrid`
- Test: run `add(2,3)` via WASM, verify result = 5

Expected speedup: 10-100× on pure numeric flows

---

## Phase 28 — Profile Enforcement
**Focus: Strict + High-Integrity profiles enforced by compiler**
**Dependencies: Phase 25 (governance complete)**

Add `"strict"` and `"high_integrity"` to `DeploymentProfile` type.

Compiler checks for `profile strict`:
- `LLN-PROFILE-001`: `try`/`catch` used in strict profile (error)
- `LLN-PROFILE-002`: unbounded loop in strict profile (error)
- `LLN-PROFILE-003`: recursion used in strict profile (error)
- `LLN-PROFILE-004`: JIT target in strict profile (error)
- `LLN-PROFILE-005`: LRU cache enabled in strict profile (error)

Compiler checks for `profile high_integrity`:
- `LLN-PROFILE-006`: no `runtime_budget` declared (warning)
- `LLN-PROFILE-007`: dynamic mutation in high_integrity (error)

Boot/main syntax:
```logicn
boot main {
  profile use strict, high_integrity
}
```

This makes the aerospace examples (`updateFlightPath.lln`) fully compilable
under strict profile — not just classified safety_critical but actually
running under the restricted language subset.

Expected test count: +40

---

## Phase 29 — `logicn-core-economics` Package
**Focus: CostGraph and ValueGraph as a separate package**
**Dependencies: Phase 25 (ProofGraph API stable)**

Create `packages-logicn/logicn-core-economics/`:

```
src/
  cost-graph.ts      — CostGraph, CostEstimate, estimateCost()
  value-graph.ts     — ValueGraph, RiskProfile, classifyRisk()
  route-graph.ts     — RouteGraph, RouteDecision, selectTarget()
  economic-rule.ts   — EconomicConstraint parser (from contract.economics)
  roi-report.ts      — ROI calculation wrapper (delegates to proof-graph.ts)
  intel-profile.ts   — IntelCoreAffinity, X86VectorAffinity, detectCapabilities()
  index.ts           — all exports
```

The emergency brake rule is enforced at the type level — `RouteDecision`
has `governanceApproved: true` as a literal type (not boolean).

Expected test count: +60
Risk-adjusted routing live: cloud path £70,001 vs enclave £3,500.70

---

## Phase 30 — Governance Overhead Optimisation
**Focus: reduce governed/manifest ratio from 6% to <3%**
**Dependencies: Phase 29 (economics package)**

Profile the governance verifier hot path:
1. `buildProofGraph()` — currently rebuilds per call, should cache by ExecutionSignature
2. `GovernanceFlags` bitmask — already O(1) but called per-flow
3. `extractValueClassification()` — string parsing, can be cached at parse time
4. Lease caching for capability checks — time-bounded proof-of-authority

Expected result: governance overhead drops to <3% on warm paths

---

## Phase 31 — Integer Fast-Path (Interpreter)
**Focus: skip boxing for Int+Int, reduce tree-walker allocation**
**Dependencies: Phase 25 (WAT baseline for comparison)**

Current: every `a + b` allocates `{ __tag: "int", value: N }` on heap
Proposed: detect `Int op Int` and operate directly on raw JS numbers
- Tagged integer representation (Pointer Tagging style, as in LRU)
- `fitsTagged()` and `tagInt()` already exported — use in interpreter
- Expected: 5-20× speedup on arithmetic-heavy pure flows in interpreter mode

Benchmark target: arithmetic-threshold LogicN from 245K/s → 1M+/s

---

## Phase 32 — Stage B Lexer Parity
**Focus: Stage B (self-hosting compiler) lexes 100% of LogicN syntax**
**Dependencies: None (parallel track)**

Stage B is the self-hosting compiler written in LogicN.
Phase 32 goal: `generateStageBReport()` shows 100% lexer parity.

Milestone check: Stage B can tokenize all 223 CEC examples without error.

---

## Phase 33 — Intel P/E-Core ExecutionScheduler
**Focus: wire IntelCoreAffinity into the ExecutionGraph scheduler**
**Dependencies: Phase 29 (CostGraph knows hardware profile)**

- Hardware detection: read `/proc/cpuinfo` (Linux) or CPUID (Windows native)
- On i5: detect P-cores only (no E-core topology on older i5)
- On i9 (HX/K series): detect P+E topology, set affinity hints
- `ExecutionScheduler` emits thread affinity hints per work type
- AVX2 (i5) vs AVX-512 (i9) — CostGraph selects WASM SIMD vs AVX-512 path

Expected: compilation 20-40% faster on i9 when parallel graph processing enabled

---

## Phase 34 — `verifyPassword` WASM Auth Service
**Focus: first real governed HTTP endpoint via WASM**
**Dependencies: Phase 27 (WASM instantiation)**

The original Phase 25 milestone (deferred from previous session):
- `verifyPassword(plain, hash) -> Bool` compiled to WASM
- Served via `serve()` as a governed HTTP endpoint
- Real HTTP request → LogicN governance check → WASM execution → response
- Audit trail: every verification attempt is logged to `audit.write`
- Test: `curl -X POST /auth/verify -d '{"plain":"secret","hash":"..."}'`

This is the first demonstration of LogicN as a real service, not just a compiler.

---

## Phase 35 — wasmtime CLI Deployment
**Focus: standalone WASM/WASI binary running outside Node.js**
**Dependencies: Phase 34 (WASM output stable)**

- Compile LogicN source → WAT → WASM binary → `wasmtime run app.wasm`
- WASI imports: filesystem, clock, stdout
- Governed memory limits enforced in WASM linear memory
- Test: pure flow benchmark runs under wasmtime and produces same checksums as Node.js

---

## Phase 36 — Deno Deploy First Endpoint
**Focus: governed LogicN service deployed to Deno Deploy**
**Dependencies: Phase 35 (WASM binary stable)**

- Build WASM binary → deploy to Deno Deploy
- First external traffic served by a LogicN service
- Audit trail written to persistent store
- ProofGraph certificate downloadable from `/governance/proof`

---

## Phase 37 — ValueGraph + Risk-Adjusted Routing Live
**Focus: economics layer routing real traffic**
**Dependencies: Phase 29 (CostGraph package), Phase 36 (deployed service)**

- CostGraph evaluates expected_cost for each inbound request
- High-risk data → enclave path; low-risk → cloud path
- ROI report: quantify governance audit savings in production
- `generateROIReport()` now shows real data from production traffic

---

## Phase 38 — Governance Marketplace Foundation
**Focus: `use governance_shape FCA_Trading_v2` from @logicn/certified-shapes**
**Dependencies: Phase 37 (ValueGraph stable)**

- Define the `governance_shape` import syntax in parser
- Create `@logicn/certified-shapes` package (local registry first)
- FCA trading shape: required effects, audit trail, PII handling
- Aerospace shape: safety_critical + deterministic_execution
- Shape verification: compiler checks flow against imported shape

---

## Phase 39 — Post-Quantum Crypto + Intel Hardware Shield
**Focus: quantum-resistant signatures in ProofGraph + native sandbox**
**Dependencies: Phase 29 (economics), Phase 33 (Intel detection)**

- CRYSTALS-Dilithium signatures for ProofGraph ExecutionSignature
- Intel Hardware Shield process isolation for native modules
- `AuditLog.write({ cpuFeature: "avx512" })` — execution path in audit
- If WASM preferred_execution violated, audit records the escape

---

## Phase 40 — Photonic/Tri Target Stub
**Focus: Tri-photonic compute target foundation**
**Dependencies: Phase 33 (hardware detection)**

- Add `target photonic` to `compute { target ... }` block
- CostGraph: photonic path has 0.001× energy cost vs CPU
- ControlNodes always on CPU (deterministic), DataNodes can route to photonic
- Stub implementation: photonic target logs to audit, falls back to WASM
- Architecture: WASM governs, photonic accelerates

---

## Phase 41 — Self-Hosting Bootstrap Milestone
**Focus: Stage B compiler compiles part of Stage A**
**Dependencies: Phase 32 (Stage B lexer parity), Phase 35 (WASM deployment)**

The milestone: Stage B (written in LogicN) can compile at least one Stage A
source file (a simple utility module) without error.

This proves:
1. LogicN is expressive enough to write a compiler in itself
2. The governance model works for compiler-writing workloads
3. The WASM output is correct enough to run compiled programs

**Bootstrap sequence:**
```
Stage A (TypeScript) → compiles Stage B (LogicN source)
Stage B (running in WASM) → compiles a Stage A utility module
Checksums match → bootstrap verified
```

Milestone check: `node bootstrap-verify.mjs` passes with matching checksums.

---

## Phase Map

```
Phase 25: WAT arithmetic ✅ (done)
Phase 26: WAT control flow (if/else, loops)
Phase 27: WASM instantiation (Node.js)
Phase 28: Profile enforcement (strict, high_integrity)
Phase 29: logicn-core-economics package
Phase 30: Governance overhead <3%
Phase 31: Integer fast-path (5-20× interpreter speedup)
Phase 32: Stage B lexer parity (parallel track)
Phase 33: Intel P/E-core ExecutionScheduler
Phase 34: verifyPassword WASM HTTP service
Phase 35: wasmtime CLI deployment
Phase 36: Deno Deploy first endpoint
Phase 37: ValueGraph + risk-adjusted routing live
Phase 38: Governance Marketplace foundation
Phase 39: Post-quantum crypto + Hardware Shield
Phase 40: Photonic/Tri target stub
Phase 41: Self-hosting bootstrap milestone
```

---

## Test Count Projections

| Phase | New Tests | Cumulative |
|---|---|---|
| 25 (done) | +39 | 2,518 |
| 26 | +30 | 2,548 |
| 27 | +25 | 2,573 |
| 28 | +40 | 2,613 |
| 29 | +60 | 2,673 |
| 30 | +15 | 2,688 |
| 31 | +20 | 2,708 |
| 32 | +30 | 2,738 |
| 33 | +20 | 2,758 |
| 34 | +25 | 2,783 |
| 35 | +20 | 2,803 |
| 36 | +15 | 2,818 |
| 37 | +30 | 2,848 |
| 38 | +25 | 2,873 |
| 39 | +20 | 2,893 |
| 40 | +15 | 2,908 |
| **41** | **+20** | **~2,930** |

---

## Governance Principle (Unchanging Through All Phases)

```
Security is not negotiable.
Governance is not optional.
Economics is not authority.
Performance is not authority.
```

No phase may introduce an optimisation that causes a previously denied
flow to become allowed. Every new capability must pass the test:
"Can this cause a denied flow to become allowed?" If yes → governance
decision, not optimisation.
