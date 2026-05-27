# LogicN Governance Diff in CI

## Overview

`logicn diff main..branch` compares compiler-generated governance reports
between two commits and emits a structured summary of which effects, capabilities,
resources, secrets and package authority changed.

Security review becomes reading a machine-generated diff rather than inspecting
all code manually for semantic authority changes.

---

## Why Semantic Diff, Not Text Diff

The feature compares compiler-generated semantic artefacts, not raw git diff lines.

Good:

```text
flow processRefund effect set changed from [database.write] to [database.write, network.call]
```

Bad:

```text
line 42 includes text network.call
```

Semantic diff avoids false positives and false negatives.

---

## Example Output

```bash
logicn diff main..feature-refunds
```

Human-readable:

```text
Governance diff: main..feature-refunds

Changed flows:

1. processRefund
   Added effects:
     + network.call
     + payment.refund
   Added capabilities:
     + payments.refund
   Added secret access:
     + STRIPE_SECRET_KEY
   Boundary changes:
     + internal flow → external payment provider
   Review: REQUIRED

2. refundPreview
   No authority changes. Type-only change.

Package changes:
  stripe-adapter 1.2.0 → 1.3.0
    Added capability:
      + payment.refund
    Manifest hash changed: sha256:aaa → sha256:bbb
```

Machine-readable JSON:

```json
{
  "base": "main",
  "head": "feature-refunds",
  "flows": [
    {
      "name": "processRefund",
      "authority_change": true,
      "effects_added": ["network.call", "payment.refund"],
      "capabilities_added": ["payments.refund"],
      "secrets_added": ["STRIPE_SECRET_KEY"],
      "boundaries_added": ["external.payment_provider"],
      "review": "required"
    }
  ]
}
```

---

## What the Diff Covers

```text
flow signature changes
effect changes (added/removed)
capability changes
secret access changes
network host changes
database read/write changes
payment/refund/charge changes
file access changes
native/unsafe changes
resource budget changes (memory, timeout, concurrency)
timeout/concurrency changes
memory policy changes
crypto policy changes
target/fallback changes
package governance manifest changes
supply-chain hash changes
diagnostic range changes
API/webhook contract changes
taint/sanitiser path changes
request-scope/lifetime policy changes
```

---

## Review Classification

| Classification | Trigger |
|---|---|
| `none` | Doc/comment-only change |
| `informational` | New pure helper flow |
| `review-recommended` | Memory budget increase |
| `review-required` | New `network.call`, `secret.read`, `payment.charge`, etc. |
| `blocked` | New `unsafe`/`native_bindings` in production profile |

---

## Authority Widening Signals

The most important signal. These typically require review:

```text
+ network.external
+ secret.read
+ database.write
+ payment.charge
+ payment.refund
+ file.write
+ native_bindings
+ unsafe
+ environment.read
```

Authority reduction (`-`) is also shown; it may reduce risk.

---

## Project Policy

```logicn
governance_diff_policy {
  require_review_on [network.external, secret.read, payment.charge, payment.refund]
  block_on [unsafe, native_bindings]
  warn_on_resource_increase_over 25%
  require_owner_for payment.*
}
```

---

## Required Build Artefacts

For reliable diffs, each commit must have:

```text
flow graph, effect graph, capability graph, boundary graph
package governance manifest hash
resource policy graph
API/webhook contract graph
security report
target report
dependency lockfile hash
```

Recommended build step:

```bash
logicn build --emit-governance-report
logicn diff main..branch --from-reports
```

---

## CI Integration

```bash
logicn diff origin/main..HEAD --format json --out build/governance-diff.json
```

CI can then:
- Post a PR summary comment
- Fail on `blocked` changes
- Require explicit approval on `review-required` changes
- Archive the structured diff report

---

## Diagnostics

| Code | Meaning |
|---|---|
| `LLN-DIFF-001` | Governance diff generated |
| `LLN-DIFF-002` | Authority widened |
| `LLN-DIFF-003` | Resource budget increased |
| `LLN-DIFF-004` | Package governance manifest changed |
| `LLN-DIFF-005` | Security boundary changed |
| `LLN-DIFF-006` | Unsafe/native authority introduced |
| `LLN-DIFF-007` | Production gate changed |
| `LLN-DIFF-008` | Review required by policy |
| `LLN-DIFF-009` | Governance diff unavailable because base report is missing |

---

## CLI Commands

```bash
logicn diff main..branch
logicn diff main..branch --format json
logicn diff main..branch --fail-on review-required
logicn diff main..branch --fail-on blocked
logicn diff main..branch --only authority
logicn diff main..branch --only resources
logicn diff main..branch --from-reports build/base.json build/head.json
```

---

## Architecture Placement

| Layer | Responsibility |
|---|---|
| `logicn-core` | Semantic definitions of flows, effects, capabilities, resources |
| `logicn-core-compiler` | Semantic graph generation and hashing |
| `logicn-core-reports` | Governance report schema and diff schema |
| `logicn-core-cli` | Diff command and CI integration |
| `logicn-core-security` | Policy classification and review gates |
| `logicn-core-config` | Project governance diff policy |
| `logicn-devtools-project-graph` | Visualisation and graph export |
| Package/registry tooling | Package governance manifest diffs |

---

## What Code Review Still Does

Governance diff answers:
- What authority changed?
- What resources changed?
- What boundaries changed?
- What package trust changed?

Code review still answers:
- Is the business logic correct?
- Are fraud/payment rules correct?
- Is the new authority justified?
- Are there edge cases?
