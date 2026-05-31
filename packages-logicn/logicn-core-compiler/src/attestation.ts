// =============================================================================
// LogicN Phase 10A — Signed Attestation
//
// Produces a tamper-evident signed artifact that proves:
// "This audit proof came from this exact source, contract, compiler,
//  target plan, and runtime."
//
// Stage 1: Ed25519 signing via node:crypto
// Stage 2 (planned): ML-DSA (FIPS 204), SLH-DSA (FIPS 205)
// =============================================================================

import { createHash, generateKeyPairSync, sign as cryptoSign, verify as cryptoVerify } from "node:crypto";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface LogicNAttestation {
  readonly artifact: "logicn.audit.attestation";
  readonly schemaVersion: "1.0";
  readonly flow: string;
  readonly timestamp: string;
  readonly hashes: {
    readonly source?: string;           // sha256:hex of .lln source
    readonly gir?: string;              // sha256:hex of GIR JSON
    readonly contract?: string;         // sha256:hex of contract block source
    readonly runtimeReport?: string;    // sha256:hex of runtime report
    readonly auditProof?: string;       // sha256:hex of existing proof chain
    readonly executionPlan?: string;    // sha256:hex of PassiveExecutionPlan (Phase 15)
  };
  readonly signature?: {
    readonly algorithm: "Ed25519";
    readonly keyId: string;
    readonly value: string;             // base64-encoded signature
  };
}

export interface AttestationInputs {
  readonly flowName: string;
  readonly sourceText?: string;
  readonly girJson?: string;
  readonly contractSource?: string;
  readonly runtimeReportJson?: string;
  readonly auditProofJson?: string;
  /** Phase 15: planHash string from PassiveExecutionPlan (plain hex, no sha256: prefix). */
  readonly executionPlanHash?: string;
}

export interface AttestationKeyPair {
  readonly keyId: string;
  readonly privateKey: string;   // PEM
  readonly publicKey: string;    // PEM
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** SHA-256 hash a string and return "sha256:<hexdigest>". */
function sha256hex(text: string): string {
  const hash = createHash("sha256").update(text, "utf8").digest("hex");
  return `sha256:${hash}`;
}

/**
 * Produce a canonical JSON string for an object (sorted keys).
 */
function canonicalJson(obj: object): string {
  return JSON.stringify(obj, sortKeysReplacer);
}

function sortKeysReplacer(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as object).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}

// ---------------------------------------------------------------------------
// buildAttestation
// ---------------------------------------------------------------------------

/**
 * Build a LogicNAttestation from the provided inputs.
 * Each non-undefined field is SHA-256 hashed.
 * The returned attestation has no signature — call signAttestation() separately.
 */
export async function buildAttestation(
  inputs: AttestationInputs,
): Promise<LogicNAttestation> {
  const hashes: {
    source?: string;
    gir?: string;
    contract?: string;
    runtimeReport?: string;
    auditProof?: string;
    executionPlan?: string;
  } = {};

  if (inputs.sourceText !== undefined) {
    hashes.source = sha256hex(inputs.sourceText);
  }
  if (inputs.girJson !== undefined) {
    hashes.gir = sha256hex(inputs.girJson);
  }
  if (inputs.contractSource !== undefined) {
    hashes.contract = sha256hex(inputs.contractSource);
  }
  if (inputs.runtimeReportJson !== undefined) {
    hashes.runtimeReport = sha256hex(inputs.runtimeReportJson);
  }
  if (inputs.auditProofJson !== undefined) {
    hashes.auditProof = sha256hex(inputs.auditProofJson);
  }
  if (inputs.executionPlanHash !== undefined) {
    // planHash is already a raw hex digest; prefix it consistently
    hashes.executionPlan = `sha256:${inputs.executionPlanHash}`;
  }

  return {
    artifact: "logicn.audit.attestation",
    schemaVersion: "1.0",
    flow: inputs.flowName,
    timestamp: new Date().toISOString(),
    hashes,
  };
}

// ---------------------------------------------------------------------------
// signAttestation
// ---------------------------------------------------------------------------

/**
 * Sign an attestation using Ed25519 (via node:crypto).
 * The canonical JSON of the attestation WITHOUT the signature field is signed.
 * Returns a new attestation with the signature field populated.
 */
export function signAttestation(
  attestation: LogicNAttestation,
  keyPair: AttestationKeyPair,
): LogicNAttestation {
  // Build the object to sign: all fields except signature
  const { signature: _sig, ...withoutSig } = attestation;
  void _sig;
  const canonical = canonicalJson(withoutSig);

  try {
    const sigBuffer = cryptoSign(
      null,
      Buffer.from(canonical) as unknown as BufferSource,
      { key: keyPair.privateKey, dsaEncoding: "ieee-p1363" },
    );
    const sigValue = Buffer.from(sigBuffer).toString("base64");

    return {
      ...attestation,
      signature: {
        algorithm: "Ed25519",
        keyId: keyPair.keyId,
        value: sigValue,
      },
    };
  } catch (err) {
    throw new Error(
      `signAttestation: signing failed — ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// verifyAttestation
// ---------------------------------------------------------------------------

/**
 * Verify a signed attestation against the provided public key.
 * Returns true if the signature is valid, false otherwise.
 */
export function verifyAttestation(
  attestation: LogicNAttestation,
  publicKey: string,
): boolean {
  if (attestation.signature === undefined) {
    return false;
  }

  const { signature, ...withoutSig } = attestation;
  const canonical = canonicalJson(withoutSig);

  try {
    return cryptoVerify(
      null,
      Buffer.from(canonical) as unknown as BufferSource,
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature.value, "base64") as unknown as BufferSource,
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// generateAttestationKey
// ---------------------------------------------------------------------------

/**
 * Generate a new Ed25519 key pair for use with signAttestation / verifyAttestation.
 */
export function generateAttestationKey(keyId: string): AttestationKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { keyId, privateKey, publicKey };
}

// ---------------------------------------------------------------------------
// attestationToYaml
// ---------------------------------------------------------------------------

/**
 * Serialize a LogicNAttestation to YAML format (manual, no external lib).
 */
export function attestationToYaml(attestation: LogicNAttestation): string {
  const lines: string[] = [];
  lines.push(`artifact: ${attestation.artifact}`);
  lines.push(`schemaVersion: "${attestation.schemaVersion}"`);
  lines.push(`flow: ${attestation.flow}`);
  lines.push(`timestamp: ${attestation.timestamp}`);
  lines.push("hashes:");

  const h = attestation.hashes;
  if (h.source !== undefined)         lines.push(`  source: ${h.source}`);
  if (h.gir !== undefined)            lines.push(`  gir: ${h.gir}`);
  if (h.contract !== undefined)       lines.push(`  contract: ${h.contract}`);
  if (h.runtimeReport !== undefined)  lines.push(`  runtimeReport: ${h.runtimeReport}`);
  if (h.auditProof !== undefined)     lines.push(`  auditProof: ${h.auditProof}`);
  if (h.executionPlan !== undefined)  lines.push(`  executionPlan: ${h.executionPlan}`);

  if (Object.keys(h).length === 0) {
    lines.push("  {}");
  }

  if (attestation.signature !== undefined) {
    lines.push("signature:");
    lines.push(`  algorithm: ${attestation.signature.algorithm}`);
    lines.push(`  keyId: ${attestation.signature.keyId}`);
    lines.push(`  value: ${attestation.signature.value}`);
  }

  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// attestationFromJson
// ---------------------------------------------------------------------------

/**
 * Parse a JSON string into a LogicNAttestation.
 * Validates that artifact and schemaVersion fields are correct.
 */
export function attestationFromJson(json: string): LogicNAttestation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`attestationFromJson: invalid JSON — ${err instanceof Error ? err.message : String(err)}`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("attestationFromJson: expected an object");
  }

  const obj = parsed as Record<string, unknown>;

  if (obj["artifact"] !== "logicn.audit.attestation") {
    throw new Error(
      `attestationFromJson: invalid artifact field "${String(obj["artifact"])}", expected "logicn.audit.attestation"`,
    );
  }

  if (obj["schemaVersion"] !== "1.0") {
    throw new Error(
      `attestationFromJson: unsupported schemaVersion "${String(obj["schemaVersion"])}", expected "1.0"`,
    );
  }

  return obj as unknown as LogicNAttestation;
}
