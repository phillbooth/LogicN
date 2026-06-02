/**
 * Self-hosted effect checker (effect-checker.lln) — execution tests.
 *
 * Exercises the Stage B declared-vs-used effect reconciliation by executing
 * the .lln flows through the production interpreter and asserting their
 * diagnostics. Codes match the Stage A compiler's canonical meanings:
 *   - LLN-EFFECT-001 (UNDECLARED_EFFECT)          — used effect not declared
 *   - LLN-EFFECT-003 (EFFECT_BOUNDARY_VIOLATION)  — pure flow declares/uses effects
 *   - LLN-EFFECT-004 (UNKNOWN_EFFECT)             — effect not in known registry
 *   - LLN-EFFECT-005 (advisory, carried from stub) — secure/guarded declares none
 *
 * Each flow record passed in carries:
 *   name: String, kind: String, effects: Array<String> (declared),
 *   usedEffects: Array<String> (effects the parser decomposed from the body).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseProgram, executeFlow } from "../dist/index.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const EC_LLN = join(__dir, "..", "src", "self-hosted", "effect-checker.lln");

const program = parseProgram(readFileSync(EC_LLN, "utf8"), "effect-checker.lln");

// ── value-model builders (interpreter takes tagged values / Maps) ──
const vStr = (s) => ({ __tag: "string", value: String(s) });
const vList = (items) => ({ __tag: "list", items });

function vRecord(obj) {
  const fields = new Map();
  for (const [k, v] of Object.entries(obj)) fields.set(k, v);
  return { __tag: "record", fields };
}

const flow = ({ name, kind, effects = [], usedEffects = [] }) =>
  vRecord({
    name: vStr(name),
    kind: vStr(kind),
    effects: vList(effects.map(vStr)),
    usedEffects: vList(usedEffects.map(vStr)),
  });

async function check(flows) {
  const args = new Map([["flows", vList(flows)]]);
  const r = await executeFlow(
    "checkFlowEffects", args, program.ast, program.flows,
    undefined, undefined, { pureFastPath: false }, undefined, undefined,
  );
  const rec = r.value ?? r;
  const diags = rec.fields.get("diagnostics").items.map((d) => {
    const x = d.value ?? d;
    return {
      code: x.fields.get("code").value,
      flowName: x.fields.get("flowName").value,
      severity: x.fields.get("severity").value,
    };
  });
  return {
    flowCount: rec.fields.get("flowCount").value,
    cleanFlows: rec.fields.get("cleanFlows").value,
    diags,
  };
}

const codesFor = (diags, flowName) =>
  diags.filter((d) => d.flowName === flowName).map((d) => d.code).sort();

// ── AST builders for body-derived checks (checkBodyEffects) ──
// Expr: { kind, value, litType, children:Array<Expr> }
const eLit = (v, litType = "int") =>
  vRecord({ kind: vStr("lit"), value: vStr(v), litType: vStr(litType), children: vList([]) });
const eName = (v) =>
  vRecord({ kind: vStr("name"), value: vStr(v), litType: vStr(""), children: vList([]) });
const eCall = (callee, args = []) =>
  vRecord({ kind: vStr("call"), value: vStr(callee), litType: vStr(""), children: vList(args) });
const eBinary = (op, l, r) =>
  vRecord({ kind: vStr("binary"), value: vStr(op), litType: vStr(""), children: vList([l, r]) });

// Stmt: { kind, name, typeName, expr:Array<Expr>, body:Array<Stmt>, elseBody:Array<Stmt> }
const stmt = ({ kind = "exprStmt", name = "", typeName = "", expr = [], body = [], elseBody = [] }) =>
  vRecord({
    kind: vStr(kind),
    name: vStr(name),
    typeName: vStr(typeName),
    expr: vList(expr),
    body: vList(body),
    elseBody: vList(elseBody),
  });

// Flow record carrying a body AST (used effects are DERIVED, not supplied).
const bodyFlow = ({ name, kind, effects = [], body = [] }) =>
  vRecord({
    name: vStr(name),
    kind: vStr(kind),
    effects: vList(effects.map(vStr)),
    body: vList(body),
  });

async function checkBody(flows) {
  const args = new Map([["flows", vList(flows)]]);
  const r = await executeFlow(
    "checkBodyEffects", args, program.ast, program.flows,
    undefined, undefined, { pureFastPath: false }, undefined, undefined,
  );
  const rec = r.value ?? r;
  const diags = rec.fields.get("diagnostics").items.map((d) => {
    const x = d.value ?? d;
    return {
      code: x.fields.get("code").value,
      flowName: x.fields.get("flowName").value,
      severity: x.fields.get("severity").value,
    };
  });
  return {
    flowCount: rec.fields.get("flowCount").value,
    cleanFlows: rec.fields.get("cleanFlows").value,
    diags,
  };
}

describe("effect-checker.lln — parses clean", () => {
  it("has zero parse errors", () => {
    const errors = program.diagnostics.filter((d) => d.severity === "error");
    assert.equal(errors.length, 0, errors.map((e) => e.message).join(", "));
  });
});

describe("effect-checker.lln — clean reconciliation (used ⊆ declared)", () => {
  it("guarded flow using exactly its declared effects → no diagnostics", async () => {
    const { diags, cleanFlows } = await check([
      flow({ name: "a", kind: "guarded", effects: ["database.read"], usedEffects: ["database.read"] }),
    ]);
    assert.deepEqual(codesFor(diags, "a"), []);
    assert.equal(cleanFlows, 1);
  });

  it("declares more than it uses (subset) → still clean", async () => {
    const { diags } = await check([
      flow({ name: "a2", kind: "guarded", effects: ["database.read", "audit.write"], usedEffects: ["database.read"] }),
    ]);
    assert.deepEqual(codesFor(diags, "a2"), []);
  });
});

describe("effect-checker.lln — LLN-EFFECT-001 UndeclaredEffect", () => {
  it("uses an effect it did not declare → LLN-EFFECT-001", async () => {
    const { diags } = await check([
      flow({ name: "b", kind: "guarded", effects: ["database.read"], usedEffects: ["database.read", "network.outbound"] }),
    ]);
    assert.deepEqual(codesFor(diags, "b"), ["LLN-EFFECT-001"]);
  });
});

describe("effect-checker.lln — LLN-EFFECT-004 UnknownEffect", () => {
  it("declares an effect not in the registry → LLN-EFFECT-004", async () => {
    const { diags } = await check([
      flow({ name: "d", kind: "guarded", effects: ["bogus.declared"], usedEffects: [] }),
    ]);
    assert.deepEqual(codesFor(diags, "d"), ["LLN-EFFECT-004"]);
  });

  it("uses an unknown effect → both undeclared (001) and unknown (004)", async () => {
    const { diags } = await check([
      flow({ name: "c", kind: "guarded", effects: ["database.read"], usedEffects: ["bogus.effect"] }),
    ]);
    assert.deepEqual(codesFor(diags, "c"), ["LLN-EFFECT-001", "LLN-EFFECT-004"]);
  });
});

describe("effect-checker.lln — LLN-EFFECT-003 PureViolation", () => {
  it("pure flow that USES an effect → LLN-EFFECT-003 (plus 001, nothing declared)", async () => {
    const { diags } = await check([
      flow({ name: "e", kind: "pure", effects: [], usedEffects: ["database.read"] }),
    ]);
    assert.deepEqual(codesFor(diags, "e"), ["LLN-EFFECT-001", "LLN-EFFECT-003"]);
  });

  it("pure flow that DECLARES an effect → LLN-EFFECT-003 (count check kept)", async () => {
    const { diags } = await check([
      flow({ name: "f", kind: "pure", effects: ["database.read"], usedEffects: [] }),
    ]);
    assert.deepEqual(codesFor(diags, "f"), ["LLN-EFFECT-003"]);
  });

  it("pure flow with no effects declared or used → clean", async () => {
    const { diags } = await check([
      flow({ name: "f0", kind: "pure", effects: [], usedEffects: [] }),
    ]);
    assert.deepEqual(codesFor(diags, "f0"), []);
  });
});

describe("effect-checker.lln — LLN-EFFECT-005 secure advisory", () => {
  it("secure flow declaring no effects → LLN-EFFECT-005 warning", async () => {
    const { diags } = await check([
      flow({ name: "g", kind: "secure", effects: [], usedEffects: [] }),
    ]);
    const g = diags.filter((d) => d.flowName === "g");
    assert.deepEqual(g.map((d) => d.code), ["LLN-EFFECT-005"]);
    assert.equal(g[0].severity, "warning");
  });
});

describe("effect-checker.lln — aggregate & edge cases", () => {
  it("empty flow list → no diagnostics, flowCount 0", async () => {
    const { flowCount, cleanFlows, diags } = await check([]);
    assert.equal(flowCount, 0);
    assert.equal(cleanFlows, 0);
    assert.equal(diags.length, 0);
  });

  it("multi-flow: counts every flow and aggregates diagnostics per flow", async () => {
    const { flowCount, cleanFlows, diags } = await check([
      flow({ name: "ok", kind: "guarded", effects: ["database.read"], usedEffects: ["database.read"] }),
      flow({ name: "bad", kind: "guarded", effects: ["database.read"], usedEffects: ["network.outbound"] }),
      flow({ name: "purebad", kind: "pure", effects: [], usedEffects: ["audit.write"] }),
    ]);
    assert.equal(flowCount, 3);
    assert.equal(cleanFlows, 1);
    assert.deepEqual(codesFor(diags, "ok"), []);
    assert.deepEqual(codesFor(diags, "bad"), ["LLN-EFFECT-001"]);
    assert.deepEqual(codesFor(diags, "purebad"), ["LLN-EFFECT-001", "LLN-EFFECT-003"]);
  });
});

describe("effect-checker.lln — checkBodyEffects (body-derived effects)", () => {
  it("body calls dbRead but declares no effects → LLN-EFFECT-001", async () => {
    const { diags, cleanFlows } = await checkBody([
      bodyFlow({ name: "f1", kind: "guarded", effects: [], body: [
        stmt({ kind: "exprStmt", expr: [eCall("dbRead")] }),
      ]}),
    ]);
    assert.deepEqual(codesFor(diags, "f1"), ["LLN-EFFECT-001"]);
    assert.equal(cleanFlows, 0);
  });

  it("same dbRead call WITH database.read declared → clean", async () => {
    const { diags, cleanFlows } = await checkBody([
      bodyFlow({ name: "f2", kind: "guarded", effects: ["database.read"], body: [
        stmt({ kind: "exprStmt", expr: [eCall("dbRead")] }),
      ]}),
    ]);
    assert.deepEqual(codesFor(diags, "f2"), []);
    assert.equal(cleanFlows, 1);
  });

  it("pure flow that calls dbWrite → LLN-EFFECT-003 (plus 001, nothing declared)", async () => {
    const { diags } = await checkBody([
      bodyFlow({ name: "f3", kind: "pure", effects: [], body: [
        stmt({ kind: "exprStmt", expr: [eCall("dbWrite")] }),
      ]}),
    ]);
    assert.deepEqual(codesFor(diags, "f3"), ["LLN-EFFECT-001", "LLN-EFFECT-003"]);
  });

  it("effectful call nested inside an if body → still detected (recursion)", async () => {
    const { diags } = await checkBody([
      bodyFlow({ name: "f4", kind: "guarded", effects: [], body: [
        stmt({ kind: "if", expr: [eName("cond")], body: [
          stmt({ kind: "exprStmt", expr: [eCall("netGet")] }),
        ]}),
      ]}),
    ]);
    assert.deepEqual(codesFor(diags, "f4"), ["LLN-EFFECT-001"]);
  });

  it("effectful call nested inside an if ELSE body → still detected (else recursion)", async () => {
    const { diags } = await checkBody([
      bodyFlow({ name: "f4e", kind: "guarded", effects: [], body: [
        stmt({ kind: "if", expr: [eName("cond")],
          body: [stmt({ kind: "exprStmt", expr: [eName("noop")] })],
          elseBody: [stmt({ kind: "exprStmt", expr: [eCall("dbWrite")] })] }),
      ]}),
    ]);
    assert.deepEqual(codesFor(diags, "f4e"), ["LLN-EFFECT-001"]);
  });

  it("effectful call nested inside a while body → still detected (recursion)", async () => {
    const { diags } = await checkBody([
      bodyFlow({ name: "f4b", kind: "guarded", effects: [], body: [
        stmt({ kind: "while", expr: [eName("cond")], body: [
          stmt({ kind: "exprStmt", expr: [eCall("writeFile")] }),
        ]}),
      ]}),
    ]);
    assert.deepEqual(codesFor(diags, "f4b"), ["LLN-EFFECT-001"]);
  });

  it("call buried in a binary argument (x + auditWrite()) → detected", async () => {
    const { diags } = await checkBody([
      bodyFlow({ name: "f5", kind: "guarded", effects: [], body: [
        stmt({ kind: "return", expr: [eBinary("+", eName("x"), eCall("auditWrite"))] }),
      ]}),
    ]);
    assert.deepEqual(codesFor(diags, "f5"), ["LLN-EFFECT-001"]);
  });

  it("call passed as a call argument (dbWrite(netGet())) → both effects detected", async () => {
    const { diags } = await checkBody([
      bodyFlow({ name: "f5b", kind: "guarded", effects: ["database.write"], body: [
        stmt({ kind: "exprStmt", expr: [eCall("dbWrite", [eCall("netGet")])] }),
      ]}),
    ]);
    // dbWrite is declared; netGet (network.inbound) is not → one 001.
    assert.deepEqual(codesFor(diags, "f5b"), ["LLN-EFFECT-001"]);
  });

  it("only non-effectful calls / pure arithmetic → clean", async () => {
    const { diags, cleanFlows } = await checkBody([
      bodyFlow({ name: "f6", kind: "pure", effects: [], body: [
        stmt({ kind: "return", expr: [eBinary("+", eLit("1"), eCall("helper", [eLit("2")]))] }),
      ]}),
    ]);
    assert.deepEqual(codesFor(diags, "f6"), []);
    assert.equal(cleanFlows, 1);
  });

  it("multi-flow body pass: counts every flow and aggregates per flow", async () => {
    const { flowCount, cleanFlows, diags } = await checkBody([
      bodyFlow({ name: "ok", kind: "guarded", effects: ["database.read"], body: [
        stmt({ kind: "exprStmt", expr: [eCall("dbRead")] }),
      ]}),
      bodyFlow({ name: "bad", kind: "guarded", effects: [], body: [
        stmt({ kind: "exprStmt", expr: [eCall("netPost")] }),
      ]}),
      bodyFlow({ name: "purebad", kind: "pure", effects: [], body: [
        stmt({ kind: "exprStmt", expr: [eCall("auditWrite")] }),
      ]}),
    ]);
    assert.equal(flowCount, 3);
    assert.equal(cleanFlows, 1);
    assert.deepEqual(codesFor(diags, "ok"), []);
    assert.deepEqual(codesFor(diags, "bad"), ["LLN-EFFECT-001"]);
    assert.deepEqual(codesFor(diags, "purebad"), ["LLN-EFFECT-001", "LLN-EFFECT-003"]);
  });
});

describe("effect-checker.lln — no duplicate diagnostics", () => {
  it("a used + declared unknown effect emits exactly ONE LLN-EFFECT-004", async () => {
    const { diags } = await check([
      flow({ name: "x", kind: "guarded", effects: ["bogus.x"], usedEffects: ["bogus.x"] }),
    ]);
    assert.deepEqual(codesFor(diags, "x"), ["LLN-EFFECT-004"]);
  });

  it("a repeated used effect emits LLN-EFFECT-001 only once", async () => {
    const { diags } = await check([
      flow({ name: "y", kind: "guarded", effects: ["database.read"], usedEffects: ["network.outbound", "network.outbound"] }),
    ]);
    assert.deepEqual(codesFor(diags, "y"), ["LLN-EFFECT-001"]);
  });
});
