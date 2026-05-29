# LogicN Package Naming

## Status

```text
Package naming: specified - implementation future migration
Applies to:      packages-logicn package family
```

This document defines package naming conventions and a migration map for active
LogicN packages. The broader historical package naming context is in
`docs/PACKAGE_NAMING.md`.

---

## Rules at a Glance

- Use `logicn-*` for implementation packages.
- Use `lln` for language-surface artifacts such as diagnostics, grammar, AST
  formats, and CLI file formats.
- Prefer explicit package families over ambiguous root names.
- Merge duplicates before renaming dependent packages.
- Package names must reveal ownership and authority surface.
- Archived finance, electrical, and OT packages are outside the active v1 build.

---

## Naming Strategy

`logicn-*` names are for implementation packages: compiler, runtime, stdlib,
targets, framework packages, database connectors, developer tools, and runtime
support.

`lln` is reserved for language artifacts:

- grammar file formats
- AST schema names
- diagnostic schemas
- package manifest schema identifiers
- CLI output formats
- GIR schema identifiers

Final principle:

```text
logicn-* for packages. lln for language artifacts.
```

## Naming Families

| Family | Purpose |
|---|---|
| `logicn-core-*` | Core language/runtime primitives. |
| `logicn-ai-*` | AI-specific systems. |
| `logicn-data-*` | Data formats, models, queries, reports. |
| `logicn-db-*` | Concrete database connectors. |
| `logicn-target-*` | Execution target and lowering packages. |
| `logicn-framework-*` | Application framework packages. |
| `logicn-web-*` | Web UI, router, render, state, and events. |
| `logicn-devtools-*` | Developer tooling. |
| `logicn-tools-*` | Standalone tools. |

## Full Rename Map

| Current package | Recommended package | Action |
|---|---|---|
| `logicn-ai` | `logicn-ai` | Keep |
| `logicn-ai-agent` | `logicn-ai-agent` | Keep |
| `logicn-ai-lowbit` | `logicn-ai-lowbit` | Keep |
| `logicn-ai-neural` | `logicn-ai-neural` | Keep |
| `logicn-ai-neuromorphic` | `logicn-ai-neuromorphic` | Keep |
| `logicn-app-kernel` | `logicn-framework-app-kernel` | Merge |
| `logicn-core` | `logicn-core` | Keep |
| `logicn-core-cli` | `logicn-cli` | Rename |
| `logicn-core-compiler` | `logicn-compiler` | Rename |
| `logicn-core-compute` | `logicn-core-compute` | Keep |
| `logicn-core-config` | `logicn-core-config` | Keep |
| `logicn-core-logic` | `logicn-core-logic` | Keep |
| `logicn-core-network` | `logicn-core-network` | Keep |
| `logicn-core-photonic` | `logicn-core-photonic` | Keep |
| `logicn-core-reports` | `logicn-reports` | Merge |
| `logicn-core-runtime` | `logicn-runtime` | Rename |
| `logicn-core-security` | `logicn-security` | Merge |
| `logicn-core-tasks` | `logicn-tasks` | Merge |
| `logicn-core-vector` | `logicn-vector` | Merge |
| `logicn-cpu-kernels` | `logicn-target-cpu-kernels` | Rename |
| `logicn-data` | `logicn-data` | Keep |
| `logicn-data-archive` | `logicn-data-archive` | Keep |
| `logicn-data-database` | `logicn-data-db` | Merge |
| `logicn-data-db` | `logicn-data-db` | Keep |
| `logicn-data-html` | `logicn-data-html` | Keep |
| `logicn-data-json` | `logicn-data-json` | Keep |
| `logicn-data-model` | `logicn-data-model` | Keep |
| `logicn-data-pipeline` | `logicn-data-pipeline` | Keep |
| `logicn-data-query` | `logicn-data-query` | Keep |
| `logicn-data-reports` | `logicn-reports` | Merge |
| `logicn-data-response` | `logicn-data-response` | Keep |
| `logicn-data-search` | `logicn-data-search` | Keep |
| `logicn-db-firestore` | `logicn-db-firestore` | Keep |
| `logicn-db-mysql` | `logicn-db-mysql` | Keep |
| `logicn-db-opensearch` | `logicn-db-opensearch` | Keep |
| `logicn-db-postgres` | `logicn-db-postgres` | Keep |
| `logicn-db-sqlite` | `logicn-db-sqlite` | Keep |
| `logicn-devtools-project-graph` | `logicn-devtools-project-graph` | Keep |
| `logicn-framework-api-server` | `logicn-framework-api-server` | Keep |
| `logicn-framework-app-kernel` | `logicn-framework-app-kernel` | Keep |
| `logicn-framework-example-app` | `logicn-framework-example-app` | Keep |
| `logicn-lowbit-ai` | `logicn-ai-lowbit` | Merge |
| `logicn-packages` | `logicn-package-tools` | Rename |
| `logicn-project-graph` | `logicn-devtools-project-graph` | Merge |
| `logicn-reports` | `logicn-reports` | Keep |
| `logicn-security` | `logicn-security` | Keep |
| `logicn-target-ai-accelerator` | `logicn-target-ai-accelerator` | Keep |
| `logicn-target-cpu` | `logicn-target-cpu` | Keep |
| `logicn-target-gpu` | `logicn-target-gpu` | Keep |
| `logicn-target-js` | `logicn-target-js` | Keep |
| `logicn-target-native` | `logicn-target-native` | Keep |
| `logicn-target-photonic` | `logicn-target-photonic` | Keep |
| `logicn-target-wasm` | `logicn-target-wasm` | Keep |
| `logicn-targets` | `logicn-targets` | Keep |
| `logicn-tasks` | `logicn-tasks` | Keep |
| `logicn-toolchain` | `logicn-toolchain` | Keep |
| `logicn-tools-benchmark` | `logicn-tools-benchmark` | Keep |
| `logicn-vector` | `logicn-vector` | Keep |
| `logicn-web` | `logicn-web` | Keep |
| `logicn-web-components` | `logicn-web-components` | Keep |
| `logicn-web-events` | `logicn-web-events` | Keep |
| `logicn-web-render` | `logicn-web-render` | Keep |
| `logicn-web-router` | `logicn-web-router` | Keep |
| `logicn-web-state` | `logicn-web-state` | Keep |

## High-Priority Consolidations

| Area | Rule |
|---|---|
| Low-bit AI | Merge `logicn-lowbit-ai` into `logicn-ai-lowbit`. |
| Database | Merge `logicn-data-database` into `logicn-data-db`. |
| Reports | Consolidate `logicn-core-reports`, `logicn-data-reports`, and `logicn-reports` into one reports package after API compatibility review. |
| CLI | Rename `logicn-core-cli` to `logicn-cli`. |
| Compiler | Rename `logicn-core-compiler` to `logicn-compiler`. |

## Rename Checklist

When renaming:

- update directory paths
- update `package.json` names
- update `logicn.workspace.json`
- update imports and relative paths
- update tests
- update docs and examples
- regenerate project graph outputs
- add changelog and migration notes

## Compiler Status

```text
Naming spec: specified
Migration:   future package cleanup
```

## See Also

- `docs/PACKAGE_NAMING.md`
- `docs/Knowledge-Bases/certified-package-registry.md`
- `docs/Knowledge-Bases/logicn-package-manifest-spec.md`
- `docs/Knowledge-Bases/logicn-core-compiler-manifest-generation-pass-14.md`
- `docs/Knowledge-Bases/logicn-glossary.md`
