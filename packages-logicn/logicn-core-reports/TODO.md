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
[ ] Define runtime audit log format (JSONL, event categories, trace correlation, LN-AUDIT codes)
[ ]   - runtime-audit.jsonl schema with all required fields
[ ]   - status values: success/failure/denied/fallback/cancelled/timeout/degraded
[ ]   - capability and effect evidence event shapes
[ ]   - scheduler evidence event shape
[ ]   - runtime health schema
[ ] Define execution proof contract (execution-proof.json)
[ ]   - five-hash strategy: manifestHash, moduleHash, policyHash, executionHash, resultHash
[ ]   - hash input definition: SHA256(runtime + module + manifest + policy + target + traceId)
[ ]   - secret safety enforcement in result hash
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
