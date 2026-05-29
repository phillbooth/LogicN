# 057 — Email type

**Concept:** protected Email domain type

Email is a domain-branded type. Raw strings from external sources must be validated through alidate.email(...) before being typed as Email. The ? propagates any validation failure as a Result error.

**AI rule:** Email values come from alidate.email().
