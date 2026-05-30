# 221 — Timeouts and retries

## What this example shows

A flow with a full `timeouts {}` and `retries {}` contract block. These blocks
declare the runtime's resilience policy for the flow.

## timeouts block

| Clause | Meaning |
|--------|---------|
| `deadline N seconds` | Hard deadline for the entire flow |
| `network { timeout N seconds }` | Per-effect network timeout |
| `cancel on deadline` | Cancel in-flight effects when the deadline fires |

## retries block

| Clause | Meaning |
|--------|---------|
| `network.outbound { attempts N }` | Retry outbound calls up to N times |
| `strategy exponential_backoff` | Use exponential back-off between retries |
| `database.read { attempts N }` | Retry read queries up to N times |

## Why declare timeouts and retries in the contract?

- The contract is a machine-readable SLA. The runtime enforces it.
- Prevents timeout misconfiguration — one canonical value, not scattered `setTimeout` calls.
- Retry strategies are reviewable by security teams alongside the rest of the flow contract.
- A flow that times out without a `cancel on deadline` clause leaves in-flight effects running.
