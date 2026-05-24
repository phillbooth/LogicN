# Effect Checker and Boundary Checker

## Definition

The effect checker and boundary checker are two complementary compiler
components that enforce what code may do and where it is allowed to do it.

| Component        | Question Answered                     |
| ---------------- | ------------------------------------- |
| Effect checker   | What does this code do?               |
| Boundary checker | Is this code allowed to do that here? |

They work together:

```text
Effect checker     → identifies what effects code performs
Boundary checker   → validates whether those effects are allowed here
```

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

### Effect Syntax

Recommended syntax (v0.1 design):

```logicn
fn name(args) -> ReturnType effect effect_name {
    ...
}
```

Multiple effects:

```logicn
fn name(args) -> ReturnType effect network, storage {
    ...
}
```

No effect declaration means pure or locally bounded code:

```logicn
fn add(a: Int, b: Int) -> Int {
    return a + b
}
```

The older `effects [fs.read]` bracket form is equivalent in concept;
the canonical documented form uses `effect network, storage` (no brackets).

### Example: Pure Function

```logicn
pub fn normalise_name(name: Text) -> Text {
    return name.trim().lowercase()
}
```

Compiler result: no effects, pure function, no capability required.

### Example: Effectful Function

```logicn
pub fn load_profile(http: HttpClient, id: UserId)
    -> Result<UserProfile, NetworkError>
    effect network
{
    return http.get("/users/" + id)
}
```

Effect checker validates that `http.get` requires `network` and the
function declares it.

### Effect Checker Algorithm (Pseudo-code)

```text
for each function in module:
    collect_required_effects(function.body)    ← walk AST
    declared = function.effect_declarations
    required = inferred_from_body + propagated_from_callees

    for each effect in required:
        if effect not in declared:
            emit LN-EFFECT-001 (undeclared effect)

    for each effect in declared:
        if effect not in required:
            emit LN-EFFECT-004 (declared but never used — warning)
```

### Checker Output

```json
{
  "function": "load_profile",
  "declared_effects": ["network"],
  "inferred_effects": ["network"],
  "result": "pass"
}
```

### Initial Effect Categories (Full Table)

| Effect | Meaning | Example |
| --- | --- | --- |
| `network` | Sends or receives network traffic | HTTP request, socket |
| `storage` | Reads or writes durable storage | database query |
| `filesystem` | Reads or writes files | config file read |
| `secret` | Reads protected secrets | API key access |
| `process` | Starts or controls processes | shell command |
| `timer` | Uses time-based waiting | timeout, delay |
| `scheduler` | Registers future work | scheduled action |
| `trigger` | Responds to runtime event | event listener |
| `crypto` | Performs sensitive cryptographic action | signing, verification |
| `accelerator` | Uses GPU or AI accelerator | tensor operation |
| `optical_io` | Uses future optical transport planning | interconnect planning |
| `audit` | Writes audit evidence | runtime audit record |

Pure (no declaration) means no external effects beyond local computation.

Not every effect needs to be implemented in v0.1, but the checker must be
designed so new effects can be added without redesigning the language.

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

### Boundary Types (Full Table)

| Boundary | What It Prevents |
| --- | --- |
| Module visibility | Private symbol accessed from outside module |
| Package contract | Package internal API exposed to external consumers |
| Compile-time / runtime | Runtime effect attempted at compile time |
| Secret / data | Secret type escapes into public API or audit log |
| Filesystem | Unrestricted file access outside declared paths |
| Network | Undeclared outbound connections |
| Capability | Capability used without being granted or declared |

### Boundary Violation Examples

**Module visibility violation:**

```logicn
// auth.ln
private fn hash_password(pw: String) -> String { ... }
public fn login(u: String, pw: String) -> Bool { ... }

// app.ln
import auth::{hash_password}
// LN-BOUNDARY-004: private symbol `hash_password` not visible outside `auth`
```

**Package contract violation:**

```logicn
import app/users/repository/internal/raw_sql
// LN-BOUNDARY-001: import crosses restricted package boundary
// `internal/raw_sql` is not part of `app/users/repository` public API
```

**Compile-time / runtime boundary:**

```logicn
compile fn generate_schema() {
    network.fetch("https://example.com/schema")
}
// LN-BOUNDARY-003: compile-time function attempted runtime-only operation
// Also: LLN-E4004 (compile-time/runtime boundary violation)
```

**Secret leakage:**

```logicn
pub fn get_config() -> Config {
    return Config { api_key: secret.read("PAYMENT_KEY") }
}
// LN-BOUNDARY-006: secret type escaping into public API
```

**Capability violation:**

```logicn
fn run_shell() effect process {
    shell.exec("rm -rf /")
}
// LN-BOUNDARY-007: capability `ShellExec` not declared for this module
```

### Implementation Scope

The first boundary checker must define:

```text
Boundary types and metadata representation
Rules for module/package access
Compile-time versus runtime separation enforcement
Trust boundary rules for external dependencies
Capability boundary enforcement
Secret / data leakage detection
Diagnostics for invalid boundary crossings
```

---

## Diagnostic Codes

### Effect Checker Codes (LN-EFFECT series)

| Code | Meaning |
| --- | --- |
| `LN-EFFECT-001` | Function performs undeclared effect |
| `LN-EFFECT-002` | Effect propagated from callee not declared in caller |
| `LN-EFFECT-003` | Compile-time code performs runtime-only effect |
| `LN-EFFECT-004` | Effect declared but never observed (warning) |
| `LN-EFFECT-005` | Unknown effect name used in declaration |

### Boundary Checker Codes (LN-BOUNDARY series)

| Code | Meaning |
| --- | --- |
| `LN-BOUNDARY-001` | Import crosses restricted package boundary |
| `LN-BOUNDARY-002` | Public API exposes private or internal type |
| `LN-BOUNDARY-003` | Runtime operation attempted at compile time |
| `LN-BOUNDARY-004` | Private symbol accessed from outside module |
| `LN-BOUNDARY-005` | Unsafe dependency inherits sensitive authority |
| `LN-BOUNDARY-006` | Secret type escaping into public API or audit log |
| `LN-BOUNDARY-007` | Capability used without being declared |
| `LN-BOUNDARY-008` | Network access outside declared host allowlist |
| `LN-BOUNDARY-009` | Filesystem access outside declared path allowlist |

### Legacy Codes (also in use)

```text
LLN-E4001  undeclared effect
LLN-E4002  undeclared propagated effect
LLN-E4003  forbidden compile-time effect
LLN-E4004  compile-time/runtime boundary violation
LLN-E4005  capability boundary violation
LLN-E4006  package trust boundary violation
```

Both series are in use. `LN-EFFECT-*` and `LN-BOUNDARY-*` are the newer
canonical forms; `LLN-E4*` codes are the earlier equivalents.

## Implementation Order (16-item checklist)

These two systems are foundational and should be implemented early:

```text
 1. Define effect syntax and effect categories
 2. Implement function-level effect declarations
 3. Implement effect propagation through call graph
 4. Implement compile-time effect restrictions
 5. Define boundary types and metadata representation
 6. Implement module visibility boundary enforcement
 7. Implement package contract boundary enforcement
 8. Implement compile-time / runtime boundary enforcement
 9. Implement package trust boundary enforcement (external deps)
10. Implement secret / data leakage detection
11. Implement network boundary checks (host allowlist)
12. Implement filesystem boundary checks (path allowlist)
13. Implement capability boundary enforcement
14. Add effect checker diagnostics with suggested fixes
15. Add boundary checker diagnostics with suggested fixes
16. Generate runtime manifest including effect and boundary metadata
```

## v0.1 Scope

Implement first (v0.1):

```text
network effect
storage effect
filesystem effect
secret effect
scheduler effect
trigger effect
module visibility boundary
package contract boundary
capability boundary
runtime manifest generation
```

Defer to later:

```text
optical_io effect
accelerator effect
distributed compute effects
advanced network host allowlist
advanced filesystem path allowlist
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
