# LogicN Core Config: Environment Config Model and Secret Reference Model

## Definition

The environment config model and secret reference model describe how LogicN
safely represents environment-specific runtime configuration and secret
references without exposing secret values.

The config model is split across two packages:

```text
logicn-core-config
    → describes and validates configuration safely

logicn-core-security
    → protects sensitive values and defines secret reference contracts
```

## Status

```text
Environment config model: defined in package docs — implementation stubs only
Secret reference model:   defined in logicn-core-security — stubs only
```

---

## Design Principle

Configuration is allowed to describe secret requirements.

Configuration is not allowed to load or print secret values.

Correct model:

```text
config package:
    "the PAYMENT_API_KEY secret is required"

security package:
    "this is a protected secret reference"

runtime:
    "resolve the secret only through approved capability-controlled paths"
```

Incorrect model:

```text
config package:
    reads PAYMENT_API_KEY raw value and prints it in diagnostics
```

---

## Part 1: Environment Config Model

### Purpose

The environment config model describes which environment mode is active and
which public and secret environment variables are required.

It supports four modes:

```text
development
test
staging
production
```

Different environments require different policies:

```text
development may allow verbose reports
test may use isolated mock secrets
staging may enable production-like validation
production must enforce strict policy
```

### EnvironmentMode Type

```ts
export type EnvironmentMode =
  | "development"
  | "test"
  | "staging"
  | "production"
```

This is a closed set. Unknown modes should emit diagnostics rather than silently
falling back.

### EnvironmentConfig Type

```ts
export interface EnvironmentConfig {
  /**
   * Active runtime mode.
   * Determines strictness rules and production policy behavior.
   */
  mode: EnvironmentMode

  /**
   * Public environment variable names required by the application.
   * These are names only, not values.
   */
  variables: string[]

  /**
   * Secret environment variable names required by the application.
   * These are names only, not values.
   */
  secrets: string[]
}
```

### AvailableEnvironment Type

```ts
export type AvailableEnvironment = Record<string, string | undefined>
```

The loader may inspect whether a variable is present, but it must not expose
secret values downstream.

### EnvironmentValidationResult Type

```ts
export interface EnvironmentValidationResult {
  valid: boolean
  mode: EnvironmentMode
  diagnostics: ConfigDiagnostic[]
  publicVariables: EnvironmentVariableReference[]
  secretVariables: SecretEnvironmentReference[]
}
```

### EnvironmentVariableReference Type

```ts
export interface EnvironmentVariableReference {
  /**
   * Environment variable name.
   */
  name: string

  /**
   * Whether the variable was present in the host environment.
   */
  present: boolean

  /**
   * Public variables may expose values only when policy permits.
   * Production reports should still avoid unnecessary environment dumps.
   */
  value?: string
}
```

### SecretEnvironmentReference Type

```ts
export interface SecretEnvironmentReference {
  /**
   * Secret environment variable name.
   */
  name: string

  /**
   * Whether the secret exists.
   * This is availability metadata only.
   */
  present: boolean

  /**
   * Secrets are never included as raw values.
   */
  redacted: true

  /**
   * Optional fingerprint for integrity comparison.
   * This must not be reversible.
   */
  fingerprint?: string
}
```

### ConfigDiagnostic Type

```ts
export interface ConfigDiagnostic {
  code: string
  severity: "info" | "warning" | "error"
  message: string
  path?: string
  suggestedFix?: string
}
```

Diagnostics must never include raw secret values.

### Environment Config Object Example

```ts
import { loadConfigFromObjects } from "@logicn/core-config"

const result = loadConfigFromObjects({
  project: {
    name: "logicn-app",
    version: "0.1.0",
    root: ".",
    entryFiles: [
      "packages-logicn/logicn-framework-example-app/src/index.lln"
    ],
    packages: [
      "packages-logicn/logicn-core",
      "packages-logicn/logicn-core-config",
      "packages-logicn/logicn-framework-example-app"
    ],
    strict: true,
    targets: ["cpu", "wasm"]
  },

  environment: {
    mode: "production",
    variables: ["LOGICN_APP_ENV"],
    secrets: ["LOGICN_APP_SECRET"]
  },

  availableEnvironment: {
    LOGICN_APP_ENV: "production",
    // Config treats this only as availability metadata — never prints the value.
    LOGICN_APP_SECRET: "set"
  }
})
```

### Environment Loader Example

```ts
export function loadEnvironmentConfig(
  config: EnvironmentConfig,
  availableEnvironment: AvailableEnvironment
): EnvironmentValidationResult {
  const diagnostics: ConfigDiagnostic[] = []

  const publicVariables = config.variables.map((name) => {
    const value = availableEnvironment[name]

    if (value === undefined) {
      diagnostics.push({
        code: "LN-CONFIG-001",
        severity: "error",
        message: `Required environment variable ${name} is missing.`,
        path: "environment.variables",
        suggestedFix: `Set ${name} for the active runtime profile.`
      })
    }

    return {
      name,
      present: value !== undefined,
      value
    }
  })

  const secretVariables = config.secrets.map((name) => {
    const value = availableEnvironment[name]

    if (value === undefined) {
      diagnostics.push({
        code: "LN-CONFIG-002",
        severity: "error",
        message: `Required secret ${name} is missing.`,
        path: "environment.secrets",
        suggestedFix:
          "Provision the secret through the approved runtime secret provider."
      })
    }

    return {
      name,
      present: value !== undefined,
      redacted: true as const
    }
  })

  return {
    valid: diagnostics.every((d) => d.severity !== "error"),
    mode: config.mode,
    diagnostics,
    publicVariables,
    secretVariables
  }
}
```

### Production Strictness Policy

Production mode must fail closed.

```ts
export interface ProductionStrictnessPolicy {
  requireStrictProjectMode: boolean
  failOnMissingVariables: boolean
  failOnMissingSecrets: boolean
  denyUnsafeSecretDefaults: boolean
  denyDevelopmentPackages: boolean
}
```

Example production policy:

```json
{
  "requireStrictProjectMode": true,
  "failOnMissingVariables": true,
  "failOnMissingSecrets": true,
  "denyUnsafeSecretDefaults": true,
  "denyDevelopmentPackages": true
}
```

### Production Package Overrides

Development-only or benchmark packages should be disabled in production by
default. Explicit overrides must include reason and expiry:

```json
{
  "production": {
    "packageOverrides": [
      {
        "path": "packages-logicn/logicn-tools-benchmark",
        "reason": "One-off production hardware validation before launch.",
        "expires": "2026-06-01"
      }
    ]
  }
}
```

### RuntimeConfigHandoff Type

```ts
export interface RuntimeConfigHandoff {
  mode: EnvironmentMode
  publicVariables: EnvironmentVariableReference[]
  secretReferences: SecretEnvironmentReference[]
  diagnostics: ConfigDiagnostic[]
  activeProductionPackageOverrides: ProductionPackageOverride[]
}
```

The runtime handoff must not include raw secret values.

### Host Package Manifest Boundary

`package.json` is a host ecosystem manifest.

It must not contain LogicN package graph keys, runtime profiles, compiler target
policy or production package overrides. These belong in future LogicN-specific
files:

```text
package-logicn.json
logicn.lock.json
```

Example host boundary violation diagnostic:

```json
{
  "code": "LN-CONFIG-010",
  "severity": "error",
  "message": "Host package.json must not define LogicN runtime policy.",
  "path": "package.json.logicnRuntime",
  "suggestedFix": "Move LogicN runtime policy into package-logicn.json when available."
}
```

### Suggested Config Package Structure

```text
packages-logicn/logicn-core-config/src/
```

Suggested files:

```text
environment-config.ts
environment-loader.ts
production-policy.ts
runtime-handoff.ts
config-diagnostics.ts
host-package-boundary.ts
```

### Diagnostic Codes (LN-CONFIG series)

| Code | Meaning |
| --- | --- |
| `LN-CONFIG-001` | required public environment variable missing |
| `LN-CONFIG-002` | required secret missing |
| `LN-CONFIG-003` | unknown environment mode |
| `LN-CONFIG-004` | production strict mode disabled |
| `LN-CONFIG-005` | unsafe secret default detected |
| `LN-CONFIG-006` | development package enabled in production |
| `LN-CONFIG-010` | host package manifest boundary violation |

---

## Part 2: Secret Reference Model

### Package

The secret reference model belongs in `logicn-core-security`.

The config package may refer to required secret names, but it must not own raw
secret lifecycle behavior.

### Purpose

The secret reference model represents sensitive values without exposing their
contents. It supports:

```text
secret availability
secret metadata
secret scope
secret fingerprint
allowed operations
safe redaction
taint tracking
safe sink validation
```

### Why Secret References Exist

Raw secrets must not appear in:

```text
source code
logs
diagnostics
compiler reports
runtime manifests
AI context
build output
normal strings
```

Secret references allow LogicN to reason about secrets without exposing them.

### SecretReference Type

```ts
export interface SecretReference {
  /**
   * Stable secret identifier or environment variable name.
   */
  name: string

  /**
   * Whether this secret is required for startup or execution.
   */
  required: boolean

  /**
   * Scope of use: runtime, deployment, database, network or crypto.
   */
  scope: string

  /**
   * Non-reversible fingerprint used only for comparison or audit correlation.
   */
  fingerprint?: string

  /**
   * Allowed operation: read, sign, decrypt or connect.
   */
  allowedOperation?: string

  /**
   * Marker preventing accidental serialization as a normal string.
   */
  protected: true
}
```

Example secret reference (metadata only — not the raw key):

```json
{
  "name": "PAYMENT_API_KEY",
  "required": true,
  "scope": "network",
  "fingerprint": "sha256:fingerprint-only",
  "allowedOperation": "connect",
  "protected": true
}
```

### SecretDerivedReference Type

Values derived from secrets must remain protected until consumed by an approved
safe sink.

```ts
export interface SecretDerivedReference {
  source: SecretReference
  derivedKind: "hash" | "token" | "signature" | "connection-string"
  protected: true
}
```

### SecureStringReference Type

```ts
export interface SecureStringReference {
  label: string
  redacted: true
  fingerprint?: string
}
```

### ProtectedSecret Class

```ts
export class ProtectedSecret {
  private readonly value: string

  constructor(value: string) {
    this.value = value
  }

  /**
   * Never expose the raw secret in normal string contexts.
   */
  toString(): string {
    return "[REDACTED]"
  }

  /**
   * Raw access requires an explicit safe operation.
   */
  useWithApprovedSink<T>(
    sink: SecretSafeSink,
    operation: (value: string) => T
  ): T {
    if (!sink.approved) {
      throw new Error("Secret sink is not approved")
    }

    return operation(this.value)
  }
}
```

### Safe Secret Resolution Flow

```text
config declares required secret name
    ↓
security creates protected SecretReference
    ↓
runtime validates capability
    ↓
secret provider resolves raw value inside protected boundary
    ↓
approved safe sink consumes value
    ↓
raw value is never logged or reported
```

### Unsafe Flow (must be rejected)

```text
config reads raw secret
    ↓
diagnostic includes secret
    ↓
report writes secret to disk
```

### SecretSafeSink Type

```ts
export interface SecretSafeSink {
  name: string
  kind: "network" | "crypto" | "database" | "token"
  approved: boolean
}
```

Safe sinks:

```text
declared network destination
approved cryptographic operation
approved token signing operation
database connection initialization
```

Unsafe sinks:

```text
logs
errors
AI prompts
build output
cache
telemetry
normal string conversion
```

### Safe Sink Validation

```ts
export function canSendSecretToSink(
  secret: SecretReference,
  sink: SecretSafeSink
): boolean {
  if (!sink.approved) {
    return false
  }

  if (secret.scope === sink.kind) {
    return true
  }

  return false
}
```

### RedactionResult Type

```ts
export interface RedactionResult {
  text: string
  fullyRedacted: boolean
  rulesApplied: string[]
}
```

### Redaction Helper

```ts
export function redactSecretValue(value: string): RedactionResult {
  return {
    text: "[REDACTED]",
    fullyRedacted: true,
    rulesApplied: ["secret-value"]
  }
}
```

Redaction must fail closed.

### Secret Serialization Rule

Allowed:

```json
{
  "name": "PAYMENT_API_KEY",
  "required": true,
  "scope": "network",
  "protected": true
}
```

Forbidden:

```json
{
  "name": "PAYMENT_API_KEY",
  "value": "real-secret-value"
}
```

### Integration With Effect Checker

Secret access should produce an effect:

```logicn
fn load_payment_key()
    effect secret
{
    return secret.read("PAYMENT_API_KEY")
}
```

### Integration With Boundary Checker

Secret values must not cross unsafe boundaries.

```logicn
pub fn expose_config() -> Config {
    return Config {
        apiKey: secret.read("PAYMENT_API_KEY")
    }
}
```

Expected diagnostic:

```text
LN-BOUNDARY-006
secret escaping public API
```

### Integration With Runtime Manifests

Runtime manifests should include secret metadata only — no raw values:

```json
{
  "effects": ["secret"],
  "secretReferences": [
    {
      "name": "PAYMENT_API_KEY",
      "required": true,
      "scope": "network",
      "protected": true
    }
  ]
}
```

### Diagnostic Codes (LN-SECRET series)

| Code | Meaning |
| --- | --- |
| `LN-SECRET-001` | required secret unavailable |
| `LN-SECRET-002` | secret value attempted to flow to unsafe sink |

---

## Recommended Implementation Order

### Phase 1

```text
EnvironmentConfig type
EnvironmentMode validation
ConfigDiagnostic type
safe runtime handoff type
```

### Phase 2

```text
secret reference integration
missing secret diagnostics
production strictness validation
```

### Phase 3

```text
host package boundary validation
production package overrides
runtime handoff reports
```

### Phase 4

```text
secret safe sinks
secret-derived taint tracking
effect/boundary checker integration
```

---

## v0.1 Scope

Implement first:

```text
typed environment config model
missing variable diagnostics
missing secret diagnostics
safe runtime config handoff
no raw secret output
basic production strictness policy
```

Defer:

```text
full secret provider integration
advanced taint tracking
secret-derived flow analysis
formal safe sink verification
external secret manager adapters
```

---

## Relationship to Other Systems

```text
logicn-core-config    → load and validate configuration safely
logicn-core-security  → protect sensitive values; own SecretReference contracts
logicn-core-compiler  → effect checker validates `secret` effect; boundary checker detects leakage
logicn-core-runtime   → enforce runtime secret access via capability grants
logicn-core-reports   → report must redact all secret values
```

See also: `effect-checker-and-boundary-checker.md`, `runtime-audit-log-format.md`,
`package-completion-status.md`.
