# 107 — Pure flow calls effectful flow (invalid)

**Concept:** pure flow cannot call an effectful flow

etchRate declares 
etwork.outbound. A pure flow cannot call it because doing so would introduce a side effect. If network access is needed, the caller must be a guarded or secure flow.

**AI rule:** A pure flow cannot call any flow that declares effects.
