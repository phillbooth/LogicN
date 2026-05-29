# 407 — Target best prefer

**Concept:** compute target best with ordered preference list and fallback

`compute target best` evaluates the `prefer` list at runtime and selects the first available device. If none are available, `fallback cpu` ensures execution continues. This is the recommended target for most production AI flows.

**AI rule:** `best` selects the best available target at runtime from the preference list in order.
