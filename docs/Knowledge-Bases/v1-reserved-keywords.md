# LogicN — V1 Reserved Keyword Table

## Purpose

This document is the authoritative source for keyword reservation in the LogicN
v1 language. The Phase 4 lexer must consume this table directly. No keyword may
be used as an identifier unless it appears in the "legal identifier" category.

Rule:

> Reserved keywords must be declared here before Phase 4 lexer implementation
> begins. The memory-model commitment (Phase 3) determines which memory keywords
> must be reserved before grammar is finalised.

---

## V1 Active Keywords

These keywords are active in the v1 grammar. The lexer must classify them as
`keyword` tokens; they cannot appear as identifiers.

| Keyword | AstNodeKind(s) | Description |
|---|---|---|
| `flow` | `flowDecl` | Flow declaration |
| `secure` | modifier on `secureFlowDecl` | Secure flow safety level |
| `pure` | modifier on `pureFlowDecl` | Pure flow (no effects) |
| `guarded` | modifier on `guardedFlowDecl` | Guarded flow with declared effects |
| `privileged` | modifier on `privilegedFlowDecl` | Privileged flow requiring capability |
| `unsafe` | modifier on `unsafeFlowDecl`, `unsafeBlock` | Unsafe code — requires reason + fallback |
| `experimental` | modifier on `experimentalFlowDecl` | Non-production / feature-flagged code |
| `let` | `letDecl` | Immutable binding |
| `mut` | `mutDecl` | Mutable binding — explicit reassignment visible |
| `readonly` | `readonlyDecl` | Read-only view of a value |
| `match` | `matchExpr` | Exhaustive pattern match |
| `if` | `ifStmt` | Conditional statement |
| `else` | part of `ifStmt` | Else branch |
| `return` | `returnStmt` | Return from flow |
| `type` | `typeDecl` | Type declaration |
| `enum` | `enumDecl` | Enum declaration |
| `import` | `importDecl` | Module import |
| `use` | `useDecl` | Capability or module use declaration |
| `true` | `boolLiteral` | Boolean literal |
| `false` | `boolLiteral` | Boolean literal |

---

## V1 Value-State Keywords (Phase 4)

These words annotate the trust state of a value. They appear after the type in a
binding declaration and cannot be used as identifiers.

```logicn
let rawInput: String unsafe unvalidated = form.email
let email:    Email  safe   validated   = validate.email(rawInput)?
```

| Keyword | Role | Description |
|---|---|---|
| `safe` | Value-state annotation | Value has been validated or produced by a safe source |
| `unvalidated` | Value-state qualifier | Value has not yet been validated; paired with `unsafe` |
| `validated` | Value-state qualifier | Value has passed an explicit validation step; paired with `safe` |

> `unsafe` as a value-state annotation reuses the existing `unsafe` keyword.
> `safe`, `unvalidated`, and `validated` are new additions in Phase 4.

---

## V1 Memory Keywords (Phase 3–4)

These keywords are reserved as of Phase 3. They must be lexed as `keyword`
tokens even before Phase 4 parser rules fully support them. This prevents user
code from using them as identifiers.

| Keyword | AstNodeKind | Phase active | Description |
|---|---|---|---|
| `borrow` | `borrowExpr`, `borrowMutExpr` | Phase 4 | Immutable or mutable temporary access |
| `move` | `moveExpr` | Phase 4 | Explicit ownership transfer; source invalidated |
| `pinned` | `pinnedDecl` | Phase 4 | Memory locked for DMA / accelerator transfer |

---

## V1 Safety Keywords

| Keyword | Role | Description |
|---|---|---|
| `unsafe` | Flow modifier + block kind | Requires declared reason and safe fallback |
| `block` | Part of `unsafe block` | Scoped unsafe region |
| `fallback` | `fallbackDecl` | Required on unsafe blocks |
| `reason` | Part of unsafe block header | Required human-readable justification |

---

## Future-Reserved Keywords (Post-V1)

These words are reserved to prevent future grammar conflicts. The lexer should
either reject them as reserved-but-not-active identifiers or produce a
`LLN-SYNTAX-003` diagnostic with a "reserved for future use" message.

| Keyword | Intended future use |
|---|---|
| `shared` | Shared memory allocation across compute targets |
| `transfer` | Explicit ownership transfer across memory domains |
| `remote` | Remote borrow across distributed nodes |
| `atomic` | Atomic memory operation |
| `barrier` | Synchronisation barrier |
| `async` | Async flow (currently via structured await syntax) |
| `await` | Async expression (reserved even if syntax differs) |
| `yield` | Generator / stream yield |
| `comptime` | Compile-time evaluation |
| `macro` | Macro definition (if adopted) |
| `trait` | Trait / protocol (planned for post-v1 type system) |
| `impl` | Trait implementation |
| `where` | Generic constraint clause |
| `for` | Iteration (if loop syntax is adopted) |
| `while` | Loop (if adopted) |
| `loop` | Unconditional loop (if adopted) |
| `break` | Loop exit |
| `continue` | Loop iteration skip |

---

## Diagnostic Codes

| Code | Meaning |
|---|---|
| `LLN-SYNTAX-001` | `var` used — not a valid LogicN keyword |
| `LLN-SYNTAX-002` | `const` used — not a valid LogicN keyword |
| `LLN-SYNTAX-003` | Future-reserved keyword used as identifier |
| `LLN-SYNTAX-004` | Active keyword used as identifier |

---

## Lexer Rule

```text
For each token:
  1. Check active keyword list → emit TokenKind.keyword
  2. Check memory keyword list → emit TokenKind.keyword (even if parser rule is pending)
  3. Check future-reserved list → emit LLN-SYNTAX-003 warning
  4. Otherwise → emit TokenKind.identifier
```

The Phase 4 lexer must import this table as a constant set, not derive keywords
from regex scanner patterns.

---

## Architecture Placement

| Layer | Responsibility |
|---|---|
| `logicn-core/src/index.ts` | `AstNodeKind` — the AST vocabulary these keywords parse into |
| `logicn-core-compiler` | Lexer keyword table (Phase 4); scanner rejection of `var`/`const` (Phase 3 active) |
| `docs/Knowledge-Bases/v1-reserved-keywords.md` | **This file — authoritative source** |
