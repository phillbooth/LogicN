# 115 — Effect propagation through call

**Concept:** Effect propagation through a flow call chain

processOrder calls saveOrder, which requires database.write. Because processOrder also declares database.write, the call is permitted. Effect declarations must propagate up the call chain.

**AI rule:** A flow calling another flow must declare all effects required by the callee.
