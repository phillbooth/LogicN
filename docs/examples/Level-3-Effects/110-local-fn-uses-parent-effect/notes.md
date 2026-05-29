# 110 — Local fn uses parent effect

**Concept:** Local n may use effects declared by the containing flow

A local n inherits the effect context of its containing flow. Since syncOrders declares [network.outbound, database.write], the local etchRate fn may call http.get without a separate effect declaration.

**AI rule:** Local n may use effects only when the containing flow declares them.
