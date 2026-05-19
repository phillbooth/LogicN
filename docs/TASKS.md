# Tasks

## Phase 1: Planning

- [x] Update workspace documentation for the `packages-logicn/logicn-core/` language package move
- [x] Mark the current workspace version as beta rather than a stable release
- [x] Document that maintained repo structure takes precedence over generated
  document suggestions
- [x] Document the proposed `package-logicn.json`, `logicn.lock.json` and
  `packages-logicn/` package split
- [x] Add grouped `packages-logicn/logicn-finance-core` beta package scaffold
- [x] Add F# comparison and LogicN positioning guidance
- [x] Split partial framework guidance into `packages-logicn/logicn-framework-app-kernel/`
- [x] Add LogicN logic, compute type and secure runtime future-support proposal
- [x] Add `packages-logicn/logicn-framework-api-server/` HTTP API serving package documentation
- [x] Add CSRF protection policy for cookie-authenticated state-changing routes
- [x] Add API response/error-handling style guidance for `try`/`catch`,
  `match`, `Result<T, E>` and route response contracts
- [x] Add app crash-handling guidance for crash policies, route boundaries,
  structured crash reports, checkpoints and supervised workers
- [x] Add environment secret handling guidance for `Secret<T>`, taint tracking,
  safe sinks, scope/lifetime rules, LLM/cache denial and secret reports
- [x] Add memory hierarchy and reliability guidance for cache-aware layout,
  L2/L3 reporting, IDE warnings and ECC-aware deployment policy
- [x] Add server platform support guidance for Nginx/Apache/Caddy reverse proxy
  generation, Node.js targets, Express adapters and LogicN-native API serving
- [x] Add secure fast routing guidance for compiled route graphs, route
  manifests, object/property authorization, effects and resource limits
- [x] Add secure HTTP response guidance for typed response contracts, security
  headers, cache/cookie policy, safe redirects, CSP and response reports
- [x] Document route-first API policy and controller-style grouping as optional
  framework sugar rather than a core LogicN concept
- [x] Document optional thin DDD guidance for domain, flow, infrastructure and
  policy boundaries without making DDD mandatory or weakening security
- [x] Add financial markets runtime safety design note
- [x] Add secure web runtime positioning
- [x] Confirm `logicn serve` / secure web runtime as the main v1 milestone,
  with a simple portable build target as the secondary v1 milestone
- [x] Document the current Node-hosted runtime position and standalone runtime
  roadmap
- [x] Add network and Ethernet I/O positioning plus `logicn-core-network` package
- [x] Add language-core maturity roadmap for missing compiler/runtime work
- [x] Add compliance and privacy framework docs plus `logicn-compliance-*`
  package scaffolds
- [x] Add data-processing framework docs plus `logicn-data-*` package scaffolds
- [x] Add typed database model/query/response docs plus `logicn-data-db` and
  `logicn-db-*` package scaffolds
- [x] Add typed browser rendering docs plus `logicn-web-*` and `logicn-target-js`
  package scaffolds
- [x] Add optical I/O and Intel Silicon Photonics design note
- [x] Add passive AI accelerator and Intel Gaudi profile design note
- [x] Add electrical infrastructure and OT package planning note
- [x] Archive finance, electrical and OT package scaffolds outside the active
  workspace until post-v2 package planning resumes
- [x] Add a core foundation roadmap that gates future work on syntax, memory,
  examples, parser, checker, CPU execution, WASM planning and reports
- [x] Complete `docs/REQUIREMENTS.md`
- [x] Complete `docs/DESIGN.md`
- [x] Document Kubernetes as an optional deployment target without creating the
  locked enterprise Kubernetes package
- [x] Add Learning Mode design for students, children, teachers and beginners
- [x] Add layered documentation structure for framework, contracts, reports and
  rules
- [x] Add Knowledge Base concept note for the documentation layer model
- [x] Document the LogicN Architecture Charter as the top-level identity for
  security-first, auditable, governed execution
- [x] Document priority categories for non-negotiable rules, core language
  rules, core concepts, platform concepts, design rules and future research
- [x] Document the core `data -> flow -> permission -> boundary -> report` model
- [x] Document developer-friendly permissions as the simple surface over
  capabilities, effects, policies, audit and reports
- [x] Document first-class layered policy architecture and policy report
  outputs
- [x] Document model views and data blocks as the safe simplification for
  model/request/response concepts
- [x] Add a Hello World API pattern using data, flow, permission, route and
  report concepts
- [x] Document encapsulation as controlled data movement through secure flows,
  classification, response contracts, capabilities, effects, scoped lifetimes,
  package exports, safe mutation and reports
- [x] Document models as classified internal security contracts with
  relationships, mutation rules, storage separation and model report targets
- [x] Document permissions, capabilities and actors as the developer-facing
  authority model
- [x] Add dedicated capability concept and permission/capability report docs
- [x] Clarify capabilities as boundary-wide actor authority separate from code
  effects
- [x] Document LogicN's software-as-declared-intent positioning
- [x] Document benchmark success and result interpretation rules for
  compute-mix validation and timed throughput scoring
- [x] Document startup and boot warmup as verified boot-profile planning
- [x] Document fast response and keep-alive as policy-controlled request-path
  optimisation
- [x] Add detailed concept map under the five-part LogicN core model
- [x] Add framework docs for routes, classification, context, scopes/lifetimes,
  errors, packages and tests
- [x] Document boundary extension concepts for events, repositories/storage and
  adapters/connectors under the five-part model
- [x] Document explicit polymorphism through contracts, adapters, variants and
  constrained generics while excluding hidden inheritance-style behaviour
- [x] Document no-inheritance and explicit-security-by-default rules
- [x] Document `_ => { ... }` match catch-all branches and safe fallback rules
- [x] Document LogicN Securely Governed Runtime principles and trust zones
- [x] Document AI compute plans as typed, governed runtime work
- [x] Document verified fast paths as leased, auditable execution signatures
- [x] Document AI self-modification governance and capability attenuation
- [x] Document deny-by-default risk features and complexity features to leave
  out of the core runtime
- [x] Document scoped vaults as controlled runtime state instead of global
  variables
- [x] Document scoped vaults as a fast response mechanism with typed owner,
  permission, TTL, sensitivity and report rules
- [x] Document boundary safety as the first LogicN proof target
- [x] Document photonic resolution rules for optical/photonic compute outputs
- [x] Document local AI review as advisory tooling where compiler checks remain
  authoritative
- [x] Document local low-bit AI review as advisory report explanation, not proof
- [x] Document MCP as a controlled AI/tool boundary under the
  `data -> flow -> permission -> boundary -> report` model
- [x] Document quantum readiness as post-quantum security first and quantum
  compute target planning later
- [ ] Complete `docs/ARCHITECTURE.md`
- [ ] Complete `docs/SECURITY.md`

## Phase 2: App Setup

- [ ] Create app entry files in `packages-logicn/logicn-framework-example-app/`
- [ ] Add app config
- [ ] Add environment schema
- [ ] Add basic route/module structure

## Phase 3: Core Features

- [ ] Add feature 1
- [ ] Add feature 2
- [ ] Add feature 3

## Phase 4: Testing

- [x] Add app-kernel hello-world checked Run Mode test
- [x] Add app-kernel vector, sum, decimal and JSON checked Run Mode fixtures
- [x] Add package scaffolds for `logicn-core-cli`, `logicn-core-tasks`, `logicn-core-logic` and
  `logicn-core-photonic`
- [x] Add package scaffolds for `logicn-core-vector`, `logicn-core-compute`,
  `logicn-target-native` and `logicn-target-photonic`
- [x] Add package scaffolds for `logicn-core-compiler`, `logicn-core-runtime`, `logicn-core-security`,
  `logicn-core-config`, `logicn-core-reports`, `logicn-target-wasm` and `logicn-target-gpu`
- [x] Add package scaffolds for `logicn-ai`, `logicn-ai-lowbit`, `logicn-target-cpu` and
  `logicn-cpu-kernels`
- [x] Add package scaffold for `logicn-ai-agent`
- [x] Add package scaffolds for `logicn-ai-neural`, `logicn-ai-neuromorphic` and
  `logicn-target-ai-accelerator`
- [x] Add package scaffold for `logicn-devtools-project-graph`
- [x] Add package scaffold for `logicn-tools-benchmark`
- [ ] Add runtime contract implementation for governed execution plans
- [ ] Add runtime contract implementation for verified fast path signatures
- [ ] Add runtime contract implementation for AI compute plan hooks
- [ ] Add agent contracts for AI-generated code quarantine
- [ ] Add agent contracts for capability leases and attenuation
- [ ] Add agent contracts for immutable AI audit logs
- [ ] Define future MCP AI/tool boundary contract schemas after core
  permission, effect, vault and report contracts stabilise
- [ ] Define capability boundary and grant report schemas
- [ ] Define policy definition, index, effective, conflict and AI-summary report
  schemas
- [ ] Define crypto inventory and post-quantum readiness report schemas
- [x] Add TODO documents for `logicn-framework-api-server` and `logicn-framework-app-kernel`
- [x] Add README and TODO documents for `packages-logicn/logicn-framework-example-app`
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Add manual test checklist
- [ ] Confirm error handling
- [ ] Add beginner examples for explicit Hello World API and model-view response
  projection

## Phase 5: Deployment

- [x] Complete deployment documentation
- [x] Document deployment auto-configuration, target detection, runtime
  capability profiles, gates, readiness, smoke tests and rollback reports
- [ ] Configure environment variables
- [ ] Build the app
- [ ] Deploy to staging
- [ ] Deploy to production

## Phase 6: Tooling Packages

- [x] Implement `logicn-core-cli` command integrations
- [x] Add `LogicN task` CLI integration with `logicn-core-tasks`
- [x] Implement `logicn-core-tasks` task file loading
- [x] Implement `logicn-core-tasks` dependency graph and cycle detection
- [x] Add CLI and task runner tests
- [x] Add report generation for CLI and task runs
- [x] Add filesystem and environment permission checks for `logicn-core-tasks`
- [x] Define `logicn-devtools-project-graph` project knowledge graph contracts
- [x] Define backend-neutral `logicn-devtools-project-graph` backend policy contracts
- [x] Add logicn-native `logicn-devtools-project-graph` workspace mapping support
- [x] Add `LogicN graph` query, explain and path support
- [x] Define `logicn-tools-benchmark` benchmark and diagnostics contracts
- [ ] Implement `LogicN benchmark` runner integration
- [ ] Add light benchmark report generation
- [ ] Add benchmark privacy/shareable payload checks

## Phase 7: Logic and Photonic Packages

- [ ] Define `logicn-core-logic` syntax and reports for `Tri`, `LogicN` and Omni
  - [x] Add initial Tri operations, explicit Tri-to-Bool conversion policy,
    LogicN validation, truth-table diagnostics and tests
  - [x] Add canonical Tri and Decision logic-state helpers plus tested examples
  - [x] Add bounded Omni logic contract rules
- [ ] Define `logicn-core-photonic` wavelength, phase and amplitude model
- [x] Define photonic mappings from `logicn-core-logic`
- [x] Add examples for photonic package boundaries
- [x] Add examples for logic package boundaries
- [x] Add tests for logic and photonic package boundaries
- [x] Define `logicn-core-vector` vector, matrix and tensor value contracts
- [x] Define `logicn-ai-agent` supervised AI agent orchestration contracts
- [x] Define `logicn-ai-neural` neural-network workload contracts
- [x] Define `logicn-ai-neuromorphic` spiking/event workload contracts
- [x] Define `logicn-core-compute` compute planning and target selection rules
- [x] Define `logicn-ai` generic AI inference and safety policy contracts
- [x] Document passive generic LLM and embedding cache policy with strict keys,
  typed output validation, privacy denials, invalidation and reports
- [x] Define `logicn-ai-lowbit` backend contracts for low-bit AI inference
- [x] Document zero-trust multi-agent runtime boundaries for typed messages,
  tool gateways, secret guards, sandboxing, approval gates and audit reports
- [x] Define `logicn-target-cpu` CPU capability and fallback report contracts
- [x] Define `logicn-cpu-kernels` low-bit CPU kernel planning contracts
- [ ] Define `logicn-target-native` native executable target plans
- [ ] Define `logicn-target-wasm` WebAssembly target plans
- [ ] Define `logicn-target-gpu` GPU target plans
- [x] Define `logicn-target-ai-accelerator` target planning contracts
- [x] Define Intel Gaudi 3 as a passive AI accelerator backend profile
- [x] Define NPU as a generic AI inference target with explicit fallback reports
- [x] Define `optical_io` as a high-speed interconnect/data-movement target
- [x] Expand optical I/O planning with topology, secure transfer, fallback,
  benchmark and AI-cluster data-movement rules
- [ ] Define `logicn-target-photonic` photonic backend target plans
- [ ] Define future quantum target planning rules only after core compute and
  target fallback reports are stable

## Phase 8: Core Infrastructure Packages

- [ ] Follow `docs/CORE_FOUNDATION_ROADMAP.md` before adding new active package
  surfaces
- [ ] Freeze v1 syntax and grammar around the supported examples
- [x] Clarify that LogicN's first product target is secure web runtime code,
  not low-level systems programming
- [x] Document systems-layer direction as generated backend/ABI work,
  not normal unsafe LogicN source style
- [x] Rename future native executable package direction to `logicn-target-native`
  and document `layout native` / `interop native` ABI wording
- [x] Add Machine Profile Bridge direction for local capability detection and
  runtime setup without low-level application syntax
- [x] Add a compact LogicN syntax and logic status table
- [x] Write at least 20 real `.lln` examples covering basic, intermediate and
  advanced v1 syntax
  - [x] Add the 20th core example, `logic-review-scale.lln`
- [ ] Build a parser that accepts the v1 examples and rejects post-v1 syntax
  with clear diagnostics
- [ ] Define `logicn-core-compiler` compiler pipeline contracts
  - [x] Add an initial core syntax safety scan for unsafe Tri conversions,
    non-exhaustive Tri matches, raw secret literals and unsafe dynamic execution
- [ ] Define LogicN IR as the target-independent handoff between parser/checker
  and future VM/WASM/native outputs
- [x] Define `logicn-core-runtime` execution contracts
- [ ] Define Node-hosted runtime adapter contract and host-runtime overhead
  reporting
- [ ] Commit the v1 memory model as hybrid ownership, borrowing, moves,
  bounds-checking and explicit unsafe boundaries
- [ ] Finalise `Bool`, `Tri`, `Decision`, `Option` and `Result` conversion and
  branch semantics
  - [x] Add the initial runtime contract for explicit Tri-to-Bool conversion
    policy in `logicn-core-logic`
  - [x] Add canonical `Tri` and `Decision` state definitions in
    `logicn-core-logic`
- [ ] Define standard library baseline for JSON, HTTP, files, streams, crypto
  policy, dates, money and safe strings
  - [x] Capture developer ergonomics and security lessons for the LogicN
    standard library and language-core roadmap
- [ ] Define IDE/LSP, debugger, source-map and test-framework roadmap
- [ ] Define exhaustive match, sealed variant, generic constraint and protocol
  requirements for production-readiness
- [ ] Define polymorphism effective report contracts for selected
  implementations, contract implementations, generic constraints and variant
  exhaustiveness
- [ ] Define model report schemas for model index, definitions, effective rules,
  exposure, relationships, mutations and AI summaries
- [ ] Define deterministic resource cleanup model for files, sockets, streams,
  handles, DB connections and secrets
- [ ] Define FFI/trusted module model with ownership, nullability, layout and
  audit reports
- [ ] Define native ABI and portable systems-output report contracts before
  creating a dedicated ABI or systems package surface
- [ ] Define package manager and registry design with lockfile, permissions and
  reproducible builds
- [ ] Define simple `data { model request view }` syntax status and report
  mapping after the v1 grammar freeze
- [x] Define resilient flow controlled recovery and processing report direction
- [x] Define LogicN Structured Await language, runtime, kernel and report direction
- [x] Define conservative storage-aware performance and cache planning direction
- [x] Define `logicn-core-security` primitives, redaction and permission models
- [x] Define `logicn-core-config` project config and environment mode contracts
- [x] Define `logicn-core-reports` shared report schemas
- [x] Define `logicn-core-network` network policy, TLS, backend-selection and report contracts
- [x] Add tested examples for `logicn-core-network`, `logicn-core-runtime`,
  `logicn-core-vector` and `logicn-core-photonic`

## Phase 9: Package Collection Split

- [x] Move LogicN packages from `packages/` into `packages-logicn/`
- [x] Rename ambiguous app package folder to `packages-logicn/logicn-framework-example-app`
- [x] Document package naming rules and staged rename candidates
- [ ] Decide when `packages-logicn/` is stable enough to become a reusable package
  repository
- [ ] Define `package-logicn.json` schema for LogicN package dependencies and profiles
- [ ] Define `logicn.lock.json` schema for locked LogicN package refs, checksums and
  selected profiles
- [x] Document profile-aware installer presets for web, server, agent, systems
  and future kernel project types
- [x] Use `logicn-devtools-*` and `logicn-tools-*` naming for development-only package
  families instead of a generic developer bucket
- [x] Remove stale duplicate `logicn-cli`, `logicn-compute` and `logicn-config` package
  folders after preserving the canonical `logicn-core-*` package data
- [ ] Define production versus development package resolution rules so
  production apps do not download staging packages by default
- [x] Add host package manifest boundary validation so `package.json` remains
  NPM/host tooling and LogicN package graph fields stay out of host manifests
- [x] Define production boot/profile defaults that disable benchmark and
  development-only packages unless explicitly overridden and reported
- [ ] Split `packages-logicn/` into its own Git repository
- [ ] Mount `packages-logicn/` in framework repositories as a submodule or explicit
  nested repository
- [ ] Document package import workflow for different frameworks
- [ ] Add release/versioning rules for reusable LogicN packages
- [ ] Decide whether to rename `logicn-target-ai-accelerator` to `logicn-target-ai`
- [ ] Decide whether to rename `logicn-cpu-kernels` to `logicn-kernel-cpu`
- [ ] Decide whether to rename `logicn-ai-lowbit`, `logicn-ai-neural` and
  `logicn-ai-neuromorphic` under the `logicn-ai-*` naming family
- [ ] Define first `logicn-io-*` package contracts without replacing target
  packages
- [ ] Define implementation-level compliance report schemas after core parser,
  checker and package manager contracts are stable
- [ ] Define implementation-level data-processing report schemas after core
  parser, checker and package manager contracts are stable
- [ ] Define implementation-level database model, query, response and provider
  adapter report schemas after core parser and checker contracts are stable

## Phase 10: Finance Packages

- [x] Add grouped `logicn-finance-core` package planning area
- [ ] Define `logicn-finance-core-math` deterministic decimal and money contracts
- [ ] Define `logicn-finance-core-calendar` exchange calendar and trading session
  contracts
- [ ] Define `logicn-finance-core-market-data` quote, trade, order book, candle and
  replay contracts
- [ ] Define `logicn-finance-core-fix` FIX dictionary, validation and session contracts
- [ ] Define `logicn-finance-core-audit` evidence, hash-chain, reconstruction and
  redacted bundle contracts
- [ ] Decide when finance contracts should split into standalone packages

## Phase 11: Electrical and OT Packages

- [x] Add grouped `logicn-electrical-core` package planning area
- [x] Add grouped `logicn-ot-core` package planning area
- [ ] Define `logicn-electrical-assets` contracts for panels, circuits, breakers,
  cables, loads, meters, transformers, inverters, batteries, EV chargers, UPS,
  generators, relays and sensors
- [ ] Define `logicn-electrical-monitoring` telemetry contracts
- [ ] Define `logicn-electrical-capacity` load and phase-balancing checks
- [ ] Define `logicn-electrical-energy` demand, cost, carbon and optimisation reports
- [ ] Define `logicn-electrical-maintenance` inspection and test evidence contracts
- [ ] Define `logicn-electrical-protection-records` approval, test and rollback
  evidence contracts
- [ ] Define `logicn-ot-core` read-only telemetry gateway and OT network policy
  contracts
- [ ] Define future `logicn-ot-opcua`, `logicn-ot-iec61850`, `logicn-ot-modbus`,
  `logicn-ot-mqtt` and `logicn-ot-scada` package boundaries
- [ ] Keep certified protection replacement, PLC safety replacement,
  unsupervised switching and real-time grid control out of beta scope
