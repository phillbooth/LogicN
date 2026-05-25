# Changelog

All notable changes to this app should be documented here.

## [Unreleased]

### Added

- Added coverage-driven documentation reconciliation notes across architecture,
  requirements, tasks and package docs, including explicit warnings for
  photonic enum/code conflicts, webhook canonical contracts, Tri/Decision v0.2
  shape, secret unwrap semantics and network protocol naming.

- Added the Runtime Context (Not Superglobals) Knowledge Base concept, defining
  `Runtime.Context` as the runtime-owned, read-controlled execution context that
  replaces PHP-style superglobals, with session and shared mutable state in
  governed vaults rather than global bags.

- Added the Runtime Policy Config Knowledge Base concept and requirements,
  defining a system-level configuration loaded early in the request/boot lifecycle
  (`boot/main -> Runtime Policy Config -> Package Resolver -> Governance Checks -> Governed IR -> Runtime Execution`)
  to define default environment constraints, security limits, budgets, package registry rules,
  cache rules, allowed compute targets, and AI/tool permissions, while ensuring that local
  permissions cannot exceed or override global runtime policy.
- Added the Certified Package Registry Knowledge Base concept, defining a
  governed package source for signed, versioned, capability-declared,
  policy-rated packages; registry certification levels; lockfile evidence; and
  the rule that installed/certified packages are not unrestricted authority.
- Added the Package Resolver Knowledge Base concept, defining governed package
  and module resolution before execution, with identity/version/lockfile/hash
  /signature/registry/capability/effect checks, Governed IR linking, Authority
  Control for dynamic loading and provenance reports.
- Added the Context Tagged Verified Execution Cache Knowledge Base concept,
  defining context-tagged verified plan reuse, specialist parser/IR/policy/view
  /vault/compute/schedule/audit caches, strict invalidation and the rule that
  caches remember verified work but never grant authority.
- Added the AI Understandable Architecture Policy Knowledge Base concept,
  defining LogicN docs as a knowledge map with stable concept names,
  machine-readable indexes, component responsibility metadata, ADR/decision
  expectations and canonical examples so AI tools can read architecture without
  guessing.
- Added the Security Invariants And Policy Proof Knowledge Base concept,
  defining security-aware IR, mandatory classification, immutable execution
  plans, no ambient authority, policy/business-logic separation, capability
  tokens, visible unsafe blocks, mandatory audit, signed packages, hardened mode
  and policy-proof reporting.
- Added the Trust Conversion And Data Safety Knowledge Base concept, defining
  `safe`/`unsafe` value trust, inert unsafe values, approved
  `validate`/`guard`/`sanitize` conversion, safe-only contextual `encode.*`
  output and typed query interpolation denial.
- Added the Standard View Behaviour Knowledge Base concept, defining that common
  view exposure rules such as private owner-only exposure should be declared
  once in the runtime standard and inherited by permission references, with
  widening requiring explicit policy review and reports.
- Added the Built-In View Levels Knowledge Base concept, defining `public`,
  `internal`, `private`, `confidential`, `secret`, `restricted` and
  `regulated` as standard runtime/language view levels under `Runtime.View`.
- Added the Multi-Actor Audit Events Knowledge Base concept, defining how audit
  events should represent affected, delegated, source, system and AI actors
  while preserving runtime-owned `primary_actor` attribution.
- Added the Audit Actor Model Knowledge Base concept, defining automatic runtime
  actor attribution for audit events, permission-based audit emission,
  runtime-owned primary actor identity, multiple actor roles, manual metadata
  limits and spoofing warnings.
- Added the Field Read Rules Knowledge Base concept, documenting explicit field
  allow lists as the safest database read syntax and defining
  `fields: all except [...]` plus safer `fields: all current except [...]` as
  visible broad-read modes requiring warnings, resolved field reports and
  future-field leakage controls.
- Added the Secure By Default Syntax Principles Knowledge Base concept,
  documenting deny-by-default permissions, explicit risky-action authority,
  input contracts, output views, ownership checks, typed database access,
  target-aware encoding, secret-safe syntax, resource budgets, audit
  declarations, governed context and denied unsafe defaults as syntax/logic
  principles rather than only runtime checks.
- Added the Explicit Mutation And Vault Writes Knowledge Base concept,
  clarifying that local and vault state changes must be visibly marked with
  `mut`, that `mut foo++` is preferred over `foo++`, and that
  `mut secure.session[key] = value` is the preferred v0.1 source form over
  direct `SessionVault.write(context, ...)` calls.
- Added the Preplanned Startup And Fast Response Knowledge Base concept,
  connecting verified boot profiles, deterministic boot snapshot bundles,
  phased warmup, safe startup caches, precompiled app-kernel decisions,
  keep-alive transport policy, outbound connection pooling and network
  performance reports.
- Added the Variable Mutation Vault Design Knowledge Base concept, defining
  `let`, explicit `mut`, `readonly`, `vault`, `secure` and `Secret<T>` as the
  v0.1 direction while deferring `const` until a distinct compile-time constant
  need exists.
- Added the Data Visibility View Terminology Knowledge Base concept, defining
  `view` as the preferred field-level data exposure term and documenting the
  transition from `classify: public` to `view: public` for model fields and
  permission exposure rules.
- Added Runtime Terminology Evolution and Terminology And Naming Philosophy
  Knowledge Base concepts, defining LogicN as a governed compute orchestration
  platform and standardizing responsibility-based runtime terminology such as
  Runtime Command, Authority Control, Runtime Logistics, Resource Deployment
  Balancer, Execution Coordination Scheduler and Result Assembler.
- Added the Compute Balancer Knowledge Base concept, defining approved-only
  hardware target selection based on CPU/GPU/NPU/TPU/VPU/ASIC/FPGA
  availability, memory/VRAM pressure, thermal pressure, queue depth, power
  state, device trust and safe fallback.
- Rewrote the root and `logicn-core` README introductions to describe LogicN
  as a governance-first programming language, runtime and execution
  architecture for secure heterogeneous compute orchestration, including the
  development/use selling point of intent-driven governed execution plans and
  audit proof.
- Added the Governed Execution Director Knowledge Base concept and
  requirements defining a runtime planning layer that identifies data, checks
  contracts and policy, builds verified execution plans, selects compute and
  memory paths, uses passive modules, supports justified execution and records
  audit proof without becoming hidden authority.
- Added the Compile-Time Metadata Reflection Knowledge Base concept and
  requirements defining LogicN reflection as compile-time metadata for proof,
  tooling, audit mapping, schema/test generation, AI indexing and Governed IR
  creation, while denying runtime object inspection, string-based invocation
  and dynamic behaviour or permission mutation.
- Added the Memory Pressure Security Knowledge Base concept and requirements
  for treating low memory as a security event, including explicit memory
  budgets, fallible allocation, backpressure before out-of-memory,
  request/worker isolation, priority-based load shedding, deterministic
  cleanup and secret-safe OOM reports.
- Added Untrusted File And Asset Processing and Bit Width And Base64 Asset
  Policy Knowledge Base concepts, defining uploaded files, embedded assets and
  base64 data as untrusted executable-adjacent content requiring quarantine,
  isolated parsing, sanitisation, no active content by default, explicit
  numeric boundary checks and reportable memory/security policy decisions.
- Added the AI As Untrusted Reasoning Worker Knowledge Base concept and
  requirements for typed AI tasks, evidence-backed claims, sandboxed ML
  workers, explicit tool permissions, anti-hallucination reports and runtime
  enforcement that prevents AI output from becoming authority by default.
- Added the Generative Runtime Mapper Knowledge Base concept and planning
  requirements for an observational, AI-readable runtime/code/security mapper
  that can produce facts, heat maps, optimisation opportunities and reviewed
  suggestions without silently mutating runtime state or source code.
- Added developer-friendly permission, model-view data block, Hello World API
  pattern and local low-bit AI review Knowledge Base concepts, clarifying how
  LogicN can simplify syntax without weakening internal safety checks.
- Added Policy Architecture docs covering layered source-visible policies,
  policy placement rules, compiled policy checks and policy index/definition/
  effective/conflict/AI-summary report targets.
- Expanded AI Self-Modification Governance with the authority-kernel model,
  capability leases, immutable trust-root protection, read/write capability
  separation and AI authority report targets.
- Added Malicious Data And Exploit Resistance docs covering data-not-authority,
  bounded execution, OWASP/CWE baseline exploit classes, safe sinks,
  taint-flow, resource-budget and hardware-risk report targets.
- Added Specialist AI Hardware Compute Targets docs covering CPU, GPU, NPU,
  TPU, VPU, FPGA, AI ASIC and future optical/photonic hardware as governed
  compute targets with capability, data sensitivity, fallback and audit rules.
- Added the LogicN Architecture Charter Knowledge Base concept as the top-level
  identity statement for security-first, auditable, AI-readable and governed
  execution.
- Added Node-Hosted Runtime Roadmap documentation clarifying that current
  practical LogicN web/API execution runs through Node.js while the core remains
  target-independent for future VM, WASM and native runtime work.
- Clarified the capability model as boundary-wide actor/package/flow/tool
  authority separate from code effects, including capability boundary checks,
  grant rules and report targets.
- Added MCP AI Tool Boundaries documentation, including the Knowledge Base
  concept, framework boundary guidance, MCP report targets, token-boundary
  rules, no generic vault access and requirements that MCP tools, resources and
  prompts go through typed, permissioned, audited LogicN boundaries.
- Added Quantum Readiness documentation covering post-quantum crypto policy,
  crypto inventory reports, `Random` versus `SecureRandom`, isolated quantum
  types, measurement-before-flow rules and future quantum target planning.
- Added typed contract implementations and tests for core package completion:
  `logicn-core-network` now has policy, TLS, endpoint, backend-selection and
  report contracts; `logicn-core-runtime` has context, result, effect-decision
  and report helpers; `logicn-core-vector` has vector/matrix/tensor validation
  and reports; `logicn-core-photonic` has optical signal, mapping, plan and
  report validation.
- Added tested example contract payloads for `logicn-core-network`,
  `logicn-core-runtime`, `logicn-core-vector` and `logicn-core-photonic`.
- Added `logicn-core-cli` integrations for `check`, `build`, `run`, `serve`,
  `reports`, `security:check` and `routes` by delegating to the current
  `logicn-core` prototype compiler.
- Added canonical `Tri` and `Decision` logic-state helpers plus a tested
  `logicn-core-logic` Decision truth-table example.
- Added NPU-as-AI-inference target planning contracts across
  `logicn-target-ai-accelerator`, `logicn-core-compute`, `logicn-ai` and
  `logicn-ai-neural`, including ONNX model profile validation, explicit
  fallback reporting, on-device/no-network checks and tensor shape validation.
- Added bounded Omni logic rules in `logicn-core-logic` and the 20th core
  `.lln` example, `logic-review-scale.lln`.
- Added `packages-logicn/logicn-core/docs/syntax-logic-status.md` with a
  compact LogicN syntax and logic status table.
- Expanded the syntax and logic status table with detailed entries for loops,
  flow modifiers, vector flows, class/object-model decisions, I/O, memory,
  package, target and tooling syntax status.
- Updated the core `result.lln` example to include explicit
  `match result { Ok(...) ... Err(...) ... }` handling.
- Added security-risk grading to the LogicN syntax and logic status table,
  including stable text grades and colour-rendering guidance.
- Moved `Not core for v1` syntax items into a dedicated bottom table in the
  LogicN syntax and logic status document.
- Added `contracts.lln` to the core examples folder and documented how LogicN
  contracts are represented through typed shapes, flow signatures, `Result`
  errors, effects and strict comments.
- Added an explicit untrusted-syntax governance rule: syntax starts untrusted
  until it is typed, effect-checked, permissioned, bounded, source-mapped,
  tested or reportable.
- Added developer ergonomics and security lessons to the LogicN runtime
  capability roadmap, requirements and core roadmap tasks.
- Added a first-class monkey-patching ban for normal LogicN code, with adapter,
  interface/protocol, pipeline, test-mock and signed-hotfix alternatives.
- Clarified LogicN's first product direction as secure web runtime code, while
  keeping low-level systems targets, embedded targets and native executable
  output as later target paths.
- Documented LogicN's systems direction: portable systems output and native ABI
  work are future generated backend/interop targets, while normal LogicN source
  remains high-level, strict, source-mapped, permissioned and reportable.
- Set `logicn serve` / secure web runtime as the main v1 milestone, with a
  simple portable build target as secondary v1 work and native executable output
  as future target planning.
- Renamed the future native executable target package direction to
  `logicn-target-native` and updated its package metadata and contracts.
- Added the Machine Profile Bridge draft for adapting checked LogicN source to
  local machine capability profiles without making application syntax low-level.
- Adopted `layout native` and `interop native` as official draft wording for
  low-level boundaries, with explicit ABI declarations such as `abi c`.
- Added the layered docs structure under `docs/framework`, `docs/contracts`,
  `docs/reports` and `docs/rules`, plus a Knowledge Base concept note for the
  documentation layer model.
- Added Priority Categories docs to classify LogicN ideas as non-negotiable
  rules, core language rules, core concepts, platform concepts, recommended
  design rules or future/research concepts before implementation.
- Added Encapsulation Model docs defining LogicN encapsulation as controlled
  data movement through secure flows, classification, response contracts,
  capabilities, effects, scoped lifetimes, package exports, safe mutation and
  reports instead of public/private visibility alone.
- Added Model Security Contracts docs defining models as classified internal
  data contracts with explicit relationships, mutation rules, storage
  separation, model report targets and AI-readable summaries.
- Added Knowledge Base concept docs for the core `data -> flow -> permission ->
  boundary -> report` model, permission/capability/actor semantics, scoped
  vaults, boundary safety proof, photonic resolution and local AI review.
- Added dedicated Knowledge Base concept docs for capabilities and software as
  declared intent, plus permission/capability report guidance.
- Added a Benchmark Success Plan concept covering compute-mix validation,
  timed-throughput scoring, warm-up state isolation, checksum interpretation,
  relative performance reporting and honest LogicN prototype-runner labelling.
- Added startup and boot warmup docs covering verified boot profiles, minimal
  production package loading, safe startup caches, phased warmup and startup
  reports.
- Added fast response and keep-alive docs covering precompiled route dispatch,
  warmed validators and policy tables, inbound transport policy, outbound
  connection pooling and network performance reports.
- Added a LogicN Concept Map Knowledge Base entry and framework docs for routes,
  classification, context, scopes/lifetimes, errors, packages and tests under
  the newer `data -> flow -> permission -> boundary -> report` structure.
- Added boundary extension concept docs for events, repositories/storage and
  adapters/connectors, keeping them under the newer `boundary` model instead of
  restoring the older flat concept structure.
- Expanded the main LogicN Concept Map with a dedicated Events section and final
  mental-model entries for events, repositories/storage and adapters/connectors.
- Added Polymorphism concept docs covering contract-based polymorphism,
  adapter-based polymorphism, union/match variants, constrained generics,
  permission-aware implementation selection and effective reports.
- Added No Inheritance And Explicit Security docs making inheritance and
  inherited authority disallowed in normal LogicN source, with composition,
  contracts, adapters, explicit views, explicit permissions, secure flows and
  effective reports as replacements.
- Added a Match Catch-All Branch concept documenting `_ => { ... }` as the
  explicit fallback branch for `match`, including webhook and security-sensitive
  handling rules.
- Added Securely Governed Runtime, AI Compute Plan and Verified Fast Paths
  Knowledge Base concepts, plus runtime package guidance and TODOs for governed
  execution plans, AI compute hooks and fast path signatures.
- Added AI Self-Modification Governance concept covering AI-generated code
  quarantine, capability leases, attenuation, approval gates, immutable AI audit
  logs and the rule that AI may request but not self-grant authority.
- Added Deny By Default Risk Features concept covering eval, shell, hidden
  network/filesystem access, globals, unsafe interop, raw pointers, monkey
  patching, policy-bypassing reflection, AI self-grants and complexity features
  to leave out of the core runtime.
- Expanded scoped vaults as the no-global-variable efficiency model, including
  vault scopes, capability-based access, `VaultRef`, safe write declarations,
  vault reports and fast response planning.
- Added framework docs for the core model, permissions, boundaries and scoped
  vaults, plus rule/report docs for boundary safety, photonic resolution, audit
  evidence and local AI review.
- Reworked `docs/README.md` into a navigation page for framework concepts,
  contract types, generated reports, rules and package-level references.
- Added `packages-logicn/logicn-core/docs/language-core-maturity-roadmap.md` to
  track missing LogicN language-core maturity items, including compiler
  pipeline, protocols, deterministic cleanup, trusted interop, package
  management, testing, async runtime, source-mapped runtime errors and standard
  library work.
- Added `packages-logicn/logicn-core/docs/compliance-and-privacy.md` plus the
  `logicn-compliance` package family for privacy, security control mapping,
  data governance, audit, retention, AI governance, accessibility, deployment
  policy and compliance report contracts.
- Moved the `logicn-compliance*` package family to
  `packages-logicn-enterprise/` so enterprise-only compliance and audit package
  contracts are no longer part of the active `packages-logicn/` workspace graph.
- Added `packages-logicn/logicn-core/docs/data-processing.md` plus the
  `logicn-data` package family for HTML, search, archive, JSON, database
  archive, streaming pipeline, memory-limit, security and data-processing
  report contracts.
- Expanded `packages-logicn/logicn-core/docs/data-processing.md` with typed
  database model, query, command, response and archive boundaries, and added
  `logicn-data-db`, `logicn-data-model`, `logicn-data-query`,
  `logicn-data-response` and initial `logicn-db-*` provider adapter scaffolds.
- Added `docs/WEB_RENDERING.md`, `logicn-web`, focused `logicn-web-*` package
  scaffolds and `logicn-target-js` for typed browser rendering, client state,
  safe HTML, streaming render and JavaScript output planning contracts.
- Added `docs/KUBERNETES_DEPLOYMENT.md` documenting Kubernetes as an optional
  deployment target with secure manifest generation, probes, secret references,
  rollout checks and enterprise-only hardened policy-pack boundaries.
- Added `docs/LEARNING_MODE.md` documenting a safe LogicN Learning Mode for
  students, children, teachers and beginners, including progressive lessons,
  friendly diagnostics, sandbox defaults, AI tutor boundaries and child-safe
  reporting.
- Added `docs/CSRF_PROTECTION.md` documenting default CSRF policy for
  cookie-authenticated state-changing routes, including token modes, Fetch
  Metadata, Origin/Referer checks, SameSite cookie policy, state-changing GET
  rejection and route-level reports.
- Added `docs/API_RESPONSE_ERROR_HANDLING.md` documenting `try`/`catch` versus
  `match`, `Result<T, E>` readability, `Http`/`AppResponses` naming, response
  helpers and route response contract checks.
- Added `docs/APP_CRASH_HANDLING.md` documenting app-kernel crash policies,
  route and worker crash boundaries, typed errors versus crashes, structured
  crash reports, checkpoints, safe logging and AI-readable crash context.
- Added `docs/ENV_SECRETS.md` documenting `.env` values as `Secret<T>` values,
  including central declaration, taint tracking, safe sinks, scope/lifetime
  rules, LLM/cache denial, hard-coded secret scanning and secret reports.
- Added `docs/MEMORY_HIERARCHY_RELIABILITY.md` documenting cache-aware memory
  layout guidance, L2/L3 cache reporting, IDE warnings and ECC-aware deployment
  reliability policy without claiming direct hardware control.
- Added `docs/SERVER_PLATFORM_SUPPORT.md` documenting Nginx, Apache and Caddy
  as reverse-proxy deployment targets, Node.js as tooling/runtime target,
  Express-style adapters as optional interop and a LogicN-native API server as
  the long-term preferred secure runtime.
- Added `docs/SECURE_FAST_ROUTING.md` documenting compiled route graphs,
  method-indexed trie dispatch, route manifests, object/property authorization,
  route effects, response filtering and resource-limit enforcement.
- Added `docs/SECURE_HTTP_RESPONSES.md` documenting typed response contracts,
  secure headers, cache/cookie policy, CSP, safe redirects, response size limits
  and response security reports.
- Added `docs/SECURE_WEB_RUNTIME_FIRST.md` to position LogicN's first milestone
  as a secure web runtime with application policy, deployment checks, package
  permissions, typed APIs, security reports and AI-safe context.
- Added `docs/NETWORK_ETHERNET_IO.md` and `packages-logicn/logicn-core-network/`
  to define LogicN network and Ethernet I/O positioning, deny-by-default
  network policy, TLS policy, backpressure, zero-copy planning, XDP/eBPF and
  DPDK adapter boundaries, deployment profiles and network reports.
- Expanded `docs/OPTICAL_IO.md` with LogicN Optical I/O Layer positioning:
  optical I/O as topology-aware, encrypted, typed data movement for AI clusters,
  accelerator links, memory pooling, fallback reports and future benchmarks,
  not raw light control or photonic compute.
- Expanded LogicN safe-networking policy to clarify that packets cannot be made
  invisible, while packet contents should be encrypted, authenticated,
  permissioned, minimised and auditable with TLS 1.3 policy, mTLS, service
  identity, plaintext fallback denial and secret-safe URL handling.
- Added `logicn-core-logic` Tri helpers, explicit Tri-to-Bool conversion policy,
  LogicN definition validation, truth-table validation and contract tests.
- Added an initial `logicn-core-compiler` core syntax safety scan for unsafe
  Tri/Decision/Bool conversions, non-exhaustive Tri matches, risky secure-flow
  unknown handling, raw secret literals and unsafe dynamic execution patterns.
- Added `logicn-core-security` validation for redaction rules and permission models,
  including fail-closed malformed redaction handling, deny precedence and
  diagnostics for default-allow or wildcard-allow permissions.
- Added `logicn-core-config` host package manifest boundary validation so
  `package.json` remains NPM/host tooling and LogicN package graph fields stay in
  future `package-logicn.json`/`logicn.lock.json` manifests.
- Documented the completed move of LogicN packages from `packages/` to
  `packages-logicn/`, with `packages/` reserved for normal app/vendor package
  space.
- Added `docs/PACKAGE_NAMING.md` with naming prefix rules, staged rename
  candidates and future `logicn-io-*` package guidance.
- Documented the current workspace as a beta prototype rather than a stable
  release.
- Documented repository-maintained structure as authoritative over generated
  document suggestions, while allowing roadmap version labels to move.
- Added `logicn-devtools-*` and `logicn-tools-*` naming for development-only, staging,
  diagnostic and experimental packages that production applications should not
  download by default.
- Added `docs/PACKAGE_LAYOUT.md` for the proposed `package-logicn.json`,
  `logicn.lock.json`, `packages/` and `packages-logicn/` split.
- Added `docs/PROFILE_INSTALLERS.md` to define one LogicN language with
  profile-aware installer presets for web, server, agent, systems and future
  kernel project types.
- Added `docs/MULTI_AGENT_RUNTIME.md` and expanded `logicn-ai-agent` guidance
  with a zero-trust multi-agent runtime model covering typed messages,
  visibility scopes, tool gateways, secret guards, sandboxing, guarded memory
  and cache, human approval gates, loop protection and audit reports.
- Added `docs/DEPLOYMENT_AUTOCONFIG.md` and expanded `docs/DEPLOYMENT.md` with
  deployment auto-configuration, target detection, runtime capability profiles,
  deployment gates, health/readiness/smoke tests, rollback metadata,
  architecture-aware compute selection and secret-safe deployment reports.
- Added `docs/PASSIVE_LLM_CACHE.md` and updated `logicn-ai`/report guidance with
  passive generic LLM and embedding cache policy, strict cache keys, typed
  output validation, privacy denials, provider-neutral stores, invalidation and
  secret-safe cache reports.
- Expanded `docs/why-controllers-not-used-in-LogicN.md` and route/API docs to
  define route contracts, typed actions/handlers, policies, effects and route
  reports as the secure API core, with controller-style grouping allowed only as
  optional framework sugar.
- Added `docs/DOMAIN_DRIVEN_DESIGN.md` to document optional thin DDD structure
  for business applications, including domain/flow/infrastructure/policy
  boundaries, pure-domain defaults, architecture reports and warnings against
  heavyweight layer-first DDD.
- Added a practical zero-trust baseline to security docs: data and behavior are
  treated as untrusted by default until validated, typed, permissioned,
  provenance-checked or policy-reviewed, with trust transitions represented in
  types, policies or reports.
- Added `docs/FINANCE_PACKAGES.md` and `packages-logicn/logicn-finance-core/` as a grouped
  beta finance package area covering finance maths, market data, FIX, audit,
  risk, pricing and desktop interoperability boundaries.
- Added `packages-logicn/logicn-core/docs/language-positioning-principles.md`
  to keep LogicN positioning focused on secure runtime behavior,
  AI-readability and target-aware planning.
- Initial documentation structure.
- Added `packages-logicn/logicn-framework-app-kernel/` as the optional partial framework
  layer for secure runtime boundaries.
- Added a checked Run Mode hello-world test fixture for the app kernel package.
- Added the LogicN logic, compute type and secure runtime future-support proposal.
- Removed active legacy extension warning comments from LogicN core documentation.
- Added `packages-logicn/logicn-framework-api-server/` documentation as the built-in HTTP API
  serving layer for LogicN App Kernel.
- Added `packages-logicn/logicn-core-cli/` as the LogicN developer command-line package scaffold.
- Added `packages-logicn/logicn-core-tasks/` as the safe typed project automation package
  scaffold.
- Added `packages-logicn/logicn-core-logic/` for `Tri`, `LogicN` and future Omni logic.
- Added `packages-logicn/logicn-core-photonic/` for photonic and wavelength hardware concepts.
- Added `packages-logicn/logicn-core-vector/` for vector value, lane and operation concepts.
- Added `packages-logicn/logicn-core-compute/` for compute planning and target selection
  concepts.
- Added `packages-logicn/logicn-target-native/` for future native executable
  target planning.
- Added `packages-logicn/logicn-target-wasm/` for WebAssembly target planning.
- Added `packages-logicn/logicn-target-gpu/` for GPU target planning.
- Added `packages-logicn/logicn-target-photonic/` for photonic backend target planning.
- Added `packages-logicn/logicn-core-compiler/` for compiler pipeline contracts.
- Added `packages-logicn/logicn-core-runtime/` for checked and compiled execution contracts.
- Added `packages-logicn/logicn-core-security/` for reusable security primitives and report
  contracts.
- Added `packages-logicn/logicn-core-config/` for project configuration and environment mode
  contracts.
- Added `packages-logicn/logicn-core-reports/` for shared report schemas and report-writing
  contracts.
- Added TODO documents for `packages-logicn/logicn-framework-api-server/` and
  `packages-logicn/logicn-framework-app-kernel/`.
- Added README and TODO documents for `packages-logicn/logicn-framework-example-app/`.
- Added CLI and task runner requirements in
  `packages-logicn/logicn-core-cli-and-logicn-core-tasks-requirements.md`.
- Added `logicn-core-config` project config parsing, environment mode loading,
  production strictness policy, safe environment variable references, runtime
  handoff contracts, examples and tests.
- Added `logicn-core-reports` shared report metadata, diagnostic summaries, build,
  security, target, runtime, task and AI guide report contracts with examples
  and tests.
- Added `logicn-core-security` SecureString references, redaction helpers, permission
  decisions, safe token/cookie/header references, crypto policy validation,
  security reports, examples and tests.
- Added `packages-logicn/logicn-ai/` for generic AI inference contracts, safety policy and
  AI inference reports.
- Added `packages-logicn/logicn-ai-lowbit/` for low-bit and ternary AI inference contracts,
  with BitNet represented as an optional backend.
- Added `packages-logicn/logicn-target-cpu/` for CPU capability, fallback and execution
  planning contracts.
- Added `packages-logicn/logicn-cpu-kernels/` for optimized CPU kernel contracts.
- Added a low-bit AI backend architecture note.
- Added `packages-logicn/logicn-devtools-project-graph/` for project knowledge graph contracts,
  graph scan policy, output manifests and AI assistant map support.
- Added local `node packages-logicn\logicn-core-cli\dist\index.js graph --out build\graph`
  run instructions for project graph generation.
- Added AI-facing instructions to consult and regenerate `build\graph` project
  graph outputs when graph data is missing or stale.
- Added `LogicN task` CLI integration for loading `tasks.lln`, listing tasks,
  resolving dependency order and running dry-run task plans.
- Added `logicn-core-tasks` task file parsing, dependency resolution, cycle detection
  and tests.
- Added task run report generation for `LogicN task`, writing
  `build/reports/task-report.json` by default with `--report-out` and
  `--no-report` controls.
- Added `logicn-core-tasks` filesystem and environment permission validation, including
  safe relative path checks and explicit environment variable permissions.
- Expanded the root `README.md` into a full workspace introduction covering LogicN
  status, core goals, package boundaries, current tooling, project graph and
  task automation.
- Reworked `docs/REQUIREMENTS.md` from app placeholders into complete
  template, package boundary, tooling, security and success requirements.
- Reworked `docs/DESIGN.md` from generic UI placeholders into a template and
  developer-experience design guide for docs, tooling, reports and future app
  UX boundaries.
- Added `packages-logicn/logicn-ai-neural/` for neural model, layer, inference and training
  boundary contracts.
- Added `packages-logicn/logicn-ai-neuromorphic/` for spike, event-signal and spiking model
  contracts.
- Added `packages-logicn/logicn-target-ai-accelerator/` for NPU, TPU and AI-chip target
  planning contracts.
- Added `docs/NEURAL_ACCELERATOR_PACKAGES.md` to document neural,
  neuromorphic, low-bit, AI accelerator and photonic package boundaries.
- Expanded `logicn-core-vector` with matrix, tensor, shape and numeric element contract
  placeholders.
- Added `packages-logicn/logicn-ai-agent/` for supervised AI agent, tool permission, task
  group, merge policy and report contracts.
- Added `packages-logicn/logicn-ai-agent-parallel-compute.md` documenting parallel AI agents,
  CPU/GPU compute separation, supervised task groups, target fallback and agent
  safety rules.
- Added `docs/RESILIENT_FLOWS.md` documenting controlled recovery, resilient
  flows, retries, quarantine, checkpoints, memory/system failure policy and
  partial success reporting.
- Added `logicn-core-reports` processing report contracts for resilient/batch flows.
- Added `packages-logicn/logicn-tools-benchmark/` for LogicN benchmark and diagnostics contracts,
  including light/full modes, target fallback checks, privacy-safe reports and
  optional future sharing payloads.
- Added a placeholder `LogicN benchmark` CLI command entry for the future benchmark
  runner.
- Added `docs/LOGICN_FINANCIAL_MARKETS.md` covering LogicN-centered financial
  market contracts, runtime direction, safety rules and adapter boundaries.
- Added `docs/OPTICAL_IO.md` documenting `optical_io` as a high-speed
  interconnect/data-movement target for Intel Silicon Photonics and OCI-style
  systems, distinct from photonic compute.
- Added `docs/AI_ACCELERATOR_TARGETS.md` documenting passive AI accelerator
  target profiles, with Intel Gaudi 3 represented as a backend profile rather
  than LogicN syntax.
- Added LogicN Structured Await documentation across core language, runtime,
  app-kernel and workspace docs, covering `await all`, `await race`, scoped
  cancellation, mandatory timeout policy, stream backpressure, queue handoff and
  async/concurrency reports.
- Added typed async/concurrency report contracts to `logicn-core-reports`.
- Added conservative storage-aware performance documentation covering SSD/NVMe/M.2
  wording, unknown-storage fallback, incremental build/IDE index planning,
  streaming large files, read-only mapping, cache bypass and cache safety rules.
- Added typed storage and build-cache report contracts to `logicn-core-reports`.
- Added production boot/profile rules that default-disable benchmark and
  development-only packages such as `logicn-tools-benchmark` and `logicn-devtools-*`,
  with explicit reported production package overrides required when policy
  allows them.
- Added `docs/ELECTRICAL_INFRASTRUCTURE.md`, `packages-logicn/logicn-electrical-core/`
  and `packages-logicn/logicn-ot-core/` for electrical infrastructure and
  operational-technology package planning, with explicit safety boundaries
  against replacing certified protection equipment, PLC safety systems, SCADA
  products or qualified electrical engineering judgement.
- Added an explicit v1 surface freeze around core syntax, core type-system
  semantics, the memory-safety model, CPU target support and WASM target support.
- Added `docs/CORE_FOUNDATION_ROADMAP.md` to sequence foundation work before
  package, domain or advanced-target expansion.

### Changed

- Renamed the generic `packages-logicn/app/` folder to
  `packages-logicn/logicn-framework-example-app/` so the package collection does not contain an
  ambiguous `app` package name.
- Updated workspace documentation and configuration to use `packages-logicn/logicn-core/`
  for the LogicN language package.
- Renamed the legacy language install script to `install-LogicN.sh`.
- Clarified that LogicN core is the language/compiler layer, while the Secure App
  Kernel is the optional runtime layer and full frameworks remain separate.
- Clarified that `logicn-framework-api-server` serves HTTP and delegates validation, auth and
  typed execution to `logicn-framework-app-kernel`.
- Documented the future split-repository layout where `packages-logicn/` can become
  its own reusable Git repository imported by multiple frameworks.
- Added simple `console.log("...")` output support to LogicN core checked Run Mode.
- Expanded `logicn-core-compute` target selection contracts with `low_bit_ai`,
  `cpu.generic`, AI inference workload planning and compute-auto selection
  reporting.
- Clarified that BitNet ternary model weights are separate from LogicN `Tri`
  semantics.
- Reworked low-bit AI target naming so LogicN source uses generic `low_bit_ai` and
  `ternary_ai` targets instead of backend-specific BitNet syntax.
- Completed initial `logicn-ai`, `logicn-ai-lowbit`, `logicn-target-cpu` and
  `logicn-cpu-kernels` contracts with validation helpers, examples and tests.
- Completed initial `logicn-core-compute` offload planning reports, low-bit AI fallback
  example and test coverage.
- Added a placeholder `LogicN graph` CLI command entry for future project graph
  generation and querying.
- Implemented the initial `LogicN graph` command to generate project graph JSON and
  a Markdown graph report from `logicn.workspace.json`.
- Clarified that project graph syntax and CLI commands are backend-neutral, with
  Graphify treated as an optional swappable backend rather than LogicN syntax.
- Expanded `logicn-devtools-project-graph` with a logicn-native workspace scanner that maps
  packages, documents, exported TypeScript contracts, package references and
  generated graph report outputs.
- Added graph query, explain and path helpers to `logicn-devtools-project-graph` and exposed
  them through `LogicN graph query`, `LogicN graph explain` and `LogicN graph path`.
- Updated workspace package mapping so `logicn-tools-benchmark` is tracked by the project
  graph and package registry.
- Added `optical_io` to compute, benchmark and photonic target planning
  contracts as an interconnect-aware data movement target.
- Added generic `ai_accelerator` planning support and an Intel Gaudi 3 backend
  profile to AI accelerator, compute and benchmark contracts.
- Narrowed the active workspace target list to `cpu` and `wasm`, with GPU, AI
  accelerator, photonic, optical I/O, low-bit AI and other advanced target work
  labelled post-v1 unless needed by core type-system semantics.
- Clarified that LogicN must not make measured speed claims until the compiler,
  memory model, runtime and benchmark methodology exist.
- Defined AI-readable as concrete syntax/tooling properties: regular grammar,
  explicit effects/imports, typed errors, source maps, stable diagnostics and
  machine-readable reports.

### Removed

- Removed stale generated-output-only duplicate package folders
  `packages-logicn/logicn-cli/`, `packages-logicn/logicn-compute/` and
  `packages-logicn/logicn-config/` after confirming the canonical `logicn-core-*` packages
  contain the current source, tests, manifests and newer contracts.
- Moved `packages-logicn/logicn-finance-core/`, `packages-logicn/logicn-electrical-core/` and
  `packages-logicn/logicn-ot-core/` to `C:\laragon\www\LogicN_Archive\packages-logicn\` and
  removed them from active workspace package resolution.

### Fixed

- Nothing yet.
