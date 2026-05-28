import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseProgram, checkEffects, checkFlowEffects, effectResultsToDiagnostics } from "../dist/index.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseAndCheck(source) {
  const parsed = parseProgram(source, "test.lln");
  const effectResults = checkEffects(parsed.flows, parsed.ast ?? { kind: "program" });
  const allDiagnostics = [
    ...parsed.diagnostics,
    ...effectResultsToDiagnostics(effectResults),
  ];
  return { parsed, effectResults, allDiagnostics };
}

function effectErrors(results) {
  return results.flatMap((r) => r.diagnostics.filter((d) => d.severity === "error"));
}

function effectWarnings(results) {
  return results.flatMap((r) => r.diagnostics.filter((d) => d.severity === "warning"));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Effect Checker — pure flow rules", () => {
  it("accepts a pure flow with no effects", () => {
    const { effectResults } = parseAndCheck(`
pure flow calculateVat(amount: Money<GBP>) -> Money<GBP> {
  let vat: Money<GBP> = amount
  return vat
}
`);
    assert.equal(effectErrors(effectResults).length, 0);
  });

  it("emits LLN-EFFECT-003 when pure flow declares effects", () => {
    const { effectResults } = parseAndCheck(`
pure flow badFlow(x: Int) -> Int
effects [database.read] {
  return x
}
`);
    const errors = effectErrors(effectResults);
    assert.ok(errors.length > 0, "Expected LLN-EFFECT-003 error");
    assert.ok(errors.some((d) => d.code === "LLN-EFFECT-003"));
  });

  it("includes a suggested fix for pure flow with effects", () => {
    const { effectResults } = parseAndCheck(`
pure flow bad(x: Int) -> Int
effects [database.write] {
  return x
}
`);
    const err = effectResults.flatMap((r) => r.diagnostics).find((d) => d.code === "LLN-EFFECT-003");
    assert.ok(err?.suggestedFix !== undefined, "Expected suggestedFix on LLN-EFFECT-003");
  });
});

describe("Effect Checker — secure flow rules", () => {
  it("accepts a secure flow with correctly declared effects", () => {
    const { effectResults } = parseAndCheck(`
secure flow getOrder(req: GetOrderRequest) -> Result<Order, Error>
effects [database.read, audit.write] {
  return Ok(order)
}
`);
    assert.equal(effectErrors(effectResults).length, 0);
  });

  it("returns metadata for each flow", () => {
    const { effectResults } = parseAndCheck(`
secure flow saveForm(req: FormRequest) -> Result<FormResponse, Error>
effects [database.write, audit.write] {
  return Ok(response)
}
`);
    assert.equal(effectResults.length, 1);
    assert.equal(effectResults[0]?.flowName, "saveForm");
    assert.equal(effectResults[0]?.qualifier, "secure");
    assert.deepEqual(effectResults[0]?.declaredEffects, ["database.write", "audit.write"]);
  });

  it("reports no errors for empty secure flow body", () => {
    const { effectResults } = parseAndCheck(`
secure flow emptyFlow(req: Request) -> Result<Response, Error>
effects [database.read] {
  return Ok(response)
}
`);
    assert.equal(effectErrors(effectResults).length, 0);
  });
});

describe("Effect Checker — plain flow rules", () => {
  it("accepts a plain flow with no effects", () => {
    const { effectResults } = parseAndCheck(`
flow add(a: Int, b: Int) -> Int {
  return a
}
`);
    assert.equal(effectErrors(effectResults).length, 0);
  });

  it("warns when plain flow declares privileged effect", () => {
    const { effectResults } = parseAndCheck(`
flow chargeCustomer(payment: PaymentRequest) -> Result<Receipt, Error>
effects [payment.charge] {
  return Ok(receipt)
}
`);
    const warnings = effectWarnings(effectResults);
    assert.ok(warnings.some((d) => d.code === "LLN-EFFECT-001"),
      "Expected LLN-EFFECT-001 warning for privileged effect on plain flow");
  });
});

describe("Effect Checker — effectResultsToDiagnostics", () => {
  it("converts effect results to flat diagnostic array", () => {
    const { effectResults } = parseAndCheck(`
pure flow bad(x: Int) -> Int
effects [database.write] {
  return x
}
`);
    const diags = effectResultsToDiagnostics(effectResults);
    assert.ok(Array.isArray(diags));
    assert.ok(diags.length > 0);
    assert.ok(diags.every((d) => typeof d.code === "string"));
    assert.ok(diags.every((d) => typeof d.message === "string"));
  });

  it("returns empty array when no effects violations", () => {
    const { effectResults } = parseAndCheck(`
pure flow calculate(amount: Int) -> Int {
  return amount
}
`);
    const diags = effectResultsToDiagnostics(effectResults);
    assert.equal(diags.length, 0);
  });
});

describe("Effect Checker — multiple flows", () => {
  it("checks each flow independently", () => {
    const { effectResults } = parseAndCheck(`
pure flow goodFlow(x: Int) -> Int {
  return x
}

pure flow badFlow(x: Int) -> Int
effects [database.read] {
  return x
}
`);
    assert.equal(effectResults.length, 2);
    assert.equal(effectErrors([effectResults[0]]).length, 0);
    assert.ok(effectErrors([effectResults[1]]).length > 0);
  });
});
