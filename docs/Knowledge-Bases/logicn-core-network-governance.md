# LogicN Core Network: Governance Model, Policy Contracts and Runtime Enforcement

## Definition

The LogicN network layer is a governance-first runtime system. It is not a
generic networking library. Its purpose is to provide explicit network
permissions, runtime-aware destination validation, safe secret transmission,
and audit-grade network evidence.

## Package

```text
packages-logicn/logicn-core-network
```

## Status

```text
Network package:           mostly stubs
Network governance model:  conceptually documented
Runtime enforcement:       planned
Audit integration:         planned
```

---

## Philosophy

LogicN does not treat networking as unrestricted runtime behavior.

Networking is a governed capability.

The runtime must always know:

```text
who is allowed to communicate
where traffic may go
why traffic is allowed
which capability enabled it
which policy approved it
which audit trail records it
```

Governance rules:

```text
policy-governed
capability-controlled
auditable
explicit
deny-by-default
runtime-validated
```

The runtime must never allow:

```text
silent outbound access
undeclared network effects
wildcard production permissions
hidden AI traffic
unapproved raw socket access
```

---

## Package Boundary

`logicn-core-network` owns:

```text
network permission contracts
network policy definitions
destination allowlists
transport policy metadata
runtime network reports
network diagnostics
safe destination references
```

It does not own:

```text
HTTP parsing
application auth
TLS implementation
socket drivers
routing frameworks
API server behavior
```

---

## Relationship to Other Packages

```text
logicn-core-network
    → network policy contracts

logicn-core-security
    → capability + permission primitives

logicn-core-config
    → environment/runtime config

logicn-core-runtime
    → runtime network enforcement

logicn-core-compiler
    → effect + boundary validation

logicn-framework-api-server
    → HTTP implementation details
```

---

## Core Network Types

### NetworkProtocol

```ts
export type NetworkProtocol =
  | "http"
  | "https"
  | "tcp"
  | "udp"
  | "grpc"
  | "websocket"
```

### NetworkDestinationReference

```ts
export interface NetworkDestinationReference {
  /**
   * Stable destination identifier.
   */
  name: string

  /**
   * Protocol used for communication.
   */
  protocol: NetworkProtocol

  /**
   * Allowed hostname or service identifier.
   */
  host: string

  /**
   * Optional port restriction.
   */
  port?: number

  /**
   * Whether TLS is required.
   */
  tlsRequired: boolean
}
```

Example destination reference:

```json
{
  "name": "payments-api",
  "protocol": "https",
  "host": "payments.example.com",
  "port": 443,
  "tlsRequired": true
}
```

### NetworkPermission

```ts
export interface NetworkPermission {
  capability: string
  destination: NetworkDestinationReference
  allowedOperations: string[]
  runtimeProfiles: string[]
}
```

Example permission:

```json
{
  "capability": "HttpClient",
  "destination": {
    "name": "payments-api",
    "protocol": "https",
    "host": "payments.example.com",
    "port": 443,
    "tlsRequired": true
  },
  "allowedOperations": ["GET", "POST"],
  "runtimeProfiles": ["staging", "production"]
}
```

### NetworkPolicy

```ts
export interface NetworkPolicy {
  allowDestinations: NetworkDestinationReference[]
  denyDestinations: string[]
  requireTls: boolean
  allowRawSockets: boolean
}
```

Example production policy:

```json
{
  "allowDestinations": [
    {
      "name": "payments-api",
      "protocol": "https",
      "host": "payments.example.com",
      "port": 443,
      "tlsRequired": true
    }
  ],
  "denyDestinations": ["*"],
  "requireTls": true,
  "allowRawSockets": false
}
```

---

## Deny-By-Default Rule

Network access must default to denied.

Forbidden defaults:

```text
network.any
rawSocket
packetCapture
promiscuousMode
```

These require explicit governance approval.

Example denial diagnostic:

```text
LN-NETWORK-001
undeclared network destination
```

---

## Runtime Destination Validation

The runtime must validate before network traffic occurs:

```text
destination host
protocol
port
TLS requirement
runtime profile
capability grants
deployment policy
```

### validateDestination Example

```ts
export function validateDestination(
  requested: NetworkDestinationReference,
  allowed: NetworkDestinationReference[]
): boolean {
  return allowed.some((entry) => {
    return (
      entry.protocol === requested.protocol &&
      entry.host === requested.host &&
      entry.port === requested.port
    )
  })
}
```

### validateTlsRequirement Example

```ts
export function validateTlsRequirement(
  destination: NetworkDestinationReference
): boolean {
  if (
    destination.protocol === "https" &&
    destination.tlsRequired
  ) {
    return true
  }

  return false
}
```

### Why TLS Enforcement Matters

Production runtimes should reject:

```text
plaintext HTTP
unencrypted TCP
insecure websocket traffic
```

unless explicitly approved.

---

## GovernedNetworkRuntime

```ts
export class GovernedNetworkRuntime {
  constructor(
    private readonly policy: NetworkPolicy
  ) {}

  request(
    destination: NetworkDestinationReference
  ): boolean {
    return validateDestination(
      destination,
      this.policy.allowDestinations
    )
  }
}
```

### safeHttpRequest Wrapper

```ts
export async function safeHttpRequest(
  runtime: GovernedNetworkRuntime,
  destination: NetworkDestinationReference
): Promise<void> {
  const approved = runtime.request(destination)

  if (!approved) {
    throw new Error(
      "Network destination denied by runtime policy"
    )
  }

  // Future runtime transport integration occurs here.
}
```

---

## Network Effect Declaration

Network access must be explicit in LogicN source:

```logicn
fn fetch_user(id: UserId)
    effect network
{
    return http.get("/users/" + id)
}
```

With capability:

```logicn
fn fetch_user(id: UserId)
    effect network
    capability HttpClient
{
    return http.get("/users/" + id)
}
```

This means:

```text
network effect declared
runtime capability explicitly granted
```

---

## Secret and Network Integration

Secrets may only flow to approved destinations.

Allowed:

```text
approved payment API
approved auth provider
approved cryptographic sink
```

Forbidden:

```text
logs
unknown external hosts
AI prompts
telemetry dumps
```

Example safe declaration:

```logicn
fn send_payment(secret: SecretReference)
    effect network, secret
{
    payments.send(secret)
}
```

The runtime validates:

```text
secret effect declared
network effect declared
destination approved
capability granted
```

### Unsafe Secret Flow Example

```logicn
fn upload_secret(secret: SecretReference)
    effect network
{
    http.post("http://random-site.com", secret)
}
```

Expected result:

```text
LN-NETWORK-006
secret attempted to flow to unapproved destination
```

---

## AI Networking Governance

AI systems must not silently exfiltrate data.

The runtime must always know:

```text
which AI provider is contacted
which capability allowed it
which data categories were transmitted
which policy approved it
```

Example AI provider policy:

```json
{
  "allowAiProviders": [
    "openai",
    "anthropic"
  ],
  "denyUnknownProviders": true
}
```

Example safe AI destination:

```json
{
  "name": "openai-api",
  "protocol": "https",
  "host": "api.openai.com",
  "port": 443,
  "tlsRequired": true
}
```

Unsafe pattern that must be rejected:

```text
runtime AI silently sends prompts to unknown host
```

---

## Runtime Audit Integration

All network activity should produce structured audit metadata.

Example approved audit event:

```json
{
  "traceId": "trace-300",
  "module": "app/payments/service",
  "destination": "payments.example.com",
  "protocol": "https",
  "capability": "HttpClient",
  "approved": true
}
```

Example denied audit event:

```json
{
  "traceId": "trace-301",
  "module": "app/ai/runtime",
  "destination": "unknown-ai-host.com",
  "approved": false,
  "reason": "destination not allowlisted"
}
```

---

## Runtime Network Report

```json
{
  "module": "app/payments/service",
  "effects": ["network"],
  "destinations": [
    {
      "host": "payments.example.com",
      "protocol": "https"
    }
  ],
  "capabilities": ["HttpClient"]
}
```

---

## Compiler Integration

The compiler validates:

```text
network effect declarations
network capability usage
unsafe network boundaries
secret-to-network flows
undeclared destinations
```

Example compiler rule:

```ts
export function validateNetworkEffect(
  effects: string[]
): boolean {
  return effects.includes("network")
}
```

Boundary checker integration:

```logicn
pub fn expose_internal_network() {
    raw_socket.connect("*")
}
```

Expected diagnostic:

```text
LN-BOUNDARY-008
network allowlist violation
```

---

## Runtime Manifest Integration

Runtime manifests should contain:

```json
{
  "effects": ["network"],
  "destinations": [
    {
      "host": "payments.example.com",
      "protocol": "https"
    }
  ],
  "capabilities": ["HttpClient"]
}
```

---

## Deployment Integration

Deployment policy validates:

```text
destination allowlists
environment restrictions
production TLS requirements
AI provider restrictions
```

Example deployment denial:

```text
Deployment denied.

Reason:
network destination not approved for production
```

---

## Network Compatibility Reporting

The runtime should explain:

```text
why a destination is allowed
why traffic was denied
which capability approved it
which policy enforced it
```

Example:

```text
Destination: payments.example.com

Status:
    allowed

Reason:
    production allowlist match
```

---

## Suggested Internal Structure

```text
packages-logicn/logicn-core-network/src/
```

Suggested files:

```text
network-policy.ts
network-destination.ts
network-permissions.ts
network-runtime.ts
network-audit.ts
network-diagnostics.ts
network-reports.ts
```

---

## Diagnostic Codes (LN-NETWORK series)

| Code | Meaning |
| --- | --- |
| `LN-NETWORK-001` | undeclared network destination |
| `LN-NETWORK-002` | capability missing for network operation |
| `LN-NETWORK-003` | insecure transport denied |
| `LN-NETWORK-004` | raw socket denied |
| `LN-NETWORK-005` | destination not allowlisted |
| `LN-NETWORK-006` | secret flow to unapproved destination |
| `LN-NETWORK-007` | AI provider not approved |
| `LN-NETWORK-008` | runtime network policy unavailable |

---

## Recommended Implementation Order

### Phase 1

```text
network destination references
network policy contracts
basic capability integration
```

### Phase 2

```text
runtime validation
TLS enforcement
destination allowlists
```

### Phase 3

```text
audit events
runtime network reports
compiler integration
```

### Phase 4

```text
AI provider governance
advanced secret flow validation
distributed network policy
```

---

## v0.1 Scope

Implement first:

```text
network policy contracts
destination references
basic runtime validation
compiler effect integration
simple audit reports
```

Defer:

```text
distributed runtime networking
advanced AI governance
deep packet inspection
formal flow verification
photonic network coordination
```

---

## Relationship to Other Systems

```text
logicn-core-network    → network policy contracts, destination allowlists, audit events
logicn-core-security   → capability + permission decisions, secret taint tracking
logicn-core-config     → environment-aware network profiles
logicn-core-compiler   → validates network effects, boundary violations (LN-BOUNDARY-008)
logicn-core-runtime    → runtime enforcement of network governance
logicn-core-reports    → network audit evidence, network report shapes
```

See also: `network-boundary-policy.md`, `layered-rate-limits.md`,
`effect-checker-and-boundary-checker.md`, `runtime-audit-log-format.md`,
`package-completion-status.md`.
