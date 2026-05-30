# 470 — Healthcare patient search with complete contract

Demonstrates all major contract sections for an NHS/healthcare context:

Privacy requirements:
  - privacy.contains PII — marks flow as processing personal data
  - privacy.retention 7 years — NHS data retention requirement
  - privacy.deny protected NhsNumber to response — NHS numbers never leave the API
  - observability.deny query content in logs — search terms (which may contain patient names/NHSnumbers) never logged

Security requirements:
  - errors.audit { Unauthorised, Forbidden, Internal } — all access control events audited
  - errors.redact { ApiError.Internal } — stack traces/internals never returned
  - audit.require signed attestation — audit chain integrity

Observability principle:
  observability sees execution metrics (latency, result count)
  observability does NOT see patient data (query content, names, NHS numbers)

Contract.response.exposes declares only de-identified fields: patientId, name, matchScore
Contract.response.denies blocks: email, nhsNumber, dateOfBirth, address, phoneNumber
