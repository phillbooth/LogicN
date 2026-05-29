# 155 — Validate PatientId

**Concept:** Validating unsafe patientId to protected PatientId

alidate.patientId(rawPatientId)? validates the patient identifier string. On success it returns a protected PatientId that can be safely stored.

**AI rule:** PatientId values come from alidate.patientId().
