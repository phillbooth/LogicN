# Runtime Package Structure

## Definition

LogicN packages are coarse-grained and responsibility-based. Each package owns
a clear runtime or language concern. Tiny packages for every concept are
avoided.

## Package Tiers

### Required Core Packages

These are mandatory for the compiler and runtime:

```text
logicn-core              language rules, types, diagnostics
logicn-core-compiler     parser, checker, emit planning
logicn-core-runtime      runtime command, scheduling, execution contracts
logicn-core-security     authority, capabilities, effects, policy
logicn-core-memory       memory-safe values, bounds, ownership/lifetime model
```

Memory safety is a language/runtime contract — not an optional plugin.
`logicn-core-memory` is required by the compiler/runtime.

### Optional but Official Packages

```text
logicn-core-worker       workers, queues, bounded parallelism, crash boundaries
logicn-core-network      typed network/API policy
logicn-core-compute      compute planning, capabilities, budgets, target selection
logicn-ai                generic AI inference contracts
logicn-data              data processing, streaming, memory-bounded contracts
```

Workers are separate because they are operational runtime infrastructure:
queues, bounded parallelism, crash boundaries, scheduling and reporting.

## Naming Rule

Use family prefixes that make the runtime, developer-tooling or domain role
visible from the directory name:

```text
logicn-core-*         language and runtime core
logicn-ai-*           AI compute and inference
logicn-target-*       compile target backends (cpu, wasm, gpu, etc.)
logicn-framework-*    application kernel, API server
logicn-devtools-*     development-only inspection and tooling
logicn-tools-*        diagnostics and benchmarks
```

## Naming Principle

```text
Core safety guarantees = required core packages.
Execution mechanisms = separate runtime packages.
Optional domains = optional packages.
```

Avoid names like `memory-safe-package`. Use `logicn-core-memory` — it sounds
like part of the runtime contract, not a plugin.

## Core Rule

```text
Do not make memory safety just an optional app package.
Memory safety is part of the language/runtime contract.
```
