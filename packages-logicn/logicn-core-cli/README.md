# LogicN CLI

`logicn-core-cli` is the command-line interface for LogicN developers.

It belongs in:

```text
/packages-logicn/logicn-core-cli
```

It coordinates other LogicN packages instead of owning language, runtime, server or
application behaviour.

## Responsibilities

```text
read project configuration
load environment mode
call the compiler
call the runtime
start server tools
run task tools
print safe output
generate reports
show diagnostics
generate project graphs
```

## Command Status

### Implemented (Prototype)

```text
logicn check             — validate source without producing artefacts
logicn build             — compile and produce artefacts (partial)
logicn run               — run compiled output
logicn serve             — start server
logicn reports           — generate reports
logicn security:check    — run security scan
logicn routes            — list route table
logicn benchmark         — placeholder command
logicn task              — run project automation tasks
logicn graph             — generate project dependency graph
logicn graph query       — query generated graph
logicn graph explain     — explain graph node
logicn graph path        — show path between nodes
logicn fmt               — format source files
```

### Planned / Not Yet Implemented

```text
logicn deploy            — deploy verified build to target environment
logicn explain           — explain build decisions, authority model, effects
logicn plan              — preview deployment actions without applying changes
logicn verify deploy     — verify running version against build manifest
logicn promote           — promote artifact from one environment to another
logicn rollback          — rollback to previous deployment
```

`logicn deploy` validates the runtime manifest, effects, capabilities, policy,
target compatibility, and module hashes before deploying. Exit codes: `0`
success, `2` policy denial, `3` runtime incompatibility, `4` deployment
validation failure, `5` capability resolution failure, `7` manifest integrity
failure. Flags: `--dry-run`, `--json`, `--report`, `--audit`, `--strict`,
`--profile`, `--policy`, `--target`. Produces `deployment-report.json`.

`logicn explain` explains compiler decisions, runtime authority, effect
declarations, boundary violations, and why deployment was denied.
Flags: `--tree` (dependency graph), `--trace` (execution reasoning chain),
`--effects`, `--capabilities`, `--runtime`, `--policy`, `--audit`, `--json`.

`logicn plan` estimates how execution will be coordinated — CPU/GPU suitability,
memory pressure, parallelism, and fallback options. The planner recommends;
the runtime decides final execution.
Flags: `--json`, `--runtime`, `--memory`, `--parallelism`, `--energy`,
`--target`, `--graph`. Produces `compute-plan.json`.

See `docs/Knowledge-Bases/logicn-core-cli-deploy-explain-plan.md` for the
full specification including all examples, exit codes, output modes, and
report file definitions.

`LogicN benchmark` is currently a placeholder command. The benchmark contracts,
recommended modes and report shape live in `packages-logicn/logicn-tools-benchmark/README.md`.

## Graph Command

`LogicN graph` reads `logicn.workspace.json` and writes a local project graph summary.
The query commands read generated graph JSON.

From the repository root, run the current local CLI build with:

```text
node packages-logicn\logicn-core-cli\dist\index.js graph --out build\graph
```

The shorter `LogicN graph --out build\graph` form is the intended command once the
CLI is installed or linked.

Default outputs:

```text
build/graph/logicn-devtools-project-graph.json
build/graph/LogicN_GRAPH_REPORT.md
build/graph/logicn-ai-map.md
build/graph/logicn-devtools-project-graph.html
```

Use `--out <dir>` to choose a different output directory.

Examples:

```text
node packages-logicn\logicn-core-cli\dist\index.js graph query logicn-core-security --out build\graph
node packages-logicn\logicn-core-cli\dist\index.js graph explain package:logicn-core-security --out build\graph
node packages-logicn\logicn-core-cli\dist\index.js graph path package:logicn-devtools-project-graph report:project-graph --out build\graph

LogicN graph query logicn-core-security
LogicN graph explain package:logicn-core-security
LogicN graph path package:logicn-devtools-project-graph report:project-graph
```

## Task Command

`LogicN task` loads safe project automation from `tasks.lln` in the repository root,
or from a file passed with `--file`.

Examples:

```text
LogicN task
LogicN task buildApi --dry-run
LogicN task generateReports --file packages-logicn/logicn-core-tasks/examples/tasks.lln --dry-run
LogicN task buildApi --report-out build/reports/task-report.json
```

Current task execution supports loading task definitions, listing tasks,
resolving dependency order, rejecting missing or circular dependencies and
running dry-run plans. Task runs write a structured report to
`build/reports/task-report.json` by default. Use `--report-out <path>` to choose
a different path, or `--no-report` to skip writing the report. Built-in
operation execution remains in `logicn-core-tasks`.

## Security Rules

CLI output is safe by default. It must redact `SecureString` values, bearer
tokens, API keys, cookies, database passwords and private key material.

Production mode is strict and should fail when critical unsafe features are
enabled without explicit reason.

## Non-Goals

`logicn-core-cli` must not contain business logic, routing logic, authentication logic,
ORM logic, template rendering, CMS features, admin UI or frontend framework
behaviour.
