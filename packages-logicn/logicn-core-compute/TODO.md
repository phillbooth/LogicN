# LogicN Compute TODO

V1 freeze rule: compute planning must keep active target selection to CPU and
WASM. GPU, AI accelerator, optical I/O, photonic, low-bit AI and other advanced
targets are post-v1 planning unless needed to describe core type-system
semantics.

Quantum compute is future/research target planning. It must not be treated as an
active v1 runtime target.

```text
[x] Create /packages-logicn/logicn-core-compute
[x] Document package boundary
[x] Add package metadata
[x] Add initial typed exports
[x] Define compute capability model
[x] Define compute budget model
[x] Define target selection rules
[x] Add generic low-bit AI fallback target concept
[x] Define offload planning reports
[ ] Define future quantum target planning rules after core compute reports
  stabilise
[x] Add examples
[x] Add tests
```
