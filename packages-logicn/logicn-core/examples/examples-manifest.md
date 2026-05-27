# LogicN — Examples Manifest

## Purpose

This manifest classifies every `.lln` example as **v1** or **post-v1**. The
v1 subset must be parseable by the Phase 4 parser or intentionally marked as a
rejection fixture. Post-v1 examples are drafts kept for reference but are
excluded from Phase 4 parser tests.

Phase 2 corpus target: ≥ 20 v1 examples covering all five categories.

---

## V1 Examples

These examples demonstrate v1 language features and must parse (or be marked
`EXPECT: REJECT`) when the Phase 4 parser is implemented.

### Basic (5)

These cover the fundamentals: flow declaration, records, simple Result, and
simple Option.

| File | Demonstrates | Status |
|---|---|---|
| `hello.lln` | Simple `flow`, `return`, `print`, `Result<Void, Error>` | ✅ v1 |
| `result.lln` | `type` alias, `enum`, `flow`, `match Result` | ✅ v1 |
| `option.lln` | `type`, `Option<T>`, `match Option`, `Some`/`None` | ✅ v1 |
| `strict-types.lln` | Type aliases, record declaration, field access | ✅ v1 |
| `decision.lln` | Multi-variant `enum`, exhaustive `match` on enum | ✅ v1 |

### Type-System (5)

These cover the extended type system: Tri, generics, effects declarations, and
explicit type contracts.

| File | Demonstrates | Status |
|---|---|---|
| `ternary-sim.lln` | `Tri` enum, `pure flow`, guard clauses in `match` | ✅ v1 |
| `json-decode.lln` | Generic type parameters, `json.decode<T>`, typed decode | ✅ v1 |
| `contracts.lln` | Effect declarations (`effects [...]`), contract-style typing | ✅ v1 |
| `source-map-error.lln` | Source-map diagnostics, compute target errors | ✅ v1 (tooling) |
| `api-orders.lln` | API route shapes, typed responses, explicit error types | ✅ v1 |

### API / JSON (5)

These cover API surfaces: typed decode, validation, explicit errors, safe
response shapes, and webhook-style input.

| File | Demonstrates | Status |
|---|---|---|
| `payment-webhook.lln` | `webhook` declaration, HMAC security, `json.decode`, policy | ✅ v1 |
| `json-decode.lln` | Typed JSON decode, `Result<T, ApiError>` | ✅ v1 (shared with type-system) |
| `contracts.lln` | Request/response contract types | ✅ v1 (shared with type-system) |
| `api-orders.lln` | Route manifest with explicit input/output types | ✅ v1 (shared with type-system) |
| `rollback.lln` | Checkpoint + rollback for transactional flows | ✅ v1 |

### Memory (3)

These cover the v1 memory model: borrow, move, and rejection of unsafe patterns.

| File | Demonstrates | Expected |
|---|---|---|
| `borrow-scope.lln` | Scoped borrow; owner is valid after borrow ends | ACCEPT |
| `move-cleanup.lln` | Move semantics; resource owned and cleaned up | ACCEPT |
| `reject-use-after-move.lln` | Use after move — rejected with LLN-MEMORY-001 | REJECT |

### Concurrency (2)

These cover the Structured Await pattern. Included as v1 if Structured Await
remains in scope (see Phase 2 exit criteria).

| File | Demonstrates | Status |
|---|---|---|
| `parallel-api-calls.lln` | `async flow`, `parallel`, `await`, `timeout` | ✅ v1 (Structured Await) |
| `workers.lln` | `channel`, `worker`, event loop | ⚠️ v1 candidate — `for` loop and `channel` syntax need Phase 1 grammar confirmation |

---

## V1 Total Count

| Category | Required | Present | Status |
|---|---|---|---|
| Basic | 5 | 5 | ✅ |
| Type-system | 5 | 5 | ✅ |
| API/JSON | 5 | 5 | ✅ |
| Memory | 3 | 3 | ✅ |
| Concurrency | 2 | 2 | ⚠️ (see `workers.lln` note) |
| **Total** | **≥ 20** | **20** | ✅ |

---

## Post-V1 Examples

These files use features that are deferred until after the Phase 0–3
foundation. They must not be included in Phase 4 parser tests.

| File | Reason deferred |
|---|---|
| `gpu-plan.lln` | GPU target — deferred to post-v1 |
| `photonic-plan.lln` | Photonic target — deferred to post-v1 |
| `compute-block.lln` | Heterogeneous compute blocks — post-v1 target planning |
| `compute-mix-throughput-benchmark.lln` | Benchmark — no repeatable method yet |
| `arithmetic-threshold-benchmark.lln` | Benchmark — no repeatable method yet |
| `four-digit-guess-benchmark.lln` | Benchmark — no repeatable method yet |
| `browser-form.lln` | Browser target — post-v1 |
| `logic-review-scale.lln` | Large-scale example — review for v1 content before classifying |
| `ai-context.lln` | AI context generation — report/tooling feature, not core language |
| `boot.lln` | Project manifest — tooling configuration, not a language example |

---

## Rejection Fixtures

These examples must produce specific diagnostics. They are valid v1 test
inputs but must not be parsed as correct programs:

| File | Expected diagnostic | Reason |
|---|---|---|
| `reject-use-after-move.lln` | `LLN-MEMORY-001` | Use after ownership move |

---

## Parser Test Classification

When the Phase 4 parser is implemented, test files are divided as follows:

```
Phase 4 accept corpus:
  hello.lln
  result.lln
  option.lln
  strict-types.lln
  decision.lln
  ternary-sim.lln
  json-decode.lln
  contracts.lln
  api-orders.lln
  payment-webhook.lln
  rollback.lln
  borrow-scope.lln
  move-cleanup.lln
  parallel-api-calls.lln
  workers.lln (pending grammar confirmation)
  source-map-error.lln (pending grammar confirmation)

Phase 4 reject corpus (intentional failures):
  reject-use-after-move.lln → LLN-MEMORY-001

Post-v1 (excluded from Phase 4 tests):
  gpu-plan.lln
  photonic-plan.lln
  compute-block.lln
  compute-mix-throughput-benchmark.lln
  arithmetic-threshold-benchmark.lln
  four-digit-guess-benchmark.lln
  browser-form.lln
  logic-review-scale.lln
  ai-context.lln
  boot.lln
```

---

## Authoring Rules for New Examples

1. Each example demonstrates exactly one language rule or pattern.
2. The first line comment must be one of:
   - `// EXPECT: ACCEPT` for correct programs
   - `// EXPECT: REJECT` with `// ERROR: LLN-CODE` for intentional failures
3. Examples must not depend on archived domain packages or post-v1 targets.
4. Examples must be added to this manifest before they are referenced in tests.
