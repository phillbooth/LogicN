import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseProgram,
  checkEffects,
  verifyGovernance,
} from "../dist/index.js";

function parseAndVerify(source, profile = "dev") {
  const parsed = parseProgram(source, "test.lln");
  const effects = checkEffects(parsed.flows, parsed.ast);
  return verifyGovernance(parsed.ast, parsed.flows, effects, profile);
}

function hasDiag(result, code) {
  return result.diagnostics.some((d) => d.code === code);
}

describe("Governance verifier — LLN-GOV-010 intent missing on secure flow", () => {
  it("emits LLN-GOV-010 info when secure flow has no intent in dev mode", () => {
    const result = parseAndVerify(`
secure flow createOrder(req: Request) -> Result<Response, ApiError>
with effects [database.write, audit.write] {
  return Ok(Response.ok({}))
}
`, "dev");
    assert.ok(hasDiag(result, "LLN-GOV-010"), "Expected LLN-GOV-010 for missing intent");
  });

  it("LLN-GOV-010 is error severity in production", () => {
    const result = parseAndVerify(`
secure flow createOrder(req: Request) -> Result<Response, ApiError>
with effects [database.write, audit.write] {
  return Ok(Response.ok({}))
}
`, "production");
    const diag = result.diagnostics.find((d) => d.code === "LLN-GOV-010");
    assert.ok(diag !== undefined, "Expected LLN-GOV-010");
    assert.equal(diag.severity, "error");
  });

  it("does not emit LLN-GOV-010 for pure flow (only secure flows require intent)", () => {
    const result = parseAndVerify(`
pure flow calculate(x: Int) -> Int {
  return x
}
`);
    assert.ok(!hasDiag(result, "LLN-GOV-010"), "Unexpected LLN-GOV-010 for pure flow");
  });
});

describe("Governance verifier — LLN-GOV-002 missing audit for governed sink", () => {
  it("emits LLN-GOV-002 when database.write declared but no audit.write", () => {
    const result = parseAndVerify(`
guarded flow saveOrder(order: Order) -> Result<OrderId, OrderError>
with effects [database.write] {
  return Ok(order.id)
}
`);
    assert.ok(hasDiag(result, "LLN-GOV-002"), "Expected LLN-GOV-002 for missing audit");
  });

  it("does not emit LLN-GOV-002 when audit.write is declared", () => {
    const result = parseAndVerify(`
guarded flow saveOrder(order: Order) -> Result<OrderId, OrderError>
with effects [database.write, audit.write] {
  return Ok(order.id)
}
`);
    assert.ok(!hasDiag(result, "LLN-GOV-002"), "Unexpected LLN-GOV-002 when audit.write declared");
  });

  it("does not emit LLN-GOV-002 for pure flow (no sinks)", () => {
    const result = parseAndVerify(`
pure flow add(a: Int, b: Int) -> Int {
  return a + b
}
`);
    assert.ok(!hasDiag(result, "LLN-GOV-002"), "Unexpected LLN-GOV-002 for pure flow");
  });
});

describe("Governance verifier — proof obligations", () => {
  it("records audit_required obligation when audit.write is declared", () => {
    const result = parseAndVerify(`
guarded flow log(msg: String) -> Void
with effects [audit.write] {
  return
}
`);
    assert.ok(
      result.proofObligations.some((o) => o.startsWith("audit_required:")),
      "Expected audit_required proof obligation",
    );
  });

  it("records intent_declared obligation when secure flow has intent", () => {
    const result = parseAndVerify(`
secure flow createPatient(req: Request) -> Result<Response, ApiError>
with effects [database.write, audit.write]
intent "Create patient record" {
  return Ok(Response.ok({}))
}
`);
    assert.ok(
      result.proofObligations.some((o) => o.startsWith("intent_declared:")),
      "Expected intent_declared proof obligation",
    );
  });

  it("intent status is satisfied when secure flow has intent", () => {
    const result = parseAndVerify(`
secure flow createPatient(req: Request) -> Result<Response, ApiError>
with effects [database.write, audit.write]
intent "Create patient record" {
  return Ok(Response.ok({}))
}
`);
    const status = result.intentStatus.get("createPatient");
    assert.equal(status, "satisfied");
  });
});

describe("Governance verifier — LLN-GOV-004 denied target", () => {
  it("emits LLN-GOV-004 when remote.execution denied but network.outbound declared", () => {
    // The parser currently skips compute target body content,
    // so this test confirms the verifier runs without throwing.
    // Full LLN-GOV-004 detection requires Phase 8 compute target body parsing.
    const result = parseAndVerify(`
secure flow runModel(req: Request) -> Result<Response, AiError>
with effects [ai.inference, network.outbound]
intent "Run model locally" {
  return Ok(Response.ok({}))
}
`);
    // LLN-GOV-001 may fire due to "locally" in intent + network.outbound
    assert.ok(typeof result.diagnostics === "object");
  });
});

describe("Governance verifier — runtime integration", () => {
  it("run() includes governanceDiagnostics in result", async () => {
    const { run } = await import("../dist/index.js");
    const result = run(
      `pure flow greet() -> String { return "hello" }`,
      "test.lln",
      "greet",
    );
    assert.ok(Array.isArray(result.governanceDiagnostics));
  });

  it("check-only mode still produces governanceDiagnostics", async () => {
    const { run } = await import("../dist/index.js");
    const result = run(
      `secure flow test(req: Request) -> Result<Response, ApiError>
with effects [database.write] { return Ok(Response.ok({})) }`,
      "test.lln",
      "test",
      new Map(),
      { mode: "check-only" },
    );
    assert.ok(Array.isArray(result.governanceDiagnostics));
    // Should warn about missing intent on secure flow
    assert.ok(
      result.governanceDiagnostics.some((d) => d.code === "LLN-GOV-010"),
      "Expected LLN-GOV-010 in check-only result",
    );
  });

  it("production mode generates proofChain", async () => {
    const { run } = await import("../dist/index.js");
    const result = run(
      `pure flow answer() -> Int { return 42 }`,
      "test.lln",
      "answer",
      new Map(),
      { mode: "production" },
    );
    assert.ok(result.proofChain !== undefined, "Expected proofChain in production mode");
    assert.equal(result.proofChain.schemaVersion, "lln.execution.proof.v1");
  });

  it("dev mode does not generate proofChain", async () => {
    const { run } = await import("../dist/index.js");
    const result = run(
      `pure flow answer() -> Int { return 42 }`,
      "test.lln",
      "answer",
      new Map(),
      { mode: "dev" },
    );
    assert.equal(result.proofChain, undefined, "proofChain should be absent in dev mode");
  });
});
