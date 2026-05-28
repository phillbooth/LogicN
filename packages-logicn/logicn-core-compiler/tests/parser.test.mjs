import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseProgram } from "../dist/index.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseOk(source) {
  const result = parseProgram(source, "test.lln");
  const errors = result.diagnostics.filter((d) => d.severity === "error");
  assert.equal(
    errors.length,
    0,
    `Expected no errors, got:\n${errors.map((e) => `  ${e.code}: ${e.message}`).join("\n")}`,
  );
  return result;
}

function hasErrors(result) {
  return result.diagnostics.some((d) => d.severity === "error");
}

function findNode(node, kind) {
  if (node === undefined) return undefined;
  if (node.kind === kind) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, kind);
    if (found !== undefined) return found;
  }
  return undefined;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Parser — program root", () => {
  it("returns a program node for empty input", () => {
    const result = parseOk("");
    assert.equal(result.ast?.kind, "program");
  });

  it("produces no errors for whitespace-only input", () => {
    const result = parseOk("\n\n  \n");
    assert.equal(result.ast?.kind, "program");
  });
});

describe("Parser — plain flow", () => {
  it("parses a minimal plain flow", () => {
    const result = parseOk(`
flow add(a: Int, b: Int) -> Int {
  return a
}
`);
    const flows = result.flows;
    assert.equal(flows.length, 1);
    assert.equal(flows[0]?.name, "add");
    assert.equal(flows[0]?.qualifier, "flow");
    assert.equal(flows[0]?.returnType, "Int");
  });

  it("extracts parameter names from plain flow", () => {
    const result = parseOk(`
flow add(a: Int, b: Int) -> Int {
  return a
}
`);
    const params = result.flows[0]?.params ?? [];
    assert.equal(params.length, 2);
    assert.ok(params[0]?.startsWith("a:"));
    assert.ok(params[1]?.startsWith("b:"));
  });

  it("produces a flowDecl node in the AST", () => {
    const result = parseOk(`
flow add(a: Int, b: Int) -> Int {
  return a
}
`);
    const node = findNode(result.ast, "flowDecl");
    assert.ok(node !== undefined, "Expected flowDecl node");
    assert.equal(node.value, "add");
  });
});

describe("Parser — secure flow", () => {
  it("parses a secure flow with effects", () => {
    const result = parseOk(`
secure flow processPayment(order: Order) -> Result<PaymentReceipt, PaymentError>
effects [network.outbound, secret.read] {
  return Ok(receipt)
}
`);
    const flows = result.flows;
    assert.equal(flows.length, 1);
    assert.equal(flows[0]?.name, "processPayment");
    assert.equal(flows[0]?.qualifier, "secure");
    assert.deepEqual(flows[0]?.declaredEffects, ["network.outbound", "secret.read"]);
  });

  it("produces a secureFlowDecl node in the AST", () => {
    const result = parseOk(`
secure flow processPayment(order: Order) -> Result<PaymentReceipt, PaymentError>
effects [network.outbound, secret.read] {
  return Ok(receipt)
}
`);
    const node = findNode(result.ast, "secureFlowDecl");
    assert.ok(node !== undefined, "Expected secureFlowDecl node");
    assert.equal(node.value, "processPayment");
  });

  it("parses effects declaration with dot-path effect names", () => {
    const result = parseOk(`
secure flow getOrderStatus(req: GetOrderStatusRequest) -> Result<OrderStatusResponse, ApiError>
effects [database.read, audit.write] {
  let orderId: OrderId = req.orderId
  return Ok(response)
}
`);
    assert.deepEqual(result.flows[0]?.declaredEffects, ["database.read", "audit.write"]);
  });
});

describe("Parser — pure flow", () => {
  it("parses a pure flow", () => {
    const result = parseOk(`
pure flow calculateVat(amount: Money<GBP>) -> Money<GBP> {
  let vat: Money<GBP> = amount
  return vat
}
`);
    const flows = result.flows;
    assert.equal(flows.length, 1);
    assert.equal(flows[0]?.name, "calculateVat");
    assert.equal(flows[0]?.qualifier, "pure");
    assert.equal(flows[0]?.declaredEffects.length, 0);
  });

  it("produces a pureFlowDecl node in the AST", () => {
    const result = parseOk(`
pure flow calculateVat(amount: Money<GBP>) -> Money<GBP> {
  return amount
}
`);
    const node = findNode(result.ast, "pureFlowDecl");
    assert.ok(node !== undefined, "Expected pureFlowDecl node");
  });

  it("parses generic return type correctly", () => {
    const result = parseOk(`
pure flow sanitize(input: ContactFormRequest) -> Result<SanitizedForm, ValidationError> {
  return Ok(form)
}
`);
    assert.ok(result.flows[0]?.returnType.startsWith("Result<"));
  });
});

describe("Parser — let/mut bindings", () => {
  it("parses a let binding inside a flow", () => {
    const result = parseOk(`
flow test() -> Int {
  let total: Int = 42
  return total
}
`);
    const node = findNode(result.ast, "letDecl");
    assert.ok(node !== undefined, "Expected letDecl node");
  });

  it("parses a mut binding inside a flow", () => {
    const result = parseOk(`
secure flow test(req: Request) -> Result<Response, Error>
effects [database.write] {
  mut status: FormStatus = FormStatus.PendingReview
  return Ok(response)
}
`);
    const node = findNode(result.ast, "mutDecl");
    assert.ok(node !== undefined, "Expected mutDecl node");
  });

  it("parses value-state annotations on let bindings", () => {
    const result = parseOk(`
secure flow readInput(raw: String) -> Result<Email, ValidationError>
effects [database.read] {
  let rawEmail: String unsafe unvalidated = raw
  let email: Email safe validated = rawEmail
  return Ok(email)
}
`);
    // No parse errors expected — value-state annotations are handled
    assert.equal(result.diagnostics.filter((d) => d.severity === "error").length, 0);
  });
});

describe("Parser — return statement", () => {
  it("parses bare return", () => {
    const result = parseOk(`
flow noop() -> Int {
  return
}
`);
    const node = findNode(result.ast, "returnStmt");
    assert.ok(node !== undefined);
  });

  it("parses return with Ok(...) result wrapper", () => {
    const result = parseOk(`
secure flow get() -> Result<String, Error>
effects [database.read] {
  return Ok(value)
}
`);
    const node = findNode(result.ast, "returnStmt");
    assert.ok(node !== undefined);
  });
});

describe("Parser — multiple flows", () => {
  it("parses two flows at program level", () => {
    const result = parseOk(`
pure flow add(a: Int, b: Int) -> Int {
  return a
}

secure flow save(req: Request) -> Result<Response, Error>
effects [database.write] {
  return Ok(response)
}
`);
    assert.equal(result.flows.length, 2);
    assert.equal(result.flows[0]?.name, "add");
    assert.equal(result.flows[1]?.name, "save");
  });
});

describe("Parser — source location", () => {
  it("attaches location to flow nodes", () => {
    const result = parseOk(`
flow add(a: Int, b: Int) -> Int {
  return a
}
`);
    const flow = result.flows[0];
    assert.ok(flow !== undefined);
    assert.ok(flow.location.line > 0);
    assert.equal(flow.location.file, "test.lln");
  });
});

describe("Parser — error recovery", () => {
  it("recovers after an unexpected token at top level", () => {
    const result = parseProgram("!!! flow add(a: Int) -> Int { return a }", "test.lln");
    // Should still produce the flow even with leading garbage
    // (may produce errors but should not throw)
    assert.ok(result.ast !== undefined);
  });

  it("reports LLN-PARSE-002 when flow qualifier is not followed by flow", () => {
    const result = parseProgram("secure secure", "test.lln");
    const diag = result.diagnostics.find((d) => d.code === "LLN-PARSE-002");
    assert.ok(diag !== undefined, "Expected LLN-PARSE-002 for malformed flow qualifier");
  });
});
