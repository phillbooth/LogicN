# Logic Architecture Policy

## Definition

The **Logic Architecture Policy** defines what belongs in each layer of LogicN and prevents the language from becoming messy as syntax, runtime, and security rules grow.

```text
Syntax expresses intent.
Logic defines rules.
Policy controls authority.
Runtime enforces decisions.
Audit proves what happened.
```

## Layer Responsibilities

| Layer | Responsibility |
|---|---|
| `syntax` | Human/AI readable expression of intent. No hidden behaviour. |
| `logic` | Business and security rules. What is allowed. Not how it runs. |
| `permission` | Authority declarations. Deny-by-default. Explicit allow only. |
| `runtime` | Execution mechanics. Connection, budget, audit path, scheduling. |
| `policy` | Governance rules active for the whole application. |
| `boot/main` | Project startup choices within runtime policy bounds. |

## Policy Rules

### 1. Syntax Must Stay Simple

Readable by humans, AI, and auditors.

Avoid: hidden behaviour, shorthand that hides authority, overloaded words, magic globals, inheritance-style behaviour.

Prefer: explicit names, controlled language, stable terminology, clear operational meaning.

### 2. Logic Must Be Separate From Runtime Mechanics

Business/security logic describes what is allowed. Runtime mechanics decide how it runs.

Example:

```text
permission says: allow db.read

runtime decides: which connection, budget, audit, scheduler path
```

### 3. Permission Is Deny-By-Default

Only explicit `allow` grants authority. Everything else is denied.

### 4. Built-In Rules Belong in boot/main or Runtime Standard

Common rules should not be repeated everywhere:

```text
private view means owner-only
secret cannot be exposed
audit auto-adds actor
context is automatic unless authority-sensitive
```

### 5. Local Flow Logic Should Stay Small

A flow contains business intent, not repeated security plumbing.

```logicn
return Ok(Profile.response { ... })
```

The runtime still checks: response type, view rules, owner rules, permission rules, audit rules.

### 6. Shared State Must Use Vaults

```logicn
SessionVault.write(
  key: session_uuid,
  value: { ... }
)
```

No unsafe global variables.

### 7. Runtime Policy Must Be Auditable

Every important decision must be explainable:

```text
why execution was allowed
what permission was used
what actor triggered it
what data was exposed
what capability was used
what audit event was written
```

### 8. Architecture Must Be Additive

Avoid renaming or removing concepts. Prefer extending:

```text
new view levels
new contexts
new compute targets
new permission types
```

### 9. AI Must Not Guess Architecture

Every concept must be documented and indexed:

```text
actor, view, permission, vault, flow, context, runtime, event
```

## Short Policy

```text
Do not repeat common safety rules.
Do not hide authority.
Do not let runtime behaviour be guessed.
```
