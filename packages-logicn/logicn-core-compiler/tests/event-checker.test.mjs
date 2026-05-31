import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProgram, checkEvents, LLN_EVENT_003, LLN_EVENT_004, LLN_EVENT_005 } from "../dist/index.js";

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
contract { effects { database.write } }
{
  emit OrderCreated
  return Ok(Response.ok({}))
}
`);
    assert.ok(hasDiag(result, "LLN-EVENT-001"), "Expected LLN-EVENT-001 for undeclared event");
  });

  it("LLN-EVENT-001 message names the missing event", () => {
    const result = parseAndCheckEvents(`
flow createOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } }
{
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
contract { effects { database.write } }
{
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
contract { effects { database.write } }
{
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
contract { effects { database.write } }
{
  emit OrderCreated
  return Ok(Response.ok({}))
}

flow cancelOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } }
{
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
contract { effects { database.write } }
{
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

// =============================================================================
// LLN-EVENT-003 — contract declares emits but event not globally declared
// =============================================================================

describe("Event checker — LLN-EVENT-003 contract emits undeclared event", () => {
  it("emits LLN-EVENT-003 when contract.events lists emits X but no global event X", () => {
    const result = parseAndCheckEvents(`
flow createPatient(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } events { emits PatientFoo } }
{
  return Ok(Response.ok({}))
}
`);
    assert.ok(hasDiag(result, "LLN-EVENT-003"), "Expected LLN-EVENT-003 for contract emits undeclared event");
  });

  it("LLN-EVENT-003 message names the missing event", () => {
    const result = parseAndCheckEvents(`
flow createPatient(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } events { emits PatientFoo } }
{
  return Ok(Response.ok({}))
}
`);
    const diag = result.diagnostics.find((d) => d.code === "LLN-EVENT-003");
    assert.ok(diag !== undefined);
    assert.ok(diag.message.includes("PatientFoo"), "Message should name the event");
  });

  it("LLN-EVENT-003 is an error", () => {
    const result = parseAndCheckEvents(`
flow createPatient(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } events { emits PatientFoo } }
{
  return Ok(Response.ok({}))
}
`);
    const diag = result.diagnostics.find((d) => d.code === "LLN-EVENT-003");
    assert.ok(diag !== undefined);
    assert.equal(diag.severity, "error");
  });

  it("does not emit LLN-EVENT-003 when global event exists for all contract emits", () => {
    const result = parseAndCheckEvents(`
event PatientFoo

flow createPatient(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } events { emits PatientFoo } }
{
  emit PatientFoo
  return Ok(Response.ok({}))
}
`);
    assert.ok(!hasDiag(result, "LLN-EVENT-003"), "Unexpected LLN-EVENT-003 when global event is declared");
  });
});

// =============================================================================
// LLN-EVENT-004 — duplicate event emission in same flow
// =============================================================================

describe("Event checker — LLN-EVENT-004 duplicate event emission", () => {
  it("emits LLN-EVENT-004 when same event is emitted twice in one flow", () => {
    const result = parseAndCheckEvents(`
event OrderCreated

flow createOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } }
{
  emit OrderCreated
  emit OrderCreated
  return Ok(Response.ok({}))
}
`);
    assert.ok(hasDiag(result, "LLN-EVENT-004"), "Expected LLN-EVENT-004 for duplicate emit");
  });

  it("LLN-EVENT-004 is a warning", () => {
    const result = parseAndCheckEvents(`
event OrderCreated

flow createOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } }
{
  emit OrderCreated
  emit OrderCreated
  return Ok(Response.ok({}))
}
`);
    const diag = result.diagnostics.find((d) => d.code === "LLN-EVENT-004");
    assert.ok(diag !== undefined);
    assert.equal(diag.severity, "warning");
  });

  it("LLN-EVENT-004 message names the duplicated event", () => {
    const result = parseAndCheckEvents(`
event OrderCreated

flow createOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } }
{
  emit OrderCreated
  emit OrderCreated
  return Ok(Response.ok({}))
}
`);
    const diag = result.diagnostics.find((d) => d.code === "LLN-EVENT-004");
    assert.ok(diag !== undefined);
    assert.ok(diag.message.includes("OrderCreated"), "Message should name the event");
  });

  it("does not emit LLN-EVENT-004 when event emitted once", () => {
    const result = parseAndCheckEvents(`
event OrderCreated

flow createOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } }
{
  emit OrderCreated
  return Ok(Response.ok({}))
}
`);
    assert.ok(!hasDiag(result, "LLN-EVENT-004"), "Unexpected LLN-EVENT-004 for single emit");
  });

  it("does not emit LLN-EVENT-004 when different events emitted", () => {
    const result = parseAndCheckEvents(`
event OrderCreated
event OrderShipped

flow createOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } }
{
  emit OrderCreated
  emit OrderShipped
  return Ok(Response.ok({}))
}
`);
    assert.ok(!hasDiag(result, "LLN-EVENT-004"), "Unexpected LLN-EVENT-004 for distinct events");
  });
});

// =============================================================================
// LLN-EVENT-005 — event emitted in body but not in contract.events
// =============================================================================

describe("Event checker — LLN-EVENT-005 event emitted not in contract", () => {
  it("emits LLN-EVENT-005 when emit X in body but X not in contract.events", () => {
    const result = parseAndCheckEvents(`
event OrderCreated
event OrderShipped

flow createOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } events { emits OrderCreated } }
{
  emit OrderCreated
  emit OrderShipped
  return Ok(Response.ok({}))
}
`);
    assert.ok(hasDiag(result, "LLN-EVENT-005"), "Expected LLN-EVENT-005 for emit not in contract");
  });

  it("LLN-EVENT-005 is a warning", () => {
    const result = parseAndCheckEvents(`
event OrderCreated
event OrderShipped

flow createOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } events { emits OrderCreated } }
{
  emit OrderCreated
  emit OrderShipped
  return Ok(Response.ok({}))
}
`);
    const diag = result.diagnostics.find((d) => d.code === "LLN-EVENT-005");
    assert.ok(diag !== undefined);
    assert.equal(diag.severity, "warning");
  });

  it("LLN-EVENT-005 message names the event", () => {
    const result = parseAndCheckEvents(`
event OrderCreated
event OrderShipped

flow createOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } events { emits OrderCreated } }
{
  emit OrderCreated
  emit OrderShipped
  return Ok(Response.ok({}))
}
`);
    const diag = result.diagnostics.find((d) => d.code === "LLN-EVENT-005");
    assert.ok(diag !== undefined);
    assert.ok(diag.message.includes("OrderShipped"), "Message should name the undeclared event");
  });

  it("does not emit LLN-EVENT-005 when all emitted events are in contract.events", () => {
    const result = parseAndCheckEvents(`
event OrderCreated

flow createOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } events { emits OrderCreated } }
{
  emit OrderCreated
  return Ok(Response.ok({}))
}
`);
    assert.ok(!hasDiag(result, "LLN-EVENT-005"), "Unexpected LLN-EVENT-005 when contract lists all emits");
  });

  it("does not emit LLN-EVENT-005 when contract has no events block", () => {
    const result = parseAndCheckEvents(`
event OrderCreated

flow createOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } }
{
  emit OrderCreated
  return Ok(Response.ok({}))
}
`);
    assert.ok(!hasDiag(result, "LLN-EVENT-005"), "Unexpected LLN-EVENT-005 when no contract events block");
  });
});

// =============================================================================
// Happy path — emit X in body AND in contract.events AND global event X
// =============================================================================

describe("Event checker — happy path all three conditions satisfied", () => {
  it("produces no errors when emit X is in body, contract.events, and global event", () => {
    const result = parseAndCheckEvents(`
event OrderCreated

flow createOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } events { emits OrderCreated } }
{
  emit OrderCreated
  return Ok(Response.ok({}))
}
`);
    const eventDiags = result.diagnostics.filter(
      (d) => d.code === "LLN-EVENT-001" || d.code === "LLN-EVENT-003" || d.code === "LLN-EVENT-004" || d.code === "LLN-EVENT-005"
    );
    assert.equal(eventDiags.length, 0, "Expected no event diagnostics for well-formed program");
  });
});

// =============================================================================
// Constant shape tests
// =============================================================================

describe("Event checker — constant shapes", () => {
  it("LLN_EVENT_003 has correct code and severity", () => {
    assert.equal(LLN_EVENT_003.code, "LLN-EVENT-003");
    assert.equal(LLN_EVENT_003.severity, "error");
    assert.equal(LLN_EVENT_003.name, "ContractEmitsUndeclaredEvent");
  });

  it("LLN_EVENT_004 has correct code and severity", () => {
    assert.equal(LLN_EVENT_004.code, "LLN-EVENT-004");
    assert.equal(LLN_EVENT_004.severity, "warning");
    assert.equal(LLN_EVENT_004.name, "DuplicateEventEmission");
  });

  it("LLN_EVENT_005 has correct code and severity", () => {
    assert.equal(LLN_EVENT_005.code, "LLN-EVENT-005");
    assert.equal(LLN_EVENT_005.severity, "warning");
    assert.equal(LLN_EVENT_005.name, "EventEmittedNotInContract");
  });
});
