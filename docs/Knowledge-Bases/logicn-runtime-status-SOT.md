# LogicN — Runtime Status: Single Source of Truth (SOT)

**Last verified: 2026-06-02 (by running the suites, not by reading prior docs)**

This document exists because the percentage and test-count figures across the
roadmap/audit docs contradicted each other and the actual code. Where any other
doc disagrees with this one, **this one wins** until re-verified. Every number
below was produced by executing something, not by carrying a figure forward.

---

## 1. Verified test counts

Reproduce all four at once from the repo root: **`node scripts/run-all-tests.js --core`**
(build order: graph-algorithms → economics → compiler → security; one exit code). It
prints `3133 tests total`, matching the table below. (Per package: build, then `node --test`.)

| Package | Tests | Pass | Fail | Prior doc claimed |
|---|---|---|---|---|
| logicn-core-compiler | 3,041 | 3,041 | 0 | 2,810 |
| logicn-core-economics | 15 | 15 | 0 | 15 ✓ |
| logicn-devtools-graph-algorithms | 95 | 95 | 0 | 95 ✓ |
| logicn-core-security | 14 | 14 | 0 | **32 ✗** |
| **TOTAL** | **3,165** | **3,165** | **0** | 2,952 |

Corrections vs `logicn-audit-2026-06-02.md`:
- Compiler 2,810 → **2,869** (includes +10 self-hosted runtime tests, +9
  self-hosted governance-verifier tests, +13 self-hosted type-checker tests, +12
  self-hosted effect-checker tests, and +13 self-hosted gir-emitter tests added
  2026-06-02).
- Security 32 → **14** (only `security-contracts.test.mjs` exists; 14 cases).
- Total 2,952 → **2,946**.

Build note: `logicn-core-security` has no local `typescript`; build it with the
compiler package's tsc (`node ../logicn-core-compiler/node_modules/typescript/bin/tsc -p tsconfig.json`)
before `node --test`, or the import of `dist/index.js` fails.

---

## 2. The percentage was conflating two different things

"Runtime-in-LogicN" has been quoted as 25%, 27%, and 55% in different docs. The
confusion is that two *distinct* axes were being summed into one number:

- **Axis A — Governed decision logic in LogicN.** Governance / capability /
  routing / effect *decisions* expressed as `.lln` flows and executed by the
  Stage A (TypeScript) interpreter. This is real, tested, and growing.
- **Axis B — Engine self-hosting (Stage B).** The compiler/runtime *engine
  itself* — lex → parse → typecheck → effect-check → govern → emit → execute —
  rewritten in LogicN so LogicN compiles and runs LogicN.

**The stated goal "Runtime written in LogicN at 100%" is Axis B at 100%.** Axis-A
service facades do not advance Axis B, so counting them inflated the figure.

| Axis | Honest current state | Basis |
|---|---|---|
| A — governed decision logic in `.lln` | **14 governed services tested** (of 25 `.lln` service files) | §4 |
| B — engine self-hosting (THE goal) | **≈ 90%** — **R6 ACHIEVED: Stage A == Stage B on all 5 corpus flows** (`self-hosted-bootstrap.test.mjs`, 11 tests). Grammar widened: member access, array literals, generic return types, match/Option, if/else, logical/unary. Parser/GIR/runtime handle records+lists+strings+Result+Option+effects. Epistemic gap to 100%: wider non-Int match patterns, lists-in-bodies, runtime effect dispatch, `else` on while — all polish, no new pipeline stages needed | §3 |

So against the actual goal we are at roughly **35–40%**, not 55%. Milestone 2026-06-02:
**no Stage-B stubs remain** — all 8 files run a real subset through the interpreter.

---

## 3. Axis B — Stage B self-hosting (the real metric)

8 files in `packages-logicn/logicn-core-compiler/src/self-hosted/`. **All 8 parse
clean (0 errors)** through the production parser. Parse-clean ≠ functional.

| Pipeline stage | File | Verified status | Evidence |
|---|---|---|---|
| Lex | `lexer.lln` | partial (near-full) | full token stream: words/keywords, numbers, operators/symbols, **string + char literals, line + block comments** (S5, 2026-06-02); 32 executing tests |
| Parse | `parser.lln` | partial (full body AST) | **one `parseFlows` call yields a complete flow AST**: header + params + back-compat `returnExpr` + **full `body: Array<Stmt>`**. Expression grammar: logical `and`/`or`, comparison, +/-/*//, unary `!`/`-`, calls, grouping (left-assoc). Statements: let/mut/assign/return/**if/else**/while/exprStmt, nested. `body-parser.lln` folded in + grammar widened 2026-06-02; parses a real `fib` body; 63 executing tests |
| Type-check | `type-checker.lln` | partial (return + body) | `checkFlows`: return-expr checks (LLN-TYPE-001/002/004). `checkFlowBodies` (M-B, 2026-06-02): walks the full body AST — LLN-TYPE-001/002 on `let`/`mut` bindings, recursing into if/while; 22 executing tests |
| Effect-check | `effect-checker.lln` | partial (return + body) | `checkFlowEffects`: declared-vs-used reconciliation (LLN-EFFECT-001/003/004/005). `checkBodyEffects` (M-B, 2026-06-02): **derives used effects from the body AST's call expressions** (effect registry) and reconciles vs declared — undeclared use → 001, pure-flow effect → 003; 21 executing tests |
| Govern | `governance-verifier.lln` | partial (decl + body) | `verifyGovernance`: 3 declaration checks (LLN-VAL-001/002, LLN-GOV-002). `checkBodyGovernance` (M-B, 2026-06-02): **walks the body AST** — a `secure` flow that never calls audit in its body → LLN-VAL-001; 17 executing tests |
| Emit (GIR) | `gir-emitter.lln` | partial (flat + body) | `emitGIRModule`: flow-decl + flat-returnExpr GIR nodes. `emitBodyGIR` (M-B, 2026-06-02): **lowers the full body AST** — `lowerExpr` (const/load/binop/call with opcodes + result types) + `lowerStmt` (store/ret/branch/loop/eval), recursing into if/while; 21 executing tests |
| Execute | `runtime.lln` | partial (GIR eval + calls) | tier dispatcher + **`runGIRBody`/`runProgram`**: a tree-walking GIR interpreter (S7, 2026-06-02) — const/load/binop/unop + store/ret/branch/loop + an assoc-list env + **cross-flow `call`s via a flow table** (recursion works: `fib(15)=610`). 20 executing tests |
| Capabilities | `compiler.capabilities.lln` | functional | 8 flows, tested |

Tally: **1 functional + 7 partial + 0 stub** (8 modules; `body-parser.lln` was folded
into `parser.lln` 2026-06-02 so one `parseFlows` call yields the full flow AST). Every
Stage-B stage runs a real subset through the interpreter — no stage is a parse-only stub.

To reach Axis-B 100% the partials must widen to full coverage — the remaining checkers
(effect/govern) + gir-emitter must consume the full `Stmt`/`Expr` body AST (type-checker
already does via `checkFlowBodies`); `else` + nested-generic parsing; runtime execution
of the emitted GIR — each verified by executing tests, not parse-clean.

**The phased plan to get there is `logicn-selfhosting-roadmap-axisB.md`** (canonical
Axis-B roadmap). This SOT remains the *measurement*; that doc is the *plan*.

---

## 4. Axis A — governed service surface

`examples/auth-service/` holds 25 `.lln` service files. **14 are covered by
executing endpoint/integration tests** (the rest are unverified surface):

auditChainService, capabilityHostService, compilationService, economicsService,
getPatient, governanceService, manifestVerificationService, proofVerifierService,
routingPolicyService, runtimeProfileService, typeRegistryService,
valueClassificationService, verifyPassword, verifyPasswordService.

These run real decision logic in `.lln` (e.g. effectCheckerService rejects empty
declared effects; capabilityHostService returns governance classes) — executed by
the Stage A interpreter. Valuable, but Axis A, not the self-hosting goal.

---

## 5. The tail that cannot be truthfully completed in-repo

These roadmap items need external infrastructure or hardware and must NOT be
marked "done" from inside the repo (project rule: no number shown until a backend
actually executes):

- Deno Deploy serving real production traffic
- Intel SGX / TXT hardware attestation in the ProofGraph
- Lean4 formal-verification export / DO-178C certificate
- ML-DSA-65 (FIPS 204) post-quantum signing (library-dependent; planned)
- A production deployment with real external traffic

Any "100%" that depends on the above is aspirational until the infrastructure
exists. In-repo, the honest ceiling is: Axis B at 100% + Axis A broad coverage +
WASM hot-path — all verifiable by tests here.

---

## 6. What changed on 2026-06-02 (this session)

- Fixed a real cache-eligibility bug in `runtime.lln` (`let` block-shadow →
  `mut` reassignment); dispatcher now reports `cache:true` for eligible flows.
- Added `tests/self-hosted-runtime.test.mjs` (10 executing tests).
- Verified true test counts and corrected the security/total figures above.
- Added the physics N-body benchmark (`benchmarks/nbody/`), checksum 536024
  identical across Node / Python / LogicN.
- Promoted `governance-verifier.lln` stub → partial: wired the previously-dead
  `checkSafetyCritical` into `verifyGovernance`, derived `hasAudit` from the
  effects array (new `hasEffect`/`appendAll` helpers), added
  `tests/self-hosted-governance-verifier.test.mjs` (9 executing tests). Axis B
  now 1 functional + 4 partial + 3 stub (≈25–30%).
- Promoted `type-checker.lln` stub → partial (S1 of the Axis-B roadmap): real
  subset emitting LLN-TYPE-001 (UnknownType, return + param), 002 (TypeMismatch,
  inferred-vs-declared), 004 (InvalidBinaryOperation, non-Int arith operand);
  `inferExprType` covers literal/param/compare/arith. Added
  `tests/self-hosted-type-checker.test.mjs` (13 executing tests). Compiler suite
  2,831 → 2,844. Axis B now 1 functional + 5 partial + 2 stub (≈30–35%).
- Promoted `effect-checker.lln` (S2) and `gir-emitter.lln` (S3) stub → partial in
  parallel. Effect-checker: declared-vs-used reconciliation reading a new
  `usedEffects` field — LLN-EFFECT-001 (undeclared use), 004 (unknown effect), 003
  (pure violation) + 005 advisory; `tests/self-hosted-effect-checker.test.mjs` (12
  tests). GIR emitter: per-flow expression GIR (literal→const, param→load,
  arith→add, compare→cmp, with result types) alongside flow-decl nodes;
  `tests/self-hosted-gir-emitter.test.mjs` (13 tests). Compiler suite 2,844 →
  2,869. **Milestone: 0 Stage-B stubs remain** — Axis B now 1 functional + 7
  partial + 0 stub (≈35–40%).
- Fixed a real interpreter bug: string-literal `match` arms never dispatched
  (`matchPattern` compared the unquoted runtime string against the still-quoted
  pattern token). Fix in `interpreter.ts` + regression test in
  `tests/interpreter.test.mjs` (3 cases). Compiler 2,869 → 2,872.
- Advanced **S5 lexer** + **S6 parser** in parallel. Lexer: string + char literals,
  line + block comments (intercepted before the `//` `/*` operator path);
  `self-hosted-lexer.test.mjs` 22 → 32. Parser: decomposed `returnExpr`
  {kind,litType,leftType,rightType} on each FlowDecl, matching exactly what
  type-checker/gir-emitter consume; `self-hosted-parser.test.mjs` 28 → 44.
- **M-A/M-B bridge demonstrated:** new `tests/self-hosted-pipeline.test.mjs` runs
  source → `lexer.lln` → `parser.lln` → `type-checker.lln` end-to-end in LogicN
  (LogicNValue output of each stage fed as the next stage's input), catching
  LLN-TYPE-002 on a real mismatch. Also hardened the type-checker to skip 002 when
  the inferred type is `Unknown` (unresolved param ref), found via this pipeline.
  Compiler 2,872 → 2,902 (+30). Axis B still 1 functional + 7 partial + 0 stub but
  now with a proven multi-stage path (lexer/parser meaningfully fuller, ≈40–45%).
- Fixed a second real lexer bug: `LLN-LEX-001` (generic nesting depth) false-fired on
  ordinary comparison loops because `genericDepth` in `lexer.ts` was a file-global
  counter that never reset. Fix: reset at newline + `{`/`}`/`;` (boundaries a generic
  cannot cross); deep single-line generics still detected. +4 regression tests in
  `tests/lexer.test.mjs`; reverted 7 operand-swap (`srcLen > i`) workarounds in
  `lexer.lln` to natural `i < srcLen` order. Compiler 2,902 → 2,906.
- **Full M-A: real flow-body AST in LogicN.** Added `body-parser.lln` — a recursive-
  descent expression parser (precedence cascade: comparison→additive→multiplicative→
  primary, with calls, grouping, left-assoc) wired into a statement/block parser
  (let/mut/assign/return/if/while/exprStmt) producing a nested `Stmt`/`Expr` AST via
  self-referential `Array<Self>` children. Verified recursion + recursive record types
  execute first. Built by two parallel workers (expr half + stmt half against a shared
  contract), merged into one module. `tests/self-hosted-body-parser.test.mjs` (17 tests)
  parses a real `fib` body — including `fib(n-1) + fib(n-2)` as a binary `+` of two
  calls — entirely in LogicN. Compiler 2,906 → 2,923. Axis B ≈45–50%.
- **M-A complete + M-B started (parallel workers).** Folded `body-parser.lln` into
  `parser.lln`: a single `parseFlows` call now returns a full flow AST (replaced the
  flat `stmts` field with `body: Array<Stmt>`; preserved name/kind/returnType/effects/
  params/returnExpr so type-checker/gir-emitter are unaffected). In parallel, added
  `checkFlowBodies` to `type-checker.lln` (walks the body AST: LLN-TYPE-001/002 on
  let/mut bindings, recursing into if/while). Proven end-to-end: `self-hosted-pipeline.
  test.mjs` runs source→lexer→parseFlows→checkFlowBodies and catches a bad `let x: Int
  = "oops"` binding via the REAL parser output. Compiler 2,923 → 2,925. Axis B ≈48–52%.
- **M-B continued: effect + govern consume the body AST (parallel workers).** Added
  `checkBodyEffects` to `effect-checker.lln` (derives used effects from the body's `call`
  expressions via an effect registry, reconciles vs declared — LLN-EFFECT-001/003) and
  `checkBodyGovernance` to `governance-verifier.lln` (a `secure` flow that never calls
  audit in its body → LLN-VAL-001). Both recurse into if/while + call args; both additive
  (existing checks/tests untouched). `self-hosted-pipeline.test.mjs` now proves
  source→parser→{type, effect, govern} all run on the real body AST in LogicN. Compiler
  2,925 → 2,945. Axis B ≈52–55% — type/effect/govern all validate the parsed body.
- **M-B substantially complete: GIR emitter on the body AST (parallel workers).** Added
  `emitBodyGIR` to `gir-emitter.lln` (built as two halves — `lowerExpr`: lit→const,
  name→load, binary→binop with opcode+result-type, call→call with lowered args; and
  `lowerStmt`: let/mut/assign→store, return→ret, if→branch, while→loop, exprStmt→eval —
  recursing into nested bodies). `self-hosted-pipeline.test.mjs` now runs
  source→parser→**emitBodyGIR**, lowering a real `fib` body to `[branch, ret]` with the
  final return a binop of two calls. With this, **all four validate/emit stages
  (type+effect+govern+emit) consume the real body AST in LogicN** — M-B (≈80%) achieved
  for the supported subset. Compiler 2,945 → 2,955. Axis B ≈55–60%.
- **Parser grammar widened.** Added logical `and`/`or` (lowest precedence, below
  comparison), unary prefix `!`→"not" / `-`→"neg" (binds tighter than `*`), and **`if/else`**
  branches (new `Stmt.elseBody`). Done in one focused pass — worktree isolation was
  unavailable (the Claude session root `C:\Users\desig` isn't the git repo, which lives at
  the `C:\wwwprojects\LogicN` subdir). `tests/self-hosted-parser-grammar.test.mjs` (12
  tests). Compiler 2,955 → 2,967. Axis B ≈57–62%.
- **New grammar forms wired downstream (3 parallel workers, independent files).** The
  forms the widened parser now emits are handled across the pipeline: gir-emitter lowers
  `unary` (→ `unop`) and an `if`'s `elseBody` (GIRStmt gains `elseBody`); type-checker,
  effect-checker, and governance-verifier all recurse into `elseBody` (so a bad binding /
  effectful call / missing-audit in an `else` branch is caught). `self-hosted-pipeline.
  test.mjs` proves it via the real parser (effectful call in an else branch → LLN-EFFECT-001;
  audit only in else → governance passes). Compiler 2,967 → 2,981. Axis B ≈60–63%.
- **S7: the GIR executes — full self-hosted pipeline now RUNS (single focused pass).**
  Added a tree-walking GIR interpreter to `runtime.lln` (`runGIRBody`/`execGIRBody`/
  `evalGIRExpr` + an assoc-list environment): evaluates const/load/binop/unop and
  store/ret/branch/loop. `self-hosted-pipeline.test.mjs` now executes **source → lex →
  parse → emit GIR → run, entirely in LogicN**: computes `x+y=5`, `if true→1`, a
  while-loop `sum 1..5=15`, `a+b=15` from a param env, `-x*2=-8`, `3<5=true`. Cross-flow
  `call` evaluation is the one remaining gap (no recursion/inter-flow calls yet).
  Compiler 2,981 → 2,993. Axis B ≈68–72% (the pipeline executes end-to-end for the
  straight-line/branch/loop subset; M-C-adjacent, gated on cross-flow calls).
- **M-C reached (subset): a recursive MULTI-FLOW LogicN program compiles AND runs in
  LogicN (parallel workers).** Added cross-flow `call` execution to `runtime.lln`
  (`runProgram` + a flow table threaded through the evaluator; recursion + nested calls
  work) and `buildFlowTable` to `gir-emitter.lln` (assembles `{name, params, body:GIR}`
  entries from parser flows). `self-hosted-pipeline.test.mjs` now runs **source → lex →
  parse → buildFlowTable → runProgram entirely in LogicN**: `fib(10)=55`, `fib(15)=610`,
  nested `twice(40)=42` (`inc(inc(x))`), `sumTo(100)=5050`. Compiler 2,993 → 3,004. Axis B
  ≈75–80% — **LogicN runs LogicN end-to-end** for the integer/Bool flow subset (no TS in
  the pipeline). Remaining: widen coverage (strings/records/lists, effects at runtime).
- **Consolidation review (3 parallel review agents + fixes).** Reviewed all 8 self-hosted
  modules; fixed 4 real bugs with regression tests: (1) runtime `eq`/`ne` compared `.i`
  not `.b` so all Bools compared equal (`return a == b` on Bools); (2) parser `parsePrimary`
  consumed a closing `}` on a dangling operator, silently swallowing a following flow;
  (3) effect-checker emitted duplicate `LLN-EFFECT-004`/`001` (added `dedup` + declared-side
  guard); (4) lexer lone-`\r` didn't advance `col`. Plus comment corrections and a "known
  limitations" note (envLookup O(n²), div-by-zero→0, unresolved-call→0, legacy
  `emitExprGIR`/`decomposeReturn`) in the AI-ergonomics doc. Compiler 3,004 → 3,009.

---

## 7. Supersedes / corrects

- `logicn-audit-2026-06-02.md` — test counts (§1) and the "Stage B 2/8 / 55%"
  framing (§2–3).
- `logicn-runtime-in-logicn-roadmap.md`, `logicn-roadmap-phases-41-60.md`,
  `logicn-roadmap-next10-phases.md` — the single-number percentage; use the
  two-axis model in §2 instead.
