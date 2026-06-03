/**
 * contract { secrets {} } / { epilogue {} } / { economics {} } — parser recognition.
 *
 * These governed sub-blocks are AUTO-by-default (omitted → the runtime populates/handles
 * them, like economics) and an explicit declaration overrides. The Stage-A compiler must
 * recognize and RETAIN them as first-class contract sub-block nodes (not silently skip),
 * so downstream passes (governance, taint stamping, cost inference) can consume them.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProgram } from "../dist/index.js";

function contractSubBlocks(ast) {
  const out = [];
  (function walk(n) {
    if (!n || typeof n !== "object") return;
    if (n.kind === "contractDecl") {
      for (const c of n.children ?? []) out.push(c.value ?? c.kind);
    }
    for (const c of n.children ?? []) walk(c);
  })(ast);
  return out;
}

const SRC = `secure flow charge(amount: Int) -> Result<Int, String>
contract {
  intent { "Charge with sealed credentials and a proof receipt." }
  effects { database.write }
  economics { max_compute_cost "£0.05"  max_ai_tokens 5000 }
  secrets {
    credential db_password { provider "hashicorp_vault" path "secret/data/db" }
    rotation { interval 1h  strategy smooth_handshake  on_rotation_fault halt }
  }
  epilogue { generate_proof zk_snark_receipt  on_verification_failure halt_pipeline }
}
{
  AuditLog.write("charged")
  return Ok(amount)
}`;

describe("contract sub-blocks — secrets / epilogue / economics", () => {
  const parsed = parseProgram(SRC, "t.lln");

  it("parses with zero errors", () => {
    const errs = parsed.diagnostics.filter((d) => d.severity === "error");
    assert.equal(errs.length, 0, errs.map((e) => `${e.code}: ${e.message}`).join(", "));
  });

  it("retains economics, secrets, and epilogue as contract sub-blocks", () => {
    const blocks = contractSubBlocks(parsed.ast);
    assert.ok(blocks.includes("economics:block"), `economics missing: ${JSON.stringify(blocks)}`);
    assert.ok(blocks.includes("secrets:block"), `secrets missing: ${JSON.stringify(blocks)}`);
    assert.ok(blocks.includes("epilogue:block"), `epilogue missing: ${JSON.stringify(blocks)}`);
  });

  it("a flow that omits secrets/epilogue still parses (auto-by-default, no block required)", () => {
    const p = parseProgram(`pure flow f() -> Int\ncontract { intent { "no governed blocks" } }\n{ return 1 }`, "t.lln");
    const errs = p.diagnostics.filter((d) => d.severity === "error");
    assert.equal(errs.length, 0, errs.map((e) => e.code).join(", "));
  });
});
