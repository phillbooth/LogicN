# LogicN Check Configuration — `logicn.check.json`

**Phase: 69+ (extended `logicn check` command)**

## Overview

`logicn check` reads `logicn.check.json` (or `.logicnrc.json`) from the project root
and applies it as project-level configuration. All fields are optional — omitting
a field inherits the built-in default.

## File locations searched (in order)

1. `{targetDir}/logicn.check.json`
2. `{targetDir}/.logicnrc.json`
3. `{targetDir}/logicn.config.json`
4. `{cwd}/logicn.check.json`
5. `{cwd}/.logicnrc.json`

## Full schema

```json
{
  "profile": "production",

  "rules": {
    "LLN-TAINT-001": "error",
    "LLN-STYLE-001": "off",
    "LLN-PROFILE-006": "warning"
  },

  "ignore": [
    "tests/**",
    "examples/**"
  ],

  "minSeverity": "warning",

  "security": false,
  "flowgraph": false
}
```

## Fields

### `profile`
Deployment profile applied to governance checks.
- `"dev"` — relaxed checks
- `"production"` — standard production checks (default)
- `"deterministic"` — strict deterministic mode
- `"strict"` — all rules at maximum severity

### `rules`
Per-diagnostic-code severity overrides.

| Severity | Meaning |
|---|---|
| `"error"` | Fails the check (exit code 2) |
| `"warning"` | Reported but does not fail |
| `"info"` | Informational only |
| `"off"` | Diagnostic suppressed entirely |

Example — turn off style advisory, keep security as error:
```json
{
  "rules": {
    "LLN-STYLE-001": "off",
    "LLN-TAINT-001": "error",
    "LLN-SYNTAX-010": "error"
  }
}
```

### `ignore`
Array of path prefixes to skip. Simple prefix matching — `"tests/**"` skips
any file whose relative path starts with `tests/`.

### `minSeverity`
Minimum severity to report:
- `"info"` — show everything (default)
- `"warning"` — suppress info-only diagnostics  
- `"error"` — suppress warnings and info (CI mode)

### `security`
When `true`, runs `@logicn/devtools-security` checks (runSecurityAudit) on each file.
Adds ~2s per file. Recommended for CI pipelines, off by default for local speed.

### `flowgraph`
When `true`, runs `@logicn/devtools-flowgraph` checks (LLN-GRAPH-001..006) on each file.
Detects cycles, dead flows, authority escalation, PII leakage, missing audit coverage.

## Rules at a Glance

- Config is optional — `logicn check` works without it, using built-in defaults.
- Config is loaded once per run, not per-file.
- `"off"` completely suppresses a diagnostic — it won't appear in output or affect exit code.
- `minSeverity: "error"` makes `logicn check` silent on warnings — useful for CI where only errors matter.

## Example: strict project config

```json
{
  "profile": "strict",
  "rules": {
    "LLN-TAINT-001": "error",
    "LLN-TAINT-003": "error",
    "LLN-TAINT-005": "error",
    "LLN-VAL-001": "error",
    "LLN-VAL-002": "error",
    "LLN-SYNTAX-010": "error",
    "LLN-SYNTAX-LEGACY-001": "error",
    "LLN-STYLE-001": "off"
  },
  "ignore": ["tests/**", "generated/**"],
  "minSeverity": "warning",
  "security": true,
  "flowgraph": true
}
```

## Example: CI pipeline config (errors only)

```json
{
  "profile": "production",
  "minSeverity": "error",
  "ignore": ["tests/**"],
  "security": true
}
```

## Diagnostic code reference

See `docs/Knowledge-Bases/compiler-diagnostics.md` for the full list of codes.
Key codes to configure:

| Code | What it checks | Recommended |
|---|---|---|
| LLN-TAINT-001 | SQL injection | `"error"` |
| LLN-TAINT-005 | HTTP header injection | `"error"` |
| LLN-TAINT-006 | SSRF | `"error"` |
| LLN-VAL-001/002 | safety_critical invariants | `"error"` |
| LLN-SYNTAX-010 | `else if` hard error | `"error"` |
| LLN-SYNTAX-LEGACY-001 | `with effects` removed | `"error"` |
| LLN-STYLE-001 | Advisory only | `"off"` or `"warning"` |
| LLN-PROFILE-006 | Missing runtime budget | `"warning"` |
| LLN-GRAPH-001 | Cycle detected | `"error"` (requires `flowgraph: true`) |
| LLN-GRAPH-005 | Missing audit coverage | `"warning"` (requires `flowgraph: true`) |
