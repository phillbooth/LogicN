# LogicN Standard Syntax: Bindings and Pipelines

**Status:** Stage 1 — canonical decisions documented; `var`/`const` detection live in compiler; binding/pipeline checker stubs in place  
**Scope:** `let`, `mut`, `readonly`, method-chain pipelines, rejected keywords `var`/`const`  
**Packages:** `@logicn/core`, `@logicn/core-compiler`

---

## 1. Canonical Binding Keywords

LogicN supports exactly three binding forms:

| Keyword | Meaning | Use When |
|---|---|---|
| `let` | Immutable binding; value cannot be reassigned | Default; most bindings |
| `mut` | Mutable binding; reassignment is explicit | Counters, retry loops, local accumulators |
| `readonly` | Immutable binding + read-only view over the value | Config, request metadata, large shared data |

**Not supported:**

| Keyword | Rejected | Reason |
|---|---|---|
| `var` | `LLN-SYNTAX-001` | Ambiguous across languages; encourages mutable-by-default style |
| `const` | `LLN-SYNTAX-002` | Overlaps with `let`/`readonly`; different languages disagree on its meaning |

The compiler's `validateCoreSyntaxSafety()` detects `var` and `const` in `.lln` source files and emits errors immediately.

---

## 2. `let` — Default Immutable Binding

```logicn
let amount = 100
let currency = "GBP"

let payment = Payment {
  amount: amount
  currency: currency
}
```

Reassignment is an error:

```logicn
let count = 1
count = count + 1
// ^ LLN-BINDING-001: Cannot reassign immutable let binding count.
//   Use mut only if reassignment is required.
```

---

## 3. `mut` — Explicit Mutable Binding

```logicn
mut retries = 0

while retries < 3 limit 3 {
  let response = sendRequest()

  if response.ok {
    break
  }

  retries = retries + 1
}
```

`mut` is discouraged in pure flows — use functional accumulators instead:

```logicn
// Less reliable: shared mutable state.
mut total = 0
for order in orders {
  total = total + order.amount
}

// Preferred: fold is pure and safe to optimise.
let total =
  orders
    .fold(0, (sum, order) => sum + order.amount)
```

`mut` in a pure flow context emits `LLN-BINDING-004`.

---

## 4. `readonly` — Immutable Binding + Read-Only View

```logicn
readonly appConfig = loadEnvironmentConfig()
readonly requestHeaders = request.headers
readonly API_VERSION = "1.0.0"
```

Mutation through a `readonly` binding is rejected:

```logicn
readonly config = loadConfig()
config.apiBaseUrl = "http://unsafe.example.com"
// ^ LLN-BINDING-002: Cannot reassign readonly binding config.

config.nested.value = 1
// ^ LLN-BINDING-003: Cannot mutate property nested.value through readonly binding config.
```

---

## 5. Difference Between `let` and `readonly`

```text
let      — immutable binding; the value's internal mutability depends on its type
readonly — immutable binding AND a read-only view; mutation through this reference is always rejected
```

```logicn
let user = User { name: "Phill" }
// user itself cannot be reassigned, but User.name may be mutable depending on type

readonly safeUser = user
// safeUser cannot be reassigned AND safeUser.name cannot be mutated through safeUser
```

---

## 6. Why `var` Is Rejected

```logicn
var count = 0
// ^ LLN-SYNTAX-001: LogicN does not support var.
//   Use let for immutable bindings or mut for mutable bindings.
```

`var` is rejected at compile time because:
- It implies mutable-by-default, which is the opposite of LogicN's principle
- Its meaning varies significantly across languages (JavaScript `var` vs. Kotlin `var` vs. Swift `var`)
- `mut` is a clearer, safer, more intention-revealing alternative

---

## 7. Why `const` Is Rejected

```logicn
const API_VERSION = "1.0.0"
// ^ LLN-SYNTAX-002: LogicN does not support const.
//   Use let for immutable bindings or readonly for read-only values.
```

`const` is rejected at compile time because:
- It overlaps semantically with both `let` and `readonly`
- Its meaning varies across languages (JavaScript `const` vs. C `const` vs. Rust `const`)
- `readonly` is the correct LogicN term for compile-time-resolved immutable values

---

## 8. Method-Chain Pipeline Style

LogicN uses **method-chain** pipelines as the canonical style for data transformation:

```logicn
let savedUser =
  input
    .validate()
    .sanitize()
    .toUser()
    .save()
```

The pipe operator (`|>`) is **not** canonical LogicN syntax in v0.1.

Method chaining is:
- Familiar and readable
- Easy to parse
- Compatible with typed `Result`/`Option` flows
- Suitable for IDE tooling and type inference

---

## 9. Result-Aware Pipelines

Stages that can fail should return `Result`. The pipeline propagates failure without hiding it:

```logicn
let result =
  input
    .validate()
    .sanitize()
    .decode<User>()
    .save()
```

Equivalent explicit form:

```logicn
match input.validate() {
  Ok(valid) => {
    match valid.sanitize().decode<User>() {
      Ok(user) => user.save()
      Err(error) => Err(error)
    }
  }
  Err(error) => Err(error)
}
```

Unhandled `Result` in a pipeline emits `LLN-PIPELINE-003`.

---

## 10. Optional-Aware Pipelines

```logicn
let email =
  maybeUser
    .map(user => user.email)
    .filter(email => email.isVerified())
```

`Some`/`None` must be preserved — optional values must not collapse to `null` or `undefined`.

---

## 11. Effect-Declared Pipelines

Effectful stages must match the enclosing flow's declared effects:

```logicn
guarded flow createOrder(input: CreateOrderRequest)
  intent "create customer order"
  effects [database.write, audit.write]
  audit required
{
  let order =
    input
      .validate()
      .sanitize()
      .toOrder()

  return order
    .save()           // requires database.write
    .audit("order.created")  // requires audit.write
}
```

An undeclared effect in a pipeline stage emits `LLN-PIPELINE-004`.

---

## 12. Security-Safe Pipelines

Secrets must not flow through generic string conversion:

```logicn
// Bad: toString() may leak secret values.
let report =
  payment
    .toString()
    .save()

// Good: explicit redaction before transformation.
let report =
  payment
    .redactSecrets()
    .toReport()
    .save()
```

---

## 13. Readonly Pipelines

A readonly receiver must not be mutated through a pipeline stage:

```logicn
readonly headers = request.headers

// Bad: pipeline stage mutates readonly receiver.
headers
  .setAuthorization("Bearer xyz")
// ^ LLN-PIPELINE-005: Pipeline stage attempts to mutate a readonly receiver.
```

---

## 14. Runtime Optimisation from Pure Pipelines

When a pipeline is `pure` and `effect-free`, the runtime may safely rewrite it:

```logicn
pure flow calculateTotals(orders: List<Order>)
  intent "calculate order totals"
  effects []
  compute auto
{
  let totals =
    orders
      .map(order => order.total)
      .sum()
}
```

The runtime may plan:

```json
{
  "rewrite": "map_sum_to_parallel_reduction",
  "reason": "pure transformation over immutable collection",
  "fallback": "sequential pipeline"
}
```

---

## 15. Diagnostic Codes

### Syntax diagnostics (LLN-SYNTAX-*)

| Code | Name | Trigger |
|---|---|---|
| `LLN-SYNTAX-001` | `VAR_NOT_SUPPORTED` | `var` used as a binding keyword |
| `LLN-SYNTAX-002` | `CONST_NOT_SUPPORTED` | `const` used as a binding keyword |

### Binding diagnostics (LLN-BINDING-*)

| Code | Name | Trigger |
|---|---|---|
| `LLN-BINDING-001` | `IMMUTABLE_LET_REASSIGNMENT` | Reassignment of a `let` binding |
| `LLN-BINDING-002` | `READONLY_REASSIGNMENT` | Reassignment of a `readonly` binding |
| `LLN-BINDING-003` | `READONLY_PROPERTY_MUTATION` | Property mutation through a `readonly` binding |
| `LLN-BINDING-004` | `MUT_IN_PURE_CONTEXT` | `mut` used in a pure or safe context |

### Pipeline diagnostics (LLN-PIPELINE-*)

| Code | Name | Trigger |
|---|---|---|
| `LLN-PIPELINE-001` | `UNKNOWN_PIPELINE_METHOD` | Method does not exist on current type |
| `LLN-PIPELINE-002` | `PIPELINE_TYPE_MISMATCH` | Stage output type ≠ next stage input type |
| `LLN-PIPELINE-003` | `UNHANDLED_FALLIBLE_PIPELINE` | `Result`-returning stage with no error handling |
| `LLN-PIPELINE-004` | `PIPELINE_UNDECLARED_EFFECT` | Stage uses an effect not declared on the flow |
| `LLN-PIPELINE-005` | `PIPELINE_READONLY_MUTATION` | Stage mutates a `readonly` receiver |

---

## 16. Type Contracts (`@logicn/core`)

```ts
export type BindingKind = "let" | "mut" | "readonly";

export interface BindingDeclaration {
  readonly kind: BindingKind;
  readonly name: string;
  readonly typeAnnotation?: string;
  readonly location?: SourceLocation;
}

export interface MethodChainCall {
  readonly methodName: string;
  readonly typeArguments?: readonly string[];
  readonly location?: SourceLocation;
}

export interface MethodChainExpression {
  readonly kind: "methodChainExpr";
  readonly receiver: string;
  readonly calls: readonly MethodChainCall[];
  readonly location?: SourceLocation;
}
```

New `AstNodeKind` values:
- `readonlyDecl` — `readonly name = value` declaration
- `methodChainExpr` — `receiver.method().method()` pipeline expression

---

## 17. Implementation Status

| Area | Status | Notes |
|---|---|---|
| `BindingKind`, `BindingDeclaration` types | ✅ | `@logicn/core/src/index.ts` |
| `MethodChainExpression`, `MethodChainCall` types | ✅ | `@logicn/core/src/index.ts` |
| `readonlyDecl`, `methodChainExpr` AstNodeKind | ✅ | `@logicn/core/src/index.ts` |
| `LLN-SYNTAX-001..002` constants | ✅ | `@logicn/core-compiler` |
| `LLN-BINDING-001..004` constants | ✅ | `@logicn/core-compiler` |
| `LLN-PIPELINE-001..005` constants | ✅ | `@logicn/core-compiler` |
| `var`/`const` detection in `validateCoreSyntaxSafety()` | ✅ | Real check; comment lines excluded |
| `checkBindingReassignment()` | ✅ | Typed stub; emits correct diagnostics |
| `checkReadonlyMutation()` | ✅ | Typed stub; emits correct diagnostics |
| `checkMethodChain()` | ✅ | Typed stub; empty result pending type scope |
| `boot.lln` `const` → `readonly` | ✅ | Fixed 2026-05-26 |
| `compile-time-vs-runtime-authority.md` `const` → `readonly` | ✅ | Fixed 2026-05-26 |
| Tests: var/const detection | ✅ | 6 new tests; 12/12 passing |
| Binding reassignment parser (Stage 2) | ⏳ | Blocked on AST binding scope |
| Method-chain type checker (Stage 2) | ⏳ | Blocked on type scope implementation |
| Pure-context `mut` check (Stage 2) | ⏳ | Blocked on flow safety level inference |
| Pipeline effects integration (Stage 3) | ⏳ | Blocked on effect checker wiring |
