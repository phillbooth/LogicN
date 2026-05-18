# Architecture

## Overview

This workspace separates the LogicN language core from the bespoke app that uses it.


Language documentation, compiler notes, examples and schemas live in
`packages-logicn/logicn-core/`
.

 Compiler pipeline contracts live in
`packages-logicn/logicn-core-compiler/`.

 Runtime execution contracts live in
`packages-logicn/logicn-core-runtime/`.

 Network I/O policy, profile, permission
and report contracts live in `packages-logicn/logicn-core-network/`.

 Security primitives live in `packages-logicn/logicn-core-security/`.


Configuration and shared reports live in `packages-logicn/logicn-core-config/` and
`packages-logicn/logicn-core-reports/`.

 Multi-state logic concepts live in `packages-logicn/logicn-core-logic/`.


Vector concepts live in `packages-logicn/logicn-core-vector/`.

 Compute planning concepts live in
`packages-logicn/logicn-core-compute/`.

 Generic AI inference contracts live in
`packages-logicn/logicn-ai/`, and low-bit/ternary AI inference support lives in
`packages-logicn/logicn-ai-lowbit/`.

 Supervised AI agent contracts live in
`packages-logicn/logicn-ai-agent/`.

 Neural-network workload contracts live in
`packages-logicn/logicn-ai-neural/`, and neuromorphic spike/event contracts live in
`packages-logicn/logicn-ai-neuromorphic/`.

 Enterprise compliance and privacy
policy contracts live outside the active workspace in
`packages-logicn-enterprise/logicn-compliance/` and the
`packages-logicn-enterprise/logicn-compliance-*` package family.

 They are not
part of the active v1 build graph unless explicitly unlocked.

 Data-processing contracts
live in `packages-logicn/logicn-data/` and the
`packages-logicn/logicn-data-*` package family.

 Database provider adapter
contracts live in `packages-logicn/logicn-db-*`.

 BitNet is one optional backend for low-bit AI.


Photonic and wavelength concepts live in
`packages-logicn/logicn-core-photonic/`.

CPU target planning lives in
`packages-logicn/logicn-target-cpu/`, optimized CPU kernel contracts live in
`packages-logicn/logicn-cpu-kernels/`, and future native executable target
planning lives in `packages-logicn/logicn-target-native/`. Future portable
systems output planning should start as native target work only after ABI,
layout, memory and report rules stabilise. WebAssembly target planning lives in
`packages-logicn/logicn-target-wasm/`, GPU target planning lives in
`packages-logicn/logicn-target-gpu/`, AI accelerator target planning lives in
`packages-logicn/logicn-target-ai-accelerator/` with passive backend profiles for devices
such as Intel Gaudi 3, and photonic target backend planning lives in
`packages-logicn/logicn-target-photonic/`, including optical I/O interconnect planning as a
data-movement target.

 The
optional Secure App Kernel design lives in `packages-logicn/logicn-framework-app-kernel/`.

 The
built-in HTTP API server package lives in `packages-logicn/logicn-framework-api-server/`.

 Developer command
tooling lives in `packages-logicn/logicn-core-cli/`, and safe project automation lives in
`packages-logicn/logicn-core-tasks/`.

 Development benchmark diagnostics live in
`packages-logicn/logicn-tools-benchmark/`.

 Project knowledge graph tooling lives in
`packages-logicn/logicn-devtools-project-graph/`.

 App source and build configuration live in
`packages-logicn/logicn-framework-example-app/`.

 Finance, electrical and
operational-technology package planning is archived outside the active
workspace under `C:\laragon\www\LogicN_Archive\packages-logicn\` and is not part of the
v1 build graph.

 App planning and operational documentation live in `docs/`.


Development-only packages should use `logicn-devtools-*` or
`logicn-tools-*` names and must not be resolved by production applications by
default.



LogicN's security architecture is secure-runtime first. The intended advantage
is broader policy: deny-by-default effects, typed API boundaries, memory-safe
values, secret-safe reports, controlled interop, production gates and AI-safe
context generation.

LogicN's first practical target is secure web application runtime code: typed
HTTP APIs, webhooks, queue workers, auth-heavy services, agent/tool gateways,
safe JSON boundaries and deployment policy. Low-level systems targets, embedded
targets and native executable output remain later output paths.

The detailed direction lives in `docs/SECURE_WEB_RUNTIME_FIRST.md`.


The baseline trust model is practical zero trust: external input, dependency
output, generated AI content, cached data, network data, database data, uploaded
files, environment-derived values, headers, cookies, tokens, runtime metadata
and build artifacts start untrusted until validated, typed, permissioned,
provenance-checked or explicitly policy-reviewed.

 Trust transitions must be
visible in types, policies or reports.



Application crash handling is also policy-first.

 LogicN should distinguish
expected errors, external failures and unexpected crashes in typed outcomes and
reports.

 The core language owns `Result<T, E>`, panic/crash categories and
source-map direction.

 `logicn-framework-app-kernel` owns route, webhook and
worker crash boundaries, crash policies, safe responses, supervised restarts,
health/readiness crash state and secret-safe crash reports.

 The canonical
workspace note is `docs/APP_CRASH_HANDLING. md`.



The runtime architecture direction is the LogicN Securely Governed Runtime.

Runtime authority must be established before code acts. Policy, capabilities,
effects and audit hooks are part of execution itself, not optional middleware.
The runtime should separate a small trusted core, a governed runtime zone and an
untrusted zone for plugins, third-party packages, external services,
AI-generated code, unsafe interop and hardware accelerators.

Execution should follow:

```text
request -> planning -> verification -> capability locking -> execution -> audit proof
```

The runtime may use verified fast paths only when a workload matches a known
execution signature and the fast path lease remains valid. Fast paths must not
bypass policy, capability checks, effect boundaries, data contracts or audit.

AI workloads should be described as typed AI compute plans rather than opaque
model calls. The runtime can then enforce policy, minimise data, reduce copying,
batch compatible work, choose suitable hardware and produce compliance evidence.

AI-generated code and AI-driven policy changes must pass through
self-modification governance. AI can request capability leases, but cannot issue
them to itself. AI-authored code should enter quarantine, pass syntax/type and
effect checks, run sandbox tests, produce an audit report and receive human or
policy approval before promotion to trusted code.

Capability delegation must attenuate authority. A delegated capability can be
equal or narrower than the delegator's authority, never broader. No runtime
process, including an AI agent, may grant itself broader authority than its
approver chain possesses.



Environment secret handling is a typed security boundary.

 `.

env` values must
enter the app as declared secret references such as `Secret<T>`, not ordinary
strings.

 `logicn-core-security` owns protected secret references, redaction,
fingerprints, secret-derived taint tracking and safe sink decisions.


`logicn-framework-app-kernel` consumes those rules for route, webhook, worker,
LLM/cache, network and report enforcement.

 Secret metadata can appear in
reports; secret values must not.

 The canonical workspace note is
`docs/ENV_SECRETS. md`.



Memory hierarchy and reliability must be framed carefully.

 LogicN does not
directly control CPU cache levels or ECC hardware.

 `logicn-core` owns memory
model vocabulary such as ownership, views, explicit clone and layout hints.


`logicn-core-compiler` should own hot-loop, large-copy and layout diagnostics.


`logicn-core-runtime` may collect memory/cache/reliability facts where the
platform exposes them.

 `logicn-target-cpu` owns CPU capability and cache fact
detection contracts, and `logicn-core-reports` owns shared report shapes.

 The
canonical workspace note is `docs/MEMORY_HIERARCHY_RELIABILITY. md`.



Server platform support is split by role.

 Nginx, Apache and Caddy are
deployment/reverse-proxy targets that LogicN may generate safe config for.


Node.

js is both the current tooling platform and an optional runtime target.


Express, Fastify, Hono and serverless/edge systems are adapters that must
preserve the same route manifest and app-kernel enforcement.

 The built-in
`logicn-framework-api-server` remains a focused HTTP serving package, not a
full web framework.

 See `docs/SERVER_PLATFORM_SUPPORT. md`.



## V1 Surface Freeze

The v1 architecture is frozen around a small language surface:

```text
core syntax
core type system
Result / Option error and missing-value handling
the memory-safety model
CPU target support
WASM target support
compiler, runtime, security, config, reports, CLI and task tooling
core network policy contracts
```

The active core package set must expose testable contracts before broader
framework or target work depends on it.

 `logicn-core-network` owns network
policy shape, TLS requirements, endpoint allow/deny rules, backend capability
selection and network reports.

 `logicn-core-runtime` owns execution context,
runtime result/error shapes, effect decisions and runtime reports.


`logicn-core-vector` owns vector, matrix and tensor shape validation plus vector
operation reports.

 `logicn-core-photonic` remains post-v1 planning, but its
concept surface is now bounded to optical signals, logic-state mappings and
plan/report validation.



Everything beyond CPU and WASM targets is post-v1 unless it directly specifies
core type-system semantics.

 AI, GPU, AI accelerator, photonic, optical I/O,
finance, electrical, OT and other domain-specific packages must not define the
v1 language surface.

 They may remain as archived or clearly labelled post-v1
planning only.



The v1 priority order is:

```text
1.

 Finalise syntax and grammar.


2.

 Commit to the memory model.


3.

 Define Bool, Tri, Decision, Option and Result semantics.


4.

 Write at least 20 real LogicN example programs.


5.

 Build a working parser for that subset.


6.

 Only then expand package targets or domain packages.


```

The working execution plan for these gates lives in
`docs/CORE_FOUNDATION_ROADMAP. md`.



The current compiler package includes an interim syntax safety scan for the
highest-risk v1 core cases while the real parser and checker are pending.

 It
flags direct Tri branch conditions, implicit Tri/Decision/Bool assignments,
non-exhaustive Tri matches, `unknown_as: true` in secure flows, raw secret-like
literals and unsafe dynamic execution calls.

 This scan is advisory compiler
infrastructure, not a substitute for the future AST-based checker.



## Main Structure

Current single-repository structure:

```text
logicn-app/
|-- docs/
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

Future split-repository structure:

```text
light-framework/
|-- .

git
|-- packages/
|   `-- normal app/vendor packages
|-- packages-logicn/
|   |-- .

git
|   |-- logicn-core/
|   |-- logicn-core-compiler/
|   |-- logicn-core-runtime/
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
|   `-- logicn-framework-example-app/
|-- app/
`-- framework files
```

In the current and future structure, `packages-logicn/` is the reusable LogicN package repository that
can be imported by multiple frameworks.

 It should be mounted intentionally, for
example as a Git submodule or standalone nested repository.

 The framework root
remains its own repository.

 `packages/` is reserved for normal app/vendor
packages from the host ecosystem.



`logicn-devtools-*` packages are development-only inspection and assistant-context
packages.

 `logicn-tools-*` packages are broader diagnostics, benchmark or release
utilities that may run in development or staging.

 Neither family should be
required by production runtime installs.



The proposed long-term application layout separates host ecosystem dependencies
from LogicN dependencies:

```text
package.

json
package-logicn.

json
logicn.

lock.

json
packages/
packages-logicn/
```

`package-logicn.

json` should describe selected LogicN packages and profiles.


`logicn.

lock.

json` should lock versions, source refs, checksums and profile
selection.

 This is a planned package-management boundary; current beta tooling
does not yet resolve LogicN packages from those files.



`package.

json` and NPM remain host ecosystem tooling only.

 In the current beta,
they may run JavaScript/TypeScript prototype checks, host adapter tests and
generated JS/TS interop packaging.

 They must not define the LogicN package graph,
runtime profiles, compiler target policy or production package overrides.


`logicn-core-config` owns validation for this boundary so package resolution policy
does not leak into normal NPM manifests.



## Package Layers

```text
LogicN Core
  language/compiler/type system/effects/memory/compute

LogicN Compiler
  parser, checker pipeline, core syntax safety scan, IR, diagnostics, source
  maps and compiler reports

LogicN Runtime
  execution engine for compiled or checked LogicN code

LogicN Security
  SecureString helpers, fail-closed redaction, deny-precedence permission models
  and security report contracts

LogicN Config
  project configuration, environment modes and production policy loading

LogicN Reports
  shared report schemas and report-writing contracts

LogicN Logic
  Tri operations, explicit conversion policy, LogicN validation, Decision,
  RiskLevel, Omni logic and multi-state truth tables

LogicN Vector
  vector values, dimensions, lanes, operations and vector reports

LogicN Compute
  compute planning, capabilities, budgets, effects and target selection

LogicN AI
  target-neutral AI inference, model metadata, safety policy and reports

LogicN Low-Bit AI
  low-bit / ternary model references, backend selection and CPU inference plans

LogicN Agent
  supervised AI agent definitions, tool permissions, task groups and reports

LogicN Neural
  neural models, layers, inference and training boundary contracts

LogicN Neuromorphic
  spike trains, event signals and spiking model contracts

LogicN Photonic
  wavelength, phase, amplitude, optical channels and logic-to-light mapping

LogicN Target CPU
  CPU capabilities, SIMD features, memory limits, threading and fallback reports

LogicN CPU Kernels
  GEMM, GEMV, vector, matrix, low-bit and ternary CPU kernel contracts

LogicN Target Binary
  native executable target planning, platform triples, ABI constraints, future
  portable systems output staging and artefacts

LogicN Target WASM
  WebAssembly target planning, module metadata and import/export contracts

LogicN Target GPU
  GPU target planning, kernel mapping, precision and data movement reports

LogicN Target AI Accelerator
  NPU, TPU, AI-chip and passive backend profiles, precision and operation plans

LogicN Target Photonic
  photonic backend target plans and optical I/O interconnect planning

LogicN Secure App Kernel
  request lifecycle, validation, security, auth, rate limits, jobs and reports

LogicN API Server
  HTTP listening, request normalisation, route manifest loading, safe responses

LogicN CLI
  developer commands for check, build, run, serve, reports, routes and tasks

LogicN Tasks
  safe typed project automation with declared effects and permissions

LogicN Benchmark
  development diagnostics for logic, CPU, GPU, low-bit fallback and safe reports

LogicN Project Graph
  project graph maps for packages, docs, policies, reports and AI assistance

LogicN Developer Packages
  optional staging, diagnostics, generators and experiments outside production
  install paths

LogicN Standard Packages
  HTTP adapters, SQL adapters, Redis queue, OpenAPI generator, JS/WASM generators

LogicN Full Frameworks
  web frameworks, CMS, admin UI, frontend adapters, ORM and template systems
```

The Secure App Kernel is a partial framework layer.

 It enforces safe runtime
boundaries, but it must not become a full Laravel, Django, React or WordPress
style framework.



`logicn-framework-api-server` is the built-in HTTP transport package for API services.

 It
serves HTTP, loads route manifests, applies server-level limits and passes
normalised requests into `logicn-framework-app-kernel`.

 It must not own auth decisions,
business logic, ORM design, CMS features or frontend rendering.



Browser rendering belongs in the `logicn-web` package family.

 `logicn-web-render`
owns the typed browser rendering pipeline from validated API response to typed
state, safe HTML, state diffing, streaming batches and render reports.


`logicn-web-state`, `logicn-web-components`, `logicn-web-router` and
`logicn-web-events` own focused client-state, component, route and event
contracts.

 `logicn-data-json` owns JSON validation, `logicn-data-html` owns
SafeHtml and sanitization policy, `logicn-core-security` owns browser secret and
HTML security policy, and `logicn-target-js` plus `logicn-target-wasm` own
browser-compatible output planning.

 This keeps LogicN able to compile typed UI
contracts to browser JavaScript/WASM without turning `logicn-core`, the API
server or the app kernel into a frontend framework.



LogicN API design is route-first and contract-first.

 Traditional MVC controllers
must not be required by the core language, app kernel or API server.

 Routes,
typed requests, typed responses, policies, declared effects, actions/handlers
and generated route reports are the secure API core.

 Controller-style grouping
may exist later as optional framework sugar only when it compiles into the same
secure route graph and does not hide auth, CSRF, object access, idempotency,
validation, limits, audit or effects.



LogicN may support optional thin Domain-Driven Design for business applications,
but it must not force heavyweight enterprise DDD.

 Business meaning can live in
`domain/`, application use cases in `flows/`, external systems in
`infrastructure/`, routes in `api/`, runtime controls in `policies/` and reports
in `reports/` when that structure adds clarity.

 Domain code should be pure by
default and denied from database, network, secret, file, cache and LLM effects
unless a reviewed policy says otherwise.

 DDD does not replace LogicN security,
memory or compute rules.

 The full guidance is in `docs/DOMAIN_DRIVEN_DESIGN. md`.



`logicn-core-cli` is the developer command tool.

 It coordinates compiler, runtime, API
server and task packages, but it must not own application behaviour.



`logicn-core-tasks` is the safe automation layer.

 It runs typed tasks with declared
effects and permissions.

 Raw shell is disabled by default and should only exist
later as explicit unsafe compatibility.



`logicn-tools-benchmark` is developer diagnostics.

 It should test correctness,
predictability, target fallback and privacy-safe reporting across normal
machines, CPU-only systems, GPU systems and future accelerator targets.

 It must
not run automatically in production, and light mode must stay bounded so it is
safe for ordinary development machines.



`logicn-devtools-project-graph` is developer tooling for architecture inspection and AI
assistant context.

 It may generate graph JSON, an HTML view, a graph report and
an AI map, but it must not become a source of truth for compiler validation,
runtime enforcement or security decisions.



Developer-only packages should be resolved through an explicit development
profile.

 Production lockfiles, runtime package manifests and application
deployments should not pull `logicn-devtools-*` or development-only `logicn-tools-*`
packages unless a maintainer opts into a development or staging mode.


Production boot/profile policy must additionally default-disable
`logicn-tools-benchmark` and `logicn-devtools-*`.

 If one is included in a production
build, `logicn-core-config` should require an explicit production package override
with a reason and expose that override in the runtime handoff and reports.

LogicN startup should use verified boot profiles for production.

Route graphs, policy graphs, schema validators, effects maps, package graphs
and target plans should be generated at build/check time where possible. Boot
should verify artefact hashes, load the smallest safe production surface and
defer optional AI, search, report, graph and benchmark packages until after
readiness.

Fast response should be treated as a request-path architecture concern.

The API server and app kernel should combine precompiled route dispatch,
prebuilt validators, warmed security policy tables, bounded worker pools,
inbound transport policy, outbound connection pools and network performance
reports. Keep-alive and pooling must remain policy-controlled and must not
bypass auth, validation, TLS, rate limits, body limits, timeout policy,
backpressure, secret-safe logging or audit requirements.



Deployment auto-configuration should be profile-driven and target-aware.


Deployment declarations record portable intent, while local machine profiles,
runtime capability profiles, tuning results and deployment secret metadata stay
out of Git.

 Production first boot should detect operating system, architecture,
CPU features, container status and memory limits before selecting runtime and
compute settings.

 Production traffic must wait for deployment gates, readiness
checks and smoke tests, with rollback metadata and deployment reports emitted
for human and AI review.

 The full model is documented in
`docs/DEPLOYMENT_AUTOCONFIG. md`.



Finance, electrical and OT packages are archived post-v2 domain planning.

 They
must not be part of active v1 package resolution, compiler targets or build
reports.

 Any future restoration must start with a new design review because
finance and OT/electrical domains carry regulatory, protocol correctness,
safety and cybersecurity requirements beyond the v1 language scope.



`logicn-core-logic` owns logic semantics such as `Tri`, `LogicN` and Omni.


The first concrete logic contract provides deterministic Tri operations,
explicit Tri-to-Bool conversion policy, LogicN definition validation, state
bounds checks and truth-table diagnostics.

 This blocks common failure modes:
unknown values silently becoming true, malformed widths escaping into reports,
duplicate state names hiding policy errors and incomplete truth tables masking
unhandled states.


`logicn-core-photonic` owns photonic concepts, representation models and simulation
vocabulary.

 Photonic mappings may consume logic states, but logic semantics stay
in `logicn-core-logic`, and backend target planning stays in `logicn-target-photonic`.



`logicn-core-vector` owns vector, matrix and tensor value concepts.

 `logicn-core-compute` owns
compute planning and target selection.

 `logicn-ai` owns generic AI inference
contracts and safety policy.

 `logicn-ai-agent` owns supervised AI agent definitions,
tool permissions, task groups, merge policies and reports.

 `logicn-ai-neural` owns
neural-network model, layer, inference and training boundaries.


`logicn-ai-neuromorphic` owns spike/event-driven model contracts.

 `logicn-ai-lowbit` owns
low-bit and ternary model references, backend selection and CPU inference
plans.

 `logicn-target-cpu` owns CPU capability and fallback planning, while
`logicn-cpu-kernels` owns optimized CPU kernel contracts.

 `logicn-target-native`,
`logicn-target-wasm`, `logicn-target-gpu`, `logicn-target-ai-accelerator` and
`logicn-target-photonic` own target-specific planning for native executable,
WebAssembly, GPU, AI accelerator, optical I/O and photonic backends.

Portable systems output is a generated backend direction, not normal application
source style. The architecture should preserve a split between the LogicN app
layer, which owns APIs, JSON, security policy and business flows, and a future
systems layer, which may own runtime internals, native ABI interop, layout-safe
buffers and accelerator bindings. Native ABI bindings must remain explicit,
source-mapped and reportable.

The Machine Profile Bridge is the planned runtime/tooling layer between
high-level LogicN source and machine-specific execution. It should detect local
capabilities, write local uncommitted capability profiles, specialise boot/main
runtime settings for the deployment machine and report every adapter, fallback
and permission decision. It must not make application source look like low-level
systems code.

Official draft wording for low-level boundaries is `layout native` and
`interop native`, with a required ABI declaration such as `abi c`, `abi wasm`,
`abi system` or `abi plugin`. The category is native; the ABI is explicit.


`logicn-tools-benchmark` may consume these packages to test target behavior, but target
capability semantics stay in the target packages.



AI accelerator support is passive and vendor-neutral.

 LogicN source should prefer
`ai_accelerator`; concrete devices such as Intel Gaudi 3 are backend profiles in
`logicn-target-ai-accelerator`, selected by config, adapter policy or capability
detection.

 The first practical integration path should use controlled adapters
over existing AI frameworks rather than a native LogicN compiler backend.

 Reports
should record backend profile, framework adapter, precision, memory tier,
topology and fallback.



Optical I/O is different from photonic compute.

 LogicN should model Intel Silicon
Photonics, OCI-style devices, optical Ethernet, co-packaged optics and photonic
interconnects as high-bandwidth deployment capabilities for moving data between
CPUs, GPUs, accelerators, memory pools and storage.

 They are not a photonic CPU
target, and normal developers should not control raw light directly.


`logicn-core-compute` owns the `optical_io` target selection and data-movement
cost model, while `logicn-core-network` owns network policy and
`logicn-target-photonic` owns optical I/O planning reports, topology hints,
fallback paths and transfer-format recommendations until a future
`logicn-io-optical` package is split out.

 This lets LogicN optimize data
locality, tensor streaming, schema-compressed transfers, accelerator placement,
energy-aware movement and remote memory safety without pretending that optical
I/O performs normal application computation.



Neural networks are typed compute workloads, not normal app syntax.

 LogicN can
define model, inference and training boundaries through `logicn-ai-neural`, while
tensor shapes stay in `logicn-core-vector` and target selection stays in `logicn-core-compute`.


Parallel AI agents are supervised orchestration workloads, not uncontrolled
background processes.

 Agent control, tool permissions and merge policies belong
in `logicn-ai-agent`; structured concurrency and cancellation belong in `logicn-core-runtime`;
heavy inference or vector work should still go through `compute flow` and
`logicn-core-compute`.


The multi-agent runtime must treat agents as untrusted workers.

 Agents exchange
typed messages through a runtime-controlled bus, use tools through a gateway,
receive secrets only through secret-guard operations, run under visibility,
memory, cache and sandbox policy, and require human approval before dangerous
actions are applied.

 The runtime must generate audit reports for agent calls,
tool use, proposed file changes, cache decisions, policy violations and human
approval requirements.

 The full model is documented in
`docs/MULTI_AGENT_RUNTIME. md`.


Passive LLM caching belongs to provider-neutral AI contracts, not ad hoc app
code.

 `logicn-ai` should define cache policy, strict key material, typed output
validation and provider-neutral cache behavior; `logicn-core-security` owns
secret/privacy checks; `logicn-core-reports` owns shared cache report shapes; and
runtime/provider adapters own storage and execution details.

 Cache use must be
safe to bypass, denied for secrets and sensitive raw data by default, invalidated
by relevant model/schema/policy/source changes, and reported without exposing
prompt text or secret values.

 See `docs/PASSIVE_LLM_CACHE. md`.


Low-bit AI is a CPU fallback path for AI inference, not a core language feature.


When a compute policy requests AI inference, LogicN can prefer AI accelerator, GPU
or NPU targets and fall back to `low_bit_ai` or CPU when the model, backend and
capability checks pass.

 BitNet may be selected as the backend today, but LogicN
source syntax should remain generic so future low-bit standards can replace it.


Target selection reports must record the selected backend, fallback reason,
token and memory limits, thread limit and warnings.



`logicn-core-security` owns shared security primitives and report contracts.

 Runtime auth
and API policy enforcement remain in `logicn-framework-app-kernel`.

 `logicn-core-config` owns
configuration loading contracts, and `logicn-core-reports` owns shared report shapes.


Reusable security decisions deny by default, matching deny grants take precedence
over matching allows and permissive default or wildcard models are diagnosed.


Redaction fails closed by default when input or rules cannot be trusted, so
reports do not leak raw secrets because a rule was malformed.



`logicn-core-config` validates project configuration, resolves environment modes and
produces runtime handoff objects with structured diagnostics.

 It represents
environment variables by safe references only: names, required flags, secret
flags, scopes and optional non-secret defaults.

 Production strictness policy
checks and default-disabled production package checks belong here, while secret
protection and redaction remain in `logicn-core-security`.



Controlled recovery belongs across language, runtime and report layers.


`logicn-core` may describe resilient flow syntax direction, but `logicn-core-runtime` owns
supervision, cancellation, retry scheduling and checkpoint/resume hooks.


`logicn-core-reports` owns processing report shapes for partial success, retries,
quarantine and failure summaries.

 `logicn-framework-app-kernel` should still prefer
transactions, rollback, idempotency and hold-for-review for security-sensitive
API workflows.



Structured Await belongs across the same boundaries.

 `logicn-core` owns `await`,
`await all`, `await race`, `await stream`, queue-await syntax, effect checks and
compiler diagnostics.

 `logicn-core-runtime` owns scheduling, scoped child tasks,
timeout enforcement, cancellation propagation, race policy and stream
backpressure.

 `logicn-framework-app-kernel` owns request scopes, route limits,
queue/job handoff policy and audit events.

 `logicn-core-reports` owns shared async
report shapes so compiler, runtime and kernel facts can be emitted consistently.


Normal LogicN developers should use Structured Await forms rather than direct
future/promise management.



Storage-aware performance is a tooling/runtime concern, not direct hardware
support.

 `logicn-core` owns language rules for streaming large data, read-only
views, explicit clone/copy-on-write and conservative cache semantics.


`logicn-core-compiler`, `logicn-core-cli` and `logicn-devtools-project-graph` may use
storage facts for incremental compilation, IDE indexes and project graph scans.


`logicn-core-runtime` may use storage facts for bounded file I/O and safe temporary
storage.

 `logicn-core-reports` owns storage and build-cache report shapes.

 Hardware
details may be unavailable, so every storage-aware optimization must have an
unknown-storage fallback and must not depend on cache correctness.



`logicn-framework-app-kernel` should not be renamed to `logicn-core-runtime`.

 A future `logicn-core-runtime`
package should execute compiled or checked LogicN code.

 The app kernel should
remain the secure application/API boundary that controls validation, auth,
idempotency, limits, jobs and runtime reports.



## Repository Boundaries

The current template keeps all files in one root Git repository while the
package boundaries are still being shaped.



Later, split reusable LogicN packages into their own `packages-logicn/` repository:

```text
light-framework/.

git
light-framework/packages-logicn/.

git
```

This is appropriate when the same packages need to be imported into different
framework repositories.

 At that point, the root framework repository should
treat `packages-logicn/` as an external dependency, not as ordinary tracked child
files.



## Checked Run Smoke Tests

The framework layer can be exercised without compiling by running LogicN core
checked Run Mode against `.

lln` test fixtures.



```text
packages-logicn/logicn-framework-app-kernel/tests/
`-- hello-world.

lln
```

The current smoke test runs through the LogicN core prototype:

```bash
npm.

cmd --prefix packages-logicn/logicn-framework-app-kernel run test:hello
```
