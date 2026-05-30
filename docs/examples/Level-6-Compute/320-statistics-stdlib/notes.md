# 320 — Statistics with stdlib

**Concept:** Pure statistical computation using Array.reduce and Array.map

There is no dedicated Statistics module yet. This example shows how to compose
the built-in Array operations to compute common statistical quantities.

## Patterns

### Array.reduce

```
values.reduce(initialValue, combiner)
```

Folds an array into a single value. The combiner `fn` receives an accumulator
and the current element. Use a local `fn` declaration to keep the combiner
readable and typed.

### Array.map

```
values.map(v => expression)
```

Returns a new array where each element has been transformed. Arrow lambdas
keep the transform inline when it fits on one line.

### Composing statistics

| Flow | Pattern |
|------|---------|
| `sum` | reduce with `+` |
| `mean` | sum / count |
| `scale` | map with `*` |
| `squaredDeviations` | map with `(v - mu) * (v - mu)` |

Variance = mean of squared deviations. Standard deviation = sqrt of variance.
These final steps are left to caller composition once a `Decimal.sqrt` is available.

## Why pure flows

Statistical helpers have no effects — no I/O, no network, no database.
Declaring them `pure` lets the compiler enforce that and enables
compute-target optimisation when used inside a governed flow.

**AI rule:** Use Array.reduce to fold a collection into a single value. Array.map transforms each element.
