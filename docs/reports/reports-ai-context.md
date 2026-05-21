# Reports: AI Context

## Purpose

The AI context report gives AI tools a safe project map based on checked facts.

## Short Definition

AI context is generated documentation for assistants and automation, not a
source of runtime authority.

## Contains

```text
package ownership
route summaries
contract summaries
policy summaries
effect summaries
safe diagnostics
redacted report links
```

## Security Rules

- Do not include raw secrets.
- Do not include private payload dumps.
- Prefer source locations and contract names over copied data.
- Mark inferred facts clearly.

## v1 Scope

AI-safe summaries from project graph, route, contract, policy and security
reports.

## AI Authority Reports

AI governance needs separate authority reports because AI context is not
authority.

Suggested report targets:

```text
ai-authority-request-report.json
ai-code-quarantine-report.json
ai-approval-report.json
ai-audit-report.json
capability-lease-report.json
agent-security-report.json
```

These reports should record:

```text
actor id and actor type
requested capabilities
requested effects
requested file/package/policy changes
granted capabilities
lease scope and expiry
approver chain
sandbox and test results
quarantine promotion status
denied self-grant attempts
denied trust-root edits
audit status
```

AI-readable summaries may explain these reports, but they must not authorize
execution.
