# Language Core Maturity Roadmap

LogicN already has a strong direction:

```text
strict typing
explicit Option and Result
memory-safety goals
API contracts
typed JSON decoding
security policies
compute planning
source maps
reports
AI-readable project context
CPU-compatible execution baseline
```

LogicN is still a language-design and v0.1 prototype project. Planning
documents, simulation reports and prototype checker slices must not be presented
as a production compiler.

## Maturity Baseline

The core language needs enforceable compiler and runtime behavior:

```text
parser
AST
symbol table
type checker
memory checker
effect checker
permission checker
module system
protocol/interface system
trusted interop boundary
test model
standard library
source-mapped runtime errors
build and release modes
package manager
secure web runtime
```

## Required Compiler Work

| Area | LogicN needs |
|---|---|
| Parser | A real parser for the v1 syntax subset. |
| AST | Stable nodes for flows, types, routes, effects, policies and map blocks (pattern matching). |
| Symbols | Module, package, flow, type and visibility resolution. |
| Types | Strict checking for scalar, record, enum, option, result and collection types. |
| Effects | Compile-time effect declarations and permission decisions. |
| Memory | Ownership modes, read-only views, explicit clone, resource scopes and reports. |
| map (Pattern Matching) | Exhaustive handling for Result, Option, enums, Tri and Decision. |
| JSON | Typed decode/encode generation with unknown-field policy. |
| Runtime | Checked secure runtime for APIs, webhooks, queues and workers. |
| Reports | Security, memory, API, package, target and AI-safe reports. |

## Required Runtime Work

The first runtime should support secure web applications without native executable
compilation.

Required runtime capabilities:

```text
load checked project manifests
serve route manifests
apply request body limits
decode typed JSON
enforce route policy
enforce effects and permissions
redact secrets
run secure flows
emit typed responses
write source-mapped reports
cache typed IR
separate development and production profiles
```

## Standard Library Baseline

Start small:

```text
print
log
File
Path
Stream
Json
Http
Env
DateTime
Result
Option
Array
Map
Set
Pattern
Crypto
Test
Secret
SecureRandom
```

Keep framework features, ORMs, admin UI, CMS behavior and frontend framework
syntax outside the standard library.

## Priority Order

1. Freeze v1 syntax and examples.
2. Build parser, AST and symbol table.
3. Implement type, effect and permission checks.
4. Implement Result, Option, Tri, Decision and exhaustive map semantics.
5. Define memory model: ownership, readonly views, clone and resource scopes.
6. Build secure web runtime slice.
7. Generate typed JSON codecs and route manifests.
8. Add source-mapped runtime errors.
9. Add LogicN test syntax and test reports.
10. Define package lockfile, permissions and trusted interop boundaries.
11. Add structured await, streams, cancellation and backpressure.
12. Add debug, profile and lint tooling.

## Required Positioning

Use this wording:

```text
LogicN is not yet a production compiler.
LogicN has prototype tooling and planning documents.
LogicN must implement the parser, checker, memory model, effect model, module
system, protocols, trusted interop boundary, tests, standard library and secure
runtime before production maturity claims.
```

## Outcome

```text
LogicN becomes credible when its safety, speed and AI-readability are enforced
by tooling and runtime behavior, not only described in documentation.
```
