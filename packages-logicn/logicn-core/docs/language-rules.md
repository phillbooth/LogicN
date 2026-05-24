# LogicN Language Rules

This document defines the core language rules for **LogicN / LogicN**.

LogicN is a strict, memory-safe, security-first, JSON-native, API-native and accelerator-aware programming language concept.

These rules should guide all future syntax, compiler, runtime, tooling and documentation decisions.

---

## Rule Summary

LogicN should foLOw these core rules:

```text
No undefined.
No silent null.
No unsafe memory by default.
No hidden errors.
No accidental truthy/falsy logic.
No implicit type coercion.
No compiled secrets.
No unreported target fallback.
No runtime error without source mapping.
No compiled output without explainable maps and reports.
No JSON looseness by default.
No webhook without security checks.
No photonic-only requirement.
No unsafe value in runtime logic before trust conversion.
No ambient authority.
No runtime mutation of checked execution plans.
```

---

## Rule 1: Use `.lln` Files

LogicN source files must use:

```text
.lln
```

Examples:

```text
boot.lln
main.lln
hello.lln
order-service.lln
payment-webhook.lln
fraud-check.lln
```

## Rule 2: Prefer `boot.lln` for Project Entry

Full LogicN projects should use:

```text
boot.lln
```

Example:

```text
my-app/
├── boot.lln
├── src/
│   └── main.lln
└── build/
```

`boot.lln` should define:

```text
project name
language version
entry file
targets
security rules
permissions
build settings
imports
```

Small scripts may use a single `.lln` file:

```text
hello.lln
```

---

## Rule 3: LogicN Must Be Useful Without Photonic Hardware

LogicN must always support normal CPU execution.

The first practical target should be:

```text
CPU binary
```

Other targets may include:

```text
WASM
GPU plan
photonic plan
ternary simulation
```

Photonic hardware should never be required for ordinary LogicN applications.

---

## Rule 4: Strict Types by Default

LogicN must be strictly typed.

Invalid:

```LogicN
let total = "10" + 5
```

Valid:

```LogicN
let total: Int = toInt("10") + 5
```

Strict typing should apply to:

```text
numbers
strings
booleans
money
dates
JSON payloads
API requests
API responses
errors
decisions
matrix shapes
tensor shapes
security permissions
target compatibility
```

---

## Rule 5: No Implicit Type Coercion

LogicN should reject implicit conversion.

Invalid:

```LogicN
let active: Bool = 1
```

Valid:

```LogicN
let active: Bool = toBool(1)
```

Invalid:

```LogicN
let message: String = 123
```

Valid:

```LogicN
let message: String = toString(123)
```

Conversions must be visible.

---

## Rule 6: No JavaScript-Style `undefined`

LogicN must not include `undefined`.

Invalid:

```LogicN
let customer = undefined
```

Use:

```LogicN
Option<Customer>
```

Example:

```LogicN
let customer: Option<Customer> = findCustomer(customerId)

match customer {
  Some(c) => processCustomer(c)
  None    => return Review("Customer missing")
}
```

---

## Rule 7: No Silent Null

LogicN should avoid silent null behaviour.

Missing values must be explicit.

Use:

```LogicN
Option<T>
```

Not:

```text
T | null | undefined
```

Example:

```LogicN
let email: Option<Email> = customer.email

match email {
  Some(e) => sendEmail(e)
  None    => return Review("Customer email missing")
}
```

---

## Rule 7A: Unsafe Values Are Inert Before Trust Conversion

LogicN should treat `unsafe` as a trust state, not a memory-safety state.

An unsafe value cannot be used in normal runtime expressions until it is
converted or explicitly declared safe.

Invalid:

```LogicN
let raw_price: unsafe Decimal = request.price
let total = raw_price + 1
```

Invalid:

```LogicN
let raw_name: unsafe String = request.name
let name = raw_name.trim()
```

Allowed:

```LogicN
let raw_price: unsafe Decimal = request.price
let price: safe Decimal = validate.decimal(raw_price)
let total: safe Decimal = price + 1
```

The only normal operations allowed on unsafe values are `validate`, `guard` and
`sanitize`. Explicit safe declaration such as `safe foo` must be policy-visible
and reportable. `encode.*` requires an already-safe input and produces a
context-specific safe output.

---

## Rule 8: Errors Must Be Explicit

LogicN should use:

```LogicN
Result<T, Error>
```

for operations that can fail.

Example:

```LogicN
flow loadOrder(id: OrderId) -> Result<Order, OrderError> {
  let order: Option<Order> = database.findOrder(id)

  match order {
    Some(o) => return Ok(o)
    None    => return Err(OrderError.NotFound)
  }
}
```

Unhandled errors should fail compilation.

---

## Rule 9: No Hidden Exceptions by Default

LogicN should avoid hidden exceptions as the main error model.

Bad pattern:

```LogicN
flow loadOrder(id: OrderId) -> Order {
  return database.findOrderOrThrow(id)
}
```

Preferred:

```LogicN
flow loadOrder(id: OrderId) -> Result<Order, OrderError> {
  ...
}
```

If exceptions or panic-like behaviour exist, they should be reserved for unrecoverable conditions and clearly marked.

---

## Rule 10: No Accidental Truthy/Falsy Logic

Only `Bool` should be used in boolean conditions.

Invalid:

```LogicN
if customer {
  process(customer)
}
```

Valid:

```LogicN
match customer {
  Some(c) => process(c)
  None    => return Review("Customer missing")
}
```

Invalid:

```LogicN
if order.payment.status {
  shipOrder(order)
}
```

Valid:

```LogicN
match order.payment.status {
  Paid    => shipOrder(order)
  Pending => holdForReview(order)
  Failed  => cancelOrder(order)
  Unknown => holdForReview(order)
}
```

---

## Rule 11: Use `Decision` for 3-Way Business Logic

When a decision may have three states, use:

```LogicN
Decision
```

Example:

```LogicN
enum Decision {
  ALOw
  Deny
  Review
}
```

Use `Decision` for:

```text
fraud checks
payment decisions
access control
risk scoring
AI confidence routing
manual review workflows
security policy decisions
```

Do not force uncertain states into `Bool`.

---

## Rule 12: Use `Tri` for Mathematical 3-Way Logic

Use:

```LogicN
Tri
```

for mathematical, signal, model or ternary logic.

Canonical states:

```text
Positive
Neutral
Negative
```

`Tri` describes a computed or measured state. It does not approve, deny or defer any business/security action by itself.

Guidance:

```text
Decision = business/security policy result
Tri      = mathematical/ternary/model state
Bool     = true/false only
```

Do not implicitly convert between `Decision` and `Tri`.

Any conversion must be explicit and must name the policy being applied.

---

## Rule 13: `match` Should Be Exhaustive

LogicN uses `match value { ... }` for all multi-branch matching. Enum matches
must be exhaustive — the compiler reports any missing cases.

Example (complete):

```LogicN
match status {
  Paid    => ALOw
  Failed  => Deny
  Pending => Review
  Unknown => Review
}
```

If a case is missing, the compiler fails or warns depending on severity.

Invalid (incomplete):

```LogicN
match status {
  Paid   => ALOw
  Failed => Deny
}
```

If `status` also includes:

```text
Pending
Unknown
```

then the match is incomplete. The compiler error must name the missing cases.

---

## Rule 14: Immutable by Default

Values should be immutable by default.

Example:

```LogicN
let name: String = "LogicN"
```

Mutable values must be explicit:

```LogicN
mut count: Int = 0
count = count + 1
```

This supports memory safety, concurrency safety and easier reasoning.

---

## Rule 15: Memory Safe by Default

LogicN should protect against:

```text
use-after-free
double free
buffer overflow
out-of-bounds access
dangling references
uninitialised memory
unsafe shared mutation
data races
null pointer errors
```

Normal LogicN application code should not use raw pointers.

Unsafe memory features should be denied by default.

---

## Rule 16: Runtime Memory Pressure Must Be Explicit

LogicN projects may declare runtime memory pressure behaviour in `boot.lln`.

```LogicN
runtime {
  memory {
    soft_limit 512mb
    hard_limit 768mb

    on_pressure [
      "evict_caches",
      "bypass_cache",
      "backpressure",
      "spill_eligible",
      "reject_new_work",
      "graceful_fail"
    ]
  }
}
```

If spill storage is enabled, it must be aLOw-list based and sensitive values
must be denied from spill storage.

```text
SecureString
RequestContext
SessionToken
PaymentToken
PrivateKey
```

The compiler should report runtime memory policy in `app.runtime-report.json`,
`app.memory-report.json`, `docs/runtime-guide.md`,
`docs/memory-pressure-guide.md`, `app.ai-context.json` and `app.ai-guide.md`.

Cache limits must not break correctness. If a cache is full, LogicN should
calculate and return the result, bypass cache storage and report the bypass.

Total memory pressure should foLOw a controlled ladder:

```text
free finished values
evict eligible caches
bypass cache storage
apply backpressure
spill approved non-secret data
reject new work safely
fail gracefully before uncontrolled out-of-memory
```

---

## Rule 16A: Run Mode Must Stay Checked

LogicN may run source directly for scripts, learning and local development.

Run Mode must not make LogicN loose or unsafe. It should still parse, type-check,
security-check and report source locations before executing.

```text
Run fast while developing.
Compile fully before deploying.
```

Compile Mode should generate complete reports, manifests, source maps,
documentation and AI guides. The compiler should report execution policy in
`app.execution-report.json`, `docs/run-compile-mode-guide.md`,
`app.ai-context.json` and `app.ai-guide.md`.

---

## Rule 16B: Globals Must Be Registered

Local variables belong to flows. Project-wide values belong in the Strict
Global Registry.

```LogicN
globals {
  readonly APP_NAME: String = "OrderRiskDemo"
  config APP_PORT: Int = env.int("APP_PORT", default: 8080)
  secret PAYMENT_WEBHOOK_SECRET: SecureString = env.secret("PAYMENT_WEBHOOK_SECRET")
}
```

Global values must be typed, source-mapped and auditable. Secret globals must
use `SecureString` and must be redacted in reports, generated documentation and
AI context.

Mutable shared state must be declared as controlled `vault` state; accidental global
mutation should be denied.

```text
Local by default.
Shared by vault declaration.
Mutable only by controlled vault state.
Secrets always protected.
```

---

## Rule 17: Unsafe Must Be Explicit

Unsafe behaviour should never be accidental.

Default:

```LogicN
security {
  unsafe "deny"
}
```

If unsafe features exist in future versions, they must be:

```text
explicit
auditable
source-mapped
permission-checked
reported in security reports
```

---

## Rule 18: Secrets Must Use `SecureString`

Secrets should use:

```LogicN
SecureString
```

Example:

```LogicN
let apiKey: SecureString = env.secret("API_KEY")
```

Invalid:

```LogicN
let apiKey: String = "real-secret-value"
```

Invalid:

```LogicN
print(apiKey)
```

Valid:

```LogicN
log.info("API key loaded", { key: redact(apiKey) })
```

---

## Rule 19: Secrets Stay Outside Compiled Files

LogicN must not compile real secrets into:

```text
app.bin
app.wasm
app.gpu.plan
app.photonic.plan
```

Use:

```text
.env for local development
server environment variables
container secrets
cloud secrets managers
deployment platform secrets
```

Repository should include:

```text
.env.example
```

Repository should not include:

```text
.env
.env.production
.env.local
```

---

## Rule 20: JSON Is First-Class but Strict

LogicN should be JSON-native, but not loosely typed.

Preferred:

```LogicN
let input: CreateOrderRequest = json.decode<CreateOrderRequest>(req.body)
```

ALOwed when needed:

```LogicN
let raw: Json = req.json()
let eventType: String = raw.path("$.type").asString()
```

Production code should prefer typed decoding.

---

## Rule 21: JSON Must Have Safety Limits

JSON handling should support safety policies.

Example:

```LogicN
json_policy {
  max_body_size 1mb
  max_depth 32
  duplicate_keys "deny"
  unknown_fields "warn"
  null_fields "deny"
  date_format "iso8601"
}
```

LogicN should protect against:

```text
large payload attacks
deep nesting attacks
duplicate key ambiguity
unexpected null
wrong types
missing fields
unsafe number conversion
date ambiguity
schema drift
secret leakage
```

---

## Rule 22: APIs Should Be Declared with Contracts

API routes should declare request and response types.

Example:

```LogicN
api OrdersApi {
  POST "/orders" {
    request CreateOrderRequest
    response CreateOrderResponse
    errors [ValidationError, PaymentError]
    timeout 5s
    max_body_size 1mb
    handler createOrder
  }
}
```

The compiler should check that the handler matches the contract.

---

## Rule 23: Webhooks Must Be Secure by Default

Webhook declarations should include:

```text
HMAC verification
secret from environment
max age
max body size
replay protection
idempotency key
handler
```

Example:

```LogicN
webhook PaymentWebhook {
  path "/webhooks/payment"
  method POST

  security {
    hmac_header "Payment-Signature"
    secret env.secret("PAYMENT_WEBHOOK_SECRET")
    max_age 5m
    max_body_size 512kb
    replay_protection true
  }

  idempotency_key json.path("$.id")
  handler handlePaymentWebhook
}
```

---

## Rule 24: API and Webhook Handlers Must Be Typed

Handlers should use explicit request and response types.

Example:

```LogicN
secure flow createOrder(req: Request) -> Result<Response, ApiError> {
  let input: CreateOrderRequest = json.decode<CreateOrderRequest>(req.body)
  ...
}
```

Avoid untyped handlers.

---

## Rule 25: Use Timeouts for External Work

External calls should have timeouts.

Example:

```LogicN
client PaymentsApi {
  base_url env.string("PAYMENTS_API_URL")
  timeout 5s
  retry 3
  circuit_breaker true
}
```

API routes should also have timeouts where relevant.

---

## Rule 26: Use Idempotency for Webhooks and Risky Requests

Webhooks are often delivered more than once.

Use:

```LogicN
idempotency_key json.path("$.id")
```

Risky APIs may also need idempotency, especially:

```text
payments
order creation
stock reservation
refunds
external API side effects
```

---

## Rule 27: Concurrency Must Be Structured

LogicN should prefer structured concurrency.

Example:

```LogicN
parallel {
  customer = await CustomersApi.get(input.customerId)
  stock = await StockApi.check(input.items)
  risk = await RiskApi.score(input)
} timeout 5s catch error {
  return Err(ApiError.ExternalServiceFailed(error))
}
```

Avoid unbounded background work without ownership, timeout or cancellation.

---

## Rule 28: Channels Must Have Backpressure

Channels should declare buffer and overflow behaviour.

Example:

```LogicN
channel webhooks: Channel<WebhookEvent> {
  buffer 5000
  overflow "dead_letter"
  dead_letter "./storage/dead/webhooks.jsonl"
}
```

Unbounded queues should be avoided.

---

## Rule 29: Rollback Must Be Explicit

Rollback should be clear and auditable.

Example:

```LogicN
secure flow completeOrder(order: Order) -> Result<Order, OrderError> {
  checkpoint beforeOrderComplete

  reserveStock(order)
  takePayment(order)
  dispatchOrder(order)

  return Ok(order)

} rollback error {
  restore beforeOrderComplete
  releaseStock(order)
  refundPayment(order)

  return Err(error)
}
```

Do not pretend all external effects are reversible.

---

## Rule 30: Compute Blocks Must Be Pure

Compute blocks should be restricted to accelerator-suitable work.

ALOwed:

```text
pure maths
matrix operations
vector operations
tensor operations
model inference
signal processing
```

Rejected:

```text
file I/O
network I/O
database access
environment secret access
mutable global state
random side effects
```

Invalid:

```LogicN
compute target photonic {
  data = readFile("./data.json")
}
```

Valid:

```LogicN
data = readFile("./data.json")

compute target photonic fallback gpu fallback cpu {
  result = model(data)
}
```

---

## Rule 31: Target Fallback Must Be Reported

Fallback must not be silent.

Example:

```LogicN
compute target best {
  prefer photonic
  fallback gpu
  fallback cpu

  result = model(input)
}
```

The compiler should report:

```text
preferred target
selected target
fallback reason
unsupported operations
precision changes
security implications
```

---

## Rule 31A: Accelerator Output Must Be Verifiable

LogicN does not assume photonic, GPU, ternary or quantum targets produce mysterious
external data.

All accelerator outputs must be treated as local computation results and must be
validated through source maps, target reports, precision reports and optional CPU
reference checks.

Practical accelerator risks include:

```text
signal noise
precision loss
analogue drift
calibration errors
thermal effects
target mismatch
wrong fallback target
rounding differences
hardware-specific behaviour
```

Rule:

```text
Accelerator output must be verifiable against CPU reference output where practical.
```

Example:

```LogicN
compute target best verify cpu_reference {
  prefer photonic
  fallback gpu
  fallback cpu

  result = fraudModel(features)
}
```

Reports should include:

```text
CPU reference result
accelerator result where available
precision difference
confidence level
fallback reason
source location
```

Correction policy should include:

```text
detect divergence
measure precision difference
retry transient target errors
fallback to the next declared target
fallback to CPU reference when available
fail closed when tolerance is exceeded
route uncertain security or business decisions to Review
```

LogicN should not claim hardware-level photonic error correction unless a real
backend provides it. The language rule is to make accelerator correction policy
explicit, reported and source-mapped.

---

## Rule 32: Source Maps Are Required

Compiled errors must map back to original `.lln` source files.

Example error:

```text
Runtime error: PaymentStatus.Unknown was not handled.

Original source:
  app/services/order-service.lln:42:7

Suggestion:
  Add a match branch for Unknown.
```

LogicN should generate:

```text
app.source-map.json
```

---

## Rule 33: Compiler Reports Must Be Machine-Readable

LogicN should generate JSON reports.

Examples:

```text
app.failure-report.json
app.security-report.json
app.target-report.json
app.api-report.json
app.ai-context.json
```

Reports should support:

```text
developers
CI systems
deployment tools
AI assistants
security review
```

---

## Rule 34: AI Context Must Redact Secrets

AI context files should never include secret values.

Command:

```bash
LogicN ai-context
```

Output:

```text
app.ai-context.json
app.ai-context.md
```

ALOwed:

```text
secret variable names
route summaries
type summaries
target summaries
error summaries
```

Not aLOwed:

```text
API key values
passwords
private keys
tokens
database passwords
webhook secret values
```

---

## Rule 35: `LogicN explain --for-ai` Must Be Safe

The command:

```bash
LogicN explain --for-ai
```

should produce useful debugging context without leaking secrets.

Example:

```json
{
  "errorType": "TargetCompatibilityError",
  "target": "photonic",
  "file": "src/fraud-check.lln",
  "line": 18,
  "problem": "readFile cannot run inside a photonic compute block.",
  "suggestedFix": "Move readFile outside the compute block."
}
```

---

## Rule 35A: Strict Comments Are Checked Intent

LogicN supports normal comments with `//`, documentation comments with `///`, and
strict comments with `/// @tag value`.

Strict comments describe developer intent in a form that tools can check.

Example:

```LogicN
/// @purpose Updates an order.
/// @output Result<Order, Error>
/// @effects [database.write]
secure flow updateOrder(order: Order) -> Result<Order, Error>
effects [database.write] {
  return Ok(order)
}
```

Strict comments should be:

```text
machine-readable
source-mapped
AI-readable
checked where practical
free of literal secret values
```

In v0.1, strict comments are extracted into AST, source-map, security and
AI-context reports. Obvious mismatches should be warnings unless the mismatch
creates a direct security risk.

Strict comments are not required for every helper in v0.1. They are most
important at public, security, API, webhook, rollback and compute-target
boundaries.

---

## Rule 36: Builds Should Be Deterministic Where Possible

Same source, dependencies and compiler version should produce the same output where possible.

This helps:

```text
release verification
auditability
security
multi-server deployment
rollback
```

---

## Rule 37: If LogicN Can Compile It, LogicN Should Explain It

Serious LogicN builds should produce map and documentation artefacts alongside
compiled outputs.

Recommended outputs:

```text
app.source-map.json
app.map-manifest.json
app.ai-guide.md
app.build-manifest.json
app.security-report.json
app.target-report.json
docs/api-guide.md
docs/type-reference.md
docs/docs-manifest.json
app.ai-context.json
```

`boot.lln` may declare these as required build outputs. If required generated
documentation, source maps or map manifests cannot be produced, the build should
fail.

Build explanation principles:

```text
If LogicN can compile it, LogicN should be able to explain it.
If the code compiles, the AI guide should describe the code that actually compiled.
Compiled code should always come with generated explanation.
```

The AI guide must describe the code that actually compiled. It should be
regenerated only after an error-free build and its hash should be recorded in
the build manifest.

---

## Rule 38: Build Once, Deploy Many

LogicN should support:

```text
build once
deploy same artefact to many servers
load runtime config per server
```

Example:

```text
Server A → app.bin + environment variables
Server B → app.bin + environment variables
Server C → app.bin + environment variables
```

---

## Rule 39: Compiled Files Are Not Secret

Compiled output may be reverse engineered.

Do not put secrets in compiled files.

LogicN may support:

```text
symbol stripping
source-map separation
build signing
checksums
optional obfuscation
```

But the main rule remains:

```text
Secrets live outside compiled files.
```

---

## Rule 40: Generated Files Are Usually Not Committed

Do not commit build output by default.

Usually ignore:

```text
build/
*.bin
*.wasm
*.gpu.plan
*.photonic.plan
*.ternary.sim
*.source-map.json
*.map-manifest.json
*.security-report.json
*.target-report.json
*.failure-report.json
*.ai-context.json
*.build-manifest.json
```

Commit generated files only when they are intentional fixtures or release artefacts.

---

## Rule 41: LogicN Documentation Must Be Honest

Do not claim:

```text
LogicN is production-ready before it is.
LogicN has a real photonic backend before it does.
LogicN makes all software secure automatically.
LogicN can do impossible maths before a real backend exists.
LogicN prevents all reverse engineering.
```

Use accurate wording:

```text
concept
planned
proposed
future target
initial prototype
```

---

## Rule 42: Practical First, Future-Facing Second

LogicN should be useful for real software before future hardware is common.

Priority:

```text
strict types
memory safety
JSON/API development
webhook security
source maps
AI-friendly reports
CPU compatibility
```

Future value:

```text
GPU planning
photonic planning
ternary simulation
accelerator-aware compute blocks
```

---

## Final Rule

Every LogicN design decision should answer:

```text
Does this make LogicN safer?
Does this make LogicN clearer?
Does this make LogicN easier to debug?
Does this help JSON/API work?
Does this help AI tools understand the project?
Does this preserve normal CPU compatibility?
Does this prepare for future targets without requiring them?
```

If the answer is no, the feature should be reconsidered.
