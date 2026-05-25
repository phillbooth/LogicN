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
[ ] Define ConfigValue discriminated union: string|number|boolean|url|duration|bytes
[ ] Define EnvironmentPolicy with allowSecretValuesInReports: false (always — never expose secret values)
[ ] Implement defaultEnvironmentPolicy(mode): EnvironmentPolicy per mode (development/test/staging/production)
[ ] Upgrade EnvironmentConfig to v0.2: add schemaVersion "logicn.config.environment.v1", policy field
[ ] Upgrade SecretEnvironmentReference: add id, source (SecretConfigSource), category, provider, requiredIn[], allowedSinks, deniedSinks, redaction
[ ] Define SecretConfigSource discriminated union: env|file|secretStore|runtimeInjected
[ ] Define SecretEnvironmentReference.redacted: true marker (never the raw value)
[ ] Define LoadEnvironmentConfigInput: mode, variableNames, secretNames, availableEnvironment, policy?
[ ] Implement loadEnvironmentConfig(input): Promise<{config, diagnostics}> with LN-CONFIG-001, LN-CONFIG-002
[ ] Define EnvironmentConfigReport and SecretReportValue (source: kind only, not raw path/value)
[ ] Implement ProductionStrictnessPolicy enforcement
[ ] Implement RuntimeConfigHandoff type (mode/publicVariables/secretReferences/diagnostics/activeProductionPackageOverrides)
[ ] Ensure no raw secret values can appear in any config diagnostic output
[ ] Implement host package manifest boundary diagnostic (LN-CONFIG-010) — reject LogicN keys from package.json
[ ] Create internal dir structure: environment/, secrets/, loaders/, types/
```
