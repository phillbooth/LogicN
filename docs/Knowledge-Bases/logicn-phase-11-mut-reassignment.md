# LogicN Phase 11A.2 — mut Reassignment Enforcement

## Status

```
Phase:     11A.2 — Implemented
Scope:     mut reassignment enforcement in flow bodies
Diagnostic: LLN-BINDING-005 (IMMUTABLE_BINDING_REASSIGNED)
Checker:   packages-logicn/logicn-core-compiler/src/type-checker.ts
See also:  logicn-phase-11-decisions.md (Decision 2), value-state-annotations.md,
           logicn-naming-conventions.md (let vs mut guidance),
           controlled-mutation-model.md
```

## TL;DR

- `let` and `readonly` bindings are immutable — reassignment is a compile error
- `mut` bindings are mutable — reassignment is allowed
- `mut` bindings are type-stable — the type cannot change on reassignment (Phase 11A.3)

---

## Rules

```logicn
let count: Int = 0
count = 5              // LLN-BINDING-005: Cannot reassign immutable let binding

mut total: Int = 0
total = total + 1      // OK — mut allows reassignment

readonly request: Request
request = otherRequest // LLN-BINDING-005: Cannot reassign readonly binding
```

---

## Diagnostic: LLN-BINDING-005

```text
Code:     LLN-BINDING-005
Name:     IMMUTABLE_BINDING_REASSIGNED
Severity: error

Cannot reassign an immutable 'let' or 'readonly' binding.
Use 'mut' if reassignment is intended.
```

**Suggested fix:**
Change the declaration to: `mut bindingName: Type = initialValue`

---

## Relationship to Other BINDING Diagnostics

| Code | Name | Description |
|---|---|---|
| LLN-BINDING-001 | BindingReassignment | let/readonly reassigned (validateCoreSyntaxSafety) |
| LLN-BINDING-002 | ReadonlyMutation | readonly reassigned |
| LLN-BINDING-003 | ReadonlyPropertyMutation | property mutation via readonly ref |
| LLN-BINDING-004 | MutInPureContext | mut binding in pure flow |
| **LLN-BINDING-005** | **ImmutableBindingReassigned** | **let/readonly = value in flow body** |

---

## Why mut is Type-Stable

```logicn
mut count: Int = 0
count = "five"         // LLN-TYPE-002: cannot change Int to String (Phase 11A.3)
```

`mut` allows value changes, not type changes. The binding type is fixed at declaration.

---

## See Also

- `logicn-phase-11-decisions.md` — Decision 2 (mut reassignment)
- `value-state-annotations.md` — unsafe/safe/validated state
- `logicn-naming-conventions.md` — when to use let vs mut
