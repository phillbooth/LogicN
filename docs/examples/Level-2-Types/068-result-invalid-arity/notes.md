# 068 — Result invalid arity

**Concept:** Result<T, E> requires exactly two type parameters

Result requires both a success type and an error type. Supplying only one type argument is a type arity error.

**AI rule:** Result takes exactly 2 type parameters: the success type and the error type.
