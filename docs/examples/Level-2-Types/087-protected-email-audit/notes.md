# 087 — Protected Email audit pattern

**Concept:** Full protected -> edacted -> audit pattern

This is the canonical safe audit pattern: a protected Email is explicitly redacted before being written to the audit log. The AuditLog.write sink accepts edacted values, not raw protected values.

**AI rule:** Redact protected values before writing to audit sinks.
