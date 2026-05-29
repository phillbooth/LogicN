# 153 — Environment boundary

**Concept:** Environment variables enter as unsafe

Environment variables are external configuration and must be declared unsafe let. They may contain incorrect, malicious, or misconfigured values.

**AI rule:** Environment values are unsafe. Treat them as untrusted external input.
