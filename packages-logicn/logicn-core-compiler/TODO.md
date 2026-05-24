# LogicN Compiler TODO

V1 freeze rule: the compiler package should prioritise the parser, AST,
diagnostics and checker pipeline for the frozen core syntax subset before
adding post-v1 targets or domain package syntax.

```text
[x] Create /packages-logicn/logicn-core-compiler
[x] Add README.md
[x] Add TODO.md
[x] Add package metadata
[x] Add initial typed exports
[x] Define compiler input contract
[ ] Define lexer contract
[ ] Define parser contract
[ ] Define AST contract
[ ] Define symbol table contract
[x] Define initial core syntax safety checker contract
[ ] Define full checker pipeline contract
[ ] Define IR contract
[ ] Define IR handoff requirements for VM, WASM, native and Node-hosted runtime
  paths
[ ] Define target handoff contract
[ ] Define diagnostic format
[ ] Define source-map contract
[ ] Define compiler report output
[ ] Define effect checker contract (what effects each function performs)
[ ] Implement effect declaration validation (LLN-E4001, LLN-E4002)
[ ] Implement compile-time effect restrictions (LLN-E4003)
[ ] Define boundary checker contract (module/package/trust/runtime boundaries)
[ ] Implement visibility boundary enforcement (LLN-E3004)
[ ] Implement compile-time/runtime boundary enforcement (LLN-E4004)
[ ] Implement package trust boundary enforcement (LLN-E4006)
[ ] Parse at least 20 v1 .lln examples
[ ] Reject post-v1 syntax with clear diagnostics
[ ] Add examples
[x] Add initial syntax safety tests
```
