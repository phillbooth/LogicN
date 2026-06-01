# LogicN — Next 10 Phases Roadmap (Phase 28 → 37)

**Primary goal: Runtime written in LogicN at 100%**
**Current: Phase 27B done (sync fast-path). 2,564 tests passing.**
**Status: planning — research needed (see questions at end)**

---

## Where We Are

| Component | State |
|---|---|
| WAT emitter | ✅ arithmetic, control flow, mut/assign, else-if |
| WASM execution | ✅ all 8 benchmarks run via WebAssembly.instantiate |
| Sync fast-path | ✅ Phase 27B — 2.7-4× tree-walker improvement |
| Tree-walker perf | ⚫ still 100×+ slower than Node on arithmetic |
| HTTP serving | ❌ not yet — `serve()` is TypeScript |
| Self-hosting | ❌ Stage B not yet compiling Stage A |
| Runtime in LogicN | **0%** — runtime is TypeScript |

The 10 phases below take the runtime from 0% to ~50% (first governed HTTP service + self-hosting bootstrap).

---

## ✅ Progress (2026-06-01)

| Phase | Status | Delivered |
|---|---|---|
| **28** | ✅ DONE | `checkProfiles` (LLN-PROFILE-001/002/006), `checkTaint` (LLN-TAINT-001/003/004), OWASP catalogue |
| **29** | ✅ DONE | `@logicn/core-economics` package — CostGraph, ValueGraph, IBM risk matrix, RouteDecision (governanceApproved literal) |
| **30** | ✅ DONE | `buildProofGraphCached` — ExecutionSignature-keyed proof shape cache (67% hit rate on same-shape flows) |
| **31** | ✅ DONE | Bytecode VM — Int32Array opcodes, 14.3× over sync tree-walker, ~300× over async governed |
| **32** | ✅ DONE | `logicn diff` governance delta CLI (exit 2 on authority widening) + governance-diff module |

**Test count: 2,605 compiler + 15 economics + 95 devtools = 2,715 total, 0 failures.**
Phases 33-37 remain (integer fast-path, verifyPassword HTTP service → Runtime 25%, etc.).

---

## Phase 28 — Profile Enforcement + Security Types
**Theme: Governance completeness**
**Runtime %: 0% (foundation)**

1. `profile strict` / `profile high_integrity` → real compiler errors (LLN-PROFILE-001..007)
2. `Tainted<T>` — external input cannot reach a sink (`database.query`, `html.render`, `shell.exec`) without an explicit sanitiser boundary
3. Constant-time comparison — `ProtectedSecret<T> ==` → LLN-SECURITY-001 (force `.constantTimeEquals()`)

**Why now:** Before the runtime accepts external HTTP requests, the security type system must prevent injection at compile time.

**Research needed:** Which sanitiser functions should be the recognised "untaint" boundaries? Which sinks are mandatory-tainted-checked?

---

## Phase 29 — `logicn-core-economics` Package (CostGraph)
**Theme: Economic routing**
**Runtime %: 0% (foundation)**

```
total_cost = compute_cost + audit_cost + governance_cost + AI_cost + network_cost + risk_cost
```

CostGraph auto-routes: pure flow → WASM path, effectful flow → governed CPU path. Reads ProofGraph + hardware profile, never modifies governance.

**Why now:** The runtime needs to decide WHERE each flow executes (WASM vs tree-walker vs CPU). CostGraph is that decision engine.

**Research needed:** Real-world cost figures — cloud compute £/CPU-hour, AI token pricing, audit storage costs, breach cost benchmarks per industry.

---

## Phase 30 — Governance Overhead <3%
**Theme: Performance**
**Runtime %: 0% (foundation)**

ProofGraph caching by ExecutionSignature. Two flows with identical governance shape share one ProofGraph — build once, reuse. Target: governed/manifest ratio from ~2× to <1.05×.

**Why now:** The runtime will run governance on every request. It must be near-free.

**Research needed:** None — internal optimisation.

---

## Phase 31 — Bytecode VM for Pure Flows
**Theme: Performance — the big one**
**Runtime %: 0% (foundation)**

Compile pure flows to flat `Int32Array` bytecode. Tight synchronous `while(pc<len)` loop. No objects, no async, no AST traversal per call.

Target: arithmetic-threshold tree-walker 850K/s → 50M+/s (closes the ⚫ black gap to 🟡 yellow vs Node).

**Why now:** The runtime's own flows (capability resolution, audit) run as LogicN — they must be fast.

**Research needed:** None — internal. (Reference: how QuickJS / Lua bytecode VMs structure their opcode dispatch.)

---

## Phase 32 — `logicn diff` + Stage B Lexer Parity
**Theme: Tooling + self-hosting prep**
**Runtime %: 0% (foundation)**

Two parallel tracks:
1. `logicn diff main..branch` — governance delta JSON (effects/capabilities/values changed)
2. Stage B lexer reaches 100% parity — can tokenise all 223 CEC examples

**Why now:** Stage B lexer is the first step to self-hosting (the 75% runtime milestone). `logicn diff` is the PR-review tool.

**Research needed:** None.

---

## Phase 33 — Integer Fast-Path + Hardware Routing
**Theme: Performance + hardware**
**Runtime %: 0% (foundation)**

1. Skip boxing entirely for Int×op×Int hot paths (raw number arithmetic until flow boundary)
2. CostGraph routes to WASM / CPU / NPU based on hardware profile (Phase 29 + 33 combine)

**Research needed:** Confirm the i5/i9 hardware detection approach — is CPUID via Node.js feasible, or do we shell out to a native helper?

---

## Phase 34 — `verifyPassword` Governed HTTP Service
**Theme: FIRST DEPLOYMENT**
**Runtime %: 25% 🎯 — first real governed endpoint**

```logicn
secure flow verifyPassword(readonly req: HttpRequest) -> HttpResponse
contract {
  effects { network.inbound audit.write }
  privacy { pii { password } }
}
{ ... }

route POST "/auth/verify" { verifyPassword }
```

The first `.lln` file that IS the runtime service. HTTP request → governance check → WASM execution → response.

**Research needed:** Which HTTP server substrate? Node.js `http` module, or compile to WASI and use a WASM HTTP host? Decision affects everything downstream.

---

## Phase 35 — wasmtime CLI Deployment
**Theme: Standalone deployment**
**Runtime %: 30%**

```bash
logicn build --target wasm-wasi -o auth.wasm auth/verifyPassword.lln
wasmtime run auth.wasm
```

LogicN service runs outside Node.js as a standalone WASM binary.

**Research needed:** WASI HTTP proposal status (wasi-http) — is it stable enough to target, or use a wasmtime host shim?

---

## Phase 36 — Deno Deploy First Endpoint
**Theme: Production traffic**
**Runtime %: 35%**

First external traffic served by a governed LogicN service. Audit → Deno KV. ProofGraph downloadable from `/governance/proof`.

**Research needed:** Deno Deploy WASM support limits — memory, cold start, KV pricing. Alternative: Cloudflare Workers (also WASM-based)?

---

## Phase 37 — ValueGraph + Risk-Adjusted Routing Live
**Theme: Economics in production**
**Runtime %: 40%**

CostGraph makes real routing decisions: `cloud path £70,001 expected cost → enclave path £3,500` — economics chooses the enclave. First live governance-first economics.

**Research needed:** Real breach cost data per data classification (medical, financial, etc.) to calibrate the risk model.

---

## The 10-Phase Arc

```
Phase 28: Profile enforcement + Tainted<T>      [governance + security]
Phase 29: logicn-core-economics (CostGraph)     [routing engine]
Phase 30: Governance overhead <3%               [perf: near-free governance]
Phase 31: Bytecode VM                           [perf: close the black gap]
Phase 32: logicn diff + Stage B lexer           [tooling + self-host prep]
Phase 33: Integer fast-path + HW routing        [perf + hardware]
Phase 34: verifyPassword HTTP service     🎯 RUNTIME 25%
Phase 35: wasmtime CLI                          [standalone WASM]
Phase 36: Deno Deploy                           [production traffic]
Phase 37: ValueGraph risk routing live          [economics in prod] → RUNTIME 40%
```

By Phase 37: a governed LogicN service serving real HTTP traffic, with the runtime
40% expressed in LogicN, economic routing live, and bytecode VM closing the perf gap.

Phases 38-50 (next block) take it to self-hosting (50%), capability host in LogicN (75%),
and v1.0 (100%).

---

## Locked Decisions (2026-06-01)

### HTTP Substrate (Phase 34-37): Node.js http first, WASI later
- Phase 34: `serve()` uses Node.js `http` module — fastest path to a working endpoint.
- Phase 35: migrate the hot path to WASI; keep Node.js shell for capabilities.
- This is the pragmatic path — get governed traffic flowing, optimise deployment after.

### Deployment Reality: DigitalOcean (terminable) + i9 desktop (truth)
- **Performance truth:** the i9 Windows desktop is the canonical benchmark machine.
  The project may migrate there when ready.
- **Deployment:** DigitalOcean droplet — cost-effective IF the server can be terminated
  when not in use. This means the LogicN service must support:
  - Fast cold start (WASM binary, minimal init)
  - Clean shutdown (flush audit, close connections) — `flow finalizer` already exists
  - Stateless-friendly design (audit to persistent store, not local memory)
- **AI economics:** OpenAI pricing is the calibration source for the AI_cost term.

### Taint Model (Phase 28): Hybrid — sanitiser + validator
- **Injection sinks** (`database.query`, `html.render`, `shell.exec`) require a named
  stdlib sanitiser: `Sql.escape`, `Html.escape`, `Shell.quote`. Only these convert
  `Tainted<T>` → `T` at an injection boundary.
- **Business-logic sinks** accept any `Validated<T>` (integrates with existing value-state).
- Two diagnostic series: `LLN-TAINT-001` (injection sink, raw tainted) and
  `LLN-TAINT-002` (logic sink, unvalidated).

### Hardware Detection (Phase 33): Hybrid Two-Tier Design
- **Tier 1 — WASM workspace (portable core):** the application engine runs entirely
  inside WASM. Completely isolated, portable, secure. Knows nothing about the host CPU.
- **Tier 2 — Host capability exposure:** the host system (Node.js shell on i5/i9)
  detects specialised silicon (AVX2, AVX-512, P/E-cores) and exposes those
  optimisations to the WASM workspace through a defined host-import interface.
- The WASM core requests "fast matrix multiply"; the host decides whether to use
  AVX-512 (i9), AVX2 (i5), or scalar fallback. The core never sees CPU specifics.
- This keeps the WASM-first architecture rule intact: governance + execution stay
  portable; hardware acceleration is a host-provided capability, never baked into
  the core binary.

### Economic Calibration Sources
| Term | Source |
|---|---|
| compute_cost | i9 desktop (real CPU-time) + DigitalOcean droplet pricing |
| AI_cost | OpenAI API pricing (per-token) |
| network_cost | DigitalOcean bandwidth pricing |
| risk_cost | (research pending — breach cost data per industry) |
| audit_cost | DigitalOcean storage pricing |
