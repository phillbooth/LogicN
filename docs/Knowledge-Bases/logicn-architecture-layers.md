# LogicN Architecture Layers

## Status

```
Five-layer architecture — authoritative definition
Applies to all LogicN execution from compiler through audit proof
```

---

## Rules at a Glance

- Layer 1 (Source AST) is what the developer writes — governance labels, effects, intent
- Layer 2 (GIR) is what the compiler produces after all checks pass — the verified contract
- Layer 3 (Backend IR) is target-specific — backend owns layout, SIMD, photonic lowering
- Layer 4 (Runtime Report) is what actually ran — effect trace, timing, audit
- Layer 5 (Audit Proof) is the cryptographic evidence chain — proves layers 1-4 agree
- The Adaptive Runtime operates after Layer 2 and before Layer 4 — it cannot modify Layer 2

---

## The Five Layers

```
Layer 1: LogicN Source AST
      ↓  (compiler — passes 1-7)
Layer 2: Governed Execution Plan (GIR)
      ↓  (target bridge — pass 9)
Layer 3: Backend Lowering IR
      ↓  (runtime execution — pass 10)
Layer 4: Runtime Execution Report
      ↓  (proof chain generation)
Layer 5: Audit Proof
```

---

## Layer 1 — LogicN Source AST

**What:** The `.lln` source file as parsed and checked.

**Contains:**
- Governance labels: `protected`, `redacted`, `unsafe`, `safe`
- Effect declarations: `effects [database.write, audit.write]`
- Intent declarations: `intent "Create patient record"`
- Type annotations: `protected Email`, `Money<GBP>`, `Tensor<Float32, [1,768]>`
- Value-state annotations: `unsafe let rawEmail: String`
- Compute target preferences: `compute target best { prefer [npu, gpu] }`

**Owner:** Developer

**Format:** `.lln` files → AST JSON (internal to compiler)

**Key rule:** The source says **WHAT is allowed**. Not how to execute it.

---

## Layer 2 — Governed Execution Plan (GIR)

**What:** The compiler's verified, machine-readable governance contract.
Emitted only when all checker passes produce zero errors.

**Contains:**
- Flow facts: name, qualifier, effects declared/observed, compliance status
- Protected value tracking: which bindings carry governance labels
- Proof obligations: what must be verified at runtime
- Compute preferences: preferred targets and denied targets
- Intent status: satisfied / mismatch / null

**Owner:** Compiler (Pass 8)

**Format:** YAML/JSON per flow — see `logicn-gir-schema.md`

**Key rule:** GIR is fixed after emission. The Adaptive Runtime cannot modify GIR semantics.

---

## Layer 3 — Backend Lowering IR

**What:** Target-specific executable representation derived from GIR.

**Contains (target-specific):**
- CPU: native code or TypeScript (Stage 1)
- GPU: compute kernel (CUDA, WebGPU, Metal)
- NPU: inference graph (ONNX, CoreML, TensorRT)
- WASM: WebAssembly module
- Photonic: photonic circuit description
- Quantum: QIR / OpenQASM

**Owner:** Target bridge (`logicn-target-*` packages)

**Backend owns:**
- Memory layout and alignment
- SIMD / vectorisation decisions
- Photonic wavelength routing
- Quantum circuit compilation
- NPU operator graph optimisation

**Key rule:** Backend decides **HOW to execute**. It cannot change program meaning,
remove effects, skip validation, or alter governance labels.

---

## Layer 4 — Runtime Execution Report

**What:** What actually ran during execution.

**Contains:**
- Effect trace: which effects were observed at runtime
- Timing: start time, end time, duration
- Actor identity: who executed the flow
- Flow identity: which flow name and qualifier ran
- Actual target used: cpu / gpu / npu (may differ from preference)
- Audit entries: AuditLog.write() calls recorded in order

**Owner:** Runtime

**Format:** JSONL audit stream — see `logicn-audit-writer-spec.md`

**Key rule:** The runtime execution report must be consistent with Layer 2 (GIR).
If a declared effect is missing from the trace, that is a governance violation.

---

## Layer 5 — Audit Proof

**What:** Cryptographic evidence chain proving that layers 1-4 agree.

**Contains:**
- manifestSha256: hash of the source manifest (what was declared)
- auditSha256: hash of the JSONL audit log (what was executed)
- evidenceSha256: hash of the evidence record (validation gates fired, redactions applied)
- denialSha256: hash of the denial log (runtime governance rejections)
- artefactSha256: hash of the compiled output

**Owner:** Audit system (lln-graph `ExecutionProofChain`)

**Format:** Proof chain YAML — see `logicn-proof-chain-spec.md`

**Key rule:** The proof chain proves: declared = executed = audited.
Any discrepancy between the hashes indicates tampering or governance failure.

---

## Adaptive Runtime Placement

The Adaptive Runtime (see `logicn-adaptive-runtime-profiles.md`) operates
between Layer 2 and Layer 4:

```
Layer 2: GIR  →  Adaptive Runtime  →  Layer 3: Backend IR  →  Layer 4: Report
                 (learns scheduling,
                  selects targets,
                  adjusts batching)
```

The Adaptive Runtime:
- **May** influence: target selection, request batching, model warmup, scheduling
- **May not** modify: GIR semantics, effects, governance labels, validation requirements

---

## Key Principle

```
LogicN source says WHAT is allowed.
Backend decides HOW to execute it.
Runtime proves WHAT happened.
Audit chain verifies all three agree.
```

---

## See Also

- `docs/Knowledge-Bases/neutral-governed-ir.md` — GIR philosophy
- `docs/Knowledge-Bases/logicn-gir-schema.md` — GIR schema
- `docs/Knowledge-Bases/logicn-ast-to-gir.md` — Layer 1 → Layer 2 transformation
- `docs/Knowledge-Bases/logicn-audit-writer-spec.md` — Layer 4 format
- `docs/Knowledge-Bases/logicn-proof-chain-spec.md` — Layer 5 generation
- `docs/Knowledge-Bases/logicn-adaptive-runtime-profiles.md` — Adaptive Runtime
- `docs/Knowledge-Bases/logicn-compiler-pipeline.md` — compiler passes
