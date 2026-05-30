# 368 — AI flow with contract

**Concept:** Flow contract providing IGO intent for AI inference

The intent "locally without remote execution" tells the IGO runtime:
- This is an AI inference workload
- Remote execution must remain denied
- NPU/GPU preference is appropriate

The governance verifier reads "without remote execution" and validates it against
any declared compute target preferences.

**AI rule:** Intent in contract feeds IGO — the runtime may optimise but never override the governance constraint.
