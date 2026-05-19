# Contracts: Model

## Purpose

A model contract defines internal application data.

## Short Definition

Model contracts describe classified internal data the application owns or
processes. They are security contracts, not public DTOs and not active-record
database objects.

## Syntax

```logicn
model Order {
  id: UUID classify: public_id
  userId: UUID classify: internal
  total: Money classify: financial
  status: OrderStatus classify: public
}
```

## Security Rules

- Internal models are not public output contracts.
- Production fields must be classified.
- Storage shape and API shape should be separate.
- Models should not own hidden storage effects.
- Model mutations should be explicit and policy-controlled.
- Relationships should be explicit and reportable.
- Model exposure reports must show possible public leaks.

## Generated Reports

```text
model-index.json
model-definitions.json
model-effective.json
model-exposure.json
model-relationships.json
model-mutation-report.json
model-ai-summary.json
```

## v1 Scope

Typed records, field classification and exposure reports.

## Knowledge Base

See [Model Security Contracts](../Knowledge-Bases/model-security-contracts.md).
