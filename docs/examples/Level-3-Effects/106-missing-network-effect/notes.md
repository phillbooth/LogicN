# 106 — Missing network.outbound effect

**Concept:** Undeclared 
etwork.outbound effect

http.get is a 
etwork.outbound operation. With an empty effects list, the compiler rejects the flow because the required effect is not declared.

**AI rule:** http.get and similar calls require 
etwork.outbound to be declared.
