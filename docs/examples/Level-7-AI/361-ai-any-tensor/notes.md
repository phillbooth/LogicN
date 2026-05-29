# 361 — AI AnyTensor

**Concept:** AnyTensor for dynamically loaded models with unknown shape

`AnyTensor` is the type-erased tensor type. It is used when a model is loaded from a registry or configuration file at runtime and the shape is not known at compile time. All shape checking is deferred to runtime.

**AI rule:** Use `AnyTensor` only when the tensor shape cannot be known at compile time; prefer typed `Tensor<T, Shape>` everywhere else.
