# Framework: Contracts

## Purpose

Contracts define explicit agreements between application boundaries.

## Short Definition

A contract says what enters, what leaves, what may happen and what must be
reported.

## Contract Types

```text
request
response
model
flow
policy
package
storage
external API
event
AI/tool
compute
```

## Security Rules

- Public boundaries must have contracts.
- Contracts must be typed.
- Contract violations must be diagnostics or runtime-safe errors.
- AI tools should use contracts as the source of truth for examples and edits.
- Contract-based polymorphism is allowed only when implementations satisfy the
  declared input, output, permission, effect, error, boundary and report rules.
- A contract must not hide implementation authority; effective reports should
  show which implementation was selected where selection matters.

## Generated Reports

```text
contract-index-report.json
contract-definition-report.json
contract-effective-report.json
contract-implementation-report.json
```

## v1 Scope

Request, response, model, flow, policy and package contracts.
