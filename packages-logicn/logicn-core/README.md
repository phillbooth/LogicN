# LogicN Core

LogicN is a governance-first programming language designed to make execution
**explicit, safe, and auditable** — across CPUs, GPUs, NPUs, APUs, TPUs, AI
accelerators, WASM and future heterogeneous hardware. This package is the
language core: syntax rules, type system, effects model, memory ownership model,
diagnostics, and the prototype compiler that makes LogicN runnable today on
Node.js.

---

## Run It Now — No Installation Required

LogicN runs on **Node.js 18+**. The prototype compiler is a plain Node.js
script. No native toolchain, no LLVM, no Rust required.

```bash
cd packages-logicn/logicn-core

# Install dev dependencies
npm install

# Run a .lln file
node compiler/logicn.js run examples/hello.lln

# Check a file for safety errors
node compiler/logicn.js check examples/result.lln

# Run the full example test suite (42 tests)
npm test

# Build all examples and generate reports
npm run build:examples

# Generate AI-readable project context
node compiler/logicn.js ai-context examples --out build/examples

# Verify build artefacts and report status
npm run verify -- build/examples

# Development watch mode
npm run dev
```

---

## Status — Prototype (v0.1-beta)

LogicN is a **language-design and prototype project**. It is not a production
compiler.

The prototype (`compiler/logicn.js`) can:

- Parse and check the documented LogicN v1 subset
- Run simple `.lln` files via Node.js
- Emit scanner-level safety diagnostics (`LLN-MEMORY-*`, `LLN-SAFETY-*`,
  `LLN-BINDING-*`, `LLN-RAWPTR-*`, etc.)
- Generate JSON schema and OpenAPI specs from type declarations
- Emit placeholder build artefacts (`app.bin`, `app.wasm`) with honest
  prototype metadata
- Produce AI-readable context, memory reports, execution reports, source maps
- Run project task automation

The real lexer, parser and AST (Phase 4) are the current build target.

### How it runs today

The prototype compiles LogicN source through a TypeScript/Node.js layer. This
is a deliberate starting point — not a compromise:

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

Each layer provides its own safety guarantees. LogicN's layer is the most
explicit — ownership, effects, intent declarations — while the layers beneath
contribute managed memory and runtime safety from the JS ecosystem.

The layered memory-safety model at each level:

```
LogicN Syntax      → intended safety model (ownership, effects, intent)
TypeScript         → managed language safety (types, null checks)
JavaScript         → managed runtime semantics (GC, bounds)
Node.js            → host runtime, APIs, native bridges
V8                 → memory-managed JS engine
C++                → native implementation layer
```

The eventual goal (Stage B) is for LogicN to compile itself, replacing the
TypeScript layer with a LogicN-written compiler targeting CPU binary, WASM
and hardware accelerator backends directly.

---

## Language Overview

LogicN source files use the `.lln` extension. The language is strict by default:
no `null`, no silent coercion, no hidden exceptions, no unchecked mutation, no
raw pointers in normal code.

### File extension

```text
hello.lln
order-service.lln
payment-webhook.lln
boot.lln          ← project entry point
```

### Quick taste

```logicn
// Every flow declares what it returns — Result means it can fail
secure flow main() -> Result<Void, Error> {
  print("hello from LogicN")
  return Ok()
}
```

Run it:

```bash
node compiler/logicn.js run examples/hello.lln
```

---

## Annotated Code Examples

### 1 — Types, records and errors

```logicn
// Type aliases give meaning to raw types.
// There is no "string ID" ambiguity — OrderId and CustomerId are distinct.
type OrderId    = String
type CustomerId = String

// Records are explicit. Every field is typed. No optional fields without
// Option<T>. No silent null.
type Order {
  id:         OrderId
  customerId: CustomerId
  total:      Float
}

// Errors are typed enums — not strings, not exceptions.
// The caller must handle every variant.
enum OrderError {
  NotFound
  InsufficientFunds
  DatabaseFailed
}
```

---

### 2 — Result and Option

```logicn
// Result<T, E> is the only error model. There are no exceptions.
// The compiler will reject code that ignores a Result.
flow loadOrder(id: OrderId) -> Result<Order, OrderError> {
  return Err(OrderError.NotFound)
}

// Option<T> is the only nullable model. There is no null.
// None must be handled — it cannot be silently propagated.
flow findEmail(customerId: CustomerId) -> Option<String> {
  return None
}

// Both must be exhaustively matched.
secure flow requireOrder(id: OrderId) -> Result<Order, OrderError> {
  let result: Result<Order, OrderError> = loadOrder(id)

  match result {
    Ok(order) => return Ok(order)
    Err(err)  => return Err(err)
  }
}
```

---

### 3 — Effects and flow safety levels

LogicN flows declare their **safety level** and their **effects**. The compiler
enforces that declared effects match actual behavior.

```logicn
// ── pure flow ────────────────────────────────────────────────────────────
//
// Pure flows cannot:
//   - perform I/O of any kind
//   - call effectful flows
//   - use `mut` bindings (LLN-BINDING-004)
//   - use `await`
//
// They are deterministic and composable. Use them for all computation that
// does not touch the outside world.
//
pure flow calculateDiscount(total: Float, pct: Float) -> Float {
  return total * (pct / 100.0)
}


// ── guarded flow ─────────────────────────────────────────────────────────
//
// Guarded flows declare the effects they use.
// The compiler verifies that every effect used inside is listed here.
// Callers must also declare these effects to use this flow.
//
guarded flow processOrder(input: CreateOrderRequest) -> Result<OrderId, OrderError>
effects [database.write, network.outbound] {

  // `let` binding — immutable. Cannot be reassigned (LLN-BINDING-001).
  let order: Order = Order {
    id:         generateId()
    customerId: input.customerId
    total:      input.total
  }

  // Result must be handled. Ignoring it is a compile error.
  match saveOrder(order) {
    Ok(saved) => return Ok(saved.id)
    Err(_)    => return Err(OrderError.DatabaseFailed)
  }
}


// ── secure flow ───────────────────────────────────────────────────────────
//
// Secure flows enforce additional safety rules:
//   - `Tri` cannot be used as a branch condition directly
//   - `unknown_as: true` is always an error
//   - stricter secret handling
//
secure flow verifyPayment(status: PaymentStatus) -> Decision {
  match status {
    Paid     => Allow
    Unpaid   => Review
    Pending  => Review
    Failed   => Deny
    Unknown  => Review   // explicit — not a silent fallback
  }
}
```

---

### 4 — Memory: borrow and move

LogicN has a hybrid ownership model. Every value has an explicit ownership state.

```logicn
// ── borrow — temporary read-only access ──────────────────────────────────
//
// `borrow buf` passes read-only access without transferring ownership.
// The caller keeps the buffer. The borrow expires when peekFirstByte returns.
// Multiple simultaneous read-only borrows are allowed.
//
pure flow peekFirstByte(borrow buf: Buffer) -> Option<UInt8> {
  if buf.size == 0 {
    return None
  }
  return buf.data.get(0)    // returns Option<UInt8> — bounds-safe
}

// Caller: buf is still owned and usable after the call
flow inspectBuffer() -> Result<UInt8, String> {
  let buf: Buffer = Buffer { data: [0x48, 0x65, 0x6C], size: 3 }

  let first = peekFirstByte(borrow buf)  // borrow ends here

  // buf is fully owned here — borrow has expired
  match first {
    Some(b) => return Ok(b)
    None    => return Err("empty buffer")
  }
}


// ── move — explicit ownership transfer ───────────────────────────────────
//
// `move conn` transfers ownership into closeConnection.
// The caller's `conn` is invalid after this call.
// Using it afterward is LLN-MEMORY-001 (USE_AFTER_MOVE).
//
secure flow closeConnection(move conn: Connection) -> Result<Void, ConnError> {
  return conn.close()
  // conn is owned here — caller cannot use it again
}

// REJECTED: use after move
flow badExample() -> Result<Void, String> {
  let conn: Connection = Connection.open("db://...")
  closeConnection(move conn)
  return conn.ping()    // ERROR: LLN-MEMORY-001 — conn was moved
}


// ── mut binding — explicit, visible mutation ──────────────────────────────
//
// `mut` makes reassignment visible. It cannot appear in `pure flow`.
// Attempting it in a pure flow emits LLN-BINDING-004.
//
guarded flow buildList(items: Array<String>) -> Array<String>
effects [none] {
  mut result: Array<String> = []

  // processing loop (for syntax pending Phase 1 grammar)
  return result
}
```

---

### 5 — Unsafe — always explicit, always justified

Raw pointer access and other unsafe operations are allowed, but they must be
**declared, justified and recoverable**.

```logicn
// ── unsafe block ─────────────────────────────────────────────────────────
//
// Every unsafe block must declare:
//   reason   — a human-readable justification (required)
//   fallback — a safe flow to call if the unsafe path fails (required)
//
// Missing `reason` emits LLN-MEMORY-008 (UNSAFE_MEMORY_REQUIRES_FALLBACK).
// Raw pointer access outside unsafe emits LLN-RAWPTR-001.
//
flow readRegister(addr: UInt32) -> Result<UInt32, HardwareError> {
  unsafe block readMMIO reason "MMIO register requires direct memory read" fallback safeDefault {
    let value: UInt32 = *mmio_ptr(addr)
    return Ok(value)
  }
}

// REJECTED: unsafe block without reason
flow badUnsafe() -> Result<UInt32, HardwareError> {
  unsafe block readMMIO {           // ERROR: LLN-MEMORY-008 — missing reason
    let value = *mmio_ptr(0x4000)
    return Ok(value)
  }
}

// REJECTED: raw pointer outside unsafe
flow alsoRejected(ptr: Pointer<UInt32>) -> UInt32 {
  return *ptr    // ERROR: LLN-RAWPTR-001 — raw pointer outside unsafe block
}
```

---

### 6 — Webhooks and API contracts

```logicn
// Webhook declarations include security policy — HMAC, replay protection,
// body size limits. The compiler checks the handler type.
webhook PaymentWebhook {
  path   "/webhooks/payment"
  method POST

  security {
    hmac_header      "Payment-Signature"
    secret           env.secret("PAYMENT_WEBHOOK_SECRET")
    max_age          5m
    max_body_size    512kb
    replay_protection true
  }

  idempotency_key json.path("$.id")
  handler         handlePaymentWebhook
}

// The handler is a normal typed secure flow.
// JSON decode is explicit — the schema is enforced at compile time.
secure flow handlePaymentWebhook(req: Request) -> Result<Response, WebhookError>
effects [network.inbound] {
  let event: PaymentEvent = json.decode<PaymentEvent>(req.body)

  match event.type {
    "payment.succeeded" => handlePaymentSucceeded(event)
    "payment.failed"    => handlePaymentFailed(event)
    _                   => return JsonResponse({ "ignored": true })
  }

  return JsonResponse({ "received": true })
}
```

---

### 7 — Task automation

Tasks declare their dependencies and permissions before anything runs.

```logicn
task buildApi {
  depends [generateTypes]
  effects [filesystem, compiler, reports]

  permissions {
    read  "./src"
    write "./build"
  }
}
```

Run:

```bash
node ../../logicn-core-cli/dist/index.js task buildApi --file tasks.lln --dry-run
```

---

## Roadmap

The v1 foundation phases build the language before expanding into domain
packages, frameworks or advanced targets.

```
Phase 0 — Workspace Freeze                              ✅ complete
  Active packages: core, compiler, tooling only.
  Finance, electrical, OT archived.
  GPU/AI/photonic labelled post-v1.

Phase 1 — V1 Syntax Freeze                             ✅ complete
  V1 grammar documented.
  Authoritative keyword table (v1-reserved-keywords.md).
  One preferred spelling per core construct.
  Syntax diagnostics: LLN-SYNTAX-001..004.

Phase 2 — Example Corpus                               ✅ complete
  20 v1 .lln examples:
    5 basic    — variables, flows, records, Result, Option
    5 types    — variants, match, Tri, generics, effects
    5 API/JSON — decode, validation, errors, webhooks, contracts
    3 memory   — borrow-scope, move-cleanup, reject-use-after-move
    2 concurrency — structured await, workers
  examples-manifest.md classifies all examples.
  EXPECT: ACCEPT / EXPECT: REJECT headers on all v1 examples.

Phase 3 — Memory Model Commitment                      ✅ complete
  Hybrid ownership model documented (logicn-v1-memory-model.md).
  LLN-MEMORY-001..008 defined and exported.
  LLN-BINDING-001..004 defined and exported.
  LLN-RAWPTR-001 defined and exported.
  Scanner enforcement live:
    mut in pure flow           → LLN-BINDING-004
    unsafe block without reason → LLN-MEMORY-008
    raw pointer outside unsafe  → LLN-RAWPTR-001
  borrow, move, pinned reserved in keyword table.
  AstNodeKind memory vocabulary committed (borrowExpr, moveExpr,
    pinnedDecl, borrowMutExpr, ownershipTransfer, borrowScopeBlock,
    configMemoryBlock).
  28/28 compiler contract tests passing.
  42/42 example suite tests passing.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ← current position

Phase 4 — Parser and AST                               ⬜ next
  Lexer consuming v1-reserved-keywords.md as its source of truth.
  Parser for the full v1 grammar subset.
  Stable AST with source spans for all diagnostics.
  Parser tests for every v1 ACCEPT example.
  Rejection tests for all REJECT examples.
  Error messages with file, line, column, suggested fixes.

Phase 5 — Type and Effect Checker                      ⬜ future
  Name resolution and symbol table.
  Type checking: primitives, records, enums, Result, Option, Tri, Bool.
  Exhaustive match checks for all types.
  Explicit Tri-to-Bool conversion policy enforcement.
  Effect propagation: pure code cannot call effectful flows.
  Full lifetime and borrow analysis (borrow checker):
    borrow does not outlive owner (LLN-MEMORY-003 full)
    mutable alias detection (LLN-MEMORY-005 full)
    cross-branch move tracking (LLN-MEMORY-001 full)

Phase 6 — Runtime and Reports                          ⬜ future
  CPU-compatible checked execution for the v1 subset.
  WASM target planning report.
  Build/check report: syntax, type, effect, memory diagnostics.
  Source map output for all checked examples.
  AI-readable project summary from real parser/checker facts.
```

**After the foundation (post-v1 maturity order):**

```text
1. Real compiler pipeline: parser, AST, symbol table, type/effect/memory
   checker, IR, output
2. Traits, protocols and generic constraints
3. Deterministic cleanup for resources and secrets
4. Testing syntax and `LogicN test` model
5. FFI and trusted module system
6. Package manager and registry design
7. Async streams, cancellation, timeouts, bounded queues
8. Source-mapped runtime errors across all targets
9. Small standard library
10. Debug/profile/lint tooling
```

**Deferred until after the foundation:**

```text
finance packages        GPU target
electrical packages     AI accelerator target
OT packages             photonic target
production benchmarks   ORM / CMS / admin UI
```

---

## Architecture

```
logicn-core          ← you are here
  Language rules, type system, effects model, memory ownership model,
  AstNodeKind vocabulary, diagnostic contract types, examples.

logicn-core-compiler
  Scanner-level enforcement (Phase 3 live).
  Lexer, parser, AST, type/effect/memory checker (Phases 4–5).
  Diagnostic constants: LLN-MEMORY-*, LLN-SAFETY-*, LLN-BINDING-*,
    LLN-RAWPTR-*, LLN-SYNTAX-*, LLN-BLOCK-*, LLN-STRING-*, etc.

logicn-core-runtime
  Checked and compiled execution, effect dispatch, structured await,
  runtime errors, cancellation, timeout enforcement.

logicn-core-security
  SecureString, redaction, permissions, crypto policy, security reports.

logicn-core-config
  Project configuration, environment modes, production policy.

logicn-core-reports
  Shared report schemas, diagnostics, processing reports, writer contracts.

logicn-core-logic
  Tri, Decision, RiskLevel, Omni-logic, truth tables.

logicn-core-vector / logicn-core-compute
  Vectors, matrices, tensors, compute planning, target selection.

logicn-target-cpu / logicn-target-wasm   ← v1 active targets
  CPU capability detection, fallback, WASM planning.

logicn-target-gpu / logicn-ai / logicn-*  ← post-v1
  GPU, AI accelerators, neural, neuromorphic, low-bit, photonic.
```

**Key boundaries:**

- `logicn-core` is the language. It must not become a web framework.
- `logicn-core-compiler` is the only package that owns diagnostic emission.
- Effects are declared in source — the compiler does not infer them silently.
- `unsafe` requires `reason` + `fallback` — always.
- GPU, photonic, AI accelerators are backend profiles — not core syntax.

---

## Diagnostic Codes

All LogicN diagnostics follow the `LLN-SERIES-NNN` format. The full table lives
in `docs/Knowledge-Bases/compiler-diagnostics.md`.

Active implemented series:

| Series | Covers | Status |
|---|---|---|
| `LLN-MEMORY-001..008` | Ownership, borrow, move, aliasing, bounds, unsafe | ✅ Phase 3 |
| `LLN-RAWPTR-001` | Raw pointer outside unsafe block | ✅ Phase 3 |
| `LLN-BINDING-001..004` | Immutable/readonly binding, mut-in-pure | ✅ Phase 3 |
| `LLN-SAFETY-001..006` | Tri/Bool safety, secret literals, dynamic code | ✅ Phase 3 |
| `LLN-SYNTAX-001..004` | Keyword violations, reserved words | ✅ Phase 1/3 |
| `LLN-BLOCK-001..004` | Typed content blocks (html, dom, script, css) | ✅ Phase 3 |
| `LLN-STRING-001..004` | String/bytes/encoding safety | ✅ Phase 3 |
| `LLN-CHAR-001..004` | Char vs byte disambiguation | ✅ Phase 3 |
| `LLN-BYTE-001..005` | Byte range, overflow, logging | ✅ Phase 3 |
| `LLN-INTENT-001..005` | Intent/effect consistency, unsafe reasons | ✅ Phase 3 |
| `LLN-PIPELINE-001..005` | Method-chain type and effect safety | ✅ Phase 3 |
| `LLN-PARSE-*` | Parse errors | ⬜ Phase 4 |
| `LLN-EFFECT-*` | Effect propagation | ⬜ Phase 5 |

---

## Repository Structure

```text
logicn-core/
├── README.md
├── package.json
├── compiler/
│   └── logicn.js              prototype CLI — parser, checker, report generation
├── examples/
│   ├── examples-manifest.md   v1 / post-v1 classification
│   ├── hello.lln              basic: simple flow
│   ├── result.lln             basic: Result and error handling
│   ├── option.lln             basic: Option and None handling
│   ├── strict-types.lln       basic: type aliases and records
│   ├── decision.lln           basic: enum and exhaustive match
│   ├── ternary-sim.lln        type-system: Tri and pure flow
│   ├── json-decode.lln        type-system: typed JSON decode
│   ├── contracts.lln          type-system: effects declarations
│   ├── api-orders.lln         api: route shapes and typed responses
│   ├── payment-webhook.lln    api: webhook with HMAC security
│   ├── rollback.lln           api: transactional flow with checkpoint
│   ├── borrow-scope.lln       memory: ACCEPT — scoped borrow
│   ├── move-cleanup.lln       memory: ACCEPT — ownership transfer
│   ├── reject-use-after-move.lln  memory: REJECT — LLN-MEMORY-001
│   ├── parallel-api-calls.lln concurrency: structured await
│   └── workers.lln            concurrency: channels and workers
├── grammar/
│   └── v1 grammar and token definitions
├── schemas/
│   └── report and generated schema contracts
├── docs/
│   ├── language-core-maturity-roadmap.md
│   └── detailed language design documents
├── tests/
│   └── *.test.mjs             Node.js built-in test runner
└── build/
    └── generated build artefacts (gitignored)
```

---

## Build Outputs

The prototype build can generate:

```text
app.bin                ← placeholder (real codegen is Phase 6)
app.wasm               ← placeholder (WASM planning is Phase 6)
app.openapi.json       ← real output from type declarations
app.security-report.json
app.memory-report.json
app.execution-report.json
app.source-map.json
app.build-manifest.json   ← per-source and dependency hashes
app.ai-guide.md           ← AI-readable project context
app.ai-context.json
```

Compiled artefacts are not secrets. Real secrets must remain in environment
variables or secret managers — never in source or build output.

---

## AI Support

LogicN is designed to be readable by AI tools without requiring large context
windows.

```bash
# Generate a compact AI-readable summary of the examples
node compiler/logicn.js ai-context examples --out build/examples

# Explain a specific file for AI context
node compiler/logicn.js explain examples/source-map-error.lln --for-ai
```

AI reports are compact, deterministic, source-mapped and free of secrets.

---

## Licence

LogicN is licensed under the Apache License 2.0. See `LICENSE`, `LICENCE.md`
and `NOTICE.md`.
