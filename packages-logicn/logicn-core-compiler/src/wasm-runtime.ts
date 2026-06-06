/**
 * wasm-runtime.ts — the P9 WASM execution harness, built as a SECURITY ADMISSION
 * GATE rather than a generic module loader (#105).
 *
 * The discipline (locked design, see logicn-build-roadmap.md "Next up"):
 *   1. ATTESTATION FIRST. A binary is verified BEFORE any host function is linked.
 *      An unsigned / tampered / unpinned module throws CRITICAL_SECURITY_VIOLATION
 *      and never reaches `WebAssembly.instantiate` — so host capabilities are never
 *      handed to unattested code.
 *   2. CLOSED-ALLOWLIST IMPORTS. The instance receives ONLY the host functions in
 *      the runtime's import object (`{ host: { __array_create, … } }`). No ambient
 *      globalThis / Node scope crosses the boundary — the WASI capability principle.
 *   3. ENFORCEMENT IS INVARIANT; only OBSERVABILITY changes between dev and prod.
 *      Dev passes an `Observer` (host-call log, trap memory dump); prod passes none.
 *      Neither path can skip the attestation or allowlist — there is no "dev bypass".
 *
 * Crypto is Ed25519 via node:crypto (the same primitive the Tower uses for bridge
 * attestation; the compiler signs its own runner artifacts, it does not import the
 * Tower). This keeps the layering clean: compiler → node:crypto, never → tower.
 */

import {
  sign as edSign, verify as edVerify, generateKeyPairSync, createHash,
} from "node:crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Attestation (Ed25519 over the raw .wasm binary)
// ─────────────────────────────────────────────────────────────────────────────

export interface AdmissionPolicy {
  /** Require a valid Ed25519 signature over the wasm binary. */
  readonly requireSigned?: boolean;
  /** PEM SPKI public key used to verify the signature. */
  readonly publicKeyPem?: string;
  /** Optional sha256 allow-list — pin the exact binary(ies) permitted. */
  readonly allowedHashes?: readonly string[];
  /**
   * Require the attestation's declared profile to be "certified". A dev/ephemeral
   * attestation is then refused — the production gate. Default off (dev harness).
   */
  readonly requireCertifiedProfile?: boolean;
}

export type RunnerProfile = "dev" | "certified";

export interface WasmAttestation {
  /** sha256 hex of the wasm binary (the signing pre-image). */
  readonly sha256: string;
  /** base64 Ed25519 signature over the binary. Absent ⇒ unsigned. */
  readonly signature?: string;
  /** Provenance profile — "dev" for an ephemeral runner key, "certified" for a pinned release. */
  readonly profile: RunnerProfile;
}

export interface AdmissionVerdict {
  readonly ok: boolean;
  readonly reason?: string;
  readonly hash: string;
}

/** sha256 hex of a wasm binary. */
export function wasmHash(wasm: Uint8Array): string {
  return createHash("sha256").update(wasm).digest("hex");
}

/** Generate an Ed25519 runner keypair (PEM). The dev harness mints an ephemeral one
 *  per run; a release pins the public key into the production AdmissionPolicy. */
export function generateRunnerKeypair(): { publicKeyPem: string; privateKeyPem: string } {
  // PEM-encoded form (matches src/attestation.ts) — node:crypto signs with the PEM
  // key directly, so no createPrivateKey/createPublicKey is needed.
  const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKeyPem: publicKey, privateKeyPem: privateKey };
}

/** Sign a wasm binary, producing an attestation. */
export function signWasm(
  wasm: Uint8Array, privateKeyPem: string, profile: RunnerProfile = "dev",
): WasmAttestation {
  const sha256 = wasmHash(wasm);
  const sig = edSign(null, Buffer.from(wasm) as unknown as BufferSource, { key: privateKeyPem, dsaEncoding: "ieee-p1363" });
  return { sha256, signature: Buffer.from(sig).toString("base64"), profile };
}

/**
 * Verify a wasm attestation against a policy. Fails CLOSED — a missing attestation,
 * a hash mismatch, an unpinned hash, a bad signature, or a profile shortfall all
 * return { ok: false }. Pure check; performs NO instantiation.
 */
export function verifyWasm(
  wasm: Uint8Array, attestation: WasmAttestation | undefined, policy: AdmissionPolicy,
): AdmissionVerdict {
  const hash = wasmHash(wasm);
  if (!attestation) return { ok: false, reason: "no attestation provided", hash };
  if (attestation.sha256 !== hash) {
    return { ok: false, reason: `attestation hash ${attestation.sha256} ≠ binary hash ${hash}`, hash };
  }
  if (policy.requireCertifiedProfile && attestation.profile !== "certified") {
    return { ok: false, reason: `certified profile required, attestation is "${attestation.profile}"`, hash };
  }
  if (policy.allowedHashes && policy.allowedHashes.length > 0 && !policy.allowedHashes.includes(hash)) {
    return { ok: false, reason: `binary hash not pinned: ${hash}`, hash };
  }
  if (policy.requireSigned) {
    if (!attestation.signature) return { ok: false, reason: "signature required but absent", hash };
    if (!policy.publicKeyPem) return { ok: false, reason: "no public key configured to verify signature", hash };
    try {
      const ok = edVerify(
        null,
        Buffer.from(wasm) as unknown as BufferSource,
        { key: policy.publicKeyPem, dsaEncoding: "ieee-p1363" },
        Buffer.from(attestation.signature, "base64") as unknown as BufferSource,
      );
      if (!ok) return { ok: false, reason: "signature verification failed", hash };
    } catch (e) {
      return { ok: false, reason: `signature check error: ${(e as Error).message}`, hash };
    }
  }
  return { ok: true, hash };
}

// ─────────────────────────────────────────────────────────────────────────────
// Observability (dev lens only — never affects enforcement)
// ─────────────────────────────────────────────────────────────────────────────

export interface Observer {
  /** Each host-import call: name, args, return value. */
  readonly onHostCall?: (name: string, args: readonly number[], ret: number | undefined) => void;
  /** Attestation refusal — fired BEFORE any instantiation, with the rejected binary. */
  readonly onViolation?: (reason: string, wasm: Uint8Array) => void;
  /** A WASM trap (e.g. `unreachable`) — receives a snapshot of linear memory. */
  readonly onTrap?: (err: unknown, memory: Uint8Array | null) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Closed host runtime — the ONLY capabilities a module can reach
// ─────────────────────────────────────────────────────────────────────────────

export interface HostRuntime {
  /** The closed import object handed to WebAssembly.instantiate. */
  readonly imports: WebAssembly.Imports;
  /** Register an input string, returning its i32 handle. */
  internString(s: string): number;
  /** Resolve a string handle (created by the host or by `__int_to_str`). */
  readString(handle: number): string | undefined;
  /** Resolve an array handle (created by `__array_create`) to its element list. */
  readArray(handle: number): readonly number[] | undefined;
  /** Bind the instance's exported memory after instantiation (for record reads). */
  bindMemory(memory: WebAssembly.Memory): void;
  /** Read field `slot` (0-based i32 slots) of a record at linear-memory `ptr`. */
  readRecordField(ptr: number, slot: number): number;
  /** A snapshot of linear memory (for the trap observer). null before bindMemory. */
  snapshotMemory(): Uint8Array | null;
}

/**
 * Build the closed host runtime for the self-hosted lexer's 4-function surface:
 *   __array_create() → handle · __array_append(handle, item) → () ·
 *   __str_char_at(strHandle, idx) → charCode · __int_to_str(n) → strHandle
 *
 * Strings and arrays live in host-side registries (handles are i32 indices); records
 * live in the module's linear memory (P9.4b) and are read via readRecordField. This
 * mirrors the interpreter's value model: chars are code points, strings are interned.
 */
export function createHostRuntime(observe?: Observer): HostRuntime {
  const strings: string[] = [];
  const arrays: number[][] = [];
  let memory: WebAssembly.Memory | null = null;

  const tap = (name: string, args: number[], ret: number | undefined): number | undefined => {
    observe?.onHostCall?.(name, args, ret);
    return ret;
  };

  const host: Record<string, (...a: number[]) => number | void> = {
    __array_create: () => {
      const id = arrays.length; arrays.push([]);
      return tap("__array_create", [], id) as number;
    },
    __array_append: (id: number, item: number) => {
      (arrays[id] ?? (arrays[id] = [])).push(item);
      // #145a: return the array handle so `arr = arr.append(x)` lowers cleanly.
      return tap("__array_append", [id, item], id) as number;
    },
    __str_char_at: (strHandle: number, idx: number) => {
      const s = strings[strHandle] ?? "";
      const code = idx >= 0 && idx < s.length ? s.charCodeAt(idx) : -1;
      return tap("__str_char_at", [strHandle, idx], code) as number;
    },
    __int_to_str: (n: number) => {
      const id = strings.length; strings.push(String(n | 0));
      return tap("__int_to_str", [n], id) as number;
    },
  };

  return {
    imports: { host },
    internString(s: string): number {
      const id = strings.length; strings.push(s); return id;
    },
    readString(handle: number) { return strings[handle]; },
    readArray(handle: number) { return arrays[handle]; },
    bindMemory(m: WebAssembly.Memory) { memory = m; },
    readRecordField(ptr: number, slot: number): number {
      if (memory === null) throw new Error("readRecordField before bindMemory");
      return new Int32Array(memory.buffer)[(ptr >>> 2) + slot] ?? 0;
    },
    snapshotMemory(): Uint8Array | null {
      return memory === null ? null : new Uint8Array(memory.buffer.slice(0));
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The admission gate
// ─────────────────────────────────────────────────────────────────────────────

export interface AdmissionResult {
  readonly instance: WebAssembly.Instance;
  readonly host: HostRuntime;
  readonly hash: string;
}

/**
 * Admit and instantiate a wasm module. Verifies the attestation FIRST (fail-closed,
 * before host linking), then instantiates with ONLY the closed host import object.
 * Throws `CRITICAL_SECURITY_VIOLATION: …` on any attestation failure — and fires
 * `observe.onViolation` with the rejected binary before throwing.
 */
export async function admitAndInstantiate(opts: {
  wasm: Uint8Array;
  attestation: WasmAttestation | undefined;
  policy: AdmissionPolicy;
  host: HostRuntime;
  observe?: Observer;
}): Promise<AdmissionResult> {
  const verdict = verifyWasm(opts.wasm, opts.attestation, opts.policy);
  if (!verdict.ok) {
    // Attestation First: dump state and refuse BEFORE any host function is linked.
    opts.observe?.onViolation?.(verdict.reason ?? "attestation failed", opts.wasm);
    throw new Error(`CRITICAL_SECURITY_VIOLATION: ${verdict.reason ?? "attestation failed"} (hash=${verdict.hash})`);
  }
  const wasmResult: unknown = await WebAssembly.instantiate(opts.wasm as BufferSource, opts.host.imports);
  const instance = (wasmResult as { instance?: WebAssembly.Instance }).instance
    ?? (wasmResult as WebAssembly.Instance);
  const mem = (instance.exports as Record<string, unknown>)["memory"];
  if (mem instanceof WebAssembly.Memory) opts.host.bindMemory(mem);
  return { instance, host: opts.host, hash: verdict.hash };
}
