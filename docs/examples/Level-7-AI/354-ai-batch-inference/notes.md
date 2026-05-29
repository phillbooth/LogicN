# 354 — AI batch inference

**Concept:** batch AI inference over an array of inputs

`texts.map(t => ClassifierModel.classify(t))?` applies the classifier to every element and propagates the first `AiError` if any call fails. The `ai.inference` effect covers all calls within the map.

**AI rule:** Use `Array.map` with `?` propagation to run batch inference and surface the first error.
