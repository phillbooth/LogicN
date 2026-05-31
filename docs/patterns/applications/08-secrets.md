# LogicN Application Pattern 08 — Secrets and Sensitive Values

**When to use:** API keys, tokens, passwords, private keys, database credentials

---

## Current Approach: `SecureString` Type

LogicN provides a `SecureString` type for credential values. The compiler enforces three rules at the type level:

| Code | Rule |
|------|------|
| `LLN-SECRET-001` | `SecureString` may not be passed to `log.*`, `print`, or `audit.write` |
| `LLN-SECRET-002` | `SecureString` may not be compared with `==` or `!=` |
| `LLN-SECRET-003` | `SecureString` may not be serialised to JSON, YAML, or any output encoder |

These rules are enforced regardless of variable name. Any binding of type `SecureString` is subject to them.

---

## The Problem with Plain `String`

A plain `String` credential can be:

- **Logged** — `log.info("key: " + apiKey)` compiles without warning
- **Serialised** — `json.encode({ key: apiKey })` silently includes the secret in output
- **Compared with `==`** — susceptible to timing attacks; no compiler warning

LogicN's `SecureString` type closes all three paths at compile time.

---

## Correct Pattern

```logicn
let apiKey: SecureString = Secret.env("API_KEY")
// LLN-SECRET-001 fires if passed to log.*
// LLN-SECRET-002 fires if compared with ==
// LLN-SECRET-003 fires if passed to json.encode

// Correct comparison — constant-time:
let match: Bool = constantTimeEquals(apiKey, expected)
```

`Secret.env` reads from the process environment and returns `SecureString`. The value is never exposed as a plain `String`.

Additional sources:

```logicn
Secret.env("DB_PASSWORD")          // environment variable
Secret.vault("db/password")        // Vault-compatible secret store
Secret.file("/run/secrets/key")    // Docker secret mount
```

---

## Proposed `secret` Declaration (Phase 17)

Phase 17 introduces a declarative form that makes the governance rules visible in the source:

```logicn
secret ApiKey {
  source env("API_KEY")
  never log
  never serialize
  rotate every 90d
}
```

The compiler generates the `SecureString` binding and enforces the declared rules. The `rotate every 90d` directive emits a warning in the runtime report when the secret has not been rotated within the declared period (requires a rotation timestamp in the secret store metadata).

---

## Naming Convention Semantic Rules

The compiler optionally warns when a binding name suggests a credential but the declared type is plain `String`:

| Suffix pattern | Suggestion |
|---------------|-----------|
| `*Secret` | Use `SecureString` |
| `*Token` | Use `SecureString` |
| `*Password` | Use `SecureString` |
| `*PrivateKey` | Use `SecureString` |
| `*ApiKey` | Use `SecureString` |

Enable with:

```toml
[lint]
naming-convention-secrets = "warn"  # or "error"
```

This catches cases like:

```logicn
let dbPassword: String = config.get("DB_PASSWORD")
// warning: binding name suggests credential; consider SecureString
```

---

## Rotation Pattern

Secrets must never appear in audit logs. When a rotation event occurs, log the rotation event, not the secret value:

```logicn
guarded flow rotateApiKey(newKey: SecureString) {
  contract {
    effects { secret.write, audit.write }
    audit { require runtime report }
  }

  Secret.vault.set("api/key", newKey)
  AuditLog.write({
    event: "api_key_rotated",
    actor: actor.id,
    timestamp: now()
    // newKey is NOT included — LLN-SECRET-001 would fire
  })
}
```

The audit log records that rotation happened, not what the new value is.

---

## Contrast: `protected` vs `SecureString`

These two types serve different purposes and must not be confused:

| Type | Used for | Risk if leaked |
|------|----------|---------------|
| `protected Email` | Validated PII — user-submitted data | Privacy breach |
| `SecureString` | Credentials — system secrets | Security breach |

A `protected Email` may appear in an audit log (after `redact()`). A `SecureString` must **never** appear in any log, audit, or output — the compiler enforces this unconditionally.

```logicn
// PII — can appear redacted in audit:
AuditLog.write({ email: redact(email) })   // OK

// Credential — must never appear:
AuditLog.write({ key: redact(apiKey) })    // LLN-SECRET-001 — redact() does not lift the restriction
```

`redact()` is not a bypass for `LLN-SECRET-001`. Secrets are excluded from all output paths regardless of transformation.
