# LogicN Core Security v0.2

## Formal Specification — Secret Reference Model and Taint Tracking

This document is the v0.2 canonical specification for `logicn-core-security`.

Update status: this formal v0.2 file still uses
`ProtectedSecret<T>.reveal()`. `docs/COVERAGE.md` records an unresolved conflict
with the architecture spec, which uses
`ProtectedSecret<T>.unwrapForApprovedSink(sink)`. Do not implement secret
unwrapping until `logicn-core-security` chooses one canonical public shape.

See also: `model-security-contracts.md`, `data-in-motion-security.md`.

---

## SecretSource Discriminated Union (v0.2)

```ts
type SecretSource =
    | {
        type: "environment";
      }

    | {
        type: "vault";
      }

    | {
        type: "kms";
      }

    | {
        type: "runtime";
      }

    | {
        type: "oauth";
      }

    | {
        type: "token";
      };
```

| Source      | Description              |
| ----------- | ------------------------ |
| environment | Environment variables    |
| vault       | Secret vault provider    |
| kms         | Key management system    |
| runtime     | Runtime-generated secret |
| oauth       | OAuth credentials        |
| token       | API/authentication token |

Note: The prior KB used "env", "file", "secretStore", "runtimeInjected".
The v0.2 formal spec adds "oauth" and "token" and renames the others.

---

## SecretCategory Enum (v0.2)

13-value enum:

```ts
enum SecretCategory {
    ApiKey,
    Password,
    AccessToken,
    RefreshToken,
    SessionToken,
    OAuthSecret,
    PrivateKey,
    SigningKey,
    EncryptionKey,
    Certificate,
    RuntimeCredential,
    DatabaseCredential,
    InternalSecret
}
```

Categories enable:
- runtime policy enforcement
- selective redaction
- capability-aware propagation
- audit classification
- compliance filtering

---

## SecretRedactionPolicy

```ts
interface SecretRedactionPolicy {
    redactInLogs: boolean;

    redactInReports: boolean;

    redactInAuditStreams: boolean;

    allowPartialReveal: boolean;
}
```

---

### DEFAULT_REDACTION_POLICY

```ts
const DEFAULT_REDACTION_POLICY = {
    redactInLogs: true,

    redactInReports: true,

    redactInAuditStreams: true,

    allowPartialReveal: false
};
```

All redaction enabled by default. Partial reveal disabled.

---

## SecretReference (v0.2)

```ts
interface SecretReference {
    id: string;

    source: SecretSource;

    category: SecretCategory;

    createdAt: string;
}
```

Example:
```json
{
  "id": "secret_8812",
  "source": { "type": "vault" },
  "category": "DatabaseCredential",
  "createdAt": "2026-05-25T12:00:00Z"
}
```

---

## Secret Derivation System

Derived secrets include authorization headers, encrypted payloads,
session credentials, runtime access tokens, and delegated credentials.

### SecretDerivedReference

```ts
interface SecretDerivedReference {
    parent: SecretReference;

    derivation: SecretDerivation;
}
```

---

### SecretDerivation

```ts
interface SecretDerivation {
    operation: string;

    timestamp: string;
}
```

Example:
```ts
const derived: SecretDerivedReference = {
    parent: secretRef,

    derivation: {
        operation:
            "buildAuthorizationHeader",

        timestamp:
            new Date().toISOString()
    }
};
```

---

## Taint Tracking

### SecretTaint (v0.2)

```ts
interface SecretTaint {
    tainted: boolean;

    source: SecretSource;

    propagationChain: string[];
}
```

Note: The prior KB modelled SecretTaint as a discriminated union. The
v0.2 formal spec defines it as a plain interface with a `propagationChain`
array tracking the full path of transformations.

Example:
```json
{
  "tainted": true,
  "source": { "type": "vault" },
  "propagationChain": [
    "loadSecret",
    "buildAuthorizationHeader"
  ]
}
```

---

## SecureStringReference

```ts
interface SecureStringReference {
    value: string;

    secret: boolean;

    taint?: SecretTaint;
}
```

Example:
```ts
const secureHeader: SecureStringReference = {
    value: "Bearer abc123",

    secret: true,

    taint: {
        tainted: true,

        source: {
            type: "oauth"
        },

        propagationChain: [
            "oauthLogin"
        ]
    }
};
```

---

## ProtectedSecret\<T\> (v0.2)

```ts
class ProtectedSecret<T> {

    readonly reference:
        SecretReference;

    readonly taint:
        SecretTaint;

    private readonly value: T;

    constructor(
        value: T,
        reference: SecretReference,
        taint: SecretTaint
    ) {
        this.value = value;

        this.reference =
            reference;

        this.taint = taint;
    }

    reveal(): T {
        return this.value;
    }
}
```

Note: The method is `reveal()`. The prior KB used `unwrapForApprovedSink()`.
The `reveal()` method is the v0.2 formal specification.

---

## SecretSafeSink

```ts
type SecretSafeSink =
    | "secure-runtime-memory"

    | "vault"

    | "kms"

    | "encrypted-channel"

    | "authorization-header";
```

### isSafeSink()

```ts
function isSafeSink(
    sink: string
): boolean {

    const safeSinks = [
        "secure-runtime-memory",
        "vault",
        "kms",
        "encrypted-channel"
    ];

    return safeSinks.includes(
        sink
    );
}
```

Unsafe sinks — secrets must never enter:
- logs
- reports
- explain traces
- browser storage
- telemetry
- public runtime streams

---

## SecretDiagnostic

```ts
interface SecretDiagnostic {
    code: string;

    message: string;

    severity: string;
}
```

---

## safeLog()

```ts
function safeLog(
    value: unknown
): void {

    if (
        value instanceof ProtectedSecret
    ) {
        console.log(
            "[REDACTED_SECRET]"
        );

        return;
    }

    console.log(value);
}
```

Output for `safeLog(dbPassword)`:
```text
[REDACTED_SECRET]
```

---

## buildAuthorizationHeader()

Builds authorization-safe runtime headers. Preserves taint metadata and
derivation chain.

```ts
function buildAuthorizationHeader(
    token:
        ProtectedSecret<string>
): SecureStringReference {

    return {
        value:
            `Bearer ${token.reveal()}`,

        secret: true,

        taint: {
            tainted: true,

            source:
                token.taint.source,

            propagationChain: [
                ...token
                    .taint
                    .propagationChain,

                "buildAuthorizationHeader"
            ]
        }
    };
}
```

Result:
```json
{
  "secret": true,
  "taint": {
    "tainted": true,
    "propagationChain": [
      "oauthLogin",
      "buildAuthorizationHeader"
    ]
  }
}
```

---

## Secret Propagation Rules

| Rule                          | Purpose                         |
| ----------------------------- | ------------------------------- |
| Secrets stay tainted          | Prevent silent declassification |
| Derived secrets inherit taint | Preserve lineage                |
| Unsafe sinks blocked          | Prevent leaks                   |
| Runtime logs redacted         | Secure observability            |
| Authorization headers tracked | Runtime accountability          |

---

## Diagnostic Codes

| Code          | Meaning                         |
| ------------- | ------------------------------- |
| LN-SECRET-001 | Unsafe log sink                 |
| LN-SECRET-002 | Unsafe secret propagation       |
| LN-SECRET-003 | Secret serialization prohibited |
| LN-SECRET-004 | Invalid secret derivation       |
| LN-SECRET-005 | Missing taint metadata          |

---

## File Layout

```text
logicn-core-security/

  secrets/
    SecretReference.ts
    ProtectedSecret.ts    (class with reveal())
    SecretTaint.ts        (interface with propagationChain[])
    SecretSource.ts       (6-value discriminated union)

  runtime/
    safeLog.ts
    sinkValidation.ts     (isSafeSink)
    authorization.ts      (buildAuthorizationHeader)

  diagnostics/
    SecretDiagnostic.ts
    codes.ts              (LN-SECRET-001–005)

  policies/
    redaction.ts          (SecretRedactionPolicy, DEFAULT_REDACTION_POLICY)
    taintRules.ts
```

---

## Planned v0.3 Features

| Feature                      | Purpose                     |
| ---------------------------- | --------------------------- |
| Distributed Taint Graphs     | Cluster-wide secret tracing |
| Zero-Knowledge Secret Proofs | Private verification        |
| Secret Capability Tokens     | Delegated secret access     |
| Encrypted Runtime Memory     | In-memory protection        |
| Secret Expiration Policies   | Automatic invalidation      |
| Hardware-backed Isolation    | Secure enclaves             |
