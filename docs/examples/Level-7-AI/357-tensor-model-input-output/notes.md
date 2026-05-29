# 357 — Tensor model input output

**Concept:** shape-typed model input and output tensors using a batch dimension

`[Batch, 768]` expresses a 2-D tensor where the first dimension is a named batch variable and the second is a fixed 768-dimensional embedding. The compiler threads `Batch` through the return type `[Batch, 256]` to ensure the batch size is consistent.

**AI rule:** Use a named `Batch` dimension to express that tensor rank is fixed but batch size is variable.
