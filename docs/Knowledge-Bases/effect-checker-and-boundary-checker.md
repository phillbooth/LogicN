# Effect Checker and Boundary Checker

## Definition

The effect checker and boundary checker are two complementary compiler
components that enforce what code may do and where it is allowed to do it.

| Component        | Question Answered                     |
| ---------------- | ------------------------------------- |
| Effect checker   | What does this code do?               |
| Boundary checker | Is this code allowed to do that here? |

## Status

```text
Planned / Not yet implemented.
Effect and boundary validation are part of the intended compiler safety model
but are not yet enforced by the current compiler prototype.
```

---

## Effect Checker

### Purpose

The effect checker determines which side effects a piece of code may perform.

Effects describe interactions beyond pure computation:

```text
fs.read               — reading files
fs.write              — writing files
network.connect       — opening network connections
env.read              — accessing environment variables
secret.read           — reading secrets
time.read             — accessing system clocks
random.read           — generating randomness
runtime.log           — logging or emitting telemetry
runtime.audit         — emitting audit events
process.spawn         — spawning processes
database.read         — database read operations
database.write        — database write operations
```

### Why It Matters

Without an effect checker the compiler cannot reliably answer:

```text
Is this function pure?
Can this module access the network?
Is this code allowed to read secrets?
Can this code run at compile time?
Is this dependency introducing undeclared runtime authority?
```

### Expected Behaviour

Functions declare their effects in the signature:

```logicn
flow loadConfig(path: String) -> String
effects [fs.read] {
    fs.read(path)
}
```

If a function performs an undeclared effect, the compiler rejects it:

```logicn
flow loadConfig(path: String) -> String {
    fs.read(path)
}
// LLN-E4001: undeclared effect
// Function `loadConfig` performs effect `fs.read` but does not declare it.
```

### Effect Propagation

Effects propagate through the call graph.

```logicn
flow readUser() -> String effects [fs.read] {
    fs.read("user.json")
}

flow start() {
    readUser()
}
// LLN-E4002: undeclared propagated effect
// `start` indirectly performs `fs.read` via `readUser`
```

Corrected:

```logicn
flow start() effects [fs.read] {
    readUser()
}
```

### Compile-Time Restrictions

Compile-time code must be deterministic. The effect checker must reject
compile-time code that attempts runtime-only effects:

```logicn
const config = fs.read("local.env")
// LLN-E4003: forbidden compile-time effect
// Compile-time expression attempted fs.read
```

### Initial Effect Categories

```text
pure              — no external effects
fs.read           — file system read
fs.write          — file system write
network.connect   — outbound network
env.read          — environment variable access
secret.read       — secret store access
time.read         — system clock access
random.read       — randomness source
process.spawn     — process spawning
runtime.log       — logging
runtime.audit     — audit event emission
```

---

## Boundary Checker

### Purpose

The boundary checker validates whether code crosses architectural, trust,
package, runtime, or authority boundaries correctly.

Boundary types:

```text
Module boundaries              — public/private symbol access
Package boundaries             — package API contracts
Compile-time/runtime boundary  — forbidden runtime operations during compilation
Trust boundaries               — untrusted dependencies and sensitive authority
Capability boundaries          — declared vs undeclared capabilities
Deployment boundaries          — environment-specific restrictions
```

### Why It Matters

Without a boundary checker the compiler cannot enforce:

```text
Encapsulation
Capability isolation
Runtime authority limits
Compile-time determinism
Safe package APIs
Trusted versus untrusted dependency separation
```

The boundary checker works alongside the effect checker.
The effect checker determines what an operation does.
The boundary checker determines whether that operation is allowed here.

### Example: Visibility Boundary

```logicn
// auth.lln
private flow hashPassword(password: String) -> String { ... }
public flow login(username: String, password: String) -> Bool { ... }

// app.lln
import auth::{hashPassword}
// LLN-E3004: visibility boundary violation
// Symbol `hashPassword` is private to module `auth`
```

### Example: Compile-Time / Runtime Boundary

```logicn
compile flow generateSchema() {
    network.fetch("https://example.com/schema")
}
// LLN-E4004: compile-time/runtime boundary violation
// Compile-time function attempted runtime-only operation `network.fetch`
```

### Example: Package Trust Boundary

Untrusted dependencies must not inherit sensitive authority:

```toml
[dependencies.parser-lib]
trust = "external"
capabilities = []
```

If `parser-lib` attempts to access secrets, the compiler rejects the build.

### Implementation Scope

The first boundary checker must define:

```text
Boundary types and metadata representation
Rules for module/package access
Compile-time versus runtime separation enforcement
Trust boundary rules for external dependencies
Capability boundary enforcement
Diagnostics for invalid boundary crossings
```

---

## Error Codes

```text
LLN-E4001  undeclared effect
LLN-E4002  undeclared propagated effect
LLN-E4003  forbidden compile-time effect
LLN-E4004  compile-time/runtime boundary violation
LLN-E4005  capability boundary violation
LLN-E4006  package trust boundary violation
```

## Implementation Order

These two systems are foundational and should be implemented early:

```text
1. Define effect syntax and categories
2. Implement function-level effect declarations
3. Implement effect propagation through call graph
4. Implement compile-time effect restrictions
5. Define boundary types and metadata
6. Implement visibility boundary enforcement
7. Implement compile-time/runtime boundary
8. Implement package trust boundary enforcement
9. Add error diagnostics and suggested fixes
```

## Relationship to Other Systems

```text
Effect checker     → feeds into runtime capability policies
Boundary checker   → enforces module visibility + trust model
Both               → required for Omni logic reasoning layer
Both               → required for `logicn explain` explanations
```

See also: `authority-model.md`, `compile-time-vs-runtime-authority.md`,
`governed-capability-modules.md`.
