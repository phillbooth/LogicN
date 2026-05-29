# 204 — Remote execution denied

**Concept:** compute target with emote.execution denied

The compute target block specifies preferred compute hardware and denies remote execution. Sensitive models processing patient or financial data should never be dispatched remotely unless explicitly authorised.

**AI rule:** Use deny [remote.execution] to prevent a flow from being dispatched to a remote compute target.
