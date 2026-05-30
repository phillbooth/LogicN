# 023 — Readable Logic Forms

Readable forms are aliases — they produce the same AST as traditional operators.

| Readable | Canonical |
|---|---|
| `a and b` | `a && b` |
| `a or b` | `a \|\| b` |
| `unless COND {}` | `if !COND {}` |
| `a is b` | `a == b` |
| `a is not b` | `a != b` |
| `a is greater than b` | `a > b` |
| `a is less than or equal to b` | `a <= b` |

The `readableForm` field on AST nodes preserves the original phrase for IDE/formatter display.
