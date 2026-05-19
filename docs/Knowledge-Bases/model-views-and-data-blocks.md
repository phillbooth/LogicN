# Model Views And Data Blocks

## Purpose

LogicN can simplify the developer surface by grouping models, requests and
responses under `data`, while preserving the security separation between
internal data and public output.

## Short Definition

```text
data = model + request + response/view
```

## Core Rule

```text
Do not fully merge model and response.
Use model views for safe output.
```

The model remains internal truth. A view or response defines what may leave.

## Data Block Pattern

```logicn
data User {
  model {
    id: UUID classify: public_id
    email: Email classify: pii
    passwordHash: SecureString classify: secret
    internalRiskScore: RiskScore classify: internal
  }

  request get {
    userId: UUID classify: public_id
  }

  view public {
    include id
    deny email
    deny passwordHash
    deny internalRiskScore
  }

  view authorised {
    include id
    include email requires permission users.pii.read
    deny passwordHash
    deny internalRiskScore
  }
}
```

## Why Views Are Safer

Rejected:

```logicn
return Ok(user)
```

Accepted:

```logicn
return Ok(User.authorised.from(user))
```

This keeps the key distinction:

```text
User = internal model
User.authorised = safe output view
```

## Naming Guidance

Prefer descriptive view names:

```text
public
self
authorised
admin
audit
```

Avoid vague names where possible:

```text
safe
normal
default
```

## Security Rules

- Public routes must not return raw internal models.
- Views must explicitly include or deny sensitive fields.
- PII exposure must require permission.
- Secret and credential fields must not be exposed.
- Model views should generate fast projection and exposure reports.

## Reports

```text
model-exposure.json
response-exposure-report.json
data-view-report.json
model-ai-summary.json
```

## Best Short Statement

```text
Keep model and response separate in meaning.
Let views make that separation easier to write.
```
