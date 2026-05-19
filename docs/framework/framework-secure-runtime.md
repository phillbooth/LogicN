# Framework: Secure Runtime

## Purpose

Define `logicn serve` as the main v1 framework milestone.

## Short Definition

The secure runtime checks typed application code, loads route and contract
manifests, applies policy before handler work starts and emits reports.

## Why It Exists

Secure web applications need fast request handling without losing explicit
security boundaries. LogicN should make these boundaries typed, reportable and
AI-readable.

The secure runtime implements the architecture charter at request execution
time: security first, code second, authority never implicit.

## Runtime Path

```text
request
  -> route manifest
  -> typed request decode
  -> policy/effect/capability check
  -> secure flow
  -> typed response contract
  -> reports
```

## Security Rules

- Inputs start untrusted.
- Effects are denied until declared.
- Package authority is denied until approved.
- Response data must pass through response contracts.
- Fallback and adapter choices must be reported.

## Memory Safety Rules

- Large request bodies should use streams or read-only views.
- Explicit clone is required for expensive copies.
- Secrets must remain scoped and redacted.

## Generated Reports

```text
runtime-report.json
route-report.json
effect-report.json
security-report.json
memory-report.json
```

## v1 Scope

`logicn serve` and secure web runtime behavior are the main v1 milestone.

## Future Scope

Native executable output, WASM acceleration and advanced compute targets remain
future target planning.
