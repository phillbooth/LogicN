# LogicN — Build Roadmap

**Version:** 3.0 (2026-06-04)  
**Last updated:** 2026-06-04 — Phases 1–3 + DRCM Phase 1 complete. DRCM Phase 2 open.  
**Purpose:** Authoritative implementation plan with completion status.

---

## ✅ Phases 1–3 — COMPLETE

All compiler quality, language features, docs, examples, and CI/CD governance work is done.

### Phase 1 — Compiler Quality ✅

| Task | Feature |
|---|---|
| #57 | Named record constructors `let x = TypeName { field: val }` in any expression position |
| #61 | `::` module path separator — canonical form, same AST as `.` internally |
| #55 | Named arguments at call sites — `f(name: val, other: val2)` + interpreter fix |
| #62 | Multi-variant match arms — `Identifier \| Keyword => { ... }` |
| #45 | All ENFORCED LLN codes audited and confirmed emitted |
| #50 | EC/ID/AU/LC/T/FG rule categories registered in compiler error registry |

### Phase 2 — New Language Features ✅

| Task | Feature |
|---|---|
| #56 | Domain Guard Policies — `policy Name {}` + `[conforms_to: X]` + LLN-GOV-004 Differential Proof |
| #58 | `resilience {}` + `observability {}` — auto-by-default inference, LLN-RES-001, LLN-OBS-001 |
| #52 | `security::interim::BoundaryProxy` — real callable stdlib module for cross-boundary calls |
| #51 | `@experimental_profile(name: "drcm_core_v1")` — first-class AST attribute directive |
| #59 | Change-class review CI — `logicn diff` in phase-close + GitHub Action + PR template |

### Phase 3 — Docs, Examples, CI Gates ✅

| Task | Feature |
|---|---|
| #46 | 9 architecture pattern examples in `tests/patterns/` — all pass Stage A |
| #47 | README patterns section + SETUP.md update |
| #48 | All 39 `examples/` files migrated to outside-contract `->` syntax |
| #49 | Graph re-index for new KB docs |
| #53 | `KNOWLEDGE-BASE-INDEX.md` master nav guide → README |
| #54 | `tests/goals/` — T-006 (real), T-007/T-008 (scaffolded) |
| #60 | Contract clause reference — all 17 sub-blocks with syntax + examples |
| Pattern CI | `tests:patterns` gate in `run-phase-close.mjs` — 8 patterns pass |
| Goal CI | `tests:goals` gate in `run-phase-close.mjs` — 7 tests pass |
| Governance CI | `governance:diff` gate showing change class in every phase-close |

---

## ✅ DRCM Phase 1 — COMPLETE

All 5 critical security fixes done. DRCM Phase 2 is now open.

| Task | Fix |
|---|---|
| #30 | Network wildcard ban — `effects { network.* }` → `LLN-CAP-001` |
| #31 | Prefix-token secret scanner — cleartext 8-char substring, not SHA-256 hash |
| #32 | CAS atomic monotonic transition — spec complete (gates on Phase 5 DSS.wasm) |
| #33 | `.lmanifest` dual-format output — canonical RFC 8785 JSON (signing) + pretty JSON (human) |
| #34 | ML-DSA-65 key custody — spec complete (gates on Phase 5/6) |
| #35 | Length-prefix receipt encoding — spec complete (gates on Phase 6) |

**New docs shipped:**
- `logicn-cbor-manifest-spec.md` — CBOR anatomy, 9 custom tags (400-408), 5 security controls
- `logicn-drcm-phase1-specs.md` — CAS spec, key custody spec, separator injection spec
- `logicn-governance-cicd-pipeline.md` — full CI/CD governance architecture
- `logicn-platform-infographic-concept.md` — "Governed Tower" poster concept for when platform is complete

---

## 🟡 Now Open — DRCM Phase 2 + CI/CD Enhancements

### DRCM Phase 2 (#36) — `invariant {}` block

**Most valuable visible feature.** `ensure payload.amount > 0` becomes a compile-time check.

- Parser: `invariant {}` inside `contract {}`, alongside `intent` and `effects`
- Governance verifier: static proof pass — simple runtime-evaluable expressions
- WAT emitter: dynamic assertion gate injection for invariants that can't be proved statically
- Diagnostics: `LLN-INV-001` (pre-condition violation) / `LLN-INV-002` (post-condition)
- Tests: static bypass + runtime trip

### CI/CD Enhancement Tasks

| Task | What |
|---|---|
| **#63** | `governance-impact.json` — full security surface area delta artifact per build/PR |
| **#64** | `logicn check --diff` — local dry run showing change class before git push |
| **#65** | `logicn init-env` — validate branch capabilities against root governance policy |
| **#66** | Observability/privacy separation — LLN-OBS-002 if telemetry accesses privacy scope |

### CBOR Upgrade Tasks

| Task | What | Gate |
|---|---|---|
| **#67** | Binary CBOR encoder — upgrade `.lmanifest` from RFC 8785 JSON to RFC 8949 binary | DRCM Phase 3 |
| **#68** | Hardened CBOR parser for DSS.wasm — depth limit 8, duplicate keys, overflow, type check | DRCM Phase 5 |

---

## DRCM Implementation Phases (Gated)

```
DRCM Phase 1  ✅ DONE  (#30–#35)     Critical security fixes
DRCM Phase 2  🟡 OPEN  (#36)         invariant {} + WAT gate          2026-07
DRCM Phase 3  ⬜ NEXT  (#37, #67)    .lmanifest binary CBOR + gate    2026-08
DRCM Phase 4  ⬜       (#38–#39)     Structured capabilities + policy  2026-09
DRCM Phase 5  ⬜       (#40–#41, #68) step + DSS supervisor + CBOR     2026-10/11
DRCM Phase 6  ⬜       (#42)          Epilogue Receipt + ledger        2026-12
DRCM Phase 7  ⬜       (#43–#44)      Negative tests + OS Layer 2      2027-01/02
```

---

## Complete Task Register

### ✅ Completed

| # | Task |
|---|---|
| #30 | DRCM P1 — wildcard ban LLN-CAP-001 |
| #31 | DRCM P1 — prefix-token scanner |
| #32 | DRCM P1 — CAS atomic spec |
| #33 | DRCM P1 — RFC 8785 .lmanifest |
| #34 | DRCM P1 — key custody spec |
| #35 | DRCM P1 — separator injection spec |
| #45 | Wire all LLN codes |
| #46 | 9 architecture patterns |
| #47 | README + SETUP.md |
| #48 | Examples migrated to -> syntax |
| #49 | Graph re-index |
| #50 | EC/ID/AU/LC/T/FG codes registered |
| #51 | @experimental_profile directive |
| #52 | security::interim wired |
| #53 | KNOWLEDGE-BASE-INDEX.md |
| #54 | T-006/007/008 goal tests |
| #55 | Named arguments at call sites |
| #56 | Domain Guard Policies |
| #57 | Named record constructors |
| #58 | resilience {} + observability {} |
| #59 | Change-class CI + GitHub Action |
| #60 | Contract clause reference |
| #61 | :: module path separator |
| #62 | Multi-variant match arms |

### 🟡 Pending (DRCM Phase 2 + CI/CD enhancements)

| # | Task | Priority |
|---|---|---|
| **#36** | DRCM Phase 2 — `invariant {}` block | **Next** |
| **#63** | governance-impact.json artifact | High |
| **#64** | logicn check --diff | High |
| **#65** | logicn init-env | Medium |
| **#66** | Observability/privacy separation LLN-OBS-002 | Medium |
| **#67** | Binary CBOR encoder | DRCM Phase 3 gate |
| **#68** | Hardened CBOR parser for DSS.wasm | DRCM Phase 5 gate |

### ⬜ DRCM Phases 3–7 (future)

| # | Task |
|---|---|
| #37 | DRCM Phase 3 — .lmanifest generation pipeline + admission gate |
| #38 | DRCM Phase 4 — Structured SystemCapabilityType replacing string grants |
| #39 | DRCM Phase 4 — policy {} block parser + monotonicity verifier |
| #40 | DRCM Phase 5 — DWI: step keyword + shared-nothing isolate + fuel injection |
| #41 | DRCM Phase 5 — DSS supervisor in .lln: DPM tracking + audit interceptor |
| #42 | DRCM Phase 6 — Epilogue Receipt: generation + verification + append-only ledger |
| #43 | DRCM Phase 7 — Negative test suite: all OWASP vectors + containment failure tests |
| #44 | DRCM Phase 7 — Layer 2 OS container config (OCI/gVisor) + Linux server deployment |

---

## CI/CD Gate Status

Every `run-phase-close.mjs` run now checks:

| Gate | Status | What it checks |
|---|---|---|
| `tests:core` | ✅ | 3,285 tests — 4 SOT packages |
| `tests:patterns` | ✅ | 8 architecture pattern `.lln` files |
| `tests:goals` | ✅ | T-006/007/008 acceptance tests |
| `tests:devtools-*` | ✅ | 5 devtools packages |
| `tests:ext-*` | ✅ | secrets-vault + proof-snarkjs |
| `audit:security` | ✅ | Secret taint, value-state, 0 errors |
| `audit:naming` | ✅ | Naming policy |
| `audit:provenance` | ✅ | 0 ungated-sink flows |
| `graph:reindex` | ✅ | 2,857 nodes / 3,596 edges |
| `governance:diff` | ✅ | Change class vs HEAD~1 |

**Total test count:** 3,549 (full suite) / 3,285 (SOT core)

---

## Knowledge Base (Current)

### Layer 0 — Principles
- `architecture-charter.md`

### Layer 1 — Rules
- `logicn-governance-rules.md` — 14 categories, 37+ LLN codes, enforce status
- `logicn-engineering-goals.md` — Goals A/B/C with T-006/007/008 acceptance tests

### Layer 2A — Patterns
- `logicn-architecture-patterns.md` — 9 patterns, feature profiles

### Layer 2B — Syntax Reference
- `logicn-contract-authoring-guide.md` — contract authoring with invariant/step/policy disambiguation
- `logicn-contract-clause-reference.md` — per-clause reference for all 17 sub-blocks
- `logicn-resilience-observability-design.md` — approved design, circuit_breaker, DPM integration
- `logicn-domain-guard-policies.md` — Static Manifest Clamping, Differential Proof
- `logicn-governance-cicd-pipeline.md` — CI/CD architecture, future tech positioning
- `logicn-cbor-manifest-spec.md` — CBOR anatomy, 9 tags (400-408), 5 security controls

### Layer 3 — Physical Runtime
- `logicn-deterministic-runtime-containment.md` — DRCM 7-module architecture, 4 locked decisions
- `logicn-drcm-phase1-specs.md` — CAS, key custody, separator injection specs

### Supporting
- `KNOWLEDGE-BASE-INDEX.md` — master navigation guide (4-layer hierarchy)
- `logicn-governed-design-synthesis.md` — research synthesis, 14-category model
- `logicn-governed-runtime-research-2026-06-03.md` — 113-agent deep research
- `logicn-platform-infographic-concept.md` — "Governed Tower" poster concept
- `logicn-contract-economics.md`, `logicn-design-secrets-epilogue-blocks.md`
- `logicn-wasmtime-baseline.md` — benchmark baseline
