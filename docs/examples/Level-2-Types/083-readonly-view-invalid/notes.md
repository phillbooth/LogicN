# 083 — ReadOnlyView invalid arity

**Concept:** ReadOnlyView requires exactly one type parameter

ReadOnlyView accepts only one type argument. Supplying a second type argument is a type arity error.

**AI rule:** ReadOnlyView takes exactly 1 type parameter.
