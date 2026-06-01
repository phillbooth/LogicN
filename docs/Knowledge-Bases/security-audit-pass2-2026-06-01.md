# LogicN Security Audit — Pass 2 (June 1, 2026)

## Status

```text
Date: 2026-06-01
Scope: packages-logicn/logicn-core-compiler + route/runtime/stdlib/audit surfaces
Result: Several prior issues fixed; some residual high/medium risks remain
```

## Rules at a Glance

- Route/runtime effect gating is partially fixed, but still profile-limited.
- Manifest verification improved structurally, but is not cryptographically bound yet.
- Filesystem sandboxing exists, but path-prefix checks are bypassable.
- Audit writer fail-closed logic exists, but runtime does not enable it for production.
- Regex ReDoS guard added, but coverage is still heuristic.

---

## Audit Scope

Reviewed code:

- `src/route-dispatcher.ts`
- `src/runtime/runtimeContext.ts`
- `src/audit-writer.ts`
- `src/stdlib.ts`
- `src/symbol-resolver.ts`
- related tests and current `npm test` state

Verification:

- `npm test` passed (`2642` tests, `0` failed)

---

## Findings Matrix

| ID | Finding | Severity | Current State |
|---|---|---|---|
| F1 | Route boundary effect gate missing | High | **Partially fixed** |
| F2 | Weak runtime manifest verification | High | **Partially fixed** |
| F3 | Filesystem path traversal / sandbox escape | High | **Partially fixed (still bypassable)** |
| F4 | Silent audit file-write failure | Medium | **Partially fixed** |
| F5 | Secret leak checks in audit metadata are heuristic | Medium | **Improved, still partial** |
| F6 | Over-permissive capitalized-name suppression in resolver | Medium | **Improved** |
| F7 | Malformed query decode crash risk | Low/Medium | **Fixed** |
| F8 | Dynamic regex ReDoS risk | Medium | **Improved, still partial** |

---

## Detailed Findings

### F1 — Route boundary effect gate

**Status:** Partially fixed  
**Code:** `src/route-dispatcher.ts` (security gate block before `executeFlow`)

### Correction made

- Added a runtime gate that blocks selected sensitive effects in `deterministic` mode.

### Remaining gap

- Gate is not generalized by deployment policy/runtime manifest.
- It only checks a hardcoded subset (`network.outbound`, `filesystem.write`, `process.spawn`) and only in deterministic mode.

### Required code change

- Move to a policy-driven allowlist from manifest/profile for **all** modes (`production`, `deterministic`, and optional strict `dev`).
- Deny any declared effect not in policy.

### Tests to add

1. `production` mode denies a flow whose declared effect is not in allowed profile effects.
2. `production` mode allows the same flow when effect is allowed.
3. `deterministic` mode denies all non-deterministic effects from policy map (not hardcoded list).
4. Route dispatch returns structured `403` denial payload with denied effect list.

---

### F2 — Runtime manifest verification strength

**Status:** Partially fixed  
**Code:** `src/runtime/runtimeContext.ts` (`verifyRuntimeManifestHash`)

### Correction made

- Added structural checks (verified flag, non-empty flow, governance flags, allowedEffects presence conditions).

### Remaining gap

- No cryptographic binding to GIR/runtime artifact.
- `girHash` currently unused in enforcement logic.

### Required code change

- Verify signed manifest payload against trusted signer set.
- Enforce canonical hash equality with GIR hash and artifact hash.
- Fail closed on signature/hash mismatch.

### Tests to add

1. Valid signed manifest + matching GIR hash passes.
2. Valid signature but mismatched GIR hash fails.
3. Missing signature fails in production/deterministic mode.
4. Tampered `allowedEffects` after signing fails verification.

---

### F3 — Filesystem path confinement

**Status:** Partially fixed, still high risk  
**Code:** `src/stdlib.ts` (`filesystemAsync`)

### Correction made

- Added root confinement intent (`LOGICN_FS_ROOT`) and `..` rejection.

### Remaining gap (important)

- Prefix check uses `startsWith`, which can be bypassed:
  - root: `/app/root`
  - path resolves to `/app/root2/...` → still `startsWith("/app/root")`.
- No symlink boundary verification after realpath canonicalization.

### Required code change

- Use canonical real paths:
  - `rootReal = await realpath(root)`
  - `targetReal = await realpath(dirname(target))` (or realpath for existing target)
- Use path-segment-safe check:
  - `relative(rootReal, targetReal)` must not start with `..` and must not be absolute.

### Tests to add

1. Deny sibling-prefix escape (`/root2` when root is `/root`).
2. Deny symlink escape outside root.
3. Allow normal read/write inside root.
4. Deny absolute path outside root even without `..`.

---

### F4 — Audit writer fail-closed behavior

**Status:** Partially fixed  
**Code:** `src/audit-writer.ts`, `src/runtime.ts`

### Correction made

- `createAuditWriter(..., failClosed)` added.
- File-write failures can now throw when failClosed is true.

### Remaining gap

- Runtime currently calls `createAuditWriter(...)` without enabling `failClosed` in production/deterministic modes.

### Required code change

- In `runtime.ts`, pass `failClosed: true` when `mode` is `production` or `deterministic`.

### Tests to add

1. Production mode with unwritable audit path returns failure (not silent success).
2. Dev mode with unwritable path logs warning but continues.
3. Deterministic mode fails closed on audit append error.

---

### F5 — Audit secret redaction checks

**Status:** Improved, still partial  
**Code:** `src/audit-writer.ts` (`checkNoSecrets`)

### Correction made

- Expanded key blacklist and suspicious value-pattern checks.

### Remaining gap

- Value checks are still heuristic and string-only.
- No recursive structured redaction pass over nested metadata objects before write.

### Required code change

- Introduce typed/structured metadata redaction pipeline:
  - classify sensitive wrappers (`secure`, `protected`) at source;
  - recursively redact nested objects/arrays;
  - then serialize.

### Tests to add

1. Nested metadata object containing secret-like value is rejected or redacted.
2. Protected/secure wrapper values serialize as `[PROTECTED]` / `[SECURE]`.
3. Non-sensitive fields survive unchanged.

---

### F6 — Symbol resolver suppression scope

**Status:** Improved  
**Code:** `src/symbol-resolver.ts` (`checkIdentifierUse`)

### Correction made

- Narrowed blanket capitalized-name suppression.

### Remaining gap

- Suppression policy is still partly heuristic (`KNOWN_STDLIB_PREFIXES` and no-dot single word allowance).
- This can still hide some typo classes and produce inconsistent behavior across packages.

### Required code change

- Replace heuristic prefix list with explicit import/prelude registry only.
- Unknown capitalized module references should resolve through package/import context.

### Tests to add

1. Unknown capitalized module call (`XyzUnknown.call`) triggers `LLN-NAME-001`.
2. Imported/known prelude module still does not trigger false positive.
3. Single-word type constructor in expression context routes to type checker path as intended.

---

### F7 — Query-string decoding robustness

**Status:** Fixed  
**Code:** `src/route-dispatcher.ts` (`parseQueryString`)

### Correction made

- Wrapped `decodeURIComponent` in `try/catch`; malformed pairs no longer crash request handling.

### Tests to add

1. Malformed query percent-encoding does not crash server/process.
2. Server returns stable response (prefer 400 policy) and logs malformed query event.

---

### F8 — Dynamic regex ReDoS controls

**Status:** Improved, still partial  
**Code:** `src/stdlib.ts` (`validateRegexPattern`, string regex methods)

### Correction made

- Added length limit and nested-quantifier heuristic checks.

### Remaining gap

- Guard is not complete against all catastrophic patterns.
- No execution-time budget/timeouts for regex operations.

### Required code change

- Option A: switch user patterns to safe-regex engine.
- Option B: disable arbitrary regex in strict/high-integrity profiles.
- Option C: require literal mode by default (`Regex.escapeLiteral`) unless explicitly unsafe-enabled.

### Tests to add

1. Known catastrophic pattern classes are rejected.
2. Oversized pattern rejected.
3. Safe literal patterns allowed.
4. High-integrity profile blocks dynamic regex (if policy added).

---

## Recommended Next Patch Order

1. F3 path confinement hardening (`stdlib.ts`)  
2. F4 fail-closed wiring in runtime (`runtime.ts`)  
3. F1 generalized effect gate via policy/manifest (`route-dispatcher.ts`)  
4. F2 cryptographic manifest/GIR binding (`runtimeContext.ts` + signing path)  
5. F8 strict-profile regex policy (`stdlib.ts` + profile checker)

---

## Evidence

- Build/test verification completed during this audit pass:
  - `npm test` passed (`2642` tests, `0` failures)

