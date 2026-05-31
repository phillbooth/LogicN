// =============================================================================
// LogicN Phase 25 — WAT Assembler
//
// Assembles WAT (WebAssembly Text Format) source into a binary .wasm module.
//
// Two assembly paths are supported:
//   useSystemWabt=false (default) — JS-based assembler via npm package
//                                   (@webassemblyjs/wasm-edit or wabt npm)
//   useSystemWabt=true            — native wabt (wat2wasm) if installed;
//                                   faster for large modules in CI.
//
// Phase 25A: stub implementation.
//   Returns the WAT source encoded as UTF-8 in the `wasm` field together
//   with metadata that downstream code can use to detect the stub.
//   The `valid` field is `false` when the real assembler is not available.
//
// Phase 25B: wire in actual binary assembly.
//   Install the `wabt` npm package and call `wabt().then(w => w.parseWat(...))`
//   to produce a real binary Uint8Array.
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
   * Phase 25A (stub): contains the WAT source text encoded as UTF-8.
   *   Downstream consumers MUST check `valid` before treating this as a
   *   genuine WebAssembly binary.
   *
   * Phase 25B: real binary produced by wat2wasm / wabt npm.
   */
  readonly wasm: Uint8Array;

  /** The original WAT source text that was passed to the assembler. */
  readonly sourceWAT: string;

  /**
   * `true`  — `wasm` contains a real, spec-compliant WebAssembly binary.
   * `false` — stub mode: `wasm` contains the UTF-8-encoded WAT source.
   *           Do NOT pass to `WebAssembly.instantiate` without upgrading to
   *           Phase 25B.
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
 * Phase 25A stub behaviour:
 *   - The WAT source is encoded as UTF-8 and returned in `wasm`.
 *   - `valid` is `false` so callers know this is not a real binary.
 *   - A single diagnostic explains the situation and points to Phase 25B.
 *
 * Phase 25B (planned):
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
  // Phase 25A — stub: encode WAT as UTF-8 and mark as invalid binary.
  // Phase 25B will replace this body with a real wat2wasm call.

  const useSystemWabt = config?.useSystemWabt ?? false;

  const diagnostics: { readonly message: string }[] = [
    {
      message:
        `assembleWAT: Phase 25A stub — real binary assembly not yet wired in. `
        + `Install the 'wabt' npm package and replace this stub in Phase 25B. `
        + `useSystemWabt=${String(useSystemWabt)}`,
    },
  ];

  // Encode the WAT source as UTF-8 so downstream code can at least recover
  // the text when debugging.
  const encoder = new TextEncoder();
  const wasmBytes = encoder.encode(watSource);

  return {
    wasm: wasmBytes,
    sourceWAT: watSource,
    valid: false,
    diagnostics,
  };
}
