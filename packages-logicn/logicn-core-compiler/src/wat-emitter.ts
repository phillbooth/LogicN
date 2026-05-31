// =============================================================================
// LogicN Phase 19 — WAT Emitter (WebAssembly Text Format)
//
// Emits WebAssembly Text Format (.wat) from GIR + PassiveExecutionPlan.
// The .wat file is then compiled to binary .wasm via wat2wasm in CI.
//
// WASM architecture rule: all API decisions consider WASM compatibility first.
//
// Two targets:
//   wasm-standalone — pure WASM/WASI, no JS runtime required
//                     Pure flows → WASM functions (zero imports)
//                     Effectful stdlib calls → typed WASM imports (host:*)
//                     Runtime policy limits → WASM memory limits
//
//   wasm-hybrid     — JS capability shell + WASM pure-flow core
//                     JS manages capabilities and audit
//                     WASM handles pure computation (tensors, math, validation)
//
// Phase 19: type skeleton + placeholder stubs only.
//           Full implementation: emit WAT for pure flows first.
// Phase 22: complete effectful flows + WASI import table.
// =============================================================================

// ---------------------------------------------------------------------------
// Phase 22A — WASM SIMD capability types
// ---------------------------------------------------------------------------

/**
 * Describes the WASM SIMD (v128) capability available on the target platform.
 * Used by the kernel fusion planner to select SIMD vs scalar code paths.
 *
 * laneWidth is always 128 (per WASM SIMD spec: v128 = 128-bit vector).
 */
export interface WASMSIMDCapability {
  readonly available: boolean;
  readonly supportedOps: readonly ("v128.add" | "v128.mul" | "f32x4.add" | "f32x4.mul" | "i8x16.add")[];
  readonly laneWidth: 128;
}

/**
 * Default WASM SIMD capability — disabled until the runtime feature-detects
 * v128 support. Phase 22A: override with buildWATModule options.
 */
export const DEFAULT_WASM_SIMD: WASMSIMDCapability = {
  available: false,
  supportedOps: [],
  laneWidth: 128,
} as const;

/**
 * All WASM SIMD instructions that the LogicN compiler may emit.
 * Phase 22A: type definition. Phase 22B: used by kernel fusion emitter.
 */
export type WATSIMDInstruction =
  | "f32x4.add"
  | "f32x4.mul"
  | "f32x4.sqrt"
  | "i8x16.add"
  | "v128.load"
  | "v128.store";

// ---------------------------------------------------------------------------
// WAT module types
// ---------------------------------------------------------------------------

/** A WebAssembly function type (parameter and result types). */
export interface WATFuncType {
  readonly params: readonly WATValType[];
  readonly results: readonly WATValType[];
}

/** WebAssembly value types. */
export type WATValType = "i32" | "i64" | "f32" | "f64" | "externref" | "funcref";

/** A WebAssembly import (effectful stdlib calls → host imports). */
export interface WATImport {
  readonly module: string;    // e.g. "host"
  readonly name: string;      // e.g. "fs.readText"
  readonly type: WATFuncType;
  /** The LogicN effect this import corresponds to. */
  readonly effect: string;    // e.g. "filesystem.read"
}

/** A WebAssembly export (flow entry points). */
export interface WATExport {
  readonly name: string;
  readonly index: number;
}

/** A WAT function definition. */
export interface WATFunction {
  readonly name: string;
  readonly type: WATFuncType;
  /** WAT instructions as text. Phase 19: stub empty body. */
  readonly body: string;
  /** Whether this function is a pure LogicN flow (zero imports). */
  readonly isPure: boolean;
  /** Whether this function is exported as a WASM entry point. */
  readonly isEntryPoint: boolean;
}

/** A WAT memory declaration (from contract.memory { arena ... }). */
export interface WATMemory {
  /** Minimum pages (1 page = 64KB). */
  readonly minPages: number;
  /** Maximum pages. Enforces runtime policy memory limits. */
  readonly maxPages: number | null;
}

/** A complete WAT module ready for rendering to text or passing to wat2wasm. */
export interface WATModule {
  readonly schemaVersion: "lln.wat.v1";
  readonly sourceHash: string;
  readonly girHash: string;
  readonly imports: readonly WATImport[];
  readonly exports: readonly WATExport[];
  readonly functions: readonly WATFunction[];
  readonly memory: WATMemory;
  /** Target variant: standalone (WASI) or hybrid (JS+WASM). */
  readonly target: "wasm-standalone" | "wasm-hybrid";
}

export interface WATEmitResult {
  readonly module: WATModule;
  /** The rendered .wat text, ready for wat2wasm. */
  readonly wat: string;
  readonly diagnostics: readonly { code: string; message: string }[];
}

// ---------------------------------------------------------------------------
// WATValType mapping from LogicN TypeId
// ---------------------------------------------------------------------------

/**
 * Maps LogicN primitive type names to WASM value types.
 * Used when generating function signatures.
 *
 * Phase 19: covers primitive numeric types.
 * Phase 22: adds struct/array encoding for record types.
 */
export function logicNTypeToWAT(typeName: string): WATValType {
  switch (typeName) {
    case "Bool": case "Int": case "Int8": case "Int16": case "Int32": case "Byte": return "i32";
    case "Int64": case "UInt64": return "i64";
    case "Float16": case "Float32": case "Float": return "f32";
    case "Float64": case "Double": case "Decimal": return "f64";
    default: return "externref"; // records, strings, tensors — passed as externref in hybrid mode
  }
}

// ---------------------------------------------------------------------------
// Default memory config from runtime policy
// ---------------------------------------------------------------------------

/**
 * Default WASM memory limits derived from runtime policy.
 * 1 page = 64KB. Default: 2 pages min (128KB), 2048 pages max (128MB).
 */
export const DEFAULT_WAT_MEMORY: WATMemory = {
  minPages: 2,
  maxPages: 2048, // 128MB — matches runtime policy default
};

// ---------------------------------------------------------------------------
// WAT rendering
// ---------------------------------------------------------------------------

/**
 * Renders a WATModule to WebAssembly Text Format string.
 *
 * Produces a valid .wat skeleton that wat2wasm can compile.
 * Function bodies use (unreachable) as stubs until Phase 22 emission.
 *
 * WAT identifier rules applied:
 *   - "." in import names → "_" in $identifier references
 *   - all string literals use double-quotes as required by WAT spec
 *
 * Phase 19: correct structure + stub bodies.
 * Phase 22: full instruction emission from PassiveExecutionPlan steps.
 */
export function renderWAT(module: WATModule): string {
  const lines: string[] = ["(module"];

  // Memory declaration — "(memory <min> <max>)" is valid WAT.
  // Named memory ($lln_mem) requires WASM multi-memory proposal; use unnamed form
  // for broadest wat2wasm compatibility.
  const maxStr = module.memory.maxPages !== null ? ` ${module.memory.maxPages}` : "";
  lines.push(`  (memory ${module.memory.minPages}${maxStr})`);
  lines.push(`  (export "memory" (memory 0))`);
  lines.push("");

  // Imports — valid WAT import syntax:
  //   (import "module" "name" (func $id (param ...) (result ...)))
  // "." in WAT identifiers is illegal; replace with "_".
  for (const imp of module.imports) {
    const id = `$host_${imp.name.replace(/\./g, "_")}`;
    const paramStr = imp.type.params.map((p, i) => `(param $p${i} ${p})`).join(" ");
    const resultStr = imp.type.results.map((r) => `(result ${r})`).join(" ");
    const sig = [paramStr, resultStr].filter(Boolean).join(" ");
    const funcBody = sig ? `(func ${id} ${sig})` : `(func ${id})`;
    lines.push(`  ;; effect: ${imp.effect}`);
    lines.push(`  (import "${imp.module}" "${imp.name}" ${funcBody})`);
  }
  if (module.imports.length > 0) lines.push("");

  // Function definitions — stub bodies use (unreachable) which is valid WAT.
  // Signature "(result i32)" etc. with unreachable is well-formed because
  // unreachable has type [t1*] → [t2*] (polymorphic bottom type in WASM spec).
  for (const fn of module.functions) {
    const paramStr = fn.type.params.map((p, i) => `(param $p${i} ${p})`).join(" ");
    const resultStr = fn.type.results.map((r) => `(result ${r})`).join(" ");
    const sig = [paramStr, resultStr].filter(Boolean).join(" ");
    const funcSig = sig ? `(func $${fn.name} ${sig}` : `(func $${fn.name}`;
    lines.push(`  ;; ${fn.isPure ? "pure" : "effectful"} flow: ${fn.name}`);
    lines.push(`  ${funcSig}`);
    lines.push(`    unreachable`);
    lines.push(`  )`);
    if (fn.isEntryPoint) {
      lines.push(`  (export "${fn.name}" (func $${fn.name}))`);
    }
    lines.push("");
  }

  lines.push(")");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// GIRProgram → WATModule builder
// ---------------------------------------------------------------------------

/**
 * Minimal GIR flow shape required by buildWATModule.
 * Matches the GIRFlow interface subset needed for WAT lowering.
 */
export interface WATFlowInput {
  readonly name: string;
  /** "pure" flows need no imports. Other qualifiers may have effects. */
  readonly qualifier: string;
  /** Declared effect strings, e.g. ["filesystem.read", "audit.write"]. */
  readonly declaredEffects: readonly string[];
}

/**
 * Minimal GIR program shape for buildWATModule.
 * Avoids a hard import cycle with gir-emitter.ts.
 */
export interface WATGIRInput {
  readonly flows: readonly WATFlowInput[];
  readonly entryPoints: readonly string[];
  readonly girHash?: string;
  readonly sourceHash?: string;
}

/**
 * Maps a STDLIB_CAPABILITY_MAP wasmImport string ("host:fs.readText") to a
 * WATImport. The wasmImport format is "<module>:<name>".
 *
 * All effectful host functions are typed as (param i32 i32) (result i32) in
 * Phase 19. Phase 22 will carry real type signatures from the GIR type table.
 */
function wasmImportStringToWATImport(wasmImport: string, effect: string): WATImport | null {
  const colonIdx = wasmImport.indexOf(":");
  if (colonIdx === -1) return null;
  const module = wasmImport.slice(0, colonIdx);
  const name = wasmImport.slice(colonIdx + 1);
  return {
    module,
    name,
    effect,
    type: { params: ["i32", "i32"], results: ["i32"] },
  };
}

/**
 * Builds a WATModule from GIR program data.
 *
 * Mapping rules:
 *   - Pure flows (qualifier === "pure" and no declaredEffects) → no imports needed.
 *   - Effectful flows → imports derived from declaredEffects, resolved through
 *     STDLIB_CAPABILITY_MAP.wasmImport entries.
 *   - entryPoints → WATExport entries pointing at the matching function.
 *   - All flows → WATFunction stubs (isPure flag set from qualifier).
 *
 * Phase 19: all function bodies are stubs. Full lowering in Phase 22.
 */
export function buildWATModule(
  gir: WATGIRInput,
  capabilityMap: ReadonlyMap<string, { readonly wasmImport?: string; readonly requiredEffects: readonly string[] }>,
  target: "wasm-standalone" | "wasm-hybrid" = "wasm-standalone",
): WATModule {
  // Build deduped import list from effectful flows.
  const importsByKey = new Map<string, WATImport>();

  for (const flow of gir.flows) {
    const isPureFlow = flow.qualifier === "pure" && flow.declaredEffects.length === 0;
    if (isPureFlow) continue;

    for (const effect of flow.declaredEffects) {
      // Find all STDLIB_CAPABILITY_MAP entries whose requiredEffects include this effect
      // and have a wasmImport. We do a linear scan — the map is small (< 100 entries).
      for (const [, entry] of capabilityMap) {
        if (entry.requiredEffects.includes(effect) && entry.wasmImport) {
          const key = entry.wasmImport;
          if (!importsByKey.has(key)) {
            const imp = wasmImportStringToWATImport(entry.wasmImport, effect);
            if (imp) importsByKey.set(key, imp);
          }
        }
      }
    }
  }

  const imports = Array.from(importsByKey.values());

  // Build function stubs.
  const entrySet = new Set(gir.entryPoints);
  const functions: WATFunction[] = gir.flows.map((flow) => ({
    name: flow.name,
    isPure: flow.qualifier === "pure",
    isEntryPoint: entrySet.has(flow.name),
    type: { params: [], results: ["i32"] },
    body: "unreachable",
  }));

  // Build exports from entryPoints, mapped to function indices.
  const flowIndexMap = new Map(gir.flows.map((f, i) => [f.name, i]));
  const exports: WATExport[] = gir.entryPoints
    .map((name) => {
      const idx = flowIndexMap.get(name);
      return idx !== undefined ? { name, index: idx } : null;
    })
    .filter((e): e is WATExport => e !== null);

  return {
    schemaVersion: "lln.wat.v1",
    sourceHash: gir.sourceHash ?? "",
    girHash: gir.girHash ?? "",
    imports,
    exports,
    functions,
    memory: DEFAULT_WAT_MEMORY,
    target,
  };
}

// ---------------------------------------------------------------------------
// Stub emitter entry point
// ---------------------------------------------------------------------------

/**
 * Phase 19 stub: validates GIR structure and produces a skeleton WATModule.
 *
 * Full implementation (Phase 22):
 *   - Emit instructions from PassiveExecutionPlan steps
 *   - Lower Tensor<Float32, [n]> to Float32Array memory layout
 *   - Emit WASM SIMD for pure math flows
 *   - Populate import table from allowedEffectsMask
 */
export function emitWAT(
  _girHash: string,
  _sourceHash: string,
  _flows: readonly { name: string; qualifier: string; declaredEffects: readonly string[] }[],
  target: "wasm-standalone" | "wasm-hybrid",
): WATEmitResult {
  // Phase 19: build a minimal WATModule — no capability map available at this
  // level, so imports are empty. Full population in Phase 22.
  const module: WATModule = {
    schemaVersion: "lln.wat.v1",
    sourceHash: _sourceHash,
    girHash: _girHash,
    imports: [],   // Phase 22: populated via buildWATModule + STDLIB_CAPABILITY_MAP
    exports: [],   // Phase 22: populated from GIR.entryPoints
    functions: _flows.map((f) => ({
      name: f.name,
      isPure: f.qualifier === "pure",
      isEntryPoint: false,
      type: { params: [], results: ["i32"] },
      body: "unreachable",
    })),
    memory: DEFAULT_WAT_MEMORY,
    target,
  };

  return {
    module,
    wat: renderWAT(module),
    diagnostics: [{
      code: "LLN-WAT-STUB",
      message: `WAT emitter Phase 19 stub. Full emission in Phase 22. Target: ${target}. Source hash: ${_sourceHash.slice(0, 20)}...`,
    }],
  };
}
