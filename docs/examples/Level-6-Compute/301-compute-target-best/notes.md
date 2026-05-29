# 301 — Compute target best

**Concept:** compute target selection with ordered preference and fallback

`compute target best` instructs the runtime to select the best available hardware from the preference list at dispatch time. The `fallback cpu` clause guarantees execution even when no preferred accelerator is present.

**AI rule:** Use `prefer [...]` to express hardware preference; always declare `fallback cpu` as the final safety net.
