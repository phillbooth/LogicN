# 467 — protected value in response body

Returning protected values (PII) in API responses requires an explicit policy block. Use redact() or add policy { allow protected Email to response reason "..." }.
