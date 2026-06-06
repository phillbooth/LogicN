# LogicN — Task Ledger #1–#148 (graph-review checklist)

**Generated:** 2026-06-06 · **State:** 44/44 packages · 4,128 tests · 0 fail · graph 2,924 nodes / 3,673 edges · audit 0 findings · governance NEUTRAL.

## How to use this (the point)
When you change a file, find its **code area** in §4, read off the **task IDs** that touch
it, and re-verify those features. Cross-check with the project graph
(`node scripts/run-phase-close.mjs` → graph:reindex, or the devtools-project-graph) to see
which flows/packages depend on the changed node. Status legend: ✅ done · 🔶 in-progress · 🔲 pending.

---

## 1. Status rollup
- **Done:** 135 · **In-progress:** 2 (#105, #145) · **Pending:** 11 (#69, #102, #103, #104, #106, #110, #143, #146, #147, #148).
- **P9 critical path:** #144 ✅ → #145 🔶 (type-aware string runtime) → #143 🔲 (tokenize byte-parity = P9 complete).
- **Post-P9 (frozen until P9 parity + gaps review):** #146, #147, #148. **Post-P9 DSS.wasm:** #102–#104, #106.

---

## 2. Task ledger (#1–#148)

| # | Title (abbrev) | Status | Subsystem |
|---|---|---|---|
| 1–3 | Graph generator: place / build / wire+run | ✅ | devtools-project-graph |
| 4–10 | LLN-GOV-010 intent cleanup + auditor minimal-example rule | ✅ | examples · devtools-security |
| 11–13 | call-chain benchmark (.lln + mirrors + runner) | ✅ | devtools-benchmarks |
| 14 | Full benchmark suite + compare | ✅ | devtools-benchmarks |
| 15–16 | Bytecode-VM CALL fix + compiler tests | ✅ | core-compiler (interpreter) |
| 17–18 | Security audit sweep · examples up-to-date | ✅ | devtools-security · examples |
| 19 | Roadmap to 100% Runtime-in-LogicN | ✅ | docs |
| 20–22 | compare.mjs label fixes · http-throughput | ✅ | devtools-benchmarks |
| 23 | Physics N-body benchmark | ✅ | devtools-benchmarks |
| 24–27 | Self-hosting Stage B stubs · type-checker.lln subset | ✅ | core-compiler/self-hosted |
| 28 | ext-secrets-aws vault | ✅ | ext-secrets-vault |
| 29 | ext-proof-snarkjs Groth16 | ✅ | ext-proof-snarkjs |
| 30–35 | DRCM Phase 1: cap audit / scanner / CAS / CBOR / key custody / receipt sep | ✅ | core-compiler (manifest/proof/capability) |
| 36 | DRCM P2: invariant{} parser + static proof + WAT gate | ✅ | core-compiler (parser, wat-emitter) |
| 37 | DRCM P3: .lmanifest pipeline + admission gate | ✅ | core-compiler (manifest-generator, governance-verifier) |
| 38–39 | DRCM P4: SystemCapabilityType · policy{} monotonicity | ✅ | core-compiler (capability-types, governance-verifier) |
| 40–41 | DRCM P5: DWI step keyword + fuel · DSS supervisor .lln | ✅ | core-compiler · self-hosted/dss |
| 42 | DRCM P6: Epilogue Receipt + ledger | ✅ | core-compiler (proof-chain, manifest) |
| 43–44 | DRCM P7: OWASP negative suite · OCI/gVisor deploy | ✅ | tests · scripts (Dockerfile, deploy-linux) |
| 45 | LLN-GOV/EFFECT/CAP code wiring | ✅ | core-compiler (governance-verifier) |
| 46–49 | Pattern examples + README + graph index | ✅ | tests/patterns · docs |
| 50 | T/FG/EC/ID/AU/LC diagnostic categories | ✅ | core-compiler (diagnostics) |
| 51 | @experimental_profile directive | ✅ | core-compiler (parser) |
| 52 | security::interim BoundaryProxy | ✅ | core-compiler |
| 53 | KNOWLEDGE-BASE-INDEX.md | ✅ | docs |
| 54 | T-006/007/008 goal harness | ✅ | tests |
| 55 | Named arguments at call sites | ✅ | core-compiler (parser, interpreter) |
| 56 | Domain Guard Policies (Static Manifest Clamping) | ✅ | core-compiler (governance-verifier) |
| 57 | Record constructor in let bindings | ✅ | core-compiler (parser) |
| 58 | resilience{} + observability{} blocks | ✅ | core-compiler (resilience-inference) |
| 59 | Change-class review workflow + CI | ✅ | scripts · .github |
| 60 | Contract clause reference | ✅ | docs |
| 61 | `::` module separator | ✅ | core-compiler (parser) |
| 62 | Multi-variant match arms `A|B =>` | ✅ | core-compiler (parser, interpreter) |
| 63 | governance-impact.json artifact | ✅ | core-compiler · scripts |
| 64–65 | logicn check --diff · init-env | ✅ | core-compiler (cli) |
| 66 | observability{} ⊄ privacy{} verifier | ✅ | core-compiler (governance-verifier) |
| 67–68 | .lmanifest CBOR (RFC 8949) + secure parser | ✅ | core-compiler (manifest-generator, cbor) |
| 69 | **Floor-specific dev-tools graphs** | 🔲 | devtools-project-graph |
| 70 | WAT single-exit body transform | ✅ | core-compiler (wat-emitter) |
| 71 | logicn check --what-if (Shadow Policy) | ✅ | core-compiler (governance-verifier) |
| 72 | parent_policy: inheritance + subset | ✅ | core-compiler (governance-verifier) |
| 73–74 | assuming{} proof-tracing block + verify | ✅ | core-compiler (parser, governance-verifier) |
| 75 | Governance-as-Evidence (CBOR Tag 410) | ✅ | core-compiler (manifest-generator) |
| 76 | LLN-INV-000 DSS trap handler + audit event | ✅ | core-compiler · self-hosted/dss |
| 77 | Execution DAG (Tag 414) | ✅ | core-compiler (execution-graph) |
| 78 | MMCP typed memory views (Tag 415) | ✅ | core-compiler |
| 79 | Pre-resolved Policy DAG (Tag 416) | ✅ | core-compiler (governance-verifier) |
| 80 | Behavioral Fingerprinting CFG hash (Tag 417) | ✅ | core-compiler |
| 81 | `trap` keyword | ✅ | core-compiler (parser, wat-emitter) |
| 82 | `governed` flow qualifier | ✅ | core-compiler |
| 83 | `view(cap)` MMCP annotation | ✅ | core-compiler |
| 84 | Match exhaustiveness (LLN-MATCH-001) | ✅ | core-compiler (type-checker) |
| 85 | DSS.lln V_DPM bit layout + bitmask | ✅ | self-hosted/dss · capability-types |
| 86 | `static` compile-time constants | ✅ | core-compiler (interpreter, governance-verifier) |
| 87 | `bitfield` V_DPM register | ✅ | core-compiler (parser, wat-emitter) |
| 88 | `gate {}` admission guard | ✅ | core-compiler (governance-verifier) |
| 89 | `access {}` enforcement | ✅ | core-compiler (governance-verifier) |
| 90 | `policy {}` state mutation governance | ✅ | core-compiler (governance-verifier) |
| 91 | vdpm.lln → `bitfield V_DPM` | ✅ | self-hosted/dss |
| 92 | import plugin assimilate/evict | ✅ | core-compiler (module-registry) |
| 93 | `;;` govComment manifest collection | ✅ | core-compiler (lexer, manifest) |
| 94 | import ./path.lln DAG merge | ✅ | core-compiler (module-registry) |
| 95–96 | Tower execution log + test gate | ✅ | scripts · tests |
| 97 | Stage B lexer.lln functional | ✅ | self-hosted/lexer.lln |
| 98 | Stage B parser.lln functional | ✅ | self-hosted/parser.lln |
| 99 | Stage B type-checker.lln functional | ✅ | self-hosted/type-checker.lln |
| 100 | Stage B governance-verifier.lln functional | ✅ | self-hosted/governance-verifier.lln |
| 101 | R6 corpus 100% Stage-A==Stage-B | ✅ | tests/r6-corpus |
| 102 | **dss/index.lln → build/dss.wasm** | 🔲 | self-hosted/dss · wat pipeline |
| 103 | **Wasmtime component supervises DWI** | 🔲 | runtime (Post-P9) |
| 104 | **Real Wasmtime fuel per DWI** | 🔲 | runtime (Post-P9) |
| 105 | **WASM admission-gate harness** (security core ✅; parity gated on #144/#145) | 🔶 | core-compiler/wasm-runtime.ts |
| 106 | **Epilogue receipts signed by DSS.wasm** | 🔲 | runtime (Post-P9) |
| 107–109 | ML-DSA-65 keygen · manifest signing · verify gate | ✅ | core-compiler (attestation, manifest-generator, cli) |
| 110 | **Key rotation in secrets{}** | 🔲 | core-compiler (secrets) · ext-secrets-vault |
| 111–113 | Linux deploy · logicn deploy · OCI/gVisor | ✅ | scripts · core-cli |
| 114–117 | Package gate · SOT update · R6 final · v1.0 | ✅ | repo-wide · docs |
| 118 | P9.2 WAT String/Record linear-memory | ✅ | core-compiler (wat-emitter) |
| 119 | P9.3 stdlib method calls → host imports | ✅ | core-compiler (wat-emitter) |
| 120 | P9.4 guarded bodies + record layout (umbrella) | ✅ | core-compiler (wat-emitter) |
| 121–122 | Brain→Brawn BridgeRegistry · ai{} gov enforcement | ✅ | tower-citizen (hybrid-engine) |
| 123 | ext-bridge-cpp registry factory | ✅ | ext-bridge-cpp |
| 124–125 | CLI infer driver + ai{} contract · E2E | ✅ | logicn.mjs · tower-citizen |
| 126–129 | graph devtools · audit+tests · KB sync · benchmark table | ✅ | repo-wide |
| 130–136 | Sentinels: LSM · LSIO · LST · LSP · LSS · Egress + wiring | ✅ | core-sentinel-* |
| 137 | **CF-3/CF-7 bridge attestation** | ✅ | tower-citizen/bridge-attestation.ts · ext-bridge-cpp/addon-loader.ts |
| 138 | P9 certified mode mandates signed bridges | ✅ | tower-citizen (hybrid-engine, compiled-policy) |
| 139 | Enforced V_DPM capability gate | ✅ | tower-citizen (hybrid-engine) |
| 140 | Numeric policy table (CompiledPolicy) | ✅ | tower-citizen/compiled-policy.ts |
| 141 | P9.4b record struct layout (construct + field access) | ✅ | core-compiler/wat-emitter.ts |
| 142 | P9.4c guarded-flow export gating | ✅ | core-compiler/wat-emitter.ts |
| 143 | **P9 ceremony — tokenize byte-parity** (blocked by #144✅,#145) | 🔲 | core-compiler · wasm-runtime |
| 144 | P9.4d enum-variant member lowering | ✅ | core-compiler/wat-emitter.ts (buildEnumVariants) |
| 145 | **P9 string runtime: type-aware `+`/`Char.toString` + `__str_concat`/`__char_to_string`/`__str_eq` + table exposure + output reader** | 🔶 | core-compiler/wat-emitter.ts · wasm-runtime.ts |
| 146 | **Post-P9: compliance ledger over audit-egress** | 🔲 | devtools-pci · sentinel-egress |
| 147 | **Post-P9: warm-sandbox + memory sanitizer** | 🔲 | core-compiler/wasm-runtime.ts |
| 148 | **Post-P9: 3 governance partials (token/cache/partial-eval)** | 🔲 | tower-citizen · core-compiler |

---

## 3. P9 completion blockers (the only thing between here and "P9 done")
- **#145** (the real work): the self-hosted lexer's `tokenize` uses `charAt`, `charCount`,
  `codePoint()`, char-literal `is`, string `+` concat, `Char.toString`, a keyword table, and
  8-field Token records. WASM byte-parity needs the host string/char runtime + **type-aware
  emitter lowering** (String `+` → `__str_concat` not `i32.add`; `Char.toString` → `__char_to_string`
  not `__int_to_str`/decimal) with String/Char var-type + `Option<Char>` match-binding inference.
  This is a multi-part feature — the largest emitter task left.
- **#143**: once #145 lands, run `tokenize.wasm` through the #105 gate, reconstruct the token
  list via the output reader, byte-compare to the interpreter (golden: `lexer-parity.test.mjs`).

---

## 4. Code-area → task review reverse index (graph triggers)
*Change a file in the left column → re-verify the task IDs on the right.*

| Code area | Tasks to review |
|---|---|
| `core-compiler/wat-emitter.ts` | 36, 70, 81, 87, 118, 119, 120, 141, 142, **144**, **145** |
| `core-compiler/wasm-runtime.ts` | **105**, **143**, **145**, 147 |
| `core-compiler/governance-verifier.ts` | 37, 38, 39, 45, 56, 66, 71, 72, 74, 79, 88, 89, 90, 100 |
| `core-compiler/manifest-generator.ts` · cbor | 33, 37, 67, 68, 75, 77, 78, 79, 80, 108 |
| `core-compiler/parser.ts` · lexer.ts | 36, 51, 55, 57, 61, 62, 73, 81, 87, 93, 144 (enumDecl) |
| `core-compiler/interpreter.ts` | 15, 55, 62, 86 |
| `core-compiler/attestation.ts` | 34, 35, 107, 108, 109, 137 (Ed25519 pattern reused) |
| `core-compiler/capability-types.ts` | 38, 85 |
| `core-compiler/self-hosted/lexer.lln` | 97, 101, **143**, **145** |
| `core-compiler/self-hosted/{parser,type-checker,govern}.lln` | 98, 99, 100, 101 |
| `core-compiler/self-hosted/dss/*.lln` | 41, 76, 85, 91, 102 |
| `tower-citizen/hybrid-engine.ts` | 121, 122, 138, 139, 140 |
| `tower-citizen/bridge-attestation.ts` | 137, 138 |
| `tower-citizen/compiled-policy.ts` | 140 |
| `inference-bridge-contract/*` | 121, 137 (manifest schema) |
| `ext-bridge-cpp/*` | 123, 137 (addon hash) |
| `core-sentinel-*` | 130–136 |
| `devtools-pci/*` | 146 |
| `devtools-security/*` | 9, 10, 17 |
| `devtools-project-graph/*` | 1, 2, 3, 69 |
| `devtools-benchmarks/*` | 11–14, 20–23, 129 |
| `scripts/run-phase-close.mjs` · CI | 59, 63, 95, 96 |
| `logicn.mjs` (CLI) · core-cli | 64, 65, 112, 124, 137 (`bridge-attest`) |
| `docs/Knowledge-Bases/*` | 19, 49, 53, 60 + this ledger |

*Maintenance: when a task lands or a file moves, update the row above. Re-run `run-phase-close.mjs`
after edits to refresh graph node/edge counts and confirm audit/governance stay green.*
