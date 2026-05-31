// =============================================================================
// Governance Conformance — Monkey-Patch Checker
//
// Proves LLN-SEC-020 (RuntimeMutationProhibited) and
// LLN-SEC-021 (PrototypeMutationProhibited) fire for banned patterns and
// do NOT fire for clean LogicN source.
//
// Canonical boundary (user decision):
//   LLN-SOURCE-ESCAPE-001  eval(), Function(), dynamic execution
//   LLN-SEC-020            Runtime.patch(), capabilities.override(), etc.
//   LLN-SEC-021            String.prototype.trim = ...
//   LLN-BACKEND-001        (future) emitted JS references globalThis etc.
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseProgram,
  checkMonkeyPatching,
  checkMonkeyPatchingSource,
} from "../../dist/index.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function parseAndCheck(source) {
  const parsed = parseProgram(source, "test.lln");
  const astResult = checkMonkeyPatching(parsed.ast);
  const textResult = checkMonkeyPatchingSource(source, "test.lln");
  return {
    ast: astResult.diagnostics,
    text: textResult.diagnostics,
    all: [...astResult.diagnostics, ...textResult.diagnostics],
  };
}

function codesOf(diags) {
  return diags.map((d) => d.code);
}

// ---------------------------------------------------------------------------
// LLN-SEC-020: RuntimeMutationProhibited — fires
// ---------------------------------------------------------------------------

describe("LLN-SEC-020: Runtime.patch fires", () => {
  it("Runtime.patch call → LLN-SEC-020", () => {
    const source = `
flow patchRuntime() -> Void {
  Runtime.patch("Database.find", fakeFind)
}
`;
    const { all } = parseAndCheck(source);
    assert.ok(
      all.some((d) => d.code === "LLN-SEC-020"),
      `Expected LLN-SEC-020, got: ${JSON.stringify(codesOf(all))}`,
    );
  });
});

describe("LLN-SEC-020: capabilities.override fires", () => {
  it("capabilities.override call → LLN-SEC-020", () => {
    const source = `
flow badCapability() -> Void {
  capabilities.override("network.outbound", fakeNetwork)
}
`;
    const { all } = parseAndCheck(source);
    assert.ok(
      all.some((d) => d.code === "LLN-SEC-020"),
      `Expected LLN-SEC-020, got: ${JSON.stringify(codesOf(all))}`,
    );
  });
});

describe("LLN-SEC-020: Runtime.mock fires", () => {
  it("Runtime.mock call → LLN-SEC-020", () => {
    const source = `
flow mockRuntime() -> Void {
  Runtime.mock("Audit.log", noop)
}
`;
    const { all } = parseAndCheck(source);
    assert.ok(
      all.some((d) => d.code === "LLN-SEC-020"),
      `Expected LLN-SEC-020, got: ${JSON.stringify(codesOf(all))}`,
    );
  });
});

describe("LLN-SEC-020: Capabilities.replace fires", () => {
  it("Capabilities.replace call → LLN-SEC-020", () => {
    const source = `
flow replaceCapability() -> Void {
  Capabilities.replace("database.write", noopWrite)
}
`;
    const { all } = parseAndCheck(source);
    assert.ok(
      all.some((d) => d.code === "LLN-SEC-020"),
      `Expected LLN-SEC-020, got: ${JSON.stringify(codesOf(all))}`,
    );
  });
});

// ---------------------------------------------------------------------------
// LLN-SEC-020: does NOT fire for clean source
// ---------------------------------------------------------------------------

describe("LLN-SEC-020: clean source is clear", () => {
  it("normal adapter use → no LLN-SEC-020", () => {
    const source = `
flow createAdapter(impl: DatabaseAdapter) -> DatabaseAdapter {
  return impl
}
`;
    const { all } = parseAndCheck(source);
    const sec020 = all.filter((d) => d.code === "LLN-SEC-020");
    assert.equal(sec020.length, 0, `Unexpected LLN-SEC-020: ${JSON.stringify(sec020)}`);
  });

  it("read from runtime (not mutation) → no LLN-SEC-020", () => {
    const source = `
flow queryRuntime() -> String {
  let version = Runtime.version()
  return version
}
`;
    const { all } = parseAndCheck(source);
    const sec020 = all.filter((d) => d.code === "LLN-SEC-020");
    assert.equal(sec020.length, 0, `Unexpected LLN-SEC-020: ${JSON.stringify(sec020)}`);
  });
});

// ---------------------------------------------------------------------------
// LLN-SEC-021: PrototypeMutationProhibited — text-level fires
// ---------------------------------------------------------------------------

describe("LLN-SEC-021: String.prototype.trim mutation fires", () => {
  it("String.prototype.trim = customTrim → LLN-SEC-021", () => {
    const source = `
flow badProto() -> Void {
  String.prototype.trim = customTrim
}
`;
    const { text } = parseAndCheck(source);
    assert.ok(
      text.some((d) => d.code === "LLN-SEC-021"),
      `Expected LLN-SEC-021, got: ${JSON.stringify(codesOf(text))}`,
    );
  });
});

describe("LLN-SEC-021: Array.prototype.push mutation fires", () => {
  it("Array.prototype.push = badPush → LLN-SEC-021", () => {
    const source = `
flow corruptArray() -> Void {
  Array.prototype.push = badPush
}
`;
    const { text } = parseAndCheck(source);
    assert.ok(
      text.some((d) => d.code === "LLN-SEC-021"),
      `Expected LLN-SEC-021, got: ${JSON.stringify(codesOf(text))}`,
    );
  });
});

// ---------------------------------------------------------------------------
// LLN-SEC-021: does NOT fire for clean source
// ---------------------------------------------------------------------------

describe("LLN-SEC-021: .prototype access for read → no LLN-SEC-021", () => {
  it("reading from prototype chain (not assignment) → no LLN-SEC-021", () => {
    // Note: reading .prototype is unusual LogicN but not a mutation
    const source = `
// comment mentioning String.prototype.trim.call without assignment
flow doWork(s: String) -> String {
  return s
}
`;
    const { text } = parseAndCheck(source);
    const sec021 = text.filter((d) => d.code === "LLN-SEC-021");
    assert.equal(sec021.length, 0, `Unexpected LLN-SEC-021: ${JSON.stringify(sec021)}`);
  });
});

// ---------------------------------------------------------------------------
// Diagnostic shape conformance
// ---------------------------------------------------------------------------

describe("MonkeyPatchDiagnostic shape conformance", () => {
  it("LLN-SEC-020 diagnostic has required fields", () => {
    const source = `
flow p() -> Void { Runtime.patch("x", y) }
`;
    const { all } = parseAndCheck(source);
    const d = all.find((x) => x.code === "LLN-SEC-020");
    assert.ok(d !== undefined, "Expected at least one LLN-SEC-020");
    assert.equal(typeof d.code, "string");
    assert.equal(typeof d.name, "string");
    assert.equal(typeof d.severity, "string");
    assert.equal(typeof d.message, "string");
    assert.ok(d.suggestedFix !== undefined, "suggestedFix must be present");
    assert.ok(d.why !== undefined, "why must be present");
  });

  it("LLN-SEC-021 diagnostic has required fields", () => {
    const source = `String.prototype.x = bad`;
    const result = checkMonkeyPatchingSource(source, "test.lln");
    const d = result.diagnostics.find((x) => x.code === "LLN-SEC-021");
    assert.ok(d !== undefined, "Expected at least one LLN-SEC-021");
    assert.equal(typeof d.code, "string");
    assert.equal(d.severity, "error");
    assert.ok(d.suggestedFix !== undefined, "suggestedFix must be present");
    assert.ok(d.why !== undefined, "why must be present");
  });
});

// ---------------------------------------------------------------------------
// Boundary: eval() remains LLN-SOURCE-ESCAPE-001, not LLN-SEC-020/021
// ---------------------------------------------------------------------------

describe("Boundary: eval() does NOT produce LLN-SEC-020 or LLN-SEC-021", () => {
  it("eval(source) fires LLN-SOURCE-ESCAPE-001 only (not monkey-patch codes)", () => {
    // The monkey-patch checker must not misflag eval as SEC-020/021.
    // eval is covered by source-escape-checker, not this checker.
    const source = `
flow bad() -> Void {
  eval(source)
}
`;
    const { all } = parseAndCheck(source);
    const sec020 = all.filter((d) => d.code === "LLN-SEC-020");
    const sec021 = all.filter((d) => d.code === "LLN-SEC-021");
    assert.equal(sec020.length, 0, "eval() must not trigger LLN-SEC-020");
    assert.equal(sec021.length, 0, "eval() must not trigger LLN-SEC-021");
  });
});
