# 459 — Multi protected values

**Concept:** multiple PII types in one flow — all validated as protected and all redacted in audit

When a flow processes several PII fields simultaneously, each must be validated into its own typed `protected` value. The audit log must then redact each independently. This pattern ensures the type checker tracks each PII field separately, preventing accidental leakage of one field through another.

**AI rule:** When a flow handles multiple PII types, validate each into its own `protected` type and redact each separately in the audit entry.
