# Safe / Unsafe Trust Model

## Definition

LogicN introduces `safe` and `unsafe` as first-class runtime trust concepts.
This makes LogicN memory-safe, trust-aware, runtime-governed and security-first.

## Core Distinction

LogicN separates two kinds of safety:

```text
memory safety      = all values, always
runtime trust safety = requires explicit validation
```

LogicN `unsafe` does NOT mean memory-unsafe, pointer-unsafe, unmanaged memory,
bypassing bounds checks, manual allocation or raw memory access.

Unlike Rust where `unsafe` means the memory safety guarantees may be bypassed,
in LogicN:

```text
unsafe = memory-safe but security-untrusted
```

All LogicN values remain memory-safe. `unsafe` means the value originated
outside the trusted runtime and has not yet been validated or sanitised.

## What `unsafe` Means

A value is `unsafe` when it came from:

```text
API requests
browser input
file uploads
AI responses
network traffic
external database imports
plugin data
shell output
```

## Core Runtime Rule

```text
unsafe values may exist in the runtime,
but they cannot participate in normal logic operations.
```

Unsafe values are quarantined until validated.

## Runtime Type Marking

The runtime automatically marks external input as unsafe:

| Source | Runtime Type |
| --- | --- |
| HTTP request | unsafe |
| File upload | unsafe |
| AI output | unsafe |
| Plugin data | unsafe |
| Browser data | unsafe |
| External socket data | unsafe |

## Allowed Operations on Unsafe Values

Unsafe values may only:

```text
1. Be temporarily stored
2. Be passed into approved validators
3. Be sanitised
4. Be rejected
5. Be logged safely as unsafe metadata
```

## Forbidden Operations on Unsafe Values

Unsafe values cannot, until validated:

```text
perform maths
merge with safe values
participate in business logic
be used in conditions
access GlobalVault
access databases
access files
access shell execution
access workers
access runtime APIs
access network execution
access payment systems
```

## Validation Model

```text
unsafe -> validate/sanitise -> safe -> usable
```

Not: `unsafe -> use while still marked unsafe`

## Code Examples

Invalid — unsafe participating in arithmetic:

```logicn
let price: unsafe Decimal = request.price
let tax: safe Decimal = 20
let total = price + tax
```

Compiler error:

```text
LNN-SEC-041:
unsafe value cannot participate in runtime expressions.
Validate or sanitise before use.
```

Correct:

```logicn
let raw_price: unsafe Decimal = request.price
let price: safe Decimal = validate.decimal(raw_price)
let tax: safe Decimal = 20
let total: safe Decimal = price + tax
```

String example — correct:

```logicn
let raw_name: unsafe String = request.name
let name: safe String = sanitise.text(raw_name)
let greeting: safe String = "Hello " + name
```

Database example — correct:

```logicn
let raw_query: unsafe String = request.query
let query: safe DatabaseString = database.escape(raw_query)
database.run(query)
```

## Safe Values

A `safe` value is:

```text
validated
sanitised
trusted by the runtime
allowed into privileged systems
```

## Context-Specific Safety

Safety is contextual. A value safe in one context is not automatically safe in
another:

```text
safe HtmlText  != safe DatabaseString
safe Email     != safe ShellArg
```

Specialised safe types include:

```logicn
safe Email
safe Url
safe DatabaseString
safe HtmlText
safe ShellArg
safe FilePath
```

## Approved Validators Only

Only approved runtime validators may convert `unsafe` to `safe`:

```logicn
let email: safe Email = validate.email(raw_email)
```

Invalid manual promotion:

```logicn
let email: safe Email = raw_email
```

Compiler error: unsafe value cannot be directly promoted to safe. Use an
approved validator.

## Flow vs fn

Flows may validate unsafe data:

```logicn
flow create_user(body: unsafe Json) -> Result {
  let user: safe User = validate.user(body)
  return GlobalVault.users.create(user)
}
```

Functions (`fn`) cannot upgrade trust automatically. Only runtime-approved
validators may return safe values.

## Worker Isolation

Workers receiving unsafe values run with stricter isolation:

```logicn
worker parse_upload {
  isolation: strict
}
```

## Runtime Enforcement

The compiler and runtime block `unsafe -> privileged runtime access` without
validation. Protected systems include:

```text
GlobalVault
Database runtime
Payment runtime
Secret runtime
File runtime
Worker runtime
Execution runtime
Shell runtime
```

## Runtime Auditing

The runtime tracks:

```text
unsafe origin
validation path
trust conversion
privileged access
runtime execution flow
```

## Security Benefits

This model prevents:

```text
SQL injection
prompt injection
path traversal
unsafe shell execution
privilege escalation
runtime trust confusion
unsafe backend orchestration
secret leakage
```

## Core Principle

```text
Everything is memory-safe.
Not everything is trusted.
```

```text
unsafe values cannot participate in normal runtime logic.
unsafe values must be validated before use.
```
