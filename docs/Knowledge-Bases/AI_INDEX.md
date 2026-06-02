# LogicN — AI Canonical Index

## How to use this file

When generating LogicN code or answering questions about LogicN, consult the
CANONICAL docs listed here first. Do not use LEGACY or DEPRECATED docs as the
source of truth — they may contain superseded rules or pre-v1 patterns.

The machine-readable alias map is `logicn-glossary.schema.yaml`. Load it for
term and alias resolution without prose parsing.

The pipeline spec is `logicn-spec-manifest.yaml`. Load it for canonical file
paths used in prompt bootstrapping and tooling.

---

## Canonical Docs (use for code generation)

| Topic | Canonical Doc | Key Concepts |
|---|---|---|
| Language syntax — overview | `core-syntax-keywords.md` | Keywords, declaration forms, operator precedence |
| Language syntax — bindings | `logicn-core-syntax-bindings-pipeline.md` | `let`, `mut`, `unsafe let`, `safe mut`, binding pipeline |
| Language syntax — if/match/optional | `logicn-syntax-if-match-optional.md` | `if`, `match`, `Option<T>`, exhaustiveness; `when` guard arms; integer/string literal arms |
| Language syntax — loops | `logicn-syntax-loops-iteration.md` | `for`, `while`, iteration patterns |
| Language syntax — flow/fn/route | `flow-vs-fn-security-model.md` | Canonical rules for `flow`, `fn`, `route`; what each can and cannot do |
| Language syntax — guarded flow | `guarded-flow-spec.md` | `guarded flow`, `contract` block, `types`/`effects` sub-blocks |
| Language syntax — types/enums | `type-and-enum-declarations.md` | `type`, `enum`, branded types, enums |
| Language syntax — grammar (EBNF) | `logicn-grammar.ebnf` | Authoritative EBNF grammar; Phase 41: `when` guards, integer/string literal arms, inline contract, `:` return type, optional `effects {}`, no `else if` |
| Language syntax — unified syntax | `unified-syntax-architecture.md` | How syntax constructs compose |
| Effects | `effect-checker-and-boundary-checker.md` | Effect names, propagation rules, boundary checks |
| Effects — canonical rule for fn vs flow | `flow-vs-fn-security-model.md` | `fn` cannot declare effects (`LLN-SEC-014`); only `flow` variants can |
| Effects — inference and tracking | `logicn-effect-inference-tracking.md` | How effects propagate through the call graph |
| Capabilities | `capabilities.md` | Capability model, what capabilities exist |
| Capabilities — governed modules | `governed-capability-modules.md` | How capabilities are packaged and governed |
| Capabilities — registry | `capability-registry.yaml` | Machine-readable capability registry |
| Flow types | `flow-vs-fn-security-model.md` | `flow`, `pure flow`, `guarded flow`, `secure flow` — definitions and rules |
| Flow types — guarded | `guarded-flow-spec.md` | Full `guarded flow` spec with `contract` block |
| Governance | `logicn-governance-architecture.md` | Governance model, proof obligations, policy enforcement |
| Governance — verifier spec | `logicn-governance-verifier-spec.md` | Pass 7 governance verifier specification |
| Governance — scope | `logicn-governance-scope.md` | What is and is not governed |
| Governance — hierarchy | `logicn-governance-hierarchy.md` | Authority and trust hierarchy |
| Type system | `formal-type-system-spec.md` | Authoritative type rules, diagnostics (LLN-TYPE-*) |
| Type system — value-state | `value-state-annotations.md` | `unsafe let`, `safe mut`, gate functions, governed sinks |
| Type system — compute extensions | `logicn-type-system-compute-extensions.md` | Tensor, compute types |
| Type system — auto inference | `auto-type-inference.md` | `Auto` keyword behaviour |
| Security — model | `logicn-security-model-layers.md` | Layered security model |
| Security — fn vs flow | `flow-vs-fn-security-model.md` | `fn` has no runtime authority; `flow` is the security boundary |
| Security — value-state | `value-state-annotations.md` | Taint tracking, unsafe/safe transitions |
| Security — secrets | `logicn-core-security-secret-reference-model.md` | `SecureString`, secret handling rules |
| Security — taint types | `logicn-security-taint-types.md` | Taint propagation and declassification |
| Security — post-quantum and hardware trust | `logicn-post-quantum-hardware-security.md` | ML-DSA attestation policy, CHERI/MTE/TEE eligibility constraints, `HardwareTrustProfile`, `LLN-HW-*` diagnostics, proof-chain binding |
| Hardware targets | `logicn-hardware-targets.md` | CPU, GPU, NPU, WASM, photonic targets |
| Hardware targets — compatibility | `logicn-hardware-compatibility-matrix.md` | Target compatibility matrix |
| Hardware targets — WASM architecture | `logicn-hybrid-wasm-architecture.md` | WASM governance and native acceleration model |
| Bridge plans (Phase 13) | `logicn-phase13-passive-plans-target-bridges.md` | `TargetBridgePlan`, `HardwareTrustProfile`, deterministic bridge selection, capability matrix, `LLN-TARGET-*` diagnostics |
| Ternary type — compiler contract | `logicn-photonic-ternary-bridge-spec.md` | `Tri` type enforcement, truth tables, match exhaustiveness, `LLN-TYPE-031/032/033`, `GIRTriInfo` |
| Photonic bridge — compiler contract | `logicn-photonic-ternary-bridge-spec.md` | Photonic eligibility predicate, balanced ternary encoding, `LLN-PHOTONIC-001/002/003/004`, security invariants |
| Ternary type — runtime logic | `logicn-core-logic-tri-decision-bool.md` | Runtime `TriState`, `Decision`, `decisionToRuntimeBool`, fail-closed rules |
| Photonic — distinct compute model | `logicn-photonic-distinct-compute-model.md` | Photonic types (`Wavelength`, `Phase`, `OpticalSignal`), IR nodes, noise policy |
| Photonic — backend architecture | `logicn-core-photonic-backend-architecture.md` | Governance-first photonic runtime architecture, capability model |
| Economics | `logicn-governance-economics-platform.md` | Economic model for governed compute |
| Economics — package | `logicn-core-economics-package.md` | Economic package primitives |
| Compiler pipeline | `logicn-compiler-pipeline.md` | 10-pass pipeline, pass order, status, source files |
| AST | `ast-value-encoding.md` | What `.value` means for every AstNodeKind |
| AST — published schema | `logicn-ast-published-schema.md` | Public AST schema |
| GIR (Governed IR) | `neutral-governed-ir.md` | GIR format, purpose, fields |
| GIR — schema | `logicn-gir-schema.md` | GIR YAML/JSON schema |
| GIR — emitter architecture | `logicn-gir-emitter-architecture.md` | How GIR is produced from the checked AST |
| Runtime | `logicn-runtime-rationale.md` | Why the runtime exists and what it does |
| Runtime — lifecycle | `logicn-runtime-lifecycle.md` | Boot, execution, shutdown |
| Runtime — manifest | `logicn-package-manifest-spec.md` | Package manifest spec |
| Packages | `package-declaration-syntax.md` | Package syntax |
| Packages — resolver | `package-resolver.md` | How packages are resolved |
| Diagnostics | `logicn-compiler-pipeline.md` | Diagnostic series per pass |
| Glossary / aliases | `logicn-glossary.md` | Term definitions and canonical names |
| Glossary — machine-readable | `logicn-glossary.schema.yaml` | YAML alias map for AI tooling |

---

## Legacy Docs (historical reference only)

These docs contain pre-v1 designs. Do NOT use them as the primary source of truth
for code generation. They are retained for historical context.

| Doc | Why legacy | Superseded by |
|---|---|---|
| `logicn-core-effect-checker-v02.md` | v0.2 effect checker internals; `CheckedFunction` applied to `fn` which cannot declare effects in v1 | `effect-checker-and-boundary-checker.md`, `flow-vs-fn-security-model.md` |
| `logicn-core-security-v02.md` | v0.2 security model | `logicn-security-model-layers.md` |
| `logicn-core-manifest-generation-v02.md` | v0.2 manifest generation | `logicn-package-manifest-spec.md` |
| `logicn-core-cli-v02.md` | v0.2 CLI | `build-system-and-cli.md` |
| `logicn-core-compute-v02.md` | v0.2 compute model | `logicn-compute-target-optimisation.md` |
| `logicn-core-config-v02.md` | v0.2 config | `logicn-core-config-dotenv-trust-model.md` |
| `logicn-core-logic-v02.md` | v0.2 logic model | `logicn-core-logic-omni-logic.md` |
| `logicn-core-network-v02.md` | v0.2 network | `logicn-core-network-governance.md` |
| `logicn-core-photonic-v02.md` | v0.2 photonic | `logicn-core-photonic-backend-architecture.md` |
| `logicn-core-reports-v02.md` | v0.2 reports | `observability-and-monitoring.md` |
| `logicn-framework-api-server-v02.md` | v0.2 API server | `logicn-framework-api-server-implementation.md` |
| `phase-4-parser-ast-plan.md` | Phase 4 planning doc — AST design intent | `ast-value-encoding.md`, `logicn-ast-published-schema.md` |

---

## Do Not Use For Generation

| Doc | Reason |
|---|---|
| `logicn-core-effect-checker-v02.md` | SUPERSEDED; contains incorrect `fn`-with-effects pattern |
| Any `*-v02.md` file | v0.2 historical; all superseded by current phase docs |
| `logicn-roadmap-*.md` (multiple) | Planning/roadmap docs — not language specs |
| `logicn-phase-9-roadmap.md`, `logicn-phase-10-roadmap.md` | Roadmap items — not finalized specs |
| `bootstrap-runtime-roadmap.md`, `node-hosted-runtime-roadmap.md` | Implementation roadmaps, not specs |
| `logicn-runtime-in-logicn-roadmap.md` | Roadmap only |

---

## Quick Alias Resolution

If you see a term and are unsure of the canonical LogicN name, consult:
1. `logicn-glossary.schema.yaml` (machine-readable, preferred for tooling)
2. `logicn-glossary.md` (human-readable, includes examples and See Also links)

Key disambiguation rules:
- `fn` ≠ `flow` ≠ `route` — three distinct constructs with different authority levels
- `fn` cannot declare effects — only `flow` variants can
- `Tri` ≠ `Bool` ≠ `Decision` — three distinct types
- `Auto` ≠ `Any` — `Auto` is compile-time inference; `Any` does not exist in LogicN v1
- `unsafe let` = boundary input marking; `safe mut` = gate upgrade — not mutation modifiers
- `->` and `:` are both valid return-type separators; `:` is the modern preferred form
- `else if` is a **hard error** (LLN-SYNTAX-010) — use `match` or sequential `if`
- `when expr => body` is a guard arm in `match`; `200 => body` is an integer literal arm
- `effects {}` is optional for `pure flow` — omission means no effects (pure)
- `with effects [...]` is a **hard error** (LLN-SYNTAX-LEGACY-001) — use `contract { effects {} }`
- Phase 55 ML-DSA: `lln.gov.sig.v2` = dual-signature artifact (ed25519 + ml-dsa-65); `generateHybridGovernanceKeyPair` produces the key pair; LLN-HW-101..104 are the post-quantum attestation diagnostics

---

## See Also

- `logicn-spec-manifest.yaml` — machine-readable canonical path manifest for tooling/prompt bootstrapping
- `logicn-glossary.schema.yaml` — machine-readable alias resolution map
- `logicn-compiler-pipeline.md` — authoritative pass order and implementation status
- `flow-vs-fn-security-model.md` — canonical `fn` vs `flow` security contract
