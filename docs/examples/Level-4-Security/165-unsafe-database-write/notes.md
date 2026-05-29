# 165 — Unsafe database write

**Concept:** unsafe value cannot be written to a database sink

awEmail has not been validated. Writing it directly to PatientsDB.insert is a security error. Validation must occur before any sink.

**AI rule:** Unsafe values cannot be passed to database sinks. Validate first.
