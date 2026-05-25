# LogicN CLI: build, verify, deploy, explain, plan

## Definition

The LogicN CLI is not just a build tool — it is a runtime governance surface.

The five governance-oriented commands are:

```text
logicn build     — compile source into governed runtime artefacts
logicn verify    — validate compiler and runtime artefact integrity
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

## Governance Position

The CLI sits between compiler validation and runtime execution:

```text
Compiler
    ↓
Runtime Manifest
    ↓
logicn build / verify / deploy / explain / plan
    ↓
Runtime Governance
    ↓
Execution
    ↓
Audit Evidence
```

This allows LogicN to validate and explain runtime authority before work
executes. All three commands feed audit logging and execution proof.

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

All governance commands understand:

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

## logicn build

### Purpose

`logicn build` transforms LogicN source into governed runtime artefacts.

Unlike traditional build systems, LogicN build also generates:

```text
runtime metadata
capability graphs
effect graphs
audit metadata
runtime manifests
deployment metadata
```

### Status

```text
Partial implementation.
Artefact generation incomplete.
```

### Build Pipeline

```text
Source
    ↓
Lexer
    ↓
Parser
    ↓
AST
    ↓
Type checker
    ↓
Effect checker
    ↓
Boundary checker
    ↓
Capability resolver
    ↓
Runtime graph builder
    ↓
Manifest generator
    ↓
Backend emitter
    ↓
Build artefacts
```

### Example Commands

```bash
logicn build
logicn build --target cpu
logicn build --strict
```

### Build Flags

| Flag | Purpose |
| --- | --- |
| `--target` | runtime target |
| `--json` | machine-readable output |
| `--report` | generate build report |
| `--strict` | fail on warnings |
| `--profile` | runtime profile |
| `--out` | output directory |
| `--audit` | emit audit metadata |

### Build Output (human)

```text
LogicN Build

Parsing modules...
Running type checker...
Running effect checker...
Running boundary checker...
Generating runtime manifest...
Generating build artefacts...

Build successful.
```

### Build Output (JSON)

```json
{
  "status": "success",
  "modules": 14,
  "effects": ["storage", "network"],
  "targets": ["cpu"],
  "manifest": "runtime-manifest.json"
}
```

### Build Artefacts

| Artefact | Purpose |
| --- | --- |
| `runtime-manifest.json` | runtime governance |
| `compiler-report.json` | compiler metadata |
| `effect-report.json` | effect graph |
| `capability-report.json` | capability graph |
| `audit-report.json` | audit metadata |
| `build-hash.txt` | integrity validation |

### Internal Structure

```text
packages-logicn/logicn-core-cli/src/build/
```

Suggested files:

```text
build-command.ts
build-pipeline.ts
build-reporter.ts
build-artifacts.ts
build-integrity.ts
```

### Build Types

```ts
export interface BuildResult {
    success: boolean
    modules: number
    effects: string[]
    targets: string[]
    artifacts: string[]
}
```

### Build Pipeline Function

```ts
async function buildWorkspace(): Promise<BuildResult> {
    await parseWorkspace()
    await runTypeChecker()
    await runEffectChecker()
    await generateManifest()

    return {
        success: true,
        modules: 14,
        effects: ["network"],
        targets: ["cpu"],
        artifacts: ["runtime-manifest.json"]
    }
}
```

### Diagnostic Codes (LN-BUILD series)

| Code | Meaning |
| --- | --- |
| `LN-BUILD-001` | build pipeline failure |
| `LN-BUILD-002` | artefact generation failure |
| `LN-BUILD-003` | runtime target unsupported |
| `LN-BUILD-004` | manifest generation failed |
| `LN-BUILD-005` | audit metadata missing |

---

## logicn verify

### Purpose

`logicn verify` validates that compiler and runtime artefacts are trusted,
consistent and untampered.

### Status

```text
Partial implementation.
Hash verification only.
```

### What Verify Validates

Eventually validates:

```text
manifest integrity
build integrity
runtime compatibility
effect consistency
capability consistency
deployment safety
audit consistency
```

### Example Commands

```bash
logicn verify
logicn verify runtime-manifest.json
logicn verify --json
```

### Verify Flags

| Flag | Purpose |
| --- | --- |
| `--json` | machine-readable output |
| `--strict` | fail on warnings |
| `--manifest` | specify manifest |
| `--hash` | verify integrity hashes |
| `--policy` | validate deployment policy |
| `--audit` | verify audit reports |

### Verify Output (human)

```text
LogicN Verify

Checking manifest integrity...
Checking graph hashes...
Checking runtime compatibility...

Verification successful.
```

### Verify Output (JSON)

```json
{
  "status": "verified",
  "manifestHash": "sha256:manifest",
  "graphHash": "sha256:graph"
}
```

### Integrity Failure Output

```text
Verification failed.

Reason:
manifest hash mismatch
```

### Internal Structure

```text
packages-logicn/logicn-core-cli/src/verify/
```

Suggested files:

```text
verify-command.ts
verify-manifest.ts
verify-integrity.ts
verify-runtime.ts
verify-reporter.ts
```

### Verify Types

```ts
export interface VerificationResult {
    valid: boolean
    manifestHash: string
    graphHash: string
}
```

### Integrity Check Function

```ts
function verifyHash(
    observed: string,
    expected: string
): boolean {
    return observed === expected
}
```

### Diagnostic Codes (LN-VERIFY series)

| Code | Meaning |
| --- | --- |
| `LN-VERIFY-001` | manifest missing |
| `LN-VERIFY-002` | integrity hash mismatch |
| `LN-VERIFY-003` | runtime mismatch |
| `LN-VERIFY-004` | capability inconsistency |
| `LN-VERIFY-005` | audit validation failed |

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
logicn deploy production --strict
```

### Deployment Validation Responsibilities

**Compiler integrity:**
```text
compiler completed successfully
required reports exist
no unresolved diagnostics
```

**Runtime manifest integrity:**
```text
runtime-manifest.json exists
manifest hashes are valid
manifest structure is complete
```

**Capability governance:**
```text
all required capabilities declared
deployment policy allows capabilities
no restricted capability inheritance
```

**Effect governance:**
```text
all effects declared
effects allowed by policy
runtime supports required effects
```

**Runtime compatibility:**
```text
required targets exist
runtime profile supports workload
fallback targets available
```

**Security policy:**
```text
required secrets exist
deployment policy approved
restricted modules denied
integrity hashes validated
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

### Internal Structure

```text
packages-logicn/logicn-core-cli/src/deploy/
```

Suggested files:

```text
deploy-command.ts
deploy-policy.ts
deploy-validator.ts
deploy-report.ts
deploy-runtime.ts
```

### Deploy Types

```ts
export interface DeploymentResult {
    approved: boolean
    profile: string
    targets: string[]
    effects: string[]
}
```

### Policy Validation Function

```ts
function validateEffects(
    effects: string[],
    policy: DeploymentPolicy
): boolean {
    return effects.every(
        effect => policy.allowedEffects.includes(effect)
    )
}
```

### Diagnostic Codes (LN-DEPLOY series)

| Code | Meaning |
| --- | --- |
| `LN-DEPLOY-001` | deployment denied |
| `LN-DEPLOY-002` | runtime target unavailable |
| `LN-DEPLOY-003` | capability denied |
| `LN-DEPLOY-004` | effect denied by policy |
| `LN-DEPLOY-005` | manifest integrity failure |

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

### Internal Structure

```text
packages-logicn/logicn-core-cli/src/explain/
```

Suggested files:

```text
explain-command.ts
explain-trace.ts
explain-tree.ts
explain-runtime.ts
explain-reporter.ts
```

### Explain Types

```ts
export interface ExplainResult {
    module: string
    effects: string[]
    capabilities: string[]
}
```

### Trace Builder Function

```ts
function buildTrace(
    fn: FunctionGraph
): string[] {
    return fn.calls.map(call => call.name)
}
```

### Diagnostic Codes (LN-EXPLAIN series)

| Code | Meaning |
| --- | --- |
| `LN-EXPLAIN-001` | module not found |
| `LN-EXPLAIN-002` | dependency graph incomplete |
| `LN-EXPLAIN-003` | trace generation failed |
| `LN-EXPLAIN-004` | runtime reasoning unavailable |

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
| `--compatibility` | target compatibility report |

### Internal Structure

```text
packages-logicn/logicn-core-cli/src/plan/
```

Suggested files:

```text
plan-command.ts
plan-graph.ts
plan-runtime.ts
plan-memory.ts
plan-reporter.ts
```

### Plan Types

```ts
export interface ComputePlan {
    module: string
    recommendedTarget: string
    fallbackTarget: string
    parallelism: string
    memoryPressure: string
}
```

### Planner Function

```ts
function estimateTarget(
    graph: ExecutionGraph
): string {
    if (graph.parallelism === "high") {
        return "gpu"
    }

    return "cpu"
}
```

### Diagnostic Codes (LN-PLAN series)

| Code | Meaning |
| --- | --- |
| `LN-PLAN-001` | compute planning failed |
| `LN-PLAN-002` | runtime target unavailable |
| `LN-PLAN-003` | graph generation failed |
| `LN-PLAN-004` | memory estimation unavailable |

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
| build | produces governed runtime artefacts |
| verify | validates artefact integrity |
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

## Implementation Order

### Phase 1: Build

```text
logicn build
basic artefact generation
runtime manifest emission
```

### Phase 2: Verify

```text
logicn verify
integrity validation
manifest validation
```

### Phase 3: Explain

```text
logicn explain
dependency graphs
reasoning traces
```

### Phase 4: Deploy

```text
logicn deploy
deployment governance
policy validation
```

### Phase 5: Plan

```text
logicn plan
compute estimation
runtime planning
```

---

## v0.1 Scope

Implement first:

```text
logicn build
  - basic build pipeline
  - runtime manifest emission
  - effect and capability reports
  - build-hash.txt generation

logicn verify
  - manifest hash validation
  - basic integrity checks

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

## Architecture Depth: TypeScript Contracts (v0.2 Specification)

### CliCommandResult

```ts
export interface CliCommandResult {
  success: boolean
  command: string
  startedAt: string
  completedAt: string
  durationMs: number
  diagnostics: CompilerDiagnostic[]
  reports: string[]
  exitCode: number
}
```

### CompilerDiagnostic

```ts
export interface CompilerDiagnostic {
  code: string
  severity: "info" | "warning" | "error"
  message: string
  sourceLocation?: SourceLocation
  suggestion?: string
}
```

### Workspace

```ts
export interface Workspace {
  rootPath: string
  packages: WorkspacePackage[]
  configuration: WorkspaceConfig
  targets: RuntimeTarget[]
}
```

### BuildResult (Extended)

```ts
export interface BuildResult {
  success: boolean
  workspace: Workspace
  buildId: string
  target: RuntimeTarget
  artefacts: BuildArtefact[]
  manifests: string[]
  reports: string[]
  diagnostics: CompilerDiagnostic[]
  effectSummary: EffectSummary
  boundarySummary: BoundarySummary
  durationMs: number
}
```

### BuildArtefact

```ts
export interface BuildArtefact {
  id: string
  type:
    | "runtime"
    | "manifest"
    | "report"
    | "binary"
    | "bytecode"
    | "cache"
    | "source-map"
  path: string
  hash: string
  sizeBytes: number
  generatedAt: string
}
```

### BuildWorkspaceInput

```ts
export interface BuildWorkspaceInput {
  workspacePath: string
  target: RuntimeTarget
  release: boolean
  emitReports: boolean
  emitManifests: boolean
  verify: boolean
}
```

### buildWorkspace() — 14-Pass Pipeline

```ts
export async function buildWorkspace(
  input: BuildWorkspaceInput
): Promise<BuildResult> {
  // Pass 1:  Workspace discovery
  // Pass 2:  Config resolution
  // Pass 3:  Source loading
  // Pass 4:  Parsing
  // Pass 5:  AST validation
  // Pass 6:  Type checking
  // Pass 7:  Effect inference
  // Pass 8:  Effect propagation
  // Pass 9:  Boundary checking
  // Pass 10: Runtime planning
  // Pass 11: Manifest generation
  // Pass 12: Report generation
  // Pass 13: Artefact emission
  // Pass 14: Verification / finalisation
  ...
}
```

### VerificationResult (Extended)

```ts
export interface VerificationResult {
  success: boolean
  verifiedArtefacts: VerifiedArtefact[]
  diagnostics: CompilerDiagnostic[]
  reports: string[]
  durationMs: number
}

export interface VerifiedArtefact {
  path: string
  expectedHash: string
  actualHash: string
  verified: boolean
}
```

### verifyHash() (Async)

```ts
import crypto from "node:crypto"
import fs from "node:fs/promises"

export async function verifyHash(
  path: string,
  expectedHash: string
): Promise<boolean> {
  const content = await fs.readFile(path)
  const actual = crypto.createHash("sha256").update(content).digest("hex")
  return actual === expectedHash
}
```

### DeploymentResult

```ts
export interface DeploymentResult {
  success: boolean
  target: DeploymentTarget
  buildId: string
  deployedAt: string
  diagnostics: CompilerDiagnostic[]
  reports: string[]
  durationMs: number
}

export type DeploymentTarget =
  | "node"
  | "docker"
  | "serverless"
  | "cloudflare-workers"
  | "kubernetes"
  | "edge"
  | "custom"
```

### ValidateEffectsInput / validateEffects()

```ts
export interface ValidateEffectsInput {
  effects: string[]
  policy: DeploymentPolicy
}

export function validateEffects(input: ValidateEffectsInput): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = []

  for (const effect of input.effects) {
    if (input.policy.denyEffects?.includes(effect)) {
      diagnostics.push({
        code: "LN-DEPLOY-004",
        severity: "error",
        message: `Effect ${effect} denied by deployment policy.`
      })
    }
  }

  return diagnostics
}
```

### ExplainResult / ExplainTrace

```ts
export interface ExplainResult {
  module: string
  effects: string[]
  capabilities: string[]
  traces: ExplainTrace[]
  diagnostics: CompilerDiagnostic[]
}

export interface ExplainTrace {
  id: string
  category: "effect" | "boundary" | "manifest" | "runtime" | "deployment"
  message: string
  relatedNodes: string[]
  relatedDiagnostics: string[]
}
```

### buildTrace() Example

```ts
export function buildTrace(
  fn: FunctionGraph
): ExplainTrace[] {
  return fn.calls.map((call) => ({
    id: call.id,
    category: "effect",
    message: `${call.name} performs effect ${call.effect}`,
    relatedNodes: [call.targetFunctionId],
    relatedDiagnostics: []
  }))
}
```

### ComputePlan (Extended)

```ts
export interface ComputePlan {
  target: RuntimeTarget
  estimatedMemoryMb: number
  estimatedCpu: number
  estimatedConcurrency: number
  requiredEffects: string[]
  requiredCapabilities: string[]
  compatibleTargets: RuntimeTarget[]
  incompatibleTargets: RuntimeTarget[]
  warnings: string[]
}
```

### estimateTarget() Implementation

```ts
export function estimateTarget(
  graph: ExecutionGraph
): RuntimeTarget {
  if (graph.parallelism === "high" && graph.tensorOps) {
    return "gpu"
  }

  if (graph.distributed && graph.opticalIO) {
    return "optical_io"
  }

  if (graph.sandboxed) {
    return "wasm"
  }

  return "cpu"
}
```

### Exit Codes

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

### CLI Report Files (Extended)

| File | Purpose |
| --- | --- |
| `build/reports/build-report.json` | build result evidence |
| `build/reports/verify-report.json` | verification evidence |
| `build/reports/deploy-report.json` | deployment evidence |
| `build/reports/explain-report.json` | reasoning graph |
| `build/reports/plan-report.json` | compute plan evidence |
| `build/manifests/runtime-manifest.json` | runtime metadata |

### CLI Directory Layout

```text
packages-logicn/logicn-core-cli/src/

  commands/
    build.ts
    verify.ts
    deploy.ts
    explain.ts
    plan.ts

  build/
    build-command.ts
    build-pipeline.ts         (14-pass implementation)
    build-reporter.ts
    build-artifacts.ts
    build-integrity.ts

  verify/
    verify-command.ts
    verify-manifest.ts
    verify-integrity.ts
    verify-runtime.ts
    verify-reporter.ts

  deploy/
    deploy-command.ts
    deploy-policy.ts
    deploy-validator.ts
    deploy-report.ts
    deploy-runtime.ts

  explain/
    explain-command.ts
    explain-trace.ts
    explain-tree.ts
    explain-runtime.ts
    explain-reporter.ts

  plan/
    plan-command.ts
    plan-graph.ts
    plan-runtime.ts
    plan-memory.ts
    plan-reporter.ts

  diagnostics/
    diagnostics-formatter.ts
    diagnostics-reporter.ts
```

---

## Relationship to Other Systems

```text
logicn build   → invokes compiler pipeline, emits runtime manifests and artefacts
logicn verify  → validates artefact integrity against compiler hashes
logicn deploy  → reads runtime manifest, deployment policy, compiler output
logicn explain → reads compiler reports, effect graph, capability graph
logicn plan    → reads compiler hints, runtime profiles, capability system
All five       → feed into audit log and execution proof
All five       → work with AI tooling via structured JSON
```

See also: `build-system-and-cli.md`, `runtime-audit-log-format.md`,
`effect-checker-and-boundary-checker.md`, `package-completion-status.md`.
