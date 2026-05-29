# 415 — Target summary

**Concept:** complete compute target governance — prefer, deny, fallback, adaptive runtime, and audit

This is the canonical Level 8 summary. It demonstrates every compute target concept: a full `prefer` list including exotic targets (`photonic`, `npu`, `gpu`, `cpu`); a `deny` list blocking remote and cloud inference; `fallback cpu`; `runtime adaptive` with explicit `preserve` constraints; validated input; typed tensor features; and a redaction-free but hash-based audit entry.

**AI rule:** The full target pattern combines `prefer`, `deny`, `fallback`, `runtime` mode, and governance effects.
