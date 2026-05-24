# Type and Enum Declarations

## Definition

LogicN uses `type` to define structured data shapes and `enum` to define fixed
named states. Both produce named, strongly-typed values that the compiler
enforces throughout the codebase.

## type Declaration

```logicn
type Customer {
  id: CustomerId
  name: String
  email: Option<Email>
}
```

Fields are immutable by default. All types are strictly typed — no silent null,
no implicit coercion.

### Optional Fields

Use `Option<T>` for fields that may be absent:

```logicn
type Order {
  id: OrderId
  customer_id: CustomerId
  total: Decimal
  notes: Option<String>
  shipped_at: Option<Timestamp>
}
```

### Nested Types

```logicn
type Address {
  line1: String
  city: String
  postcode: String
  country: String
}

type Customer {
  id: CustomerId
  name: String
  address: Address
  email: Option<Email>
}
```

### Type Aliases

```logicn
type CustomerId = String
type OrderId = String
type Email = String
```

Type aliases let code be self-documenting without full structural types.

### Branded Types (future)

Branded types prevent accidentally passing an `OrderId` where a `CustomerId` is expected:

```logicn
brand CustomerId: String
brand OrderId: String
```

The compiler rejects mixing branded types even when the underlying base type is the same.

## enum Declaration

Enums define a closed set of named states:

```logicn
enum PaymentStatus {
  Paid
  Unpaid
  Pending
  Failed
  Refunded
  Unknown
}
```

### Exhaustive Matching

The `map` expression must cover all enum variants. The compiler reports missing cases:

```logicn
let decision: Decision = map(status) {
  Paid     => Allow
  Failed   => Deny
  Pending  => Review
  Refunded => Review
  Unknown  => Review
  Unpaid   => Deny
}
else {
  Review
}
```

If `Unknown` is not listed, the compiler produces:

```text
LNN-ERR-TYPE-003: Non-exhaustive map — missing case: Unknown
```

### Enum With Data (future)

Enums may carry associated data:

```logicn
enum OrderError {
  NotFound
  InvalidStatus
  PaymentFailed
  StockUnavailable(item: String)
}
```

## Standard Discriminated Types

LogicN provides built-in discriminated types:

```logicn
Option<T>          // Some(value) or None
Result<T, E>       // Ok(value) or Err(error)
Decision           // Allow | Deny | Review
Tri                // Positive | Neutral | Negative
```

See `generic-types.md` for Option and Result, and `mathematics-and-tri-logic.md`
for Decision and Tri.

## Type Safety Rules

```text
No implicit type coercion.
No silent null — use Option<T>.
No undefined — not a concept in LogicN.
Conversions must be explicit.
enum matching must be exhaustive.
Type aliases are not branded types — they do not block mixing.
```

## Compiler Errors

```text
LNN-ERR-TYPE-001: Type mismatch — expected X, got Y
LNN-ERR-TYPE-002: Field X is not a member of type Y
LNN-ERR-TYPE-003: Non-exhaustive map — missing enum case
LNN-ERR-NULL-001: Null is not a valid value — use Option<T>
LNN-ERR-NULL-002: None used where a value is required
```

## Core Principle

```text
Types describe data shape.
Enums describe fixed states.
Both are strict, explicit, and compiler-enforced.
```
