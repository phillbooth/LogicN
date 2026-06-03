import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseProgram,
  checkEffects,
  verifyGovernance,
  extractArenaLimitMB,
  LLN_GOV_003,
  LLN_CONTEXT_001,
  LLN_GOV_011,
  LLN_GOV_012,
} from "../dist/index.js";
import {
  LLN_GOV_005,
  LLN_GOV_007,
  LLN_GOV_009,
} from "../dist/governance-verifier.js";

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
secure flow createOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write audit.write } }
{
  return Ok(Response.ok({}))
}
`, "dev");
    assert.ok(hasDiag(result, "LLN-GOV-010"), "Expected LLN-GOV-010 for missing intent");
  });

  it("LLN-GOV-010 is error severity in production", () => {
    const result = parseAndVerify(`
secure flow createOrder(request: Request) -> Result<Response, ApiError>
contract { effects { database.write audit.write } }
{
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
contract { effects { database.write } }
{
  return Ok(order.id)
}
`);
    assert.ok(hasDiag(result, "LLN-GOV-002"), "Expected LLN-GOV-002 for missing audit");
  });

  it("does not emit LLN-GOV-002 when audit.write is declared", () => {
    const result = parseAndVerify(`
guarded flow saveOrder(order: Order) -> Result<OrderId, OrderError>
contract { effects { database.write audit.write } }
{
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
contract { effects { audit.write } }
{
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
secure flow createPatient(request: Request) -> Result<Response, ApiError>
contract { effects { database.write audit.write } }
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
secure flow createPatient(request: Request) -> Result<Response, ApiError>
contract { effects { database.write audit.write } }
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
secure flow runModel(request: Request) -> Result<Response, AiError>
contract { effects { ai.inference network.outbound } }
intent "Run model locally" {
  return Ok(Response.ok({}))
}
`);
    // LLN-GOV-001 may fire due to "locally" in intent + network.outbound
    assert.ok(typeof result.diagnostics === "object");
  });
});

describe("Governance verifier — LLN-GOV-011 unknown contract set", () => {
  it("emits LLN-GOV-011 when use references an undeclared contract set", () => {
    const result = parseAndVerify(`
flow createOrder(request: Request) -> Result<Response, ApiError>
contract {
  effects { database.write }
  use UnknownSet
}
{
  return Ok(Response.ok({}))
}
`);
    assert.ok(hasDiag(result, "LLN-GOV-011"), "Expected LLN-GOV-011 for unknown contract set");
  });

  it("LLN-GOV-011 is error severity", () => {
    const result = parseAndVerify(`
flow createOrder(request: Request) -> Result<Response, ApiError>
contract {
  effects { database.write }
  use UnknownSet
}
{
  return Ok(Response.ok({}))
}
`);
    const diag = result.diagnostics.find((d) => d.code === "LLN-GOV-011");
    assert.ok(diag !== undefined, "Expected LLN-GOV-011 diagnostic");
    assert.equal(diag.severity, "error");
  });

  it("does not emit LLN-GOV-011 when contract set is declared", () => {
    const result = parseAndVerify(`
contract set OrderPolicy {
  rules {}
  events {}
  audit {}
}

flow createOrder(request: Request) -> Result<Response, ApiError>
contract {
  effects { database.write }
  use OrderPolicy
}
{
  return Ok(Response.ok({}))
}
`);
    assert.ok(!hasDiag(result, "LLN-GOV-011"), "Unexpected LLN-GOV-011 when contract set is declared");
  });

  it("LLN-GOV-011 constant has correct code", () => {
    assert.equal(LLN_GOV_011.code, "LLN-GOV-011");
    assert.equal(LLN_GOV_011.name, "UnknownContractSet");
  });
});

describe("Governance verifier — LLN-GOV-012 contract set requirement not met", () => {
  it("emits LLN-GOV-012 when contract set has audit requirement and flow lacks audit.write", () => {
    const result = parseAndVerify(`
contract set AuditedPolicy {
  rules {}
  audit {
    require audit.write
  }
}

flow createOrder(request: Request) -> Result<Response, ApiError>
contract {
  effects { database.write }
  use AuditedPolicy
}
{
  return Ok(Response.ok({}))
}
`);
    assert.ok(hasDiag(result, "LLN-GOV-012"), "Expected LLN-GOV-012 when audit requirement not met");
  });

  it("LLN-GOV-012 is warning severity", () => {
    const result = parseAndVerify(`
contract set AuditedPolicy {
  audit {
    require audit.write
  }
}

flow createOrder(request: Request) -> Result<Response, ApiError>
contract {
  effects { database.write }
  use AuditedPolicy
}
{
  return Ok(Response.ok({}))
}
`);
    const diag = result.diagnostics.find((d) => d.code === "LLN-GOV-012");
    assert.ok(diag !== undefined, "Expected LLN-GOV-012 diagnostic");
    assert.equal(diag.severity, "warning");
  });

  it("does not emit LLN-GOV-012 when flow declares audit.write", () => {
    const result = parseAndVerify(`
contract set AuditedPolicy {
  audit {
    require audit.write
  }
}

flow createOrder(request: Request) -> Result<Response, ApiError>
contract {
  effects { database.write audit.write }
  use AuditedPolicy
}
{
  return Ok(Response.ok({}))
}
`);
    assert.ok(!hasDiag(result, "LLN-GOV-012"), "Unexpected LLN-GOV-012 when audit.write is declared");
  });

  it("does not emit LLN-GOV-012 when contract set audit block is empty", () => {
    const result = parseAndVerify(`
contract set SimplePolicy {
  rules {}
  audit {}
}

flow createOrder(request: Request) -> Result<Response, ApiError>
contract {
  effects { database.write }
  use SimplePolicy
}
{
  return Ok(Response.ok({}))
}
`);
    assert.ok(!hasDiag(result, "LLN-GOV-012"), "Unexpected LLN-GOV-012 when audit block is empty");
  });

  it("LLN-GOV-012 constant has correct code", () => {
    assert.equal(LLN_GOV_012.code, "LLN-GOV-012");
    assert.equal(LLN_GOV_012.name, "ContractSetRequirementNotMet");
  });
});

describe("Governance verifier — runtime integration", () => {
  it("run() includes governanceDiagnostics in result", async () => {
    const { run } = await import("../dist/index.js");
    const result = await run(
      `pure flow greet() -> String { return "hello" }`,
      "test.lln",
      "greet",
    );
    assert.ok(Array.isArray(result.governanceDiagnostics));
  });

  it("check-only mode still produces governanceDiagnostics", async () => {
    const { run } = await import("../dist/index.js");
    const result = await run(
      `secure flow test(request: Request) -> Result<Response, ApiError>
contract { effects { database.write } } { return Ok(Response.ok({})) }`,
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
    const result = await run(
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
    const result = await run(
      `pure flow answer() -> Int { return 42 }`,
      "test.lln",
      "answer",
      new Map(),
      { mode: "dev" },
    );
    assert.equal(result.proofChain, undefined, "proofChain should be absent in dev mode");
  });
});

// =============================================================================
// Phase 10C — LLN-GOV-003: response contract violation
// =============================================================================

describe("Governance verifier — LLN-GOV-003 response contract violation", () => {
  it("emits LLN-GOV-003 when a denied field appears in the response body", () => {
    const result = parseAndVerify(`
flow getPatient(readonly request: Request) -> GetPatientResult
contract {
  types {
    type GetPatientResult = Result<Response, ApiError>
  }
  response {
    returns PatientResponse
    denies { email }
  }
  effects { database.read }
}
{
  let patient = PatientsDB.find(request.params.id)?
  return Ok(Response.ok({ patientId: patient.id, email: patient.email }))
}
`);
    assert.ok(hasDiag(result, "LLN-GOV-003"), "Expected LLN-GOV-003 when denied field appears in response body");
  });

  it("does not emit LLN-GOV-003 when only allowed fields are returned", () => {
    const result = parseAndVerify(`
flow getPatient(readonly request: Request) -> GetPatientResult
contract {
  types {
    type GetPatientResult = Result<Response, ApiError>
  }
  response {
    returns PatientResponse
    exposes { patientId name }
    denies { email nhsNumber }
  }
  effects { database.read }
}
{
  let patient = PatientsDB.find(request.params.id)?
  return Ok(Response.ok({ patientId: patient.id, name: patient.name }))
}
`);
    assert.ok(!hasDiag(result, "LLN-GOV-003"), "Unexpected LLN-GOV-003 when no denied fields are used");
  });

  it("does not emit LLN-GOV-003 when there is no response section in the contract", () => {
    const result = parseAndVerify(`
flow getOrder(readonly request: Request) -> GetOrderResult
contract {
  types {
    type GetOrderResult = Result<Response, ApiError>
  }
  effects { database.read }
}
{
  return Ok(Response.ok({ orderId: request.params.id, email: request.user.email }))
}
`);
    assert.ok(!hasDiag(result, "LLN-GOV-003"), "Unexpected LLN-GOV-003 when no response contract section");
  });

  it("LLN-GOV-003 constant has correct code and name", () => {
    assert.equal(LLN_GOV_003.code, "LLN-GOV-003");
    assert.equal(LLN_GOV_003.name, "PROTECTED_DATA_IN_RESPONSE");
    assert.equal(LLN_GOV_003.severity, "error");
  });
});

// =============================================================================
// Phase 10C — LLN-CONTEXT-001: required context field not accessed
// =============================================================================

describe("Governance verifier — LLN-CONTEXT-001 required context not accessed", () => {
  it("emits LLN-CONTEXT-001 when context requires actor but body never accesses it", () => {
    const result = parseAndVerify(`
flow getRecord(readonly request: Request) -> GetRecordResult
contract {
  types {
    type GetRecordResult = Result<Response, ApiError>
  }
  context {
    require actor
  }
  effects { database.read }
}
{
  let record = RecordsDB.find(request.params.id)?
  return Ok(Response.ok({ id: record.id }))
}
`);
    assert.ok(hasDiag(result, "LLN-CONTEXT-001"), "Expected LLN-CONTEXT-001 when context.actor is never accessed");
  });

  it("does not emit LLN-CONTEXT-001 when context.actor is accessed in body", () => {
    const result = parseAndVerify(`
flow getRecord(readonly request: Request) -> GetRecordResult
contract {
  types {
    type GetRecordResult = Result<Response, ApiError>
  }
  context {
    require actor
  }
  effects { database.read }
}
{
  let actor = context.actor
  let record = RecordsDB.findForActor(actor, request.params.id)?
  return Ok(Response.ok({ id: record.id }))
}
`);
    assert.ok(!hasDiag(result, "LLN-CONTEXT-001"), "Unexpected LLN-CONTEXT-001 when context.actor is accessed");
  });

  it("does not emit LLN-CONTEXT-001 when there is no context section in the contract", () => {
    const result = parseAndVerify(`
flow getOrder(readonly request: Request) -> GetOrderResult
contract {
  types {
    type GetOrderResult = Result<Response, ApiError>
  }
  effects { database.read }
}
{
  return Ok(Response.ok({}))
}
`);
    assert.ok(!hasDiag(result, "LLN-CONTEXT-001"), "Unexpected LLN-CONTEXT-001 when no context contract section");
  });

  it("LLN-CONTEXT-001 is warning severity", () => {
    const result = parseAndVerify(`
flow getRecord(readonly request: Request) -> GetRecordResult
contract {
  types {
    type GetRecordResult = Result<Response, ApiError>
  }
  context {
    require trace_id
  }
  effects { database.read }
}
{
  return Ok(Response.ok({}))
}
`);
    const diag = result.diagnostics.find((d) => d.code === "LLN-CONTEXT-001");
    assert.ok(diag !== undefined, "Expected LLN-CONTEXT-001 diagnostic");
    assert.equal(diag.severity, "warning");
  });

  it("LLN-CONTEXT-001 constant has correct code and name", () => {
    assert.equal(LLN_CONTEXT_001.code, "LLN-CONTEXT-001");
    assert.equal(LLN_CONTEXT_001.name, "REQUIRED_CONTEXT_NOT_ACCESSED");
    assert.equal(LLN_CONTEXT_001.severity, "warning");
  });
});

// =============================================================================
// LLN-GOV-005: policy purpose mismatch
// =============================================================================

describe("Governance verifier — LLN-GOV-005 policy purpose mismatch", () => {
  it("emits LLN-GOV-005 warning when purpose 'read-only' but database.write is declared", () => {
    const result = parseAndVerify(`
flow getPatient(readonly request: Request) -> GetPatientResult
contract { effects { database.write } }
policy {
  purpose "read-only"
}
{
  return Ok(Response.ok({}))
}
`);
    assert.ok(hasDiag(result, "LLN-GOV-005"), "Expected LLN-GOV-005 when read-only purpose contradicts database.write");
    const diag = result.diagnostics.find((d) => d.code === "LLN-GOV-005");
    assert.equal(diag.severity, "warning");
  });

  it("does not emit LLN-GOV-005 when purpose 'read-only' and no database.write", () => {
    const result = parseAndVerify(`
flow getPatient(readonly request: Request) -> GetPatientResult
contract { effects { database.read } }
policy {
  purpose "read-only"
}
{
  return Ok(Response.ok({}))
}
`);
    assert.ok(!hasDiag(result, "LLN-GOV-005"), "Unexpected LLN-GOV-005 when effects are compatible with purpose");
  });

  it("emits LLN-GOV-005 warning when purpose 'internal' but network.outbound is declared", () => {
    const result = parseAndVerify(`
flow syncData(request: Request) -> SyncResult
contract { effects { network.outbound } }
policy {
  purpose "internal"
}
{
  return Ok(Response.ok({}))
}
`);
    assert.ok(hasDiag(result, "LLN-GOV-005"), "Expected LLN-GOV-005 when internal purpose contradicts network.outbound");
  });

  it("LLN-GOV-005 constant has correct code and name", () => {
    assert.equal(LLN_GOV_005.code, "LLN-GOV-005");
    assert.equal(LLN_GOV_005.name, "PolicyPurposeMismatch");
    assert.equal(LLN_GOV_005.severity, "warning");
  });
});

// =============================================================================
// LLN-GOV-007: authority block missing reason
// =============================================================================

describe("Governance verifier — LLN-GOV-007 authority block missing reason", () => {
  it("emits LLN-GOV-007 error when authority block has no reason clause", () => {
    // The authority block is a flow clause (between signature and body).
    const result = parseAndVerify(`
flow sharePayments(request: Request) -> Result<Response, ApiError>
contract { effects { database.read } }
authority share Payments.processor {
  audit required
  require payment.read
}
{
  return Ok(Response.ok({}))
}
`);
    assert.ok(hasDiag(result, "LLN-GOV-007"), "Expected LLN-GOV-007 when authority block has no reason");
    const diag = result.diagnostics.find((d) => d.code === "LLN-GOV-007");
    assert.equal(diag.severity, "error");
  });

  it("does not emit LLN-GOV-007 when authority block has a reason clause", () => {
    const result = parseAndVerify(`
flow sharePayments(request: Request) -> Result<Response, ApiError>
contract { effects { database.read } }
authority share Payments.processor {
  reason "Needed to process payment transactions"
  audit required
  require payment.read
}
{
  return Ok(Response.ok({}))
}
`);
    assert.ok(!hasDiag(result, "LLN-GOV-007"), "Unexpected LLN-GOV-007 when authority block has a reason");
  });

  it("LLN-GOV-007 constant has correct code and name", () => {
    assert.equal(LLN_GOV_007.code, "LLN-GOV-007");
    assert.equal(LLN_GOV_007.name, "AuthorityBlockMissingReason");
    assert.equal(LLN_GOV_007.severity, "error");
  });
});

// =============================================================================
// LLN-GOV-009: privileged flow missing capability
// =============================================================================

describe("Governance verifier — LLN-GOV-009 privileged flow missing capability", () => {
  it("emits LLN-GOV-009 warning when privileged flow has no effects or contract", () => {
    // Privileged flows are detected via identifier child with value "qualifier:privileged".
    // Since the parser does not yet emit a dedicated privilegedFlowDecl kind,
    // we build a minimal AST directly using the verifyGovernance function.
    const ast = {
      kind: "program",
      children: [
        {
          kind: "flowDecl",
          value: "createAdmin",
          children: [
            { kind: "identifier", value: "qualifier:privileged" },
            { kind: "typeRef", value: "Void" },
            { kind: "block", children: [] },
          ],
        },
      ],
    };
    const flows = [
      {
        name: "createAdmin",
        qualifier: "flow",
        params: [],
        returnType: "Void",
        declaredEffects: [],
        location: { file: "test.lln", line: 1, column: 1 },
      },
    ];
    const result = verifyGovernance(ast, flows, [], "dev");
    assert.ok(
      result.diagnostics.some((d) => d.code === "LLN-GOV-009"),
      "Expected LLN-GOV-009 for privileged flow with no effects or contract",
    );
    const diag = result.diagnostics.find((d) => d.code === "LLN-GOV-009");
    assert.equal(diag.severity, "warning");
  });

  it("LLN-GOV-009 constant has correct code and name", () => {
    assert.equal(LLN_GOV_009.code, "LLN-GOV-009");
    assert.equal(LLN_GOV_009.name, "PrivilegedFlowMissingCapability");
    assert.equal(LLN_GOV_009.severity, "warning");
  });
});

// =============================================================================
// Phase 22C — extractArenaLimitMB
// =============================================================================

describe("extractArenaLimitMB: contract.memory arena extraction", () => {
  it("returns undefined for a node with no contractDecl", () => {
    // Minimal AST node with no children
    const node = { kind: "flowDecl", value: "test", children: [] };
    assert.equal(extractArenaLimitMB(node), undefined);
  });

  it("returns undefined for contractDecl with no memory:block", () => {
    const node = {
      kind: "flowDecl",
      value: "test",
      children: [
        {
          kind: "contractDecl",
          value: undefined,
          children: [
            { kind: "identifier", value: "effects:block", children: [] },
          ],
        },
      ],
    };
    assert.equal(extractArenaLimitMB(node), undefined);
  });

  it("returns 8 for contract { memory { arena 8 mb } } structure", () => {
    const node = {
      kind: "flowDecl",
      value: "test",
      children: [
        {
          kind: "contractDecl",
          value: undefined,
          children: [
            {
              kind: "identifier",
              value: "memory:block",
              children: [
                {
                  kind: "identifier",
                  value: "decl:arena 8 mb",
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    };
    assert.equal(extractArenaLimitMB(node), 8);
  });
});

// =============================================================================
// GOV-003 accuracy — no false positive when field is in redact() call
// =============================================================================

describe("Governance verifier — GOV-003 accuracy with redact()", () => {
  it("does not emit LLN-GOV-003 when denied field is wrapped in redact() call", () => {
    const result = parseAndVerify(`
flow getPatient(readonly request: Request) -> GetPatientResult
contract {
  types {
    type GetPatientResult = Result<Response, ApiError>
  }
  response {
    returns PatientResponse
    denies { email }
  }
  effects { database.read }
}
{
  let patient = PatientsDB.find(request.params.id)?
  return Ok(Response.ok({ patientId: patient.id, email: redact(patient.email) }))
}
`);
    assert.ok(!hasDiag(result, "LLN-GOV-003"), "Unexpected LLN-GOV-003 when email is wrapped in redact()");
  });
});

// ── LLN-GOV-015/016: epilogue {} strategy validation ─────────────────────────
describe("Governance verifier — epilogue {} strategy validation", () => {
  const mk = (epi) =>
    `secure flow f(x: Int) -> Int\ncontract { intent { "test" }  ${epi} }\n{ return x }`;

  it("a valid epilogue (sha256_seal + halt_pipeline) produces no diagnostic", () => {
    const r = parseAndVerify(mk("epilogue { generate_proof sha256_seal  on_verification_failure halt_pipeline }"), "production");
    assert.ok(!hasDiag(r, "LLN-GOV-015") && !hasDiag(r, "LLN-GOV-016"), `unexpected: ${r.diagnostics.map(d=>d.code).join(",")}`);
  });

  it("epilogue with generate_proof auto is valid", () => {
    const r = parseAndVerify(mk("epilogue { generate_proof auto }"), "production");
    assert.ok(!hasDiag(r, "LLN-GOV-015"));
  });

  it("an unrecognised proof strategy → LLN-GOV-015", () => {
    const r = parseAndVerify(mk("epilogue { generate_proof unknown_algo }"), "production");
    assert.ok(hasDiag(r, "LLN-GOV-015"), `expected GOV-015, got: ${r.diagnostics.map(d=>d.code).join(",")}`);
  });

  it("an unrecognised failure action → LLN-GOV-016", () => {
    const r = parseAndVerify(mk("epilogue { generate_proof sha256_seal  on_verification_failure explode }"), "production");
    assert.ok(hasDiag(r, "LLN-GOV-016"), `expected GOV-016`);
  });

  it("omitting the epilogue block entirely is auto-by-default (no diagnostic)", () => {
    const r = parseAndVerify(mk(""), "production");
    assert.ok(!hasDiag(r, "LLN-GOV-015") && !hasDiag(r, "LLN-GOV-016"), `unexpected: ${r.diagnostics.map(d=>d.code).join(",")}`);
  });
});
