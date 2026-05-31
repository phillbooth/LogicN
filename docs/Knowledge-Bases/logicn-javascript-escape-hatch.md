# LogicN — The JavaScript Escape Hatch Problem

**Status:** Phase 13 — Compiler backend rule

**Decision:** Generated JavaScript must be capability-driven, not global-driven

**New diagnostic:** `LLN-BACKEND-001 AmbientAuthorityEscape`

---

## The Problem

When a governed language compiles to JavaScript, the generated output runs inside a JavaScript environment that provides unrestricted access to powerful global objects. This is the escape hatch problem: a language that governs all capabilities at the source level can silently lose that governance in its output if the compiler is not designed to prevent it.

Generated JavaScript has access to:

| Global | Risk |
|--------|------|
| `globalThis` | Access to the full ambient environment |
| `process` | Environment variables, signals, exit control |
| `require` | Dynamic module loading, arbitrary code |
| `eval` | Dynamic code execution |
| `fetch` | Unchecked outbound network access |
| `Buffer` | Raw memory and binary data access |
| `fs` | File system read/write |
| `child_process` | Shell execution |

Every one of these bypasses LogicN's governance model. A flow that is declared with no network capability can silently call `globalThis.fetch`. A flow that is denied file access can call `require("fs").readFileSync`. The source-level contract becomes meaningless if the backend emits code that ignores it.

> "JavaScript output is an execution detail, not a permission model."

---

## Core Rule

> Generated JavaScript must not access ambient JS authority directly. All external power must go through `capabilityHost`.

The LogicN compiler backend — for every target that emits JavaScript — must:

1. Shadow all ambient globals with `undefined` at module scope
2. Inject a `capabilityHost` parameter into every generated module
3. Route all external operations through `capabilityHost` methods
4. Never emit `eval`, `Function`, dynamic `require`, or `child_process` calls

This is not a style preference. The compiler enforces this as a backend correctness rule.

---

## Bad Emitted JS — What the Compiler Must Never Produce

These patterns in generated output represent governance failures:

```js
// Reading environment secrets without going through the vault
const key = process.env.API_KEY;

// Unchecked outbound network call
const result = await globalThis.fetch(url);

// Bypassing the module system governance
const data = require("fs").readFileSync("/etc/passwd");

// Dynamic code execution — absolute prohibition
eval(code);
```

Each of these gives the generated module capabilities that were never declared in the LogicN source. They make the generated output ungoverned regardless of what the source contract said.

---

## Better Emitted JS — The Correct Shape

All generated modules must follow this structural pattern:

```js
"use strict";

// Ambient globals are explicitly killed at module scope.
// Any reference to them after this point is a bug in the emitter.
const globalThis = undefined;
const process = undefined;
const require = undefined;
const eval = undefined;
const fetch = undefined;
const Buffer = undefined;
const fs = undefined;

export function createRuntimeModule(capabilityHost) {
  "use strict";

  // All external operations go through capabilityHost.
  // The capabilityHost is provided by the LogicN runtime,
  // which enforces the declared contract before granting access.

  async function createPatient(input) {
    // Database write — governed
    const record = await capabilityHost.database.write("patients", input);

    // Audit log — governed
    await capabilityHost.audit.write({
      actor: input.actor,
      action: "create_patient",
      resource: record.id,
    });

    // Response — governed
    return capabilityHost.response.created(record);
  }

  async function fetchExternalData(url) {
    // Outbound network — governed, declared in contract
    const data = await capabilityHost.network.outbound(url);
    return data;
  }

  return { createPatient, fetchExternalData };
}
```

The `capabilityHost` is injected by the LogicN runtime. Before any method on `capabilityHost` is called, the runtime verifies the declared contract permits that capability for the current actor and execution context. No capability is granted silently.

---

## LogicN Principle

> "JavaScript output is an execution detail, not a permission model."

LogicN's permission model lives in the source language — in flow contracts, capability declarations, actor requirements, and effect annotations. The JavaScript output is a compiled artefact of that model. It must faithfully carry the permission constraints forward into the runtime, not discard them.

A generated JS module that accesses `process.env` directly has abandoned the permission model. The output is not a LogicN-governed module — it is a raw JavaScript file with no governance.

---

## Phase 13 Passive Plans

Phase 13 introduces the governed backend compilation path. The full chain is:

```
LogicN Source
  → Passive Execution Plan (PEP)
    → JS module with no direct ambient authority
      → capabilityHost-mediated execution
        → runtime enforcement
          → runtime report
```

At each stage:

| Stage | What is enforced |
|-------|-----------------|
| Passive Execution Plan | Capabilities required by this execution are declared |
| JS module emission | Ambient globals shadowed; all power via capabilityHost |
| capabilityHost-mediated | Runtime checks declared capability against contract before allowing |
| Runtime report | Every capability use is logged and attributable |

The Passive Execution Plan (PEP) is the compiler's intermediate representation of what a flow intends to do, expressed as a list of governed operations rather than imperative code. The backend translates the PEP into a JS module that can only execute through the capability host.

---

## Diagnostic: LLN-BACKEND-001 AmbientAuthorityEscape

**Triggered when:** The emitter, a backend pass, or a native module references any of the following without going through an approved capability wrapper:

- `globalThis`
- `process`
- `require` (dynamic)
- `eval`
- `Function` (constructor)
- `fs`
- `child_process`

**Severity:** Error — compilation is halted. This is not a warning.

**Example trigger:**

A backend pass that emits:

```js
const secret = process.env.DATABASE_URL;
```

...will cause LLN-BACKEND-001 to fire during the backend verification pass.

**Correct form:**

```js
const secret = await capabilityHost.vault.read("DATABASE_URL");
```

The diagnostic applies to both compiler-generated code and to native module bindings that are registered with the LogicN runtime. A native module that accesses `child_process` without a declared `shell` capability binding will not pass backend verification.

---

## Module Design Rules

All LogicN-emitted JavaScript modules must conform to the following rules:

| Rule | Requirement |
|------|-------------|
| Strict ESM | `"use strict"` at module and function scope; ESM exports only |
| capabilityHost injection | Every module exported as `createRuntimeModule(capabilityHost)` |
| No direct globals | `globalThis`, `process`, `require`, `fetch`, `Buffer`, `fs`, `child_process` shadowed to `undefined` |
| No eval or Function | `eval` and `new Function(...)` are prohibited — shadowed and never emitted |
| No dynamic require | `require("some-module")` at runtime is prohibited; all imports are static and resolved at compile time |
| Sandboxed WASM where possible | Computationally intensive operations should run in WASM with a constrained memory boundary, not in the ambient JS heap |

---

## Rules at a Glance

1. Generated JS must never access `globalThis`, `process`, `require`, `eval`, `fetch`, `Buffer`, `fs`, or `child_process` directly
2. All external power flows through `capabilityHost`, which is injected by the LogicN runtime
3. Every module is emitted as `createRuntimeModule(capabilityHost)` — a factory, not a file with ambient side effects
4. Ambient globals are shadowed to `undefined` at the top of every generated module
5. The compiler backend verification pass checks for LLN-BACKEND-001 and halts on violation
6. The permission model is in the LogicN source; the JS output is a faithful, capability-mediated translation of it
7. Dynamic require and eval are absolute prohibitions — never emitted, never permitted in native bindings

---

## See Also

- `logicn-phase-13-decisions.md` — Phase 13 backend decisions and rationale
- `capabilities.md` — capability declaration model
- `governed-capability-modules.md` — how capability modules are structured and verified
- `logicn-core-security-secret-reference-model.md` — vault and secret access patterns
- `compiler-diagnostics.md` — full diagnostic code reference including LLN-BACKEND-001
- `logicn-stage-b-root-capability-provider.md` — root capability provider architecture
- `safe-unsafe-trust-model.md` — safe and unsafe boundaries in the runtime
- `logicn-native-module-system.md` — native module binding rules
