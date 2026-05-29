# 151 — HTTP request boundary

**Concept:** HTTP request data enters as unsafe

Any value coming from eq.body, eq.query, or eq.headers is external input and must be declared with unsafe let. This marks the trust boundary — data is untrusted until validated.

**AI rule:** Request data starts as unsafe. Always use unsafe let for values from eq.body.
