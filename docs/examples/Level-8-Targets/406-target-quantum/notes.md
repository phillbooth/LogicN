# 406 — Target quantum

**Concept:** quantum compute target with classical CPU fallback

`compute target quantum` dispatches the workload to a quantum processing unit. The `fallback cpu` clause enables classical simulation when quantum hardware is unavailable — useful for development and testing.

**AI rule:** Use `compute target quantum` for quantum-native algorithms; `fallback cpu` runs a classical simulation.
