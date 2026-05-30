# LogicN — Implementation Roadmap

## Current State (2026-05-30)

```
809 tests · 0 failures · 86% overall
108/215 CEC examples stable in CI
11,855 lines TypeScript source
283 KB documents
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
| Package/import system | Working | Not built |
| Loops/iteration | Basic while/for each | Not built |
| Assignment expressions | mut x = x + 1 | Parsed (assignStmt), runtime pending |

### Stage B Milestones

```
Milestone 1: src/lexer.lln                    [SPEC WRITTEN]
  The LogicN lexer written in LogicN.
  Compiled by TypeScript bootstrapper.
  Produces identical token stream.
  First proof that LogicN can describe its own tools.
  Spec: docs/Knowledge-Bases/logicn-lexer-lln.md
  Stub: parses today; execution blocked on Phase 12A while-loops.

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
1. **Package/import system** (11E) — the compiler is multi-file
2. **Loops** — compiler needs iteration (`while`, `for each`)
3. **Assignment expressions** — `mut x = x + 1` runtime wiring
4. **Stdlib completeness** — String processing, file I/O, collections

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
  11D  — Governed Memory Blocks (full enforcement)
  11E  — Package/import system
  11C  — Wire contractEnforcer into execution

NEXT:
  12.1 — Loops (while, for each)
  12.2 — Assignment expression runtime wiring
  12.3 — Stdlib completeness (file I/O, full collections)
  12.4 — src/lexer.lln — first Stage B milestone

THEN:
  13A  — WASM sandbox
  13B  — GPU/NPU target bridges
  14   — Parser hardening + CHERI mapping
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

## See Also

- `logicn-phase-11-decisions.md` — decisions 1-11 recorded
- `logicn-phase-10-roadmap.md` — Phase 10 completion notes
- `logicn-governed-memory-blocks.md` — Phase 11D spec
- `capability-registry.yaml` — capability ↔ effect mapping
- `logicn-contract-full-model.md` — 16-section contract reference
- `logicn-signed-attestation.md` — Ed25519 / ML-DSA attestation pipeline
