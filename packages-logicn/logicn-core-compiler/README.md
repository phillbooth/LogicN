# LogicN Compiler

`logicn-core-compiler` is the future compiler package for LogicN parser, checker, IR,
diagnostics and report generation.

It belongs in:

```text
/packages-logicn/logicn-core-compiler
```

Use this package for:

```text
lexer
parser
AST
symbol table
type checker
effect checker
security checker integration
memory checker
IR generation
optimiser
linker
diagnostics
compiler reports
source maps
AI context output
```

## Early Safety Scan

The current package includes a conservative compiler-facing syntax safety scan
for the v1 core subset. It is not a replacement for the future parser, but it
blocks several high-risk patterns while the parser and checker pipeline are
being built:

```text
Tri used directly as an if condition
Tri assigned directly to Bool or Decision
Decision assigned directly to Tri
non-exhaustive Tri matches
unknown_as: true inside secure flow
raw secret-like string literals
unsafe dynamic code execution calls
```

The scan is intentionally fail-safe. It emits diagnostics for suspicious source
instead of trying to infer intent from ambiguous syntax.

## Compiler Pass Pipeline

Recommended 13-pass pipeline:

```text
 1. Lexer
 2. Parser
 3. AST builder
 4. Type checker
 5. Visibility checker
 6. Effect checker
 7. Boundary checker
 8. Capability resolver
 9. Package graph validator
10. Runtime graph generator
11. Optimisation planner
12. Backend emitter
13. Audit metadata emitter
```

## Effect Checker (Planned)

The effect checker is not yet implemented. When implemented it will validate that
functions declare all side effects they perform, that effects propagate through
the call graph correctly, and that compile-time code does not attempt runtime-only
effects.

Effect error codes: `LN-EFFECT-001` (undeclared effect), `LLN-E4001` (undeclared
effect), `LLN-E4002` (undeclared propagated effect), `LLN-E4003` (forbidden
compile-time effect).

Effect error codes: `LN-EFFECT-001` through `LN-EFFECT-005`, `LLN-E4001`
through `LLN-E4003`.

See `docs/Knowledge-Bases/effect-checker-and-boundary-checker.md` for the full
specification including the 12-effect table, algorithm, and checker output schema.

## Boundary Checker (Planned)

The boundary checker is not yet implemented. When implemented it will validate
that code does not cross module/package/trust/runtime boundaries incorrectly.
It includes visibility checking, capability boundary checking, secret leakage
prevention, and filesystem/network path allowlists.

Seven boundary types: module visibility, package contract, compile-time/runtime,
secret/data, filesystem, network/API, and capability.

Boundary error codes: `LN-BOUNDARY-001` through `LN-BOUNDARY-009`,
`LLN-E4004` through `LLN-E4006`.

See `docs/Knowledge-Bases/effect-checker-and-boundary-checker.md` for the
full 16-item implementation checklist and all boundary violation examples.

## Boundary

`logicn-core` owns language documentation, grammar contracts and core safety rules.
`logicn-core-compiler` should own the implementation-oriented compiler pipeline.

Target-specific output belongs in target packages such as `logicn-target-native`,
`logicn-target-wasm`, `logicn-target-gpu` and `logicn-target-photonic`.

Final rule:

```text
logicn-core defines the language contract.
logicn-core-compiler implements compiler pipeline contracts.
target packages own target-specific output.
```
