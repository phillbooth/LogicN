# 215 — contract set

A contract set defines a reusable governance template. 'use NhsPatientData' applies it to a flow. Key rule: contract sets may REQUIRE behaviour (audit.write, validation) but cannot silently grant authority or add effects. The flow must still declare effects explicitly.
