# LogicN

LogicN is a governance-first programming language, runtime and execution
architecture designed to coordinate secure computation across CPUs, GPUs,
AI accelerators, optical systems and future heterogeneous hardware.

Rather than focusing only on instruction execution, LogicN focuses on
understanding execution intent, enforcing explicit authority, planning compute
economics, coordinating hardware resources and producing auditable governed
execution.

LogicN combines:

```text
governed execution
capability-based security
hardware-aware runtime orchestration
AI-native compute planning
future-neutral compute abstractions
structured auditability
operational runtime coordination
```

into a unified compute platform.

This repository is the active LogicN workspace. It keeps the language core,
compiler/runtime contracts, governed runtime package planning, secure
application kernel, developer tooling, reports and example app source in clear
package boundaries while the project is still being shaped.

## What This Means

Most platforms are language-first, framework-first or VM-first. LogicN is
governance-first, execution-planning-first and hardware-awareness-first.

The practical development goal is to let developers describe intent,
capabilities, effects, data boundaries and compute needs in a way that the
compiler, runtime, audit system and AI tools can understand before work runs.

The selling point is not that LogicN magically makes hardware faster. The
selling point is that LogicN can make execution more governable:

```text
intent -> governed execution plan -> coordinated compute -> audit proof
```

That creates a foundation for safer APIs, explicit authority, AI-readable
projects, controlled accelerator use, memory-bounded execution, verified fast
paths and future heterogeneous compute without making normal application code
depend on a specific hardware generation.

## Status

LogicN is currently a language-design and v0.1 beta prototype project. It is not a
stable release, and package versions use beta prerelease identifiers until the
toolchain, package boundaries and documentation contracts are release-ready.

The mature language introduction lives in:

```text
packages-logicn/logicn-core/README.md
```

The root of this repository is the workspace entry point. Use it to understand
how LogicN packages, app files, tooling, reports and generated project graph outputs
fit together.

The practical v1 baseline is CPU-compatible checked execution, WASM target
planning and deterministic developer tooling. GPU, generic AI accelerator,
low-bit AI, optical I/O, photonic compute, ternary and Omni-logic support are
post-v1 package contracts, planning layers or simulation/report artefacts until
real backends exist.

Generated notes, planning documents and AI-suggested structures are advisory.
When they conflict, the repository structure, `AGENTS.md`, `logicn.workspace.json`,
package READMEs/TODOs and docs in this workspace take precedence. Roadmap
version labels may move when that improves staging, but package ownership rules
should not be overridden by generated documents.

## Core Ideas

LogicN is designed around:

```text
strict typing
explicit missing values
explicit errors
memory safety
security-first defaults
governed execution plans
capability-based authority
typed JSON and API contracts
source maps and machine-readable reports
AI-readable project context
CPU compatibility by default
hardware-neutral compute planning
optical I/O and data-movement awareness
optional accelerator planning
optional AI inference packages
structured audit proof
```

In this repository, AI-readable means regular syntax, explicit effects,
explicit imports, typed errors, source maps, stable diagnostics and
machine-readable reports. It does not mean vague natural-language friendliness.

For v1, these are goals unless backed by implemented compiler checks and tests.
LogicN's strongest near-term position is secure web/runtime behavior:
deny-by-default permissions, typed API boundaries, memory-safe values,
secret-safe reporting, controlled interop, production gates and AI-safe
project context. The longer-term architecture extends that same governance
model into heterogeneous compute orchestration. See
`docs/SECURE_WEB_RUNTIME_FIRST.md` for the runtime-first direction.

The runtime architecture is now documented as operational coordination rather
than a traditional VM model:

```text
Runtime Command                  workload understanding and execution planning
Authority Control                capability, effect and policy enforcement
Runtime Logistics                resource, queue, cache and fast-path reuse
Compute Balancer                 approved hardware selection under live pressure
Execution Coordination Scheduler bounded parallelism and dependency timing
Result Assembler                 ordered result reconstruction and integrity
```

These names are responsibility-based. They describe what each subsystem owns
without tying LogicN to threads, CPUs, GPUs or any single backend.

The Compute Balancer does not grant authority. It chooses the best available
approved target and falls back safely when hardware is unavailable, overloaded,
too hot, power-constrained or not trusted enough.

LogicN should not claim to make Ethernet hardware faster. Its network position
is application-level I/O governance: typed network APIs, deny-by-default network
permissions, TLS policy, backpressure, timeouts, zero-copy planning where
available, platform-aware async I/O, reports and deployment profiles. See
`docs/NETWORK_ETHERNET_IO.md` and `packages-logicn/logicn-core-network/`.

LogicN should not claim legal, privacy, security, accessibility, AI governance
or deployment compliance automatically. The enterprise `logicn-compliance`
package family defines policy, evidence and report contracts so
compliance-relevant behavior can be reviewed before deployment, but those
packages live under `packages-logicn-enterprise/` and are not part of the active
v1 build graph unless explicitly unlocked.

LogicN data processing should be package-owned rather than added directly to the
language core. The `logicn-data` package family defines typed, streaming-capable,
memory-bounded, security-aware and archive-verifiable data-processing contracts.

LogicN avoids:

```text
undefined
silent null
truthy/falsy conditions
implicit type coercion
hidden exceptions as the default error model
raw pointers in normal code
compiled secrets
silent target fallback
framework-specific language syntax
mandatory future hardware
```

LogicN explicitly supports `optical_io` as a future data-movement and interconnect
planning target. Intel Silicon Photonics and OCI-style devices should be treated
as high-speed optical I/O for distributed compute, AI clusters, accelerator
communication and memory pooling, not as normal CPUs or a direct replacement for
photonic compute targets.

LogicN also supports `ai_accelerator` as a generic accelerator planning target.
Vendor devices such as Intel Gaudi 3 should be passive backend profiles selected
by config, adapter policy or capability detection. They should not become
permanent LogicN syntax such as `target gaudi`.

## Quick Start

From the repository root:

```powershell
cd C:\laragon\www\LO
```

Generate or refresh the project graph:

```powershell
node packages-logicn\logicn-core-cli\dist\index.js graph --out build\graph
```

Inspect task automation with a dry run:

```powershell
node packages-logicn\logicn-core-cli\dist\index.js task buildApi --file packages-logicn\logicn-core-tasks\examples\tasks.lln --dry-run
```

Run the package tests that currently have executable coverage:

```powershell
npm.cmd --prefix packages-logicn\logicn-devtools-project-graph test
npm.cmd --prefix packages-logicn\logicn-core-tasks test
npm.cmd --prefix packages-logicn\logicn-core-cli test
```

For the prototype LogicN core compiler, work from `packages-logicn/logicn-core/` and see that
package README for the supported commands.

## Project Structure

```text
logicn-app/
|-- AGENTS.md
|-- package-logicn.json          # proposed future LogicN package manifest
|-- logicn.lock.json             # proposed future LogicN package lockfile
|-- docs/
|-- build/
|   `-- graph/
|-- packages/               # normal app/vendor package space
|-- packages-logicn/
|   |-- logicn-core/
|   |-- logicn-core-compiler/
|   |-- logicn-core-runtime/
|   |-- logicn-core-network/
|   |-- logicn-core-security/
|   |-- logicn-core-config/
|   |-- logicn-core-reports/
|   |-- logicn-core-logic/
|   |-- logicn-core-vector/
|   |-- logicn-core-compute/
|   |-- logicn-ai/
|   |-- logicn-ai-lowbit/
|   |-- logicn-ai-agent/
|   |-- logicn-ai-neural/
|   |-- logicn-ai-neuromorphic/
|   |-- logicn-data/
|   |-- logicn-data-html/
|   |-- logicn-data-search/
|   |-- logicn-data-archive/
|   |-- logicn-data-db/
|   |-- logicn-data-model/
|   |-- logicn-data-query/
|   |-- logicn-data-response/
|   |-- logicn-data-json/
|   |-- logicn-data-database/
|   |-- logicn-data-pipeline/
|   |-- logicn-data-reports/
|   |-- logicn-db-postgres/
|   |-- logicn-db-mysql/
|   |-- logicn-db-sqlite/
|   |-- logicn-db-opensearch/
|   |-- logicn-db-firestore/
|   |-- logicn-core-photonic/
|   |-- logicn-target-cpu/
|   |-- logicn-cpu-kernels/
|   |-- logicn-target-native/
|   |-- logicn-target-wasm/
|   |-- logicn-target-gpu/
|   |-- logicn-target-ai-accelerator/
|   |-- logicn-target-photonic/
|   |-- logicn-framework-app-kernel/
|   |-- logicn-framework-api-server/
|   |-- logicn-core-cli/
|   |-- logicn-core-tasks/
|   |-- logicn-tools-benchmark/
|   |-- logicn-devtools-project-graph/
|   |-- logicn-framework-example-app/
|-- packages-logicn-enterprise/
|   |-- logicn-compliance/
|   `-- logicn-compliance-*/
`-- tools/
```

## Package Map

- `packages-logicn/logicn-core/` - LogicN language rules, syntax, type system, prototype
  compiler notes, memory safety model, Structured Await, examples and core
  documentation.
- `packages-logicn/logicn-core-compiler/` - compiler pipeline contracts for lexer, parser, AST,
  checkers, IR, diagnostics, source maps and compiler reports.
- `packages-logicn/logicn-core-runtime/` - execution contracts for checked or compiled
  LogicN code, including Structured Await scopes, cancellation and timeout
  enforcement.
- `packages-logicn/logicn-core-network/` - network I/O policy, profile,
  permission, TLS, zero-copy planning, backpressure and report contracts.
- `packages-logicn/logicn-core-security/` - reusable security primitives, redaction,
  permissions, crypto policy and security reports.
- `packages-logicn/logicn-core-config/` - project configuration, environment mode and production
  strictness contracts.
- `packages-logicn/logicn-core-reports/` - shared report schemas and report-writing
  contracts, including async/concurrency, storage and build-cache report shapes.
- `packages-logicn/logicn-core-logic/` - `Tri`, `LogicN`, Decision, RiskLevel and future Omni
  logic concepts.
- `packages-logicn/logicn-core-vector/` - vector, matrix, tensor, lane, dimension and numeric
  operation concepts.
- `packages-logicn/logicn-core-compute/` - compute planning, capabilities, effects, budgets and
  target selection.
- `packages-logicn/logicn-ai/` - generic AI inference contracts, model metadata, safety
  policy and AI reports.
- `packages-logicn/logicn-ai-lowbit/` - low-bit and ternary AI inference contracts, with
  BitNet represented as one optional backend rather than LogicN syntax.
- `packages-logicn/logicn-ai-agent/` - supervised AI agent, tool permission, task group,
  merge policy and agent report contracts.
- `packages-logicn/logicn-ai-neural/` - neural model, layer, inference and training boundary
  contracts.
- `packages-logicn/logicn-ai-neuromorphic/` - spike, event-signal and spiking model
  contracts.
- `packages-logicn-enterprise/logicn-compliance/` and `packages-logicn-enterprise/logicn-compliance-*` -
  compliance, privacy, governance, audit, retention, accessibility, AI governance,
  deployment policy and compliance report contracts.
- `packages-logicn/logicn-data/` and `packages-logicn/logicn-data-*` - data
  processing, HTML, search, archive, JSON, database archive, streaming pipeline
  and data-processing report contracts.
- `packages-logicn/logicn-data-db/`, `logicn-data-model`, `logicn-data-query`
  and `logicn-data-response` - typed database boundary, storage model, query and
  safe response mapping contracts.
- `packages-logicn/logicn-db-*` - future database provider adapter contracts.
- `packages-logicn/logicn-core-photonic/` - photonic and wavelength concepts, simulation and
  logic-to-light mapping contracts.
- `packages-logicn/logicn-target-cpu/` - CPU capability detection, threading, memory limits
  and fallback planning.
- `packages-logicn/logicn-cpu-kernels/` - optimized CPU kernel contracts for vector,
  matrix, low-bit and ternary workloads.
- `packages-logicn/logicn-target-native/` - future native executable target
  planning and artifact metadata.
- `packages-logicn/logicn-target-wasm/` - WebAssembly target planning and module metadata.
- `packages-logicn/logicn-target-gpu/` - GPU target planning, kernel mapping and data
  movement reports.
- `packages-logicn/logicn-target-ai-accelerator/` - NPU, TPU, AI-chip and passive
  accelerator backend profile planning contracts.
- `packages-logicn/logicn-target-photonic/` - photonic backend target planning and
  optical I/O interconnect planning that uses `logicn-core-photonic`.
- `packages-logicn/logicn-framework-app-kernel/` - optional secure application kernel for typed API
  boundaries, validation, auth, rate limits, jobs and runtime reports.
- `packages-logicn/logicn-framework-api-server/` - built-in HTTP API transport that delegates typed
  execution and policy decisions to `logicn-framework-app-kernel`.
- `packages-logicn/logicn-core-cli/` - developer command tooling for graph, tasks, future check,
  build, run, serve, reports, routes and security commands.
- `packages-logicn/logicn-core-tasks/` - safe typed project automation with declared effects,
  permissions, dependency planning and reports.
- `packages-logicn/logicn-tools-benchmark/` - development diagnostics and benchmark contracts
  for logic, CPU/GPU/low-bit fallback, privacy-safe reports and comparisons.
- `packages-logicn/logicn-devtools-project-graph/` - project graph contracts and mapper for package,
  document, policy and report relationships.
- `packages-logicn/logicn-framework-example-app/` - bespoke application source, routes, modules, tests and app
  configuration.
- `docs/` - app/workspace requirements, architecture, security, deployment,
  decisions, changelog and operational documentation.

Archived post-v2 package planning is preserved outside the active workspace:

```text
C:\laragon\www\LogicN_Archive\packages-logicn\logicn-finance-core
C:\laragon\www\LogicN_Archive\packages-logicn\logicn-electrical-core
C:\laragon\www\LogicN_Archive\packages-logicn\logicn-ot-core
```

## Layering

```text
LogicN Core
  language, type system, effects, memory safety, Structured Await,
  storage-aware performance rules and core reports

LogicN Compiler / Runtime / Network / Security / Config / Reports
  compiler pipeline, execution, network policy, shared security, configuration and report contracts

LogicN Logic / Vector / Compute / AI / Neural / Photonic / Target Packages
  specialised concepts and target planning outside the core language package;
  only CPU and WASM are active v1 targets

LogicN Secure App Kernel
  optional runtime layer for API validation, auth, rate limits, jobs and reports

LogicN API Server
  HTTP transport that normalises requests and calls the app kernel

LogicN CLI / Tasks / Project Graph
  developer tooling, safe automation, benchmarks and AI-readable project maps

Full Frameworks
  CMS, admin UI, page builders, ORMs, template engines and frontend adapters
```

Important boundary rules:

- `logicn-core` defines the language. It must not become a web framework.
- `logicn-framework-app-kernel` is an optional secure application boundary. It must not become
  a CMS, admin dashboard, ORM or frontend framework.
- `logicn-framework-api-server` serves HTTP and delegates typed policy decisions.
- `logicn-core-network` defines network policy and report contracts. It does
  not implement every protocol or replace the HTTP server package.
- `logicn-ai`, `logicn-ai-agent`, `logicn-ai-neural`, `logicn-ai-neuromorphic` and `logicn-ai-lowbit` are
  optional AI package layers, not core syntax.
- Parallel agents must be supervised, bounded, permissioned and reportable.
- BitNet is a backend option inside low-bit AI, not a language feature.
- AI accelerators, GPUs, optical I/O and photonic chipsets are optional targets.
  CPU and binary-compatible fallback remain the baseline.
- `ai_accelerator` is the public LogicN target category. Intel Gaudi and similar
  hardware are backend profiles selected by policy and reported after planning.
- `optical_io` means high-speed interconnect/data movement planning. It is not a
  claim that Intel Silicon Photonics or OCI devices are general-purpose CPUs.
- `logicn-tools-benchmark` is development diagnostics. It must not auto-run in
  production and is disabled by default in production boot/package profiles.
  Enabling it in production requires an explicit reported override with a
  reason. Benchmark reports must not expose private machine or project data.
- `logicn-devtools-project-graph` explains the repository. It does not enforce compiler,
  runtime or security rules.
- Development-only packages should remain outside production package
  resolution. Use `logicn-devtools-*` for development-only inspection, graph,
  scaffold and assistant-context packages, and `logicn-tools-*` for broader
  diagnostics or benchmark utilities that may run in development or staging.
  Production defaults must disable these packages unless a maintainer declares
  an explicit production package override.
- Finance, electrical and OT packages are archived post-v2 domain planning and
  are not part of the active build graph. They must not become LogicN core syntax or
  imply that LogicN beta is ready for regulated finance, certified electrical
  protection, PLC safety systems, SCADA products or OT control.

## Package Layout Direction

The proposed long-term split is documented in `docs/PACKAGE_LAYOUT.md`:

```text
package.json       normal app/runtime ecosystem dependencies
package-logicn.json    LogicN package manifest
logicn.lock.json       deterministic LogicN package lockfile
packages/          normal app/vendor packages
packages-logicn/       LogicN packages, optionally a nested repository
```

The current beta has moved LogicN packages under `packages-logicn/`. `packages/` is now
reserved for normal app/vendor package space. `package-logicn.json` and
`logicn.lock.json` remain planned files; do not rely on them until the manifest,
lockfile and package resolver are implemented.

Package naming guidance lives in `docs/PACKAGE_NAMING.md`. Current packages use
family prefixes such as `logicn-core-*`, `logicn-ai-*`, `logicn-target-*`,
`logicn-framework-*`, `logicn-devtools-*` and `logicn-tools-*` so their
runtime, developer-tooling or domain role is visible from the directory name.

## Current Tooling

The currently implemented root-level CLI paths are:

```powershell
node packages-logicn\logicn-core-cli\dist\index.js graph --out build\graph
node packages-logicn\logicn-core-cli\dist\index.js graph query logicn-core-security --out build\graph
node packages-logicn\logicn-core-cli\dist\index.js graph explain package:logicn-core-security --out build\graph
node packages-logicn\logicn-core-cli\dist\index.js graph path package:logicn-devtools-project-graph report:project-graph --out build\graph

node packages-logicn\logicn-core-cli\dist\index.js task --file packages-logicn\logicn-core-tasks\examples\tasks.lln
node packages-logicn\logicn-core-cli\dist\index.js task buildApi --file packages-logicn\logicn-core-tasks\examples\tasks.lln --dry-run
```

`LogicN benchmark` is registered as a future command placeholder. Benchmark modes,
report shapes and safety rules are documented in
`packages-logicn/logicn-tools-benchmark/README.md`; the runnable benchmark runner is still on
the package TODO list.

Once `logicn-core-cli` is installed or linked, the intended shorthand is:

```powershell
LogicN graph --out build\graph
LogicN task buildApi --dry-run
```

## Project Graph

AI assistants and developers should use the generated project graph to inspect
package ownership and repository relationships:

```text
build/graph/logicn-devtools-project-graph.json
build/graph/LogicN_GRAPH_REPORT.md
build/graph/logicn-ai-map.md
build/graph/logicn-devtools-project-graph.html
```

If the graph is missing or out of date, regenerate it from the repository root:

```powershell
node packages-logicn\logicn-core-cli\dist\index.js graph --out build\graph
```

The graph is navigation tooling only. It does not replace the compiler, tests,
security checks or package boundary rules.

## Task Automation

`logicn-core-tasks` loads safe task definitions from `tasks.lln` files. Tasks declare
their dependencies, effects and permissions before anything runs.

Example:

```LogicN
task buildApi {
  depends [generateReports]
  effects [filesystem, compiler, reports]

  permissions {
    read "./src"
    write "./build"
  }
}
```

Current task execution supports loading, listing, dependency ordering, cycle
detection, dry-run planning, permission checks and task report generation.
Built-in operation execution is still future work.

Task reports are written by default to:

```text
build/reports/task-report.json
```

## Documentation Guide

- Use `packages-logicn/logicn-core/` for language documentation.
- Use package READMEs and TODOs for package-specific contracts and work.
- Use `docs/` for app/workspace requirements, architecture, security,
  deployment, decisions and changelog.
- Use `AGENTS.md` for AI coding tool instructions.
- Update `docs/CHANGELOG.md` when architecture, tooling, package contracts or
  behavior changes.

## Git Layout

Current development uses one root Git repository while package boundaries are
still being shaped.

The intended future split is:

```text
light-framework/
|-- .git
|-- packages/
|   `-- normal app/vendor packages
|-- packages-logicn/
|   `-- .git
`-- app/framework files
```

Use that layout only when `packages-logicn/` becomes a reusable LogicN package collection that
is imported by different frameworks.

Recommended implementation:

```text
light-framework/.git
packages-logicn/.git
```

with `packages-logicn/` added to the framework as an intentional Git submodule or
standalone nested repository. Do not create `packages-logicn/.git` accidentally
inside the current app template, because the parent repository will not track
package contents in the normal way once `packages-logicn/` is its own repository.
