# LogicN — Do Not Use Yet

This file lists patterns that look valid but are NOT yet supported by the current compiler.
Check this file before generating LogicN code.

---

## 1. Readable Type Forms (proposal only)

```logicn
// DO NOT USE
type GetPatientResult =
  result of Response else ApiError

// USE INSTEAD
type GetPatientResult =
  Result<Response, ApiError>
```

`result of X else Y` is documented as a proposal. The parser does NOT support it.

---

## 2. Old Effects Syntax

```logicn
// DO NOT USE
secure flow foo(readonly request: Request) -> FooResult
  with effects [database.write, audit.write]
{ ... }

// USE INSTEAD
secure flow foo(readonly request: Request) -> FooResult
contract {
  effects {
    database.write
    audit.write
  }
}
{ ... }
```

`with effects [...]` is parsed but is the old style. New examples always use `contract.effects`.

---

## 3. `req` parameter name

```logicn
// DO NOT USE
secure flow foo(readonly req: Request) -> FooResult

// USE INSTEAD
secure flow foo(readonly request: Request) -> FooResult
```

All parameters must use full names. `req`, `res`, `ctx`, `usr` are forbidden style.

---

## 4. Top-level let / mut

```logicn
// DO NOT USE — top-level bindings are not allowed
let counter: Int = 0

flow increment() -> Int {
  return counter + 1
}

// USE INSTEAD — bindings inside flows only
pure flow increment(counter: Int) -> Int {
  return counter + 1
}
```

`let` and `mut` at the top level emit LLN-SYNTAX-006 and LLN-SYNTAX-007.

---

## 5. Lambda / arrow functions

```logicn
// DO NOT USE — not yet supported
let doubled = values.map(x => x * 2)

// USE INSTEAD — named fn or stdlib method
let doubled = values.map(double)

fn double(x: Int) -> Int {
  return x * 2
}
```

Lambda syntax `(x) => expr` and `x => expr` are NOT in the parser.

---

## 6. `fn` at top level

```logicn
// DO NOT USE — fn must be inside a flow body
fn helper(x: Int) -> Int {
  return x * 2
}

// USE INSTEAD — fn inside a flow
flow process(values: Array<Int>) -> Array<Int> {
  fn double(x: Int) -> Int { return x * 2 }
  return values.map(double)
}
```

Top-level `fn` emits LLN-SYNTAX-005.

---

## 7. `emit` at top level

```logicn
// DO NOT USE
event OrderCreated
emit OrderCreated   // ← top-level emit, not allowed

// USE INSTEAD — emit inside a flow body
flow createOrder(...) -> OrderResult {
  ...
  emit OrderCreated
  ...
}
```

Top-level `emit` emits LLN-SYNTAX-009.

---

## 8. Contract sections not yet enforced at runtime

These sections PARSE correctly but are NOT yet enforced by the runtime:
- `contract.timeouts {}` — parsed, stored, not enforced (Phase 16)
- `contract.retries {}` — parsed, stored, not enforced (Phase 16)
- `contract.limits {}` — parsed, stored, not enforced (Phase 16)

The compiler validates syntax. Runtime enforcement ships in Phase 16.

---

## 9. Service-level contracts

```logicn
// DO NOT USE YET — service keyword not yet implemented
service UserService
contract {
  effects { database.read }
}
```

The `service` keyword is reserved for Phase 17.

---

## 10. Diagnostics not yet emitted

These constants are exported but the checks are stubs:
- `LLN-TYPE-011` through `LLN-TYPE-016` — defined, not emitted
- `LLN-GOV-005`, `LLN-GOV-009` — defined, not emitted
- `LLN-BUILD-001` — stub, full implementation in Phase 16
