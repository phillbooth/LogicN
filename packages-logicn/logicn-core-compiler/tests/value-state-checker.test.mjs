import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseProgram, checkValueStates } from "../dist/index.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseAndCheck(source) {
  const parsed = parseProgram(source, "test.lln");
  return checkValueStates(parsed.ast);
}

function hasDiag(result, code) {
  return result.diagnostics.some((d) => d.code === code);
}

function diagsWithCode(result, code) {
  return result.diagnostics.filter((d) => d.code === code);
}

// ── LLN-VALUESTATE-001: safe mut requires a gate ──────────────────────────────

describe("Value-state checker — safe mut gate requirement", () => {
  it("emits LLN-VALUESTATE-001 when safe mut has no gate call", () => {
    const result = parseAndCheck(`
secure flow test(raw: String) -> Result<String, Error>
effects [database.read] {
  unsafe let rawEmail: String = raw
  safe mut rawEmail = rawEmail
  return Ok(rawEmail)
}
`);
    assert.ok(
      hasDiag(result, "LLN-VALUESTATE-001"),
      `Expected LLN-VALUESTATE-001, got: ${result.diagnostics.map((d) => d.code).join(", ")}`,
    );
  });

  it("does not emit LLN-VALUESTATE-001 when safe mut uses validate.*", () => {
    const result = parseAndCheck(`
secure flow test(raw: String) -> Result<String, Error>
effects [database.read] {
  unsafe let rawEmail: String = raw
  safe mut rawEmail = validate.email(rawEmail)?
  return Ok(rawEmail)
}
`);
    assert.ok(
      !hasDiag(result, "LLN-VALUESTATE-001"),
      `Unexpected LLN-VALUESTATE-001 with validate.* gate`,
    );
  });

  it("does not emit LLN-VALUESTATE-001 when safe mut uses json.decode", () => {
    const result = parseAndCheck(`
secure flow test(raw: Bytes) -> Result<String, Error>
effects [database.read] {
  unsafe let rawBody: Bytes = raw
  safe mut rawBody = json.decode(rawBody)?
  return Ok(rawBody)
}
`);
    assert.ok(
      !hasDiag(result, "LLN-VALUESTATE-001"),
      `Unexpected LLN-VALUESTATE-001 with json.decode gate`,
    );
  });

  it("does not emit LLN-VALUESTATE-001 when safe mut uses sanitize.*", () => {
    const result = parseAndCheck(`
secure flow test(raw: String) -> Result<String, Error>
effects [database.read] {
  unsafe let rawText: String = raw
  safe mut rawText = sanitize.text(rawText)?
  return Ok(rawText)
}
`);
    assert.ok(
      !hasDiag(result, "LLN-VALUESTATE-001"),
      `Unexpected LLN-VALUESTATE-001 with sanitize.* gate`,
    );
  });

  it("emits LLN-VALUESTATE-001 when safe mut uses an arbitrary expression (no gate)", () => {
    const result = parseAndCheck(`
secure flow test(raw: String) -> Result<String, Error>
effects [database.read] {
  unsafe let rawEmail: String = raw
  safe mut rawEmail = someHelper(rawEmail)
  return Ok(rawEmail)
}
`);
    assert.ok(
      hasDiag(result, "LLN-VALUESTATE-001"),
      `Expected LLN-VALUESTATE-001 for non-gate upgrade`,
    );
  });
});

// ── LLN-VALUESTATE-003: unsafe binding at governed sink ───────────────────────

describe("Value-state checker — unsafe at governed sink", () => {
  it("emits LLN-VALUESTATE-003 when unsafe let reaches a DB insert", () => {
    const result = parseAndCheck(`
secure flow test(raw: String) -> Result<String, Error>
effects [database.write] {
  unsafe let rawInput: String = raw
  let saved = DB.insert(rawInput)?
  return Ok(saved)
}
`);
    assert.ok(
      hasDiag(result, "LLN-VALUESTATE-003"),
      `Expected LLN-VALUESTATE-003, got: ${result.diagnostics.map((d) => d.code).join(", ")}`,
    );
  });

  it("does not emit LLN-VALUESTATE-003 when binding is upgraded before sink", () => {
    const result = parseAndCheck(`
secure flow test(raw: String) -> Result<String, Error>
effects [database.write] {
  unsafe let rawInput: String = raw
  safe mut rawInput = validate.input(rawInput)?
  let saved = DB.insert(rawInput)?
  return Ok(saved)
}
`);
    assert.ok(
      !hasDiag(result, "LLN-VALUESTATE-003"),
      `Unexpected LLN-VALUESTATE-003 after safe mut upgrade`,
    );
  });

  it("emits LLN-VALUESTATE-003 when unsafe let reaches AuditLog.write", () => {
    const result = parseAndCheck(`
secure flow test(raw: String) -> Result<String, Error>
effects [audit.write] {
  unsafe let rawMsg: String = raw
  AuditLog.write(rawMsg)
  return Ok(rawMsg)
}
`);
    assert.ok(
      hasDiag(result, "LLN-VALUESTATE-003"),
      `Expected LLN-VALUESTATE-003 for AuditLog.write`,
    );
  });

  it("does not emit LLN-VALUESTATE-003 for plain let bindings at a sink", () => {
    const result = parseAndCheck(`
secure flow test() -> Result<String, Error>
effects [database.write] {
  let safeData: String = buildRecord()
  let saved = DB.insert(safeData)?
  return Ok(saved)
}
`);
    assert.ok(
      !hasDiag(result, "LLN-VALUESTATE-003"),
      `Unexpected LLN-VALUESTATE-003 for safe let binding`,
    );
  });
});

// ── LLN-SECRET-001: SecureString in log call ──────────────────────────────────

describe("Value-state checker — SecureString logging", () => {
  it("emits LLN-SECRET-001 when SecureString is passed to print", () => {
    const result = parseAndCheck(`
secure flow test() -> Result<String, Error>
effects [secret.read] {
  let apiKey: SecureString = env.secret("API_KEY")
  print(apiKey)
  return Ok("done")
}
`);
    assert.ok(
      hasDiag(result, "LLN-SECRET-001"),
      `Expected LLN-SECRET-001, got: ${result.diagnostics.map((d) => d.code).join(", ")}`,
    );
  });

  it("emits LLN-SECRET-001 when SecureString is passed to log.info", () => {
    const result = parseAndCheck(`
secure flow test() -> Result<String, Error>
effects [secret.read] {
  let apiKey: SecureString = env.secret("API_KEY")
  log.info(apiKey)
  return Ok("done")
}
`);
    assert.ok(
      hasDiag(result, "LLN-SECRET-001"),
      `Expected LLN-SECRET-001 for log.info`,
    );
  });

  it("does not emit LLN-SECRET-001 when SecureString is passed to redact", () => {
    const result = parseAndCheck(`
secure flow test() -> Result<String, Error>
effects [secret.read] {
  let apiKey: SecureString = env.secret("API_KEY")
  let safe = redact(apiKey)
  return Ok(safe)
}
`);
    assert.ok(
      !hasDiag(result, "LLN-SECRET-001"),
      `Unexpected LLN-SECRET-001 when using redact()`,
    );
  });

  it("does not emit LLN-SECRET-001 for non-SecureString passed to print", () => {
    const result = parseAndCheck(`
flow test() -> String {
  let msg: String = "hello"
  print(msg)
  return msg
}
`);
    assert.ok(
      !hasDiag(result, "LLN-SECRET-001"),
      `Unexpected LLN-SECRET-001 for plain String`,
    );
  });
});

// ── LLN-SECRET-002: SecureString equality comparison ─────────────────────────

describe("Value-state checker — SecureString equality", () => {
  it("emits LLN-SECRET-002 when SecureString is compared with ==", () => {
    const result = parseAndCheck(`
secure flow test() -> Result<Bool, Error>
effects [secret.read] {
  let expected: SecureString = env.secret("TOKEN")
  let provided: SecureString = env.secret("PROVIDED")
  let valid: Bool = provided == expected
  return Ok(valid)
}
`);
    assert.ok(
      hasDiag(result, "LLN-SECRET-002"),
      `Expected LLN-SECRET-002, got: ${result.diagnostics.map((d) => d.code).join(", ")}`,
    );
  });

  it("emits LLN-SECRET-002 when SecureString is compared with !=", () => {
    const result = parseAndCheck(`
secure flow test() -> Result<Bool, Error>
effects [secret.read] {
  let expected: SecureString = env.secret("TOKEN")
  let provided: SecureString = env.secret("PROVIDED")
  let different: Bool = provided != expected
  return Ok(different)
}
`);
    assert.ok(
      hasDiag(result, "LLN-SECRET-002"),
      `Expected LLN-SECRET-002 for != comparison`,
    );
  });

  it("does not emit LLN-SECRET-002 for plain String equality", () => {
    const result = parseAndCheck(`
flow test(a: String, b: String) -> Bool {
  let equal: Bool = a == b
  return equal
}
`);
    assert.ok(
      !hasDiag(result, "LLN-SECRET-002"),
      `Unexpected LLN-SECRET-002 for String == String`,
    );
  });

  it("does not emit LLN-SECRET-002 for numeric equality", () => {
    const result = parseAndCheck(`
flow test(a: Int, b: Int) -> Bool {
  let equal: Bool = a == b
  return equal
}
`);
    assert.ok(
      !hasDiag(result, "LLN-SECRET-002"),
      `Unexpected LLN-SECRET-002 for Int == Int`,
    );
  });
});

// ── Safe flow with no value-state issues ─────────────────────────────────────

describe("Value-state checker — clean flows produce no diagnostics", () => {
  it("emits no value-state diagnostics for a clean secure flow", () => {
    const result = parseAndCheck(`
secure flow createCustomer(req: Request) -> Result<Response, ApiError>
effects [database.write, audit.write] {
  unsafe let rawBody: Bytes = req.rawBody
  safe mut rawBody = json.decode(rawBody)?
  let saved = CustomersDB.insert(rawBody)?
  AuditLog.write(saved)
  return Ok(saved)
}
`);
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    assert.equal(
      errors.length,
      0,
      `Expected no errors, got: ${errors.map((d) => `${d.code}: ${d.message}`).join("\n")}`,
    );
  });

  it("emits no value-state diagnostics for a pure flow", () => {
    const result = parseAndCheck(`
pure flow add(a: Int, b: Int) -> Int {
  let sum: Int = a
  return sum
}
`);
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    assert.equal(errors.length, 0, `Unexpected errors in pure flow`);
  });
});
