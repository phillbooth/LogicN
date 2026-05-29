# 065 — Option invalid arity

**Concept:** Option<T> requires exactly one type parameter

Option accepts exactly one type argument. Supplying two type arguments (e.g., Option<User, Error>) is a type arity error. Use Result<User, Error> when you need a typed error.

**AI rule:** Option takes exactly 1 type parameter.
