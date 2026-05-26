# LogicN Vector

`logicn-core-vector` is the package for LogicN vector value and vector operation concepts.

## Coverage Reconciliation Status

`logicn-core-vector` may document vector suitability for photonic planning, but
it does not own photonic runtime target semantics. `docs/COVERAGE.md` records a
boundary conflict where vector photonic notes proposed `PhotonicRuntimeTarget`,
`PhotonicExecutionPlan`, `OpticalTransportMode` and `LLN-PHOTONIC-*` contracts in
this package. Treat that material as proposal/reference only until the photonic
owner package reconciles the public contract.

It belongs in:

```text
/packages-logicn/logicn-core-vector
```

Use this package for:

```text
Vector<T, N>
Matrix<T, R, C>
Tensor<T, Shape>
Shape
Batch<T>
Float16 / Float32 / Float64 numeric element contracts
Int8 and quantized numeric element contracts
vector dimensions
vector lanes
vector operations
tensor operations
vector safety rules
vector capability reports
vector lowering hints
```

## Pure Numeric Work

Use `logicn-core-vector` for pure numeric value shapes used by compute-heavy flows:

```LogicN
pure vector flow normalize(input: Vector<Float32, 768>) -> Vector<Float32, 768> {
  return vector.normalize(input)
}
```

Neural-network packages may consume vector, matrix and tensor contracts from
`logicn-core-vector`, but they should not redefine those shapes themselves.

## Boundary

`logicn-core-vector` should not own compute target selection. That belongs in
`logicn-core-compute`.

`logicn-core-vector` should not own photonic representation. That belongs in
`logicn-core-photonic` and `logicn-target-photonic`.

`logicn-core-vector` should not own neural-network layers, training, inference or model
metadata. Those belong in `logicn-ai-neural` and `logicn-ai`.

Final rule:

```text
logicn-core-vector describes vector, matrix and tensor values and operations.
logicn-core-compute decides how compute work can be planned.
target packages decide how planned work is emitted.
```

## Photonic Governance Proposal (Unresolved Boundary Conflict)

A specification in the notes files (`28.txt`) proposes placing photonic governance
contracts inside `logicn-core-vector`:

```text
OpticalTransportMode (6 values: electrical|hybrid|photonic|waveguide|plasmonic|coherent)
PhotonicCapability (6 values)
PhotonicTopology (6 values)
PhotonicRuntimeTarget v0.2
PhotonicExecutionPlan v0.2
estimateOpticalSuitability
buildPhotonicPlan
resolveFallback
validateTransportMode / validatePhotonicTarget / validatePhotonicPlan
LLN-PHOTONIC-001–006
```

This **conflicts with the boundary rule above** which states photonic representation
belongs in `logicn-core-photonic`.

The existing `logicn-core-photonic` package already has these types fully specified in:
- `docs/Knowledge-Bases/logicn-core-photonic-backend-architecture.md`
- `docs/Knowledge-Bases/logicn-core-photonic-v02.md`
- `docs/Knowledge-Bases/logicn-core-photonic-governance-architecture.md`
- `docs/Knowledge-Bases/logicn-core-vector-photonic-governance.md` (conflict documented)

**Resolution required before implementation.**

See `docs/Knowledge-Bases/logicn-core-vector-photonic-governance.md` for the full
photonic governance spec and boundary conflict details.
