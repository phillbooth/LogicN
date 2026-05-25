# LogicN Documentation Coverage

This document tracks what has been documented, what needs more depth, and what
is still missing across the three primary areas of the language specification,
plus the package documentation status.

```text
✅ Covered — dedicated KB file exists with full specification
⚠️  Partial — touched in a KB file but needs its own dedicated document
❌ Missing — not yet documented, work still required
```

---

## 1. Syntax

Core language constructs, keywords, type system, declaration blocks.

### Keywords and Control Flow

| Topic | Status | KB File |
| --- | --- | --- |
| Core keyword set (flow, fn, let, if, else, match, uses, each, attempt, none, release) | ✅ | `core-syntax-keywords.md` |
| Excluded keywords (switch, case, elseif, for, try/catch, null, async, await) | ✅ | `core-syntax-keywords.md`, `excluded-features.md` |
| flow vs fn distinction | ✅ | `flow-vs-fn-security-model.md` |
| Flat flow style (max depth 2, guard clauses) | ✅ | `flat-flow-style.md` |
| if/match/Optional syntax rules | ✅ | `logicn-syntax-if-match-optional.md` |
| Loop and iteration model | ✅ | `logicn-syntax-loops-iteration.md` |
| Branching model (if/else, match) | ✅ | `branching-model.md` |
| Pattern matching (full) | ✅ | `pattern-matching.md` |
| match catch-all (_ => arm) | ✅ | `match-catch-all-branch.md` |
| task / wait (governed async) | ✅ | `async-task-model.md` |
| release keyword | ✅ | `release-keyword.md` |
| run worker syntax | ✅ | `governed-worker-pools.md`, `core-syntax-keywords.md` |
| each (iteration) | ✅ | `core-syntax-keywords.md` |
| attempt ... else error | ✅ | `core-syntax-keywords.md`, `no-exceptions-result-model.md` |

### Types

| Topic | Status | KB File |
| --- | --- | --- |
| Primitive types (String, Int, Decimal, Float, Bool, None) | ✅ | `core-syntax-keywords.md` |
| Auto — compile-time type inference keyword | ✅ | `auto-type-inference.md` |
| safe / unsafe type qualifiers | ✅ | `safe-unsafe-trust-model.md` |
| Context-specific safe types (safe Email, safe Url, etc.) | ✅ | `safe-unsafe-trust-model.md` |
| Array<T> and string operations | ✅ | `arrays-and-string-operations.md` |
| List<T> operations | ✅ | `list-operations.md` |
| Query type (sql, graphql, mongo, search blocks) | ✅ | `query-type-and-database-access.md` |
| Result<T, E> and typed errors | ✅ | `typed-error-model.md`, `no-exceptions-result-model.md` |
| Tri / Decision / Bool logic types | ✅ | `mathematics-and-tri-logic.md` |
| Formal proof types (axiom, theorem, lemma, proof, assume, given, invariant) | ✅ | `formal-proof-system.md` |
| Type definitions (type Foo { field: Type }) | ✅ | `type-and-enum-declarations.md` |
| Enum syntax (enum Status { Paid, Failed }) | ✅ | `type-and-enum-declarations.md` |
| Generic types (Option<T>, Result<T,E>, Array<T>, Map<K,V>) | ✅ | `generic-types.md` |
| Branded/opaque types (Brand<T,"Name">) | ✅ | `type-and-enum-declarations.md`, `generic-types.md` |
| Primitive obsession design principle | ✅ | `logicn-design-primitive-obsession.md` |
| Postfix type state syntax (String unsafe, Email safe validated) | ✅ | `postfix-type-state-syntax.md` |
| Type manifest (app.type-manifest.json) | ✅ | `type-manifest.md` |
| Money<Currency> and Decimal precision | ✅ | `numeric-and-compute-types.md` |
| Matrix<R,C,T>, Vector<N,T>, Tensor<Shape,T> | ✅ | `numeric-and-compute-types.md` |
| SecureString | ✅ | `numeric-and-compute-types.md` |
| Timestamp, Duration | ✅ | `numeric-and-compute-types.md` |
| Mutation model (let vs mut) | ✅ | `controlled-mutation-model.md`, `explicit-mutation-and-vault-writes.md` |

### Declaration Blocks

| Topic | Status | KB File |
| --- | --- | --- |
| Unified .lln syntax (5 domains: program/runtime/compile/security/effects) | ✅ | `unified-syntax-architecture.md` |
| API declaration (api name { endpoint: "..." }) | ✅ | `runtime-boundary-declarations.md` |
| Route declaration (route GET "/path" { ... }) | ✅ | `runtime-boundary-declarations.md`, `http-method-declarations.md` |
| Database declaration (database name { source: GlobalVault... }) | ✅ | `runtime-boundary-declarations.md` |
| Worker declaration (worker name { max: N, isolation: strict }) | ✅ | `runtime-boundary-declarations.md` |
| Queue declaration (queue name { source: GlobalVault... }) | ✅ | `runtime-boundary-declarations.md` |
| Trigger declaration | ✅ | `triggers.md` |
| Scheduler block syntax | ✅ | `runtime-scheduler.md` |
| Extension point declaration | ✅ | `runtime-extension-points.md` |
| Plugin declaration | ✅ | `plugin-security-architecture.md` |
| Boot / main / runtime / compile / security blocks | ✅ | `boot-main-startup-defaults.md` |
| Import / module system | ✅ | `module-system-and-visibility.md` (incl. module declaration, type-only imports, capability imports, namespace imports, wildcard rule, runtime loading) |
| Visibility (public/private/package/runtime) | ✅ | `module-system-and-visibility.md` |
| Package declaration syntax | ✅ | `package-declaration-syntax.md` |

### Trust Conversion Syntax

| Topic | Status | KB File |
| --- | --- | --- |
| validate.* gate | ✅ | `trust-conversion-model.md` |
| clean.* gate | ✅ | `trust-conversion-model.md` |
| encode.* gate | ✅ | `trust-conversion-model.md` |
| contex: RequestContext | ✅ | `request-context-keyword.md` |
| GlobalVault access syntax | ✅ | `variable-mutation-vault-design.md`, `vault-write-syntax.md` |
| GlobalVault scoped vaults | ✅ | `scoped-vaults.md` |
| Session vault syntax | ✅ | `session-vault.md` |

---

## 2. Logic

How programs reason, branch, handle errors, enforce permissions, and prove correctness.

### Error Handling and Control

| Topic | Status | KB File |
| --- | --- | --- |
| Result<T,E> model (no exceptions) | ✅ | `no-exceptions-result-model.md`, `typed-error-model.md` |
| attempt ... else error pattern | ✅ | `core-syntax-keywords.md` |
| Guard clause pattern | ✅ | `flat-flow-style.md` |
| Branching (if/else, match) | ✅ | `branching-model.md` |
| Pattern matching (full) | ✅ | `pattern-matching.md` |
| match catch-all (_ =>) | ✅ | `match-catch-all-branch.md` |
| Error propagation through call chains | ✅ | `error-propagation-chains.md` |

### Permissions and Authority

| Topic | Status | KB File |
| --- | --- | --- |
| uses declaration | ✅ | `flow-vs-fn-security-model.md`, `developer-friendly-permission-model.md` |
| Permission / capability / actor model | ✅ | `permission-capability-actor-model.md` |
| Developer-friendly permission model | ✅ | `developer-friendly-permission-model.md` |
| Runtime vs compile-time authority | ✅ | `authority-model.md`, `compile-time-vs-runtime-authority.md` |
| How authority propagates through flows | ✅ | `authority-model.md` |
| Audit actor model | ✅ | `audit-actor-model.md` |
| Multi-actor audit events | ✅ | `multi-actor-audit-events.md` |

### Trust and Security Logic

| Topic | Status | KB File |
| --- | --- | --- |
| safe / unsafe trust model | ✅ | `safe-unsafe-trust-model.md` |
| Trust conversion (validate/clean/encode) | ✅ | `trust-conversion-model.md` |
| Data-in-motion security | ✅ | `data-in-motion-security.md` |
| Prompt injection defence | ✅ | `prompt-injection-defense.md` |
| Malicious data and exploit resistance | ✅ | `malicious-data-and-exploit-resistance.md` |
| Boundary safety proofs | ✅ | `boundary-safety-proof.md` |
| Security invariants and policy proof | ✅ | `security-invariants-and-policy-proof.md` |
| Denial-by-default risk features | ✅ | `deny-by-default-risk-features.md` |
| No inheritance / explicit security | ✅ | `no-inheritance-explicit-security.md` |
| What LogicN refuses to become | ✅ | `what-logicn-refuses-to-become.md` |
| Excluded features table | ✅ | `excluded-features.md` |

### Data and Type Logic

| Topic | Status | KB File |
| --- | --- | --- |
| Tri / Decision / Bool boundary rules | ✅ | `mathematics-and-tri-logic.md` |
| Formal proof keywords | ✅ | `formal-proof-system.md` |
| Model security contracts | ✅ | `model-security-contracts.md` |
| Data visibility views | ✅ | `data-visibility-view-terminology.md`, `builtin-view-levels.md`, `standard-view-behaviour.md` |
| Field read rules | ✅ | `field-read-rules.md` |
| Polymorphism approach | ✅ | `polymorphism.md` |
| Encapsulation model | ✅ | `encapsulation-model.md` |
| Logic architecture policy | ✅ | `logic-architecture-policy.md` |

### Concurrency Logic

| Topic | Status | KB File |
| --- | --- | --- |
| task / wait model | ✅ | `async-task-model.md` |
| Controlled parallelism rules | ✅ | `controlled-parallelism.md` |
| Governed worker pools | ✅ | `governed-worker-pools.md` |
| Governed streams | ✅ | `governed-streams.md` |
| Concurrency safety (no shared mutable state) | ✅ | `excluded-features.md`, `controlled-parallelism.md` |
| Cancellation policy modes | ✅ | `async-task-model.md`, `controlled-parallelism.md` |

---

## 3. Runtime

Execution, scheduling, trust verification, identity, memory, hardware targets.

### Runtime Architecture

| Topic | Status | KB File |
| --- | --- | --- |
| LSGR runtime components overview | ✅ | `lsgr-runtime-components.md` |
| Why LogicN's runtime differs | ✅ | `logicn-runtime-rationale.md` |
| Runtime terminology and naming | ✅ | `runtime-terminology-evolution.md` |
| Runtime Command (Director) | ✅ | `governed-execution-director.md` |
| Authority Control (Sheriff) | ✅ | `lsgr-runtime-components.md` |
| Resource Deployment Balancer | ✅ | `compute-balancer.md` |
| Execution Coordination Scheduler | ✅ | `runtime-scheduler.md` |
| Result Assembler | ✅ | `runtime-assembler.md` |
| Runtime trusted core design | ✅ | `runtime-trusted-core-design.md` |
| Neutral Governed IR | ✅ | `neutral-governed-ir.md` |
| Runtime profiles (dev/team/production/enterprise) | ✅ | `runtime-profiles.md` |
| Runtime policy config | ✅ | `runtime-policy-config.md` |
| Securely governed runtime overview | ✅ | `securely-governed-runtime.md` |

### Execution and Scheduling

| Topic | Status | KB File |
| --- | --- | --- |
| Triggers | ✅ | `triggers.md` |
| Scheduler (job timing, retry, overlap) | ✅ | `runtime-scheduler.md` |
| Scheduled actions | ✅ | `scheduled-actions.md` |
| Scheduled chain blocks | ✅ | `scheduled-chain-blocks.md` |
| Governed event-driven execution | ✅ | `governed-event-driven-execution.md` |
| Critical and deferred compute paths | ✅ | `critical-and-deferred-compute-paths.md` |
| Verified fast paths (VPI) | ✅ | `verified-fast-paths.md` |
| Context-tagged execution cache | ✅ | `context-tagged-verified-execution-cache.md` |
| Generative runtime mapper | ✅ | `generative-runtime-mapper.md` |

### Trust and Identity

| Topic | Status | KB File |
| --- | --- | --- |
| Automated runtime trust strategy | ✅ | `automated-runtime-trust-strategy.md` |
| Trust Capsule | ✅ | `automated-runtime-trust-strategy.md` |
| Runtime identity model | ✅ | `runtime-identity-model.md` |
| Secure channels and portals | ✅ | `secure-channels-and-portals.md` |
| Data-in-motion security | ✅ | `data-in-motion-security.md` |
| Runtime extension points | ✅ | `runtime-extension-points.md` |
| Plugin security architecture | ✅ | `plugin-security-architecture.md` |
| Certified package registry | ✅ | `certified-package-registry.md` |
| Package resolver | ✅ | `package-resolver.md` |
| Package declaration syntax | ✅ | `package-declaration-syntax.md` |
| Runtime package structure | ✅ | `runtime-package-structure.md` |

### Memory and Cleanup

| Topic | Status | KB File |
| --- | --- | --- |
| Flow finalizer and GC strategy | ✅ | `flow-finalizer-and-cleanup.md` |
| release keyword | ✅ | `release-keyword.md` |
| Memory pressure security | ✅ | `memory-pressure-security.md` |
| Trusted boot preload graph | ✅ | `trusted-boot-preload-graph.md` |

### Startup and Performance

| Topic | Status | KB File |
| --- | --- | --- |
| Boot / main startup | ✅ | `boot-main-startup-defaults.md`, `startup-and-boot-warmup.md` |
| Preplanned startup and fast response | ✅ | `preplanned-startup-and-fast-response.md` |
| Fast response and keep-alive | ✅ | `fast-response-and-keep-alive.md` |
| Production scaling model | ✅ | `production-scaling-model.md` |
| Runtime boundary declarations (API/DB/worker/queue) | ✅ | `runtime-boundary-declarations.md` |
| Authority model (compile-time + runtime) | ✅ | `authority-model.md` |
| Controlled parallelism | ✅ | `controlled-parallelism.md` |

### Compute and Hardware

| Topic | Status | KB File |
| --- | --- | --- |
| AI compute plan | ✅ | `ai-compute-plan.md` |
| Specialist AI hardware compute targets | ✅ | `specialist-ai-hardware-compute-targets.md` |
| AI linear algebra accelerator support | ✅ | `ai-linear-algebra-accelerator-support.md` |
| Hybrid electronic-optical compute | ✅ | `hybrid-electronic-optical-compute.md` |
| Native photonic compute future | ✅ | `native-photonic-compute-future.md` |
| Photonic resolution boundary | ✅ | `photonic-resolution-boundary.md` |
| Quantum readiness | ✅ | `quantum-readiness.md` |

### Bootstrap, Build, and Observability

| Topic | Status | KB File |
| --- | --- | --- |
| Node.js bootstrap runtime roadmap | ✅ | `node-hosted-runtime-roadmap.md` |
| Bootstrap plan stages (Node → IR → Rust/WASM → self-hosting) | ✅ | `bootstrap-runtime-roadmap.md` |
| Compiler diagnostics and error codes | ✅ | `compiler-diagnostics.md` |
| Observability and monitoring | ✅ | `observability-and-monitoring.md` |
| Build system and logicn build / logicn deploy CLI | ✅ | `build-system-and-cli.md` |
| Deployment model (build-once, deploy-many) | ✅ | `build-system-and-cli.md` |
| Good-taste architecture principles | ✅ | `architecture-good-taste-principles.md` |
| CI/CD integration (OIDC, SLSA provenance, attestation) | ✅ | `cicd-integration-and-provenance.md` |
| Runtime audit log format | ✅ | `runtime-audit-log-format.md` (extended — JSONL, execution proof, five-hash strategy, LN-AUDIT-001–007, `RuntimeAuditEvent` interface, `RuntimeAuditStatus` type, `DenialReport`, `CapabilityEvidence`, `EffectEvidence`, `RuntimeEvidence`, `buildExecutionProof`, `sha256`, LN-REPORT/LN-PROOF/LN-DENIAL/LN-EVIDENCE codes, 4-phase implementation order) |
| Effect checker and boundary checker | ✅ | `effect-checker-and-boundary-checker.md` (extended — 12-effect table, `effect network, storage` syntax, algorithm, LN-EFFECT/LN-BOUNDARY codes, 16-item checklist, compiler internal structures, `Effect` union type, `EffectSet`, `BoundaryMetadata`, `RuntimeManifest`, `buildManifest`, manifest pipeline, LN-MANIFEST-001–005) |
| Compile-time vs runtime authority boundary | ✅ | `compile-time-vs-runtime-authority.md` |
| Package completion status and implementation order | ✅ | `package-completion-status.md` |
| CLI build / verify / deploy / explain / plan (governance) | ✅ | `logicn-core-cli-deploy-explain-plan.md` (extended — `logicn build` section with 14-pass pipeline/artefacts/BuildResult/buildWorkspace/LN-BUILD codes, `logicn verify` section with VerificationResult/verifyHash/LN-VERIFY codes, deploy/explain/plan sections with internal dirs/types/functions/diagnostic codes, 5-phase implementation order) |
| API boundary architecture (request flow, manifest, routes) | ✅ | `logicn-api-boundary-architecture.md` |
| GPU / photonic / WASM / compatibility backends | ✅ | `logicn-core-compute-gpu-and-photonic-backends.md` (extended — GpuPlan/OpticalPlan types, gpu/ and photonic/ internal dirs, WASM target governance+sandbox restrictions+WasmTarget+validateWasmEffect+LN-WASM codes, target compatibility reports+CompatibilityResult+validateTarget+buildCompatibilityReport+LN-COMPAT codes, 4-phase implementation order) |
| Omni logic (multi-valued reasoning) | ✅ | `logicn-core-logic-omni-logic.md` (8 states, binary safety rule — "never: probably approved", advisory model, absolute unsafe pattern rule, LN-OMNI-001–005) |
| Effect and boundary checker (expanded) | ✅ | `effect-checker-and-boundary-checker.md` (extended boundary types table, runtime manifest JSON with network_hosts/filesystem_paths/trust_level, foundational context section) |
| Tri / Decision / Bool logic systems | ✅ | `logicn-core-logic-tri-decision-bool.md` (NEW — TriState type, AND/OR/NOT truth tables, triAnd function, Decision 5-state type, evaluateCapability, validateBoolBoundary, enforceDeterministicPath, LN-TRI/LN-DECISION/LN-BOOL-BOUNDARY codes, 4-phase implementation order) |
| Environment config and secret reference model | ✅ | `logicn-core-config-environment-secrets.md` (NEW — EnvironmentMode closed type, EnvironmentConfig/SecretEnvironmentReference/SecretReference/SecretDerivedReference/SecretSafeSink types, ProtectedSecret class, loadEnvironmentConfig/canSendSecretToSink/redactSecretValue functions, ProductionStrictnessPolicy, RuntimeConfigHandoff, LN-CONFIG-001–010/LN-SECRET-001–002, package.json boundary rule) |
| Network governance model | ✅ | `logicn-core-network-governance.md` (NEW — NetworkProtocol/NetworkDestinationReference/NetworkPermission/NetworkPolicy types, GovernedNetworkRuntime class, safeHttpRequest/validateDestination/validateTlsRequirement functions, AI networking governance, LN-NETWORK-001–008, 4-phase implementation order) |
| Photonic backend architecture | ✅ | `logicn-core-photonic-backend-architecture.md` (NEW — governance-first architecture, OpticalTransportMode/PhotonicRuntimeTarget/PhotonicExecutionPlan types, estimateOpticalSuitability/buildPhotonicPlan/resolveFallback functions, fallback philosophy, LN-PHOTONIC-001–006, planned sub-packages, 4-phase implementation order) |
| Effect checker — v0.2 formal spec | ✅ | `logicn-core-effect-checker-v02.md` (NEW v0.2 — Effect enum 7 values, CheckedFunction class with Set<Effect>, EffectGraphNode/EffectGraph, propagateEffects() with visited-set cycle detection, analyzeFunction(), BoundaryType enum 5 values, BoundaryNode, validateBoundary(), LN-EFFECT-001–004, LN-BOUNDARY-001–004, 16-item checklist, file layout) |
| Manifest generation — v0.2 formal spec | ✅ | `logicn-core-manifest-generation-v02.md` (NEW v0.2 — RuntimeManifest {version/routes[]/functions[]/effects[]/boundaries[]/metadata}, RouteManifest/FunctionManifest/EffectManifest/BoundaryManifest, BuildManifestInput, buildManifest(), helper functions, ManifestMetadata, LN-MANIFEST-001–005 new meanings, v0.3 features) |
| CLI commands — v0.2 formal spec | ✅ | `logicn-core-cli-v02.md` (NEW v0.2 — exit codes 0–7, BuildArtefact/BuildResult/buildWorkspace(), VerifiedArtefact/VerificationResult/verifyHash(), DeploymentTarget 7-value enum, DeploymentResult, ExplainTrace/ExplainResult/buildTrace(), ComputePlan/estimateTarget(), ValidateEffectsInput/validateEffects(), CLI report files, GitHub Actions example, file layout) |
| Reports/audit — v0.2 formal spec | ✅ | `logicn-core-reports-v02.md` (NEW v0.2 — RuntimeAuditStatus 6-value enum, RuntimeAuditEvent with evidence[]/proof?/diagnostics?, JSONL format, ExecutionProof/ExecutionProofHashes 5 hashes, buildExecutionProof(), DenialReport, 8 evidence types with interfaces, validateAuditSafety(), LN-AUDIT/REPORT/PROOF/DENIAL/EVIDENCE codes, v0.3 features) |
| Compute backends — v0.2 formal spec | ✅ | `logicn-core-compute-v02.md` (NEW v0.2 — ComputeWorkload/DataShape, GpuSuitability interface {suitable/score/reasons[]}, GpuPlan, buildGpuPlan() threshold>512, forbiddenGpuEffects, OpticalNeed/OpticalPlan, buildOpticalPlan(), forbiddenOpticalEffects, WasmTarget/DEFAULT_WASM_TARGET/BROWSER_WASM_TARGET, validateWasmTarget(), CompatibilityLevel 3-value enum, CompatibilityResult, TargetProfile, CompatibilityReport, checkCompatibility(), LN-COMPUTE/WASM/COMPAT codes, v0.3 features) |
| Logic types — v0.2 formal spec | ✅ | `logicn-core-logic-v02.md` (NEW v0.2 — TriState with type:"TRI_TRUE"/"TRI_FALSE"/"TRI_UNKNOWN" + reasons[], TRI_TRUE/TRI_FALSE constants, triUnknown(), combineUnknownReasons(), triAnd() truth table, LN-TRI-001–003; Decision type:"ALLOW"/"DENY"/"UNKNOWN" 3-state, allowDecision/denyDecision/unknownDecision(), combineDecisions() DENY>UNKNOWN>ALLOW, decisionToRuntimeBool() fails-closed, evaluateCapability() deny-first, LN-DECISION-001–003; BoolBoundaryResult {allowed/reason?}, validateBoolBoundary(), LN-BOOL-BOUNDARY-001–003; OmniState 8-value enum, evaluateOmni(), safety rules, LN-OMNI-001–004; file layout) |
| Config — v0.2 formal spec | ✅ | `logicn-core-config-v02.md` (NEW v0.2 — EnvironmentMode enum incl. Sandbox, ConfigValue union string/number/boolean/secret, EnvironmentPolicy, defaultEnvironmentPolicy(), EnvironmentConfig v0.2 with schemaVersion, SecretEnvironmentReference {source/key}, SecretConfigSource vault/kms/env/runtime, ProtectedSecret interface {reference/protected:true}, loadEnvironmentConfig(), canSendSecretToSink(), sanitizeValue(), validateSandboxConfig(), LN-CONFIG-001–003, LN-SECRET-001–004, v0.3 features) |
| Security — v0.2 formal spec | ✅ | `logicn-core-security-v02.md` (NEW v0.2 — SecretSource 6-value union adds oauth/token, SecretCategory 13-value enum, SecretRedactionPolicy/DEFAULT_REDACTION_POLICY, SecretReference {id/source/category/createdAt}, SecretDerivedReference/SecretDerivation {operation/timestamp}, SecretTaint interface {tainted/source/propagationChain[]}, SecureStringReference, ProtectedSecret<T> class with reveal(), SecretSafeSink union, isSafeSink(), safeLog(), buildAuthorizationHeader() preserving propagationChain, LN-SECRET-001–005, v0.3 features) |
| Network governance — v0.2 formal spec | ✅ | `logicn-core-network-v02.md` (NEW v0.2 — NetworkProtocol http/https/ws/wss/grpc/quic, TlsRequirement enum Required/Optional/Forbidden, Capability enum 5 values, NetworkPolicy {allowedProtocols/allowedHosts/tlsRequirement/capabilities/allowPrivateNetworks}, productionNetworkPolicy(), validateDestination(), AiProviderNetworkPolicy extends NetworkPolicy, OPENAI_POLICY, validateAiPrompt(), GovernedNetworkRuntime class, SafeHttpRequest {method/destination/headers/body?/capability}, WebhookVerificationConfig {algorithm/headerName/sharedSecret}, ReplayStore {has/store}, IdempotencyStore, validateCapability(), LN-NETWORK-001–008, v0.3 features) |
| Photonic — v0.2 formal spec | ✅ | `logicn-core-photonic-v02.md` (NEW v0.2 — OpticalTransportMode 6-value enum replacing prior 3-value string union, PhotonicRuntimeTarget {id/transport/realtime/deterministic/supportsIsolation/maxPropagationDepth}, PhotonicExecutionPlan {target/topology/propagationDepth/estimatedLatencyNs/isolated/warnings[]}, buildPhotonicPlan(), validateIsolation/validatePropagation/validateHybridMode/validateRealtime(), PhotonicCapability enum 4 values, topologies OpticalMesh/WaveguideBus/CoherentRing/HybridBridge, LN-PHOTONIC-001–006 new meanings, determinism rule, v0.3 features) |
| API server — v0.2 formal spec | ✅ | `logicn-framework-api-server-v02.md` (NEW v0.2 — HttpMethod enum 7 values, LogicnRouteManifest {method/path/capability/boundary/effects[]/authRequired/replayProtected/webhook}, LogicnApiManifest {version/routes[]/policies[]}, RoutePolicy, 7 supported policies, handleApiRequest() 10-step pipeline, ReplayStore {exists/save}, validateReplay() throws LogicnHttpError(409), WebhookVerificationConfig {algorithm/secret/headerName}, verifyHmacSha256Webhook(), validateBoundary(), validateAuth(), exportOpenApi(), LogicnHttpError class, mapErrorToHttpResponse(), LN-NETWORK/LN-BOUNDARY/LN-EFFECT codes, v0.3 features) |
| Tri Logic developer guide — v0.2 | ✅ | `logicn-core-logic-tristate-developer-guide.md` (NEW v0.2 developer guide — TriState with kind:"true"/"false"/"unknown", triIf() fail-closed helper, matchTri<T>() explicit match, triOr/triNot/triAnd() with full AND/OR/NOT truth tables all 9 combinations, combineUnknownReasons(), triToDecision(), Decision with kind:"allow"/"deny"/"unknown", decisionToRuntimeBool(), combineDecisions() deny-first, BoolBoundaryResult {allowed/value?/diagnostic?}, validateBoolBoundary(), security examples network request and secret access, compiler enforcement table, recommended patterns if/match/Decision) |

---

## 4. Package Documentation Coverage

Status of documentation for `logicn-core` and the `logicn-core-*` family of packages.

```text
✅ README complete — scope, contracts, boundary and usage documented
⚠️  README partial — exists but missing contracts, scope or examples
❌ README missing — file does not exist or is a placeholder only
```

### logicn-core (Language Specification)

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Full language overview, quickstart, feature table |
| syntax.md | ✅ | Canonical syntax reference — all keywords, types, patterns |
| type-system.md | ✅ | Type system — primitives, Auto, Option, Result, Tri, generics |
| security-model.md | ✅ | Trust model, postfix state, SecureString, webhook, API security |
| language-rules.md | ✅ | Strict rules — no null, no truthy/falsy, exhaustive match |
| memory-safety.md | ✅ | Ownership, lifecycle, resource scopes |
| json-native-design.md | ✅ | JSON decode/encode, typed access, policy |
| strict-comments.md | ✅ | `///` doc comments and `@tag` annotations |
| ARCHITECTURE.md | ✅ | Package architecture overview |
| DESIGN.md | ✅ | Design decisions and rationale |
| SECURITY.md | ✅ | Security design and threat model |
| REQUIREMENTS.md | ✅ | Formal requirements (REQ-*) |
| ROADMAP.md | ✅ | Version roadmap 0.1.x → 1.0.0 |
| AI-INSTRUCTIONS.md | ✅ | AI coding assistant guidance |
| docs/syntax.md | ✅ | Mirror of syntax.md in docs/ |
| docs/type-system.md | ✅ | Mirror of type-system.md in docs/ |
| docs/security-model.md | ✅ | Mirror of security-model.md in docs/ |
| docs/language-rules.md | ✅ | Mirror of language-rules.md in docs/ |
| docs/memory-safety.md | ✅ | Mirror of memory-safety.md in docs/ |
| docs/tri-logic.md | ✅ | Tri / Bool / Decision logic in depth |
| docs/polymorphism.md | ✅ | Polymorphism model |
| docs/syntax-logic-status.md | ✅ | Syntax feature status table |
| docs/language-core-maturity-roadmap.md | ✅ | Language core maturity checklist |
| examples/ | ✅ | hello, option, result, decision, payment-webhook, benchmarks |
| compiler/logicn.js | ✅ | Node.js prototype compiler with parser, type checker, formatter |

### logicn-core-runtime

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope, execution model, philosophy, contracts, phases documented |
| TODO.md | ✅ | Work tracking |
| src/ | ⚠️ | Implementation stubs — runtime contracts defined, not yet executed |
| Execution contract model | ✅ | Documented in README — request → planning → verification → execution → audit |
| Effect dispatch | ✅ | Listed in README scope |
| Resilient flow supervision | ✅ | Listed in README scope |
| Checkpoint / resume hooks | ✅ | Listed in README scope |
| Node-hosted adapter contracts | ✅ | Listed in README scope |
| Verified boot-profile loading | ✅ | Listed in README scope |
| AI compute plan execution hooks | ✅ | Listed in README scope |
| Runtime reports | ✅ | Listed in README scope |

### logicn-core-security

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope, boundary, contracts fully documented — Architecture Depth section added (SecretSource discriminated union, SecretCategory 13 values, SecretRedactionPolicy, SecretReference v0.2, SecretDerivedReference/SecretDerivation, SecureStringReference extended, ProtectedSecret<T> full impl, SecretSafeSink extended with 14 type values, SecretDiagnostic, SecretTaint, safeLog, buildAuthorizationHeader, internal file layout) |
| TODO.md | ✅ | Work tracking — all v0.2 items added: SecretSource, SecretCategory, SecretRedactionPolicy, SecretTaint, combineTaint, checkStringConcat, checkSecretSink, safeLog, buildAuthorizationHeader, createSecretFingerprint, secrets/checks/runtime dirs |
| src/ | ⚠️ | Implementation stubs |
| SecureString / Secret<T> | ✅ | Contracts documented |
| Redaction primitives | ✅ | Contracts documented |
| Permission model types | ✅ | Contracts documented |
| Secret reference model | ⚠️ | Fully specified in `logicn-core-security` README and `logicn_core_security_secret_reference_model.md` (SecretReference v0.2 with id/source/category/provider/environmentScope/allowedSinks/deniedSinks/allowDerivation, SecretDerivedReference, SecureStringReference, ProtectedSecret<T>, SecretSafeSink, canSendSecretToSink deny-first, redactSecretValue, LN-SECRET-001–002); not yet implemented |
| Capability lease and attenuation | ✅ | Contracts documented |
| Crypto policy and post-quantum planning | ✅ | Contracts documented |
| Security diagnostics / reports | ✅ | Contracts documented |
| Taint-flow and safe-sink diagnostics | ✅ | Contracts documented with SecretTaint discriminated union and combineTaint() |

### logicn-core-compiler

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented — Architecture Depth section added (RuntimeManifest v0.2 with all sub-types, BuildManifestInput, Effect interface with 10-value EffectCategory, CheckedFunction/EffectGraphNode/EffectGraph, inferExpressionEffects/propagateEffects, Boundary/BoundaryRequirement/BoundaryEdge/BoundaryGraph, CheckedCallExpression, LN-EFFECT-001–004, LN-BOUNDARY-001–004, Layered Compute Adapter, ComputeDeviceProfile, internal file layout) |
| TODO.md | ✅ | Work tracking — all v0.2 items added: RuntimeManifest sub-types, BuildManifestInput, Effect interface, EffectCategory, CheckedFunction, EffectGraph, propagateEffects, Boundary types, BoundaryGraph, CheckedCallExpression, ComputeDeviceProfile, effects/boundaries/manifests/ir dirs |
| src/ | ⚠️ | Implementation stubs — compiler pipeline defined but not complete |
| Lexer | ✅ | Implemented prototype in logicn-core/compiler/ |
| Parser | ✅ | Implemented prototype in logicn-core/compiler/ |
| Type checker | ✅ | Implemented prototype in logicn-core/compiler/ |
| Formatter | ✅ | Implemented prototype in logicn-core/compiler/ |
| AST / source map | ✅ | Implemented prototype in logicn-core/compiler/ |
| Effect checker | ⚠️ | Fully specified in README and KB (Effect interface, EffectCategory, CheckedFunction, EffectGraphNode, EffectGraph, inferExpressionEffects, propagateEffects, LN-EFFECT-001–004); not yet implemented |
| Boundary checker | ⚠️ | Fully specified in README and KB (Boundary, BoundaryRequirement, BoundaryEdge, BoundaryGraph, CheckedCallExpression, LN-BOUNDARY-001–004); not yet implemented |
| Compiler pass pipeline | ✅ | 14-pass pipeline — pass 14 (Runtime manifest generator) added to README and TODO |
| Manifest generation (pass 14) | ⚠️ | Fully specified (RuntimeManifest v0.2 with RouteManifest/FunctionManifest/EffectManifest/BoundaryManifest, BuildManifestInput, buildManifest(), validateManifest(), manifests/ dir, LN-MANIFEST-001–005); not yet implemented |

### logicn-core-cli

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented — Architecture Depth section added (CliCommandResult, CompilerDiagnostic, Workspace, BuildArtefact, BuildResult, BuildWorkspaceInput, buildWorkspace() with 14-pass comments, VerifiedArtefact, VerificationResult, verifyHash(), DeploymentTarget 7 values, DeploymentResult, ValidateEffectsInput, validateEffects(), ExplainTrace, ExplainResult, buildTrace(), ComputePlan extended, estimateTarget(), exit codes 0–7, CLI report files table, CLI dir layout) |
| TODO.md | ✅ | Work tracking — all v0.2 items: BuildArtefact, BuildResult, BuildWorkspaceInput, buildWorkspace; VerifiedArtefact, VerificationResult, verifyHash; DeploymentTarget union, DeploymentResult, ValidateEffectsInput, validateEffects; ExplainTrace, ExplainResult, buildTrace; ComputePlan extended, estimateTarget; exit codes 0–7; verification-report.json, explain-report.json |
| dist/ | ⚠️ | Compiled output present |
| logicn check | ✅ | Prototype implemented |
| logicn build | ⚠️ | Partial — artefact generation not complete; fully specified (BuildArtefact, BuildResult, BuildWorkspaceInput, buildWorkspace, 14-pass pipeline, LN-BUILD-001–005) |
| logicn fmt | ✅ | Prototype implemented |
| logicn verify | ⚠️ | Partial — hash checks only; fully specified (VerifiedArtefact, VerificationResult, verifyHash, verification-report.json, LN-VERIFY-001–005) |
| logicn deploy | ⚠️ | Not yet implemented — fully specified (DeploymentTarget 7 values, DeploymentResult, ValidateEffectsInput, validateEffects, exit codes 0–7, LN-DEPLOY-001–005) |
| logicn explain | ⚠️ | Not yet implemented — fully specified (ExplainTrace, ExplainResult, buildTrace, explain-report.json, LN-EXPLAIN-001–004) |
| logicn plan | ⚠️ | Not yet implemented — fully specified (ComputePlan with GpuPlan/OpticalPlan/CompatibilityReport, estimateTarget, compute-plan.json, LN-PLAN-001–004) |

### logicn-core-logic

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented — Architecture Depth section added (TriState discriminated union {kind:"true"|"false"|"unknown"}, TRI_TRUE/TRI_FALSE/triUnknown, triNot/triAnd/triOr with combineUnknownReasons, Decision discriminated union allow|deny|unknown|notApplicable|conflict, constructors, decisionToRuntimeBool fails-closed, requireDeterministicDecision, CapabilityRequest/PolicyContext/evaluateCapability deny-first, combineDecisions priority order, BoolBoundaryResult, validateBoolBoundary, enforceDeterministicPath, file layout tri/decision/bool-boundary/omni) |
| TODO.md | ✅ | Work tracking — all v0.2 items: TriState discriminated union, TRI_TRUE/TRI_FALSE, triUnknown, triNot/triAnd/triOr, combineUnknownReasons, Decision discriminated union, constructors, decisionToRuntimeBool, requireDeterministicDecision, CapabilityRequest, PolicyContext, evaluateCapability, combineDecisions, BoolBoundaryResult, validateBoolBoundary, enforceDeterministicPath, tri/decision/bool-boundary dirs |
| src/ | ⚠️ | Implementation stubs |
| Tri logic operations | ⚠️ | Fully specified in `logicn-core-logic-tri-decision-bool.md` and README (TriState discriminated union, TRI_TRUE/TRI_FALSE, triUnknown, triNot/triAnd/triOr, combineUnknownReasons, LN-TRI-001–003); not yet implemented |
| Decision logic | ⚠️ | Fully specified in `logicn-core-logic-tri-decision-bool.md` and README (Decision discriminated union 5 kinds, allow()/deny()/unknown()/notApplicable()/conflict() constructors, decisionToRuntimeBool, requireDeterministicDecision, CapabilityRequest, PolicyContext, evaluateCapability deny-first, combineDecisions, LN-DECISION-001–003); not yet implemented |
| Bool boundary rules | ⚠️ | Fully specified (BoolBoundaryResult, validateBoolBoundary, enforceDeterministicPath, LN-BOOL-BOUNDARY-001–003); not yet implemented |
| Omni logic | ⚠️ | Fully specified in `logicn-core-logic-omni-logic.md`; v0.1 implementation = none |

### logicn-core-compute

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented — Architecture Depth section added (RuntimeTarget 11 values, GpuSuitability/GpuRequirements/GpuFallbackPlan/GpuPlan v0.2, estimateGpuSuitability score-based, buildGpuPlan, OpticalNeed/OpticalFallbackPlan/OpticalPlan, WasmTarget extended with runtime type+forbiddenEffects, DEFAULT_WASM_FORBIDDEN_EFFECTS, BROWSER_WASM_FORBIDDEN_EFFECTS, validateWasmEffect/validateWasmTarget, CompatibilityLevel/Blockers/Warnings/Fallback, CompatibilityResult extended, TargetProfile, validateTarget, buildCompatibilityReport, CompatibilityReport, shared types ComputeWorkload/DataShape/DeploymentShape/ComputeDiagnostic) |
| TODO.md | ✅ | Work tracking — all v0.2 items: RuntimeTarget 11 values, GpuSuitability, GpuRequirements, GpuFallbackPlan, GpuPlan v0.2, estimateGpuSuitability, buildGpuPlan, OpticalNeed, OpticalFallbackPlan, OpticalPlan, estimateOpticalNeed, buildOpticalPlan, WasmTarget extended, DEFAULT/BROWSER forbidden effects, validateWasmEffect, validateWasmTarget, CompatibilityLevel, Blockers/Warnings/Fallback, CompatibilityResult extended, TargetProfile, validateTarget, CompatibilityReport, buildCompatibilityReport, shared types |
| src/ | ⚠️ | Implementation stubs |
| Compute block model | ✅ | Documented in logicn-core docs |
| Compute effects and capabilities | ✅ | Specified in `logicn-core-compute-gpu-and-photonic-backends.md` |
| GPU plan output | ⚠️ | Fully specified (GpuPlan v0.2 with schemaVersion, GpuSuitability 5 values, estimateGpuSuitability score-based, buildGpuPlan, gpu/ dir); backend not implemented |
| Photonic / optical plan output | ⚠️ | Fully specified (OpticalNeed 5 values, OpticalFallbackPlan, OpticalPlan with recommendedMode, estimateOpticalNeed, buildOpticalPlan, photonic/ dir); backend not implemented |
| GPU fallback rules | ✅ | Specified — all fallback paths documented with audit events |
| Scheduler and planner | ✅ | Specified — responsibilities, inputs, and audit events documented |
| WASM target | ⚠️ | Fully specified (WasmTarget extended with runtime type + forbiddenEffects[], DEFAULT_WASM_FORBIDDEN_EFFECTS, BROWSER_WASM_FORBIDDEN_EFFECTS, validateWasmEffect, validateWasmTarget, wasm/ dir, LN-WASM-001–004); not yet implemented |
| Target compatibility report | ⚠️ | Fully specified (CompatibilityLevel, CompatibilityBlocker/Warning/Fallback, CompatibilityResult extended, TargetProfile, validateTarget, CompatibilityReport, buildCompatibilityReport, compatibility/ dir, LN-COMPAT-001–004); not yet implemented |

### logicn-core-config

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented — Architecture Depth section added (ConfigValue discriminated union 6 kinds, EnvironmentPolicy with allowSecretValuesInReports: false, defaultEnvironmentPolicy() per mode, EnvironmentConfig v0.2 with schemaVersion, SecretEnvironmentReference v0.2 with id/source/category/provider/requiredIn[]/allowedSinks/deniedSinks/redaction, SecretConfigSource discriminated union env|file|secretStore|runtimeInjected, LoadEnvironmentConfigInput, loadEnvironmentConfig(), EnvironmentConfigReport, SecretReportValue, internal file layout) |
| TODO.md | ✅ | Work tracking — all v0.2 items: ConfigValue discriminated union, EnvironmentPolicy with allowSecretValuesInReports always false, defaultEnvironmentPolicy(), EnvironmentConfig schemaVersion, SecretEnvironmentReference v0.2, SecretConfigSource, LoadEnvironmentConfigInput, loadEnvironmentConfig(), EnvironmentConfigReport, SecretReportValue, environment/secrets/loaders/types dirs |
| src/ | ⚠️ | Implementation stubs |
| Environment config model | ⚠️ | Fully specified (EnvironmentConfig v0.2, EnvironmentMode, EnvironmentPolicy, defaultEnvironmentPolicy(), LoadEnvironmentConfigInput, loadEnvironmentConfig(), EnvironmentConfigReport, LN-CONFIG-001–010); not yet implemented |
| Secret reference model | ⚠️ | Fully specified (SecretEnvironmentReference v0.2, SecretConfigSource discriminated union, SecretReportValue); ownership in logicn-core-security |
| Runtime policy config | ✅ | Documented in KB — `runtime-policy-config.md` |

### logicn-core-network

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented — Architecture Depth section added (NetworkProtocol extended with quic, NetworkDestinationReference extended with provider/category/dataCategories, NetworkPolicy extended with default/allowPlainHttp/aiProviders/requireTimeouts/requireRateLimits, productionNetworkPolicy with SSRF-safe deny list, AiProviderNetworkPolicy/OPENAI_POLICY, GovernedNetworkRuntime, SafeHttpRequestInput/SafeHttpResponse, validateDestination/validateTlsRequirement/validateCapability/safeHttpRequest, WebhookVerificationConfig/WebhookVerificationResult/verifyWebhookHmac/validateWebhookTimestamp, ReplayStore/validateReplayProtection, IdempotencyStore/validateIdempotency, validateAiPrompt, NetworkDiagnostic/NetworkPolicyReport, policy/runtime/webhook/reports/diagnostics dirs) |
| TODO.md | ✅ | Work tracking — all v0.2 items: quic protocol, NetworkDestinationReference extended fields, NetworkPolicy extended fields, productionNetworkPolicy, AiProviderNetworkPolicy, OPENAI_POLICY, GovernedNetworkRuntime, SafeHttpRequestInput, SafeHttpResponse, validateDestination, validateTlsRequirement, validateCapability, safeHttpRequest, WebhookVerificationConfig, WebhookVerificationResult, verifyWebhookHmac, validateWebhookTimestamp, ReplayStore, validateReplayProtection, IdempotencyStore, validateIdempotency, validateAiPrompt, NetworkDiagnostic, NetworkPolicyReport |
| src/ | ⚠️ | Implementation stubs |
| Network boundary policy | ✅ | Documented in KB — `network-boundary-policy.md` |
| Rate limiting | ✅ | Documented in KB — `layered-rate-limits.md` |
| API boundary contracts | ✅ | Documented in KB — `runtime-boundary-declarations.md` |
| Governance model | ⚠️ | Fully specified (NetworkProtocol 7 values, NetworkDestinationReference, NetworkPolicy, productionNetworkPolicy, GovernedNetworkRuntime, safeHttpRequest, validateDestination/TlsRequirement/Capability, AiProviderNetworkPolicy, SSRF deny list, LN-NETWORK-001–008); not yet implemented |
| Webhook HMAC / replay / idempotency | ⚠️ | Fully specified (WebhookVerificationConfig, verifyWebhookHmac, validateWebhookTimestamp, ReplayStore/validateReplayProtection, IdempotencyStore/validateIdempotency, webhook/ dir); not yet implemented |

### logicn-core-reports

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented — Architecture Depth section added (RuntimeAuditStatus v0.2 allowed|denied|warning|error|executed|verified with v0.1 aliases, RuntimeAuditEvent v0.2 with schemaVersion/eventId/category 8 values/runtime/references, RuntimeAuditRuntime, RuntimeAuditReference, serializeAuditEvent sync/appendAuditEvent async, ExecutionProofHashes 5 SHA256 fields, ExecutionProof v0.2 with schemaVersion, buildExecutionProof/validateExecutionProof async, DenialReport v0.2 with 6 categories, CapabilityEvidence v0.2, EffectEvidence v0.2, RuntimeEvidence v0.2 with arrays, buildRuntimeEvidence(), validateAuditSafety(), shared/ dir, output layout build/reports/audit/proofs/denials/evidence) |
| TODO.md | ✅ | Work tracking — all v0.2 items: RuntimeAuditStatus v0.2, RuntimeAuditEvent v0.2, RuntimeAuditRuntime, RuntimeAuditReference, serializeAuditEvent/appendAuditEvent, validateAuditSafety, ExecutionProofHashes, ExecutionProof v0.2, buildExecutionProof/validateExecutionProof, DenialReport v0.2, CapabilityEvidence/EffectEvidence/RuntimeEvidence v0.2, buildRuntimeEvidence, shared/ dir, evidence/ dir |
| src/ | ⚠️ | Implementation stubs |
| Security report contracts | ✅ | Defined in logicn-core-security scope |
| AI context report | ✅ | Documented in logicn-core (app.ai-context.json) |
| Build / deployment reports | ✅ | Documented in `build-system-and-cli.md` |
| Runtime audit log format (JSONL) | ⚠️ | Fully specified v0.2 (RuntimeAuditEvent with schemaVersion "logicn.runtime.audit.v1", RuntimeAuditStatus 6 values, RuntimeAuditRuntime, RuntimeAuditReference, serializeAuditEvent sync, appendAuditEvent async, validateAuditSafety, audit/ dir, LN-REPORT-001–005); not yet implemented |
| Execution proof format | ⚠️ | Fully specified v0.2 (ExecutionProofHashes with 5 SHA256 fields, ExecutionProof schemaVersion "logicn.proof.v1", buildExecutionProof/validateExecutionProof async, proofs/ dir, LN-PROOF-001–005); not yet implemented |
| Denial report | ⚠️ | Fully specified v0.2 (DenialReport with schemaVersion "logicn.denial.v1" and 6-category union, denials/ dir, LN-DENIAL-001–004); not yet implemented |
| Capability / effect / runtime evidence | ⚠️ | Fully specified v0.2 (CapabilityEvidence, EffectEvidence with declared/inferred/transitive fields, RuntimeEvidence with arrays, buildRuntimeEvidence async, evidence/ dir, LN-EVIDENCE-001–004); not yet implemented |

### logicn-core-tasks

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented |
| TODO.md | ✅ | Work tracking |
| dist/ | ⚠️ | Compiled output present |
| Task / wait model | ✅ | Documented in KB — `async-task-model.md` |
| Worker pool contracts | ✅ | Documented in KB — `governed-worker-pools.md` |
| Cancellation policy | ✅ | Documented in KB — `controlled-parallelism.md` |

### logicn-core-vector

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented |
| TODO.md | ✅ | Work tracking |
| src/ | ⚠️ | Implementation stubs |
| Vector<N,T> / Matrix<R,C,T> | ✅ | Documented in KB — `numeric-and-compute-types.md` |
| pure vector flow model | ✅ | Documented in logicn-core docs |

### logicn-core-photonic

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented — Governance-First Architecture section added (OpticalTransportMode, PhotonicRuntimeTarget, PhotonicExecutionPlan, estimateOpticalSuitability, buildPhotonicPlan, resolveFallback, LN-PHOTONIC-001–006, planned sub-packages); v0.2 Architecture Depth section added (OpticalTransportMode 6-value enum, PhotonicRuntimeTarget v0.2 fields, PhotonicExecutionPlan v0.2 fields, all validation functions, PhotonicCapability enum, topologies, updated LN-PHOTONIC codes with v0.2 meanings, v0.2 file layout, determinism rule) |
| TODO.md | ✅ | Work tracking — all governance types, functions, diagnostic codes, internal dir items; planned sub-packages (logicn-target-photonic-runtime, -routing, -audit) added; v0.2 items added (OpticalTransportMode 6-value enum, PhotonicRuntimeTarget/PhotonicExecutionPlan v0.2 fields, validateIsolation/validatePropagation/validateHybridMode/validateRealtime, PhotonicCapability enum, validateCapability, topologies, updated LN-PHOTONIC codes, all v0.2 dir files, experimental restrictions, determinism rule) |
| src/ | ⚠️ | Implementation stubs — planning layer only |
| Photonic compute plan | ✅ | Documented in KB — `native-photonic-compute-future.md` |
| Photonic resolution boundary | ✅ | Documented in KB — `photonic-resolution-boundary.md` |
| Governance architecture (prior KB) | ⚠️ | Fully specified in `logicn-core-photonic-backend-architecture.md` (OpticalTransportMode, PhotonicRuntimeTarget, PhotonicExecutionPlan, estimateOpticalSuitability, buildPhotonicPlan, resolveFallback, deny-by-default fallback, LN-PHOTONIC-001–006 prior meanings); not yet implemented |
| Governance architecture (v0.2 formal spec) | ⚠️ | Fully specified in `logicn-core-photonic-v02.md` (OpticalTransportMode 6-value enum, PhotonicRuntimeTarget v0.2, PhotonicExecutionPlan v0.2, validation functions, PhotonicCapability, topologies, LN-PHOTONIC-001–006 v0.2 meanings, determinism rule); not yet implemented |
| Real photonic backend | ❌ | Not yet — planning only until hardware available |

### logicn-framework-api-server

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Fully documented — LogicnApiManifest schema v1, LogicnRouteManifest with all sub-policies (BodyPolicy, RouteLimits, AuthPolicy, IdempotencyPolicy, WebhookPolicy, EffectsPolicy, RouteReportPolicy), startApiServer, readBodyWithLimit, handleApiRequest pipeline, verifyHmacSha256Webhook, timingSafeHexEqual, assertWebhookNotReplayed, ReplayStore, exportOpenApi, LogicnHttpError, mapErrorToHttpResponse, assertNetworkAllowed, JSON rules (unknown/duplicate/null/UTF-8), HTTP status codes table, build output layout, src layout |
| TODO.md | ✅ | Work tracking — all Architecture Depth items added: HttpMethod 7 values, LogicnApiManifest, LogicnRouteManifest, all sub-policy types, startApiServer, readBodyWithLimit, handleApiRequest pipeline steps, JSON rules, verifyHmacSha256Webhook, timingSafeHexEqual, ReplayStore, exportOpenApi, LogicnHttpError, mapErrorToHttpResponse, assertNetworkAllowed, HTTP status codes, src/ dir layout |
| src/ | ❌ | Not yet implemented |
| API manifest schema | ✅ | Fully specified in `logicn-api-boundary-architecture.md`, `logicn-framework-api-server-v02.md`, and README |
| Route manifest | ✅ | Fully specified (LogicnRouteManifest with all policies; v0.2: method/path/capability/boundary/effects[]/authRequired/replayProtected/webhook) |
| Request handling pipeline | ✅ | Fully specified (handleApiRequest: assertContentType → assertRateLimit → assertAuth → decodeRequestBody → validateType → assertEffectsAllowed → callFlow; v0.2 10-step pipeline via resolveRoute/validateMethod/validateCapabilities/validateReplay/validateBoundary/executeHandler/auditRequest) |
| Webhook HMAC verification | ✅ | Fully specified (verifyHmacSha256Webhook, timingSafeHexEqual, assertWebhookNotReplayed, ReplayStore; note: v0.2 WebhookVerificationConfig uses `secret` field, not `sharedSecret`) |
| OpenAPI export | ✅ | Fully specified (exportOpenApi with x-logicn-capability/x-logicn-boundary extended metadata) |
| Error mapping | ✅ | Fully specified (LogicnHttpError class with status+message, mapErrorToHttpResponse, 16 HTTP status codes) |
| v0.2 formal spec | ✅ | Fully specified in `logicn-framework-api-server-v02.md` (HttpMethod enum 7 values, LogicnRouteManifest, LogicnApiManifest, RoutePolicy, 7 policies, handleApiRequest() 10-step, ReplayStore {exists/save}, validateReplay() 409, WebhookVerificationConfig {secret field}, verifyHmacSha256Webhook, validateBoundary, validateAuth, exportOpenApi, LogicnHttpError, mapErrorToHttpResponse) |

---

## Summary: Remaining Gaps

### Priority 1 — Core Syntax (resolved)

```text
✅ Import / module system syntax — module-system-and-visibility.md
✅ Visibility (public / private) — module-system-and-visibility.md
```

### Priority 2 — Logic (resolved)

```text
✅ Error propagation through call chains — error-propagation-chains.md
```

### Priority 3 — Runtime (resolved)

```text
✅ CI/CD integration (OIDC, SLSA provenance, attestation workflow) — cicd-integration-and-provenance.md
✅ Runtime audit log format — runtime-audit-log-format.md (schema planned, not yet finalised)
✅ Effect checker and boundary checker — effect-checker-and-boundary-checker.md (planned, not yet implemented)
✅ Compile-time vs runtime authority — compile-time-vs-runtime-authority.md
```

### Priority 4 — Package Implementation (key gaps remaining)

```text
⚠️ logicn-core-compiler: effect checker and boundary checker
     KB: effect-checker-and-boundary-checker.md (16-item checklist, LN-EFFECT/LN-BOUNDARY codes)
     README: Effect/CheckedFunction/EffectGraphNode/EffectGraph, Boundary types, LN-EFFECT-001–004, LN-BOUNDARY-001–004
     Status: fully specified v0.2 (Effect interface, EffectCategory 10 values, propagateEffects iterative fixpoint, Boundary, BoundaryGraph, CheckedCallExpression), implementation pending

⚠️ logicn-core-compiler: manifest generation (pass 14)
     KB: effect-checker-and-boundary-checker.md (RuntimeManifest, buildManifest, LN-MANIFEST-001–005)
     README: RuntimeManifest v0.2 with RouteManifest/FunctionManifest/EffectManifest/BoundaryManifest, BuildManifestInput
     Status: fully specified v0.2, not yet implemented

⚠️ logicn-core-cli: logicn build, logicn verify, logicn deploy, logicn explain, logicn plan
     KB: logicn-core-cli-deploy-explain-plan.md (all flags, exit codes, report files, all 5 commands)
     README: BuildArtefact, BuildResult, buildWorkspace, VerifiedArtefact, VerificationResult, verifyHash, DeploymentTarget 7 values, DeploymentResult, ValidateEffectsInput, validateEffects, ExplainTrace, ExplainResult, buildTrace, ComputePlan extended, estimateTarget, exit codes 0–7
     Status: fully specified v0.2; build and verify partial, others not yet implemented

⚠️ logicn-core-reports: runtime audit log schema / execution proof / denials / evidence
     KB: runtime-audit-log-format.md (JSONL, 5-hash ExecutionProof, LN-AUDIT/REPORT/PROOF/DENIAL/EVIDENCE codes)
     README: RuntimeAuditStatus v0.2, RuntimeAuditEvent v0.2, ExecutionProofHashes, DenialReport v0.2, all evidence types v0.2, validateAuditSafety
     Status: fully specified v0.2, not yet finalised in package

⚠️ logicn-core-compute: GPU and photonic backends; WASM target; target compatibility
     KB: logicn-core-compute-gpu-and-photonic-backends.md (full architecture, WasmTarget, CompatibilityResult, LN-COMPUTE/WASM/COMPAT codes)
     README: GpuSuitability, GpuPlan v0.2, OpticalNeed, OpticalPlan, WasmTarget extended with runtime+forbiddenEffects, DEFAULT/BROWSER forbidden effects, CompatibilityLevel/Blockers/Warnings, TargetProfile, CompatibilityReport, shared ComputeWorkload/DataShape types
     Status: fully specified v0.2, planning only (v0.1 = CPU + compute planner only)

⚠️ logicn-core-logic: Tri logic, Decision logic, Bool boundary rules, Omni logic
     KB: logicn-core-logic-tri-decision-bool.md (TriState discriminated union, Decision, validateBoolBoundary, LN-TRI/DECISION/BOOL-BOUNDARY codes)
     KB: logicn-core-logic-omni-logic.md (8 states, safety rules, LN-OMNI codes)
     README: TriState as discriminated union, TRI_TRUE/TRI_FALSE/triUnknown, combineUnknownReasons, Decision as discriminated union with constructors, decisionToRuntimeBool fails-closed, combineDecisions priority order, CapabilityRequest, PolicyContext, evaluateCapability deny-first, BoolBoundaryResult
     Status: fully specified v0.2, v0.1 implementation = none

⚠️ logicn-core-config: environment config model; secret reference model
     KB: logicn-core-config-environment-secrets.md (EnvironmentMode, ProtectedSecret, canSendSecretToSink, LN-CONFIG/SECRET codes)
     README: ConfigValue discriminated union, EnvironmentPolicy with allowSecretValuesInReports: false, defaultEnvironmentPolicy(), EnvironmentConfig v0.2 with schemaVersion, SecretEnvironmentReference v0.2, SecretConfigSource discriminated union, LoadEnvironmentConfigInput, loadEnvironmentConfig(), EnvironmentConfigReport, SecretReportValue
     Status: fully specified v0.2, not yet implemented

⚠️ logicn-core-security: secret reference model with taint tracking
     KB: logicn_core_security_secret_reference_model.md
     README: SecretSource discriminated union, SecretCategory 13 values, SecretRedactionPolicy, SecretReference v0.2, SecretDerivedReference/SecretDerivation, SecureStringReference extended, ProtectedSecret<T> full impl, SecretSafeSink extended, SecretDiagnostic, SecretTaint, safeLog, buildAuthorizationHeader, file layout
     Status: fully specified v0.2, not yet implemented

⚠️ logicn-core-network: governance model
     KB: logicn-core-network-governance.md (NetworkDestinationReference, NetworkPolicy, GovernedNetworkRuntime, safeHttpRequest, LN-NETWORK-001–008)
     README: NetworkProtocol+quic, productionNetworkPolicy SSRF-safe, AiProviderNetworkPolicy/OPENAI_POLICY, GovernedNetworkRuntime, SafeHttpRequest types, validateDestination/TlsRequirement/Capability, WebhookVerificationConfig, ReplayStore, IdempotencyStore, validateAiPrompt, NetworkDiagnostic/NetworkPolicyReport
     Status: fully specified v0.2, not yet implemented

⚠️ logicn-core-photonic: governance architecture
     KB: logicn-core-photonic-backend-architecture.md (prior KB — OpticalTransportMode 3-value string union, PhotonicRuntimeTarget prior fields, LN-PHOTONIC-001–006 prior meanings)
     KB: logicn-core-photonic-v02.md (v0.2 formal spec — OpticalTransportMode 6-value enum, PhotonicRuntimeTarget/PhotonicExecutionPlan v0.2, validation functions, PhotonicCapability, topologies, LN-PHOTONIC-001–006 v0.2 meanings, determinism rule)
     README: updated with v0.2 Architecture Depth section; TODO: all v0.2 items added
     Status: both prior and v0.2 fully specified; README and TODO updated; not yet implemented

⚠️ logicn-framework-api-server: full API server implementation
     KB: logicn-api-boundary-architecture.md (prior KB — full request flow, LogicnApiManifest, all route policies, handleApiRequest pipeline, webhook HMAC, replay, OpenAPI export)
     KB: logicn-framework-api-server-v02.md (v0.2 formal spec — HttpMethod enum, LogicnRouteManifest, LogicnApiManifest, RoutePolicy, 7 policies, 10-step pipeline, ReplayStore {exists/save}, WebhookVerificationConfig {secret field}, verifyHmacSha256Webhook, LogicnHttpError, mapErrorToHttpResponse, exportOpenApi)
     TODO: all Architecture Depth items specified
     Status: both prior and v0.2 fully documented; not yet implemented
```

See `package-completion-status.md` for the full implementation order (Phase 1–4).

---

## Knowledge Base File Count

Total KB files: ~193

| Area | Files | Coverage |
| --- | --- | --- |
| Syntax | ~33 core files | Strong — module/visibility, if/match/Optional rules, loop/iteration model, primitive obsession design principle added |
| Logic | ~39 core files | Strong — error propagation covered; Tri/Decision/Bool v0.2 discriminated unions; Omni logic fully specified; v0.2 formal spec KB + developer guide added |
| Runtime | ~64 core files | Strong — CI/CD, audit log v0.2 (JSONL + execution proof + denials + evidence), effects, boundaries covered; v0.2 formal spec KBs for effect checker, manifest generation, CLI, reports, compute added |
| AI/Compute | ~19 files | Strong — GPU/photonic/WASM/compatibility v0.2 architecture and compute effects fully specified |
| Cross-cutting | ~34 files | Strong — CLI v0.2, config v0.2, network v0.2, security v0.2, API boundary architecture; all 12 v0.2 formal spec KBs added |
| Architecture | ~4 files | Strong |

New files added (prior sessions):
```text
module-system-and-visibility.md           (extended — module declaration, type/capability imports, runtime loading)
error-propagation-chains.md
cicd-integration-and-provenance.md
runtime-audit-log-format.md               (extended — JSONL, execution proof, LN-AUDIT-001–007)
effect-checker-and-boundary-checker.md    (extended — 12-effect table, LN-EFFECT/LN-BOUNDARY codes, 16-item checklist,
                                                       runtime manifest JSON, extended boundary types, foundational context)
compile-time-vs-runtime-authority.md
package-completion-status.md              (new — package gaps, compiler pipeline, implementation order)
logicn-core-cli-deploy-explain-plan.md    (new — governance chain diagram, deploy validation sections, all flags, exit codes, report files)
logicn-core-compute-gpu-and-photonic-backends.md  (new — intent→plan philosophy, GPU/photonic architecture,
                                                         compute effects/capabilities, LN-COMPUTE codes)
logicn-core-logic-omni-logic.md           (new — 8 Omni states, binary safety rule + forbidden examples,
                                                  absolute unsafe pattern rule, advisory model, LN-OMNI codes)
```

New files added (this session):
```text
logicn-core-logic-tri-decision-bool.md         (new — Tri logic AND/OR/NOT truth tables, Decision 5-state type,
                                                        Bool boundary rules, validateBoolBoundary,
                                                        enforceDeterministicPath, LN-TRI/DECISION/BOOL-BOUNDARY codes)
logicn-core-config-environment-secrets.md      (new — EnvironmentMode closed type, EnvironmentConfig,
                                                        SecretEnvironmentReference, SecretReference, ProtectedSecret,
                                                        SecretSafeSink, canSendSecretToSink, redactSecretValue,
                                                        LN-CONFIG-001–010, LN-SECRET-001–002)
logicn-core-network-governance.md             (new — NetworkProtocol, NetworkDestinationReference, NetworkPolicy,
                                                        GovernedNetworkRuntime, safeHttpRequest, validateDestination,
                                                        AI provider governance, deny-by-default, LN-NETWORK-001–008)
logicn-core-photonic-backend-architecture.md  (new — OpticalTransportMode, PhotonicRuntimeTarget, PhotonicExecutionPlan,
                                                        estimateOpticalSuitability, buildPhotonicPlan, resolveFallback,
                                                        distributed photonic, planned sub-packages, LN-PHOTONIC-001–006)
```

Extended this session:
```text
logicn-core-cli-deploy-explain-plan.md         (extended — logicn build 14-pass section, logicn verify section,
                                                             BuildResult, VerificationResult, DeploymentResult,
                                                             ExplainResult, ComputePlan, all internal dirs,
                                                             LN-BUILD/VERIFY/DEPLOY/EXPLAIN/PLAN codes, 5-phase impl order)
logicn-core-compute-gpu-and-photonic-backends.md  (extended — GpuPlan/OpticalPlan TypeScript types, gpu/ dir,
                                                                photonic/ dir, WASM Target (WasmTarget, validateWasmEffect,
                                                                wasm/ dir, LN-WASM codes), Target Compatibility
                                                                (CompatibilityResult, validateTarget, compatibility/ dir,
                                                                LN-COMPAT codes), 4-phase impl order)
runtime-audit-log-format.md                   (extended — RuntimeAuditEvent TypeScript interface, RuntimeAuditStatus type,
                                                            serializeAuditEvent, appendAuditEvent, audit/ dir,
                                                            ExecutionProof TypeScript interface (5-hash), sha256,
                                                            buildExecutionProof, validateExecutionProof, proofs/ dir,
                                                            DenialReport, buildDenialReport, denials/ dir,
                                                            CapabilityEvidence, EffectEvidence, RuntimeEvidence,
                                                            buildRuntimeEvidence, evidence/ dir,
                                                            LN-REPORT/PROOF/DENIAL/EVIDENCE codes, 4-phase impl order)
```

Notes processed into KB (NOTES TO COVER 107–110, prior session):
```text
107  Effect Checker and Boundary Checker   → extended effect-checker-and-boundary-checker.md
108  CLI deploy / explain / plan           → extended logicn-core-cli-deploy-explain-plan.md
109  GPU and Photonic Backends             → extended logicn-core-compute-gpu-and-photonic-backends.md
110  Omni Logic                            → extended logicn-core-logic-omni-logic.md
```

Notes processed into KB (NOTES TO COVER, this session):
```text
     Compiler Effect Boundary Manifest Documentation  → updated logicn-core-compiler README/TODO (pass 14, RuntimeManifest,
                                                          manifests/ dir, LN-MANIFEST codes)
     CLI Build Verify Deploy Explain Plan             → updated logicn-core-cli README/TODO; extended KB file
                                                          (logicn build 14-pass, logicn verify, all 5 commands fully specified)
     Logic Tri Decision Bool Omni                     → created logicn-core-logic-tri-decision-bool.md;
                                                          updated logicn-core-logic README/TODO
     Compute GPU Photonic WASM Compatibility          → extended logicn-core-compute-gpu-and-photonic-backends.md;
                                                          updated logicn-core-compute README/TODO
     Config Environment Secret References             → created logicn-core-config-environment-secrets.md;
                                                          updated logicn-core-config README/TODO;
                                                          updated logicn-core-security README/TODO
     Network Documentation                            → created logicn-core-network-governance.md;
                                                          updated logicn-core-network README/TODO
     Reports Audit Proofs Denials Evidence            → extended runtime-audit-log-format.md;
                                                          updated logicn-core-reports README/TODO
     Photonic Backend Architecture                    → created logicn-core-photonic-backend-architecture.md;
                                                          updated logicn-core-photonic README/TODO
```

Notes processed into KB (NOTES TO COVER, continuation session — v0.2 Architecture Depth):
```text
     obsession (primitive obsession design principle) → created logicn-design-primitive-obsession.md
     if.txt (if/match/Optional syntax rules)          → created logicn-syntax-if-match-optional.md
     foreach.txt (loop and iteration model)           → created logicn-syntax-loops-iteration.md
     logicn_api_boundary_architecture.md             → created logicn-api-boundary-architecture.md;
                                                          updated logicn-framework-api-server TODO.md
     logicn_core_security_secret_reference_model.md  → added Architecture Depth to logicn-core-security README/TODO
                                                          (SecretSource, SecretCategory, SecretRedactionPolicy, SecretTaint,
                                                           safeLog, buildAuthorizationHeader, secrets/checks/runtime dirs)
     logicn_core_cli_architecture.md                 → added Architecture Depth to logicn-core-cli README/TODO
                                                          (BuildArtefact, VerifiedArtefact, DeploymentTarget, ExplainTrace,
                                                           ComputePlan extended, exit codes 0–7, CLI report files table, CLI dir layout)
     logicn_core_logic_tri_decision_bool_omni_arch.md → added Architecture Depth to logicn-core-logic README/TODO
                                                          (TriState discriminated union, Decision discriminated union,
                                                           constructors, combineDecisions, BoolBoundaryResult, tri/decision dirs)
     logicn_core_compute_gpu_optical_wasm_compat.md  → added Architecture Depth to logicn-core-compute README/TODO
                                                          (GpuSuitability, GpuPlan v0.2, OpticalNeed, OpticalPlan, WasmTarget extended,
                                                           CompatibilityLevel/Blockers/Warnings, TargetProfile, RuntimeTarget 11 values)
     logicn_core_config_environment_secrets_arch.md  → added Architecture Depth to logicn-core-config README/TODO
                                                          (ConfigValue discriminated union, EnvironmentPolicy, defaultEnvironmentPolicy,
                                                           EnvironmentConfig v0.2, SecretConfigSource, LoadEnvironmentConfigInput)
     logicn_core_network_governance_webhook_arch.md  → added Architecture Depth to logicn-core-network README/TODO
                                                          (quic protocol, productionNetworkPolicy SSRF-safe, AiProviderNetworkPolicy,
                                                           GovernedNetworkRuntime, WebhookVerificationConfig, ReplayStore, IdempotencyStore)
     logicn_core_reports_runtime_audit_proofs_arch.md → added Architecture Depth to logicn-core-reports README/TODO
                                                          (RuntimeAuditStatus v0.2, RuntimeAuditEvent v0.2, ExecutionProofHashes,
                                                           DenialReport v0.2, CapabilityEvidence/EffectEvidence/RuntimeEvidence v0.2,
                                                           validateAuditSafety, shared/ dir)
     logicn_core_compiler_effect_boundary_arch.md    → added Architecture Depth to logicn-core-compiler README/TODO
                                                          (Effect interface, EffectCategory 10 values, CheckedFunction/EffectGraph,
                                                           inferExpressionEffects, propagateEffects iterative fixpoint,
                                                           Boundary/BoundaryRequirement/BoundaryEdge/BoundaryGraph,
                                                           CheckedCallExpression, RuntimeManifest v0.2 sub-types, ComputeDeviceProfile,
                                                           effects/boundaries/manifests/ir dirs)
```

Notes processed into KB (NOTES TO COVER x1–x12, v0.2 formal spec session):
```text
x1  Effect Checker and Boundary Checker (v0.2 formal spec)
        → created logicn-core-effect-checker-v02.md
          (Effect enum 7 values, CheckedFunction with Set<Effect>, EffectGraph with propagateEffects cycle detection,
           BoundaryType enum 5 values, validateBoundary(), LN-EFFECT/LN-BOUNDARY codes, file layout)

x2  Manifest Generation (v0.2 formal spec)
        → created logicn-core-manifest-generation-v02.md
          (RuntimeManifest {version/routes/functions/effects/boundaries/metadata}, all sub-types,
           BuildManifestInput, buildManifest(), helper functions, LN-MANIFEST-001–005 new meanings, v0.3 features)

x3  CLI Commands (v0.2 formal spec)
        → created logicn-core-cli-v02.md
          (exit codes 0–7, BuildArtefact/BuildResult/buildWorkspace, VerifiedArtefact/VerificationResult/verifyHash,
           DeploymentTarget 7-value enum, DeploymentResult, ExplainTrace/ExplainResult/buildTrace,
           ComputePlan/estimateTarget, ValidateEffectsInput/validateEffects, CLI report files table, file layout)

x4  Reports and Audit (v0.2 formal spec)
        → created logicn-core-reports-v02.md
          (RuntimeAuditStatus 6-value enum, RuntimeAuditEvent with evidence[]/proof?/diagnostics?, JSONL format,
           ExecutionProofHashes 5 hashes, buildExecutionProof(), DenialReport, 8 evidence types with interfaces,
           validateAuditSafety(), all diagnostic codes, v0.3 features)

x5  Compute Backends (v0.2 formal spec)
        → created logicn-core-compute-v02.md
          (ComputeWorkload/DataShape, GpuSuitability interface scored, GpuPlan, buildGpuPlan() threshold>512,
           forbiddenGpuEffects, OpticalNeed/OpticalPlan, forbiddenOpticalEffects,
           WasmTarget/DEFAULT_WASM_TARGET/BROWSER_WASM_TARGET, validateWasmTarget(),
           CompatibilityLevel enum 3 values, CompatibilityResult, TargetProfile, CompatibilityReport,
           checkCompatibility(), LN-COMPUTE/WASM/COMPAT codes, v0.3 features)

x6  Core Logic Types (v0.2 formal spec)
        → created logicn-core-logic-v02.md
          (TriState with type:"TRI_TRUE"/"TRI_FALSE"/"TRI_UNKNOWN" + reasons[], triAnd/triOr/triNot/triUnknown,
           LN-TRI-001–003; Decision 3-state type:"ALLOW"/"DENY"/"UNKNOWN", combineDecisions DENY>UNKNOWN>ALLOW,
           decisionToRuntimeBool fails-closed, evaluateCapability deny-first, LN-DECISION-001–003;
           BoolBoundaryResult {allowed/reason?}, validateBoolBoundary(), LN-BOOL-BOUNDARY-001–003;
           OmniState 8-value enum, evaluateOmni(), safety rules, LN-OMNI-001–004; file layout)

x7  Config Environment Secret References (v0.2 formal spec)
        → created logicn-core-config-v02.md
          (EnvironmentMode enum incl. Sandbox, ConfigValue union string/number/boolean/secret,
           EnvironmentPolicy, defaultEnvironmentPolicy(), EnvironmentConfig v0.2,
           SecretEnvironmentReference {source/key}, SecretConfigSource vault/kms/env/runtime,
           ProtectedSecret interface, loadEnvironmentConfig(), canSendSecretToSink(),
           sanitizeValue(), validateSandboxConfig(), LN-CONFIG-001–003, LN-SECRET-001–004, v0.3 features)

x8  Security Secret Reference Model (v0.2 formal spec)
        → created logicn-core-security-v02.md
          (SecretSource 6-value union adds oauth/token, SecretCategory 13-value enum,
           SecretRedactionPolicy/DEFAULT_REDACTION_POLICY, SecretReference {id/source/category/createdAt},
           SecretDerivedReference, SecretDerivation {operation/timestamp},
           SecretTaint interface {tainted/source/propagationChain[]}, SecureStringReference,
           ProtectedSecret<T> class with reveal(), SecretSafeSink, isSafeSink(), safeLog(),
           buildAuthorizationHeader() preserving propagationChain, LN-SECRET-001–005, v0.3 features)

x9  Network Governance (v0.2 formal spec)
        → created logicn-core-network-v02.md
          (NetworkProtocol 6 values, TlsRequirement enum Required/Optional/Forbidden,
           Capability enum 5 values, NetworkPolicy {allowedProtocols/allowedHosts/tlsRequirement/capabilities/allowPrivateNetworks},
           productionNetworkPolicy(), validateDestination(), AiProviderNetworkPolicy extends NetworkPolicy,
           OPENAI_POLICY, validateAiPrompt(), GovernedNetworkRuntime class, SafeHttpRequest {capability field},
           WebhookVerificationConfig {sharedSecret field}, ReplayStore {has/store}, IdempotencyStore,
           validateCapability(), LN-NETWORK-001–008, v0.3 features)

x10 Photonic — governance architecture (v0.2 formal spec)
        → created logicn-core-photonic-v02.md
          (OpticalTransportMode 6-value enum replacing prior 3-value string union,
           PhotonicRuntimeTarget {id/transport/realtime/deterministic/supportsIsolation/maxPropagationDepth},
           PhotonicExecutionPlan {target/topology/propagationDepth/estimatedLatencyNs/isolated/warnings[]},
           buildPhotonicPlan(), validateIsolation/validatePropagation/validateHybridMode/validateRealtime(),
           PhotonicCapability enum 4 values, topologies OpticalMesh/WaveguideBus/CoherentRing/HybridBridge,
           LN-PHOTONIC-001–006 new v0.2 meanings, determinism rule, v0.3 features)
        → updated logicn-core-photonic README.md
          (v0.2 Architecture Depth section: OpticalTransportMode 6-value enum, PhotonicRuntimeTarget/
           PhotonicExecutionPlan v0.2 fields, all validation functions, PhotonicCapability enum, topologies,
           updated LN-PHOTONIC codes, v0.2 file layout, determinism rule)
        → updated logicn-core-photonic TODO.md
          (all v0.2 items: 6-value enum, v0.2 interface fields, validateIsolation/validatePropagation/
           validateHybridMode/validateRealtime, PhotonicCapability enum, validateCapability, topologies,
           updated diagnostic code meanings, all v0.2 dir files, experimental restrictions, determinism rule)

x11 API Server (v0.2 formal spec)
        → created logicn-framework-api-server-v02.md
          (HttpMethod enum 7 values, LogicnRouteManifest {method/path/capability/boundary/effects[]/
           authRequired/replayProtected/webhook}, LogicnApiManifest {version/routes[]/policies[]},
           RoutePolicy, 7 supported policies, handleApiRequest() 10-step pipeline,
           ReplayStore {exists/save — differs from network package has/store},
           validateReplay() throws LogicnHttpError(409),
           WebhookVerificationConfig {algorithm/secret/headerName — uses `secret` not `sharedSecret`},
           verifyHmacSha256Webhook(), validateBoundary(), validateAuth(), exportOpenApi(),
           LogicnHttpError class, mapErrorToHttpResponse(), v0.3 features)

x12 Tri Logic Developer Guide (v0.2)
        → created logicn-core-logic-tristate-developer-guide.md
          (TriState with kind:"true"/"false"/"unknown", TRI_TRUE/TRI_FALSE/triUnknown(),
           triIf() fail-closed helper, matchTri<T>() explicit match, triOr/triNot/triAnd(),
           full AND/OR/NOT truth tables all 9 combinations, combineUnknownReasons(),
           triToDecision(), Decision with kind:"allow"/"deny"/"unknown", decisionToRuntimeBool(),
           combineDecisions() deny-first, BoolBoundaryResult {allowed/value?/diagnostic?},
           validateBoolBoundary(), security examples network request + secret access,
           compiler enforcement table, recommended patterns if/match/Decision)
```

Version conflict notes (documented in new v0.2 KB files):
```text
- OpticalTransportMode: prior KB = "photonic"|"electrical"|"hybrid" (3-value string union)
                         v0.2    = Waveguide|Coherent|Mesh|FreeSpace|Hybrid|Experimental (6-value enum)
- LN-PHOTONIC codes:    prior KB = 001 unavailable, 002 denied by policy, 003 scheduler unavailable,
                                    004 fallback occurred, 005 unsupported target, 006 invalid graph
                         v0.2    = 001 isolation missing, 002 propagation exceeded, 003 experimental prohibited,
                                    004 invalid topology, 005 non-deterministic, 006 unsafe hybrid
- TriState discriminant: x6 (v0.2 runtime spec) = type:"TRI_TRUE"/"TRI_FALSE"/"TRI_UNKNOWN"
                          x12 (developer guide)  = kind:"true"/"false"/"unknown"
- Decision discriminant: x6 = type:"ALLOW"/"DENY"/"UNKNOWN" (3 states)
                          x12 = kind:"allow"/"deny"/"unknown" (3 states)
- WebhookVerificationConfig: network package (x9) uses `sharedSecret` field
                               api server package (x11) uses `secret` field
- ReplayStore: network package (x9) = has()/store()
               api server package (x11) = exists()/save()
- ProtectedSecret: logicn-core-config (x7) = simple interface {reference, protected:true}
                    logicn-core-security (x8) = class ProtectedSecret<T> with reveal() method
- SecretSource: logicn-core-config (x7) = env/vault/kms/runtime (4 values)
                logicn-core-security (x8) = environment/vault/kms/runtime/oauth/token (6 values)
```
