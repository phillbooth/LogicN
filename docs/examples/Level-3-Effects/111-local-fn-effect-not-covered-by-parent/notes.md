# 111 — Local fn effect not covered by parent

**Concept:** Local n cannot use effects not declared by the containing flow

saveOrderOnly declares only database.write. The local fn etchRate calls http.get which requires 
etwork.outbound. Because 
etwork.outbound is not declared by the containing flow, this is an error.

**AI rule:** A local n is bound by the containing flow's effect declarations.
