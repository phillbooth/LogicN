# Verified Fast Paths

## Purpose

Verified Fast Paths reduce repeated planning, validation, allocation and compute
negotiation for workloads that match a known safe execution signature.

Core principle:

```text
Do not skip security.
Reuse verified certainty.
```

## Meaning

A fast path is not less secure. A fast path is pre-verified execution.

If the runtime already knows:

- data type
- source
- policy
- memory shape
- compute requirements
- allowed effects
- output contract

then it can reuse a verified execution plan instead of renegotiating everything
on every request.

## Normal Path

```text
request
 -> parse
 -> validate
 -> classify
 -> allocate
 -> policy
 -> effects
 -> route compute
 -> execute
 -> audit
```

## Verified Fast Path

```text
request matches verified execution signature
 -> reuse execution plan
 -> reuse memory plan
 -> reuse compute pipeline
 -> execute
 -> audit
```

## Execution Signature

A verified fast path may be keyed by an execution signature:

```text
hash(
  input type
  source trust state
  model or flow id
  capability set
  policy state
  tensor or memory shape
  compute target
  output contract
)
```

If the signature matches and the lease is still valid, the runtime may reuse the
verified path.

Verified fast paths should be backed by a context-tagged verified execution
cache. A cached plan is reusable only when the current execution context matches
the context it was verified for, including policy version, permission version,
actor scope, view scope, runtime zone, compute target, hardware trust and audit
level.

Core cache rule:

```text
Cache execution plans, not trust.
Reuse certainty, not authority.
```

The detailed cache model is documented in
[Context Tagged Verified Execution Cache](context-tagged-verified-execution-cache.md).

## Valid Fast Path Candidates

### Typed Internal Data

Data that is already validated, typed, immutable and from a trusted source may
qualify.

### AI Inference Workloads

Repeated AI workloads with the same model, tensor shape, quantisation and
compute target may reuse buffers, tensor layout, execution graphs and compiled
kernels.

### Policy-Safe Operations

Repeated low-risk operations such as reading a public product catalog may reuse
verified plans.

### Streamed Workloads

Video chunks, sensor data, audio frames and token streams may keep bounded
pipelines warm when policy allows.

## Safety Limits

Fast paths must:

- remain auditable
- remain bounded
- expire
- revalidate when policy changes
- revalidate when model changes
- revalidate when package versions change
- revalidate when hardware changes
- revalidate when trust state changes
- never bypass data contracts
- never bypass effect boundaries
- never bypass capability checks

Fast path authority is leased and contextual, never permanent.

Caches must not own authority. Authority Control decides whether a cached plan
may be reused, and it must be able to invalidate relevant parser, IR, policy,
view, vault, compute, schedule, audit and verified execution caches.

## Runtime Reports

Verified fast paths should appear in:

```text
verified-fast-path-report.json
execution-signature-report.json
runtime-plan-report.json
ai-compute-plan-report.json
security-report.json
```

Reports should show:

- execution signature id
- flow or model
- policy version
- capability set
- memory plan
- compute target
- lease expiry
- invalidation reason
- audit outcome

## Rule

Fast paths optimise execution by reusing verified execution plans, memory
layouts, compute pipelines and hardware routing decisions.

They must never bypass policy, capability limits, effect boundaries, data
contracts or audit requirements.
