# LogicN Photonic TODO

Post-v1 status: photonic concept work is preserved as planning only unless a
piece is required to clarify core `Tri` or `LogicN` semantics.

```text
[x] Create /packages-logicn/logicn-core-photonic
[x] Document package boundary
[x] Add package metadata
[x] Add initial typed exports
[x] Clarify that logicn-core-photonic owns concepts, types, models and APIs
[x] Define wavelength model
[x] Define phase and amplitude model
[x] Define PhotonicMode
[x] Define PhotonicPlan as a developer-facing model concept
[ ] Define Mach-Zehnder model helpers
[ ] Define wavelength-division multiplexing model helpers
[ ] Define optical matrix multiplication model helpers
[x] Define optical signal reports
[x] Define mappings from logicn-core-logic states
[ ] Define photonic simulation helper APIs
[ ] Define OpticalTransportMode type: "photonic"|"electrical"|"hybrid"
[ ] Define PhotonicRuntimeTarget interface (name/distributed/transportMode/fallbackTarget)
[ ] Define PhotonicExecutionPlan interface (module/distributed/recommendedTransport/fallbackTarget/reasoning)
[ ] Implement estimateOpticalSuitability(graph: ExecutionGraph): boolean
[ ] Implement buildPhotonicPlan(module: string): PhotonicExecutionPlan
[ ] Implement resolveFallback(opticalAvailable: boolean): string
[ ] Define LN-PHOTONIC-001 through LN-PHOTONIC-006 diagnostic codes
[ ] Create internal dir: photonic-runtime.ts, photonic-planner.ts, photonic-routing.ts, photonic-fallback.ts, photonic-audit.ts, photonic-targets.ts
[ ] Define runtime audit event shapes for photonic transport and fallback
[ ] Plan sub-packages: logicn-target-photonic-runtime, logicn-target-photonic-routing, logicn-target-photonic-audit
[x] Add examples
[x] Add tests
```
