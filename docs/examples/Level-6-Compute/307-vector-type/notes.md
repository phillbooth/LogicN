# 307 — Vector type

**Concept:** fixed-length vector type for embeddings

`Vector<Float32, 768>` is a one-dimensional, fixed-length numeric array. It is the natural type for dense embedding outputs from language models. Unlike `Tensor`, it does not carry a rank dimension — the length is encoded as a single integer parameter.

**AI rule:** Use `Vector<T, N>` for fixed-length one-dimensional arrays, such as embedding outputs.
