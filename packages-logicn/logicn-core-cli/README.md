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

`logicn build` compiles source into governed runtime artefacts through a
14-pass pipeline. Flags: `--target`, `--json`, `--report`, `--strict`,
`--profile`, `--out`, `--audit`. Produces `runtime-manifest.json`,
`compiler-report.json`, `effect-report.json`, `capability-report.json`,
`audit-report.json`, `build-hash.txt`. Diagnostic codes: `LLN-BUILD-001`
through `LLN-BUILD-005`. Status: partial implementation.

`logicn verify` validates compiler and runtime artefact integrity.
Flags: `--json`, `--strict`, `--manifest`, `--hash`, `--policy`, `--audit`.
Produces verification status with `manifestHash` and `graphHash`.
Diagnostic codes: `LLN-VERIFY-001` through `LLN-VERIFY-005`.
Status: partial — hash checks only.

`logicn deploy` validates the runtime manifest, effects, capabilities, policy,
target compatibility, and module hashes before deploying. Exit codes: `0`
success, `2` policy denial, `3` runtime incompatibility, `4` deployment
validation failure, `5` capability resolution failure, `7` manifest integrity
failure. Flags: `--dry-run`, `--json`, `--report`, `--audit`, `--strict`,
`--profile`, `--policy`, `--target`. Produces `deployment-report.json`.
Diagnostic codes: `LLN-DEPLOY-001` through `LLN-DEPLOY-005`.

`logicn explain` explains compiler decisions, runtime authority, effect
declarations, boundary violations, and why deployment was denied.
Flags: `--tree` (dependency graph), `--trace` (execution reasoning chain),
`--effects`, `--capabilities`, `--runtime`, `--policy`, `--audit`, `--json`.
Diagnostic codes: `LLN-EXPLAIN-001` through `LLN-EXPLAIN-004`.

`logicn plan` estimates how execution will be coordinated — CPU/GPU suitability,
memory pressure, parallelism, and fallback options. The planner recommends;
the runtime decides final execution.
Flags: `--json`, `--runtime`, `--memory`, `--parallelism`, `--energy`,
`--target`, `--graph`, `--compatibility`. Produces `compute-plan.json`.
Diagnostic codes: `LLN-PLAN-001` through `LLN-PLAN-004`.

Implementation order: Phase 1 build → Phase 2 verify → Phase 3 explain →
Phase 4 deploy → Phase 5 plan.

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

## Architecture Depth: TypeScript Contracts (v0.2 Specification)

### Core Result Types

```ts
export interface CliCommandResult {
    success: boolean
    diagnostics: CompilerDiagnostic[]
    reportPath?: string
    exitCode: number
}

export interface CompilerDiagnostic {
    code: string
    message: string
    severity: "error" | "warning" | "info"
    file?: string
    line?: number
}

export interface Workspace {
    root: string
    packages: string[]
    entryPoints: string[]
    config: WorkspaceConfig
}
```

### Build Contracts

```ts
export interface BuildArtefact {
    path: string
    kind: "manifest" | "bundle" | "report" | "hash" | "map"
    hash: string
    target: RuntimeTarget
}

export interface BuildResult {
    success: boolean
    artefacts: BuildArtefact[]
    diagnostics: CompilerDiagnostic[]
    manifestPath: string
    duration: number
}

export interface BuildWorkspaceInput {
    workspace: Workspace
    target: RuntimeTarget
    strict: boolean
    profile?: string
    outDir: string
}

export async function buildWorkspace(
    input: BuildWorkspaceInput
): Promise<BuildResult>
// Pass 1:  Lexer
// Pass 2:  Parser
// Pass 3:  AST builder
// Pass 4:  Type checker
// Pass 5:  Visibility checker
// Pass 6:  Effect checker
// Pass 7:  Boundary checker
// Pass 8:  Capability resolver
// Pass 9:  Package graph validator
// Pass 10: Runtime graph generator
// Pass 11: Optimisation planner
// Pass 12: Backend emitter
// Pass 13: Audit metadata emitter
// Pass 14: Runtime manifest generator
```

### Verify Contracts

```ts
export interface VerifiedArtefact {
    path: string
    hash: string
    verified: boolean
    diagnostics: CompilerDiagnostic[]
}

export interface VerificationResult {
    success: boolean
    artefacts: VerifiedArtefact[]
    diagnostics: CompilerDiagnostic[]
}

export async function verifyHash(
    artefact: BuildArtefact,
    expected: string
): Promise<VerifiedArtefact>
```

### Deploy Contracts

```ts
export type DeploymentTarget =
    | "node"
    | "wasm"
    | "native"
    | "serverless"
    | "edge"
    | "gpu"
    | "photonic"

export interface DeploymentResult {
    success: boolean
    target: DeploymentTarget
    manifestHash: string
    diagnostics: CompilerDiagnostic[]
    reportPath?: string
}
```

### Effect Validation

```ts
export interface ValidateEffectsInput {
    manifest: RuntimeManifest
    policy: EffectsPolicy
    target: DeploymentTarget
}

export function validateEffects(
    input: ValidateEffectsInput
): CompilerDiagnostic[]
// For each function in manifest.functions:
//   effectiveEffects = declaredEffects ∪ inferredEffects
//   check each effect against policy.allowedEffects
//   check capabilities present for each effect
//   emit LLN-EFFECT-001 through LLN-EFFECT-004 as needed
```

### Explain Contracts

```ts
export interface ExplainTrace {
    step: number
    label: string
    input: string
    output: string
    diagnostics: CompilerDiagnostic[]
}

export interface ExplainResult {
    traces: ExplainTrace[]
    effects: string[]
    capabilities: string[]
    boundaries: string[]
    diagnostics: CompilerDiagnostic[]
}

export function buildTrace(
    manifest: RuntimeManifest,
    options: ExplainOptions
): ExplainTrace[]
```

### Compute Plan Contracts

```ts
export interface ComputePlan {
    target: RuntimeTarget
    gpu: GpuPlan
    optical: OpticalPlan
    wasm: WasmTarget | null
    compatibility: CompatibilityReport
    estimatedMemoryMb: number
    parallelism: number
    diagnostics: CompilerDiagnostic[]
}

export function estimateTarget(
    workspace: Workspace,
    options: PlanOptions
): ComputePlan
```

### Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | success |
| `1` | general error |
| `2` | policy denial |
| `3` | runtime incompatibility |
| `4` | deployment validation failure |
| `5` | capability resolution failure |
| `6` | verification failure |
| `7` | manifest integrity failure |

### CLI Report Files

| File | Command | Description |
| --- | --- | --- |
| `runtime-manifest.json` | build | Full v0.2 runtime manifest |
| `compiler-report.json` | build | All compiler diagnostics |
| `effect-report.json` | build | Effect graph and decisions |
| `capability-report.json` | build | Capability resolution log |
| `audit-report.json` | build | Audit metadata |
| `build-hash.txt` | build | Artefact hashes |
| `verification-report.json` | verify | Hash verification results |
| `deployment-report.json` | deploy | Deploy decisions and policy log |
| `explain-report.json` | explain | Execution reasoning traces |
| `compute-plan.json` | plan | GPU/WASM/optical suitability |

### CLI Directory Layout

```text
packages-logicn/logicn-core-cli/src/
  commands/
    build.ts
    verify.ts
    deploy.ts
    explain.ts
    plan.ts
    check.ts
    serve.ts
    routes.ts
    graph.ts
    task.ts
    fmt.ts
    security-check.ts
    reports.ts
  contracts/
    build-contracts.ts
    verify-contracts.ts
    deploy-contracts.ts
    explain-contracts.ts
    plan-contracts.ts
  output/
    safe-output.ts       ← redact SecureString, tokens
    json-output.ts
  index.ts
```

## Security Rules

CLI output is safe by default. It must redact `SecureString` values, bearer
tokens, API keys, cookies, database passwords and private key material.

Production mode is strict and should fail when critical unsafe features are
enabled without explicit reason.

## Non-Goals

`logicn-core-cli` must not contain business logic, routing logic, authentication logic,
ORM logic, template rendering, CMS features, admin UI or frontend framework
behaviour.
