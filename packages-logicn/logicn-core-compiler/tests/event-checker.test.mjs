import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProgram, checkEvents } from "../dist/index.js";

function parseAndCheckEvents(source) {
  const { ast } = parseProgram(source, "test.lln");
  return checkEvents(ast);
}

function hasDiag(result, code) {
  return result.diagnostics.some((d) => d.code === code);
}

describe("Event checker — LLN-EVENT-001 event not declared", () => {
  it("emits LLN-EVENT-001 when emit used without top-level event declaration", () => {
    const result = parseAndCheckEvents(`
flow createOrder(request: Request) -> Result<Response, ApiError>
with effects [database.write] {
  emit OrderCreated
  return Ok(Response.ok({}))
}
`);
    assert.ok(hasDiag(result, "LLN-EVENT-001"), "Expected LLN-EVENT-001 for undeclared event");
  });

  it("LLN-EVENT-001 message names the missing event", () => {
    const result = parseAndCheckEvents(`
flow createOrder(request: Request) -> Result<Response, ApiError>
with effects [database.write] {
  emit OrderCreated
  return Ok(Response.ok({}))
}
`);
    const diag = result.diagnostics.find((d) => d.code === "LLN-EVENT-001");
    assert.ok(diag !== undefined);
    assert.ok(diag.message.includes("OrderCreated"), "Message should name the event");
  });

  it("does not emit LLN-EVENT-001 when event is declared and emitted", () => {
    const result = parseAndCheckEvents(`
event OrderCreated

flow createOrder(request: Request) -> Result<Response, ApiError>
with effects [database.write] {
  emit OrderCreated
  return Ok(Response.ok({}))
}
`);
    assert.ok(!hasDiag(result, "LLN-EVENT-001"), "Unexpected LLN-EVENT-001 when event is declared");
  });

  it("does not emit LLN-EVENT-001 when there are no events at all", () => {
    const result = parseAndCheckEvents(`
pure flow add(a: Int, b: Int) -> Int {
  return a
}
`);
    assert.ok(!hasDiag(result, "LLN-EVENT-001"), "Unexpected LLN-EVENT-001 for flow with no events");
  });
});

describe("Event checker — LLN-EVENT-002 event never emitted", () => {
  it("emits LLN-EVENT-002 when event declared but never emitted", () => {
    const result = parseAndCheckEvents(`
event OrderCreated

pure flow add(a: Int, b: Int) -> Int {
  return a
}
`);
    assert.ok(hasDiag(result, "LLN-EVENT-002"), "Expected LLN-EVENT-002 for never-emitted event");
  });

  it("LLN-EVENT-002 is a warning not an error", () => {
    const result = parseAndCheckEvents(`
event OrderCreated

pure flow add(a: Int, b: Int) -> Int {
  return a
}
`);
    const diag = result.diagnostics.find((d) => d.code === "LLN-EVENT-002");
    assert.ok(diag !== undefined);
    assert.equal(diag.severity, "warning");
  });

  it("LLN-EVENT-002 message names the unused event", () => {
    const result = parseAndCheckEvents(`
event OrderCreated
`);
    const diag = result.diagnostics.find((d) => d.code === "LLN-EVENT-002");
    assert.ok(diag !== undefined);
    assert.ok(diag.message.includes("OrderCreated"), "Message should name the event");
  });

  it("does not emit LLN-EVENT-002 when event is declared and emitted", () => {
    const result = parseAndCheckEvents(`
event OrderCreated

flow createOrder(request: Request) -> Result<Response, ApiError>
with effects [database.write] {
  emit OrderCreated
  return Ok(Response.ok({}))
}
`);
    assert.ok(!hasDiag(result, "LLN-EVENT-002"), "Unexpected LLN-EVENT-002 when event is emitted");
  });

  it("does not emit LLN-EVENT-002 when there are no event declarations", () => {
    const result = parseAndCheckEvents(`
pure flow greet() -> String {
  return "hello"
}
`);
    assert.ok(!hasDiag(result, "LLN-EVENT-002"), "Unexpected LLN-EVENT-002 for program with no events");
  });
});

describe("Event checker — multiple events", () => {
  it("handles multiple declared and emitted events correctly", () => {
    const result = parseAndCheckEvents(`
event OrderCreated
event OrderCancelled

flow createOrder(request: Request) -> Result<Response, ApiError>
with effects [database.write] {
  emit OrderCreated
  return Ok(Response.ok({}))
}

flow cancelOrder(request: Request) -> Result<Response, ApiError>
with effects [database.write] {
  emit OrderCancelled
  return Ok(Response.ok({}))
}
`);
    assert.ok(!hasDiag(result, "LLN-EVENT-001"), "Unexpected LLN-EVENT-001");
    assert.ok(!hasDiag(result, "LLN-EVENT-002"), "Unexpected LLN-EVENT-002");
  });

  it("emits LLN-EVENT-001 only for the undeclared event", () => {
    const result = parseAndCheckEvents(`
event OrderCreated

flow createOrder(request: Request) -> Result<Response, ApiError>
with effects [database.write] {
  emit OrderCreated
  emit OrderShipped
  return Ok(Response.ok({}))
}
`);
    const diags = result.diagnostics.filter((d) => d.code === "LLN-EVENT-001");
    assert.equal(diags.length, 1);
    assert.ok(diags[0]?.message.includes("OrderShipped"));
  });
});
