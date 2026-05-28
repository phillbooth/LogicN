# LogicN

LogicN is a governance-first programming language, runtime and execution
architecture designed to make secure computation **explicit, auditable and
portable** across CPUs, GPUs, NPUs, APUs, TPUs, AI accelerators, WASM and
future heterogeneous hardware — including any device that can run governed
compute, from edge silicon to data centre accelerators.

Rather than adding safety features to an existing language, LogicN is designed
from the ground up around the principle that execution intent, capability
boundaries, memory ownership, and effects should be **declared in source and
enforced by tooling** — not inferred, guessed, or left to convention.

```text
intent
    ↓
governed execution plan
    ↓
coordinated compute
    ↓
audit proof
```

**[Intent](docs/Knowledge-Bases/logicn-concept-intent.md)** — The explicit declaration of what a flow or system is *for*: its purpose, the authority it requires, the effects it may produce, the boundaries it must respect, and the outcomes it intends to deliver. Intent is machine-readable, compiler-visible, and enforceable — not documentation.

**[Governed Execution Plan](docs/Knowledge-Bases/logicn-concept-governed-execution-plan.md)** — The compiler/runtime-generated operational contract that defines how execution is *permitted* to occur: which capabilities are granted, which effects are allowed, which resources may be accessed, which runtime targets are approved, and which behaviors are explicitly denied. The bridge between declared intent and actual execution.

**[Coordinated Compute](docs/Knowledge-Bases/logicn-concept-coordinated-compute.md)** — The runtime orchestration layer that transforms a governed execution plan into actual execution across CPU, GPU, NPU, APU, WASM, native and future targets. Responsible for target selection, fallback coordination, memory isolation, accelerator dispatch and runtime verification — all within declared authority constraints.

**[Audit Proof](docs/Knowledge-Bases/logicn-concept-audit-proof.md)** — The structured, verifiable runtime evidence that execution occurred within declared authority, respected governance policy, enforced runtime constraints and satisfied safety guarantees. Not logs — provable evidence.

---

## What LogicN Is

LogicN is three things building toward one platform:

**1. A language** — strict typing, explicit errors, explicit memory ownership,
declared effects, no hidden nulls, no silent failures. Source files use `.lln`.

**2. A compiler and checker** — a pipeline that enforces the language rules
before code runs. Phase 3 scanner-level checks are live today. Phase 4 (real
parser and AST) is the current build target.

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
| side-effects hidden | effects declared on every flow: `effects [database.write]` |
| unsafe is normal | `unsafe` requires `reason` + `fallback`, always explicit |
| boundary data silently typed | `unsafe let raw` — untrusted until decoded to a safe type |
| AI reads code | AI reads structured reports: diagnostics, source maps, intent manifests |
| fixed hardware assumptions | declared targets: CPU, NPU, APU, GPU, WASM, accelerator |

---

## Status — Prototype (v0.1-beta)

LogicN is a **language-design and prototype project**. It is not a production
compiler.

**What works today:**

- Run simple `.lln` programs using Node.js (no installation required beyond
  `npm install`)
- Scanner-level safety checks (Phase 3): binding rules, `mut` in pure flow,
  unsafe block enforcement, raw pointer detection
- Diagnostic codes (`LLN-MEMORY-*`, `LLN-SAFETY-*`, `LLN-BINDING-*`, etc.)
- JSON schema and OpenAPI generation from type definitions
- Source map output and AI-readable project context generation
- Build manifests, memory reports, execution reports
- Project graph and task automation tooling

**What is not yet implemented:**

- Real lexer and parser (Phase 4 — next)
- Full type and effect checker (Phase 5)
- Production code generation
- GPU, AI accelerator, photonic targets (post-v1)

---

## Running LogicN Today

LogicN runs on **Node.js 18+** using the prototype compiler in
`packages-logicn/logicn-core/`.

```bash
# From the logicn-core package
cd packages-logicn/logicn-core

# Install dependencies
npm install

# Run a .lln file
node compiler/logicn.js run examples/hello.lln

# Check a file for errors
node compiler/logicn.js check examples/result.lln

# Run all example checks and tests
npm test

# Build examples and generate reports
npm run build:examples

# Generate AI-readable project context
node compiler/logicn.js ai-context examples --out build/examples

# Verify build artefacts
npm run verify -- build/examples
```

No special toolchain, no Rust, no LLVM. The v0.1 prototype runs entirely on
Node.js. The full compiler pipeline (Phase 4 onwards) will replace this with a
real parser and checker.

---

## Code Example

```logicn
// ── Bindings: three visibility levels ──────────────────────────────────────
//
//  let      — immutable. Cannot be reassigned (LLN-BINDING-001 if you try).
//  mut      — mutable. Reassignment is intentional and visible.
//  readonly — read-only view of a value owned elsewhere. Cannot mutate
//             properties through this reference (LLN-BINDING-003).
//
flow demonstrateBindings(cfg: Config) {
  let    maxRetries: Int    = 3            // fixed — cannot reassign
  mut    attempts:   Int    = 0            // reassignable: attempts = attempts + 1
  readonly settings: Config = cfg          // view only — cfg.timeout = 5 is rejected
}


// ── Intent: declare what a flow is for ─────────────────────────────────────
//
// Intent makes purpose machine-readable — the effect checker, audit system
// and AI tooling all consume intent declarations. A flow whose inferred
// behavior conflicts with its declared intent is rejected (LLN-INTENT-001).
//
/// intent: "Process a customer order and charge payment"
/// trust:  "input is pre-validated at the API boundary"
guarded flow processOrder(input: CreateOrderRequest) -> Result<OrderId, OrderError>
effects [database.write, payment.charge]
intent "Process a customer order and charge payment" {

  let order: Order = Order {
    id:         generateId()
    customerId: input.customerId
    total:      input.total
  }

  // Result must be explicitly handled — silent failure is a compile error
  match saveOrder(order) {
    Ok(saved) => return Ok(saved.id)
    Err(_)    => return Err(OrderError.DatabaseFailed)
  }
}


// ── Unsafe variables — boundary data stays unsafe until sanitised ───────────
//
// Any value that arrives from outside the system (HTTP, webhook, file, env)
// is marked `unsafe let` — it is untrusted bytes with no type guarantee.
// The compiler prevents unsafe values from being passed to typed parameters
// without going through an explicit decode/validate step first.
//
// This is LogicN's trust-boundary model: the type system tracks where data
// came from, not just what shape it has.
//
guarded flow fetchOrderStatus(orderId: OrderId) -> Result<OrderStatus, ApiError>
effects [network.outbound]
intent "Fetch live order status from the payment provider API" {

  // Raw response from an external service — untrusted, untyped
  unsafe let rawResponse: Bytes = http.get("https://api.payments.com/orders/" + orderId)

  // Explicit decode: unsafe Bytes → typed OrderStatus
  // Decode returns Err if the response does not match the expected schema
  let status: OrderStatus = json.decode<OrderStatus>(rawResponse)?

  // `status` is now fully typed and safe. `rawResponse` cannot be used further.
  return Ok(status)
}


// ── Pure flows — zero side effects ─────────────────────────────────────────
//
// `pure flow` cannot: perform I/O, call effectful flows, use `mut`, or `await`.
// The compiler enforces this at Phase 3. `mut` inside pure flow → LLN-BINDING-004.
//
pure flow applyDiscount(total: Float, pct: Float) -> Float {
  return total * (pct / 100.0)
}


// ── Memory: borrow — temporary read-only access ────────────────────────────
//
// `borrow buf` passes read-only access without transferring ownership.
// The borrow expires when this flow returns; the caller keeps the buffer.
//
pure flow peekFirstByte(borrow buf: Buffer) -> Option<UInt8> {
  return buf.data.get(0)
}


// ── Memory: move — explicit ownership transfer ─────────────────────────────
//
// `move conn` transfers ownership. The caller's binding is invalidated.
// Using `conn` after this call is LLN-MEMORY-001 (USE_AFTER_MOVE).
//
secure flow closeConnection(move conn: Connection) -> Result<Void, ConnError> {
  return conn.close()
}


// ── Unsafe blocks — always declared, always justified ──────────────────────
//
// `unsafe block` requires both `reason` and `fallback` on the opening line.
// Missing `reason` → LLN-MEMORY-008.  Raw pointer outside unsafe → LLN-RAWPTR-001.
//
flow readRegister(addr: UInt32) -> Result<UInt32, HardwareError> {
  unsafe block readMMIO reason "MMIO register requires direct memory read" fallback safeDefault {
    let value: UInt32 = *mmio_ptr(addr)
    return Ok(value)
  }
}
```

---

## Roadmap

LogicN builds the language foundation before expanding into domain packages,
advanced targets or full frameworks.

```
Phase 0 — Workspace Freeze                              ✅ complete
  Active packages limited to core, compiler, tooling.
  Finance, electrical, OT packages archived.
  GPU/AI accelerator/photonic labelled post-v1.

Phase 1 — V1 Syntax Freeze                             ✅ complete
  V1 grammar draft defined.
  Reserved keyword table authoritative.
  One preferred spelling for each core construct.

Phase 2 — Example Corpus                               ✅ complete
  20 v1 .lln examples across 5 categories:
    basic, type-system, API/JSON, memory, concurrency.
  Examples manifest classifies all files as v1 or post-v1.
  Rejection fixtures with expected diagnostic codes.

Phase 3 — Memory Model Commitment                      ✅ complete
  Hybrid ownership model documented and committed.
  LLN-MEMORY-001..008 defined and exported.
  Scanner-level enforcement implemented:
    mut in pure flow    → LLN-BINDING-004
    unsafe without reason → LLN-MEMORY-008
    raw pointer outside unsafe → LLN-RAWPTR-001
  borrow, move, pinned reserved keywords.
  AstNodeKind memory vocabulary committed.
  28/28 compiler contract tests passing.

Phase 4 — Parser and AST                               ⬜ next
  Lexer for the v1 keyword table.
  Parser for the v1 grammar.
  Stable AST with source spans.
  Parser tests for every v1 example.
  Rejection tests for post-v1 syntax.

Phase 5 — Type and Effect Checker                      ⬜ future
  Name resolution and symbol table.
  Type checking: primitives, records, variants, Result, Option, Tri.
  Exhaustive match checks.
  Effect propagation and pure-flow enforcement.
  Full lifetime and borrow analysis (borrow checker).

Phase 6 — Runtime and Reports                          ⬜ future
  CPU-compatible checked execution for the v1 subset.
  WASM target planning report.
  Build/check report: syntax, type, effect, memory diagnostics.
  Source map output for checked examples.
  AI-readable project summary from real parser/checker facts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stage A — TypeScript / Node.js Runtime                  ⬜ post-foundation
  Phase 6 delivers the first real execution layer.
  LogicN source is compiled to governed TypeScript output.
  Programs run on the Node.js runtime backed by V8.

  The full execution stack at this stage:

  LogicN Syntax
       ↓  governed checks: types, effects, memory, intent
  TypeScript runtime / compiler layer
       ↓  managed language safety, type erasure
  JavaScript output
       ↓  managed runtime semantics
  Node.js runtime
       ↓  host APIs, native bridges, event loop
  V8 JavaScript engine
       ↓  memory-managed JS execution
  C++ native internals

  This creates a layered memory-safety model — each layer contributes
  its own guarantees before reaching the hardware:

  LogicN Syntax      → intended safety model (ownership, effects, intent)
  TypeScript         → managed language safety (types, null checks)
  JavaScript         → managed runtime semantics (GC, bounds)
  Node.js            → host runtime, APIs, native bridges
  V8                 → memory-managed JS engine
  C++                → native implementation layer

  The LogicN layer provides the strongest, most explicit guarantees.
  The layers beneath it inherit managed safety from the JS ecosystem.
  This means the TypeScript runtime is a credible first execution target —
  not a compromise, but a deliberate foundation.

Stage B — LogicN Compiles Itself                        ⬜ long-term
  The LogicN compiler and runtime are rewritten in LogicN.
  The TypeScript bootstrap layer is no longer needed for production.
  LogicN becomes self-hosting: the language proves its own model.

  The execution stack at this stage:

  LogicN Syntax
       ↓  governed checks: types, effects, memory, intent
  LogicN compiler (written in LogicN)
       ↓  real code generation: CPU binary, WASM, target IR
  CPU / WASM / NPU / APU / GPU target
       ↓  hardware execution
  Physical compute

  Self-hosting is the maturity gate: if LogicN can compile LogicN
  safely — enforcing its own memory model, effects and intent
  declarations — then the governance model is real, not theoretical.
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
  lexer, parser, AST, type checker, effect checker, memory checker, IR

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

LogicN Secure App Kernel
  optional runtime layer — APIs, auth, rate limits, jobs

LogicN API Server
  HTTP transport, route manifests, typed dispatch

LogicN CLI / Tasks / Project Graph
  developer tooling, automation, AI context

Full Frameworks (post-v1)
  CMS, admin UI, ORMs, page builders, frontend adapters
```

### Current execution stack (Stage A — TypeScript runtime)

While the real compiler is being built, LogicN programs run via Node.js:

```
LogicN Syntax
     ↓  governed checks: types, effects, memory, intent
TypeScript runtime / compiler layer
     ↓  managed language safety
JavaScript output
     ↓  managed runtime semantics
Node.js runtime
     ↓  host APIs, native bridges
V8 JavaScript engine
     ↓  memory-managed execution
C++ native internals
```

Each layer contributes its own safety guarantees. LogicN's layer is the
most explicit — ownership, effects, intent. The layers below provide
managed memory and runtime safety inherited from the JS ecosystem.

**Active v1 targets:** CPU and WASM (planning). Everything else is post-v1.

**Boundary rules:**
- `logicn-core` is the language. It must not become a web framework.
- `logicn-core-compiler` owns the pipeline. `logicn-core` owns the contract types.
- `unsafe` is a language feature, not a permission to ignore safety rules.
- Hardware targets are backend profiles selected by config — not core syntax.
- Finance, electrical, OT packages are archived and not in the active workspace.

---

### Broader Governance Architecture

The four-stage execution pipeline (`intent → governed execution plan → coordinated compute → audit proof`) is the runtime spine. The full governance architecture adds layers that operate across the entire software lifecycle — from source to deployment to compliance:

```text
intent                       declared purpose, authority, denied boundaries
    ↓
authority tracking           maps where authority enters and flows
    ↓
capability propagation       tracks transitive authority through call chains
    ↓
effect propagation           traces effects across flows, packages, boundaries
    ↓
intent verification          compares declared intent vs actual behavior
    ↓
governance diffing           semantic change report between builds
    ↓
AI system comprehension      queryable semantic model for AI tools
    ↓
compliance generation        SOC2/GDPR artefacts derived from source
    ↓
runtime governance           enforces the governed plan at execution time
    ↓
unsafe boundary visibility   tracks all native/FFI/unsafe code explicitly
    ↓
resource flow tracking       maps which components touch which data and secrets
    ↓
deployment planning          infrastructure requirements from declared semantics
    ↓
runtime target planning      governed CPU/GPU/NPU/WASM target selection
    ↓
package governance           tracks authority and effects introduced by dependencies
    ↓
build-time explainability    `logicn explain <flow>` — live queryable system model
    ↓
negative guarantees          proves what the system CANNOT do
    ↓
runtime evidence correlation connects runtime events back to intent graph nodes
    ↓
AI context compression       compact semantic graph instead of raw source
    ↓
threat modelling             attack surface + secret exposure derived from graph
    ↓
architectural visualization  live diagrams from the intent graph, not manual docs
    ↓
governed execution plan      operational contract: what execution is permitted
    ↓
coordinated compute          orchestrated execution across targets within authority
    ↓
audit proof                  verifiable evidence that governed execution occurred
```

Each stage is specified in [`docs/Knowledge-Bases/logicn-governance-architecture.md`](docs/Knowledge-Bases/logicn-governance-architecture.md).

---

## Project Structure

```text
C:\laragon\www\LO\
├── docs/                          architecture, KB, roadmaps, decisions
│   └── Knowledge-Bases/           compiler diagnostics, memory model, keyword table
├── packages-logicn/
│   ├── logicn-core/               language, examples, prototype compiler ← start here
│   ├── logicn-core-compiler/      compiler pipeline contracts and scanner
│   ├── logicn-core-runtime/       execution contracts
│   ├── logicn-core-security/      security primitives, redaction
│   ├── logicn-core-config/        project configuration
│   ├── logicn-core-reports/       report schemas and writer contracts
│   ├── logicn-core-logic/         Tri, Decision, RiskLevel
│   ├── logicn-core-vector/        Vector, Matrix, Tensor
│   ├── logicn-core-compute/       compute planning and target selection
│   ├── logicn-core-cli/           developer CLI (graph, tasks, check, run)
│   ├── logicn-core-tasks/         safe task automation with declared effects
│   ├── logicn-devtools-project-graph/  project knowledge graph
│   ├── logicn-target-cpu/         CPU capabilities and fallback
│   ├── logicn-target-wasm/        WASM target planning
│   ├── logicn-target-gpu/         GPU target planning (post-v1)
│   ├── logicn-ai/                 AI inference contracts (post-v1)
│   └── logicn-framework-*/        app kernel, API server (post-v1 active)
├── build/                         generated graph, reports
└── tools/
```

**Archived** (outside active workspace — post-v2 domain planning):
```text
C:\laragon\www\LogicN_Archive\packages-logicn\logicn-finance-core
C:\laragon\www\LogicN_Archive\packages-logicn\logicn-electrical-core
C:\laragon\www\LogicN_Archive\packages-logicn\logicn-ot-core
```

---

## Quick Start — Root Tooling

Generate or refresh the project graph:

```powershell
node packages-logicn\logicn-core-cli\dist\index.js graph --out build\graph
```

Run the packages that have executable tests:

```powershell
npm --prefix packages-logicn\logicn-core test
npm --prefix packages-logicn\logicn-core-compiler test
npm --prefix packages-logicn\logicn-devtools-project-graph test
npm --prefix packages-logicn\logicn-core-tasks test
```

For the LogicN prototype compiler, work from `packages-logicn/logicn-core/`.
See that package README for the full command list.

---

## Key Documents

| Document | Purpose |
|---|---|
| `packages-logicn/logicn-core/README.md` | Language introduction, syntax, commands |
| `docs/CORE_FOUNDATION_ROADMAP.md` | Phase-by-phase build plan |
| `docs/Knowledge-Bases/logicn-v1-memory-model.md` | Memory model specification |
| `docs/Knowledge-Bases/v1-reserved-keywords.md` | Authoritative keyword table for lexer |
| `docs/Knowledge-Bases/compiler-diagnostics.md` | All LLN-* diagnostic codes |
| `packages-logicn/logicn-core/examples/examples-manifest.md` | V1 vs post-v1 example classification |
| `AGENTS.md` | AI coding tool instructions |

**Core concept deep-dives:**

| Document | Concept |
|---|---|
| `docs/Knowledge-Bases/logicn-governance-architecture.md` | Full 23-stage governance pipeline with descriptions and examples |
| `docs/Knowledge-Bases/logicn-concept-intent.md` | Intent — semantic purpose, the intent graph, verification |
| `docs/Knowledge-Bases/logicn-concept-governed-execution-plan.md` | Governed Execution Plan — operational contract, negative guarantees |
| `docs/Knowledge-Bases/logicn-concept-coordinated-compute.md` | Coordinated Compute — runtime orchestration across targets |
| `docs/Knowledge-Bases/logicn-concept-audit-proof.md` | Audit Proof — verifiable governance evidence |
| `docs/Knowledge-Bases/logicn-code-examples-full-flow.md` | 12 full code examples: intent, governance, safe/unsafe, tainted input, audit proof |

---

## What LogicN Is Not (Yet)

```text
Not a production compiler         — Phase 4 parser not yet built
Not a production runtime          — Phases 5 and 6 are future work
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
