# LogicN Signed Attestation

## Status

```
Phase 10A — Specification
Signing: Ed25519 (Stage 1), ML-DSA/SLH-DSA (Stage 2 post-quantum)
Implementation: src/attestation.ts (Phase 10A)
```

## TL;DR

- A build can prove "this audit proof came from this exact source, contract, compiler, target plan, and runtime"
- LogicN signs artifacts for integrity — not as a replacement for trust
- Self-signing means signing artifacts, not trusting yourself blindly

---

## The Attestation Pipeline

Signed attestation is produced at the end of a complete build and execution cycle. Each stage produces an artifact; the final attestation binds them all with a cryptographic signature.

```
LogicN Source (.lln)
       │
       ▼
   Compiler
       │
       ▼
  GIR (Governed IR)
       │
       ▼
 Execution Plan (Compute Target Selection)
       │
       ▼
 Runtime Report (Execution Result)
       │
       ▼
  Audit Proof (Proof Chain)
       │
       ▼
Signed Attestation  ◄── all hashes bound and signed here
```

The attestation does not replace any of these artifacts. It is an additional
artifact that proves they were produced together from the same source, in the
same build, under the same contract.

---

## What Gets Signed

The attestation includes a SHA-256 hash of each artifact at the point it was
produced. Together these hashes form the signed record of the build.

| Field | Description |
|---|---|
| `source` | SHA-256 of the `.lln` source file |
| `gir` | SHA-256 of the compiled Governed IR output |
| `contract` | SHA-256 of the flow contract block (extracted separately) |
| `target_plan` | SHA-256 of the compute target selection record |
| `runtime_report` | SHA-256 of the execution report produced by the runtime |
| `audit_proof` | SHA-256 of the existing proof chain from `logicn-proof-chain-spec.md` |
| `package_manifest` | SHA-256 of `package.json` or the LogicN package manifest |

All hashes are computed over canonical byte content. JSON inputs are
key-sorted before hashing. JSONL inputs preserve line order.

---

## Attestation Artifact Format

The attestation is a YAML document with a stable schema version.

```yaml
artifact: logicn.audit.attestation
schema_version: "1.0"
flow: createPatient
timestamp: 2026-05-30T12:00:00.000Z

hashes:
  source: "sha256:abc123..."
  gir: "sha256:def456..."
  contract: "sha256:ghi789..."
  target_plan: "sha256:xyz000..."
  runtime_report: "sha256:jkl012..."
  audit_proof: "sha256:mno345..."
  package_manifest: "sha256:pqr678..."

signature:
  algorithm: Ed25519
  key_id: logicn-build-key-2026-01
  value: "base64:pqr678..."
```

The `key_id` field is required. It links the signature to a named key for
rotation tracking and historical verification.

---

## Stage 1: Ed25519 (Classical Signing)

Stage 1 uses Ed25519 for signing and SHA-256 or SHA-512 for hashing.

**Key management rules:**

- Private keys are stored outside the repository — in an environment variable
  or a separate key file excluded from version control
- `key_id` is recorded in every signature so old artifacts remain verifiable
  after key rotation
- Key rotation: create a new `key_id`, keep old keys available for
  verification of historical artifacts only

**Node.js implementation:**

```typescript
import { generateKeyPairSync, sign, verify, createHash } from "node:crypto";

// Key generation (run once, store securely outside repo)
const { privateKey, publicKey } = generateKeyPairSync("ed25519");

// Signing
const signature = sign(null, Buffer.from(canonical), privateKey);

// Verification
const valid = verify(null, Buffer.from(canonical), publicKey, signature);
```

`src/attestation.ts` exposes `signAttestation(hashes, privateKey, keyId)` and
`verifyAttestation(attestation, publicKey)`.

---

## Stage 2: Post-Quantum Signing (planned)

Stage 2 will add post-quantum algorithm support for long-lived artifacts.

| Algorithm | Role |
|---|---|
| ML-DSA (FIPS 204) | Primary post-quantum signing algorithm |
| SLH-DSA (FIPS 205) | Conservative hash-based fallback |
| Ed25519 | Retained as classical fallback for compatibility |

The attestation format accommodates multiple signatures in Stage 2, allowing
dual-signed artifacts (Ed25519 + ML-DSA) during the transition period.

Stage 2 is planned but not scoped within Phase 10.

---

## The Anti-Pattern: Self-Signing at Runtime

A common misreading of "signed attestation" is that a flow can call a signing
function on its own output and claim that constitutes attestation.

**Wrong — flow self-signing:**

```logicn
// This is not attestation. It proves nothing about provenance.
secure flow auditAndSign(data: AuditRecord) -> SignedRecord
effects [audit.write] {
  let proof = buildProof(data)
  let sig = signAuditProof(proof, self.key)   // ❌ self-signed at runtime
  return Ok({ proof, sig })
}
```

This pattern is incorrect because:

1. The runtime cannot vouch for its own identity at the point of signing
2. A compromised runtime could sign fabricated proofs
3. It conflates data integrity with build provenance

**Correct model:**

```
Compiler (build time)  → signs build artifact      (source + GIR + contract)
Runtime (execute time) → signs execution report     (what actually ran)
Verifier (check time)  → checks both signatures     (and their relationship)
```

The attestation produced by `src/attestation.ts` follows the correct model.
Flows never call a signing function on their own security proofs.

---

## Important Rule

> LogicN signs what it proves. It does not prove something merely because it is signed.

A signature over an artifact confirms the artifact has not changed since
signing and that the signing key was used. It does not confirm the artifact
is correct, complete, or trustworthy on its own merits.

---

## Rules at a Glance

- SHA-256 or SHA-512 for all content hashes in the attestation
- Ed25519 for Stage 1 signing
- `key_id` is required in every signature block
- Private keys are never stored in the repository
- Old `key_id` values are retained so historical artifacts remain verifiable
- Flows may not self-sign their own security proofs at runtime
- The attestation is an additional artifact — it does not replace the proof chain

---

## See Also

- `docs/Knowledge-Bases/logicn-proof-chain-spec.md` — execution proof chain (what gets hashed)
- `docs/Knowledge-Bases/logicn-audit-writer-spec.md` — audit JSONL writer (runtime report source)
- `docs/Knowledge-Bases/logicn-governance-verifier-spec.md` — governance verifier context
