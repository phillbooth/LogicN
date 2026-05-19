# Contracts: Policy

## Purpose

A policy contract defines allowed behavior for routes, flows, packages, data and
runtime adapters.

## Short Definition

Policy contracts describe what may happen and under which authority.

Policy is first-class source. It should be visible, reusable, close to the
thing it protects and compiled into effective runtime checks and reports.

## Policy Types

```text
policy app
policy route
policy flow
policy data
policy response
policy memory
policy package
policy runtime
policy compute
policy interop
policy audit
```

## Security Rules

- Policy must be source-visible.
- Effective policy must be reportable.
- Unknown or conflicting policy must fail closed.
- Policy cannot silently weaken type, effect or response contracts.

## Generated Reports

```text
policy-index.json
policy-definitions.json
policy-effective.json
policy-conflicts.json
policy-ai-summary.json
policy-human-summary.md
```

## v1 Scope

App, route, flow, response and package policy.
