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

## Core Principle

```text
map replaces switch, case, and elseif.
The else block is the explicit catch-all — never implicit.
Exhaustive enum matching is compiler-enforced.
```
