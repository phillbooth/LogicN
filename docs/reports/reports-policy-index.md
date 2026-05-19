# Reports: Policy

## Purpose

Policy reports describe policy declarations, usage, definitions, effective
merged enforcement and conflicts.

## Report Family

```text
policy-index.json
policy-definitions.json
policy-effective.json
policy-conflicts.json
policy-ai-summary.json
policy-human-summary.md
```

## Policy Index

The policy index answers:

```text
Where is each policy used?
Which route uses it?
Which flow uses it?
Which model, response, package or data field does it affect?
```

## Contains

```text
policy id
policy kind
source file
source location
declared scope
related routes, flows or packages
```

## Policy Definitions

`policy-definitions.json` answers:

```text
What does each policy allow?
What does each policy deny?
What does each policy require?
What audit, memory, effect and capability rules does it contain?
```

## Effective Policy

`policy-effective.json` answers:

```text
What is actually enforced after app, package, data, route, flow, response and runtime policies are combined?
```

This is the primary security proof report for policy enforcement.

## Policy Conflicts

`policy-conflicts.json` records conflicts, resolution rules and deny-wins
decisions.

## AI Summary

`policy-ai-summary.json` provides a simplified AI-readable security posture,
including defaults such as deny-by-default, raw model response denial, secret
output denial, undeclared effect denial and silent fallback denial.

## Security Rules

- Do not include secret values.
- Include unresolved or conflicting policy entries.
- Keep source locations stable for diagnostics and AI tools.
- Effective policy must distinguish declared facts from merged/inferred facts.
- Deny must win over allow unless a higher-priority policy explicitly defines a
  safe exception.

## v1 Scope

Index, define and resolve app, route, flow, response and package policy
declarations.
