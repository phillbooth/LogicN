# LogicN — Formal Type System Specification

## Status

```
Phase 5 prerequisite
Source of truth for the type checker
```

This document defines the LogicN v1 type system used by the parser, AST,
type checker, diagnostic engine, schema generator, and later compiler phases.

---

## 1. Type Categories

LogicN types are divided into:

```
Primitive
Numeric
Text
Boolean
Temporal
Binary
JSON
Collection
Algebraic
Domain
Capability-sensitive
User-defined
```

---

## 2. Built-in Types

### Primitive / scalar

| Type | Description |
|---|---|
| `Bool` | Boolean: `true` or `false` |
| `Char` | A single Unicode scalar value |
| `Void` | Absence of a meaningful return value |

### Numeric

| Type | Description |
|---|---|
| `Int` | Platform integer (default, at least 64-bit) |
| `Int8` | Signed 8-bit integer |
| `Int16` | Signed 16-bit integer |
| `Int32` | Signed 32-bit integer |
| `Int64` | Signed 64-bit integer |
| `UInt8` | Unsigned 8-bit integer |
| `UInt16` | Unsigned 16-bit integer |
| `UInt32` | Unsigned 32-bit integer |
| `UInt64` | Unsigned 64-bit integer |
| `Float` | Platform float (default, at least 64-bit) |
| `Float16` | 16-bit floating-point |
| `Float32` | 32-bit floating-point |
| `Float64` | 64-bit floating-point |
| `Decimal` | Exact decimal arithmetic (financial use) |

### Text

| Type | Description |
|---|---|
| `String` | UTF-8 string |
| `SecureString` | Sensitive string; restricted operations — see Rule 12 |

### Temporal

| Type | Description |
|---|---|
| `Timestamp` | UTC timestamp with sub-second precision |
| `Duration` | A time span |

### Binary

| Type | Description |
|---|---|
| `Bytes` | Raw byte sequence |

### JSON types

| Type | Description |
|---|---|
| `Json` | Any valid JSON value |
| `JsonNull` | Explicit JSON null |
| `JsonBool` | JSON boolean |
| `JsonNumber` | JSON number |
| `JsonString` | JSON string |
| `JsonArray` | JSON array |
| `JsonObject` | JSON object |

### Collection

| Type | Description |
|---|---|
| `Array<T>` | Ordered sequence |
| `Set<T>` | Unordered unique-element collection |
| `Map<K, V>` | Key-value map |
| `Channel<T>` | Async communication channel (governed) |

### Algebraic

| Type | Description |
|---|---|
| `Option<T>` | Presence (`Some(T)`) or absence (`None`) |
| `Result<T, E>` | Success (`Ok(T)`) or failure (`Err(E)`) |

### Numeric science / compute

| Type | Description |
|---|---|
| `Vector<T, N>` | Fixed-length numeric vector |
| `Matrix<T, R, C>` | R×C numeric matrix |
| `Tensor` | Multi-dimensional numeric array |

### Domain / financial

| Type | Description |
|---|---|
| `Money<C>` | Amount with currency type parameter |
| `GBP` | British Pound currency tag |
| `USD` | US Dollar currency tag |
| `EUR` | Euro currency tag |
| `JPY` | Japanese Yen currency tag |

### HTTP / API

| Type | Description |
|---|---|
| `Request` | Incoming HTTP request |
| `Response` | Outgoing HTTP response |

### Error types

| Type | Description |
|---|---|
| `Error` | Base error type |
| `ApiError` | HTTP API error |
| `EmailError` | Email validation / delivery error |
| `PaymentError` | Payment processing error |
| `ValidationError` | Input validation error |
| `WebhookError` | Webhook processing error |

---

## 3. Generic Arity Rules

Each generic type has a fixed arity. The type checker must reject incorrect arity.

```typescript
export const GENERIC_ARITY: Readonly<Record<string, number>> = {
  Option:  1,
  Result:  2,
  Array:   1,
  Set:     1,
  Map:     2,
  Channel: 1,
  Vector:  2,
  Matrix:  3,
  Money:   1,
} as const;
```

Valid:

```logicn
let name:   Option<String>
let result: Result<User, ValidationError>
let prices: Array<Money<GBP>>
let grid:   Matrix<Float32, 4, 4>
```

Invalid:

```logicn
let value: Option<String, Error>   // LLN-TYPE-003: Option expects 1 type argument
let map:   Map<String>             // LLN-TYPE-003: Map expects 2 type arguments
```

Diagnostic: `LLN-TYPE-003` (`ARITY_MISMATCH`)

---

## 4. Type Reference Resolution

A type reference is valid when it resolves to one of:

1. A built-in type listed in Section 2
2. A user-defined `type` declaration in scope
3. A user-defined `enum` declaration in scope
4. A type imported via `import`
5. A valid generic instantiation satisfying arity rules

A type reference that does not resolve to any of the above produces:

Diagnostic: `LLN-TYPE-002` (`UNKNOWN_TYPE`)

---

## 5. Null and Undefined Policy

LogicN does not allow silent nullability.

Rules:

- `T` (a plain type) does not include `null`.
- `T` does not include `undefined`.
- `Option<T>` is the **only** way to express the absence of a value.
- `JsonNull` is valid only inside explicit JSON value positions.
- `null` and `undefined` as literals are not part of the language.

Valid:

```logicn
let email: Option<String>
let raw:   JsonNull
```

Invalid:

```logicn
let email: String = null
let user = undefined
```

Diagnostics: `LLN-TYPE-008` (`SILENT_NULL_DENIED`), `LLN-TYPE-008` (`UNDEFINED_DENIED`)

---

## 6. Assignment Compatibility

The typing judgment for assignment:

```
Γ ⊢ expr : S     Γ ⊢ target : T     S <: T
────────────────────────────────────────────
Γ ⊢ target = expr : T
```

Assignment is valid when:

- Source type equals target type.
- Source type is a permitted numeric widening (see Section 7).
- Source type is a permitted literal narrowing (integer literal to sized integer).
- Source type conforms structurally to target record type (all required fields
  present and correctly typed).
- Source type is explicitly wrapped into `Option<T>` or `Result<T, E>`.

Assignment must **not** silently:

- Convert `String` to a numeric type
- Convert `Json` to a typed record
- Assign a nullable value to a non-option type
- Convert `SecureString` to `String`
- Convert `Float` to `Int` (truncating)
- Convert `Decimal` to `Float` (lossy)
- Convert `Money<GBP>` to `Money<USD>`

Diagnostic: `LLN-TYPE-001` (`TYPE_MISMATCH`)

---

## 7. Numeric Widening Rules

Implicit widening is permitted only along these chains:

```
Int8  → Int16 → Int32 → Int64 → Int
UInt8 → UInt16 → UInt32 → UInt64
Float16 → Float32 → Float64 → Float
```

`Int → Float` is allowed only with an explicit policy annotation (not in Phase 5).

`Decimal` is not interchangeable with `Float`. Decimal operations require
Decimal arithmetic — mixing with Float is an error.

`Money<C>` is not a plain number. It does not accept plain integer or float
literals without an explicit constructor.

Diagnostic for invalid narrowing: `LLN-TYPE-001` (`TYPE_MISMATCH`)

---

## 8. Boolean Condition Rule

Only `Bool` may appear as a condition in `if`, `while`, or `match` position.

No truthy/falsy coercion. A non-Bool value in condition position is a type error.

Valid:

```logicn
if isReady {
  return true
}
```

Invalid:

```logicn
if userName {       // LLN-TYPE-001: expected Bool, got String
  return true
}
```

The Phase 4 lexer classifies `true` and `false` as keywords. The type checker
assigns them type `Bool`.

---

## 9. Option and Result Rules

### Option

```
Option<T> cases:
  Some(T)  — value is present
  None     — value is absent
```

### Result

```
Result<T, E> cases:
  Ok(T)    — success
  Err(E)   — failure
```

### Exhaustiveness

Every `match` on `Option<T>` or `Result<T, E>` must handle all cases.

Valid:

```logicn
match maybeUser {
  Some(user) => user.name
  None       => "Anonymous"
}
```

Invalid:

```logicn
match maybeUser {
  Some(user) => user.name
  // missing None arm
}
```

Diagnostic: `LLN-MATCH-001` (`NON_EXHAUSTIVE_MATCH`)

---

## 10. Enum Exhaustiveness

Every `match` on a user-defined enum must handle all declared variants,
unless an explicit wildcard `_` arm is present.

```logicn
enum OrderStatus {
  Draft
  Confirmed
  Cancelled
}
```

Valid:

```logicn
match status {
  Draft     => "draft"
  Confirmed => "confirmed"
  Cancelled => "cancelled"
}
```

Invalid:

```logicn
match status {
  Draft => "draft"
  // missing Confirmed and Cancelled
}
```

Diagnostic: `LLN-MATCH-001` (`NON_EXHAUSTIVE_MATCH`)

---

## 11. Record / Structural Types

User-defined `type` declarations create **structural record types**.

```logicn
type User {
  id:    String
  email: Option<String>
}
```

A value conforms to the record when:
- All required fields are present.
- Each field value matches the declared type.

Extra fields that are not declared on the target type are rejected unless
an explicit open-record policy is introduced (Phase 6+).

---

## 12. SecureString Restrictions

`SecureString` must not be implicitly converted to `String`.

Restricted operations:

```
SecureString may not be passed to print(), log.*(), or any logging function.
SecureString may not be compared with ==.
SecureString may not be included in API response bodies.
SecureString may not be stored in a plain String binding.
SecureString must not appear in generated AI context examples or public schemas.
```

Approved operations:

```
Pass to designated secure functions that accept SecureString.
Call .constantTimeEquals() for comparison.
Call redact() to produce a redacted log-safe representation.
```

Diagnostic: `LLN-SECRET-001`, `LLN-SECRET-002`, `LLN-SECRET-003`
(see `docs/Knowledge-Bases/value-state-annotations.md`)

---

## 13. Required Diagnostics

The type checker emits from these series. The `LLN-TYPE-*` and `LLN-MATCH-*`
series are defined in `docs/Knowledge-Bases/compiler-diagnostics.md`.

| Code | Name | Description |
|---|---|---|
| `LLN-TYPE-001` | `TYPE_MISMATCH` | Expected type X, got Y |
| `LLN-TYPE-002` | `UNKNOWN_TYPE` | Type not defined in current scope |
| `LLN-TYPE-003` | `ARITY_MISMATCH` | Wrong number of type arguments |
| `LLN-TYPE-004` | `RETURN_TYPE_MISMATCH` | Return value does not match declared return type |
| `LLN-TYPE-005` | `FIELD_NOT_FOUND` | Field X not found on type Y |
| `LLN-TYPE-006` | `IMMUTABLE_REASSIGNMENT` | Cannot reassign `let` binding |
| `LLN-TYPE-007` | `INVALID_OPERATOR` | Operator not defined for these operand types |
| `LLN-TYPE-008` | `GENERIC_CONSTRAINT_FAIL` | Type does not satisfy generic constraint |
| `LLN-NAME-001` | `UNDECLARED_NAME` | Name not defined in current scope |
| `LLN-NAME-002` | `DUPLICATE_NAME` | Name already declared in this scope |
| `LLN-NAME-003` | `USE_BEFORE_DECLARATION` | Name referenced before its declaration point |
| `LLN-MATCH-001` | `NON_EXHAUSTIVE_MATCH` | `match` is missing case(s): X |
| `LLN-MATCH-002` | `UNREACHABLE_PATTERN` | Pattern is unreachable |
| `LLN-MATCH-003` | `INVALID_PATTERN_TYPE` | Pattern cannot match against this type |

---

## 14. Type Checker Execution Order

The type checker runs as a single pass after the parser, in this order:

```
1.  Collect all declarations (types, enums, flows) in the program
2.  Register built-in types
3.  Register user-defined types from typeDecl nodes
4.  Register user-defined enums from enumDecl nodes
5.  Validate generic arity on all type references
6.  Resolve all type references to their definitions
7.  Infer expression types bottom-up
8.  Check assignments against declared types
9.  Check flow call arguments against parameter types
10. Check return types against declared return types
11. Check match exhaustiveness for Option, Result, and enum types
12. Check value-state annotations (see value-state-annotations.md)
13. Check SecureString usage restrictions
14. Emit all collected diagnostics with source locations
```

Later checker passes (effect checker, boundary checker) receive the
type-annotated AST from step 13.

---

## 15. Type Inference Scope (Phase 5)

Phase 5 implements:

- Type resolution for all built-in types
- Generic arity validation
- Null/undefined rejection
- Bool-condition enforcement
- SecureString restrictions
- Enum and Option/Result exhaustiveness checks
- Basic assignment compatibility

Phase 5 defers:

- Full structural subtyping (record conformance)
- Numeric widening enforcement (warning only in Phase 5)
- Generic constraint checking beyond arity
- Module-level type imports

---

## 16. Relationship to Value-State Annotations

Value-state annotations (`safe`, `unsafe`, `validated`, etc.) are orthogonal
to the base type system. A binding carries both a type (`String`) and an
optional set of state annotations (`unsafe unvalidated`). The value-state
checker runs as a separate pass after type inference.

See: `docs/Knowledge-Bases/value-state-annotations.md`

---

## 17. Definition of Done

The formal type system spec is complete when:

```
all built-in types are listed
generic arity is documented for all generic types
null / undefined policy is explicit
assignment compatibility rules are defined
numeric widening order is documented
Bool condition enforcement is stated
Option and Result matching rules are defined
enum exhaustiveness is defined
SecureString restrictions are defined
type-checker execution order is documented
diagnostic codes are mapped to type rules
```

This document satisfies all of those criteria.

---

## See Also

- `docs/Knowledge-Bases/value-state-annotations.md`
- `docs/Knowledge-Bases/operator-precedence.md`
- `docs/Knowledge-Bases/compiler-diagnostics.md`
- `docs/Knowledge-Bases/generic-types.md`
- `docs/Knowledge-Bases/logicn-core-logic-tri-decision-bool.md`
- `docs/Knowledge-Bases/v1-reserved-keywords.md`
