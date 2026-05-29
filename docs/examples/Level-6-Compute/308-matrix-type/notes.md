# 308 — Matrix type

**Concept:** matrix type for weight tensors

`Matrix<Float32, 4, 4>` is a two-dimensional numeric type with statically known row and column counts. The compiler can verify dimension compatibility for operations like matrix-vector multiplication.

**AI rule:** Use `Matrix<T, Rows, Cols>` for two-dimensional numeric tables such as weight matrices.
