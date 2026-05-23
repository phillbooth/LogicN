# Package Layout

## Purpose

This document describes the proposed split between normal app/vendor packages
and reusable LogicN packages.

The current beta workspace has moved LogicN packages under `packages-logicn/`. The
`packages/` directory is reserved for normal app/vendor package space.

## Proposed App Layout

```text
my-logicn-app/
|-- package.json
|-- package-logicn.json
|-- logicn.lock.json
|-- boot.lln
|-- main.lln
|-- packages/
|   `-- normal app/vendor packages
`-- packages-logicn/
    |-- .git
    |-- logicn-core/
    |-- logicn-core-compiler/
    |-- logicn-core-runtime/
    |-- logicn-core-security/
    `-- logicn-framework-example-app/
```

## Package Responsibilities

`package.json` remains the host ecosystem manifest. In a Node-hosted app, it
should describe normal npm dependencies, scripts and app tooling.

It must not become the LogicN package graph. Do not put LogicN package selection,
profiles, target selection, production package overrides or LogicN lock metadata in
`package.json`. Those fields belong in `package-logicn.json`, `logicn.lock.json` or
LogicN runtime/config files once their schemas exist.

Allowed `package.json` responsibilities during the beta:

```text
host scripts
JavaScript/TypeScript prototype tooling
normal npm dependencies for host adapters
test runners for the current JS-hosted scaffolds
generated JavaScript/TypeScript interop packaging
```

Disallowed `package.json` responsibilities:

```text
LogicN package graph resolution
LogicN runtime profile selection
LogicN production package overrides
LogicN compiler target policy
LogicN lockfile metadata
```

`package-logicn.json` should become the LogicN package manifest. It should describe LogicN
language, runtime, compiler, security and app-kernel dependencies. It should
support explicit profiles such as:

```text
runtime
development
staging
low_latency
benchmark
```

Finance, electrical and OT profiles are archived post-v2 planning and must not
be active v1 package profiles.

`logicn.lock.json` should lock LogicN package versions, source refs, checksums, selected
profiles and dependency graph metadata. It should be deterministic and safe to
commit when it contains no secrets.

When packages come from a Certified Package Registry, the lockfile should also
record publisher, source registry, signature, capabilities, effects,
certification level, selected profile and approved runtime targets.

`packages/` should be for normal app/vendor packages used by the host
ecosystem.

`packages-logicn/` is for LogicN packages. It may later be a Git submodule or
standalone nested repository, but that must be intentional. In this beta repo it
also contains `logicn-framework-example-app/`, a clearly named example/template app package.

## Production Resolution Rule

Production installs must not fetch every LogicN package by default.

The resolver should install only packages required by the selected profile:

```text
runtime       minimal runtime/compiler/app-kernel requirements
development   graph, diagnostics, generators and test helpers
benchmark     benchmark packages, never implicit in production
```

Project-type installer presets are defined in `docs/PROFILE_INSTALLERS.md`.
Those presets may provide friendly commands for web apps, servers, agents and
systems services, but they must all use the same LogicN package resolver,
profile checker and lockfile rules.

The LogicN package resolver is governed, not an autoloader. Imports and package
references do not create trust. The resolver must verify package identity,
version, lockfile, hash/signature, registry, capabilities, effects, licence,
trusted status, dependency graph and conflicts before a package is linked into
Governed IR.

The Certified Package Registry sits before the resolver. It verifies, signs,
versions, capability-declares and policy-rates packages before projects lock and
resolve them. Certified does not mean unrestricted; project permissions still
decide what an installed package may do.

Development and staging packages should be excluded unless explicitly selected.

Production boot/profile defaults must disable development-only and benchmark
packages. This is a rule, not only a resolver optimisation.

Default-disabled production package families include:

```text
logicn-tools-benchmark
logicn-devtools-*
```

If a production build includes a default-disabled package, `boot.lln` or
`package-logicn.json` must declare an explicit production package override with a
reason, and preferably an expiry. The override must be reported. Without the
override, startup/build validation must fail.

Example object-shaped policy:

```json
{
  "production": {
    "packageOverrides": [
      {
        "path": "packages-logicn/logicn-tools-benchmark",
        "reason": "One-off production hardware validation before launch.",
        "expires": "2026-06-01"
      }
    ]
  }
}
```

## Migration Rule

Do not add root `package-logicn.json` or `logicn.lock.json` as decorative files. Add
them only when their schemas and resolver behaviour are documented and tested.

Current beta work may add new experimental LogicN packages under `packages-logicn/` as
long as documentation states their status clearly.
