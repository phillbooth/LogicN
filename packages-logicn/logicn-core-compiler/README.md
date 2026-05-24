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

## Effect Checker (Planned)

The effect checker is not yet implemented. When implemented it will validate that
functions declare all side effects they perform, that effects propagate through
the call graph correctly, and that compile-time code does not attempt runtime-only
effects.

Effect error codes: LLN-E4001 (undeclared effect), LLN-E4002 (undeclared
propagated effect), LLN-E4003 (forbidden compile-time effect).

See `docs/Knowledge-Bases/effect-checker-and-boundary-checker.md` for the full
specification.

## Boundary Checker (Planned)

The boundary checker is not yet implemented. When implemented it will validate
that code does not cross module/package/trust/runtime boundaries incorrectly.

Boundary error codes: LLN-E4004 (compile-time/runtime boundary violation),
LLN-E4005 (capability boundary violation), LLN-E4006 (package trust boundary
violation).

See `docs/Knowledge-Bases/effect-checker-and-boundary-checker.md` for the full
specification.

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
