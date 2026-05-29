# 351 — Embedding flow

**Concept:** basic AI embedding flow returning a typed tensor

The simplest complete AI flow: a `guarded flow` that calls an embedding model and returns the result wrapped in `Ok`. The `ai.inference` effect is declared, and the `?` operator propagates any model error as `AiError`.

**AI rule:** Every flow that calls an embedding model must declare the `ai.inference` effect.
