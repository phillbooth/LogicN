// =============================================================================
// LogicN — .lmanifest Generator (DRCM Phase 1 — task #33)
//
// Generates a machine-verifiable governance manifest alongside compiled output.
// The manifest captures: source hash, derived constraints, proof obligations,
// and governance signatures — enabling QSA verification without reading source.
//
// SERIALISATION: RFC 8785 Canonical JSON
//   - Keys sorted lexicographically
//   - No extra whitespace
//   - Unicode escapes for control characters U+0000-U+001F
//   - Deterministic: two runs on the same input produce byte-identical output
//
// Reference:
//   - logicn-engineering-goals.md (Pattern 9 — .lmanifest)
//   - logicn-deterministic-runtime-containment.md (Phase 3)
//   - RFC 8785: https://www.rfc-editor.org/rfc/rfc8785
// =============================================================================

import { createHash } from "node:crypto";
import type { GovernanceVerifyResult } from "./governance-verifier.js";
import type { FlowMeta } from "./parser.js";

export const MANIFEST_SCHEMA_VERSION = "lln.manifest.v1";

export interface LManifest {
  readonly schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  readonly sourceHash: string;
  readonly sourceFile: string;
  readonly flowCount: number;
  readonly derivedConstraints: readonly string[];
  readonly proofObligations: readonly ProofObligation[];
  readonly governanceSignature: ManifestSignature;
  readonly generatedAt: string;
}

export interface ProofObligation {
  readonly flowName: string;
  readonly kind: string;
  readonly description: string;
  readonly verified: "static" | "runtime-precheck" | "pending";
}

export interface ManifestSignature {
  readonly algorithm: "Ed25519+ML-DSA-65";
  /** Ed25519 signature over the canonical JSON (hex) — placeholder until signing key ships */
  readonly ed25519: string;
  /** ML-DSA-65 post-quantum signature (NIST FIPS 204) — placeholder until key custody spec (#34) */
  readonly mlDsa65: string;
  readonly signerNote: string;
}

// ---------------------------------------------------------------------------
// RFC 8785 Canonical JSON
// ---------------------------------------------------------------------------

/**
 * Produce RFC 8785-compliant canonical JSON.
 * Keys sorted lexicographically, no extra whitespace, control chars escaped.
 */
export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("RFC 8785: non-finite numbers not allowed");
    return String(value);
  }
  if (typeof value === "string") return canonicalJsonString(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (typeof value === "object") {
    // Sort keys lexicographically (RFC 8785 §3.2.3)
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const pairs = keys.map(k =>
      canonicalJsonString(k) + ":" + canonicalJson((value as Record<string, unknown>)[k])
    );
    return "{" + pairs.join(",") + "}";
  }
  throw new Error(`RFC 8785: unsupported type ${typeof value}`);
}

/** Escape a string per RFC 8785 §3.2.2 */
function canonicalJsonString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x22) { out += '\\"'; continue; }
    if (c === 0x5c) { out += '\\\\'; continue; }
    if (c < 0x20) {
      // Control characters must be escaped
      out += "\\u" + c.toString(16).padStart(4, "0");
      continue;
    }
    out += s[i];
  }
  out += '"';
  return out;
}

// ---------------------------------------------------------------------------
// SHA-256 source hash
// ---------------------------------------------------------------------------

export function sha256Hex(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Manifest generation
// ---------------------------------------------------------------------------

/**
 * Generate a .lmanifest from compilation results.
 *
 * The manifest is serialised using RFC 8785 canonical JSON for deterministic
 * hashing. Two runs on identical input produce byte-identical output.
 *
 * NOTE: Actual ML-DSA-65 signing requires key custody infrastructure (#34).
 * Until that ships, signatures are placeholder hashes of the canonical content.
 */
export function generateManifest(
  source: string,
  sourceFile: string,
  flows: readonly FlowMeta[],
  govResult?: GovernanceVerifyResult,
  generatedAt?: string,
): LManifest {
  const sourceHash = `sha256:${sha256Hex(source)}`;

  // Derived constraints from ProofGraph (taint rules that proved clean at compile time)
  const derivedConstraints: string[] = [];
  if (govResult?.proofGraphs !== undefined) {
    for (const [flowName, graph] of govResult.proofGraphs) {
      // Extract satisfied obligations as derived constraints
      for (const obligation of graph.obligations ?? []) {
        derivedConstraints.push(`${flowName}: ${obligation.claim} [via ${obligation.satisfiedBy}]`);
      }
    }
  }

  // Add secret sink constraints from flows that declare secrets
  for (const flow of flows) {
    if (flow.declaredEffects.includes("secret.read") || flow.declaredEffects.includes("secret.access")) {
      derivedConstraints.push(
        `${flow.name}: SecureString never_reaches [network.outbound, audit.log, serialization]`
      );
    }
  }

  // Proof obligations from governance verification
  const proofObligations: ProofObligation[] = [];
  for (const flow of flows) {
    proofObligations.push({
      flowName: flow.name,
      kind: "effect-safety",
      description: `${flow.qualifier} flow declares effects [${flow.declaredEffects.join(", ") || "none"}]`,
      verified: "static",
    });
  }
  if (govResult?.proofObligations !== undefined) {
    for (const obligation of govResult.proofObligations) {
      proofObligations.push({
        flowName: obligation,
        kind: "governance-obligation",
        description: obligation,
        verified: "static",
      });
    }
  }

  // Compute canonical JSON of the manifest body (without signature)
  // This is what the signature covers.
  const manifestBody: Omit<LManifest, "governanceSignature"> = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    sourceHash,
    sourceFile: sourceFile.replace(/\\/g, "/"),
    flowCount: flows.length,
    derivedConstraints: [...derivedConstraints].sort(),
    proofObligations,
    generatedAt: generatedAt ?? new Date().toISOString(),
  };

  const canonicalBody = canonicalJson(manifestBody);
  const bodyHash = sha256Hex(canonicalBody);

  // Placeholder signatures — real ML-DSA-65 signing requires key custody (#34)
  const governanceSignature: ManifestSignature = {
    algorithm: "Ed25519+ML-DSA-65",
    ed25519: `placeholder:sha256:${bodyHash}`,
    mlDsa65: `placeholder:sha256:${bodyHash}`,
    signerNote:
      "Placeholder signatures — real ML-DSA-65 signing requires key custody spec (DRCM task #34). " +
      "The canonical JSON body hash above is stable and verifiable today.",
  };

  return {
    ...manifestBody,
    governanceSignature,
  };
}

/**
 * Serialise a manifest as RFC 8785 canonical JSON.
 * Returns the string that should be written to the .lmanifest file.
 */
export function serializeManifest(manifest: LManifest): string {
  // RFC 8785: canonical, deterministic, no extra whitespace
  return canonicalJson(manifest);
}

/**
 * Pretty-print a manifest for human display (not for signing — use serializeManifest).
 *
 * Output format:
 *   build/name.lmanifest      — RFC 8785 canonical JSON (signing target; will upgrade to binary CBOR)
 *   build/name.lmanifest.json — Pretty-printed JSON for human inspection
 *
 * When binary CBOR encoder ships (task #67), `.lmanifest` becomes binary and
 * `.lmanifest.json` remains as the human-readable companion.
 */
export function prettyManifest(manifest: LManifest): string {
  return JSON.stringify(manifest, null, 2);
}

/**
 * CBOR Tag Registry (tags 400-499 are LogicN-reserved per logicn-cbor-manifest-spec.md).
 * Used as metadata reference until binary CBOR encoder ships in task #67.
 */
export const LOGICN_CBOR_TAGS = {
  Capability:          400,
  Effect:              401,
  SecretHandle:        402,
  ProofObligation:     403,
  GovernanceSignature: 404,
  DomainGuardRef:      405,
  ResilienceState:     406,
  ObservabilitySpan:   407,
  EconomicsLease:      408,
  // 409-499: Reserved for future experimental types (ZkProofEvidence, FheCircuitRef, etc.)
} as const;
