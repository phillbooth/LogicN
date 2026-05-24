# Authority Model

## Definition

LogicN separates authority into two distinct layers that work together:

```text
Compile-time authority — what the code declares it needs
Runtime authority — what the runtime verifies and grants before execution
```

Neither layer trusts the other unconditionally. Both are required.

## Two Layers

### Compile-Time Authority

The compiler checks that:

```text
fn declarations cannot request uses or permissions (compiler error LNN-SEC-014)
flow declarations explicitly list uses or permission use
capabilities required by a flow match declared actor requirements
effects declared match actual code actions
data exposure declared matches view rules
```

At compile time, LogicN can generate a static authority map:

```text
get_order requires:
  actor capability: orders.read
  code effects: db.read, audit.write
  data exposure: view.public
```

This static map is embedded in the Governed IR and Trust Capsule.

### Runtime Authority

Before a flow executes, the runtime verifies:

```text
actor has the required capabilities (from ctx.actor.capabilities)
flow is permitted under the active runtime profile
trust capsule is valid and signed
package is verified
runtime budget is available
```

Authority Control (the LSGR runtime component responsible for governance) makes
this decision. It does not delegate the decision to user code.

## Developer-Facing: permission

Developers write `permission use name` to declare authority:

```logicn
secure flow update_user_email(
  request: UpdateEmailRequest,
  contex: RequestContext
) -> Result<UserResponse, ApiError>
  permission use user_email_update
{
  ...
}

permission user_email_update {
  actor {
    require users.email.update
    require users.private.read
  }
  code {
    allow db.read
    allow db.write
    allow audit.write
    deny network.external
  }
  data {
    allow expose view: public
    allow expose view: private with users.private.read
    deny expose view: secret
  }
  audit {
    required true
    event "user.email.update"
  }
}
```

A permission compiles into: actor authority + code effects + data exposure rules + audit requirements.

## Developer-Facing: uses

For simpler authority declarations without full permission blocks:

```logicn
flow cleanup_sessions() -> CleanupResult
  uses database.sessions.write
{
  ...
}
```

`uses` declares a specific runtime resource the flow needs. The runtime verifies
the flow is granted that resource before execution begins.

## Authority Does Not Propagate Silently

A flow calling another flow does not inherit authority automatically:

```logicn
flow get_order(id: safe OrderId) -> Order
  uses database.orders.read
{
  let raw: unsafe Any = database.orders.find(id)
  return validate.order(raw)
}

flow process_order(id: safe OrderId) -> Receipt
  uses database.orders.read      // must also declare its own uses
  uses channel.payments.write
{
  let order: Order = get_order(id)   // get_order runs under its own declared authority
  let raw: unsafe Any = payments.send(order)
  return validate.receipt(raw)
}
```

Each flow must declare its own required authority. Calling a flow does not
grant the caller the callee's authority, nor does it grant the callee any extra
authority beyond what the callee itself declared.

## fn Has No Authority

`fn` is a pure local helper. It cannot declare authority:

```logicn
// Compiler error LNN-SEC-014
fn bad_helper()
  uses database.orders.read   // ERROR: fn cannot declare uses
{
  ...
}
```

All authority must live in `flow`.

## Comparison: Compile-Time vs Runtime

| Check | Compile-Time | Runtime |
| --- | --- | --- |
| `fn` declares `uses` | Error LNN-SEC-014 | — |
| `flow` declares `uses` without matching code | Warning | — |
| Actor has required capability | Static analysis | Hard check |
| Trust capsule valid | — | Verified before execution |
| Runtime profile allows this flow | — | Verified before execution |
| Budget available | — | Checked during execution |

## AI-Generated Code Authority

AI-generated code is risk-scored automatically:

```text
Low risk (formatting, no privileged authority) → allowed automatically
High risk (writes financial data, external inputs) → blocked until human approval
```

Risk scoring uses the compiled authority map to determine what authority AI-generated
code would gain.

## Core Principle

```text
Compile-time authority tells the compiler what a flow needs.
Runtime authority verifies the actor and environment before execution.

Authority never propagates implicitly.
fn has no authority.
Each flow declares its own authority explicitly.
```
