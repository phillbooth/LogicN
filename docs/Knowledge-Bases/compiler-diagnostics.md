# Compiler Diagnostics

## Definition

LogicN compiler and runtime diagnostics are machine-readable and human-readable.
Every warning, error, and fatal diagnostic has a structured code, source location,
problem description, and suggested fix. Diagnostics are designed for both human
developers and AI tooling.

## Diagnostic Format

Every diagnostic includes:

```json
{
  "code": "LNN-ERR-TYPE-001",
  "severity": "error",
  "file": "src/orders.lln",
  "line": 14,
  "column": 22,
  "expected": "Int",
  "actual": "String",
  "problem": "Cannot add String and Int.",
  "suggestedFix": "Use toInt() to convert the String explicitly.",
  "safeExample": "let total: Int = toInt(raw_count) + 5"
}
```

Diagnostics must not include:

```text
raw secrets
real tokens
private keys
full .env contents
production data
```

## Severity Levels

```text
WARN  — non-fatal, execution can continue
ERR   — recoverable error, compilation or execution blocked
FATAL — unrecoverable, runtime must halt
```

## Code Ranges

| Range | Category |
| --- | --- |
| `LNN-WARN-MEM-*` | Memory warnings |
| `LNN-ERR-MEM-*` | Recoverable memory errors |
| `LNN-FATAL-MEM-*` | Unrecoverable memory errors |
| `LNN-WARN-DISK-*` | Disk warnings |
| `LNN-ERR-DISK-*` | Disk errors |
| `LNN-FATAL-DISK-*` | Unrecoverable disk errors |
| `LNN-WARN-CACHE-*` | Cache warnings |
| `LNN-ERR-CACHE-*` | Cache errors |
| `LNN-WARN-LOGIC-*` | Logic-width warnings |
| `LNN-ERR-LOGIC-*` | Logic-width errors |
| `LNN-WARN-TARGET-*` | Target support warnings |
| `LNN-ERR-TARGET-*` | Target support errors |
| `LNN-ERR-TYPE-*` | Type errors |
| `LNN-ERR-NULL-*` | Null / None errors |
| `LNN-WARN-BUILD-*` | Build warnings |
| `LNN-ERR-SEC-*` | Security errors |
| `LNN-WARN-SEC-*` | Security warnings |
| `LNN-WARN-API-*` | API warnings |
| `LNN-SEC-*` | Security rule violations (compiler) |
| `LNN-MEM-*` | Memory model violations (compiler) |
| `LNN-STYLE-*` | Code style violations (compiler) |
| `LNN-TRUST-*` | Trust/signing violations (runtime) |
| `LNN-AI-*` | AI-generated code risk (runtime) |

## Core Compiler Codes

### Type Errors

```text
LNN-ERR-TYPE-001: Type mismatch — expected X, got Y
LNN-ERR-TYPE-002: Field X is not a member of type Y
LNN-ERR-TYPE-003: Non-exhaustive match — missing enum case: X
LNN-ERR-NULL-001: Null is not a valid value — use Option<T>
LNN-ERR-NULL-002: None used where a value is required — unwrap or handle None
```

### Security Errors

```text
LNN-SEC-014: fn declarations cannot request runtime authority.
             Move this operation into a flow or pass the required value as an argument.
LNN-SEC-041: Cannot use unsafe value in expression.
             Validate first: validate.X(value) -> safe X
```

### Memory Errors

```text
LNN-MEM-021: Use after release — variable was released on line N.
LNN-MEM-022: Release of borrowed value — can only release owned local values.
```

### Style Warnings

```text
LNN-STYLE-012: Nesting depth exceeds 2. Consider extracting to a named fn or flow.
```

### Trust Errors (runtime)

```text
LNN-TRUST-041: Local self-signed artifact cannot run in production profile.
               Use CI/OIDC, trusted registry, or organisation signing.
```

### AI Risk Codes

```text
LNN-AI-PRIV-001: AI-generated high-risk flow requires production approval.
```

## Implemented Prototype Codes

These codes are emitted by the current Node.js prototype:

```text
LNN-ERR-TARGET-002   — target not available
LNN-WARN-TARGET-003  — accelerator fallback to CPU
LNN-WARN-LOGIC-001   — logic width simulation
LNN-ERR-LOGIC-001    — unsupported logic width
LNN-WARN-DISK-003    — disk space warning
LNN-ERR-DISK-001     — disk write failure
LNN-WARN-MEM-002     — memory limit approaching
LNN-WARN-MEM-005     — cache memory warning
LNN-ERR-MEM-006      — memory integrity check failed
LNN-ERR-TYPE-001     — type mismatch
LNN-ERR-TYPE-002     — unknown field
LNN-ERR-TYPE-003     — non-exhaustive match
LNN-ERR-NULL-001     — null not allowed
LNN-ERR-NULL-002     — unexpected None
LNN-WARN-BUILD-002   — build warning
LNN-ERR-SEC-001      — security policy violation
LNN-WARN-SEC-002     — security warning
LNN-WARN-API-001     — API configuration warning
```

## Source Mapping

Diagnostics map to original `.lln` source files even when compiled output runs:

```text
Type error:
Cannot add String and Int.

Original source:
  src/orders.lln:14:22

Suggestion:
  Convert the String explicitly using toInt().
```

## Report Files

The build system generates:

```text
app.security-report.json  — security settings, permissions, unsafe usage
app.build-manifest.json   — source hash, output hash, dependency hashes, timestamp
app.failure-report.json   — error type, source location, target, suggested fix
```

The build manifest includes:

```text
source hash
output hash
dependency hashes
compiler version
build mode
target outputs
created timestamp
```

## CI Rules

CI should fail if:

```text
unsafe code introduced without explicit profile allowance
secret logging detected
webhooks lack verification
API routes lack timeouts
JSON policies missing
dependencies request risky permissions
target fallback is unsafe
```

## Core Principle

```text
Every diagnostic is structured, source-mapped, and actionable.
Diagnostics never expose secrets.
Both humans and AI tools can act on diagnostics.
```
