# 304 — Tensor basic

**Concept:** tensor shape encoded in the type signature

`Tensor<Float32, [4, 8]>` carries both element type and static shape. The compiler verifies that matrix multiplication dimensions are compatible — the inner dimension of `a` must match the outer dimension of `b`.

**AI rule:** Encode tensor rank and dimensions as static type parameters so shape mismatches are caught at compile time.
