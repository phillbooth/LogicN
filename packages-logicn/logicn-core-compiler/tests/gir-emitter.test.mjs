import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseProgram, checkEffects, emitGIR, emitExpr, verifyGovernance } from "../dist/index.js";

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

// ── GIR tensor metadata (Phase 8A) ───────────────────────────────────────────

describe("GIR emitter — tensor metadata", () => {
  it("extracts tensor binding from flow body", () => {
    const result = parseAndEmit(`
guarded flow embedText(text: String) -> Result<String, Error>
effects [ai.inference] {
  let embedding: Tensor<Float32, [1, 768]> = EmbeddingModel.embed(text)?
  return Ok("ok")
}
`);
    const flow = result.gir.flows[0];
    assert.ok(flow !== undefined, "Expected a flow in GIR");
    assert.ok(flow.tensors.length > 0, "Expected tensor metadata in GIR");
    const tensor = flow.tensors[0];
    assert.ok(tensor !== undefined);
    assert.equal(tensor.elementType, "Float32");
    assert.equal(tensor.photonic_compatible, true);
  });

  it("marks Int8 tensor as NOT photonic compatible", () => {
    const result = parseAndEmit(`
guarded flow quantizedInfer(input: String) -> Result<String, Error>
effects [ai.inference] {
  let weights: Tensor<Int8, [OutFeatures, InFeatures]> = QuantizedModel.weights()
  return Ok("ok")
}
`);
    const flow = result.gir.flows[0];
    const tensor = flow?.tensors[0];
    if (tensor !== undefined) {
      assert.equal(tensor.photonic_compatible, false, "Int8 tensor should not be photonic compatible");
    }
  });

  it("produces target_affinity for ai.inference flows", () => {
    const result = parseAndEmit(`
guarded flow classify(text: String) -> Result<String, Error>
effects [ai.inference] {
  return Ok("label")
}
`);
    const flow = result.gir.flows[0];
    assert.ok(flow !== undefined);
    assert.ok(flow.target_affinity !== undefined, "Expected target_affinity for ai.inference flow");
    assert.ok(flow.target_affinity.suggested.includes("npu"), "Expected npu in target_affinity suggestions");
  });

  it("does not produce target_affinity for database-only flows", () => {
    const result = parseAndEmit(`
guarded flow saveOrder(order: String) -> Result<String, Error>
effects [database.write] {
  return Ok("saved")
}
`);
    const flow = result.gir.flows[0];
    // database.write alone does not suggest GPU/NPU
    if (flow?.target_affinity !== undefined) {
      assert.ok(!flow.target_affinity.suggested.includes("npu"), "database.write should not suggest npu");
    }
  });
});

// ── Governance compute hint (Phase 8A) ───────────────────────────────────────

describe("Governance verifier — LLN-HINT-COMPUTE-001", () => {
  it("emits LLN-HINT-COMPUTE-001 when ai.inference has no compute target", () => {
    const source = `
guarded flow classify(text: String) -> Result<String, Error>
effects [ai.inference] {
  return Ok("label")
}
`;
    const parsed = parseProgram(source, "test.lln");
    const effects = checkEffects(parsed.flows, parsed.ast);
    const gov = verifyGovernance(parsed.ast, parsed.flows, effects, "dev");
    assert.ok(
      gov.diagnostics.some((d) => d.code === "LLN-HINT-COMPUTE-001"),
      `Expected LLN-HINT-COMPUTE-001, got: ${gov.diagnostics.map((d) => d.code).join(", ")}`,
    );
  });

  it("does NOT emit LLN-HINT-COMPUTE-001 when compute target is declared", () => {
    const source = `
guarded flow classify(text: String) -> Result<String, Error>
effects [ai.inference] {
  compute target best { prefer [npu, gpu, cpu] fallback cpu }
  return Ok("label")
}
`;
    const parsed = parseProgram(source, "test.lln");
    const effects = checkEffects(parsed.flows, parsed.ast);
    const gov = verifyGovernance(parsed.ast, parsed.flows, effects, "dev");
    assert.ok(
      !gov.diagnostics.some((d) => d.code === "LLN-HINT-COMPUTE-001"),
      "Unexpected LLN-HINT-COMPUTE-001 when compute target is declared",
    );
  });
});

// ── GIR emitExpr — #record callExpr nodes ────────────────────────────────────

describe("GIR emitter — emitExpr #record handling", () => {
  it("emits recordLiteral with correct field names for audit call record", () => {
    // AuditLog.write({ event: "PatientCreated", email: redact(email) })
    // The record literal { event: "PatientCreated", email: redact(email) }
    // is parsed as callExpr { value: "#record" } with field identifier children.
    const recordNode = {
      kind: "callExpr",
      value: "#record",
      children: [
        {
          kind: "identifier",
          value: "event",
          children: [{ kind: "stringLiteral", value: "\"PatientCreated\"" }],
        },
        {
          kind: "identifier",
          value: "email",
          children: [{ kind: "callExpr", value: "redact", children: [{ kind: "identifier", value: "email" }] }],
        },
      ],
    };

    const expr = emitExpr(recordNode);

    assert.equal(expr.kind, "recordLiteral", "Expected recordLiteral kind for #record callExpr");
    assert.ok(Array.isArray(expr.fields), "Expected fields array");
    assert.equal(expr.fields.length, 2, "Expected 2 fields");
    assert.equal(expr.fields[0].name, "event", "First field name should be 'event'");
    assert.equal(expr.fields[1].name, "email", "Second field name should be 'email'");
  });

  it("emits recordLiteral with correct field names for response record", () => {
    // Response.okJson({ patientId: patient.id, name: patient.name })
    const recordNode = {
      kind: "callExpr",
      value: "#record",
      children: [
        {
          kind: "identifier",
          value: "patientId",
          children: [{ kind: "identifier", value: "patient" }],
        },
        {
          kind: "identifier",
          value: "name",
          children: [{ kind: "identifier", value: "patient" }],
        },
      ],
    };

    const expr = emitExpr(recordNode);

    assert.equal(expr.kind, "recordLiteral");
    assert.equal(expr.fields.length, 2);
    const fieldNames = expr.fields.map((f) => f.name);
    assert.ok(fieldNames.includes("patientId"), "Expected 'patientId' field in record");
    assert.ok(fieldNames.includes("name"), "Expected 'name' field in record");
  });

  it("emits recordLiteral for empty #record literal (no fields)", () => {
    // An empty record { } should still produce a recordLiteral (not void)
    const recordNode = {
      kind: "callExpr",
      value: "#record",
      children: [],
    };

    const expr = emitExpr(recordNode);

    assert.equal(expr.kind, "recordLiteral", "#record with no fields should still emit recordLiteral");
    assert.equal(expr.fields.length, 0);
  });

  it("emitExpr does not silently skip #record — produces inspectable output", () => {
    // Verify that a plain callExpr with value "#record" is NOT treated as a regular call
    const recordNode = {
      kind: "callExpr",
      value: "#record",
      children: [
        {
          kind: "identifier",
          value: "field1",
          children: [{ kind: "stringLiteral", value: "\"hello\"" }],
        },
      ],
    };

    const expr = emitExpr(recordNode);

    // Must not be treated as a regular callExpr named "#record"
    assert.notEqual(expr.kind, "void", "#record must not produce void");
    assert.equal(expr.kind, "recordLiteral", "#record must produce recordLiteral, not a generic callExpr");
  });
});
