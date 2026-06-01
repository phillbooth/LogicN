# LogicN — Compliance Package Architecture

**Version: 1.0 — 2026-06-01**
**Status: Phase 46+ planned (alongside Governance Marketplace)**

---

## Principle

Compliance frameworks should be their own packages — not embedded in the core KB.

Each regulation has:
- Specific control requirements (what LogicN must prove)
- Specific evidence formats (what the auditor accepts)
- Specific data retention rules (how long evidence must persist)
- Specific reporting formats (how evidence is presented)

These are domain-specific concerns, not governance-core concerns.

---

## Proposed Package Structure

```
@logicn/compliance-eu-ai-act     — EU AI Act Article 12, 13, 9 (high-risk AI logging)
@logicn/compliance-hipaa         — HIPAA Security Rule §164.312 (PHI access controls)
@logicn/compliance-soc2          — SOC 2 Trust Service Criteria (security, availability, PI)
@logicn/compliance-sec-17a4      — SEC Rule 17a-4 (financial records authenticity)
@logicn/compliance-iso27001      — ISO 27001 Annex A controls
@logicn/compliance-nist-csf      — NIST CSF 2.0 Identify/Protect/Detect/Respond/Recover
@logicn/compliance-gdpr          — GDPR Article 5, 25, 30 (data protection by design)
@logicn/compliance-do178c        — DO-178C (avionics software, safety levels A-E)
@logicn/compliance-iec62443      — IEC 62443 (industrial automation security)
```

---

## What Each Package Contains

Each compliance package exports:

```typescript
// governance shape: import into LogicN source
export const FCA_Trading_v2: GovernanceShape;      // UK FCA trading governance
export const HIPAA_PHI_v1:   GovernanceShape;      // HIPAA PHI-handling shape
export const DO178C_DAL_A:   GovernanceShape;      // DO-178C Design Assurance Level A

// evidence builder: generate regulation-specific audit reports
export function buildEUAIActReport(auditGraph: AuditGraph): EUAIActEvidence;
export function buildHIPAAReport(auditGraph: AuditGraph): HIPAAEvidence;
export function buildSOC2Report(auditGraph: AuditGraph): SOC2Evidence;

// validator: check a LogicN flow satisfies the regulation
export function validateEUAIAct(proofGraph: ProofGraph): ComplianceResult;
export function validateHIPAA(proofGraph: ProofGraph): ComplianceResult;

// diagnostics: regulation-specific LLN-* codes
export const LLN_HIPAA_001: LlnDiagnostic;  // PHI without protected_boundary
export const LLN_EU_AI_001: LlnDiagnostic;  // High-risk AI without event logging
```

---

## Usage in LogicN Source

```logicn
// Import a certified governance shape from the marketplace
use governance_shape @logicn/compliance-hipaa:HIPAA_PHI_v1

secure flow updatePatientRecord(readonly record: Protected<PatientRecord>)
-> Result<Response, Error>

contract {
  // The governance shape enforces all HIPAA requirements
  // No need to manually declare audit.write, privacy, redaction —
  // the shape provides them
  effects { database.write }
}
```

The shape import injects all HIPAA requirements into the flow contract. The compiler verifies the flow satisfies them. The AuditGraph records compliance automatically.

---

## Why Separate Packages?

**1. Different release cadence** — HIPAA regulations change on a different schedule than LogicN governance primitives.

**2. Domain expertise** — A compliance package for DO-178C should be written and reviewed by avionics compliance engineers, not the LogicN core team.

**3. Optional by default** — Most LogicN users (web API, general services) don't need HIPAA or DO-178C. They shouldn't import that dependency.

**4. Certifiable as units** — A `@logicn/compliance-do178c` package can be independently reviewed and certified by avionics authorities. Certifying the entire LogicN core would be impractical.

**5. Composable** — A medical device flow might use both `@logicn/compliance-hipaa` AND `@logicn/compliance-iec62443`. Both shapes compose.

---

## Phase Timeline

| Phase | Package | Trigger |
|---|---|---|
| Phase 38 | `@logicn/certified-shapes` (foundation) | Governance Marketplace foundation |
| Phase 46 | First 3 packages: HIPAA, SOC2, EU AI Act | Marketplace public beta |
| Phase 47 | SEC 17a-4, ISO 27001 | Hardware Shield ships |
| Phase 48 | DO-178C | Real-time governance phase |
| Phase 49+ | GDPR, IEC 62443, NIST CSF | Formal verification integration |

---

## See Also

- `logicn-compliance.md` — Compliance architecture overview
- `logicn-roadmap-phase26-50.md` — Phase 38 (Governance Marketplace), Phase 46 (public beta)
- `logicn-governance-signature.md` — GovernanceSignature (evidence signing)
