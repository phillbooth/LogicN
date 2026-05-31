# LogicN CLI — Current Specification (Phase 19+)

> Supersedes `logicn-core-cli-v02.md`. All CLI behaviour described here reflects Phase 19 and later.

---

## Architecture Rule

All CLI output decisions consider WASM compatibility first. Build targets, diagnostic codes, and output artefacts are designed so that WASM-targeted builds are first-class, not an afterthought.

---

## Commands

### `logicn check [path]`

Check `.lln` files in development mode. Diagnostics are emitted as warnings; nothing blocks the process.

**Flags**

| Flag | Effect |
|---|---|
| `--strict` | Promotes warnings to errors; exits 1 on any diagnostic that is warning or above |

Typical use: editor integration, pre-commit hooks, CI smoke pass.

---

### `logicn build [path]`

Compile `.lln` files to JavaScript bootstrap output (default target).

**Flags**

| Flag | Effect |
|---|---|
| `--production` | Full governance enforcement; all diagnostics at error severity cause exit 1 |
| `--deterministic` | Implies `--production`; additionally requires bit-for-bit reproducible output. Emits `LLN-BUILD-001` and exits 1 on any hash mismatch between two internal compilation passes |
| `--target=wasm-standalone` | Emit a WASM/WASI module. Pure flows compile to WASM functions with zero imports. Effectful stdlib calls (e.g. `File.readText`) become typed imports from the `host:*` namespace, sourced from `STDLIB_CAPABILITY_MAP.wasmImport`. Runtime policy limits are expressed as WASM memory limits |
| `--target=wasm-hybrid` | Emit a JS capability shell wrapping a WASM pure-flow core. The JS shell manages capabilities, audit trails, and governance enforcement; the WASM core handles pure computation (tensors, math, validation gates) |

---

### `logicn fix [path]`

Analyse `.lln` files and emit suggested corrections.

**Flags**

| Flag | Effect |
|---|---|
| `--effects` | Detect missing effect declarations and emit `suggestedCode` blocks in diagnostic output. Does not mutate source files automatically |

---

### `logicn emit [path]`

Emit supplementary artefacts from a compiled `.lln` program.

**Flags**

| Flag | Effect |
|---|---|
| `--ai-graph` | Write `build/semantic/logicn.ai.json` — a structured, AI-readable program graph for tooling, analysis agents, and IDE integrations |

---

### `logicn verify-selfhost [path]`

Verify deterministic build integrity. Compiles the same source twice in sequence and compares output hashes. Emits `LLN-BUILD-001` and exits 1 if hashes differ.

**Hash function:** `canonicalHash()` — strips all timestamps, sorts object keys alphabetically, then applies SHA-256 over the canonical JSON representation.

Typical use: release pipelines, reproducible-build attestation, bootstrap trust verification.

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success; no blocking diagnostics |
| `1` | Build or governance failure; one or more errors present |
| `2` | Invalid arguments or unrecognised flags |

---

## Diagnostic Severity by Mode

| Code | `check` | `check --strict` | `build` | `build --production` | `build --deterministic` |
|---|---|---|---|---|---|
| `LLN-EFFECT-001` — missing effect declaration | warning | error | warning | error | error |
| `LLN-STDLIB-001` — stdlib call missing effect annotation | warning | error | warning | error | error |
| `LLN-GOV-010` — flow has no intent declaration | info | warning | info | error | error |
| `LLN-BUILD-001` — non-deterministic output detected | — | — | — | — | error |
| `LLN-SYNTAX-LEGACY-001` — deprecated `with effects` syntax | warning | warning | warning | warning | error |

Notes:
- `—` means the diagnostic is not evaluated in that mode.
- `info` is surfaced in output but never causes a non-zero exit.
- `warning` causes non-zero exit only when `--strict` is active.
- `error` always causes exit 1.

---

## WASM Targets

### `--target=wasm-standalone`

Produces a self-contained WASM/WASI module; no JS runtime required at deploy time.

- **Pure flows** compile to WASM functions with zero imports.
- **Effectful stdlib** (e.g. `File.readText`, `Net.fetch`) compiles to typed WASM imports resolved from `STDLIB_CAPABILITY_MAP.wasmImport` under the `host:*` namespace. The host runtime is responsible for providing these imports.
- **Runtime policy limits** (rate limits, memory caps) are enforced via WASM memory limits rather than JS-side guards.
- Output includes `.wasm` + `.wat` (WAT for inspection). WAT contains `unreachable` stubs in Phases 19–23; real instruction emission begins at Phase 24.

### `--target=wasm-hybrid`

Produces a JS shell file paired with a `.wasm` module.

- **JS shell** owns: capability acquisition, audit event emission, governance policy enforcement, and host-side effect gating.
- **WASM core** owns: pure computation — tensor operations, mathematical transformations, validation gate evaluation.
- The shell/core boundary is determined statically at compile time by the effect system. Flows with no declared effects compile entirely into WASM; flows with effects retain a JS-side stub that delegates pure sub-computations to the WASM core.
