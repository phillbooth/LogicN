# LogicN Syntax

This document describes the proposed syntax for **LogicN / LogicN**.

LogicN is a strict, memory-safe, security-first, JSON-native, API-native and accelerator-aware programming language concept.

The syntax is currently a design proposal and may change as the language develops.

V1 syntax must be frozen before more active package surfaces are added. The
minimum acceptance bar is:

```text
20 real .lln example programs
a grammar that can parse those examples
documented function, type, match (pattern matching), Result, Option, effect and import syntax
diagnostics for unsupported or post-v1 syntax
```

Draft examples may mention post-v1 concepts, but active v1 syntax should focus
on core language, type-system, CPU-compatible execution and WASM target needs.

---

## Syntax Goals

LogicN syntax should be:

```text
clear
strict
predictable
AI-friendly
easy to parse
easy to format
easy to debug
safe by default
not overly clever
```

LogicN should avoid having many different ways to express the same idea.

---

## Source File Extension

LogicN source files use:

```text
.lln
```

Examples:

```text
boot.lln
main.lln
hello.lln
routes.lln
order-service.lln
payment-webhook.lln
fraud-check.lln
```

## Entry File

Recommended project entry file:

```text
boot.lln
```

Example project:

```text
my-app/
├── boot.lln
├── src/
│   └── main.lln
└── build/
```

---

## Basic hello World

```LogicN
secure flow main() -> Result<Void, Error> {
  print("hello from LogicN")
  return Ok()
}
```

---

## Comments

Single-line comments:

```LogicN
// This is a single-line comment
```

Documentation comments:

```LogicN
/// Starts the application.
secure flow main() -> Result<Void, Error> {
  print("hello from LogicN")
  return Ok()
}
```

AI-readable structured comments may be supported later:

```LogicN
/// @ai-purpose Handles payment webhooks safely.
/// @ai-risk Duplicate webhook delivery.
/// @ai-rule Verify HMAC before decoding JSON.
secure flow handlePaymentWebhook(req: Request) -> Result<Response, WebhookError> {
  ...
}
```

---

## Variables

Immutable variables use:

```LogicN
let
```

Example:

```LogicN
let name: String = "LogicN"
let count: Int = 10
let active: Bool = true
```

Mutable variables use:

```LogicN
mut
```

Example:

```LogicN
mut retryCount: Int = 0
retryCount = retryCount + 1
```

LogicN should be immutable by default.

---

## Type Annotations

Use:

```LogicN
name: Type
```

Example:

```LogicN
let age: Int = 35
let email: String = "hello@example.com"
let total: Money<GBP> = Money(100.00)
```

---

## Auto — Compile-Time Type Inference

`Auto` asks the compiler to infer the concrete type from the value. It is not
`Any`. The compiler resolves `Auto` at compile time to a single concrete type.

```LogicN
let count: Auto = 42          // inferred: Int
let name: Auto  = "Phillip"   // inferred: String
let active: Auto = true       // inferred: Bool
```

Invalid — ambiguous branches cannot resolve to one type:

```LogicN
let result: Auto = match status {
  "ok"    => "continue"
  "error" => 500
}
// ERROR: compiler cannot infer a single type
```

Rule: prefer explicit types in flow signatures, API boundaries and
security-sensitive values. Use `Auto` only for obvious local bindings.

---

## Explicit Conversion

LogicN should not allow implicit type coercion.

Invalid:

```LogicN
let total = "10" + 5
```

Valid:

```LogicN
let total: Int = toInt("10") + 5
```

---

## Basic Types

Example:

```LogicN
let name: String = "LogicN"
let count: Int = 1
let price: Decimal = 19.99
let enabled: Bool = true
let createdAt: Timestamp = now()
let timeout: Duration = 5s
```

---

## Flow Syntax

LogicN uses:

```LogicN
flow
```

for normal functions.

Example:

```LogicN
flow add(a: Int, b: Int) -> Int {
  return a + b
}
```

---

## Secure Flow Syntax

Use:

```LogicN
secure flow
```

for security-sensitive logic.

Example:

```LogicN
secure flow processPayment(order: Order) -> Result<Payment, PaymentError> {
  return paymentGateway.charge(order)
}
```

---

## Pure Flow Syntax

Use:

```LogicN
pure flow
```

for deterministic logic with no side effects.

Example:

```LogicN
pure flow calculateTax(amount: Money<GBP>) -> Money<GBP> {
  return amount * 0.20
}
```

A pure flow should not:

```text
read files
write files
use network
read environment variables
access time
generate random numbers
change global state
```

---

## Effects Syntax

Flows that perform side effects should declare effects.

Example:

```LogicN
flow sendEmail(email: Email) -> Result<Void, EmailError>
effects [network.external] {
  return mailer.send(email)
}
```

Possible effects:

```text
file.read
file.write
network.inbound
network.outbound
database.read
database.write
environment.read
secret.read
time.read
random.read
```

---

## Return Types

Every flow should declare a return type.

Example:

```LogicN
flow getName() -> String {
  return "LogicN"
}
```

Fallible flows should return:

```LogicN
Result<T, Error>
```

Example:

```LogicN
flow loadOrder(id: OrderId) -> Result<Order, OrderError> {
  ...
}
```

---

## Type Definitions

Example:

```LogicN
type Customer {
  id: CustomerId
  name: String
  email: Option<Email>
}
```

---

## Enum Definitions

Example:

```LogicN
enum PaymentStatus {
  Paid
  Unpaid
  Pending
  Failed
  Refunded
  Unknown
}
```

---

## Decision Type

Business and security decisions should use:

```LogicN
enum Decision {
  ALOw
  Deny
  Review
}
```

Example:

```LogicN
secure flow paymentDecision(status: PaymentStatus) -> Decision {
  match status {
    Paid     => ALOw
    Failed   => Deny
    Pending  => Review
    Unknown  => Review
    Unpaid   => Review
    Refunded => Review
  }
}
```

---

## Tri Syntax

Mathematical, signal, model and ternary target logic should use:

```LogicN
enum Tri {
  Positive
  Neutral
  Negative
}
```

Example:

```LogicN
pure flow signalState(score: Float) -> Tri {
  match score {
    score > 0.1  => Positive
    score < -0.1 => Negative
    _ => Neutral
  }
}
```

`Tri` values must not be used directly as business or security decisions. Convert them through an explicit policy flow that returns `Decision`.

---

## Option Syntax

Use `Option<T>` for values that may be missing.

Example:

```LogicN
let customer: Option<Customer> = findCustomer(customerId)
```

Handle with `match`:

```LogicN
match customer {
  Some(c) => processCustomer(c)
  None    => return Review("Customer missing")
}
```

Do not use `undefined`.

Do not rely on silent `null`.

---

## Result Syntax

Use `Result<T, E>` for operations that can fail.

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

---

## Error Definition Syntax

Define custom fallible error blocks using the `error` keyword. Each variant defines metadata for public exposure, status codes, and auditing requirements.

Example:

```LogicN
error AuthError {
  invalid_credentials {
    status: 401
    message: "Invalid email or password"
    view: public
  }

  account_disabled {
    status: 403
    message: "Account disabled"
    view: public
    audit: required
  }

  system_failure {
    status: 500
    message: "Login failed"
    view: public
    hide_internal: true
    audit: required
  }
}
```

---

## Pattern Matching (match)

LogicN uses `match value { ... }` for all multi-branch matching. The `_ =>`
arm is the catch-all and is always written inside the closing `}`.

`match` replaces `switch`, `case`, `elseif` from other languages.

Basic enum matching:

```LogicN
match order.payment.status {
  Paid    => shipOrder(order)
  Pending => holdForReview(order)
  Failed  => cancelOrder(order)
  Unknown => holdForReview(order)
}
```

Enum matching must be exhaustive. The compiler reports any missing cases.

### match as Expression

```LogicN
let fee: Decimal = match order.currency {
  GBP => Decimal(0.02)
  USD => Decimal(0.03)
  EUR => Decimal(0.025)
  _ => Decimal(0.03)
}
```

### Catch-All (_ =>)

The `_ =>` arm is required when:

```text
the matched type has variants not listed in the match block
the matching is over a non-enum type (String, Int, range, etc.)
```

It is optional when the `match` covers all known enum variants exhaustively.

---

## Pattern Matching with Blocks

Use block bodies `{ ... }` when a branch needs multiple statements:

```LogicN
match order.payment.status {
  Paid => {
    shipOrder(order)
    return Ok(ALOw)
  }

  Pending => {
    holdForReview(order, reason: "Payment pending")
    return Ok(Review)
  }

  Failed => {
    cancelOrder(order)
    return Ok(Deny)
  }

  Unknown => {
    holdForReview(order, reason: "Payment status unknown")
    return Ok(Review)
  }
}
```

---

## Pattern Matching — Result<T, E>

Match typed error variants for explicit error handling:

```LogicN
match createOrder(input) {
  Ok(order)          => completeCheckout(order)
  Err(PaymentDeclined) => showDeclinedMessage()
  Err(FraudBlocked)    => escalateReview()
  Err(NetworkFailure)  => queueRetry()
}
```

This is clearer than exception-driven logic and fully auditable.

---

## Pattern Matching — Validation Workflow

Pattern matching is the primary mechanism for enforcing trust state transitions
at boundaries. `unsafe unvalidated` values become `safe validated` only through
an explicit gate:

```LogicN
let rawEmail: String unsafe unvalidated = form.email

match validate.email(rawEmail) {
  Ok(email) => {
    let safeEmail: Email safe validated = email
    saveCustomer(safeEmail)
  }
  Err(InvalidEmail) => return Api.badRequest("Invalid email")
}
```

State pipeline:

```text
String unsafe unvalidated
  -> validate.email()
  -> Email safe validated
```

---

## Pattern Matching — API Boundary

Boundary matching makes all validation and persistence decisions visible:

```LogicN
secure flow createCustomer(req: Request) -> ApiResponse {
  let body: Json unsafe unvalidated = boundary.api.body(req)

  match validate.customer(body) {
    Ok(customerInput) => {
      match saveCustomer(customerInput) {
        Ok(customer)         => Api.created(customer)
        Err(DatabaseFailure) => Api.retryLater()
      }
    }
    Err(ValidationError) => Api.badRequest()
  }
}
```

Nested `match` is acceptable when each level represents a distinct boundary
decision. Max nesting depth 2 — extract to a named `flow` if deeper.

---

## Pattern Matching — Decision and Auth

Three-state governance decisions are more expressive than `Bool`:

```LogicN
// Fraud decision
match fraudDecision(order) {
  Allow  => capturePayment(order)
  Deny   => cancelOrder(order)
  Review => queueManualReview(order)
}

// Auth decision
enum AuthDecision { Allow, Deny, RequireMFA }

match authorize(user, action) {
  Allow      => executeAction()
  Deny       => Api.forbidden()
  RequireMFA => Api.mfaRequired()
}
```

`Bool` cannot express the difference between deny, review, unknown, and not
applicable. Use typed decision enums instead.

---

## Pattern Matching — Workflow State Machine

Workflow states benefit from exhaustive matching — every state must be handled:

```LogicN
enum OrderWorkflow {
  Draft
  AwaitingPayment
  Paid
  Packed
  Shipped
  Cancelled
}

match order.workflow {
  Draft           => allowEdits(order)
  AwaitingPayment => sendReminder(order)
  Paid            => queuePacking(order)
  Packed          => notifyCourier(order)
  Shipped         => archive(order)
  Cancelled       => stopWorkflow(order)
}
```

---

## Pattern Matching — Validation Errors

Structured validation errors make error handling explicit and auditable:

```LogicN
enum ValidationError {
  MissingField
  InvalidEmail
  InvalidPhone
  WeakPassword
}

match validate.registration(input) {
  Ok(data)           => createAccount(data)
  Err(MissingField)  => Api.badRequest("Missing field")
  Err(InvalidEmail)  => Api.badRequest("Invalid email")
  Err(InvalidPhone)  => Api.badRequest("Invalid phone")
  Err(WeakPassword)  => Api.badRequest("Weak password")
}
```

---

## Pattern Matching — Branded Types

Branded type validation uses the same match pattern:

```LogicN
match validate.customerId(rawInput) {
  Ok(customerId) => loadCustomer(customerId)
  Err(InvalidCustomerId) => Api.badRequest()
}
```

---

## Pattern Matching — v1 Rules

```text
1. match works with enums, Option<T>, and Result<T, E>
2. Enum matching must be exhaustive — compiler enforces missing cases
3. Result matching should explicitly handle success and each error variant
4. Validation workflows use match to enforce state transitions
5. Nested match is acceptable (max depth 2) — extract to named flow if deeper
6. Avoid wildcard-heavy matching until exhaustiveness analysis is mature
7. Keep v1 patterns simple — no guards, tuple matching or deep destructuring
8. Pattern matching should improve auditability and governance visibility
9. Compiler diagnostics for missing cases must be extremely clear
10. match syntax prioritises readability over compact cleverness
```

---

## Pattern Matching — Future (Not v1)

These patterns are planned but not part of v1:

```LogicN
// Tuple / multi-value — future
match paymentStatus, shipmentStatus {
  (Paid, Queued)    => startPacking()
  (Paid, Delivered) => completeOrder()
  (Pending, _)      => holdOrder()
  (Failed, _)       => cancelOrder()
}

// Destructuring — future
match apiResponse {
  Ok(Customer { email }) => sendReceipt(email)
  Err(error)             => log(error)
}

// Guards — future
match order {
  Order { total } if total > 1000 => requireManagerApproval()
  Order { total }                 => autoApprove()
}

// Wildcard — future (must still support exhaustiveness proof)
match status {
  Paid => complete()
  _    => hold()
}
```

v1 stance: prefer simple direct matching. Exhaustiveness must be compiler-provable.

---

## If Syntax

Use `if` only with `Bool`.

Example:

```LogicN
if isEnabled == true {
  startService()
} else {
  stopService()
}
```

Invalid:

```LogicN
if customer {
  process(customer)
}
```

Use `match` for `Option<T>`:

```LogicN
match customer {
  Some(c) => process(c)
  None    => return Review("Customer missing")
}
```

---

## Loop Syntax

LogicN supports explicit loop forms rather than a single unbounded `loop` keyword in the initial syntax.

Use:

```text
for    = iterate over a bounded collection or stream
while  = repeat while a Bool condition is true
```

Loops should be source-mapped, bounds-checked where applicable and rejected when they rely on truthy/falsy conditions.

---

## For Loop Syntax

Example:

```LogicN
for item in order.items {
  processItem(item)
}
```

---

## While Loop Syntax

Example:

```LogicN
mut count: Int = 0

while count < 10 {
  count = count + 1
}
```

Loops should be source-mapped and safe.

---

## Await Syntax

Use `await` for async operations.

Example:

```LogicN
let payment = await paymentGateway.confirm(order)
```

---

## Async Task Syntax

Use `task` for a named async unit of work that must be awaited, cancelled or reported by its owning structured-concurrency scope.

```LogicN
task paymentTask = PaymentApi.charge(order)

let payment = await paymentTask timeout 5s
```

Unbounded detached tasks are not part of the initial LogicN syntax.

---

## Wait Until Syntax

Use `wait until` for condition-based waiting.

Example:

```LogicN
wait until order.payment.status == Paid timeout 30s {
  shipOrder(order)
} timeout {
  holdForReview(order)
}
```

`await` waits for an async operation.

`wait until` waits for a condition.

---

## Parallel Syntax

Use `parallel` for structured concurrency.

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

Parallel blocks should support:

```text
timeouts
cancellation
safe error handling
source-mapped failures
```

---

## Channel Syntax

Example:

```LogicN
channel orders: Channel<OrderEvent> {
  buffer 1000
  overflow "reject"
  dead_letter "./storage/dead/orders.jsonl"
}
```

Channel rules:

```text
buffer is required
overflow must be reject, backpressure or dead_letter
dead_letter requires a target path or named queue
messages move ownership unless immutable and share-safe
```

---

## Worker Syntax

Example:

```LogicN
worker OrderWorker count 8 {
  for event in orders {
    processOrderEvent(event)
  }
}
```

Worker rules:

```text
count defines worker pool size
workers consume from declared channels
worker errors must be returned, retried, dead-lettered or reported
workers cannot capture unsafe mutable state
```

---

## Rollback Syntax

Use checkpoints and rollback blocks for multi-step workflows.

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

Rollback should not pretend every side effect is reversible.

---

## Attempt Syntax

A possible syntax for explicit fallible operations:

```LogicN
let result = attempt shipOrder(order)

match result {
  Ok(o)      => return Ok(o)
  Err(error) => return Err(error)
}
```

This is useful where a flow may fail but the developer wants explicit control.

---

## JSON Type Syntax

Example:

```LogicN
type CreateOrderRequest {
  customerId: CustomerId
  items: Array<OrderItem>
  currency: Currency
}
```

Decode JSON into a strict type:

```LogicN
let input: CreateOrderRequest = json.decode<CreateOrderRequest>(req.body)
```

Raw JSON when needed:

```LogicN
let raw: Json = req.json()
let eventType: String = raw.path("$.type").asString()
```

---

## JSON Policy Syntax

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

---

## JSON Transform Syntax

Transform blocks map one typed shape into another typed shape.

```LogicN
transform ShopifyOrder -> InternalOrder {
  id = source.id
  customerId = source.customer.id
  total = Money<GBP>(source.total_price)
  email = source.customer.email
  items = source.line_items.map(toInternalItem)
}
```

The compiler should type-check every target field, reject unknown source fields and require explicit conversions for money, timestamps, IDs and nullable values.

---

## API Syntax

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

  GET "/orders/{id}" {
    params {
      id: OrderId
    }

    query {
      includeItems: Bool
    }

    response OrderResponse
    timeout 5s
    handler getOrder
  }
}
```

---

## API Middleware and Auth Syntax

Routes may declare middleware, auth and rate limits.

```LogicN
api OrdersApi {
  GET "/orders" {
    query {
      status: Option<OrderStatus>
      limit: Int
    }

    middleware [
      request_id,
      audit_log,
      rate_limit("orders-list")
    ]

    auth required UserSession using authenticateRequest

    rate_limit {
      key request.ip
      limit 100
      window 1m
      on_exceeded TooManyRequests
    }

    response Array<OrderResponse>
    handler listOrders
  }
}
```

Middleware should be ordered, named and included in API/security reports.

---

## Service, API and Webhook Boundary Syntax

Use `service` for listener ownership and runtime mounting.

Use `api` for normal typed HTTP request/response contracts.

Use `webhook` for secured inbound event callbacks.

```LogicN
service ApiServer {
  listen port env.int("APP_PORT", default: 8080)
  mount OrdersApi
  mount PaymentWebhook
}
```

`api` and `webhook` blocks should not contain `listen`. They are mounted by a `service` block or compiled as standalone development entry points.

---

## API Handler Syntax

Example:

```LogicN
secure flow createOrder(req: Request) -> Result<Response, ApiError> {
  let input: CreateOrderRequest = json.decode<CreateOrderRequest>(req.body)

  let order = createOrderFromInput(input)

  return JsonResponse(order)
}
```

---

## Service Syntax

Possible service declaration:

```LogicN
service ApiServer {
  listen port env.int("APP_PORT", default: 8080)

  route GET "/health" -> healthCheck
  route POST "/orders" -> createOrder
  mount OrdersApi
}
```

This may be useful for simpler projects.

For larger API contracts, prefer the `api` block.

Use `mount` when a service hosts a named `api` or `webhook` block.

---

## Webhook Syntax

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

## Webhook Handler Syntax

Example:

```LogicN
secure flow handlePaymentWebhook(req: Request) -> Result<Response, WebhookError>
effects [network.inbound] {
  let event: PaymentEvent = json.decode<PaymentEvent>(req.body)

  match event.type {
    "payment.succeeded" => handlePaymentSucceeded(event)
    "payment.failed"    => handlePaymentFailed(event)
    _ => return JsonResponse({ "ignored": true })
  }

  return JsonResponse({ "received": true })
}
```

---

## API Client Syntax

Example:

```LogicN
client PaymentsApi {
  base_url env.string("PAYMENTS_API_URL")
  timeout 5s
  retry 3
  circuit_breaker true

  headers {
    Authorization "Bearer " + env.secret("PAYMENTS_API_KEY")
  }

  POST "/payments/{id}/capture" -> capturePayment
}
```

Usage:

```LogicN
let result = await PaymentsApi.capturePayment(paymentId)

match result {
  Ok(payment) => return Ok(payment)
  Err(error)  => return Err(error)
}
```

---

## Compute Block Syntax

Use compute blocks for accelerator-suitable work.

Example:

```LogicN
compute target best {
  prefer photonic
  fallback gpu
  fallback cpu

  score = fraudModel(features)
}
```

ALOwed inside compute blocks:

```text
pure maths
matrix operations
vector operations
tensor operations
model inference
signal processing
```

Not aLOwed inside compute blocks:

```text
file I/O
network I/O
database access
secret access
mutable global state
```

---

## Matrix Syntax

Example:

```LogicN
let weights: Matrix<1024, 1024, Float16>
let input: Vector<1024, Float16>
let output: Vector<1024, Float16>

output = weights * input
```

The compiler should check shape compatibility.

---

## Money Syntax

Example:

```LogicN
let amount: Money<GBP> = Money(100.00)
let tax: Money<GBP> = Money(20.00)

let total: Money<GBP> = amount + tax
```

Invalid:

```LogicN
let amount: Money<GBP> = Money(100.00)
let tax: Money<USD> = Money(20.00)

let total = amount + tax
```

Compiler should require explicit currency conversion.

---

## Security Block Syntax

Example:

```LogicN
security {
  memory_safe true
  strict_types true
  null "deny"
  undefined "deny"
  unsafe "deny"
  unhandled_errors "deny"
  implicit_casts "deny"
  truthy_falsy "deny"
  secret_logging "deny"
}
```

---

## Permissions Block Syntax

Example:

```LogicN
permissions {
  network "restricted"
  file_read "aLOw"
  file_write "restricted"
  environment "restricted"
  native_bindings "deny"
}
```

---

## Package Policy Syntax

Possible future syntax:

```LogicN
package_policy {
  aLOw_network false
  aLOw_file_write false
  aLOw_native false
  aLOw_unsafe false
}
```

---

## Import Syntax

Final import syntax uses `imports` with `use` entries:

```LogicN
imports {
  use system
  use logic
  use math
  use json
  use api
  use environment
  use target.binary
  use target.gpu
  use target.photonic
  use target.threeway
}
```

Do not use module names that start with numbers.

Avoid:

```LogicN
import 3way
```

Prefer:

```LogicN
use target.threeway
```

This settles the `import` vs `use` direction: `use` is used inside an `imports` block for capabilities, standard modules and target-facing modules.

---

## `boot.lln` Syntax

Example:

```LogicN
project "OrderRiskDemo"

language {
  name "LogicN"
  version "0.1"
  compatibility "stable"
}

entry "./src/main.lln"

targets {
  binary {
    enabled true
    platform "linux-x64"
    output "./build/release/app.bin"
  }

  wasm {
    enabled true
    output "./build/release/app.wasm"
  }

  gpu {
    enabled true
    mode "plan"
    check true
    fallback "binary"
    output "./build/release/app.gpu.plan"
  }

  photonic {
    enabled true
    mode "plan"
    check true
    fallback "gpu"
    output "./build/release/app.photonic.plan"
  }

  ternary {
    enabled true
    mode "simulation"
    output "./build/release/app.ternary.sim"
  }
}
```

---

## Build Block Syntax

Example:

```LogicN
build {
  mode "release"
  deterministic true
  source_maps true
  reports true
  ai_context true

  stages [
    "parse",
    "type_check",
    "security_check",
    "memory_check",
    "api_contract_check",
    "lower_ir",
    "optimise_ir",
    "link_modules",
    "emit_targets",
    "write_reports"
  ]
}
```

---

## Target Syntax

Example:

```LogicN
targets {
  binary {
    enabled true
    output "./build/release/app.bin"
  }

  gpu {
    enabled true
    mode "plan"
    check true
    fallback "binary"
    output "./build/release/app.gpu.plan"
  }

  photonic {
    enabled true
    mode "plan"
    check true
    fallback "gpu"
    output "./build/release/app.photonic.plan"
  }
}
```

---

## Environment Syntax

Example:

```LogicN
let port: Int = env.int("APP_PORT", default: 8080)
let apiKey: SecureString = env.secret("API_KEY")
let appName: String = env.string("APP_NAME", default: "LOApp")
```

Secrets should use `SecureString`.

---

## Logging Syntax

Example:

```LogicN
log.info("Application started")
```

With safe redaction:

```LogicN
log.info("API key loaded", { key: redact(apiKey) })
```

Invalid:

```LogicN
log.info("API key", { key: apiKey })
```

if `apiKey` is a `SecureString`.

---

## Error Syntax

Example custom error:

```LogicN
enum OrderError {
  NotFound
  PaymentFailed
  InvalidStatus
}
```

Use with `Result`:

```LogicN
flow loadOrder(id: OrderId) -> Result<Order, OrderError> {
  ...
}
```

---

## Testing Syntax

Possible future test syntax:

```LogicN
test "payment decision returns review for pending payment" {
  let decision = paymentDecision(Pending)

  expect decision == Review
}
```

API test:

```LogicN
test "POST /orders rejects invalid payload" {
  let response = testClient.post("/orders", body: {})

  expect response.status == 400
}
```

---

## Formatting Rules

LogicN should have one official formatter.

General style:

```text
two-space indentation or consistent project standard
opening brace on same line
blank line between major match branches
explicit return types
clear block structure
```

Example:

```LogicN
secure flow main() -> Result<Void, Error> {
  print("hello from LogicN")
  return Ok()
}
```

---

## Syntax Non-Goals

LogicN syntax should not include:

```text
JavaScript-style undefined
PHP-style loose typing
implicit truthy/falsy checks
hidden exceptions as the main error model
untracked global mutation
magic target fallback
untyped production JSON by default
```

---

## Postfix Type State Syntax

LogicN attaches governance state to values using postfix state syntax.
The base type is first; the state qualifier follows.

```LogicN
let input:  String  unsafe             = request.body("name")
let secret: String  secure             = env.secret("APP_SECRET")
let email:  Email   safe   validated   = validate.email(rawEmail)
let raw:    Json    unsafe unvalidated = boundary.api.body(req)
```

v1 state set:

```text
safe          ordinary trusted value
unsafe        untrusted, unchecked, external input
validated     has passed a declared validator
unvalidated   has not yet been proven acceptable
```

State cannot change through assignment. Approved transitions require explicit
validator or sanitizer calls:

```LogicN
let rawEmail: String unsafe unvalidated = form.email
let email:    Email  safe   validated   = validate.email(rawEmail)
```

State composes with generic types:

```LogicN
Option<String secure>    // contained String is secure when present
Array<String unsafe>     // array of untrusted strings
```

Full specification: `docs/Knowledge-Bases/postfix-type-state-syntax.md`.

---

## Branded Types

Branded types give a plain representation a distinct compile-time domain identity:

```LogicN
type CustomerId  = Brand<String, "CustomerId">
type OrderId     = Brand<String, "OrderId">
type SessionToken = Brand<String secure, "SessionToken">
```

`CustomerId` and `OrderId` are the same at runtime (`String`) but distinct at
compile time. The compiler rejects passing one where the other is expected.

Brand construction from external input requires validation:

```LogicN
// Correct
let id: Result<CustomerId, ValidationError> = parseCustomerId(input)

// Compile error — cannot assign String directly to branded type
let id: CustomerId = input
```

Explicit unbranding:
```LogicN
let raw: String = customerId.value()
```

Full specification: `docs/Knowledge-Bases/generic-types.md`.

---

## Enum Syntax

Canonical form:

```LogicN
enum PaymentStatus {
  Paid
  Pending
  Failed
  Refunded
}
```

The parser also accepts comma-separated and single-line forms. The formatter
always outputs the newline-separated canonical form.

Enum names and cases: PascalCase.

Enums are closed by default. Unknown external values fail closed at governed
boundaries. `match` over enums must be exhaustive.

Full specification: `docs/Knowledge-Bases/type-and-enum-declarations.md`.

---

## Syntax Design Questions

Open syntax questions:

```text
Should semicolons ever be aLOwed?
Should `flow` remain the function keyword?
Should `secure flow` be a keyword or annotation?
Should effects appear before or after the return type?
Should `Decision` be built-in or standard library?
Should `boot.lln` contain all config or import config from LogicN.config?
Should API route syntax use HTTP verbs directly or string names?
```

---

## Final Syntax Principle

LogicN syntax should make safe code the easiest code to write.

The syntax should be:

```text
strict enough for compilers
clear enough for humans
predictable enough for AI assistants
safe enough for security-sensitive systems
practical enough for JSON/API applications
future-ready enough for accelerator targets
```
