# LogicN Config TODO

```text
[x] Create /packages-logicn/logicn-core-config
[x] Add README.md
[x] Add TODO.md
[x] Add package metadata
[x] Add initial typed exports
[x] Define project config shape
[x] Define environment mode loader
[x] Define production strictness policy
[x] Define production-disabled package defaults and explicit override contract
[x] Define config validation diagnostic format
[x] Define safe environment variable reference model
[x] Define runtime config handoff contract
[x] Add examples
[x] Add tests
[ ] Define EnvironmentMode as closed type: "development" | "test" | "staging" | "production"
[ ] Implement EnvironmentMode unknown-mode diagnostic (LN-CONFIG-003)
[ ] Define SecretEnvironmentReference type with redacted: true marker
[ ] Implement loadEnvironmentConfig() with missing variable diagnostics (LN-CONFIG-001, LN-CONFIG-002)
[ ] Implement ProductionStrictnessPolicy enforcement
[ ] Implement RuntimeConfigHandoff type (mode/publicVariables/secretReferences/diagnostics/activeProductionPackageOverrides)
[ ] Ensure no raw secret values can appear in any config diagnostic output
[ ] Implement host package manifest boundary diagnostic (LN-CONFIG-010) — reject LogicN keys from package.json
[ ] Create internal dir structure: environment-config.ts, environment-loader.ts, production-policy.ts, runtime-handoff.ts, config-diagnostics.ts, host-package-boundary.ts
```
