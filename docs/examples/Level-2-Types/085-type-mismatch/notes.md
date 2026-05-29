# 085 — Type mismatch

**Concept:** Type mismatch produces LLN-TYPE-002

The initializer "42" is a String literal, but the binding is declared as Int. LogicN does not perform implicit coercions.

**AI rule:** The right-hand side of a binding must match the declared type.
