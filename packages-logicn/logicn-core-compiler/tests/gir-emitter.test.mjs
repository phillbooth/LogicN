import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseProgram, checkEffects, emitGIR } from "../dist/index.js";

function parseAndEmit(source) {
  const parsed = parseProgram(source, "test.lln");
  const effects = checkEffects(parsed.flows, parsed.ast);
  return emitGIR(parsed.ast, parsed.flows, effects);
}

describe("GIR emitter - basic pure flow", () => {
  it("emits schema and pure flow metadata", () => {
    const result = parseAndEmit(`
pure flow calculateVat(price: Money<GBP>) -> Money<GBP> {
  return price
}
`);

    assert.equal(result.gir.schemaVersion, "lln.gir.v1");
    assert.equal(result.gir.flows[0].qualifier, "pure");
    assert.deepEqual(result.gir.flows[0].effects.declared, []);
  });
});

describe("GIR emitter - guarded flow with effects", () => {
  it("copies declared effects from FlowMeta", () => {
    const result = parseAndEmit(`
guarded flow saveOrder(order: Order) -> Result<Order, Error>
with effects [database.write] {
  OrdersDB.insert(order)
  return Ok(order)
}
`);

    assert.ok(result.gir.flows[0].effects.declared.includes("database.write"));
  });
});

describe("GIR emitter - protected values", () => {
  it("extracts protected binding names and base types", () => {
    const result = parseAndEmit(`
flow collectEmail() -> String {
  let email: protected Email = "a@example.com"
  return "ok"
}
`);

    assert.deepEqual(result.gir.flows[0].protected_values, [
      { name: "email", type: "Email" },
    ]);
  });
});

describe("GIR emitter - intent", () => {
  it("extracts flow intent declarations", () => {
    const result = parseAndEmit(`
secure flow createPatient() -> String
intent "Test intent" {
  return "ok"
}
`);

    assert.equal(result.gir.flows[0].intent.declared, "Test intent");
  });
});

describe("GIR emitter - metadata", () => {
  it("produces a generatedAt timestamp", () => {
    const result = parseAndEmit(`
pure flow id(x: Int) -> Int {
  return x
}
`);

    assert.equal(typeof result.gir.generatedAt, "string");
    assert.ok(result.gir.generatedAt.length > 0);
  });

  it("emits multiple flow entries", () => {
    const result = parseAndEmit(`
pure flow one() -> Int {
  return 1
}

pure flow two() -> Int {
  return 2
}
`);

    assert.equal(result.gir.flows.length, 2);
  });
});
