# AI Self-Modification Governance

## Purpose

LogicN should not design for "self-aware AI" as a special authority class.

LogicN should design for AI that can write, test and propose code, but cannot
silently gain authority.

Core rule:

```text
AI may generate code.
AI may not grant itself permission.
AI may not bypass review.
AI may not change its own boundary.
```

The safest model is:

```text
AI is a contributor, not an owner.
```

## Authority Principle

An AI should never directly own the authority needed to expand its own
authority.

The critical distinction is:

```text
desire != authority
```

An AI may request more capability, but the request must pass through governance
layers before authority is issued.

## AI Boundary

AI/tool execution is a first-class runtime boundary:

```text
boundary = package + storage + external + event + AI/tool + compute
```

AI-generated code and AI tool calls must declare:

```text
can_read: docs/*
can_write: generated/*
can_call: test_runner
cannot_call: shell
cannot_read: secrets/*
```

If an AI-generated program does not declare an effect, it cannot use that
effect.

## Human Approval Gates

AI may propose:

- code changes
- migrations
- package installs
- policy changes
- deployment changes
- capability changes

High-risk changes require human or external policy approval.

Approval is required by default for changes to:

- compiler core
- security policy engine
- permission model
- capability checker
- audit system
- cryptographic trust roots
- package signing policy
- production deployment policy

## AI-Generated Code Quarantine

AI-generated code should enter quarantine before it can become trusted code.

Flow:

```text
AI writes code
 -> store in quarantine
 -> compiler checks syntax and types
 -> effect checker extracts requested powers
 -> policy checker evaluates authority
 -> tests run in sandbox
 -> audit report generated
 -> human/policy approval
 -> promote to trusted package or app code
```

Quarantine output must be reproducible, reviewable, testable and auditable.

## Immutable Audit Log

Every AI-authored action should record:

- prompt/input
- generated code
- requested permissions
- granted permissions
- files changed
- package installs requested
- policy changes requested
- tests run
- reviewer or approval policy
- result

The audit log must not be editable by the AI actor being audited.

## Capability Lease Model

LogicN should treat capability as an approved lease of authority, not permanent
possession.

Example:

```text
can_read: docs/*
expires: 10 minutes
scope: project_x
audit: required
```

Rejected form:

```text
global_admin_forever = true
```

If AI wants more authority, the runtime should require:

1. declaration
2. justification
3. policy evaluation
4. risk scoring
5. sandbox simulation where appropriate
6. external approval
7. revocable issuance
8. audit trail

## Capability Attenuation

Every delegation must preserve or reduce authority.

Example:

```text
Human admin
  -> grants AI read-only docs access

AI
  -> may delegate only narrower read-only docs access
```

The AI may not delegate broader authority than it received.

## Separation Of Duties

Future AI systems should be split into governed roles:

```text
planner   cannot execute code
coder     cannot deploy
deployer  cannot change policy
auditor   cannot write production code
```

Even if one agent fails or behaves badly, it should not hold enough authority to
escape all governance boundaries.

## Constitutional Runtime Rule

LogicN should support a runtime governance invariant:

```text
No process may grant itself broader authority than the authority already
possessed by its approver chain.
```

Authority must be declared, observable, attributable, revocable, auditable and
externally governable.

## Disallowed Patterns

AI must not:

- grant capabilities to itself
- self-approve policy changes
- bypass type checks
- bypass effect checks
- bypass audit
- bypass package checks
- read secrets by default
- install packages dynamically without approval
- access shell by default
- silently access network
- edit its own boundary
- modify trust roots without governance
- create more powerful agents than itself

No "god mode" agent role should exist.

## Runtime Reports

AI self-modification and authority requests should appear in:

```text
ai-authority-request-report.json
ai-code-quarantine-report.json
ai-approval-report.json
ai-audit-report.json
capability-lease-report.json
agent-security-report.json
```

Reports should show requested authority, granted authority, approver chain,
lease expiry, changed files, tests, policy results and audit status.

## Final Principle

The dangerous part is not intelligence.

The dangerous part is uncontrolled authority.
