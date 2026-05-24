# LogicN CLI: deploy, explain, plan

## Definition

The LogicN CLI is not just a build tool — it is a runtime governance surface.

The three governance-oriented commands are:

```text
logicn deploy    — validate and deploy to a target environment
logicn explain   — explain what code does and why decisions were made
logicn plan      — estimate how runtime execution should be coordinated
```

These commands act as a bridge between compiler output, runtime manifests,
deployment policy, and audit evidence. They work even before advanced GPU or
photonic runtimes exist.

See also: `build-system-and-cli.md` for the full build and deployment model.

---

## CLI Design Principles

The CLI should be:

```text
explainable          — always says why
machine-readable     — --json output always available
human-readable       — default terminal output is clear
safe by default      — deployment denied unless explicitly approved
policy-aware         — reads runtime policy before acting
runtime-aware        — understands compute targets
AI-readable          — structured outputs for AI tooling
CI-friendly          — deterministic exit codes
```

The CLI must avoid:

```text
silent deployment
hidden runtime decisions
unclear failures
implicit target switching
unsafe defaults
```

---

## Shared Exit Codes

| Exit Code | Meaning |
| --- | --- |
| `0` | success |
| `1` | compiler failure |
| `2` | policy denial |
| `3` | runtime incompatibility |
| `4` | deployment validation failure |
| `5` | capability resolution failure |
| `6` | compute planning failure |
| `7` | manifest integrity failure |

## Shared Output Modes

| Mode | Purpose |
| --- | --- |
| human | readable terminal output (default) |
| json | machine-readable integration |
| report | structured audit report file |
| ci | deterministic CI/CD output |
| silent | scripting (exit codes only) |

Example:

```bash
logicn deploy production --json
```

## Shared Inputs

All three commands understand:

```text
workspace manifest
package manifests
runtime manifest
compiler reports
capability graph
effect graph
deployment policy
runtime profiles
compute planner metadata
```

---

## logicn deploy

### Purpose

`logicn deploy` validates whether a LogicN application is allowed to execute
in a specific environment. It is not only a file copy operation — it performs
governance validation before runtime execution.

### Responsibilities

```text
validate compiler output
validate runtime manifest
validate package graph
validate effects
validate capabilities
validate runtime target compatibility
validate deployment policy
validate secrets policy
validate module integrity hashes
validate runtime profile compatibility
produce deployment report
```

### Example Command

```bash
logicn deploy production
logicn deploy production --report --audit
logicn deploy staging --dry-run --json
```

### Deploy Flow

```text
Load workspace manifest
Load runtime profile
Load deployment policy
Load runtime manifest
Validate package graph
Validate effects
Validate capabilities
Validate runtime target support
Validate hashes
Generate deployment report
Deploy if approved
```

### Successful Output (human)

```text
LogicN Deploy

Profile: production
Workspace: app-main

Validating package graph...
Validating runtime manifest...
Validating capabilities...
Validating deployment policy...
Validating effects...
Validating runtime targets...

Deployment approved.

Target runtime: cpu
Approved effects: storage, network
Deployment hash: sha256:deployment-example
```

### Successful Output (JSON)

```json
{
  "status": "approved",
  "profile": "production",
  "runtimeTargets": ["cpu"],
  "effects": ["storage", "network"],
  "deploymentHash": "sha256:deployment-example"
}
```

### Denied Deployment (human)

```text
Deployment denied.

Reason:
network effect denied by production policy

Module: app/debug/debug-client
Function: ping_debug_server
```

### Denied Deployment (JSON)

```json
{
  "status": "denied",
  "reason": "effect denied by policy",
  "effect": "network",
  "module": "app/debug/debug-client",
  "function": "ping_debug_server",
  "profile": "production"
}
```

### Deployment Policy Example

```json
{
  "allowEffects": ["storage", "network"],
  "denyModules": ["app/debug/*"],
  "allowTargets": ["cpu"],
  "denyCapabilities": ["Shell"]
}
```

### Deployment Validation Rules

Deployment is denied if:

```text
compiler errors exist
runtime manifest is missing
module hashes do not match
undeclared effects exist
policy denies an effect
policy denies a capability
runtime target is unsupported
required secrets are missing
module graph is invalid
```

### Runtime Compatibility Check

```logicn
fn train_model(batch: TensorBatch) effect accelerator {
    runtime.accelerator.run(batch)
}
```

If deployment profile only allows CPU:

```json
{ "allowTargets": ["cpu"] }
```

Result:

```text
Deployment denied.
Reason: accelerator target required but unavailable in deployment profile
```

### Deploy Flags

| Flag | Purpose |
| --- | --- |
| `--json` | machine-readable output |
| `--report` | generate deployment report |
| `--dry-run` | validate without deploying |
| `--strict` | fail on warnings |
| `--profile` | specify runtime profile |
| `--policy` | specify deployment policy |
| `--target` | force runtime target |
| `--audit` | generate audit evidence |

### Deployment Report Schema

```json
{
  "deployment": {
    "status": "approved",
    "profile": "production",
    "workspace": "app-main"
  },
  "runtime": {
    "targets": ["cpu"],
    "capabilities": ["Database", "HttpClient"]
  },
  "effects": ["storage", "network"],
  "integrity": {
    "manifestHash": "sha256:manifest",
    "moduleGraphHash": "sha256:graph"
  }
}
```

---

## logicn explain

### Purpose

`logicn explain` provides human-readable reasoning about LogicN code,
runtime planning and governance decisions. It is intended for developers,
security auditors, runtime operators, CI systems, and AI tooling.

### Responsibilities

The explain command describes:

```text
imports
capabilities
effects
runtime targets
policy decisions
module relationships
why deployment was denied
why a backend was selected
runtime dependency graph
execution trace
```

### Example Commands

```bash
logicn explain app/users/service
logicn explain app/users/routes --tree
logicn explain app/ai/inference
logicn explain deployment-denial.json
logicn explain app/users/service --trace
```

### Example Human Output (module)

```text
Module: app/users/service

Imports:
- app/users/types
- app/users/repository
- logicn-core-data/database

Capabilities:
- Database

Effects:
- storage

Public API:
- get_profile

Reasoning:
The module imports Database capability.
The module calls find_user_record.
find_user_record performs storage access.
The storage effect propagates into get_profile.
```

### Example JSON Output (module)

```json
{
  "module": "app/users/service",
  "imports": [
    "app/users/types",
    "app/users/repository",
    "logicn-core-data/database"
  ],
  "capabilities": ["Database"],
  "effects": ["storage"],
  "publicApi": ["get_profile"]
}
```

### Denial Explanation

```bash
logicn explain deployment-denial.json
```

Output:

```text
Deployment denied because:

Module app/debug/debug-client
requires effect network.

Production policy denies:
- app/debug/*
- effect network
```

### Dependency Tree (--tree)

```bash
logicn explain app/users/routes --tree
```

Output:

```text
app/users/routes
 ├── app/users/service
 │    ├── app/users/repository
 │    │    └── logicn-core-data/database
 │    └── app/users/types
 └── logicn-core-network/http
```

### Runtime Target Explanation

```bash
logicn explain app/ai/inference
```

Output:

```text
Recommended runtime target: gpu

Reasoning:
- large tensor operations
- high parallelism
- accelerator-compatible workload

Fallback target: cpu
```

### Trace Output (--trace)

```bash
logicn explain app/users/service --trace
```

Output:

```text
Trace:

get_profile
  → find_user_record
      → Database.find_one
          → requires effect storage
              → requires capability Database
```

### Explain Use Cases

| Use Case | Example |
| --- | --- |
| understand effects | why does this module require network? |
| understand denial | why was deployment blocked? |
| understand imports | where did this type come from? |
| understand runtime planning | why was GPU selected? |
| understand package graph | which module depends on this? |
| understand capability use | why does this route require Database? |

### Explain Flags

| Flag | Purpose |
| --- | --- |
| `--json` | JSON output |
| `--tree` | dependency graph |
| `--effects` | show effects only |
| `--capabilities` | show capabilities only |
| `--runtime` | show runtime planning |
| `--policy` | show policy evaluation |
| `--audit` | show audit evidence |
| `--trace` | show reasoning trace |

---

## logicn plan

### Purpose

`logicn plan` estimates and explains how LogicN runtime execution should be
coordinated. It is a planning and governance command — it does not necessarily
execute code. The planner produces recommendations; the runtime decides final
execution.

### Responsibilities

The planner estimates:

```text
CPU suitability
GPU suitability
accelerator suitability
parallelism opportunities
memory pressure
cache reuse opportunities
runtime queue pressure
energy usage
fallback behaviour
```

### Example Commands

```bash
logicn plan app/ai/inference
logicn plan app/users/service
logicn plan app/ai/inference --graph
logicn plan app/ai/inference --json --memory --parallelism
```

### GPU Plan Example (human)

```text
Execution Plan

Module: app/ai/inference

Recommended target: gpu
Fallback target: cpu

Reasoning:
- large tensor operations
- highly parallel workload
- accelerator-compatible execution

Estimated memory pressure: high
Estimated parallelism: high
```

### GPU Plan Example (JSON)

```json
{
  "module": "app/ai/inference",
  "recommendedTarget": "gpu",
  "fallbackTarget": "cpu",
  "parallelism": "high",
  "memoryPressure": "high",
  "reasoning": [
    "large tensor operations",
    "parallel workload"
  ]
}
```

### CPU Plan Example

```text
Execution Plan

Recommended target: cpu

Reasoning:
- low computational intensity
- storage-bound workload
- minimal parallel gain from accelerator
```

### Optical/Distributed Plan Example

```text
Recommended transport: optical_io

Reasoning:
- high bandwidth requirement
- distributed accelerator coordination
- large tensor movement
```

### Execution Graph (--graph)

```bash
logicn plan app/ai/inference --graph
```

Output:

```text
input
  ↓
preprocess
  ↓
parallel tensor stage
  ├── gpu kernel 1
  ├── gpu kernel 2
  └── gpu kernel 3
  ↓
merge results
  ↓
output
```

### Planner Inputs

```text
compiler reports
runtime manifests
effect graph
function graph
loop structure
async structure
parallel opportunities
memory estimates
runtime target support
policy constraints
```

### Planner Rules

The planner must not:

```text
bypass runtime policy
force unsafe targets
silently downgrade security
assume unavailable hardware
```

### Planner and Runtime Relationship

```text
Planner recommends GPU.
Runtime detects GPU overheating.
Runtime safely falls back to CPU.
Fallback recorded in audit log.
```

Runtime override audit record:

```json
{
  "plannedTarget": "gpu",
  "actualTarget": "cpu",
  "reason": "gpu thermal pressure"
}
```

### Plan Flags

| Flag | Purpose |
| --- | --- |
| `--json` | JSON output |
| `--runtime` | include runtime reasoning |
| `--memory` | include memory estimates |
| `--parallelism` | show parallel planning |
| `--energy` | estimate energy cost |
| `--target` | force planning target |
| `--graph` | show execution graph |

---

## Shared Runtime Integration

### Runtime Manifest Relationship

All three commands rely on compiler-produced manifests:

```json
{
  "module": "app/users/service",
  "effects": ["storage"],
  "capabilities": ["Database"],
  "targets": ["cpu"],
  "hash": "sha256:module"
}
```

### Command / Runtime Relationship

| Command | Runtime Relationship |
| --- | --- |
| deploy | validates runtime compatibility |
| explain | explains runtime decisions |
| plan | estimates runtime execution |

---

## CLI Report Files

| File | Purpose |
| --- | --- |
| `deployment-report.json` | deployment validation evidence |
| `explain-report.json` | reasoning graph |
| `compute-plan.json` | execution planning output |
| `runtime-manifest.json` | runtime metadata |
| `capability-report.json` | capability graph |
| `effect-report.json` | effect graph |
| `denial-report.json` | blocked execution details |

---

## AI Tooling Integration

The CLI produces stable structured outputs for AI tooling:

```text
stable diagnostics
structured JSON
machine-readable reasoning
module graphs
runtime graphs
explanation traces
```

AI tools must not need to infer hidden runtime behaviour.

---

## v0.1 Scope

Implement first:

```text
logicn deploy
  - manifest validation
  - policy validation
  - effect validation
  - capability validation
  - runtime target validation

logicn explain
  - imports
  - effects
  - capabilities
  - dependency tree
  - denial reasoning

logicn plan
  - cpu/gpu recommendation
  - memory estimation
  - parallelism estimation
  - fallback planning
```

Defer:

```text
real photonic execution
real accelerator scheduling
energy optimisation engine
live cluster orchestration
formal planner proof system
```

---

## Relationship to Other Systems

```text
logicn deploy  → reads runtime manifest, deployment policy, compiler output
logicn explain → reads compiler reports, effect graph, capability graph
logicn plan    → reads compiler hints, runtime profiles, capability system
All three      → feed into audit log and execution proof
All three      → work with AI tooling via structured JSON
```

See also: `build-system-and-cli.md`, `runtime-audit-log-format.md`,
`effect-checker-and-boundary-checker.md`, `package-completion-status.md`.
