# LogicN Core

LogicN is a governance-first programming language, runtime and execution
architecture designed to coordinate secure computation across CPUs, GPUs,
AI accelerators, optical systems and future heterogeneous hardware.

This package contains the LogicN core language design, prototype compiler,
examples, schemas and detailed language documentation.

LogicN core is responsible for the language surface: syntax, type checking,
effects, memory safety, explicit errors, source maps, diagnostics and
machine-readable reports. It defines the language and report contracts that
allow higher runtime layers to build governed execution plans.

## What LogicN Is Becoming

LogicN is not only a traditional programming language or VM. The long-term
architecture is closer to:

```text
a governed compute orchestration platform
```

The core language provides the declared intent, types, effects, capabilities
and reports that make this orchestration possible.

Traditional systems often think:

```text
code -> execution
```

LogicN increasingly thinks:

```text
intent -> governed execution plan -> coordinated compute -> audit proof
```

For developers, this means LogicN aims to make security and runtime behavior
visible in source and reports. The selling point is explicit authority,
machine-readable contracts, AI-readable context, controlled compute planning
and auditable execution rather than hidden runtime magic.

For runtime implementers, this means the core language should remain strict,
small and reportable while sibling packages own compute, AI, network,
photonic, accelerator and application-kernel behavior.

## Status

LogicN is currently a language-design and v0.1 beta prototype project.

The prototype CLI lives in `compiler/logicn.js`. It can parse and check the
documented LogicN subset, run simple `.lln` files, generate reports, emit placeholder
build artefacts, and produce AI-readable context.

Useful commands from this package root:

```bash
npm run check
npm test
npm run build:examples
npm run verify -- build/examples
npm run generate:dev
npm run dev
node compiler/logicn.js run examples/hello.lln --generate
```

The prototype is not a production compiler. CPU-compatible checked execution and
WASM target planning are the practical v1 baseline. GPU, photonic, AI
accelerator, low-bit AI, optical I/O, ternary and Omni-logic outputs are
post-v1 planning, simulation or compatibility-report artefacts until real
backends exist.

## V1 Surface Freeze

The v1 language surface is intentionally small:

```text
core syntax and grammar
core type system
Bool, Option, Result and explicit errors
Tri semantics only where they affect the core type system
hybrid ownership memory-safety model
CPU-compatible checked execution
WASM target planning
source maps, diagnostics and machine-readable reports
```

The project should not add more active package surfaces until the syntax,
memory model, Tri/Bool boundary and parser are concrete enough to test against
real `.lln` programs.

LogicN should not make measured performance claims in v0.1. It can state
performance goals and design opportunities, but measured performance claims
require an implemented compiler/runtime, a settled memory model and reproducible
benchmarks.

LogicN's stronger security claim is secure-runtime behavior:
deny-by-default effects, typed API boundaries, memory-safe values, secret-safe
reports, package permissions, controlled interop, production gates and AI-safe
generated project context.

The broader runtime architecture is evolving toward governed operational
coordination:

```text
Runtime Command                  workload understanding and execution planning
Authority Control                capability, effect and policy enforcement
Runtime Logistics                resource, queue, cache and fast-path reuse
Compute Balancer                 approved hardware selection under live pressure
Execution Coordination Scheduler bounded parallelism and dependency timing
Result Assembler                 ordered result reconstruction and integrity
```

These are architecture terms, not all implemented package names. They describe
responsibility and keep the design hardware-neutral.

The Compute Balancer chooses only from hardware targets already approved by
Authority Control. It can respond to memory pressure, VRAM pressure, queue
depth, thermal state, power state, device trust and fallback availability, but
it cannot widen authority.

LogicN should not claim direct control over CPU L1/L2/L3 cache or ECC memory.
Cache-aware work should be framed as memory layout, access-pattern, batching,
copying and vectorisation guidance. ECC-aware work should be framed as
deployment reliability policy and reporting where the platform exposes evidence.

LogicN should not claim to make Ethernet hardware faster. Network and Ethernet
I/O improvements should be framed as safer and more efficient application use
of the network: typed network APIs, deny-by-default network permissions, TLS
policy, route limits, backpressure, timeout policy, zero-copy planning where
available, platform-aware I/O backend selection and network reports.

LogicN should also not claim production maturity until the language core is
enforceable. The missing maturity checklist lives in
`docs/language-core-maturity-roadmap.md` and covers the real compiler pipeline,
traits/protocols, deterministic cleanup, FFI, package management, tests,
async runtime semantics, source-mapped runtime errors and standard library
baseline.

LogicN should not claim legal or regulatory compliance automatically.
`docs/compliance-and-privacy.md` defines the compliance and privacy framework
direction. The enterprise `logicn-compliance` package family owns related
policy, evidence and report contracts under `packages-logicn-enterprise/` and is
not part of the active v1 build graph unless explicitly unlocked.

LogicN data processing belongs in packages, not directly in the core language.
`docs/data-processing.md` defines the `logicn-data` package family for HTML,
search, archive, JSON, database archive, streaming pipeline, memory-limit,
security and report contracts.

Database support should stay inside the data package family. `logicn-data-db`,
`logicn-data-model`, `logicn-data-query` and `logicn-data-response` define the
typed database boundary so stored models, inputs, queries, commands, responses,
archives and reports remain separate.

## Layer Boundary

LogicN core is the language, compiler and standard safety contract. It may define
syntax, type-checking rules and report contracts, but specialised package
semantics should live in sibling packages.

Package ownership:

```text
packages-logicn/logicn-core/
  Bool, Option, Result, basic flow syntax, basic type rules, compiler contracts

packages-logicn/logicn-core-compiler/
  lexer, parser, AST, checker pipeline, IR, diagnostics, source maps, compiler reports

packages-logicn/logicn-core-runtime/
  checked execution, compiled execution, effect dispatch, runtime errors, runtime reports

packages-logicn/logicn-core-security/
  SecureString helpers, redaction primitives, permission models, security reports

packages-logicn/logicn-core-config/
  project config, environment modes, config validation, production policy loading

packages-logicn/logicn-core-reports/
  shared report metadata, diagnostics, processing reports, schemas and writer contracts

packages-logicn/logicn-core-logic/
  Tri, LogicN, Decision, RiskLevel, Omni logic, truth tables, logic reports

packages-logicn/logicn-core-vector/
  Vector<T, N>, Matrix<T>, Tensor<T>, Shape, lanes, dimensions, vector operations and vector reports

packages-logicn/logicn-core-compute/
  compute planning, capabilities, budgets, offload and target selection

packages-logicn/logicn-ai/
  generic AI inference contracts, model metadata, safety policy, AI reports

packages-logicn/logicn-ai-lowbit/
  low-bit / ternary AI model references, backend selection and CPU inference plans

packages-logicn/logicn-ai-agent/
  supervised AI agent, tool permission, task group and report contracts

packages-logicn/logicn-ai-neural/
  neural models, layers, inference and training boundary contracts

packages-logicn/logicn-ai-neuromorphic/
  Spike, SpikeTrain, EventSignal and spiking model contracts

packages-logicn/logicn-core-photonic/
  Wavelength, Phase, Amplitude, OpticalSignal, OpticalChannel

packages-logicn/logicn-target-cpu/
  CPU capability detection, SIMD features, threading and fallback reports

packages-logicn/logicn-cpu-kernels/
  optimized CPU kernel contracts for vector, matrix, low-bit and ternary work

packages-logicn/logicn-target-native/
  future native executable target planning and artifact metadata

packages-logicn/logicn-target-wasm/
  WebAssembly target planning, module metadata and import/export contracts

packages-logicn/logicn-target-gpu/
  GPU target planning, kernel mapping, precision and data movement reports

packages-logicn/logicn-target-ai-accelerator/
  NPU, TPU, AI-chip and passive accelerator backend profile planning contracts

packages-logicn/logicn-target-photonic/
  photonic backend target plans using logicn-core-photonic concepts

packages-logicn/logicn-tools-benchmark/
  development diagnostics, benchmark configs, fallback checks and privacy-safe reports

packages-logicn/logicn-devtools-project-graph/
  project knowledge graph contracts for packages, docs, policies and reports
```

Detailed package-boundary guidance lives in
`docs/package-boundaries.md`.

Runtime enforcement for application request handling belongs in the optional LogicN
Secure App Kernel package in the surrounding workspace:

```text
packages-logicn/logicn-framework-app-kernel/
```

HTTP API serving belongs in the built-in API server package:

```text
packages-logicn/logicn-framework-api-server/
```

The intended layering is:

```text
LogicN Core
  language, compiler, type system, effects, memory safety, compute planning, reports

LogicN Compiler / Runtime / Security / Config / Reports
  compiler pipeline, execution, shared security, configuration and report contracts

LogicN Logic / Vector / Compute / AI / Photonic / Target Packages
  specialised LogicN concepts and target planning outside the core language package

LogicN Standard Library
  Json, Xml, SafeHtml, File, Stream, Request, Response, DateTime, Money, SecureString

LogicN Secure App Kernel
  optional runtime layer for APIs, validation, auth, rate limits, jobs and reports

LogicN API Server
  built-in HTTP API server that loads route manifests and calls the app kernel

LogicN Project Graph
  optional developer tooling for project relationship maps and AI context

Full Frameworks
  CMS, admin panels, UI systems, templates, ORM, page builders and frontend adapters
```

LogicN core may define syntax, checks and reports for safe API, webhook, job and
security contracts. The Secure App Kernel enforces those contracts at runtime
when an application opts into it. `logicn-framework-api-server` provides the default HTTP
transport for API services by loading route manifests, normalising requests and
passing them to the kernel. Full frameworks provide opinionated application
structure above or beside the kernel.

LogicN core must not become a Laravel, Django, React or WordPress-style framework.

## Core Goals

LogicN should provide:

```text
strict typing
explicit missing values
explicit errors
memory safety
security-first defaults
declared execution intent
capability-based authority
typed JSON decoding
API and webhook contracts
source maps
machine-readable reports
AI-readable project context
governed execution planning
multi-target planning
CPU compatibility by default
hardware-neutral compute abstractions
post-v1 AI inference as an optional package layer
post-v1 GPU planning
post-v1 photonic planning
post-v1 ternary and Omni-logic simulation
```

LogicN should avoid:

```text
undefined
silent null
truthy/falsy conditions
implicit type coercion
hidden exceptions as the default error model
raw pointers in normal code
compiled secrets
silent target fallback
framework-specific native syntax
mandatory future hardware
```

## Backend Language Roadmap

The backend language gap analysis identifies the highest-value additions for
LogicN core:

| Priority | Direction |
|---|---|
| 1 | Language editions and compatibility rules |
| 2 | Final `Bool`, `Tri`, `Decision` and `LogicN` conversion rules |
| 3 | Algebraic variants, sealed state and exhaustive `match` |
| 4 | Generic constraints, traits or protocols |
| 5 | Structured concurrency, cancellation and streams |
| 6 | Deterministic resource cleanup |
| 7 | Safe compile-time metadata and attributes |
| 8 | Native ABI and foreign-call boundaries |
| 9 | Matrix/vector shape rules with scalar fallback |
| 10 | Stable diagnostics and AI report schemas |

Detailed analysis lives in `docs/backend-runtime-capability-roadmap.md`.
The language-level polymorphism direction lives in `docs/polymorphism.md` and
prefers contracts, adapters, variants and constrained generics over class
inheritance as the main model.

## File Extension

LogicN source files use `.lln`.

Examples:

```text
boot.lln
main.lln
order-service.lln
fraud-check.lln
payment-webhook.lln
```

The recommended project entry file is `boot.lln`. Simple scripts may use
`main.lln` or a single named `.lln` file.

## Example Script

```LogicN
secure flow main() -> Result<Void, Error> {
  print("hello from LogicN")
  return Ok()
}
```

Run:

```bash
node compiler/logicn.js run examples/hello.lln
```

Short scripts should still use secure defaults:

```text
strict types enabled
memory safety enabled
undefined denied
silent null denied
unsafe denied
source maps enabled
CPU target enabled
```

## Example API Contract

```LogicN
api OrdersApi {
  POST "/orders" {
    request CreateOrderRequest
    response CreateOrderResponse
    errors [ValidationError, PaymentError]
    timeout 5s
    max_body_size 1mb
    handler createOrder
  }
}

secure flow createOrder(input: CreateOrderRequest) -> Result<CreateOrderResponse, ApiError>
effects [database.write] {
  ...
}
```

LogicN core checks the contract. A kernel-backed runtime can enforce request
validation, auth, limits, idempotency and typed handler dispatch.

The built-in `logicn-framework-api-server` package can serve the compiled API route manifest
over HTTP, but it should not own auth policy, business logic, persistence,
frontend rendering or framework conventions.

## Example Compute Block

```LogicN
data = readFile("./data.json")

compute target best verify cpu_reference {
  prefer photonic
  fallback gpu
  fallback cpu

  result = fraudModel(data)
}
```

Compute blocks should contain pure compute work. I/O should happen outside the
compute block and be passed in as strict typed data.

## Repository Structure

This package is the LogicN core package root.

```text
logicn-core/
|-- README.md
|-- ABOUT.md
|-- CONCEPT.md
|-- SPEC.md
|-- COMPATIBILITY.md
|-- REQUIREMENTS.md
|-- DESIGN.md
|-- ARCHITECTURE.md
|-- SECURITY.md
|-- AI-INSTRUCTIONS.md
|-- GETTING_STARTED.md
|-- ROADMAP.md
|-- TASKS.md
|-- CHANGELOG.md
|-- package.json
|-- compiler/
|   `-- prototype CLI, parser, checker and report generation
|-- examples/
|   `-- LogicN example source files
|-- grammar/
|   `-- grammar and token definitions
|-- schemas/
|   `-- report and generated schema contracts
|-- docs/
|   `-- detailed language design documents
`-- build/
    `-- generated build artefacts
```

Generated folders such as `build/` and `.build-dev/` are ignored by default.

## Build Outputs

LogicN builds should be able to produce:

```text
app.bin
app.wasm
app.gpu.plan
app.photonic.plan
app.ternary.sim
app.omni-logic.sim
app.openapi.json
app.api-report.json
app.security-report.json
app.target-report.json
app.precision-report.json
app.memory-report.json
app.execution-report.json
app.failure-report.json
app.source-map.json
app.map-manifest.json
app.ai-guide.md
app.ai-context.json
app.build-manifest.json
```

Compiled artefacts are not secrets. Real secrets must remain outside compiled
files in environment variables, secret managers or deployment configuration.

## AI Support

LogicN should reduce the amount of source code that developers need to paste into AI
tools.

```bash
node compiler/logicn.js ai-context examples --out build/examples
node compiler/logicn.js explain examples/source-map-error.lln --for-ai
```

AI reports must be compact, deterministic, source-mapped and free of secrets.

## Non-Goals

LogicN core should not:

```text
replace every programming language
require photonic hardware
provide a full MVC framework
provide a CMS or admin dashboard
provide frontend component syntax
make JSON loosely typed
make unsafe memory normal
hide errors behind runtime magic
compile secrets into output files
```

## Licence

LogicN / LogicN is licensed under the Apache License 2.0. See `LICENSE`,
`LICENCE.md` and `NOTICE.md`.
