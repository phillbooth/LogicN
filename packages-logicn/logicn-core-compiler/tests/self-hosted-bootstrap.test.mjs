/**
 * R6 bootstrap conformance gate — Stage A (TS) == Stage B (self-hosted), full parity.
 *
 * For each corpus flow (tests/r6-corpus/r6-00N-*.lln) the SAME source is executed by:
 *   Stage A — parseProgram + executeFlow (the production TS interpreter)
 *   Stage B — self-hosted pipeline: lexer.lln → parser.lln → gir-emitter.lln(buildFlowTable)
 *             → runtime.lln(runProgram), all interpreted LogicN
 * and the return VALUES are normalized to a canonical string and asserted equal.
 *
 * This is the 100%-Axis-B marker: LogicN compiles AND runs LogicN at parity with the
 * TS reference for the supported subset. Flows are added per R-phase as the self-hosted
 * runtime widens (R1 strings/Result → R6-001; R2 records/lists → 002/003; R4 → 004; R5 → 005).
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseProgram, resolveSymbols, checkTypes, executeFlow } from "../dist/index.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const SH = join(__dir, "..", "src", "self-hosted");
const CORPUS = join(__dir, "r6-corpus");

function loadSH(file) {
  const p = parseProgram(readFileSync(join(SH, file), "utf8"), file);
  resolveSymbols(p.ast);
  checkTypes(p.ast);
  const errs = p.diagnostics.filter((d) => d.severity === "error");
  assert.equal(errs.length, 0, `${file}: ${errs.map((e) => e.message).join("; ")}`);
  return p;
}

let lexer, parser, gir, rt;
before(() => {
  lexer = loadSH("lexer.lln");
  parser = loadSH("parser.lln");
  gir = loadSH("gir-emitter.lln");
  rt = loadSH("runtime.lln");
});

// ── value builders (Stage B harness) ──
const vStr = (s) => ({ __tag: "string", value: String(s) });
const vInt = (n) => ({ __tag: "int", value: n });
const vBool = (x) => ({ __tag: "bool", value: x });
const vList = (items) => ({ __tag: "list", items });
const vRec = (o) => { const f = new Map(); for (const [k, v] of Object.entries(o)) f.set(k, v); return { __tag: "record", fields: f }; };
// RtValue args for the self-hosted runtime
const emptyList = vList([]);
const rtInt = (n) => vRec({ ty: vStr("Int"), i: vInt(n), b: vBool(false), s: vStr(""), tag: vStr(""), payload: emptyList, fields: emptyList });
// Build an RtValue record (for passing struct params like Point{x,y} to the self-hosted runtime)
const rtRecord = (pairs) => {
  const items = [];
  for (const [name, val] of pairs) {
    items.push(vRec({ ty: vStr("String"), i: vInt(0), b: vBool(false), s: vStr(name), tag: vStr(""), payload: emptyList, fields: emptyList }));
    items.push(val);
  }
  return vRec({ ty: vStr("record"), i: vInt(0), b: vBool(false), s: vStr(""), tag: vStr(""), payload: emptyList, fields: vList(items) });
};

// ── canonical normalization (both stages → the same string) ──
function normA(v) {
  if (v == null) return "null";
  const x = v.value !== undefined && v.__tag === undefined ? v.value : v; // unwrap nothing fancy
  switch (x.__tag) {
    case "ok": return `Ok(${normA(x.value)})`;
    case "err": return `Err(${normA(x.error ?? x.value)})`;
    case "some": return `Some(${normA(x.value)})`;
    case "none": return "None";
    case "string": return `"${x.value}"`;
    case "int": return String(x.value);
    case "bool": return String(x.value);
    default: return JSON.stringify(x);
  }
}
function normB(rec) {
  const v = rec.value ?? rec;
  const ty = v.fields.get("ty").value;
  if (ty === "Int") return String(v.fields.get("i").value);
  if (ty === "Bool") return String(v.fields.get("b").value);
  if (ty === "String") return `"${v.fields.get("s").value}"`;
  if (ty === "tag") {
    const tag = v.fields.get("tag").value;
    const pl = v.fields.get("payload").items;
    if (pl.length === 0) return tag; // None
    return `${tag}(${normB(pl[0])})`;
  }
  return `<${ty}>`;
}

async function stageA(src, flow, argsObj) {
  const p = parseProgram(src, "corpus.lln");
  const r = await executeFlow(flow, new Map(Object.entries(argsObj)), p.ast);
  return normA(r);
}
async function stageB(src, flow, rtArgs) {
  const lx = await executeFlow("tokenize", new Map([["source", vStr(src)]]), lexer.ast);
  let toks = lx.value ?? lx; if (toks.__tag === "ok") toks = toks.value;
  const pr = await executeFlow("parseFlows", new Map([["tokens", toks]]), parser.ast);
  const flows = (pr.value ?? pr).fields.get("flows");
  const tbl = await executeFlow("buildFlowTable", new Map([["flows", flows]]), gir.ast);
  const res = await executeFlow("runProgram", new Map([["flows", tbl.value ?? tbl], ["entryName", vStr(flow)], ["args", vList(rtArgs)]]), rt.ast);
  return normB(res.value ?? res);
}

// Assert Stage A and Stage B agree, and (optionally) match an expected canonical value.
async function conform(file, flow, argsObj, rtArgs, expected) {
  const src = readFileSync(join(CORPUS, file), "utf8");
  const a = await stageA(src, flow, argsObj);
  const b = await stageB(src, flow, rtArgs);
  assert.equal(b, a, `Stage A/B mismatch for ${flow}(${JSON.stringify(argsObj)}): A=${a} B=${b}`);
  if (expected !== undefined) assert.equal(a, expected, `unexpected value for ${flow}: ${a}`);
  return a;
}

describe("R6 bootstrap conformance — Stage A == Stage B (full parity)", () => {
  describe("R6-001 classify (R1: strings + Result + contract.types)", () => {
    it("classify(70) → Ok(\"pass\")", async () => {
      await conform("r6-001-classify.lln", "classify", { score: vInt(70) }, [rtInt(70)], 'Ok("pass")');
    });
    it("classify(20) → Ok(\"fail\")", async () => {
      await conform("r6-001-classify.lln", "classify", { score: vInt(20) }, [rtInt(20)], 'Ok("fail")');
    });
    it("classify(-5) → Err(\"negative\")", async () => {
      await conform("r6-001-classify.lln", "classify", { score: vInt(-5) }, [rtInt(-5)], 'Err("negative")');
    });
  });

  describe("R6-002 distanceSq (R2: records + field access)", () => {
    // Stage A receives a native JS record; Stage B receives an RtValue record.
    // Both must agree and produce Int:25 for Point{x:3,y:4} (3²+4²=25).
    it("distanceSq({x:3,y:4}) → 25", async () => {
      const stageAPoint = { __tag: "record", fields: new Map([["x", vInt(3)], ["y", vInt(4)]]) };
      const stageBPoint = rtRecord([["x", rtInt(3)], ["y", rtInt(4)]]);
      await conform("r6-002-distance.lln", "distanceSq", { p: stageAPoint }, [stageBPoint], "25");
    });
    it("distanceSq({x:0,y:5}) → 25", async () => {
      const stageAPoint = { __tag: "record", fields: new Map([["x", vInt(0)], ["y", vInt(5)]]) };
      const stageBPoint = rtRecord([["x", rtInt(0)], ["y", rtInt(5)]]);
      await conform("r6-002-distance.lln", "distanceSq", { p: stageAPoint }, [stageBPoint], "25");
    });
  });

  describe("R6-003 listLen (R2: array literal + .count())", () => {
    it("listLen() → 4", async () => {
      await conform("r6-003-listlen.lln", "listLen", {}, [], "4");
    });
  });

  describe("R6-004 recordAmount (R4: secure flow + effects + AuditLog.write)", () => {
    it("recordAmount(5) → Ok(5)", async () => {
      await conform("r6-004-record-amount.lln", "recordAmount", { amount: vInt(5) }, [rtInt(5)], 'Ok(5)');
    });
    it("recordAmount(0) → Ok(0)", async () => {
      await conform("r6-004-record-amount.lln", "recordAmount", { amount: vInt(0) }, [rtInt(0)], 'Ok(0)');
    });
  });

  describe("R6-005 nameOf (R5: match + Option)", () => {
    it("nameOf(1) → Some(\"alpha\")", async () => {
      await conform("r6-005-name-of.lln", "nameOf", { code: vInt(1) }, [rtInt(1)], 'Some("alpha")');
    });
    it("nameOf(2) → Some(\"beta\")", async () => {
      await conform("r6-005-name-of.lln", "nameOf", { code: vInt(2) }, [rtInt(2)], 'Some("beta")');
    });
    it("nameOf(9) → None", async () => {
      await conform("r6-005-name-of.lln", "nameOf", { code: vInt(9) }, [rtInt(9)], "None");
    });
  });
});
