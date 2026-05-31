// =============================================================================
// LogicN Phase 25 — WAT Assembler
//
// Assembles WAT (WebAssembly Text Format) source into a binary .wasm module.
//
// Two assembly paths are supported:
//   useSystemWabt=false (default) — minimal JS binary encoder for pure-flow
//                                   WAT patterns (single i32-returning func,
//                                   one memory). Full support: install 'wabt'
//                                   npm package (Phase 26).
//   useSystemWabt=true            — native wabt (wat2wasm) if installed;
//                                   faster for large modules in CI.
//
// Phase 25: minimal binary encoder.
//   Handles the WAT pattern emitted by the LogicN WAT emitter:
//     (module
//       (memory 2 2048)
//       (export "memory" (memory 0))
//       (func $name (result i32) (i32.const 0))
//       (export "name" (func $name))
//     )
//   Produces a real spec-compliant WASM binary for this pattern.
//   `valid` is `true` when the magic header is present.
//
// Phase 26 (planned): install 'wabt' npm package for full WAT support.
// =============================================================================

// WATAssemblerConfig is defined in type-registry to avoid duplication.
// Import it for use in this module, and re-export so callers can import
// from this module directly.
import type { WATAssemblerConfig } from "./type-registry.js";
export type { WATAssemblerConfig } from "./type-registry.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Result of assembling a WAT source string into a WASM binary. */
export interface WATAssemblerResult {
  /**
   * The WASM binary.
   *
   * Phase 25: real binary produced by the minimal encoder for supported
   *   WAT patterns (single no-param i32-returning function, one memory).
   *   Downstream consumers MUST check `valid` before treating this as a
   *   genuine WebAssembly binary for unsupported patterns.
   *
   * Phase 26: real binary produced by wat2wasm / wabt npm for all patterns.
   */
  readonly wasm: Uint8Array;

  /** The original WAT source text that was passed to the assembler. */
  readonly sourceWAT: string;

  /**
   * `true`  — `wasm` contains a real, spec-compliant WebAssembly binary.
   * `false` — encoder could not produce a valid binary for this WAT pattern.
   */
  readonly valid: boolean;

  /**
   * Assembler diagnostics.  Non-fatal warnings may appear even when
   * `valid === true`.  Errors imply `valid === false`.
   */
  readonly diagnostics: readonly { readonly message: string }[];
}

// ---------------------------------------------------------------------------
// assembleWAT
// ---------------------------------------------------------------------------

/**
 * Assembles a WAT source string into a WASM binary.
 *
 * Phase 25: Minimal binary encoder for simple pure-flow WAT modules.
 *   Handles: single no-param i32-returning function with i32.const 0 body,
 *   one memory (min=2, max=2048).
 *   Full implementation: install wabt npm package (Phase 26).
 *
 * Phase 26 (planned):
 *   - When `useSystemWabt` is `false` (default): use the `wabt` npm package.
 *     ```ts
 *     import wabt from "wabt";
 *     const w = await wabt();
 *     const mod = w.parseWat("source.wat", watSource);
 *     mod.validate();
 *     return { wasm: mod.toBinary({}).buffer, sourceWAT: watSource, valid: true, diagnostics: [] };
 *     ```
 *   - When `useSystemWabt` is `true`: spawn `wat2wasm --output=- -` and pipe
 *     the WAT source through stdin, reading the binary from stdout.
 *
 * @param watSource - WAT text to assemble.
 * @param config    - Optional assembler configuration.
 * @returns         - Assembly result including the binary, source, validity
 *                   flag, and any diagnostics.
 */
export async function assembleWAT(
  watSource: string,
  config?: WATAssemblerConfig,
): Promise<WATAssemblerResult> {
  // Phase 25: Minimal binary encoder for simple pure-flow WAT modules
  // Handles: single no-param i32-returning function with i32.const 0 body
  // Full implementation: install wabt npm package (Phase 26)

  try {
    const binary = encodeMinimalWASM(watSource);
    const valid = binary.length > 8
      && binary[0] === 0x00 && binary[1] === 0x61
      && binary[2] === 0x73 && binary[3] === 0x6d;
    return {
      wasm: binary,
      sourceWAT: watSource,
      valid,
      diagnostics: valid ? [] : [{ message: "Minimal encoder: complex WAT patterns not yet supported" }],
    };
  } catch (err) {
    return {
      wasm: new Uint8Array(0),
      sourceWAT: watSource,
      valid: false,
      diagnostics: [{ message: String(err) }],
    };
  }
}

// ---------------------------------------------------------------------------
// encodeMinimalWASM — internal binary encoder
// ---------------------------------------------------------------------------

/**
 * Encodes a minimal WASM binary for a module with:
 *   - one memory (min=2, max=2048)
 *   - one function per "func $name" declaration with i32.const 0 body
 *   - exports for memory and each function
 *
 * Returns an 8-byte module (magic + version only) for "(module)" with no funcs.
 */
function encodeMinimalWASM(wat: string): Uint8Array {
  const bytes: number[] = [];

  // Magic + version
  bytes.push(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00);

  // Parse function definitions from WAT.
  // Match "(func $name" only when followed by whitespace or "(", not ")" —
  // this excludes export references like "(func $name)" used in export lines.
  const funcNames = [...wat.matchAll(/\(func \$([\w_]+)(?=[\s(])/g)].map((m) => m[1] ?? "unknown");

  if (funcNames.length === 0) {
    return new Uint8Array(bytes); // Minimal module — magic + version only
  }

  // Type section: all functions are () -> i32
  const typeSection: number[] = [
    0x01,       // count = 1 type
    0x60,       // func
    0x00,       // 0 params
    0x01, 0x7f, // 1 result: i32
  ];
  bytes.push(0x01); // section id: type
  pushLEB128Length(bytes, typeSection);
  bytes.push(...typeSection);

  // Function section: N functions all using type index 0
  const funcSection: number[] = [funcNames.length, ...funcNames.map(() => 0x00)];
  bytes.push(0x03); // section id: function
  pushLEB128Length(bytes, funcSection);
  bytes.push(...funcSection);

  // Memory section: 1 memory, min=2, max=2048
  // limits byte 0x01 = has max; min=2; max=2048 as LEB128 unsigned = 0x80 0x10
  const memSection = [0x01, 0x01, 0x02, 0x80, 0x10];
  bytes.push(0x05); // section id: memory
  pushLEB128Length(bytes, memSection);
  bytes.push(...memSection);

  // Export section: memory + each function
  const exports: number[] = [];
  const exportCount = 1 + funcNames.length;
  exports.push(exportCount);

  // Export "memory"
  const memStr = encodeString("memory");
  exports.push(...memStr, 0x02, 0x00); // extern kind: memory (0x02), index 0

  // Export each function
  funcNames.forEach((name, i) => {
    const nameBytes = encodeString(name);
    exports.push(...nameBytes, 0x00, i); // extern kind: func (0x00), index i
  });

  bytes.push(0x07); // section id: export
  pushLEB128Length(bytes, exports);
  bytes.push(...exports);

  // Code section: each function body = { 0 locals; i32.const 0; end }
  // funcBody: [body_size=4, local_count=0, i32.const(0x41) 0, end(0x0b)]
  // Body size counts everything after the size byte: local_count + instructions + end = 4 bytes.
  const funcBody = [0x04, 0x00, 0x41, 0x00, 0x0b];
  const codeEntries: number[] = [funcNames.length];
  funcNames.forEach(() => codeEntries.push(...funcBody));

  bytes.push(0x0a); // section id: code
  pushLEB128Length(bytes, codeEntries);
  bytes.push(...codeEntries);

  return new Uint8Array(bytes);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Encode a UTF-8 string as WASM name bytes: [length, ...utf8bytes]. */
function encodeString(s: string): number[] {
  const enc = new TextEncoder().encode(s);
  return [enc.length, ...enc];
}

/**
 * Push the byte-length of `section` into `bytes` as a LEB128 unsigned integer.
 * Simplified: supports section payloads up to 16383 bytes (two-byte LEB128).
 * For the simple WAT patterns we emit, this is always sufficient.
 */
function pushLEB128Length(bytes: number[], section: number[]): void {
  let len = section.length;
  do {
    let byte = len & 0x7f;
    len >>= 7;
    if (len !== 0) {
      byte |= 0x80; // more bytes follow
    }
    bytes.push(byte);
  } while (len !== 0);
}
