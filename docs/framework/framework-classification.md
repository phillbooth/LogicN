# Framework: Classification

## Purpose

Classification marks the sensitivity and handling rules for data.

## Short Definition

A classification tells LogicN whether data is public, private, sensitive,
internal, secret or otherwise restricted.

## Syntax Example

```logicn
model User {
  id: UUID classify: public_id
  email: Email classify: pii
  passwordHash: SecureString classify: secret
  internalRiskScore: RiskScore classify: internal
}
```

## Security Rules

- Secret and credential fields must not appear in public output.
- PII and financial data require declared permission before exposure.
- Internal fields must not leave public route boundaries.
- Classification is part of LogicN encapsulation: it controls where data may
  flow, not only whether a field is visible.
- Sensitive values must be redacted from logs, reports and AI-readable output
  unless a safe report format explicitly allows derived metadata.
- Production models should not contain unclassified fields.

## Generated Reports

```text
data-classification-report.json
model-exposure.json
response-exposure-report.json
secret-usage-report.json
```

## v1 Scope

Field-level classification and basic exposure checks for models, requests and
responses/views.

## Knowledge Base

See [Encapsulation Model](../Knowledge-Bases/encapsulation-model.md).
