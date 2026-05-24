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
| Runtime audit log format | ✅ | `runtime-audit-log-format.md` |
| Effect checker and boundary checker | ✅ | `effect-checker-and-boundary-checker.md` |
| Compile-time vs runtime authority boundary | ✅ | `compile-time-vs-runtime-authority.md` |
| Package completion status and implementation order | ✅ | `package-completion-status.md` |

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
| README.md | ✅ | Scope, boundary, contracts fully documented |
| TODO.md | ✅ | Work tracking |
| src/ | ⚠️ | Implementation stubs |
| SecureString / Secret<T> | ✅ | Contracts documented |
| Redaction primitives | ✅ | Contracts documented |
| Permission model types | ✅ | Contracts documented |
| Capability lease and attenuation | ✅ | Contracts documented |
| Crypto policy and post-quantum planning | ✅ | Contracts documented |
| Security diagnostics / reports | ✅ | Contracts documented |
| Taint-flow and safe-sink diagnostics | ✅ | Contracts documented |

### logicn-core-compiler

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented |
| TODO.md | ✅ | Work tracking |
| src/ | ⚠️ | Implementation stubs — compiler pipeline defined but not complete |
| Lexer | ✅ | Implemented prototype in logicn-core/compiler/ |
| Parser | ✅ | Implemented prototype in logicn-core/compiler/ |
| Type checker | ✅ | Implemented prototype in logicn-core/compiler/ |
| Formatter | ✅ | Implemented prototype in logicn-core/compiler/ |
| AST / source map | ✅ | Implemented prototype in logicn-core/compiler/ |
| Effect checker | ⚠️ | Specified in KB (`effect-checker-and-boundary-checker.md`, `package-completion-status.md`); not yet implemented |
| Boundary checker | ⚠️ | Specified in KB (`effect-checker-and-boundary-checker.md`, `package-completion-status.md`); not yet implemented |
| Compiler pass pipeline | ✅ | 13-pass pipeline documented in `package-completion-status.md` and README |
| Manifest generation | ⚠️ | JSON schema output exists; full manifest not yet |

### logicn-core-cli

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented |
| TODO.md | ✅ | Work tracking |
| dist/ | ⚠️ | Compiled output present |
| logicn check | ✅ | Prototype implemented |
| logicn build | ⚠️ | Partial — artefact generation not complete |
| logicn fmt | ✅ | Prototype implemented |
| logicn verify | ⚠️ | Partial — hash checks only |
| logicn deploy | ❌ | Not yet implemented — specified in `build-system-and-cli.md` |
| logicn explain | ❌ | Not yet implemented — specified in `build-system-and-cli.md` |
| logicn plan | ❌ | Not yet implemented — specified in `build-system-and-cli.md` |

### logicn-core-logic

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented |
| TODO.md | ✅ | Work tracking |
| src/ | ⚠️ | Implementation stubs |
| Tri logic operations | ⚠️ | Defined in KB; implementation stubs |
| Decision logic | ⚠️ | Defined in KB; implementation stubs |
| Bool boundary rules | ⚠️ | Defined in KB; implementation stubs |
| Omni logic | ⚠️ | Concept specified in `package-completion-status.md`; not yet implemented |

### logicn-core-compute

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented |
| TODO.md | ✅ | Work tracking |
| src/ | ⚠️ | Implementation stubs |
| Compute block model | ✅ | Documented in logicn-core docs |
| GPU plan output | ⚠️ | Report format defined; backend not implemented |
| Photonic plan output | ⚠️ | Report format defined; backend not implemented |
| WASM target | ❌ | Not yet implemented |
| Target compatibility report | ⚠️ | Partial implementation |

### logicn-core-config

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented |
| TODO.md | ✅ | Work tracking |
| src/ | ⚠️ | Implementation stubs |
| Environment config model | ⚠️ | Defined in KB; stubs only |
| Secret reference model | ⚠️ | Defined in security package |
| Runtime policy config | ✅ | Documented in KB — `runtime-policy-config.md` |

### logicn-core-network

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented |
| TODO.md | ✅ | Work tracking |
| src/ | ⚠️ | Implementation stubs |
| Network boundary policy | ✅ | Documented in KB — `network-boundary-policy.md` |
| Rate limiting | ✅ | Documented in KB — `layered-rate-limits.md` |
| API boundary contracts | ✅ | Documented in KB — `runtime-boundary-declarations.md` |
| Webhook HMAC / idempotency | ⚠️ | Documented in logicn-core; network package stubs |

### logicn-core-reports

| Area | Status | Notes |
| --- | --- | --- |
| README.md | ✅ | Scope documented |
| TODO.md | ✅ | Work tracking |
| src/ | ⚠️ | Implementation stubs |
| Security report contracts | ✅ | Defined in logicn-core-security scope |
| AI context report | ✅ | Documented in logicn-core (app.ai-context.json) |
| Build / deployment reports | ✅ | Documented in `build-system-and-cli.md` |
| Runtime audit log format | ⚠️ | Specified in KB (`runtime-audit-log-format.md`, `package-completion-status.md`); schema not yet finalised in package |
| Execution proof format | ⚠️ | Concept specified in `package-completion-status.md`; not yet implemented |

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
| README.md | ✅ | Scope documented |
| TODO.md | ✅ | Work tracking |
| src/ | ⚠️ | Implementation stubs — planning layer only |
| Photonic compute plan | ✅ | Documented in KB — `native-photonic-compute-future.md` |
| Photonic resolution boundary | ✅ | Documented in KB — `photonic-resolution-boundary.md` |
| Real photonic backend | ❌ | Not yet — planning only until hardware available |

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
⚠️ logicn-core-compiler: effect checker and boundary checker — KB specified, implementation pending
❌ logicn-core-cli: logicn deploy, logicn explain, logicn plan — specified in KB, not yet implemented
⚠️ logicn-core-reports: runtime audit log schema / execution proof — KB specified, not yet finalised
❌ logicn-core-compute: GPU and photonic backends — planning only (docs/Knowledge-Bases/package-completion-status.md)
⚠️ logicn-core-logic: Omni logic — concept specified in KB, not yet implemented
```

See `package-completion-status.md` for the full implementation order (Phase 1–4).

---

## Knowledge Base File Count

Total KB files: ~163

| Area | Files | Coverage |
| --- | --- | --- |
| Syntax | ~30 core files | Strong — module/visibility fully specified including declaration, type-only, capability imports |
| Logic | ~34 core files | Strong — error propagation covered |
| Runtime | ~62 core files | Strong — CI/CD, audit log, effects, boundaries, execution proof covered |
| AI/Compute | ~15 files | Strong |
| Cross-cutting | ~22 files | Strong — package status and implementation order added |
| Architecture | ~4 files | Strong |

New files added (this and prior session):
```text
module-system-and-visibility.md    (extended — module declaration, type/capability imports, runtime loading)
error-propagation-chains.md
cicd-integration-and-provenance.md
runtime-audit-log-format.md
effect-checker-and-boundary-checker.md
compile-time-vs-runtime-authority.md
package-completion-status.md       (new — package gaps, compiler pipeline, CLI plan, implementation order)
```
