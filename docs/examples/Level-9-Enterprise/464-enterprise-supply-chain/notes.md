# 464 — Enterprise supply chain

**Concept:** flow requiring a module capability that has not been accepted in the supply-chain manifest

LogicN tracks external module capabilities in a supply-chain manifest. When a flow uses a module that requires a capability not listed in the manifest, the compiler raises `LLN-MODULE-005`. This prevents silent introduction of new data-exfiltration capabilities via third-party dependencies.

**AI rule:** All external module capabilities must be listed and accepted in the supply-chain manifest before use.
