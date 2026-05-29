# 067 — Result Err

**Concept:** Result<T, E> — Err variant

Err(errorValue) wraps a typed error in Result<T, E>. Callers use match to handle both Ok and Err branches.

**AI rule:** Use Err(errorValue) to represent a typed failure in Result<T, E>.
