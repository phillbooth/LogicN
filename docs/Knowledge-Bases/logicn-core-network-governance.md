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

## Architecture Depth: TypeScript Contracts (v0.2 Specification)

### NetworkProtocol (Extended Closed Type)

```ts
export type NetworkProtocol =
  | "http"
  | "https"
  | "tcp"
  | "udp"
  | "grpc"
  | "websocket"
  | "quic"
```

Note: `quic` is added in v0.2. The v0.1 form ends at `websocket`.

### NetworkDestinationReference (Extended)

```ts
export interface NetworkDestinationReference {
  name: string
  protocol: NetworkProtocol
  host: string
  port?: number
  tlsRequired: boolean

  /** Optional provider reference. */
  provider?: string

  /** Optional category for governance grouping. */
  category?:
    | "payment"
    | "ai"
    | "database"
    | "webhook"
    | "internal"
    | "custom"

  /** Optional data categories for AI governance. */
  dataCategories?: string[]
}
```

### NetworkPolicy (Extended)

```ts
export interface NetworkPolicy {
  default: "deny" | "allow"
  allowDestinations: NetworkDestinationReference[]
  denyDestinations: string[]
  requireTls: boolean
  allowRawSockets: boolean
  allowPlainHttp: boolean
  aiProviders?: AiProviderNetworkPolicy[]
  requireTimeouts?: boolean
  requireRateLimits?: boolean
}
```

### productionNetworkPolicy Example (SSRF-safe)

```ts
export const productionNetworkPolicy: NetworkPolicy = {
  default: "deny",

  allowDestinations: [STRIPE_DESTINATION],

  // SSRF-safe deny list — always included:
  denyDestinations: [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "169.254.169.254",          // AWS metadata
    "metadata.google.internal", // GCP metadata
    "metadata.azure.internal"   // Azure metadata
  ],

  requireTls: true,
  allowRawSockets: false,
  allowPlainHttp: false,
  requireTimeouts: true,
  requireRateLimits: true
}
```

### AiProviderNetworkPolicy

```ts
export interface AiProviderNetworkPolicy {
  provider: "openai" | "anthropic" | "google" | "azure-openai" | "custom"
  allowSecretsInPrompt: boolean
  allowPii: boolean
  allowedRegions?: string[]
  maxPromptBytes?: number
  requireRedaction: boolean
}

export const OPENAI_POLICY: AiProviderNetworkPolicy = {
  provider: "openai",
  allowSecretsInPrompt: false,
  allowPii: false,
  allowedRegions: ["eu-west"],
  maxPromptBytes: 1024 * 1024,
  requireRedaction: true
}
```

### GovernedNetworkRuntime Interface (v0.2)

```ts
export interface GovernedNetworkRuntime {
  policy: NetworkPolicy

  validateDestination(
    destination: NetworkDestinationReference
  ): NetworkDiagnostic[]

  validateTlsRequirement(
    destination: NetworkDestinationReference
  ): NetworkDiagnostic[]

  validateCapability(
    capability: string
  ): NetworkDiagnostic[]

  safeHttpRequest(
    input: SafeHttpRequestInput
  ): Promise<SafeHttpResponse>
}
```

### SafeHttpRequestInput / SafeHttpResponse

```ts
export interface SafeHttpRequestInput {
  destination: NetworkDestinationReference
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string
  headers?: Record<string, string>
  body?: unknown
  timeoutMs?: number
  capability?: string
}

export interface SafeHttpResponse {
  status: number
  headers: Record<string, string>
  body: unknown
  receivedAt: string
  durationMs: number
}
```

### validateDestination() Implementation

```ts
export function validateDestination(input: {
  destination: NetworkDestinationReference
  policy: NetworkPolicy
}): NetworkDiagnostic[] {
  const diagnostics: NetworkDiagnostic[] = []

  const denied = input.policy.denyDestinations.includes(input.destination.host)
  if (denied) {
    diagnostics.push({
      code: "LN-NETWORK-001",
      severity: "error",
      message: `Destination ${input.destination.host} is explicitly denied.`
    })
    return diagnostics
  }

  const allowed = input.policy.allowDestinations.some(
    d => d.host === input.destination.host &&
         d.protocol === input.destination.protocol
  )

  if (!allowed && input.policy.default === "deny") {
    diagnostics.push({
      code: "LN-NETWORK-002",
      severity: "error",
      message: `Destination ${input.destination.host} is not allowlisted.`
    })
  }

  return diagnostics
}
```

### validateTlsRequirement() Implementation

```ts
export function validateTlsRequirement(input: {
  destination: NetworkDestinationReference
  policy: NetworkPolicy
}): NetworkDiagnostic[] {
  const diagnostics: NetworkDiagnostic[] = []

  if (input.policy.requireTls && !input.destination.tlsRequired) {
    diagnostics.push({
      code: "LN-NETWORK-003",
      severity: "error",
      message: `TLS is required for destination ${input.destination.host}.`
    })
  }

  if (input.destination.protocol === "http" && !input.policy.allowPlainHttp) {
    diagnostics.push({
      code: "LN-NETWORK-004",
      severity: "error",
      message: `Plain HTTP is forbidden by policy.`
    })
  }

  return diagnostics
}
```

### validateCapability() Implementation

```ts
export function validateCapability(input: {
  capability?: string
  allowedCapabilities: string[]
}): NetworkDiagnostic[] {
  if (!input.capability) {
    return [{ code: "LN-NETWORK-005", severity: "error", message: "Network capability is missing." }]
  }

  if (!input.allowedCapabilities.includes(input.capability)) {
    return [{ code: "LN-NETWORK-006", severity: "error", message: `Capability ${input.capability} is not allowed.` }]
  }

  return []
}
```

### safeHttpRequest() — Combining All Validations

```ts
export async function safeHttpRequest(input: {
  runtime: GovernedNetworkRuntime
  request: SafeHttpRequestInput
}): Promise<SafeHttpResponse> {
  const diagnostics = [
    ...input.runtime.validateDestination(input.request.destination),
    ...input.runtime.validateTlsRequirement(input.request.destination),
    ...input.runtime.validateCapability(input.request.capability ?? "network")
  ]

  const errors = diagnostics.filter(d => d.severity === "error")
  if (errors.length > 0) {
    throw new GovernedNetworkError("LN-NETWORK-007", "Network request denied by policy.", diagnostics)
  }

  const response = await performHttpRequest(input.request)

  return {
    status: response.status,
    headers: response.headers,
    body: response.body,
    receivedAt: new Date().toISOString(),
    durationMs: response.durationMs
  }
}
```

### Forbidden SSRF Destinations

Always deny:

```text
localhost
127.0.0.1
0.0.0.0
169.254.169.254           — AWS instance metadata
metadata.google.internal  — GCP instance metadata
metadata.azure.internal   — Azure instance metadata
internal admin endpoints
unknown wildcard destinations
```

### Webhook Contracts

```ts
export interface WebhookVerificationConfig {
  provider: "stripe" | "github" | "clerk" | "custom"
  signatureHeader: string
  algorithm: "sha256" | "sha512"
  maxTimestampAgeSeconds?: number
  requireTimestamp?: boolean
  requireRawBody: boolean
  requireReplayProtection: boolean
}

export interface WebhookVerificationResult {
  verified: boolean
  timestampValid: boolean
  signatureValid: boolean
  replayDetected: boolean
  diagnostics: NetworkDiagnostic[]
}
```

### verifyWebhookHmac()

```ts
export function verifyWebhookHmac(input: {
  rawBody: string
  signature: string
  secret: string
  algorithm: "sha256" | "sha512"
}): boolean {
  const digest = crypto
    .createHmac(input.algorithm, input.secret)
    .update(input.rawBody)
    .digest("hex")

  // Constant-time compare required to prevent timing side-channel attacks.
  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(input.signature)
  )
}
```

### validateWebhookTimestamp()

```ts
export function validateWebhookTimestamp(input: {
  timestamp: number
  maxAgeSeconds: number
}): boolean {
  const now = Math.floor(Date.now() / 1000)
  return Math.abs(now - input.timestamp) <= input.maxAgeSeconds
}
```

### ReplayStore / validateReplayProtection()

```ts
export interface ReplayStore {
  has(key: string): Promise<boolean>
  put(key: string, ttlSeconds: number): Promise<void>
}

export async function validateReplayProtection(input: {
  replayStore: ReplayStore
  replayKey: string
  ttlSeconds: number
}): Promise<NetworkDiagnostic[]> {
  const exists = await input.replayStore.has(input.replayKey)
  if (exists) {
    return [{ code: "LN-NETWORK-008", severity: "error", message: "Webhook replay detected." }]
  }

  await input.replayStore.put(input.replayKey, input.ttlSeconds)
  return []
}
```

### IdempotencyStore / validateIdempotency()

```ts
export interface IdempotencyStore {
  has(idempotencyKey: string): Promise<boolean>
  put(idempotencyKey: string, ttlSeconds: number): Promise<void>
}

export async function validateIdempotency(input: {
  store: IdempotencyStore
  key: string
  ttlSeconds: number
}): Promise<NetworkDiagnostic[]> {
  const exists = await input.store.has(input.key)
  if (exists) {
    return [{ code: "LN-NETWORK-008", severity: "warning", message: "Duplicate idempotent request detected." }]
  }

  await input.store.put(input.key, input.ttlSeconds)
  return []
}
```

### validateAiPrompt()

```ts
export function validateAiPrompt(input: {
  prompt: string
  policy: AiProviderNetworkPolicy
}): NetworkDiagnostic[] {
  const diagnostics: NetworkDiagnostic[] = []
  const size = Buffer.byteLength(input.prompt)

  if (input.policy.maxPromptBytes && size > input.policy.maxPromptBytes) {
    diagnostics.push({
      code: "LN-NETWORK-008",
      severity: "error",
      message: "AI prompt exceeds policy size limit."
    })
  }

  return diagnostics
}
```

### NetworkDiagnostic Type

```ts
export interface NetworkDiagnostic {
  code: string
  severity: "info" | "warning" | "error"
  message: string
  suggestion?: string
}
```

### NetworkPolicyReport

```ts
export interface NetworkPolicyReport {
  schemaVersion: "logicn.network.policy.report.v1"
  generatedAt: string
  policy: NetworkPolicy
  diagnostics: NetworkDiagnostic[]
  destinations: NetworkDestinationReference[]
  webhookPolicies: WebhookVerificationConfig[]
}
```

### Updated File Layout (v0.2)

```text
packages-logicn/logicn-core-network/src/

  policy/
    network-protocol.ts
    network-destination-reference.ts
    network-policy.ts
    ai-provider-policy.ts

  runtime/
    governed-network-runtime.ts
    safe-http-request.ts
    validate-destination.ts
    validate-tls-requirement.ts
    validate-capability.ts

  webhook/
    webhook-verification-config.ts
    verify-webhook-hmac.ts
    validate-webhook-timestamp.ts
    replay-store.ts
    validate-replay-protection.ts
    idempotency-store.ts
    validate-idempotency.ts

  reports/
    network-policy-report.ts

  diagnostics/
    network-diagnostics.ts
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
