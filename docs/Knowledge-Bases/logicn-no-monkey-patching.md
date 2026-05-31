# LogicN — No Monkey Patching

## Status

```
Core Architecture Rule — applies to all phases
No runtime behaviour modification is permitted in LogicN source, runtime, stdlib, packages, or capabilities.
Compiler diagnostics: LLN-SEC-020 (future), LLN-SEC-021 (future)
Alternative patterns: adapters, interfaces, capabilities, mocks, context
```

## The Principle

```
If behaviour changes, the change must exist in source code.
```

Behaviour must be declared, visible, verifiable, and auditable. It must never be silently changed at runtime.

## What Is Prohibited

All of the following are prohibited in LogicN:
- `Runtime.patch(...)`
- `replaceFunction(...)`
- `overrideImportedFunction(...)`
- `modifyPrototype(...)`
- `replaceCapability(...)`
- `replaceRuntimeBehaviour(...)`

## Approved Alternatives

| Prohibited pattern | LogicN alternative |
|---|---|
| `Database.find = customFind` | `adapter SqlRepo implements PatientRepository` |
| `HttpClient.get = myGet` | `adapter SecureHttpClient implements HttpClient` |
| `Database.find = fakeFind` in tests | `mock PatientRepository.find with fakeFind` |
| `process.env.MODE = "test"` | `context { require environment }` |
| Prototype mutation | Explicit type extensions via declared types |

## Why This Matters for Governance

If monkey patching existed:
- Compiler verification could become invalid
- Audit proofs could become invalid
- Execution plans could become invalid
- Runtime reports would be untrustworthy

## Future Diagnostics

```
LLN-SEC-020  RuntimeMutation — runtime modification is prohibited. Use adapters or mocks instead.
LLN-SEC-021  PrototypeMutation — prototype modification is prohibited.
```

## See Also

- `logicn-javascript-escape-hatch.md` — generated JS must not use ambient authority
- `logicn-static-capability-proofs.md` — compile-time capability verification
