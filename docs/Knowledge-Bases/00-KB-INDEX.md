# LogicN Knowledge Base — Index

This index classifies every document in `docs/Knowledge-Bases/` by status.
Non-`.md` files (YAML, EBNF) are listed separately at the end.

---

## Active Specification Docs (current canonical)

### Language Specification — Grammar, Type System, Effects, Contracts

- arrays-and-string-operations.md — Array<T> and string syntax reference
- auto-type-inference.md — Auto keyword: compile-time type inference
- branching-model.md — if, match, pattern matching; no elseif/switch/case
- core-syntax-keywords.md — canonical keyword decisions and exclusions
- flat-flow-style.md — guard clauses, nesting depth, compiler-enforced style rule
- formal-type-system-spec.md — authoritative type system specification (Phase 5)
- generic-types.md — parameterised types: List<T>, Optional<T>, Result<T,E>
- guarded-flow-spec.md — guarded flow: effectful execution unit definition
- list-operations.md — List<T> collection type and operations
- logicn-contract-errors.md — contract errors {} section spec (Phase 10B)
- logicn-contract-full-model.md — flow contract full reference (Phase 10A)
- logicn-contract-operational-constraints.md — timeouts, retries, limits sections
- logicn-contract-privacy-observability.md — privacy {} and observability {} sections
- logicn-contracts-as-meaning-layer.md — contracts as the language's meaning layer
- logicn-contract-sets.md — contract sets: parsed and validated (Phase 9B)
- logicn-core-logic-tri-decision-bool.md — Tri type: canonical three-valued logic spec
- logicn-core-logic-tristate-developer-guide.md — Tri if/match developer guide (uses older naming; canonical name is Tri)
- logicn-flow-contracts.md — flow contract keywords: contract, emit, emits, event
- logicn-flow-entry-points.md — flow entry points and access control (Phase 11)
- logicn-grammar.ebnf — EBNF grammar (machine-readable)
- logicn-language-lessons.md — design decisions informed by other languages
- logicn-lexer-lln.md — self-hosted lexer in LogicN (Phase 16)
- logicn-missing-syntax-keywords.md — parser/AST gaps: critical primitives not yet implemented
- logicn-naming-conventions.md — flow parameters, bindings, type aliases
- logicn-no-variables-outside-flows.md — no ordinary variables outside flows (Phase 9B)
- logicn-phase-11-mut-reassignment.md — mut reassignment enforcement (Phase 11A.2)
- logicn-phase-11-taint-propagation.md — two-hop taint propagation (Phase 11B)
- logicn-readable-logic-forms.md — and/or/unless/is keywords: readable logic (Phase 9C)
- logicn-syntax-if-match-optional.md — if, match, Optional<T>, type guards
- logicn-syntax-loops-iteration.md — loops, map/filter/fold, iteration patterns
- logicn-trust-sensitivity-type-rules.md — trust, sensitivity, collection type rules
- logicn-type-system-compute-extensions.md — numeric tower, memory domain types
- logicn-v1-memory-model.md — Phase 3 v1 memory model commitment
- match-catch-all-branch.md — _ => catch-all arm in match
- no-exceptions-result-model.md — Result<T,E> invariant; no throw/catch
- numeric-and-compute-types.md — numeric types, Matrix/Vector/Tensor
- operator-precedence.md — operator precedence table (Phase 5)
- operator-type-rules.md — operator type rules: LLN-TYPE-004, LLN-TYPE-005
- pattern-matching.md — match value { ... } reference
- postfix-type-state-syntax.md — postfix governance state syntax
- release-keyword.md — release: explicit early cleanup of runtime values
- type-and-enum-declarations.md — type and enum declaration syntax
- type-qualifiers.md — safe/unsafe prefix governance qualifiers
- typed-error-model.md — typed error model: declared error types per flow
- v1-reserved-keywords.md — authoritative v1 keyword reservation table
- value-state-annotations.md — value-state annotations (Phase 5)

### Compiler Architecture — Parser, Type Checker, Effect Checker, GIR

- ast-value-encoding.md — AST .value field encoding per AstNodeKind
- compiler-diagnostics.md — structured diagnostic codes, source locations, suggested fixes
- effect-checker-and-boundary-checker.md — effect and boundary checker spec (v0.2 target, specified pending implementation)
- logicn-ast-published-schema.md — stable published AST JSON schema for tooling
- logicn-ast-to-gir.md — AST to GIR transformation (Pass 8)
- logicn-compiler-enforcement-compute.md — enforcement gaps for compute targets
- logicn-compiler-optimizations.md — optimizations and LLVM/MLIR backend pathway
- logicn-compiler-phase-memory-boundaries.md — phase-level memory boundaries (Stage B proposal)
- logicn-compiler-pipeline.md — authoritative compiler pass order
- logicn-core-cli-deploy-explain-plan.md — logicn-core-cli: build, verify, deploy, explain, plan (v0.2 target)
- logicn-core-compiler-manifest-generation-pass-14.md — manifest generation pass 14 spec (v0.2 target)
- logicn-core-compute-gpu-and-photonic-backends.md — GPU/photonic/WASM target planning spec (v0.2 target)
- logicn-core-logic-omni-logic.md — Omni Logic: advisory multi-state reasoning model (v0.2 target)
- logicn-core-syntax-bindings-pipeline.md — let/mut/readonly, method-chain pipelines
- logicn-core-syntax-typed-content-blocks.md — html/dom/script/css heredoc content blocks
- logicn-deterministic-selfhost-verification.md — deterministic self-host verification (Stage B proposal)
- logicn-diagnostic-numbering-strategy.md — diagnostic numbering strategy (Phase 7 resolved)
- logicn-gir-schema.md — Governed Intermediate Representation schema
- logicn-gradual-capability-inference.md — gradual capability and effect inference (Phase 13 proposal)
- logicn-intent-guided-optimisation.md — Intent-Guided Optimisation (IGO), Phase 8+
- logicn-javascript-escape-hatch.md — LLN-BACKEND-001: ambient authority in generated JS (Phase 13)
- logicn-logical-planning-target-emission.md — separate logical planning from target emission (Phase 13)
- logicn-metadata-erasure.md — metadata erasure (Phase 13)
- logicn-passive-execution-plans.md — passive execution plans (Phase 13 proposal)
- logicn-static-capability-proofs.md — static capability proofs (Phase 13, partial)
- logicn-symbol-resolver-spec.md — symbol resolver spec (Phase 7A)
- logicn-tensor-arity-decision.md — Tensor<T,Shape> arity decision (Phase 7)
- parser-error-recovery.md — parser error recovery policy (Phase 5)
- phase-4-parser-ast-plan.md — Phase 4 parser and AST plan

### Runtime Architecture — Interpreter, CapabilityHost, Execution Plans

- boot-main-startup-defaults.md — boot/main policy defaults and startup rules
- build-system-and-cli.md — logicn build and deploy as governed workflows
- cicd-integration-and-provenance.md — CI/CD integration, provenance, artifact integrity
- compile-time-vs-runtime-authority.md — compile-time vs runtime authority separation
- context-tagged-verified-execution-cache.md — verified execution plan cache rules
- controlled-mutation-model.md — immutable by default, explicit mutation model
- critical-and-deferred-compute-paths.md — critical path vs deferred compute path
- data-in-motion-security.md — data crossing runtime boundaries
- fast-response-and-keep-alive.md — fast response as a request-path problem
- flow-finalizer-and-cleanup.md — automatic runtime cleanup at flow end
- flow-vs-fn-security-model.md — route / flow / fn: distinct execution constructs
- logicn-compute-target-optimisation.md — compute target optimisation (Phase 8A complete)
- logicn-core-flow-trace.md — Flow Trace API: structured governed debug logs
- logicn-core-intent-safety-effects.md — intent declarations, safety levels, flow tracing
- logicn-core-memory-model.md — v1 memory model: ownership, borrows, bounds checks
- logicn-core-network-governance.md — network governance model
- logicn-core-package-architecture.md — logicn-core* package dependency graph
- logicn-core-runtime-resources.md — runtime-owned single-instance resources
- logicn-data-layout-memory-hints.md — data layout hints, profiling, nondeterministic annotation
- logicn-developer-ux-phase-8.md — developer experience improvements (Phase 8)
- logicn-governance-diff-ci.md — logicn diff: governance report comparison in CI
- logicn-intent-graph.md — machine-readable intent graph build artefact
- logicn-memory-borrow-move-pinned.md — borrow, move, and pinned memory semantics
- logicn-memory-request-scope-arenas.md — request-scope arena allocators
- logicn-package-manifest-spec.md — package manifest spec (Phase 8+)
- logicn-proof-chain-spec.md — execution proof chain spec (Phase 7B/8)
- logicn-route-runtime-spec.md — route runtime spec (Phase 7B/8)
- logicn-runtime-lifecycle.md — runtime lifecycle spec (Phase 7B/8)
- logicn-runtime-value-model.md — runtime value model (Phase 7B/8)
- logicn-speed-improvements-phase-8.md — speed improvements (Phase 8)
- logicn-stage-b-root-capability-provider.md — Stage B root capability provider (proposal)
- logicn-stdlib-reference.md — standard library reference (Phase 7B/8)
- logicn-type-improvements-phase-8.md — type system improvements (Phase 8B/8C)
- logicn-developer-tooling-advanced.md — test generation, capability warnings, constraint signatures
- logicn-developer-tools.md — LSP, diagnostics-with-fixes, governance REPL
- logicn-ide-tooling.md — IDE tooling design (Phase 13/14 spec)
- logicn-one-click-governance-fixes.md — one-click governance fixes (Phase 13/14 spec)
- lsgr-runtime-components.md — LSGR runtime components (Phase 17+ future)
- request-context-keyword.md — ctx: RequestContext naming convention
- request-lifecycle.md — governed request lifecycle
- runtime-assembler.md — runtime assembler (Stage B future)
- runtime-audit-log-format.md — runtime audit log format v1
- runtime-boundary-declarations.md — runtime boundary declarations for APIs, DBs, workers
- runtime-context-not-superglobals.md — Runtime.Context: not a global variable
- runtime-extension-points.md — approved runtime extension hooks
- runtime-identity-model.md — runtime-managed service identity
- runtime-package-structure.md — coarse-grained responsibility-based packages
- runtime-policy-config.md — system-level runtime policy configuration
- runtime-profiles.md — runtime profiles: restricted language subsets
- runtime-scheduler.md — Execution Coordination Scheduler
- runtime-terminology-evolution.md — runtime terminology evolution notes
- runtime-trusted-core-design.md — LSGR trusted core / extension / integration layers
- securely-governed-runtime.md — LSGR architecture direction
- startup-and-boot-warmup.md — startup as a planning problem
- trusted-boot-preload-graph.md — trusted boot preload graph (Phase 17+ future)
- verified-fast-paths.md — verified fast paths for known safe execution signatures

### Standard Library

- logicn-core-standard-types-string-char-byte.md — String, Char, Byte, Bytes, SecureString
- logicn-stdlib-reference.md — standard library reference (also listed under runtime)
- logicn-missing-syntax-keywords.md — also covers stdlib gaps (also listed under language spec)

### Attestation and Proof Chain

- boundary-safety-proof.md — boundary safety as first proof target
- logicn-audit-writer-spec.md — JSONL audit writer spec (Phase 7B/8)
- logicn-compliance-governance.md — compliance governance for regulated industries
- logicn-concept-audit-proof.md — audit proof concept in the governance pipeline
- logicn-signed-attestation.md — Ed25519 / post-quantum signed attestation (Phase 10A)
- logicn-supply-chain-package-governance.md — supply chain attestation, LLN-SUPPLY-001
- security-invariants-and-policy-proof.md — security invariants over isolated fixes

### Governance

- ai-as-untrusted-reasoning-worker.md — AI treated as untrusted reasoning worker
- ai-friendly-architecture-documentation.md — AI-readable structured documentation policy
- ai-linear-algebra-accelerator-support.md — AI/linear-algebra accelerators as governed targets
- ai-self-modification-governance.md — AI cannot silently gain authority
- ai-understandable-architecture-policy.md — architecture documented for AI audit
- architecture-charter.md — long-term language, runtime, and ecosystem identity
- architecture-good-taste-principles.md — edge-case-eliminating design principles
- architecture-self-verification-questions.md — self-proof questions for the architecture
- audit-actor-model.md — automatic execution identity capture in audit events
- authority-model.md — compile-time vs runtime authority layers
- automated-runtime-trust-strategy.md — trust made automatic via compiler metadata
- benchmark-success-plan.md — repeatable, honestly labelled benchmarks
- bit-width-and-base64-asset-policy.md — bit widths, binary, base64 assets policy
- boundary-extension-concepts.md — data/flow/permission/boundary/report five-part model
- builtin-view-levels.md — standard built-in data exposure view levels
- capabilities.md — capability declaration and authorisation model
- capability-registry.yaml — machine-readable capability registry
- compile-time-metadata-reflection.md — reflection for proof and tooling only
- compute-balancer.md — hardware-aware compute balancer
- context-tagged-verified-execution-cache.md — (also listed under runtime)
- core-application-model.md — five beginner-facing concepts for secure apps
- data-visibility-view-terminology.md — view-based field exposure terminology
- deny-by-default-risk-features.md — features denied: hidden authority, mutation, guessing
- design-patterns-for-logicn.md — allowed design patterns: visible effects and permissions
- developer-friendly-permission-model.md — simple developer-facing permission model
- documentation-layer-model.md — documentation layer organisation
- encapsulation-model.md — encapsulation through controlled data movement
- error-propagation-chains.md — Result<T,E> propagation through call chains
- excluded-features.md — features deliberately excluded from the language
- explicit-mutation-and-vault-writes.md — all state changes visible in source
- field-read-rules.md — explicit allow-list field-read rules
- governed-capability-modules.md — governed external/optional capability modules
- governed-execution-director.md — runtime planning and coordination director
- hybrid-electronic-optical-compute.md — electronics govern, photonics accelerate
- layered-rate-limits.md — boot/route/permission-level rate limits
- legacy-pattern-restrictions.md — blocked legacy patterns (inheritance, hidden authority)
- local-ai-review.md — local AI as advisory review aid
- local-low-bit-ai-review.md — BitNet-style local AI for advisory review
- logic-architecture-policy.md — what belongs in each language layer
- logicn-ai-neural-npu-targets.md — Neural IR, quantization, NPU compute targets
- logicn-ai-semantic-graph-output.md — --emit-ai-graph semantic graph output (Phase 13A)
- logicn-api-boundary-architecture.md — API boundary: typed permissioned request gateway
- logicn-architecture-layers.md — five-layer architecture (authoritative)
- logicn-code-examples-full-flow.md — full flow code examples with governance
- logicn-concept-coordinated-compute.md — coordinated compute concept
- logicn-concept-governed-execution-plan.md — governed execution plan concept
- logicn-concept-intent.md — intent concept and semantic layers
- logicn-concept-map.md — concept map for humans and AI tools
- logicn-concurrency-synchronisation-compute.md — concurrency/synchronisation for heterogeneous compute
- logicn-core-config-dotenv-trust-model.md — .env trust model
- logicn-core-config-environment-secrets.md — environment config and secret reference model
- logicn-core-config-vault.md — Config Vault: typed non-secret shared config
- logicn-core-network-webhook.md — webhook security spec (v0.2 specified, not yet implemented)
- logicn-core-security-secret-reference-model.md — secret reference model with taint tracking (v0.2 draft)
- logicn-design-primitive-obsession.md — primitive obsession anti-pattern
- logicn-doc-comment-standard.md — doc comment standard (Phase 8A)
- logicn-glossary.md — glossary and definition index (living document)
- logicn-governance-architecture.md — broader governance architecture pipeline
- logicn-governance-verifier-spec.md — governance verifier spec (Phase 8)
- logicn-hardware-as-capabilities.md — hardware as governed capabilities (Phase 13/14 spec)
- logicn-naming-philosophy.md — naming philosophy for runtime/governance/hardware terminology
- logicn-natural-language-governance-summary.md — plain-English governance summary output
- logicn-package-naming.md — package naming spec (future migration target)
- logicn-photonic-distinct-compute-model.md — photonic as distinct compute substrate
- logicn-security-compile-time-crypto.md — compile-time cryptographic parameters
- logicn-security-improvements-phase-8.md — security improvements (Phase 8B)
- logicn-security-secret-safety.md — constant-time comparison, codegen, HSM
- logicn-security-taint-types.md — Tainted<T> input taint type
- logicn-semantic-graph-system.md — Semantic Graph System (Phase 13 proposal)
- logicn-signed-attestation.md — (also listed under attestation)
- malicious-data-and-exploit-resistance.md — malicious data as active threat model
- mathematics-and-tri-logic.md — mathematical and combinatoric computation support
- mcp-ai-tool-boundaries.md — MCP as controlled AI tool boundary
- memory-pressure-security.md — low memory as security event
- model-security-contracts.md — models as first-class security contracts
- model-views-and-data-blocks.md — data block, model, request, view patterns
- module-system-and-visibility.md — module system: static resolution, no dynamic loading
- multi-actor-audit-events.md — multi-actor audit events
- network-boundary-policy.md — TCP/UDP port policy, named network boundaries
- neutral-governed-ir.md — Neutral Governed IR: hardware-neutral verified execution
- no-inheritance-explicit-security.md — no inheritance; explicit security instead
- observability-and-monitoring.md — structured machine-readable build and runtime outputs
- package-completion-status.md — implementation gaps across core packages
- package-declaration-syntax.md — package declaration, versioning, governance
- package-resolver.md — governed Package Resolver
- permission-capability-actor-model.md — permission/capability/actor model for developers
- photonic-resolution-boundary.md — photonic as compute boundary, not control flow
- plugin-security-architecture.md — small secure core, explicitly permissioned plugins
- policy-architecture.md — policies as first-class source
- polymorphism.md — polymorphism without class inheritance
- production-scaling-model.md — scale as a runtime contract
- prompt-injection-defense.md — prompt injection as authority problem
- query-type-and-database-access.md — Query type for parameterized database queries
- quiet-runtime-secure-defaults.md — quiet runtime: identity hidden, routes declared
- restricted-native-boundary.md — governed FFI with capability and audit control
- route-spec.md — route: external entry point delegating to a flow
- safe-unsafe-trust-model.md — safe/unsafe as first-class trust concepts
- secure-by-default-syntax-principles.md — security visible in syntax
- software-as-declared-intent.md — software as declared system intent
- specialist-ai-hardware-compute-targets.md — specialist AI hardware as governed targets
- standard-view-behaviour.md — common view behaviour defined once in runtime
- terminology-naming-philosophy.md — stable terminology across runtime/governance/hardware
- trust-conversion-and-data-safety.md — memory-safe vs trust-safe distinction
- trust-conversion-model.md — unsafe -> safe: three approved trust operations
- type-manifest.md — app.type-manifest.json: compiler-generated type contracts
- unified-syntax-architecture.md — one .lln syntax for all language concerns
- untrusted-file-asset-processing.md — images/PDFs/archives as untrusted executable-adjacent
- what-logicn-refuses-to-become.md — explicit anti-goals for the language
- hello-world-api-pattern.md — canonical beginner example: data/flow/permission/route/report

### Examples and Patterns

- design-patterns-for-logicn.md — (also listed under governance)
- hello-world-api-pattern.md — (also listed under governance)
- http-method-declarations.md — HTTP methods as declared governed entry points
- logicn-code-examples-full-flow.md — (also listed under governance)
- docs/examples/Level-5-Security/ — Phase R4 security examples: process.spawn governance, anti-abuse patterns (CEC stable)

### Phase Decisions and Roadmap

- logicn-phase-9-roadmap.md — Phase 9 roadmap (Phase 8 complete baseline)
- logicn-phase-10-roadmap.md — Phase 10 roadmap (Active: Phase 9 complete)
- logicn-roadmap.md — implementation roadmap (updated 2026-05-31, Phase 23 complete)
- logicn-roadmap-phase16-20.md — Phase 16-20 roadmap (Phase 16 active)
- logicn-phase-18-23-summary.md — Phase 18-23 complete summary (+293 tests, 10 new source files)
- package-completion-status.md — (also listed under governance)

### Architecture Specifications (Phase 18–Hybrid WASM, current canonical)

- logicn-architecture-high-roi-ideas.md — 16 high-ROI ideas, status by phase
- logicn-effect-checker-architecture.md — effect checker arch: EffectCheckerFlags, LLN-STDLIB-001, bitsets
- logicn-explicitness-principles.md — "nothing important hidden" — the core LogicN design principle
- logicn-gir-emitter-architecture.md — GIR emitter: tensor metadata, WAT emitter, WASM lowering plan
- logicn-governance-verifier-architecture.md — governance verifier: GovernanceFlags, RuntimeManifest
- logicn-lexer-optimizations.md — lexer optimisation roadmap (slice scanning, TokenKindId, arena plan)
- logicn-package-resolver-architecture.md — package resolver: hash/signature/targets/compute/LLN-PKG-*
- logicn-runtime-interpreter-roadmap.md — runtime improvement roadmap: Lua VM, WASM, JIT, register VM
- logicn-stdlib-architecture.md — stdlib: STDLIB_CAPABILITY_MAP, pure/effectful split, TRI_STDLIB_OPS
- logicn-type-checker-architecture.md — type checker: TypeId, EffectFlags, tensor shape checking
- logicn-value-state-checker-architecture.md — value-state: ValueStateFlags, SINK_REQUIREMENTS, LLN-GATE-001
- logicn-cli-current.md — current CLI spec: all modes including --target wasm-standalone/hybrid
- logicn-hybrid-wasm-native-architecture-v1.md — **v1.0 canonical** hybrid WASM-native architecture (Snapdragon/NPU vision + governance model, 2026-05-31)
- logicn-governance-hierarchy.md — **Foundational** Governance First, Economics Second, Performance Third — the inviolable stack, the test for every future proposal
- logicn-governance-scope.md — **Foundational** Governance for High Consequence Systems (not just PII) — aerospace, defence, space, AI, critical infrastructure
- logicn-execution-graph-kernel-architecture.md — 8 architectural suggestions: ProofGraph, ControlNode/DataNode, Capability Routing, Execution Signatures, Graph Fingerprints, Governance Fabric
- logicn-hybrid-wasm-architecture.md — detailed EDA model, WAT assembler decision, crash recovery, 8 native governance rules
- logicn-security-anti-abuse.md — anti-botnet architecture: process.spawn/worker.spawn/event.schedule effects (✅ Phase R4), network destination policy, LLN-NET-001/002, rate limit enforcement, DNS rebinding defence, getAntiAbuseReport() devtools (✅ Phase R4)

---

## Legacy / Superseded Docs (v0.2, historical)

Docs marked SUPERSEDED or carrying "Version target: v0.2" with an explicit current replacement.

- effect-checker-and-boundary-checker.md — v0.2 target spec; implementation pending (superseded in detail by compiler-pipeline + logicn-gir-schema)
- logicn-core-cli-v02.md — SUPERSEDED v0.2 CLI design document
- logicn-core-compute-v02.md — SUPERSEDED v0.2 compute spec
- logicn-core-config-v02.md — SUPERSEDED v0.2 config spec
- logicn-core-effect-checker-v02.md — SUPERSEDED v0.2 effect checker spec
- logicn-core-logic-v02.md — SUPERSEDED v0.2 logic spec (canonical: logicn-core-logic-tri-decision-bool.md)
- logicn-core-manifest-generation-v02.md — SUPERSEDED v0.2 manifest generation spec
- logicn-core-network-v02.md — SUPERSEDED v0.2 network spec
- logicn-core-photonic-backend-architecture.md — legacy/historical photonic backend architecture note
- logicn-core-photonic-governance-architecture.md — v0.2 photonic governance overlay (superseded by logicn-core-photonic-v02.md chain)
- logicn-core-photonic-v02.md — SUPERSEDED v0.2 photonic spec
- logicn-core-policy-online-safety-act.md — references tristate-developer-guide; older pattern
- logicn-core-reports-v02.md — SUPERSEDED v0.2 reports spec
- logicn-core-security-v02.md — SUPERSEDED v0.2 security spec
- logicn-core-vector-photonic-governance.md — v0.2 specified, unresolved boundary conflict, not implemented
- logicn-framework-api-server-implementation.md — v0.2 implementation spec (superseded by Phase 9-15 docs)
- logicn-framework-api-server-v02.md — SUPERSEDED v0.2 framework API server spec
- logicn-runtime-rationale.md — design-rationale precursor; superseded by architecture-charter + securely-governed-runtime

---

## Future / Aspirational Docs (post-v1, not yet implemented)

Docs with "Status: Future", "Stage B/C", "post-v1 implementation", or "Proposed Architecture Direction" that are not yet implemented.

- ai-compute-plan.md — AI as declared typed planned compute (aspirational design direction)
- async-task-model.md — async task model (Stage B)
- bootstrap-runtime-roadmap.md — bootstrap runtime roadmap (Phase 1-2 complete, Phase 3-4 in progress)
- certified-package-registry.md — certified package registry (Phase 17+)
- controlled-parallelism.md — controlled parallelism (Stage B)
- formal-proof-system.md — formal proof system (Stage B)
- generative-runtime-mapper.md — generative runtime mapper (Phase 17+)
- governed-compute-chain.md — governed compute chain (post-v1)
- governed-event-driven-execution.md — governed event-driven execution (Stage B)
- governed-streams.md — governed streams (Stage B)
- governed-worker-pools.md — governed worker pools (Stage B)
- ihsa-storage-policy.md — IHSA governed storage policy (post-v1)
- lifecycle-state-system.md — @state() lifecycle system (Phase 6+, not v1)
- logicn-adaptive-runtime-profiles.md — adaptive runtime profiles (proposed architecture direction)
- logicn-governed-apu-memory.md — governed memory boundaries and APU sharing (Phase 14 future)
- logicn-governed-memory-blocks.md — governed memory blocks (Phase 10C, not yet implemented)
- logicn-hardware-as-capabilities.md — hardware as governed capabilities (Phase 13/14 future spec)
- logicn-native-runtime-roadmap.md — native self-hosted runtime roadmap (aspirational)
- logicn-nvidia-n1x-target.md — NVIDIA N1X target profile (provisional)
- logicn-package-naming.md — package naming migration (future)
- logicn-quantum-target-bridge.md — quantum computing target bridge (future)
- lsgr-runtime-components.md — LSGR runtime components (Phase 17+)
- mathematics-and-tri-logic.md — advanced maths/combinatorics support (aspirational)
- native-photonic-compute-future.md — native photonic compute (Stage C)
- node-hosted-runtime-roadmap.md — Node-hosted runtime roadmap (Phase 17+)
- preplanned-startup-and-fast-response.md — preplanned startup infrastructure (aspirational)
- priority-categories.md — priority category taxonomy (aspirational tooling)
- quantum-readiness.md — quantum readiness (Stage C)
- runtime-assembler.md — runtime assembler (Stage B)
- scheduled-actions.md — scheduled actions (Stage B)
- scheduled-chain-blocks.md — scheduled chain blocks (Stage B)
- scoped-vaults.md — scoped vaults: session-scope state (Stage B)
- secure-channels-and-portals.md — secure channels and portals (Stage B)
- session-vault.md — session vault (Stage B)
- terminology-naming-philosophy.md — (also active, but includes future terminology evolution)
- triggers.md — triggers (Stage B)
- trusted-boot-preload-graph.md — trusted boot preload graph (Phase 17+)
- variable-mutation-vault-design.md — variable mutation vault design (Stage B)
- vault-write-syntax.md — vault write syntax (Stage B)

---

## Decision Records

- logicn-phase-11-decisions.md — Phase 11 design decisions (recorded 2026-05-30)
- logicn-phase-13-decisions.md — Phase 13/14 design decisions (recorded 2026-05-30)
- logicn-phase16-20-decisions.md — Phase 16-20 design decisions (recorded 2026-05-31)

---

## Non-Markdown Reference Files

- capability-registry.yaml — machine-readable capability registry
- logicn-glossary.schema.yaml — machine-readable glossary schema
- logicn-grammar.ebnf — EBNF grammar specification
- operator-rules.schema.yaml — machine-readable operator type rules
- stdlib-gates.yaml — standard library gates, sinks, and log functions
- schemas/ — subdirectory (additional schema files)
