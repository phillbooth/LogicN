# 462 — Policy purpose

**Concept:** policy block declares the permitted purpose for data use in a communication flow

The `policy` block records the legal basis for processing patient contact data: the `purpose` must match what the template does, `lawfulBasis` documents the GDPR article, and `retentionDays` sets data retention. The compiler checks that the template name used in the flow matches the declared purpose.

**AI rule:** Use a `policy` block with a `purpose` declaration to document and enforce the lawful basis for processing patient contact data.
