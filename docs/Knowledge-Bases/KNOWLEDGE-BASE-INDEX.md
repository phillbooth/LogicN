# LogicN Core Knowledge Base — Master Navigation Guide & TCB Map

**Version:** 1.1 (2026-06-05)  
**Purpose:** Official index, validation hierarchy, and cross-reference schema for the LogicN language, compiler pipelines, and governed runtime containment model. All implementation work must conform to the specifications mapped here.

---

## 1. Documentation Architecture

```
┌──────────────────────────────────┐
│   architecture-charter.md        │  Layer 0 — Principles
│   "controlled, explainable and   │  (overrides everything below)
│    governable computation"        │
└──────────────┬───────────────────┘
               │ Enforces
               ▼
┌──────────────────────────────────┐
│   logicn-governance-rules.md     │  Layer 1 — Hard Rules
│   28+ numbered rules, LLN codes  │  (governs compiler + runtime)
└──────────┬───────────┬───────────┘
           │           │
           ▼           ▼
┌──────────────────┐  ┌──────────────────────────────┐
│ logicn-           │  │ logicn-contract-              │
│ architecture-     │  │ authoring-guide.md            │
│ patterns.md       │  │                               │
│ 9 patterns        │  │ Syntax reference: contract {} │
│ 2 feature profiles│  │ clauses, invariant, step      │
└────────┬──────────┘  └──────────────────────────────┘
   Layer 2A — Layout    Layer 2B — Syntax Reference
         │
         │ Realized via
         ▼
┌──────────────────────────────────┐
│ logicn-deterministic-runtime-    │  Layer 3 — Physical Runtime
│ containment.md                   │  (DRCM: DSS, DWI, V_DPM)
│ 7-module DRCM architecture       │
└──────────────────────────────────┘
```

---

## 2. Document Inventory

### Core Layer Documents

| Document | Tier | Responsibility | Key Concepts |
|---|---|---|---|
| `architecture-charter.md` | Layer 0: Principles | Absolute invariant axioms. No Rust host deps, pure declarative WASI TCB, security-first. | 12-Category Complete Mediation Model, foundational philosophy |
| `logicn-governance-rules.md` | Layer 1: Hard Rules | 18-category rule registry, 50+ LLN codes with enforce status. LLN-CAP-001, LLN-RES-001, LLN-OBS-001, LLN-IMPORT-001-004, LLN-ACCESS-001-002, LLN-ASSIMILATE-001-003 enforced/planned. Comment syntax. | S/C/E/K/I/M/A/P/EC/ID/AU/LC/T/FG/ST/BF/GT/IM/AC/AS categories |
| `logicn-architecture-patterns.md` | Layer 2A: Layout Patterns | 9 concrete execution topologies, feature profiles, @experimental_profile directive. | drcm_stable_v0 / drcm_core_v1 profiles; patterns 1–9 |
| `logicn-contract-authoring-guide.md` | Layer 2B: Syntax Reference | Official grammar blueprint — contract syntax, policy {} vs domain guard disambiguation. | Three-block structure: contract → policy → body |
| `logicn-contract-clause-reference.md` | Layer 2B: Syntax Reference | Per-clause reference for all contract sub-blocks including resilience/observability/invariant, plus `access {}` Default Deny, `guard {}`, `gate {}`, `import`, `static`, `bitfield`. | Status, syntax, auto-defaults, LLN codes, minimal examples |
| `logicn-tower-native-syntax.md` | Layer 2B: Syntax Reference | Tower-native security primitives §1–§10: `trap`, `governed`, `view()`, `match`, `static`, `bitfield`, `gate`, `access`, `import`, `import plugin`. | WAT output, V_DPM bitmask, Default Deny, assimilation, govComment manifest |
| `logicn-governed-inference-tower.md` | Layer 2B: Syntax Reference | Three-tier AI governance (BitNet/GroqCloud/NVFP4), Promotion Pipeline CLI, `ai {}` contract structure | governance_tier, audit_depth, fallback_approved, .lmanifest engine passport, tasks #118–#124 |
| `logicn-deterministic-runtime-containment.md` | Layer 3: Physical Runtime | DRCM 7-module architecture, 4 locked decisions (DSS/DWI/V_DPM/step). | DSS.wasm, V_DPM 32-bit register, DWI 4MB isolates, fuel injection |

### Security, Governance & Policies

| Document | Purpose |
|---|---|
| `logicn-domain-guard-policies.md` | Static Manifest Clamping — `policy Name {}` external anchor + `[conforms_to: X]` Differential Proof; LLN-GOV-004 |
| `logicn-drcm-phase1-specs.md` | DRCM Phase 1 specs: CAS atomic (#32), key custody (#34), separator injection (#35) |
| `logicn-cbor-manifest-spec.md` | CBOR anatomy (RFC 8949), 9 custom tags 400-408, 5 security controls (depth/duplicates/overflow/canon/type) |
| `logicn-governance-cicd-pipeline.md` | CI/CD governance architecture — change-class gates, manifest signing, future tech (FHE/AI agents/PQS/ZKP) |
| `logicn-resilience-observability-design.md` | resilience {} + observability {} approved design — circuit_breaker, DPM integration, LLN-RES-001/LLN-OBS-001 |

### Research & Engineering Goals

| Document | Purpose |
|---|---|
| `logicn-engineering-goals.md` | **Start here for "what done looks like"** — Goals A/B/C, T-006/007/008 acceptance tests |
| `logicn-governed-design-synthesis.md` | Deep research: 14-category model, 9 missing categories, change-class workflow |
| `logicn-governed-runtime-research-2026-06-03.md` | 113-agent research: Cedar/OPA/Pony/Austral/Koka/in-toto/W3C-PROV enhancements |
| `logicn-platform-infographic-concept.md` | "Governed Tower" poster concept — 5-floor building layout; render when DRCM Phase 2+5 complete |

### Build & Roadmap

| Document | Purpose |
|---|---|
| `logicn-build-roadmap.md` | **Authoritative build roadmap** — v6.0: Phases 1–3 ✅, DRCM Phases 1–4 ✅, Tower-native v2.1 foundations (tasks #86–#94) ✅, Phase 5 open; 2888 nodes / 3625 edges |
| `logicn-engineering-goals.md` | Three architectural goals with acceptance tests |
| `logicn-wasmtime-baseline.md` | Benchmark baseline: governance-cost 3.2K/s → 1.88M/s after WASM |

### Supporting Reference

| Document | Purpose |
|---|---|
| `logicn-design-secrets-epilogue-blocks.md` | secrets {} + epilogue {} — auto-by-default, vault/KMS rotation, taint guard |
| `logicn-contract-economics.md` | economics {} — CostGraph/ValueGraph auto-inference |
| `logicn-domain-guard-policies.md` | Domain guard: policy Name {} as external anchor, [conforms_to:] decorator |
| `secure-by-default-syntax-principles.md` | 12 syntax-level security principles |
| `capabilities.md` | Capability model — effects vs capabilities, structured descriptors |
| `logicn-runtime-component-structure.md` | Mermaid diagrams — package ecosystem, compiler pipeline, execution tiers |

---

## 3. Order of Precedence & Conflict Resolution

When any ambiguity or structural conflict is identified across KB documents during compilation, static analysis, or authoring:

**Tier 1 — Architecture Charter** overrides all downstream documents.
- If a pattern or code block implies a custom native host FFI extension: rejected per the *No Rust Guest-Side Bypass* principle.
- If a rule contradicts a charter axiom: the charter wins.

**Tier 2 — Governance Rules** dictate compiler diagnostic behavior.
- If the Contract Authoring Guide permits a syntax layout that violates a numbered rule in `logicn-governance-rules.md`: the rule takes precedence and the compiler emits a hard build fault.
- LLN diagnostic codes are authoritative. The rule document is the single source of truth for what each code means.

**Tier 3 — Design Reference Guides** (patterns + contract authoring guide) describe syntactic intent.
- They must map exactly onto the physical sandbox constraints of the runtime-containment doc.
- If a pattern shows syntax that contradicts the DRCM model: the DRCM model wins.

---

## 4. Feature Gate Manifest

| Profile | Description | Patterns | Compiles today? |
|---|---|---|---|
| `drcm_stable_v0` | Fully enforced by Stage A compiler | 1, 2, 3, 5 (and stable portions of 4, 6) | ✅ Yes |
| `drcm_core_v1` | Forward-looking — requires `@experimental_profile` wrapper | 4 (step), 7, 8, 9 | ⚠️ Parsed, verification skipped |

**Wrapping syntax:**
```lln
@experimental_profile(name: "drcm_core_v1", status: "planned_phase_5") {
  ;; ... forward-looking DRCM syntax here ...
  let result = step external_api::call(payload)
}
```

**Compiler behavior:**
- `--release`: `@experimental_profile` blocks parsed, verification skipped, grammar validated
- `--enable-experimental-profile=drcm_core_v1`: full verification and WAT gate injection active
- Bare `step` in `--release` without wrapper: `LLN-DRCM-UNSUPPORTED`
- Under `drcm_core_v1`: bare `step` is AST-rewritten to `security::interim::BoundaryProxy`

**Graduation path:** When a DRCM phase ships, remove the `@experimental_profile(...)` wrapper. The inner syntax is already correct — no source rewriting needed. Recompile and fix any new static proof errors.

---

## 5. 12-Category Complete Mediation Model

From `notes/17-contact components` (2026-06-04). Every high-trust `.lln` module must be mediated across all 12 categories:

| # | Category | Language Primitive | Rule Category |
|---|---|---|---|
| 1 | Syntax | `types {}`, `flow`, `step` | S-xxx |
| 2 | Contract | `intent {}`, `invariant {}` | C-xxx |
| 3 | Effect | `effects {}` | E-xxx |
| 4 | Capability | `authority {}`, `targets {}` | K-xxx |
| 5 | Isolation | `limits {}` | I-xxx |
| 6 | Monotonic | *(implicit — V_DPM)* | M-xxx |
| 7 | AI Authoring | *(implicit — app.ai-guide.md)* | A-xxx |
| 8 | Process | `request {}`, `response {}` | P-xxx |
| 9 | Economics 🌟 | `economics {}` | EC-xxx |
| 10 | Identity 🌟 | `.lmanifest`, ML-DSA-65 | ID-xxx |
| 11 | Auditability 🌟 | `privacy {}`, `secrets {}`, `audit {}` | AU-xxx |
| 12 | Lifecycle 🌟 | *(policy — contract versioning)* | LC-xxx |

🌟 = DRCM Phase 3+ (Economics partially enforced today via economics-inference.ts)

---

## 6. Implementation Task Map

### ✅ Complete

| Tasks | Description |
|---|---|
| #30–#35 | DRCM Phase 1 — all 5 security fixes (wildcard ban, prefix scanner, CAS spec, .lmanifest, key custody spec, separator spec) |
| #45–#62 | Phases 1–3 — compiler quality, language features, docs, CI/CD (all complete) |

### 🟡 Open — Next Build Targets

| Task | Description | Priority |
|---|---|---|
| **#36** | DRCM Phase 2 — `invariant {}` parser + WAT gate injection | **Next** |
| **#63** | `governance-impact.json` artifact per build/PR | High |
| **#64** | `logicn check --diff` — local dry run change-class | High |
| **#65** | `logicn init-env` — root policy validation | Medium |
| **#66** | LLN-OBS-002: observability cannot access privacy scope | Medium |
| **#67** | Binary CBOR encoder for .lmanifest (RFC 8949) | DRCM Phase 3 gate |
| **#68** | Hardened CBOR parser for DSS.wasm | DRCM Phase 5 gate |

### ⬜ DRCM Phases 3–7 (future)

| Tasks | Description |
|---|---|
| #37 | DRCM Phase 3 — .lmanifest admission gate |
| #38–#39 | DRCM Phase 4 — Structured capabilities + policy {} |
| #40–#41 | DRCM Phase 5 — step keyword + DSS supervisor |
| #42 | DRCM Phase 6 — Epilogue Receipt |
| #43–#44 | DRCM Phase 7 — Negative tests + OS Layer 2 |

---

## 7. Negative Test Strategy Anchor

The Phase 7 negative test suite uses this index to auto-discover cross-document validation requirements:

1. Every `LLN-xxx` code in the registry → must have a test in `tests/negative/`
2. Every pattern in `logicn-architecture-patterns.md` → must have a positive test in `tests/patterns/`
3. Every `@experimental_profile(drcm_core_v1)` block in examples → must have a test confirming it parses cleanly under `--release` and fully verifies under `--enable-experimental-profile=drcm_core_v1`

---

## 8. AI Tool Instructions

When an AI tool is generating LogicN code for this project:

1. **Check this index first** — determine which layer governs the code being written
2. **Check the rules doc** — find the applicable LLN codes and their enforcement status
3. **Choose the right pattern** — use the Quick Selector in `logicn-architecture-patterns.md`
4. **Use the contract authoring guide** — for the correct `contract {}` clause structure
5. **Wrap forward-looking syntax** — use `@experimental_profile(name: "drcm_core_v1", ...)` for any DRCM Phase 2+ syntax
6. **Never self-grant capabilities** — all authority/effects widening must go through the propose → verify → approve pipeline (rule C-005)
7. **Always include `intent {}`** on secure/governed flows — rule A-001

---

## 9. Quick Reference: Which file answers which question?

| Question | Answer in |
|---|---|
| What are the project's core principles? | `architecture-charter.md` |
| What rule governs X? What LLN code fires? | `logicn-governance-rules.md` |
| How do I structure this type of flow? | `logicn-architecture-patterns.md` |
| What goes in a `contract {}` block? | `logicn-contract-authoring-guide.md` |
| How does the DRCM work? DSS, DWI, V_DPM? | `logicn-deterministic-runtime-containment.md` |
| Can I write `step` / `invariant` today? | `logicn-architecture-patterns.md` (Feature Profile Reference) |
| How do `secrets {}` and `epilogue {}` work? | `logicn-design-secrets-epilogue-blocks.md` |
| How is `economics {}` auto-inferred? | `logicn-contract-economics.md` |
| What did the governed runtime research find? | `governed-runtime-research-2026-06-03.md` |
