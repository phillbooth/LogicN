# 080 — Tensor dynamic shape

**Concept:** Tensor<Dtype, DynamicShape>

DynamicShape is used as the second type parameter when tensor dimensions are not known at compile time. The element type is still statically typed.

**AI rule:** Use DynamicShape when tensor dimensions are not known at compile time.
