# ARCHITECTURE_ISSUES — logicn-tower-citizen

Cross-package / global changes discovered while implementing the TPL Virtual
Photonic Processor. Per the package-isolation directive, these are **logged here,
not implemented**. Each needs a decision before it can land in the wider project.

---

## 1. Native FFI bridge to bitnet.cpp (the real kernel)

- **Status:** The `TPLSimulator` is a byte-faithful CPU reimplementation of BitNet's
  I2_S ternary kernel — the encoding, packing, and T-MAC match
  `C:\wwwprojects\BitNet\src\ggml-bitnet-mad.cpp` exactly. But it executes the dot
  product in scalar TypeScript, not via BitNet's SIMD kernels (`ggml_vec_dot_i2_i8_s`,
  AVX2/NEON `vdotq_s32`).
- **Need:** For production throughput (the BitNet 5–7 tok/s benchmark), the T-MAC must
  dispatch to the real C kernel via the planned `logicn-ext-bridge-cpp` package — a
  Node native addon or WASI-NN backend wrapping `ggml_bitnet_mul_mat_task_compute()`.
- **TODO:** Build `logicn-ext-bridge-cpp` (already on the roadmap, task series #119).
  The `TPLSimulator.tmacVector()` signature is the seam: swap the scalar loop for an
  FFI call when the addon is present, keeping the governance/audit wrapper unchanged.
- **Why not here:** The native addon build (CMake + node-gyp) and the BitNet library
  link belong in a dedicated `logicn-ext-bridge-*` package, not in this pure-TS plugin.

## 2. governance.lln schema — `state_transition_policy` object

- **Status:** `GovernanceEnforcer` hardcodes the TPL v1.0 default policy
  (`0 → 1` requires `audit_signature` + `input_schema_validation`).
- **Need:** This policy should be declared in `governance.lln` and parsed by the core
  compiler, so the transition rules are governed source — not a TypeScript constant.
- **TODO:** Add a `state_transition_policy { restricted_transitions { ... } }` block to
  the LogicN grammar + governance verifier (core compiler). Then `GovernanceEnforcer`
  loads the policy from the compiled manifest instead of `TPL_DEFAULT_POLICY`.
- **Why not here:** Grammar + verifier changes live in `logicn-core-compiler`, outside
  this package.

## 3. NVFP4 path for the hybrid engine (`fp4_block` technique)

- **Status:** `precision-strategy.ts` routes bandwidth-bound ops to `fp4_block`
  (NVIDIA NVFP4), but the technique currently has no execution backend — only routing
  and audit attribution. The source is available at `C:\wwwprojects\TransformerEngine`.
- **Need:** An FP4 block-scaled GEMM backend (E2M1 + 16-element block scale) reached via
  the same FFI bridge, gated on Blackwell hardware detection.
- **TODO:** `logicn-ext-bridge-nvfp4` (roadmap task #122, hardware-gated). The hybrid
  engine already produces the per-op decision; only the kernel dispatch is missing.
- **Why not here:** Requires CUDA toolchain + Blackwell hardware; belongs in its own
  hardware-gated ext package.

## 4. WASM SIMD (`v128`) acceleration of the simulator core

- **Status:** `TPLSimulator` uses scalar `Int32Array` operations. Correct and
  deterministic, but not vectorised.
- **Need:** To approach native throughput in browser/WASM deployments, the T-MAC loop
  should use `v128` intrinsics (64 trits per 128-bit register) when the runtime
  advertises SIMD support.
- **TODO:** Evaluate a `v128` fast-path that preserves the exact bit-packing and the
  vector-level audit boundary. Keep the scalar path as the deterministic reference and
  cross-check the two in tests.
- **Why not here (yet):** This is an in-package optimisation and *could* live here, but
  it depends on the chosen WASM build pipeline (emscripten vs hand-written WAT) which is
  a wider toolchain decision still open in the core project.

## 5. Manifest CBOR tag for the TPL transition ledger

- **Status:** TPL transitions are logged via the existing `AuditLogger` (JSONL).
- **Need:** To appear in the signed `.lmanifest` audit narrative, TPL transitions should
  map to the CBOR Tag 410 AuditEvent schema used by the rest of the Tower.
- **TODO:** Confirm the `tpl_transition` detail shape conforms to the Tag 410 field set
  in `manifest-generator.ts` (core compiler), or extend the schema if a TPL-specific
  sub-record is wanted.
- **Why not here:** Manifest generation + CBOR tags live in `logicn-core-compiler`.
