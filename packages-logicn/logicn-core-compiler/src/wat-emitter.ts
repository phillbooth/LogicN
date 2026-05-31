// =============================================================================
// LogicN Phase 19 / Phase 22 — WAT Emitter (WebAssembly Text Format)
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

import { STDLIB_CAPABILITY_MAP } from "./stdlib-registry.js";

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

/**
 * A named WAT parameter — carries both the $identifier and the value type.
 * Phase 22: used by emitWATBody to emit (local.get $p0) instructions.
 */
export interface WATParamDef {
  readonly name: string;    // e.g. "$p0"
  readonly type: WATValType;
}

/** A WAT function definition. */
export interface WATFunction {
  readonly name: string;
  readonly type: WATFuncType;
  /**
   * WAT instructions as text.
   * Phase 19: stub bodies use "unreachable".
   * Phase 22: pure flows use real instructions emitted by emitWATBody.
   */
  readonly body: string;
  /** Whether this function is a pure LogicN flow (zero imports). */
  readonly isPure: boolean;
  /** Whether this function is exported as a WASM entry point. */
  readonly isEntryPoint: boolean;
  /**
   * Named parameters for this function.
   * Phase 22: present for pure flows; enables emitWATBody to reference locals.
   * When absent, renderWAT falls back to index-based $p0, $p1, … names.
   */
  readonly namedParams?: readonly WATParamDef[];
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

  // Function definitions.
  // Pure flows with a real body (fn.body !== "unreachable") emit actual instructions.
  // All other flows use (unreachable) which is valid WAT — polymorphic bottom type.
  // Signature "(result i32)" etc. with unreachable is well-formed per WASM spec.
  for (const fn of module.functions) {
    // Build param strings: prefer namedParams when present (pure flows), else index-based.
    const paramStr = fn.namedParams !== undefined
      ? fn.namedParams.map((p) => `(param ${p.name} ${p.type})`).join(" ")
      : fn.type.params.map((p, i) => `(param $p${i} ${p})`).join(" ");
    const resultStr = fn.type.results.map((r) => `(result ${r})`).join(" ");
    const sig = [paramStr, resultStr].filter(Boolean).join(" ");
    const funcSig = sig ? `(func $${fn.name} ${sig}` : `(func $${fn.name}`;
    lines.push(`  ;; ${fn.isPure ? "pure" : "effectful"} flow: ${fn.name}`);
    lines.push(`  ${funcSig}`);
    // Use the real body when available; fall back to unreachable for stubs.
    if (fn.body !== "unreachable" && fn.body.trim().length > 0) {
      // Indent each instruction line with 4 spaces inside the function.
      for (const bodyLine of fn.body.split("\n")) {
        if (bodyLine.trim().length > 0) {
          lines.push(`    ${bodyLine}`);
        }
      }
    } else {
      lines.push(`    unreachable`);
    }
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
// Pure-flow WAT body emitter (Phase 22)
// ---------------------------------------------------------------------------

/**
 * Emits real WAT instructions for a pure flow from its PassiveExecutionPlan.
 *
 * Pure flows have no effects, no capability calls, no I/O — only math, string
 * ops, and returns. This function converts the plan's steps to WAT instructions.
 *
 * Mapping rules:
 *   validate_param  → ignored at WAT level (compile-time check already done)
 *   validate_context → ignored at WAT level
 *   capability_call  → should not appear in pure flows; emitted as unreachable
 *   emit_event       → ignored at WAT level (no I/O in pure flows)
 *   response         → treated as return
 *   return           → emit (local.get $p0) for first param, then (return)
 *
 * For the simplest pure flow (identity: takes param, returns it):
 *   (local.get $p0)
 *
 * Phase 22: full expression lowering (arithmetic, string ops) deferred to
 * Phase 22B when the GIR carries typed expression trees.
 *
 * @param plan    - The pre-verified PassiveExecutionPlan for this pure flow.
 * @param paramCount - Number of parameters the function accepts.
 * @returns WAT instruction text (one instruction per line, no surrounding parens).
 */
export function emitWATBody(
  plan: { readonly steps: ReadonlyArray<{ readonly kind: string }> },
  paramCount: number,
): string {
  const instructions: string[] = [];

  // A pure flow that takes parameters and returns one: get the first parameter.
  // Phase 22B: walk typed expression tree to emit arithmetic/string ops.
  const hasReturn = plan.steps.some(
    (s) => s.kind === "return" || s.kind === "response",
  );

  const hasCapabilityCall = plan.steps.some((s) => s.kind === "capability_call");

  if (hasCapabilityCall) {
    // Capability calls must not appear in pure flows — guard with unreachable.
    instructions.push("unreachable");
    return instructions.join("\n");
  }

  if (hasReturn && paramCount > 0) {
    // Identity-return: get the first parameter and return it.
    // Phase 22B: full expression lowering replaces this with the actual body.
    instructions.push("(local.get $p0)");
  } else if (hasReturn && paramCount === 0) {
    // Return a constant i32 zero when there are no parameters.
    instructions.push("(i32.const 0)");
  } else {
    // No return step — unreachable (should not happen for well-formed plans).
    instructions.push("unreachable");
  }

  return instructions.join("\n");
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
  /**
   * Declared effect strings — flat array form (WATFlowInput native).
   * When passing GIRFlow directly, use effects.declared instead.
   * The builder accepts either form.
   */
  readonly declaredEffects?: readonly string[];
  /**
   * GIR-native nested effects object. Accepted alongside declaredEffects.
   * buildWATModule resolves: declaredEffects ?? effects?.declared ?? []
   */
  readonly effects?: { readonly declared: readonly string[] };
  /**
   * Parameter type names, e.g. ["Int", "String"].
   * Phase 22: used to build named WAT params ($p0, $p1, …) and for emitWATBody.
   * Optional — absent flows get a default (i32) parameter signature.
   */
  readonly paramTypes?: readonly string[];
  /**
   * Pre-built PassiveExecutionPlan for this flow.
   * When present for a pure flow, emitWATBody is called to produce real instructions.
   * When absent, the body falls back to "unreachable".
   */
  readonly executionPlan?: { readonly steps: ReadonlyArray<{ readonly kind: string }> };
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
 * Returns WATImport entries for the given declared effect names, resolved
 * through STDLIB_CAPABILITY_MAP.
 *
 * For each declared effect, scans all STDLIB_CAPABILITY_MAP entries whose
 * requiredEffects include that effect and have a wasmImport field.
 * Results are deduplicated by wasmImport key.
 *
 * All effectful host functions are typed as (param i32 i32) (result i32) in
 * Phase 19. Phase 22 will carry real type signatures from the GIR type table.
 *
 * @param effects - Declared effect names, e.g. ["filesystem.read", "audit.write"].
 * @returns Deduplicated WATImport array derived from STDLIB_CAPABILITY_MAP.
 */
export function getWATImportsForEffects(effects: readonly string[]): WATImport[] {
  const importsByKey = new Map<string, WATImport>();
  for (const effect of effects) {
    for (const [, entry] of STDLIB_CAPABILITY_MAP) {
      if (entry.requiredEffects.includes(effect) && entry.wasmImport) {
        const key = entry.wasmImport;
        if (!importsByKey.has(key)) {
          const imp = wasmImportStringToWATImport(entry.wasmImport, effect);
          if (imp) importsByKey.set(key, imp);
        }
      }
    }
  }
  return Array.from(importsByKey.values());
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
  _capabilityMap: ReadonlyMap<string, { readonly wasmImport?: string; readonly requiredEffects: readonly string[] }>,
  target: "wasm-standalone" | "wasm-hybrid" = "wasm-standalone",
): WATModule {
  // Build deduped import list from effectful flows using getWATImportsForEffects.
  // Collect all declared effects across non-pure flows, then resolve via STDLIB_CAPABILITY_MAP.
  const allEffects: string[] = [];
  // Helper to get declared effects from either form
  function getFlowEffects(flow: WATFlowInput): readonly string[] {
    return flow.declaredEffects ?? flow.effects?.declared ?? [];
  }

  for (const flow of gir.flows) {
    const declaredEffects = getFlowEffects(flow);
    const isPureFlow = flow.qualifier === "pure" && declaredEffects.length === 0;
    if (isPureFlow) continue;
    for (const effect of declaredEffects) {
      if (!allEffects.includes(effect)) {
        allEffects.push(effect);
      }
    }
  }
  const imports = getWATImportsForEffects(allEffects);

  // Build function definitions.
  // Pure flows (qualifier === "pure", no declaredEffects) get real WAT bodies via emitWATBody.
  // All other flows get "unreachable" stub bodies (Phase 22 effectful emission TBD).
  const entrySet = new Set(gir.entryPoints);
  const functions: WATFunction[] = gir.flows.map((flow) => {
    const flowDeclaredEffects = getFlowEffects(flow);
    const isPureFlow = flow.qualifier === "pure" && flowDeclaredEffects.length === 0;

    // Build named params from paramTypes (or default to a single i32 when absent).
    const rawParamTypes: readonly string[] = flow.paramTypes ?? [];
    const namedParams: WATParamDef[] = rawParamTypes.map((typeName, i) => ({
      name: `$p${i}`,
      type: logicNTypeToWAT(typeName),
    }));
    // WATFuncType params: just the value types (for type-checking / signature).
    const paramValTypes: WATValType[] = namedParams.map((p) => p.type);

    // Emit a real body for pure flows.
    //
    // Phase 24A progression:
    //   1. executionPlan present → real body from PassiveExecutionPlan steps
    //   2. paramTypes present (WATFlowInput.paramTypes) → identity body (local.get $p0)
    //   3. No params known → minimal valid body (i32.const 0 or nop for void)
    //      This is the Phase 24A foundation: real WAT, not unreachable.
    //      Phase 25: replace with execution-plan-derived bodies once paramTypes flow through GIR.
    //
    // Non-pure flows stay as unreachable until Phase 22 effectful emission.
    let body = "unreachable";
    if (isPureFlow && flow.executionPlan !== undefined) {
      body = emitWATBody(flow.executionPlan, namedParams.length);
    } else if (isPureFlow && rawParamTypes.length > 0) {
      // WATFlowInput.paramTypes was supplied — emit identity body (return first param)
      body = emitWATBody({ steps: [{ kind: "return" }] }, namedParams.length);
    } else if (isPureFlow) {
      // No param info available — emit a minimal constant body.
      // This is real WAT (not unreachable). Phase 25 will replace with real semantics
      // once parameter types flow through the GIR pipeline.
      body = "(i32.const 0) ;; Phase 25: replace with passiveExecutionPlan-derived body";
    }

    return {
      name: flow.name,
      isPure: flow.qualifier === "pure",
      isEntryPoint: entrySet.has(flow.name),
      type: { params: paramValTypes, results: ["i32"] },
      body,
      ...(namedParams.length > 0 ? { namedParams } : {}),
    };
  });

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
// GIRProgram overload — buildWATModuleFromGIR
// ---------------------------------------------------------------------------

/**
 * Builds a WATModule directly from a full GIRProgram.
 *
 * This is the Phase 22 entry point for the compiler pipeline.
 * It extracts the WATGIRInput shape from GIRProgram and delegates to
 * buildWATModule, passing through:
 *   - flow names, qualifiers, and declared effects
 *   - executionPlan from GIRFlow.executionPlan (used by emitWATBody for pure flows)
 *   - entryPoints from GIRProgram.entryPoints
 *   - girHash and sourceHash from GIRProgram
 *
 * Pure flows with no effects and a PassiveExecutionPlan get real WAT bodies.
 * Non-pure flows get unreachable stub bodies.
 *
 * @param gir           - Full GIRProgram from emitGIR.
 * @param capabilityMap - STDLIB_CAPABILITY_MAP for resolving effectful imports.
 * @param target        - WASM target variant.
 */
export function buildWATModuleFromGIR(
  gir: {
    readonly flows: ReadonlyArray<{
      readonly name: string;
      readonly qualifier: string;
      readonly effects: { readonly declared: readonly string[] };
      readonly executionPlan?: { readonly steps: ReadonlyArray<{ readonly kind: string }> };
    }>;
    readonly entryPoints: readonly string[];
    readonly girHash?: string;
    readonly sourceHash?: string;
  },
  capabilityMap: ReadonlyMap<string, { readonly wasmImport?: string; readonly requiredEffects: readonly string[] }>,
  target: "wasm-standalone" | "wasm-hybrid" = "wasm-standalone",
): WATModule {
  const watInput: WATGIRInput = {
    flows: gir.flows.map((f) => {
      const base: WATFlowInput = {
        name: f.name,
        qualifier: f.qualifier,
        declaredEffects: f.effects.declared,
      };
      if (f.executionPlan !== undefined) {
        return { ...base, executionPlan: f.executionPlan };
      }
      return base;
    }),
    entryPoints: gir.entryPoints,
    ...(gir.girHash !== undefined ? { girHash: gir.girHash } : {}),
    ...(gir.sourceHash !== undefined ? { sourceHash: gir.sourceHash } : {}),
  };
  return buildWATModule(watInput, capabilityMap, target);
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
