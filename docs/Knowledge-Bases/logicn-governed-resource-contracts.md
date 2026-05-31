# LogicN — Governed Resource Contracts (CRUD)

## Status

```
Phase 17 — Design Proposal
Decision: CRUD is a governed pattern, not core syntax
Foundation: effects, contracts, response.denies, privacy — all implemented
resource {} keyword: Phase 17 parser addition
```

## TL;DR

- CRUD should be a governed pattern, not hardcoded language keywords
- `resource User { operations { create effects [...] } policy { ... } }` — declarative, not magical
- What LogicN enforces: create requires write effect, deletes require explicit policy, protected fields must be redacted, unsafe input must be validated before insert

---

## Why Not Keywords

Database behaviour varies too much for hardcoded CRUD:

```
SQL          → INSERT, UPDATE, DELETE
NoSQL        → document.put, collection.add
REST         → POST /users, PUT /users/:id
GraphQL      → mutation { createUser(...) }
Event sourcing → UserCreated, UserUpdated events
CQRS         → separate read/write models
File storage  → filesystem.write
External APIs → http.post
```

`crud User` would secretly generate behaviour for one model, hiding authority and making governance harder. **Avoid magic.**

---

## The Governed Resource Contract

```logicn
resource User {
  id: UserId
  email: protected Email
  name: String

  operations {
    create effects [database.write, audit.write]
    read   effects [database.read]
    update effects [database.write, audit.write]
    delete effects [database.write, audit.write]
  }

  policy {
    deny delete unless role.admin
    require audit on create, update, delete
    redact email in public responses
    require validation before create, update
  }
}
```

This gives developers a clear contract without baking in one storage implementation.
`User.create()`, `User.read()`, `User.update()`, `User.delete()` are framework helpers — not language keywords.

---

## Binding Resource Operations to Flows

```logicn
secure flow createUser(readonly request: Request) -> CreateUserResult

contract {
  types {
    type CreateUserResult = Result<Response, ApiError>
  }

  intent {
    "Create a new user with validated email and audit trail."
  }

  request {
    body {
      email: unsafe String
      name: unsafe String
    }
  }

  effects {
    database.write
    audit.write
  }

  privacy {
    require validation before database.write
    require redaction before audit.write
  }

  events {
    emits UserCreated
  }
}
{
  // Unsafe input must be validated before resource operation
  unsafe let rawEmail: String = request.body.email
  unsafe let rawName: String = request.body.name

  let email: protected Email = validate.email(rawEmail)?
  let name: String = validate.name(rawName)?

  let user = User.create({ email: email, name: name })?

  AuditLog.write({
    event: "UserCreated",
    userId: redact(user.id),
    actor: context.actor.id
  })

  emit UserCreated

  return Ok(Response.created({ userId: user.id }))
}
```

---

## What LogicN Enforces at Compile/Check Time

| Rule | Diagnostic |
|---|---|
| `create` / `update` / `delete` without `database.write` | LLN-EFFECT-001 |
| `read` without `database.read` | LLN-EFFECT-001 |
| `protected Email` in response without `response.denies` | LLN-GOV-003 |
| Unsafe input directly to `User.create()` | LLN-VALUESTATE-003 |
| Delete without explicit policy | LLN-GOV-XXX (future) |
| `require audit` in resource policy, audit.write not declared | LLN-GOV-012 or LLN-EFFECT-001 |

---

## Resource Contract → Compiler Outputs

A `resource User {}` declaration should eventually produce:

```text
Typed routes        → GET /users/:id, POST /users, PUT /users/:id, DELETE /users/:id
Typed validation    → input schema from field declarations
Effect declarations → per-operation effects from operations {}
Capability requirements → from effects via capability-registry.yaml
Audit reports       → from policy { require audit on ... }
Semantic graph nodes → User resource node with operation edges
```

---

## What LogicN Should NOT Do

```logicn
// AVOID — too magical, hides authority
crud User

// AVOID — implicit route generation without governance
@crud
type User { ... }
```

These hide what the resource can do and make governance review harder.

---

## Semantic Graph Representation

```json
{
  "kind": "resource",
  "name": "User",
  "fields": [
    { "name": "id", "type": "UserId" },
    { "name": "email", "type": "protected Email" },
    { "name": "name", "type": "String" }
  ],
  "operations": [
    { "kind": "create", "effects": ["database.write", "audit.write"] },
    { "kind": "read",   "effects": ["database.read"] },
    { "kind": "update", "effects": ["database.write", "audit.write"] },
    { "kind": "delete", "effects": ["database.write", "audit.write"] }
  ],
  "policy": {
    "denyDelete": "unless role.admin",
    "requireAudit": ["create", "update", "delete"],
    "redactInPublic": ["email"]
  }
}
```

---

## Recommended Decision

> LogicN should support CRUD through governed resource contracts and framework helpers,
> not through hardcoded CRUD language keywords.

CRUD operations should produce:
- Typed routes
- Typed input validation
- Effect declarations
- Capability requirements
- Audit reports
- Semantic graph nodes

That gives developers speed **without hiding authority**.

---

## Implementation Roadmap

```
Phase 17A: resource {} keyword in parser
  - Parse resource Name { fields, operations {}, policy {} }
  - Store as resourceDecl AstNode
  - Validate operation effect declarations against EFFECT_REGISTRY

Phase 17B: resource-flow binding
  - User.create() resolved against resource contract
  - Effect checker verifies flow declares the operation's required effects
  - Value-state checker verifies unsafe inputs validated before resource operations

Phase 17C: framework helpers
  - User.create(data) → framework-provided function using declared backend
  - User.read(id) → framework helper
  - Not hardcoded — adapter pattern

Phase 17D: route generation from resource
  - logicn generate routes UserResource → typed route stubs
  - Developer fills in business logic
  - Not automatic — developer approves

Phase 18: semantic graph resource nodes
  - Resource nodes in logicn.ai.json
  - Operation edges (User.create → database.write)
  - Policy edges (User.delete → requires role.admin)
```

---

## See Also

- `logicn-governed-request-execution.md` — per-flow request governance
- `logicn-flow-entry-points.md` — routes as authorised entry points
- `logicn-pii-handling.md` — PII in resource fields (protected Email)
- `logicn-contract-errors.md` — error mapping in resource operations
- `capability-registry.yaml` — operation → capability mapping
- `logicn-effect-inference-tracking.md` — inferred effects for resource operations
