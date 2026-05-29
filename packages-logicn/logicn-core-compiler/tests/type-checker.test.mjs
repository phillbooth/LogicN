import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseProgram, checkTypes } from "../dist/index.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseAndCheck(source) {
  const parsed = parseProgram(source, "test.lln");
  return checkTypes(parsed.ast);
}

function hasDiag(result, code) {
  return result.diagnostics.some((d) => d.code === code);
}

function diagsWithCode(result, code) {
  return result.diagnostics.filter((d) => d.code === code);
}

// ── LLN-TYPE-001: Unknown type ────────────────────────────────────────────────

describe("Type checker — LLN-TYPE-001 unknown type", () => {
  it("emits LLN-TYPE-001 for a misspelled built-in type in a parameter", () => {
    const result = parseAndCheck(`
flow test(name: Strng) -> String {
  return name
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-001"),
      `Expected LLN-TYPE-001 for 'Strng', got: ${result.diagnostics.map((d) => d.code).join(", ")}`,
    );
  });

  it("emits LLN-TYPE-001 for an unknown return type", () => {
    const result = parseAndCheck(`
flow test(x: Int) -> Integerr {
  return x
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-001"),
      `Expected LLN-TYPE-001 for 'Integerr'`,
    );
  });

  it("emits LLN-TYPE-001 for unknown type in let binding annotation", () => {
    const result = parseAndCheck(`
flow test() -> String {
  let x: Numbr = 42
  return "ok"
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-001"),
      `Expected LLN-TYPE-001 for 'Numbr'`,
    );
  });

  it("does not emit LLN-TYPE-001 for all built-in scalar types", () => {
    const result = parseAndCheck(`
flow test(
  a: Bool,
  b: Int,
  c: String,
  d: Float,
  e: Bytes,
  f: Timestamp,
  g: Duration
) -> Void {
  return
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-001"),
      `Unexpected LLN-TYPE-001 for built-in scalar types`,
    );
  });

  it("does not emit LLN-TYPE-001 for all built-in error types", () => {
    const result = parseAndCheck(`
flow test(e: ApiError) -> Result<String, ValidationError> {
  return Ok("ok")
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-001"),
      `Unexpected LLN-TYPE-001 for ApiError / ValidationError`,
    );
  });

  it("does not emit LLN-TYPE-001 for a user-defined type", () => {
    const result = parseAndCheck(`
type Order {
  id: String
}

flow test(order: Order) -> String {
  return order.id
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-001"),
      `Unexpected LLN-TYPE-001 for user-defined type 'Order'`,
    );
  });

  it("does not emit LLN-TYPE-001 for a user-defined enum", () => {
    const result = parseAndCheck(`
enum Status {
  Active
  Inactive
}

flow test(s: Status) -> Bool {
  return true
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-001"),
      `Unexpected LLN-TYPE-001 for user-defined enum 'Status'`,
    );
  });

  it("includes a fuzzy suggestion when the type name is close to a known type", () => {
    const result = parseAndCheck(`
flow test(x: Strng) -> String {
  return x
}
`);
    const diags = diagsWithCode(result, "LLN-TYPE-001");
    assert.ok(diags.length > 0, `Expected LLN-TYPE-001 for 'Strng'`);
    // Suggestion should mention String
    const hasSuggestion = diags.some(
      (d) => d.suggestedFix !== undefined && d.suggestedFix.includes("String"),
    );
    assert.ok(hasSuggestion, `Expected fuzzy suggestion mentioning 'String'`);
  });
});

// ── LLN-TYPE-009: Generic arity mismatch ──────────────────────────────────────

describe("Type checker — LLN-TYPE-009 generic arity", () => {
  it("emits LLN-TYPE-009 for Option with two type args", () => {
    const result = parseAndCheck(`
flow test(x: Option<String, Error>) -> Option<String, Error> {
  return x
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-009"),
      `Expected LLN-TYPE-009 for Option<String, Error>`,
    );
  });

  it("emits LLN-TYPE-009 for Map with only one type arg", () => {
    const result = parseAndCheck(`
flow test(m: Map<String>) -> Map<String> {
  return m
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-009"),
      `Expected LLN-TYPE-009 for Map<String>`,
    );
  });

  it("emits LLN-TYPE-009 for Result with one type arg", () => {
    const result = parseAndCheck(`
flow test() -> Result<String> {
  return Ok("ok")
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-009"),
      `Expected LLN-TYPE-009 for Result<String>`,
    );
  });

  it("does not emit LLN-TYPE-009 for Option with correct arity", () => {
    const result = parseAndCheck(`
flow test(x: Option<String>) -> Option<String> {
  return x
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-009"),
      `Unexpected LLN-TYPE-009 for Option<String>`,
    );
  });

  it("does not emit LLN-TYPE-009 for Result<T, E> with correct arity", () => {
    const result = parseAndCheck(`
flow test() -> Result<String, Error> {
  return Ok("ok")
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-009"),
      `Unexpected LLN-TYPE-009 for Result<String, Error>`,
    );
  });

  it("does not emit LLN-TYPE-009 for Map<K, V> with correct arity", () => {
    const result = parseAndCheck(`
flow test(m: Map<String, Int>) -> Map<String, Int> {
  return m
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-009"),
      `Unexpected LLN-TYPE-009 for Map<String, Int>`,
    );
  });

  it("does not emit LLN-TYPE-009 for Array<T> with correct arity", () => {
    const result = parseAndCheck(`
flow test(arr: Array<String>) -> Array<String> {
  return arr
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-009"),
      `Unexpected LLN-TYPE-009 for Array<String>`,
    );
  });

  it("does not emit LLN-TYPE-009 for Money<GBP> with correct arity", () => {
    const result = parseAndCheck(`
pure flow vat(amount: Money<GBP>) -> Money<GBP> {
  return amount
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-009"),
      `Unexpected LLN-TYPE-009 for Money<GBP>`,
    );
  });

  it("also checks type args recursively", () => {
    // Option<Map<String>> — Map has wrong arity (1 arg instead of 2)
    const result = parseAndCheck(`
flow test(x: Option<Map<String>>) -> Option<Map<String>> {
  return x
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-009"),
      `Expected LLN-TYPE-009 for nested Map<String>`,
    );
  });
});

// ── All built-in generic types with correct arity ─────────────────────────────

describe("Type checker — built-in generic types valid arity", () => {
  it("accepts all generic types with correct arity", () => {
    const result = parseAndCheck(`
flow test(
  a: Option<String>,
  b: Result<String, Error>,
  c: Array<Int>,
  d: Set<String>,
  e: Map<String, Int>,
  f: Channel<String>,
  g: Money<GBP>
) -> Void {
  return
}
`);
    const errors = result.diagnostics.filter((d) => d.severity === "error");
    assert.equal(
      errors.length,
      0,
      `Unexpected type errors: ${errors.map((d) => `${d.code}: ${d.message}`).join("\n")}`,
    );
  });
});

// ── Type checker on the full LogicN type catalogue ────────────────────────────

describe("Type checker — full built-in type catalogue", () => {
  it("accepts all numeric types as parameter annotations", () => {
    const result = parseAndCheck(`
flow test(
  a: Int8,
  b: Int16,
  c: Int32,
  d: Int64,
  e: UInt8,
  f: UInt16,
  g: UInt32,
  h: UInt64,
  i: Float16,
  j: Float32,
  k: Float64,
  l: Decimal
) -> Void {
  return
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-001"),
      `Unexpected LLN-TYPE-001 for numeric types`,
    );
  });

  it("accepts all JSON types as parameter annotations", () => {
    const result = parseAndCheck(`
flow test(
  a: Json,
  b: JsonNull,
  c: JsonBool,
  d: JsonNumber,
  e: JsonString,
  f: JsonArray,
  g: JsonObject
) -> Void {
  return
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-001"),
      `Unexpected LLN-TYPE-001 for JSON types`,
    );
  });
});

// ── LLN-TYPE-008: null / undefined rejection ──────────────────────────────────

describe("Type checker — LLN-TYPE-008 null/undefined", () => {
  it("emits LLN-TYPE-008 for null literal in expression", () => {
    const result = parseAndCheck(`
flow test() -> String {
  let x: String = null
  return "ok"
}
`);
    assert.ok(hasDiag(result, "LLN-TYPE-008"), "Expected LLN-TYPE-008 for null");
  });

  it("emits LLN-TYPE-008 for undefined literal in expression", () => {
    const result = parseAndCheck(`
flow test() -> String {
  let x: String = undefined
  return "ok"
}
`);
    assert.ok(hasDiag(result, "LLN-TYPE-008"), "Expected LLN-TYPE-008 for undefined");
  });

  it("does not emit LLN-TYPE-008 for None (valid LogicN absence value)", () => {
    const result = parseAndCheck(`
flow test() -> Option<String> {
  return None
}
`);
    assert.ok(!hasDiag(result, "LLN-TYPE-008"), "Unexpected LLN-TYPE-008 for None");
  });
});

// ── LLN-TYPE-020: shadowed binding ───────────────────────────────────────────

describe("Type checker — LLN-TYPE-020 shadowed binding", () => {
  it("emits LLN-TYPE-020 warning when inner binding shadows outer", () => {
    const result = parseAndCheck(`
flow test() -> String {
  let name: String = "outer"
  if true {
    let name: String = "inner"
    return name
  }
  return name
}
`);
    assert.ok(hasDiag(result, "LLN-TYPE-020"), "Expected LLN-TYPE-020 for shadowed binding");
    const diags = diagsWithCode(result, "LLN-TYPE-020");
    assert.ok(diags.every((d) => d.severity === "warning"), "LLN-TYPE-020 must be a warning");
  });

  it("does not emit LLN-TYPE-020 for first declaration (no shadow)", () => {
    const result = parseAndCheck(`
flow test() -> String {
  let name: String = "only"
  return name
}
`);
    assert.ok(!hasDiag(result, "LLN-TYPE-020"), "Unexpected LLN-TYPE-020 for non-shadowing binding");
  });
});

// ── LLN-NAME-002: duplicate name in same scope ────────────────────────────────

describe("Type checker — LLN-NAME-002 duplicate name", () => {
  it("emits LLN-NAME-002 when same name declared twice in same scope", () => {
    const result = parseAndCheck(`
flow test() -> String {
  let x: String = "first"
  let x: String = "second"
  return x
}
`);
    assert.ok(hasDiag(result, "LLN-NAME-002"), "Expected LLN-NAME-002 for duplicate binding");
  });

  it("does not emit LLN-NAME-002 for same name in different scopes", () => {
    const result = parseAndCheck(`
flow test() -> String {
  let x: String = "outer"
  if true {
    let x: String = "inner"
    return x
  }
  return x
}
`);
    assert.ok(!hasDiag(result, "LLN-NAME-002"), "Unexpected LLN-NAME-002 — different scopes should not be duplicate");
  });
});

// ── LLN-TYPE-021: non-exhaustive match ───────────────────────────────────────

describe("Type checker — LLN-TYPE-021 non-exhaustive match", () => {
  it("emits LLN-TYPE-021 when Option match is missing None arm", () => {
    const result = parseAndCheck(`
flow test(x: Option<String>) -> String {
  match x {
    Some(v) => v
  }
}
`);
    assert.ok(hasDiag(result, "LLN-TYPE-021"), "Expected LLN-TYPE-021 for missing None arm");
  });

  it("emits LLN-TYPE-021 when Result match is missing Err arm", () => {
    const result = parseAndCheck(`
flow test(x: Result<String, Error>) -> String {
  match x {
    Ok(v) => v
  }
}
`);
    assert.ok(hasDiag(result, "LLN-TYPE-021"), "Expected LLN-TYPE-021 for missing Err arm");
  });

  it("emits LLN-TYPE-021 when enum match is missing a variant", () => {
    const result = parseAndCheck(`
enum Status {
  Active
  Suspended
  Deleted
}

flow test(s: Status) -> String {
  match s {
    Active => "active"
    Suspended => "suspended"
  }
}
`);
    assert.ok(hasDiag(result, "LLN-TYPE-021"), "Expected LLN-TYPE-021 for missing Deleted variant");
  });

  it("does not emit LLN-TYPE-021 when all Option arms present", () => {
    const result = parseAndCheck(`
flow test(x: Option<String>) -> String {
  match x {
    Some(v) => v
    None => "default"
  }
}
`);
    assert.ok(!hasDiag(result, "LLN-TYPE-021"), "Unexpected LLN-TYPE-021 for complete Option match");
  });

  it("does not emit LLN-TYPE-021 when wildcard _ arm is present", () => {
    const result = parseAndCheck(`
flow test(x: Option<String>) -> String {
  match x {
    Some(v) => v
    _ => "default"
  }
}
`);
    assert.ok(!hasDiag(result, "LLN-TYPE-021"), "Unexpected LLN-TYPE-021 when wildcard present");
  });
});

// ── LLN-TYPE-022: unreachable pattern ────────────────────────────────────────

describe("Type checker — LLN-TYPE-022 unreachable pattern", () => {
  it("emits LLN-TYPE-022 when arm follows wildcard _", () => {
    const result = parseAndCheck(`
flow test(x: Option<String>) -> String {
  match x {
    _ => "default"
    None => "none"
  }
}
`);
    assert.ok(hasDiag(result, "LLN-TYPE-022"), "Expected LLN-TYPE-022 for arm after wildcard");
  });

  it("does not emit LLN-TYPE-022 when wildcard is last arm", () => {
    const result = parseAndCheck(`
flow test(x: Option<String>) -> String {
  match x {
    Some(v) => v
    _ => "default"
  }
}
`);
    assert.ok(!hasDiag(result, "LLN-TYPE-022"), "Unexpected LLN-TYPE-022 when wildcard is last");
  });
});

describe("Type checker — LLN-TYPE-008 null/undefined", () => {
  it("emits LLN-TYPE-008 for null literal in expression", () => {
    const result = parseAndCheck(`
flow test() -> Option<String> {
  return null
}
`);
    assert.ok(hasDiag(result, "LLN-TYPE-008"), "Expected LLN-TYPE-008 for null");
  });

  it("emits LLN-TYPE-008 for undefined literal in expression", () => {
    const result = parseAndCheck(`
flow test() -> Option<String> {
  return undefined
}
`);
    assert.ok(hasDiag(result, "LLN-TYPE-008"), "Expected LLN-TYPE-008 for undefined");
  });

  it("does not emit LLN-TYPE-008 for None", () => {
    const result = parseAndCheck(`
flow test() -> Option<String> {
  return None
}
`);
    assert.ok(!hasDiag(result, "LLN-TYPE-008"), "None is a valid LogicN absence value");
  });
});

describe("Type checker — LLN-TYPE-020 shadowed binding", () => {
  it("emits LLN-TYPE-020 warning when inner binding shadows outer", () => {
    const result = parseAndCheck(`
flow test() -> Int {
  let total: Int = 1
  if true {
    let total: Int = 2
  }
  return total
}
`);
    assert.ok(hasDiag(result, "LLN-TYPE-020"), "Expected LLN-TYPE-020 for inner shadow");
  });

  it("does not emit LLN-TYPE-020 for same-scope redeclaration", () => {
    const result = parseAndCheck(`
flow test() -> Int {
  let total: Int = 1
  let total: Int = 2
  return total
}
`);
    assert.ok(!hasDiag(result, "LLN-TYPE-020"), "Same-scope duplicates belong to LLN-NAME-002");
  });

  it("LLN-TYPE-020 has severity warning", () => {
    const result = parseAndCheck(`
flow test() -> Int {
  let total: Int = 1
  if true {
    let total: Int = 2
  }
  return total
}
`);
    const diag = diagsWithCode(result, "LLN-TYPE-020")[0];
    assert.equal(diag?.severity, "warning");
  });
});

describe("Type checker — LLN-TYPE-021 non-exhaustive match", () => {
  it("emits LLN-TYPE-021 when Option match is missing None arm", () => {
    const result = parseAndCheck(`
flow test(value: Option<String>) -> String {
  match value {
    Some => "ok"
  }
  return "done"
}
`);
    assert.ok(hasDiag(result, "LLN-TYPE-021"), "Expected LLN-TYPE-021 for missing None");
  });

  it("emits LLN-TYPE-021 when Result match is missing Err arm", () => {
    const result = parseAndCheck(`
flow test(value: Result<String, Error>) -> String {
  match value {
    Ok => "ok"
  }
  return "done"
}
`);
    assert.ok(hasDiag(result, "LLN-TYPE-021"), "Expected LLN-TYPE-021 for missing Err");
  });

  it("emits LLN-TYPE-021 when enum match is missing a variant", () => {
    const result = parseAndCheck(`
enum Status {
  Active
  Inactive
}

flow test(status: Status) -> String {
  match status {
    Active => "active"
  }
  return "done"
}
`);
    assert.ok(hasDiag(result, "LLN-TYPE-021"), "Expected LLN-TYPE-021 for missing enum variant");
  });

  it("does not emit LLN-TYPE-021 when all arms present", () => {
    const result = parseAndCheck(`
flow test(value: Option<String>) -> String {
  match value {
    Some => "ok"
    None => "none"
  }
  return "done"
}
`);
    assert.ok(!hasDiag(result, "LLN-TYPE-021"), "Complete Option match should pass");
  });

  it("does not emit LLN-TYPE-021 when wildcard _ arm is present", () => {
    const result = parseAndCheck(`
enum Status {
  Active
  Inactive
}

flow test(status: Status) -> String {
  match status {
    Active => "active"
    _ => "other"
  }
  return "done"
}
`);
    assert.ok(!hasDiag(result, "LLN-TYPE-021"), "Wildcard should cover missing variants");
  });
});

describe("Type checker — prefix qualifier not LLN-TYPE-001", () => {
  it("let email: protected Email does not emit LLN-TYPE-001 for protected", () => {
    const result = parseAndCheck(`
type Email = Brand<String, "Email">

flow test(raw: String) -> String {
  let email: protected Email = validate.email(raw)?
  return "ok"
}
`);
    const messages = diagsWithCode(result, "LLN-TYPE-001").map((d) => d.message).join("\n");
    assert.ok(!messages.includes("'protected'"), `Unexpected protected UnknownType: ${messages}`);
  });

  it("let audit: redacted Email does not emit LLN-TYPE-001 for redacted", () => {
    const result = parseAndCheck(`
type Email = Brand<String, "Email">

flow test(email: Email) -> String {
  let audit: redacted Email = redact(email)
  return "ok"
}
`);
    const messages = diagsWithCode(result, "LLN-TYPE-001").map((d) => d.message).join("\n");
    assert.ok(!messages.includes("'redacted'"), `Unexpected redacted UnknownType: ${messages}`);
  });
});
