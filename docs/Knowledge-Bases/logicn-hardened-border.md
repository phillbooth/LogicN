# LogicN Hardened Border — Plugin DMZ Specification

**Status:** Stage A implemented (schema validation, blacklist, border-check CLI)
**Stage B:** DSS.wasm enforces WASM linear memory isolation at the boundary

---

## The "Toxic Border" Philosophy

Every plugin boundary in LogicN is treated as a **hostile DMZ**. The Tower assumes:

1. The plugin is untrusted code from the moment it crosses the boundary
2. Any data coming from a plugin may be adversarial
3. Any data sent to a plugin must be validated before the plugin sees it
4. A plugin that traps unexpectedly has committed a **security event**, not a bug

This is the "Toxic Border" — the boundary is toxic to both sides by design. The plugin cannot contaminate the Tower; the Tower cannot be fingerprinted by the plugin.

---

## The 5-Stage Load/Execute/Erase Cycle

Every plugin invocation goes through five stages. No exceptions.

```
Stage 1 — Admission Check
  └─ Verify plugin is not blacklisted (build/plugin-blacklist.json)
  └─ Verify manifest.sourceHash matches the plugin.wasm on disk
  └─ Verify governance tier is appropriate for the calling flow

Stage 2 — Schema Validation (Hardened Border)
  └─ Load schemas/data_types.json for this plugin
  └─ Run validatePluginInput() against all declared inputs
  └─ Any LLN-BORDER-001..004 violation → SECURITY_ALERT, plugin call blocked

Stage 3 — Execution
  └─ Stage A: invoke plugin logic with validated inputs
  └─ Stage B: instantiate WASM instance under Wasmtime fuel + memory limits
  └─ Unexpected trap → LLN-BORDER-005, plugin version blacklisted

Stage 4 — Compliance Hash
  └─ Compute computeComplianceHash(output, schema)
  └─ Store sha256 in Epilogue Receipt for forensic trail
  └─ Validate output against schema.outputs (same rules as inputs)

Stage 5 — Hard Erasure
  └─ Stage A: call hardErase(executionId) → ErasureReceipt in audit log
  └─ Stage B: DSS.wasm zeroes WASM linear memory, frees WASM instance
  └─ No plugin state survives invocation boundary
```

---

## LLN-BORDER Diagnostic Codes

| Code | Name | Severity | Description |
|------|------|----------|-------------|
| LLN-BORDER-001 | MISSING_REQUIRED_FIELD | SECURITY_ALERT | Required input field absent — schema poisoning attack |
| LLN-BORDER-002 | TYPE_MISMATCH | SECURITY_ALERT | Input type differs from schema — hostile input |
| LLN-BORDER-003 | FIELD_TOO_LARGE | SECURITY_ALERT | Input exceeds maxLength — buffer overflow attempt |
| LLN-BORDER-004 | VALUE_OUT_OF_RANGE | SECURITY_ALERT | Numeric value outside min/max bounds — boundary probe |
| LLN-BORDER-005 | UNEXPECTED_TRAP | SECURITY_ALERT | Plugin WASM trap outside governed invariant — auto-blacklist |

All BORDER codes emit `severity: "SECURITY_ALERT"` (not a type error or warning). They are written to the audit log and trigger the Epilogue Receipt.

---

## Plugin Folder Structure

Every plugin must conform to this layout (enforced by `logicn promote`):

```
governance/plugins/<name>-v<version>/
├── manifest.json          ← resource limits, capabilities, blacklist status
├── governance.lln         ← capability declarations ([conforms_to: DomainGuard])
├── plugin.wasm            ← signed compiled binary (sha256 in manifest.sourceHash)
└── schemas/
    └── data_types.json    ← strict input/output type contract (PluginDataSchema)
```

### manifest.json fields

| Field | Type | Description |
|-------|------|-------------|
| name | string | Plugin name (no version suffix) |
| version | string | Semver string |
| governanceTier | 1\|2\|3 | 1=trusted, 2=governed, 3=untrusted/sandbox |
| license | string | MIT, Apache-2.0, or proprietary |
| sourceHash | string | sha256 of source repo at `logicn promote` time |
| resourceLimits.maxMemoryMB | number | WASM linear memory ceiling |
| resourceLimits.maxCpuCycles | number | Wasmtime fuel limit |
| resourceLimits.maxWallMs | number | Wall clock timeout in milliseconds |
| capabilities | string[] | e.g. ["ai.inference", "network.outbound"] |
| blacklisted | boolean | true = Tower refuses to load this version |
| blacklistReason | string? | Set on panic-as-security event |

### schemas/data_types.json fields

```json
{
  "version": "1.0",
  "strict": true,
  "inputs": [
    { "name": "prompt", "type": "String", "required": true, "maxLength": 32768 }
  ],
  "outputs": [
    { "name": "completion", "type": "String", "required": true }
  ]
}
```

Supported types: `Int`, `String`, `Bool`, `Float`, `Bytes`, `Array<Int>`, `Array<String>`

`strict: true` is always required — any deviation from the schema is a SECURITY_ALERT.

---

## The Blacklist Protocol

The blacklist (`build/plugin-blacklist.json`) is the Tower's permanent record of plugin versions that have committed security events.

**Blacklisting conditions:**
- Plugin WASM traps unexpectedly (not from a `trap` keyword in governance.lln)
- Plugin attempts to exceed its declared `resourceLimits`
- Plugin output fails schema validation (possible output-side injection)

**Blacklist entry format:**
```json
{
  "pluginId": "groq-inference@1.0.0",
  "reason": "Unexpected WASM trap at offset 0x4f2 — panic-as-security",
  "blacklistedAt": "2026-06-05T00:00:00.000Z"
}
```

**Tower response to blacklisted plugin:**
- Stage A: `loadPluginBlacklist()` checks before every invocation
- Stage B: DSS.wasm V_DPM bit cleared at admission gate — plugin cannot execute

A blacklisted plugin version is **never** un-blacklisted. Deploy a new version with a new `sourceHash`.

---

## Stage A vs Stage B Implementation Status

### Stage A (Current — TypeScript interpreter on Node.js)

| Feature | Status |
|---------|--------|
| `validatePluginInput()` — schema validation | Implemented (`plugin-schema.ts`) |
| `computeComplianceHash()` — output forensics | Implemented (`plugin-schema.ts`) |
| `hardErase()` — erasure receipt | Implemented (`plugin-schema.ts`) |
| `loadPluginBlacklist()` / `blacklistPlugin()` | Implemented (`logicn.mjs`) |
| `logicn border-check` — CLI validation | Implemented (`logicn.mjs`) |
| Plugin folder schema enforced at `logicn promote` | Pending |
| LLN-BORDER-001..005 governance verifier | Comment-registered (`governance-verifier.ts`) |

### Stage B (Planned — DSS.wasm + Wasmtime)

| Feature | Status |
|---------|--------|
| WASM linear memory zeroed on `hardErase()` | Pending (DRCM Phase 5 gate) |
| Wasmtime fuel limit enforced per plugin invocation | Pending (task #104) |
| LLN-BORDER-005 auto-blacklist on trap signal | Pending (DSS.wasm signal routing) |
| V_DPM bit cleared for blacklisted plugins at admission | Pending (task #102) |
| Schema validation in DSS.wasm (no JS boundary) | Pending |

---

## CLI Reference

```
logicn border-check
```

Scans `governance/plugins/` and validates that every plugin subdirectory has both a `manifest.json` and a `schemas/data_types.json`. Reports governance tier and license for clean plugins, and flags missing files as issues. Exits with code 1 if any plugin is missing required files.

---

## Related Documents

- `docs/Knowledge-Bases/logicn-drcm.md` — DRCM architecture (DSS.wasm supervisor)
- `docs/Knowledge-Bases/logicn-governance-rules.md` — full LLN diagnostic code registry
- `packages-logicn/logicn-core-compiler/src/plugin-schema.ts` — TypeScript implementation
- `governance/plugins/groq-inference-v1/` — reference plugin example
