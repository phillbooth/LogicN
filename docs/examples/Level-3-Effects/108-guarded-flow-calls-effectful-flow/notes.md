# 108 — Guarded flow calls effectful flow

**Concept:** guarded flow can call an effectful flow when it declares the same effects

By declaring 
etwork.outbound, uildPriceQuote is permitted to call etchRate which also requires 
etwork.outbound. Effect propagation is explicit and verified by the compiler.

**AI rule:** A guarded flow may call effectful flows provided it declares all required effects.
