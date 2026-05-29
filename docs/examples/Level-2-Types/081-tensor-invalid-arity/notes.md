# 081 — Tensor invalid arity

**Concept:** Tensor requires exactly two type parameters

Tensor requires both an element dtype and a shape. Supplying only the element type is a type arity error.

**AI rule:** Tensor<Dtype, Shape> requires both element type and shape parameters.
