# LogicN Agent

`logicn-ai-agent` is the package for supervised AI agent definitions, tool
permissions, task groups, typed messages, visibility scopes, approval gates,
merge policies and agent reports.

It belongs in:

```text
/packages-logicn/logicn-ai-agent
```

Use this package for:

```text
AgentDefinition
AgentToolPermission
AgentVisibilityScope
AgentMessageSchema
AgentDataExchangePolicy
AgentSecretPolicy
AgentMemoryPolicy
AgentCachePolicy
AgentSandboxPolicy
AgentLimits
AgentTaskGroupPlan
AgentResult
AgentMergePolicy
AgentReport
```

## Multi-Agent Runtime Model

LogicN agents are untrusted workers by default.

Agents must not directly access:

```text
files
.env
raw secrets
databases
network
terminal
Git
other agents
deployment tools
LLM memory
```

Agents receive typed inputs and may only perform declared actions through the
LogicN agent runtime. The runtime enforces policy through:

```text
supervisor agent
agent registry
typed message bus
tool gateway
MCP boundary gateway
secret guard
memory guard
cache guard
sandbox manager
human approval gate
audit report generator
```

The detailed runtime design lives in `../../docs/MULTI_AGENT_RUNTIME.md`.

## Boundary

`logicn-ai-agent` describes typed agent orchestration contracts. It does not own
model inference, vector math, target selection, runtime scheduling internals,
sandbox implementation or security primitive implementation.

Related packages:

| Package | Responsibility |
|---|---|
| `logicn-core-runtime` | structured concurrency, cancellation, timeout and supervision runtime |
| `logicn-core-security` | permissions, redaction, secret guards, unsafe reports and policy checks |
| `logicn-ai` | generic AI inference contracts and safety policy |
| `logicn-core-compute` | compute target planning and fallback reports |
| `logicn-core-vector` | vector, matrix, tensor and embedding operations |
| `logicn-target-cpu` | CPU fallback and orchestration baseline |
| `logicn-target-gpu` | GPU target planning for heavy compute |

Agents must be:

```text
typed
supervised
permissioned
bounded
cancelable
reportable
sandboxable
cache-guarded
approval-aware
```

## Default Denies

Agents must deny these by default:

```text
read .env
read raw secrets
write files directly
delete files
install dependencies
run shell commands
access production databases
deploy to production
send emails to real users
process payments
modify their own permissions
create more powerful agents
communicate directly with other agents
disable audit logs
```

Agents should normally propose code patches, docs changes, tests, reports and
deployment requests. Applying dangerous changes requires explicit policy and
human approval.

## MCP Tool Boundary Position

MCP tools, resources and prompts must enter agent workflows through declared
AI/tool boundaries. Agents must not treat an advertised MCP tool as permission
to use it.

MCP calls must remain:

```text
typed
permissioned
effect-checked
token-boundary checked
vault-limited
audited
reportable
```

Generic vault access through MCP is denied. Any future MCP runtime support
should produce MCP tool, resource exposure, effective permission and token
boundary reports before promotion into trusted agent workflows.

## AI Self-Modification Governance

AI agents may generate code, propose policy, request capabilities and produce
reports. They must not grant capabilities to themselves, approve their own
policy changes, edit their own execution boundary or modify trust roots without
external governance.

AI-authored code should enter quarantine before promotion:

```text
AI writes code
 -> quarantine
 -> syntax/type checks
 -> effect extraction
 -> policy evaluation
 -> sandbox tests
 -> audit report
 -> human/policy approval
 -> promotion
```

Agent authority should be issued as a revocable lease:

```text
capability
scope
duration
approver chain
audit required
```

Delegation must use capability attenuation: an agent may delegate only equal or
narrower authority than it already holds. No agent should have a `god mode`
role, and no process may grant itself broader authority than its approver chain
possesses.

The AI core and authority kernel are separate responsibilities. Agents may
reason, plan, generate code, analyse output and request authority. They must not
issue their own authority, edit their own boundary, approve their own policy
change or modify compiler, security, audit, capability-checker, package-signing
or cryptographic trust roots.

Read and write authority must be separate. File reads, file writes, package
installs, shell/tool calls, tests, migrations, deployment and policy edits are
different capabilities.

Reports should include AI authority requests, code quarantine status, approval
decisions, changed files, tests run, granted capabilities and lease expiry.

See `../../docs/Knowledge-Bases/ai-self-modification-governance.md`.

Final rule:

```text
logicn-ai-agent owns agent contracts.
logicn-core-runtime owns execution supervision.
logicn-core-compute owns heavy compute planning.
logicn-core-security owns permission and safety policy.
```
