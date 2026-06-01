/**
 * LLN-VAL-001 / LLN-VAL-002 / LLN-VAL-003 — Value/Safety Governance Enforcement
 *
 * Tests the live enforcement of the three LLN-VAL diagnostic rules:
 *
 *   LLN-VAL-001  SafetyCriticalMissingAudit       — safety_critical needs audit.write
 *   LLN-VAL-002  SafetyCriticalMissingDeterminism — safety_critical needs require deterministic_execution
 *   LLN-VAL-003  UnknownValueClassification       — classification must be in the recognised set
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseProgram,
  checkEffects,
  verifyGovernance,
  LLN_VAL_001,
  LLN_VAL_002,
  LLN_VAL_003,
  RECOGNISED_VALUE_CLASSIFICATIONS,
} from "../dist/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function verifySource(src, profile = "production") {
  const prog = parseProgram(src, "test.lln");
  const fx = checkEffects(prog.flows, prog.ast);
  return verifyGovernance(prog.ast, prog.flows, fx, profile);
}

function valDiagCodes(result) {
  return result.diagnostics
    .filter(d => d.code.startsWith("LLN-VAL"))
    .map(d => d.code);
}

// ---------------------------------------------------------------------------
// LLN-VAL-003: Unknown classification
// ---------------------------------------------------------------------------

describe("LLN-VAL-003: UnknownValueClassification", () => {
  it("emits LLN-VAL-003 for unrecognised classification", () => {
    const result = verifySource([
      "secure flow f(x: Int) -> Bool",
      "contract {",
      "  effects { audit.write }",
      "  value { classification super_secret_ultra_critical }",
      "  safety { require deterministic_execution }",
      "}",
      "{ return true }",
    ].join("\n"));
    assert.ok(valDiagCodes(result).includes("LLN-VAL-003"),
      "must emit LLN-VAL-003 for unknown classification");
  });

  it("no LLN-VAL-003 for all recognised classifications", () => {
    for (const cls of RECOGNISED_VALUE_CLASSIFICATIONS) {
      const effects = cls === "safety_critical"
        ? "effects { audit.write }"
        : "effects { audit.write }";
      const safety = cls === "safety_critical"
        ? "safety { require deterministic_execution }"
        : "";
      const result = verifySource([
        `secure flow f(x: Int) -> Bool`,
        `contract {`,
        `  ${effects}`,
        `  value { classification ${cls} }`,
        `  ${safety}`,
        `}`,
        `{ return true }`,
      ].join("\n"));
      const codes = valDiagCodes(result).filter(c => c === "LLN-VAL-003");
      assert.equal(codes.length, 0,
        `classification '${cls}' should not trigger LLN-VAL-003`);
    }
  });

  it("RECOGNISED_VALUE_CLASSIFICATIONS has the expected 10 entries", () => {
    assert.equal(RECOGNISED_VALUE_CLASSIFICATIONS.size, 10);
    assert.ok(RECOGNISED_VALUE_CLASSIFICATIONS.has("safety_critical"));
    assert.ok(RECOGNISED_VALUE_CLASSIFICATIONS.has("mission_critical"));
    assert.ok(RECOGNISED_VALUE_CLASSIFICATIONS.has("national_security"));
    assert.ok(RECOGNISED_VALUE_CLASSIFICATIONS.has("public"));
  });
});

// ---------------------------------------------------------------------------
// LLN-VAL-001: safety_critical must declare audit.write
// ---------------------------------------------------------------------------

describe("LLN-VAL-001: SafetyCriticalMissingAudit", () => {
  it("emits LLN-VAL-001 when safety_critical flow has no audit.write", () => {
    const result = verifySource([
      "secure flow flight(t: Int) -> Bool",
      "contract {",
      "  effects { telemetry.read }",
      "  value { classification safety_critical domain aerospace }",
      "  safety { require deterministic_execution }",
      "}",
      "{ return true }",
    ].join("\n"));
    assert.ok(valDiagCodes(result).includes("LLN-VAL-001"),
      "must emit LLN-VAL-001 when safety_critical has no audit.write");
  });

  it("no LLN-VAL-001 when safety_critical declares audit.write", () => {
    const result = verifySource([
      "secure flow flight(t: Int) -> Bool",
      "contract {",
      "  effects { audit.write telemetry.read }",
      "  value { classification safety_critical domain aerospace }",
      "  safety { require deterministic_execution }",
      "}",
      "{ return true }",
    ].join("\n"));
    assert.ok(!valDiagCodes(result).includes("LLN-VAL-001"),
      "must NOT emit LLN-VAL-001 when audit.write is declared");
  });

  it("mission_critical does not trigger LLN-VAL-001", () => {
    const result = verifySource([
      "secure flow maneuver(m: Int) -> Bool",
      "contract {",
      "  effects { orbit.plan }",
      "  value { classification mission_critical domain aerospace }",
      "}",
      "{ return true }",
    ].join("\n"));
    assert.ok(!valDiagCodes(result).includes("LLN-VAL-001"),
      "mission_critical must not trigger LLN-VAL-001");
  });

  it("LLN-VAL-001 constant has correct code and severity", () => {
    assert.equal(LLN_VAL_001.code, "LLN-VAL-001");
    assert.equal(LLN_VAL_001.severity, "error");
    assert.equal(LLN_VAL_001.name, "SafetyCriticalMissingAudit");
  });
});

// ---------------------------------------------------------------------------
// LLN-VAL-002: safety_critical must require deterministic_execution
// ---------------------------------------------------------------------------

describe("LLN-VAL-002: SafetyCriticalMissingDeterminism", () => {
  it("emits LLN-VAL-002 when safety_critical has no safety block", () => {
    const result = verifySource([
      "secure flow flight(t: Int) -> Bool",
      "contract {",
      "  effects { audit.write }",
      "  value { classification safety_critical }",
      "}",
      "{ return true }",
    ].join("\n"));
    assert.ok(valDiagCodes(result).includes("LLN-VAL-002"),
      "must emit LLN-VAL-002 when no safety block");
  });

  it("emits LLN-VAL-002 when safety block exists but lacks deterministic_execution", () => {
    const result = verifySource([
      "secure flow flight(t: Int) -> Bool",
      "contract {",
      "  effects { audit.write }",
      "  value { classification safety_critical }",
      "  safety { require bounded_runtime }",
      "}",
      "{ return true }",
    ].join("\n"));
    assert.ok(valDiagCodes(result).includes("LLN-VAL-002"),
      "must emit LLN-VAL-002 when deterministic_execution missing from safety block");
  });

  it("no LLN-VAL-002 when safety_critical declares require deterministic_execution", () => {
    const result = verifySource([
      "secure flow flight(t: Int) -> Bool",
      "contract {",
      "  effects { audit.write }",
      "  value { classification safety_critical }",
      "  safety { require deterministic_execution }",
      "}",
      "{ return true }",
    ].join("\n"));
    assert.ok(!valDiagCodes(result).includes("LLN-VAL-002"),
      "must NOT emit LLN-VAL-002 when deterministic_execution is declared");
  });

  it("LLN-VAL-002 constant has correct code and severity", () => {
    assert.equal(LLN_VAL_002.code, "LLN-VAL-002");
    assert.equal(LLN_VAL_002.severity, "error");
    assert.equal(LLN_VAL_002.name, "SafetyCriticalMissingDeterminism");
  });
});

// ---------------------------------------------------------------------------
// Correct safety_critical flow has no VAL diagnostics
// ---------------------------------------------------------------------------

describe("LLN-VAL: correctly written safety_critical flow", () => {
  it("a fully correct safety_critical flow produces no LLN-VAL diagnostics", () => {
    const result = verifySource([
      "secure flow updateFlightPath(t: Int) -> Bool",
      "contract {",
      "  effects { audit.write telemetry.read navigation.plan }",
      "  value { classification safety_critical domain aerospace estimated_loss_per_incident 50000000 }",
      "  safety { require deterministic_execution require bounded_runtime }",
      "}",
      "{ return true }",
    ].join("\n"));
    const codes = valDiagCodes(result);
    assert.equal(codes.length, 0,
      `Correct safety_critical flow must produce no VAL diagnostics. Got: ${codes.join(", ")}`);
  });

  it("a fully correct mission_critical flow produces no LLN-VAL diagnostics", () => {
    const result = verifySource([
      "secure flow planManeuver(m: Int) -> Bool",
      "contract {",
      "  effects { audit.write orbit.plan }",
      "  value { classification mission_critical domain aerospace }",
      "  safety { require bounded_runtime }",
      "}",
      "{ return true }",
    ].join("\n"));
    const codes = valDiagCodes(result);
    assert.equal(codes.length, 0,
      `Correct mission_critical flow must produce no VAL diagnostics. Got: ${codes.join(", ")}`);
  });

  it("a flow without contract.value produces no LLN-VAL diagnostics", () => {
    const result = verifySource([
      "secure flow noValueBlock(x: Int) -> Bool",
      "contract {",
      "  effects { audit.write database.write }",
      "}",
      "{ return true }",
    ].join("\n"));
    const codes = valDiagCodes(result);
    assert.equal(codes.length, 0,
      "Flows without contract.value must produce no VAL diagnostics");
  });
});
