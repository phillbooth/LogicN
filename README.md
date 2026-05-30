# LogicN

LogicN is a governance-first programming language, runtime and execution
architecture designed to make secure computation **explicit, auditable and
portable** across CPUs, GPUs, NPUs, APUs, TPUs, AI accelerators, WASM and
future heterogeneous hardware â€” including any device that can run governed
compute, from edge silicon to data centre accelerators.

Rather than adding safety features to an existing language, LogicN is designed
from the ground up around the principle that execution intent, capability
boundaries, memory ownership, and effects should be **declared in source and
enforced by tooling** â€” not inferred, guessed, or left to convention.

---

## Build Progress

**Post-Photonic & Hardware Security** — CHERI capability hardware, ML-DSA attestation, ARM MTE, TEE

```
▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5%
```

**Passive Execution Plans + Target Bridges** — Phase 13: GIR → Plan → CPU/GPU/NPU/WASM/Photonic

```
▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   8%
```

**Runtime written in LogicN** — Stage B: LogicN compiler compiles itself ← Major achievement milestone

```
▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  12%  (lexer.lln written and executable)
```

**TypeScript Runtime** — Stage A: compiler pipeline + execution engine running on Node.js

```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░  92%  (1543 tests · 0 failures · 189/222 CEC stable)
```

| Layer | Status | % |
|---|---|---|
| Specification / KB | 285 docs, 222 examples, full type hierarchy, 16-section contracts | 99% |
| Lexer | All 56 keywords, all literal forms, loops/assignment | 99% |
| Parser | Flows, fn, routes, all contracts, loops, record literals, Brand alias | 93% |
| Type checker | 22 codes (LLN-TYPE-001..022), full inferType(), governance qualifiers | 98% |
| Value-state checker | Taint, 2-hop taint, user gates, secrets, protected boundary | 75% |
| Effect checker | 4 codes, topoSort via devtools-graph-algorithms | 68% |
| Event checker | LLN-EVENT-001/002, declare-before-emit | 90% |
| Governance verifier | 9 codes, contract sets, response.denies, 11C enforcement | 78% |
| GIR emitter | Schema, tensor metadata, #record literals | 65% |
| Runtime / interpreter | Loops, assignment, capabilityHost, governed memory | 85% |
| Standard library | Money BigInt, Duration, Timestamp.format, String.format, Bytes.sha256 | 72% |
| Route / HTTP | request/req dual-key, path params, JSON body | 75% |
| Audit / proof chain | JSONL, SHA-256 5-hash proof, verify | 80% |
| Signed attestation | Ed25519 sign/verify, YAML, runtime integration | 88% |
| CEC coverage | 189/222 stable, 10 domain suites, all real-world patterns | 85% |
| Internal graph | logicn-devtools-graph-algorithms (45t), logicn-devtools-graph-project (90t) | 90% |

---

*Stage A (TypeScript Runtime) must be complete before Stage B begins.
At Stage B the compiler and runtime are rewritten in LogicN, removing the
TypeScript bootstrap entirely and proving the governance model is real.*

---

```text
intent
    â†“
governed execution plan
    â†“
coordinated compute
    â†“
audit proof
```

**[Intent](docs/Knowledge-Bases/logicn-concept-intent.md)** â€” The explicit declaration of what a flow or system is *for*: its purpose, the authority it requires, the effects it may produce, the boundaries it must respect, and the outcomes it intends to deliver. Intent is machine-readable, compiler-visible, and enforceable â€” not documentation.

**[Governed Execution Plan](docs/Knowledge-Bases/logicn-concept-governed-execution-plan.md)** â€” The compiler/runtime-generated operational contract that defines how execution is *permitted* to occur: which capabilities are granted, which effects are allowed, which resources may be accessed, which runtime targets are approved, and which behaviors are explicitly denied. The bridge between declared intent and actual execution.

**[Coordinated Compute](docs/Knowledge-Bases/logicn-concept-coordinated-compute.md)** â€” The runtime orchestration layer that transforms a governed execution plan into actual execution across CPU, GPU, NPU, APU, WASM, native and future targets. Responsible for target selection, fallback coordination, memory isolation, accelerator dispatch and runtime verification â€” all within declared authority constraints.

**[Audit Proof](docs/Knowledge-Bases/logicn-concept-audit-proof.md)** â€” The structured, verifiable runtime evidence that execution occurred within declared authority, respected governance policy, enforced runtime constraints and satisfied safety guarantees. Not logs â€” provable evidence.

---

## What LogicN Is

LogicN is three things building toward one platform:

**1. A language** â€” strict typing, explicit errors, explicit memory ownership,
declared effects, no hidden nulls, no silent failures. Source files use `.lln`.

**2. A compiler and checker** â€” a pipeline that enforces the language rules
before code runs. Phases 3â€“11B are complete (1543 tests, 0 failures). The
runtime and IR generation pipeline is the current focus
as the project moves toward Phase 12 and the self-hosting compiler.

**3. A governed runtime architecture** â€” a model for coordinating compute
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
| boundary data silently typed | `unsafe let raw` â€” untrusted until decoded to a safe type |
| AI reads code | AI reads structured reports: diagnostics, source maps, intent manifests |
| fixed hardware assumptions | declared targets: CPU, NPU, APU, GPU, WASM, accelerator |

---

## Status â€” Active Development (v0.1-beta)

LogicN is a **language-design and active compiler project**. It is not a production runtime.

**What works today (1543 tests, 0 failures):**

- Full lexer â€” all v1 keywords, char/hex/binary literals, doc comments
- Full parser â€” all flow qualifiers, match with exhaustiveness, enums with variants, record types with fields, fn helpers, route declarations, `protected`/`redacted` type qualifiers
- Type checker â€” LLN-TYPE-001 (unknown types), LLN-TYPE-008 (null/undefined), LLN-TYPE-009 (generic arity), LLN-TYPE-020 (shadowing), LLN-TYPE-021 (non-exhaustive match), LLN-TYPE-022 (unreachable patterns)
- Symbol resolver â€” LLN-NAME-001 (undeclared names), LLN-NAME-002 (duplicate declarations)
- Value-state checker â€” LLN-VALUESTATE-001/003, LLN-SECRET-001/002 (unsafeâ†’sink, SecureString rules)
- Effect checker â€” LLN-EFFECT-001..004 with guarded/pure/secure flow support and inter-flow propagation
- Scanner-level safety checks â€” binding rules, `mut` in pure flow, unsafe block enforcement, raw pointer detection
- Canonical Example Corpus â€” 175 `.lln` examples across 9 levels with expected diagnostics

**What is actively being built:**

- Phase 7B â€” type inference, operator type rules (LLN-TYPE-004), call argument checking
- IR generation â€” AST â†’ GIR (Governed Intermediate Representation)
- Runtime execution engine â€” AST interpreter for Stage A

**What is not yet implemented:**

- IR emitter and backend lowering
- Runtime execution engine
- Route / HTTP dispatch
- Standard library implementations
- GPU, AI accelerator, photonic targets (post-v1)

---

## Code Example

```logicn
// â”€â”€ Boundary data: unsafe until validated â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Data arriving from outside (HTTP, file, env) is marked `unsafe let`.
// The compiler prevents it reaching typed sinks without a validation gate.
//
secure flow createPatient(readonly req: Request) -> Result<Response, ApiError>
with effects [database.write, audit.write]
intent "Create a patient record with protected PII handling" {

  unsafe let rawEmail: String =
    req.body.email

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


// â”€â”€ Pure flows: zero side effects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// The compiler enforces: no I/O, no effectful calls, no mutation.
//
pure flow calculateVat(price: Money<GBP>) -> Money<GBP> {
  return price * Decimal("0.20")
}


// â”€â”€ Guarded flows: declared effects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Every effect must be declared. Missing effects are LLN-EFFECT-001.
//
guarded flow fetchRate(currency: CurrencyCode) -> Result<Decimal, NetworkError>
with effects [network.outbound] {

  unsafe let rawResponse: String =
    http.get("/rates/" + currency)?

  let rate: Decimal =
    json.decode<Decimal>(rawResponse)?

  return Ok(rate)
}


// â”€â”€ Match: exhaustive by default â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
Phase 3 â€” Memory Model and Scanner                       âœ… complete
  Hybrid ownership model: borrow, move, pinned.
  Scanner-level enforcement: LLN-MEMORY-*, LLN-SAFETY-*, LLN-BINDING-*.
  LLN-RAWPTR-001: raw pointer detection outside unsafe.

Phase 4 â€” Lexer and Parser                              âœ… complete
  Full v1 lexer: keywords, operators, char/hex literals.
  Recursive descent parser with Pratt expression engine.
  All flow qualifiers, enum variants, record fields, fn helpers.
  protected / redacted prefix type qualifiers.

Phase 5 â€” Effect Checker                                âœ… complete
  LLN-EFFECT-001..004.
  Pure/guarded/secure flow effect validation.
  Inter-flow effect propagation.
  Canonical effect name validation.

Phase 6 â€” Value-State and Type Checkers                 âœ… complete
  Value-state: LLN-VALUESTATE-001/003, LLN-SECRET-001/002.
  Type checker: LLN-TYPE-001, LLN-TYPE-009.
  BUILT_IN_TYPES: 50+ types including Byte, Brand, Tensor<T,Shape>.

Phase 7A â€” Symbol Resolution and Type Expansion         âœ… complete
  Symbol resolver: LLN-NAME-001/002.
  Type checker: LLN-TYPE-008/020/021/022.
  Auto inference marker, protected/redacted qualifier suppression.
  Enum variant capture; match exhaustiveness and unreachable patterns.
  Canonical Example Corpus: 175 .lln examples across 9 levels.
  Formal grammar (EBNF), glossary, AST encoding spec.

Phase 7B â€” Type Inference and Operator Checking          â¬œ in progress
  LLN-TYPE-002 TypeMismatch (assignment compatibility).
  LLN-TYPE-004 InvalidBinaryOperation (operator type rules).
  LLN-TYPE-006/007 InvalidCallArgument/Count.
  Money<C> * Decimal operator rule.
  Tri operator denial (&&/||/! on Tri values).

Phase 8 â€” IR Generation and Runtime                     â¬œ next
  AST â†’ GIR (Governed Intermediate Representation).
  AST interpreter â€” execute LogicN flows in TypeScript.
  Route / HTTP dispatch.
  JSONL audit writer and proof chain generation.

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”

Stage A â€” TypeScript / Node.js Runtime                   â¬œ building (41%)
  LogicN source compiles through the full pipeline.
  Programs execute in the Node.js runtime via the AST interpreter.
  Effects enforced at runtime. Audit records written as JSONL.
  Proof chain generated after each execution.

  LogicN Syntax
       â†“  governed checks: types, effects, memory, intent
  TypeScript runtime / compiler layer
       â†“  managed language safety, type erasure
  Node.js runtime
       â†“  host APIs, native bridges, event loop
  V8 / C++ native internals

Stage B â€” Runtime in LogicN                             â¬œ long-term (10%)
  The compiler and runtime are rewritten in LogicN.
  The TypeScript bootstrap layer is no longer needed.
  LogicN becomes self-hosted: the language proves its own model.

  LogicN Syntax
       â†“  governed checks: types, effects, memory, intent
  LogicN compiler (written in LogicN)
       â†“  real code generation: CPU binary, WASM, target IR
  CPU / WASM / NPU / APU / GPU / Photonic target
       â†“  hardware execution
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
  CPU (v1 active)          â€” x86-64, ARM, RISC-V
  WASM (v1 planning)       â€” browser, edge, serverless
  GPU (post-v1)            â€” NVIDIA CUDA, AMD ROCm, Intel Arc
  NPU (post-v1)            â€” Intel NPU, Qualcomm Hexagon, Apple Neural Engine
  APU (post-v1)            â€” AMD/Intel integrated GPU+AI silicon
  TPU / AI Accelerator (post-v1) â€” Google TPU, Intel Gaudi, AWS Trainium
  Photonic (post-v1)       â€” optical interconnect and compute planning
  Quantum (post-v1)        â€” quantum bridge via QIR/OpenQASM

LogicN Secure App Kernel
  optional runtime layer â€” APIs, auth, rate limits, jobs

LogicN API Server
  HTTP transport, route manifests, typed dispatch

LogicN CLI / Tasks / Project Graph
  developer tooling, automation, AI context

Full Frameworks (post-v1)
  CMS, admin UI, ORMs, page builders, frontend adapters
```

### Five-layer architecture

```
Layer 1: LogicN Source AST        â€” what the developer writes
       â†“ (compiler passes 1â€“8)
Layer 2: Governed IR (GIR)        â€” compiler's verified governance contract
       â†“ (target bridge)
Layer 3: Backend Lowering IR      â€” target-specific execution (CPU/WASM/GPU/â€¦)
       â†“ (runtime)
Layer 4: Runtime Execution Report â€” what actually ran (JSONL audit stream)
       â†“ (proof chain)
Layer 5: Audit Proof              â€” cryptographic evidence chain
```

**Boundary rules:**
- `logicn-core` is the language. It must not become a web framework.
- `logicn-core-compiler` owns the pipeline. `logicn-core` owns the contract types.
- `unsafe` is a language feature, not a permission to ignore safety rules.
- Hardware targets are backend profiles selected by config â€” not core syntax.
- Finance, electrical, OT packages are archived and not in the active workspace.

---

## Project Structure

```text
C:\laragon\www\LO\
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ Knowledge-Bases/           260+ spec docs, grammar, glossary, operator rules
â”‚   â””â”€â”€ Examples/                  175 canonical .lln examples across 9 levels
â”œâ”€â”€ packages-logicn/
â”‚   â”œâ”€â”€ logicn-core-compiler/      compiler pipeline â€” lexer, parser, all checkers â† active
â”‚   â”œâ”€â”€ logicn-core/               language examples and prototype
â”‚   â”œâ”€â”€ logicn-core-runtime/       execution contracts
â”‚   â”œâ”€â”€ logicn-core-security/      security primitives, redaction
â”‚   â”œâ”€â”€ logicn-core-reports/       report schemas and writer contracts
â”‚   â”œâ”€â”€ logicn-core-logic/         Tri, Decision, RiskLevel
â”‚   â”œâ”€â”€ logicn-core-vector/        Vector, Matrix, Tensor
â”‚   â”œâ”€â”€ logicn-core-compute/       compute planning and target selection
â”‚   â”œâ”€â”€ logicn-core-cli/           developer CLI
â”‚   â”œâ”€â”€ logicn-core-tasks/         safe task automation with declared effects
â”‚   â”œâ”€â”€ logicn-devtools-graph-project/  project knowledge graph
â”‚   â”œâ”€â”€ logicn-target-*/           CPU, WASM, GPU, NPU target packages
â”‚   â””â”€â”€ logicn-framework-*/        app kernel, API server (post-v1 active)
â”œâ”€â”€ build/                         generated graph, reports
â””â”€â”€ tools/
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

1543 tests, 0 failures. The compiler accepts `.lln` source via `parseProgram()` and runs all checker passes.

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
| `docs/Knowledge-Bases/formal-type-system-spec.md` | Type system â€” all 22 LLN-TYPE-* codes |
| `docs/Knowledge-Bases/compiler-diagnostics.md` | All LLN-* diagnostic series index |
| `docs/Knowledge-Bases/logicn-glossary.md` | Canonical term definitions and aliases |
| `docs/Knowledge-Bases/ast-value-encoding.md` | What `.value` means per AstNodeKind |
| `docs/Knowledge-Bases/stdlib-gates.yaml` | Gate functions and governed sinks registry |
| `docs/Knowledge-Bases/logicn-compiler-pipeline.md` | Compiler passes 1â€“10 in order |
| `docs/Knowledge-Bases/logicn-architecture-layers.md` | Five-layer architecture |
| `docs/Examples/README.md` | Canonical Example Corpus index |
| `AGENTS.md` | AI coding tool instructions |

**Core concept deep-dives:**

| Document | Concept |
|---|---|
| `docs/Knowledge-Bases/logicn-concept-intent.md` | Intent â€” semantic purpose, the intent graph, verification |
| `docs/Knowledge-Bases/logicn-concept-governed-execution-plan.md` | Governed Execution Plan â€” operational contract |
| `docs/Knowledge-Bases/logicn-concept-coordinated-compute.md` | Coordinated Compute â€” runtime orchestration |
| `docs/Knowledge-Bases/logicn-concept-audit-proof.md` | Audit Proof â€” verifiable governance evidence |
| `docs/Knowledge-Bases/flow-vs-fn-security-model.md` | route â†’ flow â†’ fn execution hierarchy |
| `docs/Knowledge-Bases/value-state-annotations.md` | unsafe/safe/protected/redacted value-state model |
| `docs/Knowledge-Bases/logicn-adaptive-runtime-profiles.md` | Adaptive vs deterministic runtime modes |
| `docs/Knowledge-Bases/logicn-quantum-target-bridge.md` | Quantum computing as a governed target |

---

## What LogicN Is Not (Yet)

```text
Not a production compiler         â€” IR generation not yet built (Phase 8)
Not a production runtime          â€” execution engine not yet built (Phase 8)
Not a web framework               â€” logicn-framework-* is optional post-v1
Not a database ORM                â€” data packages are separate
Not faster hardware               â€” compute planning â‰  hardware speed
Not automatic compliance          â€” logicn-compliance is enterprise post-v1
```

LogicN becomes credible when its safety, speed and AI-readability are enforced
by tooling and runtime behavior â€” not only described in documentation.

---

## Licence

LogicN is licensed under the Apache License 2.0. See `LICENSE`, `LICENCE.md`
and `NOTICE.md`.
