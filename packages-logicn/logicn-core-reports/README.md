# LogicN Reports

`logicn-core-reports` is the package for shared LogicN report schemas and report-writing
contracts.

It belongs in:

```text
/packages-logicn/logicn-core-reports
```

Use this package for:

```text
report metadata
report severity
diagnostic summary contracts
build report contracts
security report contracts
policy index, definition, effective and conflict report contracts
malicious data, exploit-resistance, resource-budget and hardware-risk report contracts
specialist hardware and accelerator fallback report contracts
target report contracts
runtime report contracts
async/concurrency report contracts
storage and build-cache report contracts
passive LLM cache report contracts
network, TLS, port, firewall, packet-filter and network-performance report contracts
task report contracts
processing report contracts
AI guide report contracts
report writer interface
JSON serialization helper
```

## Boundary

`logicn-core-reports` should define shared report shapes and writer contracts. It should
not own package-specific analysis.

```text
compiler analysis -> logicn-core-compiler
security checks   -> logicn-core-security / logicn-core-compiler
network facts     -> logicn-core-network / logicn-framework-api-server / logicn-framework-app-kernel
runtime events    -> logicn-core-runtime
task execution    -> logicn-core-tasks
target analysis   -> target packages
```

## Contracts

The package defines:

```text
ReportMetadata
ReportGenerator
ReportDiagnostic
DiagnosticSummary
BuildReport
SecurityReport
PolicyIndexReport
PolicyDefinitionsReport
PolicyEffectiveReport
PolicyConflictReport
MaliciousDataReport
ExploitResistanceReport
ResourceBudgetReport
TaintFlowReport
HardwareRiskReport
SpecialistHardwareReport
AiAcceleratorCapabilityReport
AcceleratorFallbackReport
AcceleratorDataSensitivityReport
PrecisionCompatibilityReport
TargetReport
RuntimeReport
TaskReport
ProcessingReport
BatchResultReport
AsyncReport
AwaitSiteReport
AwaitGroupReport
StorageReport
BuildCacheReport
LlmCacheReport
NetworkReport
TlsReport
PortReport
RateLimitReport
FirewallReport
PacketFilterReport
NetworkPerformanceReport
AiGuideReport
CustomReport
ReportWriter
```

Use these contracts to keep package-specific reports consistent while leaving
the actual analysis in the owning package.

Processing reports are for resilient/batch flows that can continue after
item-level failures. They record totals, successes, failures, retries,
quarantined items, checkpoints and failure-type summaries. They must not be used
to hide system/runtime integrity failures.

Async reports are for Structured Await analysis. They record await points,
await groups, race blocks, stream blocks, queue awaits, missing timeout counts,
unscoped task counts, background task counts, structured-concurrency status and
source locations. Compiler, runtime and kernel packages produce the facts;
`logicn-core-reports` only owns the shared shape.

Storage and build-cache reports are for conservative performance planning. They
record optional storage facts, unknown-storage fallback, recommended bounded
cache mode, cache hits, misses, bypasses, evictions and invalidations. Cache
reports must make clear that cached data is not required for correctness and
that secrets or sensitive payloads are denied by default.

Passive LLM cache reports are for provider-neutral AI cache visibility. They
record whether caching was enabled, store type, hit/miss counts, blocked counts,
blocked reasons, models used, semantic-cache status, invalidation facts and
whether secret values were stored. They must not include prompt text, raw user
messages, secret values, credentials, authorization headers or unredacted
personal data.

Network reports are for deployment and observability planning. They record
inbound ports, outbound hosts, TLS policy, selected I/O backend, zero-copy
availability, rate limits, firewall posture, packet-filter facts and network
performance bottlenecks. `logicn-core-reports` owns the shared report shape;
`logicn-core-network`, the API server and the app kernel produce the facts.

Policy reports are for source-visible policy analysis. They record policy
declarations, source locations, usage, canonical definitions, effective merged
policy per target and conflict diagnostics. Security/compiler packages produce
the facts; `logicn-core-reports` owns the shared shape.

Malicious data and exploit-resistance reports are for evidence that untrusted
input was bounded, validated, canonicalised, assigned to a boundary and denied
from unsafe sinks unless a typed safe operation allowed it. Runtime, compiler,
security and framework packages produce the facts; `logicn-core-reports` owns
the shared shape.

Specialist hardware reports are for governed compute target evidence. They
record selected CPU/GPU/NPU/TPU/VPU/FPGA/ASIC targets, backend profile,
precision compatibility, data sensitivity, isolation level, memory limits,
fallback decisions and audit status. Compute and target packages produce the
facts; `logicn-core-reports` owns the shared shape.

## Runtime Audit Log Format

The runtime audit log uses JSONL (JSON Lines) for the primary append-only event
stream. Each event is one JSON object per line. The format is structured,
immutable, machine-readable, and AI-readable.

Key audit files:

```text
runtime-audit.jsonl   — append-only runtime events
execution-proof.json  — execution integrity with 5 hashes
capability-report.json
effect-report.json
denial-report.json
runtime-health.json
runtime-trace.json
```

### RuntimeAuditEvent Type

```ts
export interface RuntimeAuditEvent {
  id: string
  timestamp: string
  traceId: string
  category: string
  event: string
  status: RuntimeAuditStatus
  module?: string
  metadata?: Record<string, unknown>
}

export type RuntimeAuditStatus =
  | "started"
  | "running"
  | "completed"
  | "denied"
  | "failed"
  | "fallback"
  | "deferred"
```

### ExecutionProof Type (five-hash strategy)

```ts
export interface ExecutionProof {
  executionProofVersion: string
  manifestHash: string   // compiler manifest integrity
  graphHash: string      // execution graph integrity
  policyHash: string     // deployment policy integrity
  auditHash: string      // runtime audit stream integrity
  runtimeHash: string    // runtime binary integrity
}
```

### DenialReport Type

```ts
export interface DenialReport {
  status: "denied"
  category: string
  reason: string
  module?: string
}
```

### Evidence Types

```ts
export interface CapabilityEvidence { module: string; capabilities: string[] }
export interface EffectEvidence { module: string; effects: string[] }
export interface RuntimeEvidence { module: string; effects: string[]; capabilities: string[]; runtimeTarget?: string }
```

### Internal Structure

```text
src/audit/     — audit-events.ts, audit-jsonl.ts, audit-runtime.ts, audit-validator.ts, audit-redaction.ts
src/proofs/    — execution-proof.ts, proof-hashing.ts, proof-validator.ts, proof-runtime.ts, proof-report.ts
src/denials/   — denial-report.ts, denial-runtime.ts, denial-validator.ts, denial-serializer.ts
src/evidence/  — capability-report.ts, effect-report.ts, evidence-aggregator.ts, evidence-validator.ts
```

### Diagnostic Codes

```text
LN-AUDIT-001 through LN-AUDIT-007
LN-REPORT-001 through LN-REPORT-005
LN-PROOF-001 through LN-PROOF-005
LN-DENIAL-001 through LN-DENIAL-004
LN-EVIDENCE-001 through LN-EVIDENCE-004
```

Secret safety rule: audit logs must never store API keys, passwords, tokens,
or private certificates — only hashes, status flags, presence checks, and
capability names.

See `docs/Knowledge-Bases/runtime-audit-log-format.md` for the full schema,
execution proof design, JSONL format rationale, and v0.1 scope.

Final rule:

```text
logicn-core-reports owns shared report shapes.
Owning packages produce their own facts and diagnostics.
Report output must stay deterministic and safe to inspect.
```
