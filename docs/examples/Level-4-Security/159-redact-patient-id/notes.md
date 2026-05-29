# 159 — Redact PatientId

**Concept:** edact() converts protected PatientId to edacted PatientId

Same pattern as email redaction. edact(patientId) produces a edacted PatientId safe for audit sinks.

**AI rule:** Use edact() to safely prepare protected PatientId for audit logs.
