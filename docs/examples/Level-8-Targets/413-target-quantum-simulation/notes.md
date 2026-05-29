# 413 — Target quantum simulation

**Concept:** quantum preference with GPU simulation and CPU fallback

Quantum algorithms can be simulated classically. Including `gpu` before `cpu` in the preference list enables GPU-accelerated quantum simulation, which is significantly faster than CPU simulation for moderate qubit counts.

**AI rule:** List `gpu` before `cpu` in the quantum fallback chain to enable GPU-accelerated quantum simulation.
