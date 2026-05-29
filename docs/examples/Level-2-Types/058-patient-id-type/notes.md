# 058 — PatientId type

**Concept:** protected PatientId domain type

PatientId is a protected domain type. External strings must be validated via alidate.patientId(...) before assignment. The ? propagates validation failure.

**AI rule:** PatientId values come from alidate.patientId().
