# Flow vs fn Security Model

## Definition

LogicN has three distinct execution constructs. They are not interchangeable.

```text
route = external entry point — exposes a flow to callers
flow  = governed execution logic — the runtime plans, audits, and checks this
fn    = local helper routine — pure computation, no runtime authority
```

The execution hierarchy is:

```text
route -> flow -> fn
```

A `route` delegates to a `flow`. A `flow` calls `fn` helpers for local computation.
Effects propagate upward: if a `fn` uses `database.write`, the `flow` calling it
must also declare or be permitted for that effect, and by extension so must the `route`.

LogicN is a **flow-first language**. The primary governed execution unit is `flow`.

## route

A `route` is an external entry point. It exposes a `flow` to callers (HTTP, webhook,
scheduled job, event trigger). A route does not contain logic — it declares the
contract and delegates to a flow.

```logicn
route POST "/orders" {
  request CreateOrderRequest
  response OrderResponse
  flow createOrder
}
```

A `route`:
- Declares the request and response shape
- Names the `flow` that handles the request
- Optionally declares permissions the caller must satisfy
- Does not contain business logic

---

## flow

A `flow` represents governed execution logic that is runtime-managed and
may interact with trusted systems and infrastructure.

A `flow` may:

```text
return values
declare runtime permissions (uses)
access GlobalVault
call backend services
perform network operations
access databases
read/write files
spawn workers
emit events
be audited
be scheduled by the runtime
cross trust boundaries
```

Example:

```logicn
flow checkout_order(order: Order) -> Receipt
  uses vault.payments.read
  uses network.internal
{
  let total = calculate_total(order)
  let payment = GlobalVault.payments.charge(order.payment_id, total)
  return Receipt(payment.id)
}
```

## fn

`fn` is reserved for local helper logic only. A helper function has no runtime
authority.

A `fn` cannot:

```text
request permissions
declare uses
access GlobalVault
perform network operations
access databases
access files
access secrets
call backend services directly
spawn workers
perform payment operations
cross trust boundaries
use task or wait (async work)
create background work
```

The purpose of `fn` is purely:

```text
computation
formatting
transformation
local reusable logic
```

Example:

```logicn
fn calculate_total(order: Order) -> Decimal {
  order.items.sum(item -> item.price * item.qty)
}
```

## Security Boundary Rule

```text
route  = external entry point — no logic, delegates to flow
flow   = can cross trust boundaries, declare effects, hold permissions
fn     = cannot cross trust boundaries, no runtime authority
```

| Construct | Authority Level | Contains logic? |
| --- | --- | --- |
| `route` | Entry point only | No — delegates to flow |
| `flow` | Runtime-authorized | Yes — governed execution |
| `fn` | Local-only | Yes — pure computation only |

## Compiler Status

```
fn keyword:    specified — implementation pending (Phase 7+)
flow keyword:  implemented (Phase 4+)
route keyword: specified — implementation pending (Phase 7+)
```

## Compiler Enforcement

If a `fn` attempts to request authority, the compiler rejects it:

```logicn
fn get_secret(user_id: Id) -> Secret
  uses vault.secrets.read
{
  GlobalVault.secrets.get(user_id)
}
```

Compiler error:

```text
LNN-SEC-014:
fn declarations cannot request runtime authority.
Move this operation into a flow or pass the required value as an argument.
```

## Correct Pattern

```logicn
flow load_secret(user_id: Id) -> Secret
  uses vault.secrets.read
{
  return GlobalVault.secrets.get(user_id)
}

fn mask_secret(secret: Secret) -> Text {
  secret.mask()
}
```

`flow` performs privileged access. `fn` performs safe local transformation.

## Language Philosophy

LogicN avoids `function`, `def` as primary execution primitives.
`flow` is the core governed execution unit. `fn` is for pure local helpers.
`route` is for external exposure only.

```text
route -> flow -> fn

Use route to expose.
Use flow to govern.
Use fn to compute.
```

LogicN's bigger model:

```text
intent -> governed execution plan -> coordinated compute
```

`flow` is where ordinary code becomes part of a governed execution plan.

This reinforces: explicit authority, runtime visibility, secure execution,
auditable behaviour and orchestration-first architecture.

## Async Rule

`flow` may start governed async tasks and wait for results. `fn` may not.

```logicn
// Correct — flow uses task and wait
flow build_report(user_id: safe Id) -> Report
  uses database.users.read
  uses database.analytics.read
{
  let user_task = task database.users.get(user_id)
  let stats_task = task database.analytics.get(user_id)

  let user: safe User = wait user_task
  let stats: safe Stats = wait stats_task

  return make_report(user, stats)
}

// Compiler error — fn cannot use task
fn bad_helper(id: safe Id) -> safe User {
  let t = task database.users.get(id)  // ERROR: LNN-SEC-014
  return wait t
}
```

```text
fn = synchronous helper only
flow = may start task, may wait, returns after all required tasks complete
```

## Rule

```text
Use route to expose a flow to external callers.
Use flow for all governed application logic.
Use fn only for local helper routines that require no runtime authority.

fn is always synchronous.
flow may be asynchronous via task/wait.
route delegates — it never contains logic.
```

The simple decision:

```text
Is this an external entry point?          → route
Does this need runtime authority/effects? → flow
Is this pure local computation?           → fn
```
