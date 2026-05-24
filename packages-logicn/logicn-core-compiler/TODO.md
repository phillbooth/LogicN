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
[ ] Implement effect declaration validation (LN-EFFECT-001, LLN-E4001)
[ ] Implement effect propagation validation (LN-EFFECT-002, LLN-E4002)
[ ] Implement compile-time effect restrictions (LN-EFFECT-003, LLN-E4003)
[ ] Define boundary checker contract (module/package/trust/runtime boundaries)
[ ] Implement module visibility boundary enforcement (LN-BOUNDARY-004, LLN-E3004)
[ ] Implement package contract boundary enforcement (LN-BOUNDARY-002)
[ ] Implement compile-time/runtime boundary enforcement (LN-BOUNDARY-003, LLN-E4004)
[ ] Implement package trust boundary enforcement (LN-BOUNDARY-005, LLN-E4006)
[ ] Implement secret/data leakage boundary detection (LN-BOUNDARY-006)
[ ] Implement network boundary checks — host allowlist (LN-BOUNDARY-008)
[ ] Implement filesystem boundary checks — path allowlist (LN-BOUNDARY-009)
[ ] Implement capability boundary enforcement (LN-BOUNDARY-007, LLN-E4005)
[ ] Add effect checker diagnostics with suggested fixes
[ ] Add boundary checker diagnostics with suggested fixes
[ ] Generate runtime manifest including effect and boundary metadata (pass 14)
[ ] Implement manifest builder — aggregate compiler metadata into runtime-manifest.json
[ ] Define RuntimeManifest TypeScript type (module/effects/capabilities/targets/trustLevel/auditRequired)
[ ] Implement manifest hash generation (LN-MANIFEST-002)
[ ] Implement manifest schema validation (LN-MANIFEST-001, LN-MANIFEST-003)
[ ] Implement capability reference validation in manifest (LN-MANIFEST-004)
[ ] Implement runtime target validation in manifest (LN-MANIFEST-005)
[ ] Create manifests/ dir structure: manifest-builder.ts, manifest-schema.ts, manifest-hash.ts, manifest-serializer.ts, manifest-validator.ts
[ ] Parse at least 20 v1 .lln examples
[ ] Reject post-v1 syntax with clear diagnostics
[ ] Add examples
[x] Add initial syntax safety tests
```
