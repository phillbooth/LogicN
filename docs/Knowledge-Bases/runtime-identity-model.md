# Runtime Identity Model

## Definition

LogicN uses **runtime-managed identity** rather than developer-authored identity
declarations. The runtime automatically generates, verifies, rotates and audits
service identity.

## Core Principle

The idea is sound:

```text
Do not trust a service because it is internal.
Trust it because it can prove identity.
```

But the implementation must be automatic, not manual. A normal developer will
not maintain manual identity blocks correctly.

## What Automatic Identity Means

Developer writes minimal intent:

```logicn
api payments {
  endpoint: "https://payments.example"
}
```

Runtime automatically handles:

```text
generate service identity
store identity material
verify remote identity
rotate credentials
audit identity checks
mark responses as unsafe
```

## Application Code Stays Simple

```logicn
flow charge_order(raw: unsafe Json) -> Receipt {
  let order: safe Order = validate.order(raw)
  let response: unsafe Any = payments.send(order)
  return validate.receipt(response)
}
```

When `payments.send(order)` runs, the runtime internally:

```text
creates secure runtime channel
verifies remote identity
applies transport security
audits communication
marks returned data unsafe
```

## Runtime Config

Enable automatic identity in runtime config:

```logicn
runtime {
  identity: auto
  verify_services: true
}
```

## Enterprise Override

For enterprise/security teams only — optional hardening:

```logicn
identity service.payments {
  source: GlobalVault.identities.payments
}
```

This should be advanced configuration, not normal app syntax.

## Alignment with Industry Standards

LogicN runtime identity should behave similarly to:

```text
SPIFFE / SPIRE   — workload identity issued automatically
Sigstore         — keyless, identity-based signing
in-toto          — attestations generated, not hand-written
TUF              — package trust via signed registry metadata
```

## Core Principle

```text
LogicN proves service identity automatically.
Developers only declare intent.
The runtime handles cryptographic trust.
```
