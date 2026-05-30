# 090 — Result.sequence

Result.sequence takes Array<Result<T,E>> and returns Result<Array<T>, E>. The first Err short-circuits the sequence. Pattern: validate a batch of inputs, collect all Ok values or fail fast on the first invalid one.
