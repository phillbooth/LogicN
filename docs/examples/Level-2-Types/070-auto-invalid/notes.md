# 070 — Auto without initializer

**Concept:** Auto requires an initializer

Auto needs an initializer expression to infer the type. A bare let count: Auto with no value gives the compiler nothing to infer from.

**AI rule:** Auto cannot infer a type without an initializer. Provide an initial value.
