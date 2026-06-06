# P9 #144 Senior Developer App And Security Review

Date: 2026-06-06

Scope: LogicN repository at `c:\wwwprojects\LogicN`, with emphasis on the current Stage A compiler/runtime, P9 self-hosting path, default app packages, plugin surface, Tri/Photonic logic rules, code standards, and security posture. "Phonotic" is treated here as the existing project term "Photonic".

## Review Summary

The project is technically strong in the core compiler/runtime path: the full project test suite passes, explicit typechecks pass for the main active TypeScript packages checked, and the #144 enum-member-lowering claim is reflected in the runtime SOT. However, this repository is not yet presentation-clean for a senior developer review without caveats.

The biggest blocker is security hygiene: `.env.logicn-signing` is tracked in Git, is not ignored, and contains a private Ed25519 signing key. The next biggest blocker is maturity mismatch: the workspace default app and API server are mostly documentation/TODO surfaces, while the README and version metadata overstate or contradict the actual P9/Stage B status.

## Verified Commands

| Command | Result |
|---|---|
| `npm.cmd test` | Passed: 44/44 packages, 4,128 tests |
| `npm.cmd run test:core` | Passed: 4/4 core packages, 3,402 tests |
| `npm.cmd run test:list` | Lists 44 test-bearing packages |
| `npm.cmd run typecheck` in `logicn-core-compiler` | Passed |
| `npm.cmd run typecheck` in `logicn-core-security` | Passed |
| `npm.cmd run typecheck` in `logicn-tower-citizen` | Passed |
| `npm.cmd run typecheck` in `logicn-core` | Failed: local `tsc` is not installed |
| `node logicn.mjs border-check` | Passed: 1 plugin validated, 0 issues |
| `node logicn.mjs check ...\self-hosted\lexer.lln` | Passed: 0 errors, 0 governance warnings |
| `node logicn.mjs check ...\self-hosted\parser.lln` | Passed: 0 errors, 0 governance warnings |
| `npm.cmd audit --omit=dev` in `logicn-core-compiler` | Passed: 0 vulnerabilities |
| `npm.cmd audit --omit=dev` in `logicn-tower-citizen` | Passed: 0 vulnerabilities |

## Blockers

### Critical: Private signing key is tracked

`.env.logicn-signing` is tracked by Git and `git check-ignore` reports it is not ignored. The file itself says not to commit it, and `logicn.mjs` writes this file during keygen with a "NEVER COMMIT" warning (`logicn.mjs:241-259`). This directly violates the repo security rule "Never store real secrets in source control."

Impact: any signatures using this key must be treated as compromised. This undermines manifest signing, governance proof trust, and any demo that claims signing integrity.

Required fix before presentation:

- Revoke/rotate the signing key.
- Remove `.env.logicn-signing` from Git history or treat the repo as contaminated.
- Add `.env.logicn-signing` to `.gitignore`.
- Ensure CI rejects private key material and `LOGICN_SIGNING_PRIVATE_KEY_B64`.

### High: Default app package is not an app yet

`logicn.workspace.json:61` sets `packages-logicn/logicn-framework-example-app` as the default package, but that directory contains only `.gitkeep`, `README.md`, and `TODO.md`. Its TODO still lists app entry files, config, environment schema, route/module structure, tests, and build configuration as open (`packages-logicn/logicn-framework-example-app/TODO.md:7-12`).

Impact: the "main app" cannot be presented as an implemented app surface. It is a placeholder/template.

### High: API server and app kernel are mostly design/TODO

`logicn-framework-api-server` has no package metadata, no `src`, and no tests. Its TODO includes package.json, tsconfig, public API exports, CLI, route manifest types, webhook HMAC verification, replay prevention, safe request logging, production body-limit gates, and deny-by-default network enforcement (`packages-logicn/logicn-framework-api-server/TODO.md:53-75`, `123-130`, `172-176`, `204-209`).

`logicn-framework-app-kernel` has package metadata and smoke fixtures, but its own TODO still has the typed API boundary, validation, auth, idempotency, rate limiting, audit report format, and runtime/API-server handoff as open (`packages-logicn/logicn-framework-app-kernel/TODO.md:8-20`).

Impact: framework/runtime app claims should be presented as architecture/design, not production implementation.

### High: Status metadata contradicts verified state

`version.json` reports 3,383 tests and 33 packages (`version.json:7-8`), while `npm.cmd test` verifies 4,128 tests across 44 packages. `node logicn.mjs version` prints the stale values.

`docs/Knowledge-Bases/logicn-runtime-status-SOT.md:16` says `npm run test:core` gives 3,383 tests, but the actual run gives 3,402. The table line for `logicn-core-compiler` is 3,278 tests, so the SOT total at line 24 is internally stale.

`README.md:109-111` says Stage B is 100% complete, while `README.md:95` says Stage B WASM execution is 0%, and the SOT still lists real DSS.wasm as 0% pending Stage B. This is presentation-risky because a senior reviewer will notice the contradiction quickly.

## Plugin Audit

Current plugin surface: `governance/plugins/groq-inference-v1`.

Findings:

- Manifest has `sourceHash: "sha256:pending-logicn-promote"` (`governance/plugins/groq-inference-v1/manifest.json:6`). This is not a real source integrity pin.
- Plugin requests `ai.inference`, `network.outbound`, and `audit.write` (`manifest.json:12`). That is a meaningful authority set and should require a real promotion, hash, signature/attestation evidence, and allowlist.
- CLI `border-check` only checks for presence of `manifest.json` and `schemas/data_types.json` and prints metadata (`logicn.mjs:405-431`). It does not validate manifest schema, hash format beyond presence, capability allowlists, resource-limit ranges, schema field correctness, blacklisted plugin denial, or signed plugin artifacts.
- `plugin-schema.ts` has real input schema validation logic (`packages-logicn/logicn-core-compiler/src/plugin-schema.ts:56-124`), but the CLI border check does not invoke it.

Required before presenting plugin safety as complete:

- Replace pending source hash with a real immutable hash.
- Add manifest/schema validation to `border-check`.
- Fail `border-check` on `blacklisted: true`, pending hashes, unknown capabilities, missing governance policy, missing signed artifact, or excessive resource limits.
- Add tests for malformed plugin manifests and schema poisoning.

## Tri And Photonic Logic Review

What looks good:

- `Bool`, `Tri`, `Decision`, and Photonic separation is documented in `docs/rules/rules-bool-tri-photonic.md`.
- Compiler safety tests reject direct `Tri` branch conditions, implicit Tri/Decision/Bool conversion, non-exhaustive Tri matches, and risky secure-flow `unknown_as_true` handling.
- v0.2 bool boundary code fails closed for `TriState unknown`, `Decision review`, and `Decision unknown` (`packages-logicn/logicn-core-logic/src/bool-boundary/bool-enforce.ts:21-97`).
- Tri stdlib registry marks `Tri.toBool` as not photonic-compatible, which is consistent with "photonic planning must not change source meaning."

Concerns:

- The older numeric `triToBool` API still supports `unknown_as_true` (`packages-logicn/logicn-core-logic/src/index.ts:99-118`). It is explicit, and compiler checks mitigate secure-flow use, but it remains a footgun if called directly outside the compiler-governed path.
- `logicn-core-photonic` is still post-v1 planning for key production constraints: canonical transport enum, diagnostic table, isolation, propagation, hybrid mode, realtime validation, capability validation, deterministic planning, and experimental transport restrictions are open (`packages-logicn/logicn-core-photonic/TODO.md:7-9`, `40-61`).

Recommendation: present Tri/Photonic as partially implemented with strong compiler guardrails, not as a complete production backend.

## Code Standards Review

Good:

- Active TypeScript packages checked use strict settings, including `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`.
- `logicn-core-compiler`, `logicn-core-security`, and `logicn-tower-citizen` typecheck explicitly.
- Full test suite passes.
- Secret sink checks and source dynamic-code checks exist (`source-escape-checker.ts:90-97`, `value-state-checker.ts:1330-1395`).

Does not meet standards:

- `logicn-core` cannot run `npm.cmd run typecheck` in this checkout because local `tsc` is missing. This is a reproducibility problem for a core package.
- Root `logicn.mjs` is a 1,011-line CLI with many responsibilities. It includes deployment orchestration, keygen, plugin checking, verification, build, runtime commands, and reporting. This is workable for a prototype but below the modularity standard expected for a senior-maintained production CLI.
- `logicn.mjs deploy` builds shell command strings with user-provided `llnFile` and executes them through `execSync` (`logicn.mjs:156-166`). This should be changed to `spawnSync("node", ["logicn.mjs", "check", llnFile], ...)` style argv calls.
- Several implemented compiler/runtime paths still explicitly identify themselves as stubs or placeholders. Examples: register VM bytecode emits `UNREACHABLE` only (`register-vm.ts:91-112`), WAT emitter comments and diagnostics still describe Phase 19/22 stubs (`wat-emitter.ts:23-25`, `315-322`, `1920-1921`, `2071-2077`), and Tower bridge stubs use dev placeholder package hashes (`stub-provider.ts:30-40`, `113-123`).
- Many workspace packages are package-only or docs-only surfaces. Notably the data, DB, web, registry, and some target packages have no `src` and no `tests` despite being listed in `logicn.workspace.json`.

## Security Review

Positive controls:

- Dependency audits for the main active dependency-bearing packages checked report 0 production vulnerabilities.
- WASM admission gate is present in the compiler package and the P9 admission tests are in the working tree.
- Certified Tower mode fails closed when audit egress or signed attestation policy is missing (`hybrid-engine.ts:608-619`).
- Secret redaction patterns include bearer tokens, API-key style assignments, and private key PEM blocks (`logicn-core-security/src/index.ts:150-170`).
- Compiler value-state checks reject logging or serializing `SecureString` without `redact()`.

Security gaps:

- Tracked private signing key is the critical issue.
- Plugin border check is superficial compared with the plugin threat model.
- `deploy` shell command construction is injection-prone on paths containing shell metacharacters.
- `effectsToFlags` silently skips unknown effects (`type-registry.ts:187-190`). The comment says full names track them, but security-sensitive enforcement should fail closed or return diagnostics at the boundary where flags are used.
- Unknown `source_from` origins are treated as clean (`value-state-checker.ts:566-578`). That is only safe when every origin enum is closed and validated before this function sees it. For a security language, unknown origin should normally be unknown/unsafe, not clean.
- Certified/native bridge presentation must be precise: default Tower bridges include dev/simulation stubs and placeholder hashes, which is acceptable for tests but not for production claims.

## Unfinished Or Broken-Looking Surfaces

- Default app: placeholder only.
- API server: design/TODO only.
- App kernel: design plus smoke fixtures, not runtime enforcement.
- Real DSS.wasm: still reported as 0% in the SOT.
- P9 critical path: #144 appears complete, but `logicn-runtime-governance-actors.md:106-111` still lists #145 and #143 as blockers.
- Photonic runtime: concept package exists; production isolation/fallback/capability enforcement is still TODO.
- Version/status reporting: stale and contradictory across `version.json`, README, and SOT.
- Working tree is dirty with build artifacts, source changes, and untracked P9 files. That is normal during development, but not suitable for a clean senior presentation without a prepared branch or change summary.

## Presentation Readiness

Recommended framing:

- "Core compiler/runtime prototype is healthy: 4,128 tests pass."
- "#144 enum-member lowering is complete; lexer/parser checks pass."
- "Tri/Decision safety is implemented in compiler checks and bool-boundary helpers."
- "Photonic remains a governed planning/compatibility surface, not a production backend."
- "The default app/framework packages are not implemented apps yet."
- "Security review found a critical key-management issue that must be fixed before claiming governance-signature trust."

Do not claim:

- Full production app readiness.
- Complete API server or app kernel implementation.
- Complete real DSS.wasm / Wasmtime runtime.
- Certified plugin admission for `groq-inference-v1`.
- Clean repository state.

## Priority Fix List

1. Rotate and remove the tracked signing private key; add ignore and CI secret scanning.
2. Update `version.json`, README, and SOT so test counts and Stage B/P9 status agree with current verified output.
3. Harden `logicn.mjs border-check` to validate plugin manifests, schemas, hashes, capabilities, and blacklist state.
4. Replace `execSync` shell command strings in `logicn.mjs deploy` with argv-based process spawning.
5. Decide whether unknown taint origins and unknown effects should fail closed; update checker behavior or document the closed enum guarantee.
6. Move the root CLI implementation into focused modules once P9 settles.
7. Convert default app/API server TODOs into either implemented packages or explicitly mark them as templates, not active runtime.
