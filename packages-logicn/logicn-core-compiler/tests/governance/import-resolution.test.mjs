// =============================================================================
// Module Registry — import "./path.lln" DAG Merge Tests (task #94)
//
// Tests for file-based import resolution using the module registry.
// The `gatherFileImports` function is available in dist/module-registry.js.
//
// Covers:
//   - LLN-IMPORT-001: file not found at the resolved path
//   - LLN-IMPORT-003: circular import detected (A imports B imports A)
//   - LLN-IMPORT-004: symbol collision warning (local + imported same name)
//   - Valid import resolves symbols from the imported file
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { parseProgram } from "../../dist/index.js";
import {
  gatherFileImports,
  resolveFileImports,
  checkFileSymbolCollisions,
} from "../../dist/module-registry.js";

// ---------------------------------------------------------------------------
// Temp file helpers
// ---------------------------------------------------------------------------

function createTempDir() {
  const dir = join(tmpdir(), `logicn-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeTempFile(dir, name, content) {
  const p = join(dir, name);
  writeFileSync(p, content, "utf8");
  return p;
}

function cleanDir(dir) {
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* ok */ }
}

// ---------------------------------------------------------------------------
// Valid import resolves symbols
// ---------------------------------------------------------------------------

describe("import './path.lln': valid import resolves symbols", () => {
  it("importing a file with a pure flow exposes it as a 'flow' symbol", () => {
    const dir = createTempDir();
    try {
      const libPath = writeTempFile(dir, "lib.lln", `
pure flow addTwo(n: Int) -> Int
contract { effects {} }
{ return n }
`);

      const mainSrc = `import "./lib.lln"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.lln"));
      const result = gatherFileImports(ast, join(dir, "main.lln"));

      assert.equal(
        result.diagnostics.length,
        0,
        `Expected 0 diagnostics for valid import, got: ${result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("; ")}`,
      );
      assert.ok(result.symbols.length > 0, "Expected at least one imported symbol");
      const sym = result.symbols.find((s) => s.name === "addTwo");
      assert.ok(sym !== undefined, `Expected 'addTwo' in imported symbols, got: ${result.symbols.map((s) => s.name).join(", ")}`);
      assert.equal(sym.kind, "flow", "addTwo must be classified as a 'flow' symbol");
    } finally {
      cleanDir(dir);
    }
  });

  it("importing a file with a guard exposes it as a 'guard' symbol", () => {
    const dir = createTempDir();
    try {
      const libPath = writeTempFile(dir, "guards.lln", `
guard PayGuard {
  permitted_effects {
    gateway.charge
  }
}
`);

      const mainSrc = `import "./guards.lln"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.lln"));
      const result = gatherFileImports(ast, join(dir, "main.lln"));

      assert.equal(
        result.diagnostics.length,
        0,
        `Expected 0 diagnostics, got: ${result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("; ")}`,
      );
      const sym = result.symbols.find((s) => s.name === "PayGuard");
      assert.ok(sym !== undefined, `Expected 'PayGuard' in symbols, got: ${result.symbols.map((s) => s.name).join(", ")}`);
      assert.equal(sym.kind, "guard", "PayGuard must be classified as a 'guard' symbol");
    } finally {
      cleanDir(dir);
    }
  });

  it("resolved paths list includes the imported file path", () => {
    const dir = createTempDir();
    try {
      const libPath = writeTempFile(dir, "utils.lln", `
pure flow identity(x: Int) -> Int
contract { effects {} }
{ return x }
`);

      const mainSrc = `import "./utils.lln"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.lln"));
      const result = gatherFileImports(ast, join(dir, "main.lln"));

      assert.ok(
        result.resolvedPaths.length > 0,
        "resolvedPaths must contain at least the imported file",
      );
      assert.ok(
        result.resolvedPaths.some((p) => p.endsWith("utils.lln")),
        `Expected utils.lln in resolvedPaths, got: ${result.resolvedPaths.join(", ")}`,
      );
    } finally {
      cleanDir(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// LLN-IMPORT-001: file not found
// ---------------------------------------------------------------------------

describe("LLN-IMPORT-001: import of non-existent file", () => {
  it("import './nonexistent.lln' produces LLN-IMPORT-001 diagnostic", () => {
    const dir = createTempDir();
    try {
      const mainSrc = `import "./nonexistent.lln"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.lln"));
      const result = gatherFileImports(ast, join(dir, "main.lln"));

      const imp001 = result.diagnostics.filter((d) => d.code === "LLN-IMPORT-001");
      assert.ok(
        imp001.length >= 1,
        `Expected LLN-IMPORT-001 for missing file, got: ${result.diagnostics.map((d) => d.code).join(", ")}`,
      );
      assert.equal(
        imp001[0].severity,
        "error",
        "LLN-IMPORT-001 must be an error",
      );
      assert.ok(
        imp001[0].message.includes("nonexistent.lln") || imp001[0].importedFrom?.includes("nonexistent"),
        `LLN-IMPORT-001 message must mention the missing file, got: ${imp001[0].message}`,
      );
    } finally {
      cleanDir(dir);
    }
  });

  it("import with valid package name (not relative) does not trigger LLN-IMPORT-001", () => {
    // Package imports like `import Email from "@logicn/core-types"` are handled
    // by resolveImports, not gatherFileImports. Non-relative imports return no results.
    const dir = createTempDir();
    try {
      const mainSrc = `import Email from "@logicn/core-types"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.lln"));
      const result = gatherFileImports(ast, join(dir, "main.lln"));

      const imp001 = result.diagnostics.filter((d) => d.code === "LLN-IMPORT-001");
      assert.equal(
        imp001.length,
        0,
        `Non-relative package import must not trigger LLN-IMPORT-001`,
      );
    } finally {
      cleanDir(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// LLN-IMPORT-003: circular import
// ---------------------------------------------------------------------------

describe("LLN-IMPORT-003: circular import detected", () => {
  it("file A imports file B which imports file A — LLN-IMPORT-003", () => {
    const dir = createTempDir();
    try {
      // Write file B first (it imports A)
      writeTempFile(dir, "b.lln", `import "./a.lln"\n\npure flow fromB() -> Int\ncontract { effects {} }\n{ return 1 }\n`);
      // Write file A (it imports B)
      writeTempFile(dir, "a.lln", `import "./b.lln"\n\npure flow fromA() -> Int\ncontract { effects {} }\n{ return 2 }\n`);

      // Parse the main entry point (a.lln imports b.lln imports a.lln → cycle)
      const mainSrc = `import "./a.lln"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.lln"));
      const result = gatherFileImports(ast, join(dir, "main.lln"));

      const imp003 = result.diagnostics.filter((d) => d.code === "LLN-IMPORT-003");
      assert.ok(
        imp003.length >= 1,
        `Expected LLN-IMPORT-003 for circular import, got: ${result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("; ")}`,
      );
      assert.equal(
        imp003[0].severity,
        "error",
        "LLN-IMPORT-003 must be an error",
      );
    } finally {
      cleanDir(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// LLN-IMPORT-004: symbol collision warning
// ---------------------------------------------------------------------------

describe("LLN-IMPORT-004: symbol collision between imports", () => {
  it("two imported files with the same flow name — LLN-IMPORT-004 warning", () => {
    // LLN-IMPORT-004 is emitted by checkFileSymbolCollisions, not gatherFileImports.
    // gatherFileImports returns all symbols; the collision check is a separate step.
    const dir = createTempDir();
    try {
      writeTempFile(dir, "lib1.lln", `pure flow helper() -> Int\ncontract { effects {} }\n{ return 1 }\n`);
      writeTempFile(dir, "lib2.lln", `pure flow helper() -> Int\ncontract { effects {} }\n{ return 2 }\n`);

      const mainSrc = `import "./lib1.lln"\nimport "./lib2.lln"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.lln"));
      const importResult = gatherFileImports(ast, join(dir, "main.lln"));

      // Run the symbol collision check with an empty local-name set
      const collisions = checkFileSymbolCollisions(
        importResult.symbols,
        new Set(),
        join(dir, "main.lln"),
      );

      const imp004 = collisions.filter((d) => d.code === "LLN-IMPORT-004");
      assert.ok(
        imp004.length >= 1,
        `Expected LLN-IMPORT-004 for symbol collision on 'helper', got: ${collisions.map((d) => `${d.code}: ${d.message}`).join("; ")}`,
      );
      assert.equal(
        imp004[0].severity,
        "warning",
        "LLN-IMPORT-004 must be a warning (not a hard error)",
      );
    } finally {
      cleanDir(dir);
    }
  });

  it("two imports with distinct symbol names — no LLN-IMPORT-004", () => {
    const dir = createTempDir();
    try {
      writeTempFile(dir, "libA.lln", `pure flow alpha() -> Int\ncontract { effects {} }\n{ return 1 }\n`);
      writeTempFile(dir, "libB.lln", `pure flow beta() -> Int\ncontract { effects {} }\n{ return 2 }\n`);

      const mainSrc = `import "./libA.lln"\nimport "./libB.lln"\n`;
      const { ast } = parseProgram(mainSrc, join(dir, "main.lln"));
      const importResult = gatherFileImports(ast, join(dir, "main.lln"));

      const collisions = checkFileSymbolCollisions(
        importResult.symbols,
        new Set(),
        join(dir, "main.lln"),
      );

      const imp004 = collisions.filter((d) => d.code === "LLN-IMPORT-004");
      assert.equal(
        imp004.length,
        0,
        `Expected no LLN-IMPORT-004 for distinct symbol names, got: ${imp004.map((d) => d.message).join("; ")}`,
      );
    } finally {
      cleanDir(dir);
    }
  });
});
