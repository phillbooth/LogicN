# Flow vs fn Security Model

## Definition

LogicN is a **flow-first language**. The primary executable unit is `flow`, not
a traditional function.

```text
flow = runtime-aware executable unit
fn   = local helper routine
```

## flow

A `flow` represents executable application logic that is runtime-managed and
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
flow can cross trust boundaries.
fn cannot cross trust boundaries.
```

| Construct | Authority Level |
| --- | --- |
| `flow` | Runtime-authorized |
| `fn` | Local-only |

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

LogicN avoids `function`, `def` or `fn` as primary execution primitives.
`flow` is the core executable unit.

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
Use flow for all application logic.
Use fn only for local helper routines that require no runtime authority.
fn is always synchronous. flow may be asynchronous via task/wait.
```
