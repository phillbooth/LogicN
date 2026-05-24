# LogicN Security

`logicn-core-security` is the package for reusable LogicN security primitives and security
report contracts.

LogicN's strongest honest security position is application security policy. This
package helps make permissions, typed API boundaries, package effects, secrets,
interop, production rules and AI-readable reports visible and enforceable before
code runs.

It belongs in:

```text
/packages-logicn/logicn-core-security
```

Use this package for:

```text
SecureString model helpers
Secret<T> / protected secret reference contracts
redaction primitives
permission model types
policy definition and effective policy contracts
capability grant and boundary report contracts
capability lease and attenuation contracts
AI authority request decision contracts
immutable trust-root protection diagnostics
malicious data validation diagnostics
exploit-resistance baseline mappings
taint-flow and safe-sink diagnostics
hardware risk security report inputs
security diagnostics
security report contracts
safe token/cookie/header handling helpers
secret taint tracking and safe sink decisions
cryptographic policy types
post-quantum crypto policy planning
crypto inventory report contracts
network permission decision integration
security report creation
```

## Boundary

`logicn-core-security` provides shared primitives. It should not own application auth
flows, route enforcement or HTTP parsing.

```text
auth provider workflows -> logicn-framework-app-kernel
route auth enforcement  -> logicn-framework-app-kernel
HTTP header parsing     -> logicn-framework-api-server
network policy shape    -> logicn-core-network
task permission checks  -> logicn-core-tasks
compiler security rules -> logicn-core / logicn-core-compiler
```

## Contracts

The package defines:

```text
SecureStringReference
SecretReference
SecretDerivedReference
RedactionRule
RedactionResult
PermissionModel
PermissionDecision
SafeTokenReference
SafeCookieReference
SafeHeaderReference
CryptographicPolicy
SecurityDiagnostic
SecurityReport
```

Use `SecureStringReference` and safe token/cookie/header helpers to represent
sensitive values without storing the real value in source-controlled reports.
Use redaction helpers before writing diagnostics, logs or report text that may
include secrets.

Use protected secret references for `.env` values and runtime secrets. A secret
reference may expose metadata such as name, required flag, scope, fingerprint
and allowed operation, but it must not expose the raw value to reports,
diagnostics, AI context or normal strings. Values derived from secrets should
remain secret-derived until an approved secret-safe sink consumes them.

## Secret Reference Model

Secret references represent sensitive values without exposing their contents.

### Core Types

```ts
export interface SecretReference {
  name: string
  required: boolean
  scope: string
  fingerprint?: string
  allowedOperation?: string
  protected: true
}

export interface SecretDerivedReference {
  source: SecretReference
  derivedKind: "hash" | "token" | "signature" | "connection-string"
  protected: true
}

export interface SecureStringReference {
  label: string
  redacted: true
  fingerprint?: string
}
```

### ProtectedSecret Class

```ts
export class ProtectedSecret {
  toString(): string { return "[REDACTED]" }
  useWithApprovedSink<T>(sink: SecretSafeSink, operation: (value: string) => T): T
}
```

### SecretSafeSink Type

```ts
export interface SecretSafeSink {
  name: string
  kind: "network" | "crypto" | "database" | "token"
  approved: boolean
}
```

Safe sinks: declared network destination, approved cryptographic operation,
approved token signing, database connection initialization.

Unsafe sinks: logs, errors, AI prompts, build output, cache, telemetry,
normal string conversion.

### Secret Validation Functions

```ts
function canSendSecretToSink(secret: SecretReference, sink: SecretSafeSink): boolean
function redactSecretValue(value: string): RedactionResult
```

### Diagnostic Codes (LN-SECRET series)

| Code | Meaning |
| --- | --- |
| `LN-SECRET-001` | required secret unavailable |
| `LN-SECRET-002` | secret value attempted to flow to unsafe sink |

See `docs/Knowledge-Bases/logicn-core-config-environment-secrets.md` for the
full secret reference model specification.

## Safety Contracts

Security helpers must fail closed when a helper cannot prove that output is
safe.

```text
redaction input over the configured maximum is fully redacted
invalid redaction rules fully redact by default
redaction replacements that can re-emit full matches or surrounding context are rejected
permission models deny by default
policy conflicts fail closed unless explicitly resolved
effective policy must be reportable
effects are not actor authorization
protected actions and protected data exposure require capabilities or permissions
AI actors may request capabilities but must not self-grant or self-approve them
capability leases must be scoped, revocable, auditable and no broader than the approver chain
trust roots must not be modified by runtime AI without external governance
data cannot grant authority; input claims for role, ownership or permission must be verified
untrusted input must pass through size, depth, schema, type, range, canonicalisation and ownership checks
unsafe sinks such as SQL, shell, filesystem paths, URLs, HTML, logs, prompts, deserializers, native interop and hardware queues require typed safe operations
explicit deny grants take precedence over allow grants
default-allow and wildcard-allow permission models are diagnosed
network.any, rawSocket, packetCapture and promiscuousMode are denied by default
weak crypto algorithms must not appear in allowed algorithm lists
cryptographic choices must be policy-driven and reportable
Random must not be used for secrets, keys, tokens, salts or nonces
post-quantum readiness must be reported through crypto inventory evidence
raw SQL, shell execution and unsafe interop are production risks by default
secret flows to logs, AI prompts, external APIs and errors are reported
secret values are denied from logs, errors, cache, LLM input, build output and reports
secrets may be sent only to declared network destinations or approved cryptographic operations
```

Callers can choose `onInvalidRule: "skip"` or `"throw"` for compatibility, but
the default redaction mode is `fail-closed`.

Final rule:

```text
logicn-core-security provides reusable security primitives.
logicn-core-network defines network policy and report contracts.
logicn-framework-app-kernel enforces application security policy.
logicn-core and logicn-core-compiler check language-level security contracts.
```
