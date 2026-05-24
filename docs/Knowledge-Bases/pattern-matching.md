# Pattern Matching

## Definition

LogicN uses `map(value) { ... } else { ... }` for all multi-branch matching and
value transformation. This replaces `switch`, `case`, and `elseif` from other
languages.

The `else` branch is the catch-all fallback. It is always written outside the
closing `}` of the `map` block.

## Value Matching

Match a value against known variants:

```logicn
let message: String = map(payment.status) {
  Paid     => "Payment complete"
  Failed   => "Payment failed"
  Pending  => "Waiting for payment"
  Refunded => "Refunded"
}
else {
  "Unknown payment status"
}
```

## Enum Exhaustion

The compiler reports non-exhaustive maps for known enum types:

```logicn
enum OrderStatus { Placed, Confirmed, Shipped, Delivered, Cancelled }

let label: String = map(order.status) {
  Placed    => "Order received"
  Confirmed => "Order confirmed"
  Shipped   => "On the way"
  Delivered => "Delivered"
  // Missing: Cancelled
}
else {
  "Unknown"
}
// Compiler: LNN-WARN — non-exhaustive enum map, Cancelled not handled explicitly
```

## Range Matching

Numeric ranges are matched top-to-bottom, first match wins:

```logicn
let grade: String = map(score) {
  >= 90 => "excellent"
  >= 70 => "good"
  >= 50 => "pass"
}
else {
  "fail"
}
```

## Object Pattern Matching

Match against a combination of fields:

```logicn
let handler = map(request) {
  { method: "GET",    path: "/users"    } => get_users()
  { method: "POST",   path: "/users"    } => create_user()
  { method: "GET",    path: "/orders"   } => get_orders()
  { method: "DELETE", path: "/orders"   } => cancel_order()
}
else {
  not_found()
}
```

## Type-Based Matching

Match on a discriminated union variant:

```logicn
let result: String = map(api_result) {
  Ok(data)  => format_data(data)
  Err(e)    => format_error(e)
}
```

## Option Matching

```logicn
let user_name: String = map(found_user) {
  Some(u) => u.name
  None    => "Guest"
}
```

## Nested Matching

Avoid nesting `map` inside `map` where possible (max nesting depth 2). Extract
to a named `fn` or `flow` if logic grows:

```logicn
fn classify_order(order: Order) -> String {
  map(order.status) {
    Confirmed => classify_payment(order.payment)
    Cancelled => "cancelled"
  }
  else { "unknown" }
}

fn classify_payment(payment: Payment) -> String {
  map(payment.status) {
    Paid   => "paid-confirmed"
    Failed => "payment-failed"
  }
  else { "payment-unknown" }
}
```

## Binding in Patterns

Capture the matched value with a name:

```logicn
map(response) {
  Ok(order)     => save_and_return(order)
  Err(NotFound) => return Err(OrderError.NotFound)
  Err(e)        => return Err(e)
}
```

## map as Expression

`map` is an expression and can be used directly in assignments:

```logicn
let fee: Decimal = map(order.currency) {
  GBP => Decimal(0.02)
  USD => Decimal(0.03)
  EUR => Decimal(0.025)
}
else {
  Decimal(0.03)
}
```

## What map Replaces

| Other language | LogicN |
| --- | --- |
| `switch (x) { case A: ... }` | `map(x) { A => ... }` |
| `if x == A ... else if x == B` | `map(x) { A => ... B => ... }` |
| `match x { A => ... }` (Rust) | `map(x) { A => ... }` |

## Catch-All Rule

The `else` block is the catch-all. It is required when:

```text
the matched type has variants not listed in the map block
the matching is over a non-enum type (String, Int, etc.)
```

It is optional when:

```text
the map covers all known variants of an enum exhaustively
```

## Governance and Validation Patterns

### Validation Workflow

```logicn
let rawEmail: String unsafe unvalidated = form.email

map(validate.email(rawEmail)) {
  Ok(email) => {
    let safeEmail: Email safe validated = email
    saveCustomer(safeEmail)
  }
  Err(InvalidEmail) => return Api.badRequest("Invalid email")
}
```

State pipeline: `unsafe unvalidated -> safe validated`

### API Boundary Matching

```logicn
secure flow createCustomer(req: Request) -> ApiResponse {
  let body: Json unsafe unvalidated = boundary.api.body(req)

  map(validate.customer(body)) {
    Ok(customerInput) => {
      map(saveCustomer(customerInput)) {
        Ok(customer)        => Api.created(customer)
        Err(DatabaseFailure) => Api.retryLater()
      }
    }
    Err(ValidationError) => Api.badRequest()
  }
}
```

### Decision Matching

```logicn
enum Decision { Allow, Deny, Review }

map(fraudDecision(order)) {
  Allow  => capturePayment(order)
  Deny   => cancelOrder(order)
  Review => queueManualReview(order)
}
```

`Bool` cannot express the difference between deny, review, unknown, blocked,
and not applicable. Use `Decision` instead.

### Permission Matching

```logicn
enum AuthDecision { Allow, Deny, RequireMFA }

map(authorize(user, action)) {
  Allow      => executeAction()
  Deny       => Api.forbidden()
  RequireMFA => Api.mfaRequired()
}
```

### Workflow State Machine

```logicn
enum OrderWorkflow {
  Draft
  AwaitingPayment
  Paid
  Packed
  Shipped
  Cancelled
}

map(order.workflow) {
  Draft          => allowEdits(order)
  AwaitingPayment => sendReminder(order)
  Paid           => queuePacking(order)
  Packed         => notifyCourier(order)
  Shipped        => archive(order)
  Cancelled      => stopWorkflow(order)
}
```

### Validation Error Matching

```logicn
enum ValidationError {
  MissingField
  InvalidEmail
  InvalidPhone
  WeakPassword
}

map(validate.registration(input)) {
  Ok(data)                => createAccount(data)
  Err(MissingField)       => Api.badRequest("Missing field")
  Err(InvalidEmail)       => Api.badRequest("Invalid email")
  Err(InvalidPhone)       => Api.badRequest("Invalid phone")
  Err(WeakPassword)       => Api.badRequest("Weak password")
}
```

### Runtime Mode Matching

```logicn
enum RuntimeMode { Checked, Compiled, Development }

map(runtime.mode()) {
  Checked     => enableAuditTracing()
  Compiled    => enableOptimizedExecution()
  Development => enableDebugTools()
}
```

## Future Patterns

### Wildcard

```logicn
// Future — not v1
map(status) {
  Paid => complete()
  _    => hold()
}
```

Wildcards must still support exhaustiveness analysis. v1 avoids wildcards unless
the compiler can prove exhaustiveness.

### Tuple / Multi-Value

```logicn
// Future — not v1
map(paymentStatus, shipmentStatus) {
  (Paid, Queued)    => startPacking()
  (Paid, Delivered) => completeOrder()
  (Pending, _)      => holdOrder()
  (Failed, _)       => cancelOrder()
}
```

### Destructuring

```logicn
// Future — not v1
map(apiResponse) {
  Ok(Customer { email }) => sendReceipt(email)
  Err(error)             => log(error)
}
```

### Guards

```logicn
// Future — not v1
map(order) {
  Order { total } if total > 1000 => requireManagerApproval()
  Order { total }                 => autoApprove()
}
```

## Grammar Sketch

```text
MatchExpression
  = "map" "(" Expression ")" MatchBody ElseBranch?

MatchBody
  = "{" MatchArm+ "}"

MatchArm
  = Pattern "=>" ExpressionOrBlock

Pattern
  = Identifier
  | VariantPattern

VariantPattern
  = VariantName
  | VariantName "(" Identifier ")"
```

Future expansion:
```text
TuplePattern
ObjectPattern
WildcardPattern
GuardPattern
```

## Compiler Diagnostics

```text
LNN-ERR-TYPE-003: Non-exhaustive map — missing cases: Pending, Refunded
LNN-WARN-DEAD:    Unreachable match arm
LNN-ERR-DUP:      Duplicate match arm
LNN-ERR-VARIANT:  Invalid variant name for enum PaymentStatus
```

## Core Principle

```text
map replaces switch, case, and elseif.
The else block is the explicit catch-all — never implicit.
Exhaustive enum matching is compiler-enforced.
Pattern matching supports governance — it makes state transitions,
validation workflows, and security decisions explicit and auditable.
```
