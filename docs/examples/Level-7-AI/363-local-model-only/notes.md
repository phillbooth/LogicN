# 363 — Local model only

**Concept:** local-only AI classification denying both remote execution and network outbound

For the strictest data-residency scenarios (air-gapped environments, regulated sectors), denying both `remote.execution` and `network.outbound` ensures the model cannot exfiltrate data via any network path. `prefer [cpu]` limits placement to the local CPU.

**AI rule:** Use `deny [remote.execution, network.outbound]` for air-gapped or strict data-residency deployments.
