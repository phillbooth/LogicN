# LogicN — wasmtime Compilation Roadmap

**Goal:** `wasmtime logicn-runtime.wasm program.lln` executes a `.lln` source file
without Node.js. Stage-B is the runtime; Stage-A is only a build tool during the
compilation step, not a host at runtime.

---

## Current state

Stage-B (the self-hosted LogicN runtime) consists of **8 `.lln` modules** that together
implement the full lex → parse → type/effect/govern → GIR → execute pipeline entirely
in LogicN:

| Module | File | Pipeline role |
|---|---|---|
| Lexer | `lexer.lln` | Tokenises `.lln` source text |
| Parser | `parser.lln` | Builds a typed flow AST |
| Type-checker | `type-checker.lln` | Validates types and return shapes |
| Effect-checker | `effect-checker.lln` | Reconciles declared vs actual effects |
| Governance verifier | `governance-verifier.lln` | Enforces contract rules (deny-by-default) |
| GIR emitter | `gir-emitter.lln` | Lowers AST to Governed Intermediate Representation |
| Runtime | `runtime.lln` | Executes GIR — the tree-walking engine |
| Capabilities | `compiler.capabilities.lln` | Declares and enforces capability boundaries |

All eight modules run today, but they are **hosted by the Stage-A TypeScript interpreter
inside Node.js**. Every governance check, every type validation, every GIR evaluation is
dispatched through the Node.js tree-walker. This is why the `governance-cost` benchmark
reads **3.2K/s** — the tree-walker overhead is approximately 273,900× slower than a
native WASM execution at compiled speed.

---

## The gap

Stage-B has never been compiled to a standalone `.wasm` binary. Three prerequisites must
be met before the compiled binary exists:

1. **WAT emitter coverage** — the Phase 27 WAT emitter currently handles basic
   `Int`/`Bool` flows. The full Stage-B modules use strings, records, match expressions,
   for-loops, and closures. The WAT emitter must lower all of these before Step 3 of the
   build path can succeed. **This is the primary blocker.**
2. **Merged-source resolution** — all 8 modules must be joined into a single compilation
   unit before the WAT emitter is invoked (the emitter currently processes one program at
   a time).
3. **WASI host shim** — a WASM Component Model shim must expose `wasi:filesystem/read`
   and `wasi:cli/args` so the running WASM binary can accept a `.lln` source path from
   the command line and read the file.

SIMD expansion (Phase 6.6 in the completion roadmap) is deliberately deferred until after
the baseline binary is working and benchmarked.

---

## Build path (6 steps)

### Step 1 — Merge all 8 self-hosted modules into a single source unit

Resolve import order (capabilities → lexer → parser → type-checker → effect-checker →
governance-verifier → gir-emitter → runtime) and concatenate into one logical program.
The merged source must expose a single entry-point flow, `runPipeline`, that accepts a
`.lln` source string and returns the execution result.

```
src/self-hosted/
  compiler.capabilities.lln
  lexer.lln
  parser.lln
  type-checker.lln
  effect-checker.lln
  governance-verifier.lln
  gir-emitter.lln
  runtime.lln        ← entry point: runPipeline(source: String) -> RtValue
```

### Step 2 — Run the merged source through the Stage-A pipeline (build-tool role)

Use Stage-A purely as a build tool — the TypeScript compiler is never a runtime host
after this point.

```bash
node logicn-cli.mjs --parse     merged-runtime.lln   # parseProgram
node logicn-cli.mjs --typecheck merged-runtime.lln   # checkTypes
node logicn-cli.mjs --govern    merged-runtime.lln   # verifyGovernance
```

All three passes must emit `ACCEPT` before proceeding. Any `REJECT` or
`GOVERNANCE_VIOLATION` at this stage is a bug in the Stage-B source, not in the WAT
emitter.

### Step 3 — Lower to WAT via the Phase 27 WAT emitter

```bash
node logicn-cli.mjs --emit-wat --target wasm \
  --entry runPipeline \
  merged-runtime.lln \
  -o logicn-runtime.wat
```

Internal call: `emitWAT(gir, { target: "wasm", entry: "runPipeline" })` → produces
`logicn-runtime.wat`.

**Blocker:** the WAT emitter must handle all constructs used by Stage-B before this step
produces valid WAT. Required additions beyond the current basic int/bool baseline:

- String values (const, eq, ne, concat, length, slice)
- Records / structs (field read, field write)
- `match` expressions (including `Ok`/`Err`/`Some`/`None` variants)
- `for` loops and `while` loops with `break`/`continue`
- Closures passed as arguments (higher-order flows)
- `Array<T>` (push, map, filter, length, index)

### Step 4 — Assemble WAT → WASM

```bash
wat2wasm logicn-runtime.wat -o logicn-runtime.wasm
# Optional size + speed optimisation:
wasm-opt -O3 logicn-runtime.wasm -o logicn-runtime.wasm
```

Toolchain: [wabt](https://github.com/WebAssembly/wabt) (provides `wat2wasm`),
[binaryen](https://github.com/WebAssembly/binaryen) (provides `wasm-opt`).

### Step 5 — WASI host shim

`logicn-runtime.wasm` needs two WASI interfaces to operate as a standalone compiler:

| Interface | Purpose |
|---|---|
| `wasi:filesystem/read` | Read the `.lln` source file passed on the command line |
| `wasi:cli/args` | Receive the source file path as `argv[1]` |

The shim is implemented as a WASM Component Model adapter — it wraps
`logicn-runtime.wasm` in a component that satisfies both imports. No separate host
process is needed; `wasmtime` provides the WASI implementation natively.

```bash
# Component adaptation (wasmtime component toolchain):
wasm-tools component new logicn-runtime.wasm \
  --adapt wasi_snapshot_preview1=wasi_snapshot_preview1.reactor.wasm \
  -o logicn-runtime-component.wasm
```

### Step 6 — Run

```bash
wasmtime logicn-runtime.wasm --invoke runPipeline my-program.lln
```

Or, once a WASI CLI entry point is wired, the simpler invocation:

```bash
wasmtime logicn-runtime.wasm my-program.lln
```

The WASM binary reads `my-program.lln` from the filesystem via the WASI shim and
executes it through the full self-hosted pipeline — no Node.js in the path.

---

## Risks and dependencies

| Risk | Severity | Notes |
|---|---|---|
| WAT emitter missing string/record/match/closure support | **Critical** | Primary blocker. Strings alone appear in ~60% of Stage-B flows. |
| Merged-source symbol collisions | Medium | Eight modules with overlapping local names; requires a name-mangling pass before WAT emit. |
| WASI shim compatibility | Low | `wasmtime` bundles a conformant WASI implementation; standard `wasi_snapshot_preview1` is sufficient for filesystem + args. |
| WASM linear memory limits | Low | Stage-B handles source strings up to a few KB; default 64MB WASM linear memory is adequate. |
| SIMD paths in `wasm-opt` | Low | Deferred to Phase 6.6. Do not enable `-Ox` SIMD transforms until the baseline binary is verified. |

---

## Phase 6 sequence (completion roadmap)

| Phase | Task | Status |
|---|---|---|
| 6.1 | Compile `runtime.lln` through Phase 27 WAT emitter → `logicn-runtime.wat` | pending |
| 6.2 | Assemble `logicn-runtime.wat` → `logicn-runtime.wasm` via wabt | pending |
| 6.3 | WASI host shim — expose `wasi:filesystem` + `wasi:cli` to the WASM binary | pending |
| 6.4 | `wasmtime logicn-runtime.wasm <program.lln>` — end-to-end run | pending |
| 6.5 | Benchmark: governance-cost governed via wasmtime vs baseline 3.2K/s | pending |
| 6.6 | WASM SIMD expansion — f32x4, i8x16 shuffle, vectorised string ops | pending (after baseline) |

---

## Expected impact

The leap from Stage-A tree-walker to compiled WASM is analogous to the jump from
PHP running in a shell interpreter to PHP running inside a compiled Zend binary — the
execution model is the same; the overhead collapses.

| Benchmark | Current (Stage-A tree-walker) | Target (Stage-B WASM) | Factor |
|---|---|---|---|
| `governance-cost` governed | **3.2K/s** | **~500M/s** | ~156,000× |
| `arithmetic-threshold` governed | **859.7K/s** | **~3–4B/s** | ~3,500–4,700× |
| `data-query` governed (current winner) | **228.3K/s** | ≥228.3K/s | maintain lead |
| `nbody` governed | **62.6K/s** | >62.6K/s | improvement |

The `governance-cost` figure of ~500M/s brings LogicN governance overhead to within
1–3× of a raw Rust implementation running the same WASM tier (Phase 27 WASM winner:
**883.56M/s**). At this level, governance checks are no longer a perceptible cost.

Baseline numbers are recorded in:
`docs/Knowledge-Bases/logicn-wasmtime-baseline.md`

---

## Related docs

- `docs/Knowledge-Bases/logicn-selfhosting-roadmap-axisB.md` — Stage-B module status and R6 bootstrap definition
- `docs/Knowledge-Bases/logicn-wasmtime-baseline.md` — benchmark baseline recorded 2026-06-03
- `docs/Knowledge-Bases/logicn-completion-roadmap-2026-06-03.md` — Phase 6 task list
- `docs/Knowledge-Bases/logicn-gir-emitter-architecture.md` — GIR schema and emitter design
- `docs/Knowledge-Bases/logicn-phase-27-ai-native.md` — Phase 27 WAT emitter introduction
