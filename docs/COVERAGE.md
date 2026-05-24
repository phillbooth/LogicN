# LogicN Documentation Coverage

This document tracks what has been documented, what needs more depth, and what
is still missing across the three primary areas of the language specification.

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
| Core keyword set (flow, fn, let, if, else, map, uses, each, attempt, none, release) | ✅ | `core-syntax-keywords.md` |
| Excluded keywords (switch, case, elseif, for, try/catch, null, async, await) | ✅ | `core-syntax-keywords.md`, `excluded-features.md` |
| flow vs fn distinction | ✅ | `flow-vs-fn-security-model.md` |
| Flat flow style (max depth 2, guard clauses) | ✅ | `flat-flow-style.md` |
| Branching model (if/else, map) | ✅ | `branching-model.md` |
| Pattern matching (full) | ✅ | `pattern-matching.md` |
| task / wait (governed async) | ✅ | `async-task-model.md` |
| release keyword | ✅ | `release-keyword.md` |
| run worker syntax | ✅ | `governed-worker-pools.md`, `core-syntax-keywords.md` |
| each (iteration) | ✅ | `core-syntax-keywords.md` |
| attempt ... else error | ✅ | `core-syntax-keywords.md`, `no-exceptions-result-model.md` |

### Types

| Topic | Status | KB File |
| --- | --- | --- |
| Primitive types (String, Int, Decimal, Float, Bool, None) | ✅ | `core-syntax-keywords.md` |
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
| Branded/opaque types (brand OrderId: String) | ⚠️ | Noted in `type-and-enum-declarations.md` as future feature |
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
| Import / module system | ❌ | Not yet documented in KB |
| Visibility (public/private) | ❌ | Not yet documented in KB |
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
| Branching (if/else, map) | ✅ | `branching-model.md` |
| Pattern matching (full) | ✅ | `pattern-matching.md` |
| match catch-all / else | ✅ | `match-catch-all-branch.md` |
| Error propagation through call chains | ❌ | Not yet documented |

### Permissions and Authority

| Topic | Status | KB File |
| --- | --- | --- |
| uses declaration | ✅ | `flow-vs-fn-security-model.md`, `developer-friendly-permission-model.md` |
| Permission / capability / actor model | ✅ | `permission-capability-actor-model.md` |
| Developer-friendly permission model | ✅ | `developer-friendly-permission-model.md` |
| Runtime vs compile-time authority | ✅ | `authority-model.md` |
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
| Build system and logicn build CLI | ❌ | Not yet documented in KB |
| Deployment model (build-once, deploy-many) | ❌ | Not yet documented in KB |
| CI/CD integration (OIDC, SLSA provenance, attestation) | ❌ | Not yet documented in KB |
| Runtime audit log format | ❌ | Not yet documented in KB |

---

## Summary: Remaining Gaps

### Priority 1 — Core Syntax (2 items)

```text
❌ Import / module system syntax — how modules are imported and resolved in .lln
❌ Visibility (public / private) — how symbols are scoped within modules/packages
```

### Priority 2 — Logic (1 item)

```text
❌ Error propagation through call chains — how Result<T,E> propagates, attempt chaining
```

### Priority 3 — Runtime (4 items)

```text
❌ Build system and logicn build / logicn deploy CLI — full command reference
❌ Deployment model (build-once, deploy-many) — artifact lifecycle
❌ CI/CD integration (OIDC, SLSA provenance, attestation workflow)
❌ Runtime audit log format — structured log schema
```

### Deferred (future language features)

```text
⚠️ Branded/opaque types (brand OrderId: String) — noted in type-and-enum-declarations.md
```

---

## Knowledge Base File Count

Total KB files: ~145

| Area | Files | Coverage |
| --- | --- | --- |
| Syntax | ~25 core files | Strong — gaps: import/module system, visibility |
| Logic | ~32 core files | Strong — gap: error propagation patterns |
| Runtime | ~55 core files | Strong — gaps: build CLI, deploy model, CI/CD, audit log format |
| AI/Compute | ~15 files | Strong |
| Cross-cutting | ~18 files | Strong |
