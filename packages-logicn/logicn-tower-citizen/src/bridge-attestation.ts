/**
 * bridge-attestation.ts — CF-3 / CF-7 enforcement.
 *
 * The bridge registry is otherwise trusted input: any in-process object can claim
 * to be a deterministic ternary bridge. Attestation closes that hole. A bridge
 * carries a signed `BridgeManifest` (the schema lives in the neutral
 * @logicn/inference-bridge-contract package); the Tower verifies:
 *   - the manifest is structurally valid,
 *   - its sha256 is pinned (allow-list), if a pin set is configured (CF-7 covers
 *     the native_addon_hash field the same way),
 *   - its Ed25519 signature verifies against the deployment's attestation key.
 *
 * The contract package stays crypto-free; all hashing/signing lives here.
 */

import { createHash, sign as edSign, verify as edVerify, createPrivateKey, createPublicKey, generateKeyPairSync } from "node:crypto";
import {
  canonicalManifestString,
  validateManifestShape,
  type BridgeManifest,
  type BridgeAttestation,
  type InferenceBridge,
  type BridgeOp,
  type BridgeResult,
} from "@logicn/inference-bridge-contract";

export interface AttestationPolicy {
  /** Require a valid Ed25519 signature on every bridge manifest. */
  readonly requireSigned?: boolean;
  /** PEM SPKI public key used to verify signatures. */
  readonly publicKeyPem?: string;
  /** Optional allow-list of attestation hashes — pin exact bridges/addons. */
  readonly allowedHashes?: readonly string[];
  /**
   * Require `manifest.certificationProfile === "certified"`. A `dev`/unsigned
   * simulator stub is then refused even if it is validly signed — in P9 mode the
   * deployment must ship real certified kernels, not the dev fallback. Default off.
   */
  readonly requireCertifiedProfile?: boolean;
}

export interface AttestationResult {
  readonly ok: boolean;
  readonly reason?: string;
  readonly hash?: string;
}

/** sha256 hex of the canonical manifest pre-image — the attestation hash. */
export function attestationHash(manifest: BridgeManifest): string {
  return createHash("sha256").update(canonicalManifestString(manifest), "utf8").digest("hex");
}

/** Sign a manifest with an Ed25519 private key (PEM PKCS8). */
export function signManifest(manifest: BridgeManifest, privateKeyPem: string): BridgeAttestation {
  const key = createPrivateKey(privateKeyPem);
  const sig = edSign(null, Buffer.from(canonicalManifestString(manifest), "utf8"), key);
  return { manifest, signature: sig.toString("base64") };
}

/**
 * Verify a bridge attestation against a policy. Fails CLOSED — a missing
 * attestation, a shape violation, an unpinned hash, or a bad signature all
 * return { ok: false }.
 */
export function verifyAttestation(
  attestation: BridgeAttestation | undefined,
  policy: AttestationPolicy,
): AttestationResult {
  if (!attestation) return { ok: false, reason: "no attestation provided" };

  const shape = validateManifestShape(attestation.manifest);
  if (!shape.ok) return { ok: false, ...(shape.reason !== undefined ? { reason: shape.reason } : {}) };

  const hash = attestationHash(attestation.manifest);

  if (policy.requireCertifiedProfile && attestation.manifest.certificationProfile !== "certified") {
    return { ok: false, reason: `certified profile required, manifest is "${attestation.manifest.certificationProfile}"`, hash };
  }

  if (policy.allowedHashes && policy.allowedHashes.length > 0 && !policy.allowedHashes.includes(hash)) {
    return { ok: false, reason: `attestation hash not pinned: ${hash}`, hash };
  }

  if (policy.requireSigned) {
    if (!attestation.signature) return { ok: false, reason: "signature required but absent", hash };
    if (!policy.publicKeyPem) return { ok: false, reason: "no public key configured to verify signature", hash };
    try {
      const pub = createPublicKey(policy.publicKeyPem);
      const ok = edVerify(
        null,
        Buffer.from(canonicalManifestString(attestation.manifest), "utf8"),
        pub,
        Buffer.from(attestation.signature, "base64"),
      );
      if (!ok) return { ok: false, reason: "signature verification failed", hash };
    } catch (e) {
      return { ok: false, reason: `signature check error: ${(e as Error).message}`, hash };
    }
  }

  return { ok: true, hash };
}

/** Generate an Ed25519 attestation keypair (PEM). The private key signs bridge
 *  manifests offline (the `logicn bridge attest` step); the public key is pinned
 *  into the deployment's attestation policy. */
export function generateAttestationKeypair(): { publicKeyPem: string; privateKeyPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}

/** Sign a bridge's manifest and return a DELEGATING wrapper that carries the
 *  attestation while preserving the original bridge's behaviour (its methods live
 *  on the prototype, so a plain spread would drop them — we delegate explicitly). */
export function attestBridge(bridge: InferenceBridge, privateKeyPem: string): InferenceBridge {
  const manifest = bridge.manifest;
  if (!manifest) {
    throw new Error("ERR_BRIDGE_NO_MANIFEST: cannot attest a bridge that has no manifest to sign");
  }
  const attestation = signManifest(manifest, privateKeyPem);
  return {
    get bridgeId() { return bridge.bridgeId; },
    get technique() { return bridge.technique; },
    get nativeAvailable() { return bridge.nativeAvailable; },
    manifest,
    attestation,
    initialize: () => bridge.initialize(),
    shutdown: () => bridge.shutdown(),
    execute: (op: BridgeOp): BridgeResult => bridge.execute(op),
  };
}
