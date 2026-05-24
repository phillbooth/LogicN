# Generic Types

## Definition

LogicN supports parameterised types (generics) for collections, optional values,
error handling, and compute shapes. Generic type parameters are written in angle
brackets: `Type<Parameter>`.

## Core Generic Types

| Type | States | Purpose |
| --- | --- | --- |
| `Option<T>` | `Some(value)`, `None` | Optional value — replaces null |
| `Result<T, E>` | `Ok(value)`, `Err(error)` | Success or failure |
| `Array<T>` | ordered, bounded | Collection of values |
| `Map<K, V>` | key-value | Dictionary / hash map |
| `Set<T>` | unique values | Unordered distinct collection |

## Option<T>

Represents a value that may be absent. Replaces null and undefined.

```logicn
let customer: Option<Customer> = database.find_customer(id)
```

Handling:

```logicn
map(customer) {
  Some(c) => process(c)
  None    => return Err(CustomerError.NotFound)
}
```

Rules:

```text
None is not null — it is an explicit absence state.
You cannot use an Option<T> where a T is expected without unwrapping.
The compiler enforces exhaustive handling.
```

## Result<T, E>

Represents success or typed failure. Replaces exceptions.

```logicn
flow load_order(id: OrderId) -> Result<Order, OrderError>
  uses database.orders.read
{
  let raw: unsafe Any = database.orders.find(id)
  let order: safe Order = validate.order(raw)
  return Ok(order)
}
```

Handling:

```logicn
let result: Result<Order, OrderError> = load_order(id)

map(result) {
  Ok(order) => process(order)
  Err(e)    => return Err(e)
}
```

With `attempt`:

```logicn
let order = attempt load_order(id)
else error {
  return Err(error)
}
```

Unhandled `Result` values produce a compiler warning.

## Array<T>

Ordered, bounded collection. Bounds-checked — out-of-bounds access fails safely.

```logicn
let items: Array<OrderItem> = []
let first: Option<OrderItem> = items.first()
let count: Int = items.count()
```

Trust propagates to the array:

```logicn
let tags: unsafe Array<String> = ...   // whole array is untrusted
let safe_tags: safe Array<String> = validate.string_list(tags)
```

## Map<K, V>

Key-value collection.

```logicn
let headers: Map<String, String> = request.headers
let user_id: Option<String> = headers.get("X-User-Id")
```

## Set<T>

Unordered collection of distinct values.

```logicn
let roles: Set<String> = actor.roles
```

## Generic Functions and Flows

Type parameters in flows:

```logicn
fn wrap_option<T>(value: T) -> Option<T> {
  Some(value)
}
```

## Nested Generics

```logicn
let report: Result<Array<OrderItem>, OrderError> = load_order_items(id)
let users: Map<UserId, Option<User>> = load_all_users()
```

## Compiler Enforcement

```text
Generic type parameters must be specified — Array without <T> is not allowed.
Assignments between incompatible generic types are type errors.
Result values must be handled — unhandled Result produces LNN-WARN-*.
```

## Core Principle

```text
Generics express structured absence, success/failure, and collections
without sacrificing type safety or requiring null.
```
