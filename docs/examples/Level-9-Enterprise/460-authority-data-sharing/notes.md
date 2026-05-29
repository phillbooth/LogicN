# 460 — Authority data sharing

**Concept:** authority block authorises sharing protected PatientData with an external service

The `authority` block is a governance declaration that explicitly grants permission for a `protected` type to cross a trust boundary — in this case, sharing `PatientData` with `SpecialistService`. It records the purpose and sets an expiry on the grant, satisfying data-sharing agreement requirements.

**AI rule:** Use an `authority` block to explicitly grant permission for `protected` data to cross a trust boundary.
