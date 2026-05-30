# 092 — Boolean logic

**Concept:** Bool, true/false, if/else, and/or/not, comparisons

Bool is the fundamental conditional type. It holds exactly `true` or `false`.

## Operators

| Operator | Meaning |
|----------|---------|
| `&&`     | logical and — both must be true |
| `\|\|`   | logical or — at least one must be true |
| `!`      | logical not — inverts the value |
| `==`     | equality comparison — returns Bool |
| `!=`     | inequality comparison — returns Bool |
| `>`, `<`, `>=`, `<=` | numeric comparisons — return Bool |

## if/else

`if` branches on a Bool expression. The `else` branch is optional for flows that return Unit.
For flows with a return type, both branches must return a compatible value.

## Readable aliases (proposed)

The Proposed-Readable-Logic-Forms directory shows `and`, `or`, and `unless` as human-readable
alternatives. Use `&&`, `||`, and `!` in current stable code.

**AI rule:** Bool values are `true` or `false`. Comparisons always return Bool.
