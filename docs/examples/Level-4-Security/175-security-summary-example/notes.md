# 175 — Security summary example

**Concept:** Comprehensive security example showing all patterns

This example demonstrates the complete set of Level 4 security patterns:
- Trust boundaries (unsafe let) for HTTP, Env
- Validation gates (alidate.email, alidate.nhsNumber, alidate.patientId)
- Protected types stored safely in database
- Protected value sent to approved service
- Redaction before audit logging
- All required effects declared

**AI rule:** Full security pattern: trust boundaries, validation gates, protected types, redaction, safe sinks.
