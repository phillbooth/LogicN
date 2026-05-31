// =============================================================================
// Stdlib Registry Tests (Phase 18H)
//
// Tests for:
//   - STDLIB_CAPABILITY_MAP (effectful functions → required effects + WASM imports)
//   - STDLIB_MODULE_KIND (pure vs effectful classification)
//   - TENSOR_STDLIB_OPS (compute target compatibility flags)
//   - TRI_STDLIB_OPS (TriState operations, photonic compatible)
//   - getStdlibRequiredEffects, getStdlibModuleKind, getStdlibWasmImport
//   - LLN_STDLIB_001 constant shape
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  STDLIB_CAPABILITY_MAP,
  STDLIB_MODULE_KIND,
  TENSOR_STDLIB_OPS,
  TRI_STDLIB_OPS,
  getStdlibRequiredEffects,
  getStdlibModuleKind,
  getStdlibWasmImport,
  LLN_STDLIB_001,
  renderWAT,
  buildWATModule,
  DEFAULT_WAT_MEMORY,
  DEFAULT_WASM_SIMD,
} from "../../dist/index.js";

// ---------------------------------------------------------------------------
// STDLIB_CAPABILITY_MAP
// ---------------------------------------------------------------------------

describe("STDLIB_CAPABILITY_MAP: structure and coverage", () => {
  it("is a Map with entries", () => {
    assert.ok(STDLIB_CAPABILITY_MAP instanceof Map, "Must be a Map");
    assert.ok(STDLIB_CAPABILITY_MAP.size > 0, "Must have entries");
  });

  it("AuditLog.write requires audit.write", () => {
    const entry = STDLIB_CAPABILITY_MAP.get("AuditLog.write");
    assert.ok(entry !== undefined, "AuditLog.write must be in map");
    assert.ok(entry.requiredEffects.includes("audit.write"), "Must require audit.write");
    assert.ok(typeof entry.description === "string", "Must have description");
  });

  it("File.readText requires filesystem.read with WASM import", () => {
    const entry = STDLIB_CAPABILITY_MAP.get("File.readText");
    assert.ok(entry !== undefined);
    assert.ok(entry.requiredEffects.includes("filesystem.read"));
    assert.ok(entry.wasmImport !== undefined, "Must have WASM import name");
    assert.ok(entry.wasmImport?.startsWith("host:"), "WASM import must start with host:");
  });

  it("Http.get requires network.outbound", () => {
    const entry = STDLIB_CAPABILITY_MAP.get("Http.get");
    assert.ok(entry !== undefined);
    assert.ok(entry.requiredEffects.includes("network.outbound"));
  });

  it("Crypto.constantTimeEquals requires no effects (pure)", () => {
    const entry = STDLIB_CAPABILITY_MAP.get("Crypto.constantTimeEquals");
    assert.ok(entry !== undefined);
    assert.equal(entry.requiredEffects.length, 0, "constantTimeEquals must be effect-free");
    assert.equal(entry.wasmImport, undefined, "Pure functions have no WASM import");
  });

  it("Database.insert requires database.write", () => {
    const entry = STDLIB_CAPABILITY_MAP.get("database.insert");
    assert.ok(entry !== undefined);
    assert.ok(entry.requiredEffects.includes("database.write"));
  });

  it("AI.infer requires ai.inference", () => {
    const entry = STDLIB_CAPABILITY_MAP.get("AI.infer");
    assert.ok(entry !== undefined);
    assert.ok(entry.requiredEffects.includes("ai.inference"));
  });
});

// ---------------------------------------------------------------------------
// STDLIB_MODULE_KIND
// ---------------------------------------------------------------------------

describe("STDLIB_MODULE_KIND: pure vs effectful", () => {
  it("pure modules are classified as 'pure'", () => {
    const pureModules = ["String", "Array", "Math", "Decimal", "Tensor", "Tri", "Option", "Result", "Json", "Hash", "Bytes"];
    for (const mod of pureModules) {
      assert.equal(STDLIB_MODULE_KIND.get(mod), "pure", `${mod} must be classified as pure`);
    }
  });

  it("effectful modules are classified as 'effectful'", () => {
    const effectful = ["File", "Http", "AuditLog", "Secrets", "Database", "database", "AI", "EmailService", "Clock"];
    for (const mod of effectful) {
      assert.equal(STDLIB_MODULE_KIND.get(mod), "effectful", `${mod} must be classified as effectful`);
    }
  });

  it("unknown modules return undefined", () => {
    assert.equal(STDLIB_MODULE_KIND.get("MyCustomModule"), undefined);
  });
});

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

describe("getStdlibRequiredEffects: effect lookup", () => {
  it("returns effects for known effectful functions", () => {
    const effects = getStdlibRequiredEffects("File.readText");
    assert.ok(effects !== undefined);
    assert.ok(effects.includes("filesystem.read"));
  });

  it("returns empty array for pure functions", () => {
    const effects = getStdlibRequiredEffects("Crypto.constantTimeEquals");
    assert.ok(effects !== undefined);
    assert.equal(effects.length, 0);
  });

  it("returns undefined for unknown functions", () => {
    const effects = getStdlibRequiredEffects("SomethingUnknown.call");
    assert.equal(effects, undefined);
  });
});

describe("getStdlibModuleKind: module classification", () => {
  it("returns 'pure' for String", () => {
    assert.equal(getStdlibModuleKind("String"), "pure");
  });

  it("returns 'effectful' for Http", () => {
    assert.equal(getStdlibModuleKind("Http"), "effectful");
  });

  it("returns undefined for unknown module", () => {
    assert.equal(getStdlibModuleKind("Unknown"), undefined);
  });
});

describe("getStdlibWasmImport: WASM import name", () => {
  it("returns WASM import name for effectful function", () => {
    const name = getStdlibWasmImport("File.readText");
    assert.ok(name !== undefined, "File.readText must have WASM import");
    assert.ok(name?.startsWith("host:"), "Must start with host:");
  });

  it("returns undefined for pure function", () => {
    const name = getStdlibWasmImport("Crypto.constantTimeEquals");
    assert.equal(name, undefined, "Pure functions have no WASM import");
  });
});

// ---------------------------------------------------------------------------
// TENSOR_STDLIB_OPS
// ---------------------------------------------------------------------------

describe("TENSOR_STDLIB_OPS: tensor operation flags", () => {
  it("is a Map with tensor operation entries", () => {
    assert.ok(TENSOR_STDLIB_OPS instanceof Map);
    assert.ok(TENSOR_STDLIB_OPS.size >= 10, "Must have at least 10 tensor ops");
  });

  it("Tensor.matmul is pure, wasmSimd, gpu, npu compatible", () => {
    const op = TENSOR_STDLIB_OPS.get("Tensor.matmul");
    assert.ok(op !== undefined);
    assert.ok(op.pure, "matmul must be pure");
    assert.ok(op.wasmSimd, "matmul must be WASM SIMD compatible");
    assert.ok(op.gpu, "matmul must be GPU compatible");
    assert.ok(op.npu, "matmul must be NPU compatible");
  });

  it("Tensor.quantize is npu compatible but not gpu (Int8)", () => {
    const op = TENSOR_STDLIB_OPS.get("Tensor.quantize");
    assert.ok(op !== undefined);
    assert.ok(op.pure, "quantize must be pure");
    assert.ok(op.npu, "quantize must be NPU compatible");
    assert.ok(!op.gpu, "quantize must NOT be directly GPU compatible (Int8 GPU needs extension)");
  });

  it("Tensor.relu is pure and compatible with all pure targets", () => {
    const op = TENSOR_STDLIB_OPS.get("Tensor.relu");
    assert.ok(op !== undefined);
    assert.ok(op.pure);
    assert.ok(op.wasmSimd);
    assert.ok(op.gpu);
    assert.ok(op.npu);
    assert.ok(op.apu);
  });

  it("Tensor.toDevice is not pure (transfers to device)", () => {
    const op = TENSOR_STDLIB_OPS.get("Tensor.toDevice");
    assert.ok(op !== undefined);
    assert.ok(!op.pure, "toDevice is not a pure operation");
  });

  it("every op has a description", () => {
    for (const [name, op] of TENSOR_STDLIB_OPS) {
      assert.ok(typeof op.description === "string" && op.description.length > 0,
        `${name} must have a non-empty description`);
    }
  });
});

// ---------------------------------------------------------------------------
// TRI_STDLIB_OPS
// ---------------------------------------------------------------------------

describe("TRI_STDLIB_OPS: TriState operations", () => {
  it("is a Map with TriState operation entries", () => {
    assert.ok(TRI_STDLIB_OPS instanceof Map);
    assert.ok(TRI_STDLIB_OPS.size >= 5);
  });

  it("Tri.and is pure and photonic compatible", () => {
    const op = TRI_STDLIB_OPS.get("Tri.and");
    assert.ok(op !== undefined);
    assert.ok(op.pure, "Tri.and must be pure");
    assert.ok(op.photonicCompatible, "Tri.and must be photonic compatible");
  });

  it("Tri.or is pure and photonic compatible", () => {
    const op = TRI_STDLIB_OPS.get("Tri.or");
    assert.ok(op !== undefined);
    assert.ok(op.pure);
    assert.ok(op.photonicCompatible);
  });

  it("Tri.toBool is NOT photonic compatible (requires explicit policy)", () => {
    const op = TRI_STDLIB_OPS.get("Tri.toBool");
    assert.ok(op !== undefined);
    assert.ok(op.pure, "Tri.toBool is still pure");
    assert.ok(!op.photonicCompatible, "Tri.toBool is not photonic compatible (needs policy decision)");
  });

  it("Tri.match is photonic compatible", () => {
    const op = TRI_STDLIB_OPS.get("Tri.match");
    assert.ok(op !== undefined);
    assert.ok(op.photonicCompatible, "Exhaustive TriState match is photonic compatible");
  });

  it("every op has a description", () => {
    for (const [name, op] of TRI_STDLIB_OPS) {
      assert.ok(typeof op.description === "string" && op.description.length > 0,
        `${name} must have description`);
    }
  });
});

// ---------------------------------------------------------------------------
// LLN_STDLIB_001
// ---------------------------------------------------------------------------

describe("LLN_STDLIB_001: constant shape", () => {
  it("has correct code and name", () => {
    assert.equal(LLN_STDLIB_001.code, "LLN-STDLIB-001");
    assert.equal(LLN_STDLIB_001.name, "StdlibEffectNotDeclared");
    assert.equal(LLN_STDLIB_001.severity, "error");
  });

  it("has why and suggestedFix", () => {
    assert.ok(typeof LLN_STDLIB_001.why === "string");
    assert.ok(LLN_STDLIB_001.suggestedFix.includes("contract"), "suggestedFix must mention contract");
    assert.ok(LLN_STDLIB_001.suggestedFix.includes("effects"), "suggestedFix must mention effects");
  });
});

// ---------------------------------------------------------------------------
// WAT emitter: renderWAT produces valid skeleton
// ---------------------------------------------------------------------------

describe("WAT emitter: renderWAT produces valid skeleton", () => {
  it("output starts with (module and ends with )", () => {
    const mod = buildWATModule(
      { flows: [], entryPoints: [], girHash: "abc", sourceHash: "def" },
      STDLIB_CAPABILITY_MAP,
    );
    const wat = renderWAT(mod);
    assert.ok(wat.startsWith("(module"), "WAT must start with (module");
    assert.ok(wat.trimEnd().endsWith(")"), "WAT must end with )");
  });

  it("output contains (memory with correct page counts", () => {
    const mod = buildWATModule(
      { flows: [], entryPoints: [], girHash: "abc", sourceHash: "def" },
      STDLIB_CAPABILITY_MAP,
    );
    const wat = renderWAT(mod);
    assert.ok(wat.includes("(memory"), "WAT must contain (memory");
    // DEFAULT_WAT_MEMORY is 2 min, 2048 max
    assert.ok(
      wat.includes(`(memory ${DEFAULT_WAT_MEMORY.minPages} ${DEFAULT_WAT_MEMORY.maxPages})`),
      "WAT must contain correct memory page declaration",
    );
  });

  it("pure flow has no imports; effectful flow emits import with valid identifier", () => {
    const pureMod = buildWATModule(
      {
        flows: [{ name: "computeScore", qualifier: "pure", declaredEffects: [] }],
        entryPoints: ["computeScore"],
      },
      STDLIB_CAPABILITY_MAP,
    );
    const pureWat = renderWAT(pureMod);
    assert.ok(!pureWat.includes("(import "), "Pure flow must not emit any imports");
    assert.ok(pureWat.includes("(func $computeScore"), "Pure flow must emit function definition");
    assert.ok(pureWat.includes('(export "computeScore"'), "Entry point must be exported");

    const effectfulMod = buildWATModule(
      {
        flows: [{ name: "readFile", qualifier: "flow", declaredEffects: ["filesystem.read"] }],
        entryPoints: [],
      },
      STDLIB_CAPABILITY_MAP,
    );
    const effectfulWat = renderWAT(effectfulMod);
    assert.ok(effectfulWat.includes("(import "), "Effectful flow must emit imports");
    // WAT identifiers must not contain "." — check the func $id part has underscores
    const importMatch = effectfulWat.match(/\(import "[^"]*" "[^"]*" \(func (\$[^\s)]+)/);
    assert.ok(importMatch !== null, "Import must have (func $id) form");
    assert.ok(!importMatch[1].includes("."), "WAT identifier must not contain '.'");
  });
});

// ---------------------------------------------------------------------------
// Phase 22A — WASM SIMD capability
// ---------------------------------------------------------------------------

describe("DEFAULT_WASM_SIMD: Phase 22A SIMD capability descriptor", () => {
  it("DEFAULT_WASM_SIMD has available: false (disabled until runtime detection)", () => {
    assert.equal(DEFAULT_WASM_SIMD.available, false);
  });

  it("DEFAULT_WASM_SIMD has empty supportedOps array and laneWidth 128", () => {
    assert.ok(Array.isArray(DEFAULT_WASM_SIMD.supportedOps), "supportedOps must be an array");
    assert.equal(DEFAULT_WASM_SIMD.supportedOps.length, 0, "Default has no ops enabled");
    assert.equal(DEFAULT_WASM_SIMD.laneWidth, 128, "WASM SIMD lane width is always 128-bit");
  });
});
