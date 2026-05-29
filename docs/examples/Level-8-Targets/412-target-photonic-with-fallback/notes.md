# 412 — Target photonic with fallback

**Concept:** photonic preference with full classical fallback chain

By listing `photonic, npu, gpu, cpu` in the preference list, the runtime will use the best available device from that order. The `fallback cpu` clause is the final safety net. This pattern supports both cutting-edge photonic labs and standard CPU-only machines.

**AI rule:** When `photonic` is preferred, provide a full fallback chain `npu > gpu > cpu` to maximise portability.
