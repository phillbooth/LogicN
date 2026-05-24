# LogicN Reports TODO

```text
[x] Create /packages-logicn/logicn-core-reports
[x] Add README.md
[x] Add TODO.md
[x] Add package metadata
[x] Add initial typed exports
[x] Define common report metadata
[x] Define report severity model
[x] Define diagnostic summary contract
[x] Define build report contract
[x] Define security report contract
[ ] Define policy index, definitions, effective, conflict and AI-summary report contracts
[ ] Define malicious data, exploit-resistance, resource-budget, taint-flow and hardware-risk report contracts
[ ] Define specialist hardware, AI accelerator capability, accelerator fallback, data-sensitivity and precision-compatibility report contracts
[ ] Define RuntimeAuditEvent interface (id/timestamp/traceId/category/event/status/module?/metadata?)
[ ] Define RuntimeAuditStatus type: "started"|"running"|"completed"|"denied"|"failed"|"fallback"|"deferred"
[ ] Implement serializeAuditEvent(event: RuntimeAuditEvent): string — JSON.stringify
[ ] Implement appendAuditEvent(event: RuntimeAuditEvent): string — serialized + "\n"
[ ] Define LN-REPORT-001 through LN-REPORT-005 diagnostic codes
[ ] Create audit/ dir: audit-events.ts, audit-jsonl.ts, audit-runtime.ts, audit-validator.ts, audit-redaction.ts
[ ] Define runtime audit log format (JSONL, event categories, trace correlation, LN-AUDIT codes)
[ ]   - runtime-audit.jsonl schema with all required fields
[ ]   - status values aligned with RuntimeAuditStatus type
[ ]   - capability and effect evidence event shapes
[ ]   - scheduler evidence event shape
[ ]   - runtime health schema
[ ] Define ExecutionProof interface (executionProofVersion/manifestHash/graphHash/policyHash/auditHash/runtimeHash)
[ ] Implement sha256(input: string): string — crypto hash helper
[ ] Implement buildExecutionProof(): ExecutionProof
[ ] Implement validateExecutionProof(proof: ExecutionProof): boolean
[ ] Define LN-PROOF-001 through LN-PROOF-005 diagnostic codes
[ ] Create proofs/ dir: execution-proof.ts, proof-hashing.ts, proof-validator.ts, proof-runtime.ts, proof-report.ts
[ ] Define DenialReport interface (status:"denied"/category/reason/module?)
[ ] Implement buildDenialReport(reason: string): DenialReport
[ ] Define LN-DENIAL-001 through LN-DENIAL-004 diagnostic codes
[ ] Create denials/ dir: denial-report.ts, denial-runtime.ts, denial-validator.ts, denial-serializer.ts
[ ] Define CapabilityEvidence interface (module/capabilities)
[ ] Define EffectEvidence interface (module/effects)
[ ] Define RuntimeEvidence interface (module/effects/capabilities/runtimeTarget?)
[ ] Implement buildRuntimeEvidence(module: string): RuntimeEvidence
[ ] Define LN-EVIDENCE-001 through LN-EVIDENCE-004 diagnostic codes
[ ] Create evidence/ dir: capability-report.ts, effect-report.ts, evidence-aggregator.ts, evidence-validator.ts
[ ] Define audit report contract (audit-report.json) fed from runtime audit log
[ ] Define capability report contract (capability-report.json)
[ ] Define effect report contract (effect-report.json)
[ ] Define denial report contract (denial-report.json)
[x] Define target report contract
[x] Define runtime report contract
[x] Define async/concurrency report contract
[x] Define storage and build-cache report contracts
[x] Define task report contract
[x] Define processing report contract
[x] Define AI guide report contract
[x] Add examples
[x] Add tests
```
