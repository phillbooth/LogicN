// manifest.ts — the signed-bridge-manifest schema (enables CF-3 attestation).
//
// This package defines the SHAPE and a canonical serialisation; the actual SHA-256
// hashing and signature verification live in the Tower (which has node:crypto), so
// the contract stays zero-dependency and neutral. The Tower computes
// `hash = sha256(canonicalManifestString(m))` and checks it against the active
// contract's allowed bridges before calling `bridge.execute()`.

import type { PrecisionTechnique } from "./precision-types.js";

/** How a bridge's results are trusted to match the reference oracle. */
export type DeterminismMode = "exact" | "sampled" | "unverified";

/** Which runtime profile a bridge is attested for. */
export type CertificationProfile = "dev" | "certified";

/**
 * A bridge's self-description. In certified mode the Tower refuses any bridge
 * whose manifest is missing, structurally invalid, or not on the active
 * contract's allow-list / hash-pin.
 */
export interface BridgeManifest {
  readonly bridgeId:           string;
  readonly packageName:        string;
  readonly packageHash:        string;            // sha256 hex of the bridge package
  readonly nativeAddonHash?:   string;            // sha256 hex of the .node addon, if any
  readonly sourceEngine:       string;            // "microsoft/BitNet", "NVIDIA/TransformerEngine", …
  readonly precision:          PrecisionTechnique;
  readonly layoutVersion:      string;            // packed-ternary layout version
  readonly hardwareIdentity:   string;            // "x86_64-avx2", "cuda-sm_80", "photonic-v0", …
  readonly determinismMode:    DeterminismMode;
  readonly certificationProfile: CertificationProfile;
}

/** A manifest plus its detached signature (verified by the Tower's key authority). */
export interface BridgeAttestation {
  readonly manifest:  BridgeManifest;
  readonly signature?: string; // base64 detached signature over canonicalManifestString(manifest)
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

/**
 * Deterministic, field-ordered serialisation — the pre-image the Tower hashes and
 * signs. Stable ordering guarantees the same manifest always yields the same hash.
 */
export function canonicalManifestString(m: BridgeManifest): string {
  return JSON.stringify([
    m.bridgeId, m.packageName, m.packageHash, m.nativeAddonHash ?? "",
    m.sourceEngine, m.precision, m.layoutVersion, m.hardwareIdentity,
    m.determinismMode, m.certificationProfile,
  ]);
}

/**
 * Structural validation (no crypto). Confirms required fields are present and
 * well-formed (hashes are 64-hex), and that a certified manifest is not in
 * `unverified` determinism mode. Returns { ok, reason }.
 */
export function validateManifestShape(m: BridgeManifest): { ok: boolean; reason?: string } {
  if (!m.bridgeId) return { ok: false, reason: "missing bridgeId" };
  if (!m.packageName) return { ok: false, reason: "missing packageName" };
  if (!SHA256_HEX.test(m.packageHash)) return { ok: false, reason: "packageHash is not a sha256 hex digest" };
  if (m.nativeAddonHash !== undefined && !SHA256_HEX.test(m.nativeAddonHash)) {
    return { ok: false, reason: "nativeAddonHash is not a sha256 hex digest" };
  }
  if (!m.layoutVersion) return { ok: false, reason: "missing layoutVersion" };
  if (m.certificationProfile === "certified" && m.determinismMode === "unverified") {
    return { ok: false, reason: "certified bridge cannot be determinismMode=unverified" };
  }
  return { ok: true };
}
