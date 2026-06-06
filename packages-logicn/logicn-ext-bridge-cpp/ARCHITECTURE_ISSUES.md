# ARCHITECTURE_ISSUES — logicn-ext-bridge-cpp

Cross-package concerns observed while working inside this package. Per the project
guardrail, issues that reach beyond this package are **logged here, not
implemented** — they need a deliberate wider-project decision.

---

## ISSUE-001 — Two BitNet bridge packages overlap

**Status:** open · logged 2026-06-06

**Observation.** There are two packages that both bridge Microsoft BitNet:

| Package | Shape | Governance integration |
|---|---|---|
| `logicn-ext-bridge-cpp` (this one) | Implements the modern `InferenceBridge` contract from `@logicn/tower-citizen`; upholds the three Citizen One Standards (TPL Determinism, Hold-First, Zero-Copy); uses `StubTernaryBridge` as the determinism oracle. | Routed by the Tower's `HybridInferenceEngine` via the `BridgeRegistry` (see `createCppBridgeRegistry()`). |
| `logicn-ext-bridge-bitnet` | Older, lower-level wrapper around the BitNet.cpp C API (`ggml_bitnet_*`). Does **not** implement `InferenceBridge`. | Has its own `TowerRuntime` lifecycle wrapper, but is not consumable by the engine's bridge registry. |

Both depend on `@logicn/tower-citizen` (`file:../logicn-tower-citizen`).

**Why this is a wider-project issue.** Resolving it touches a *second* package
(`logicn-ext-bridge-bitnet`) and the question of which one the platform keeps as
canonical — out of scope for edits confined to `logicn-ext-bridge-cpp`.

**Decision recorded for the integration work (2026-06-06).** For wiring the
Governed Inference Tower into the LogicN runtime, **`logicn-ext-bridge-cpp` is
canonical** — it is the one that satisfies the `InferenceBridge` contract and the
Citizen One Standards, so the engine routes through it.

**Proposed reconciliation (NOT yet done — needs sign-off).**
1. Audit `logicn-ext-bridge-bitnet` for any unique, useful surface (e.g. the
   detailed `ggml_bitnet_*` C-API mapping and kernel-family notes) that this
   package lacks.
2. Migrate anything worth keeping into this package's `native/README.md` N-API
   contract (the documented native seam).
3. Deprecate `logicn-ext-bridge-bitnet`, or explicitly re-scope it as the
   "low-level C-API layer" that this package's native addon links against — so
   the split is intentional rather than accidental duplication.

Until that decision is made, treat `logicn-ext-bridge-bitnet` as legacy and do
not extend it.
