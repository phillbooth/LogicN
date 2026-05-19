# Framework: Models

## Purpose

Models define internal data shapes used by application flows, storage adapters
and domain logic.

## Short Definition

A model is a classified internal data contract. It is not automatically safe for
public output and must not behave like an active-record database object.

## Syntax Example

```logicn
model User {
  id: UUID classify: public_id
  email: Email classify: pii
  passwordHash: SecureString classify: secret
  internalRiskScore: RiskScore classify: internal
  createdAt: DateTime classify: public
  updatedAt: DateTime classify: internal
}
```

## How It Connects

```text
request contract -> flow -> model -> response contract
```

Models connect to:

- classification rules
- response/view contracts
- secure flows
- repositories/storage boundaries
- relationship maps
- mutation rules
- model reports

## Security Rules

- Raw models must not be returned by public routes.
- Production model fields must be classified.
- Secret, internal, hidden and sensitive fields must follow exposure policy.
- Public output must use response contracts.
- Storage models and response models must stay separate.
- Models must not own hidden database effects such as `save()` or `findById()`.
- Model relationships must be explicit and must not trigger hidden lazy loading.
- Model mutation must be explicit, policy-controlled and auditable.
- Large model copies should require explicit clone or read-only handling.

## Generated Reports

```text
model-index.json
model-definitions.json
model-effective.json
model-exposure.json
model-relationships.json
model-mutation-report.json
model-ai-summary.json
model-human-summary.md
```

## Rejected Example

```logicn
return Response.ok(user)
```

Public routes should return a declared response contract, not a raw model.

## v1 Scope

Typed records, field classification, model/response separation, basic exposure
reporting and report names. Relationship, mutation and storage-provider
implementations may remain later work until the parser/checker is mature.

## Knowledge Base

See [Model Security Contracts](../Knowledge-Bases/model-security-contracts.md).
