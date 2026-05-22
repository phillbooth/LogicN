# Framework: Data Visibility

## Purpose

View metadata marks the exposure and handling rules for data.

## Short Definition

A view tells LogicN who or what may see or expose data.

Older documents may use `classification` for field exposure. New field
exposure syntax should use `view`.

## Syntax Example

```logicn
model User {
  id: UUID view: public
  email: Email view: private
  passwordHash: SecureString view: secret
  internalRiskScore: RiskScore view: internal
}
```

## Security Rules

- Secret fields must not appear in public output.
- Private and regulated data require declared permission before exposure.
- Internal fields must not leave public route boundaries.
- View metadata is part of LogicN encapsulation: it controls where data may
  flow, not only whether a field is visible.
- Sensitive values must be redacted from logs, reports and AI-readable output
  unless a safe report format explicitly allows derived metadata.
- Production models should not contain fields without a view.

## Generated Reports

```text
data-view-report.json
model-exposure.json
response-exposure-report.json
secret-usage-report.json
```

## v1 Scope

Field-level view metadata and basic exposure checks for models, requests and
responses/views.

## Knowledge Base

See [Data Visibility View Terminology](../Knowledge-Bases/data-visibility-view-terminology.md).
