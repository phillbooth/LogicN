import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseProgram, resolveSymbols } from "../dist/index.js";

function parseAndResolve(source) {
  const parsed = parseProgram(source, "test.lln");
  return resolveSymbols(parsed.ast);
}

function hasDiag(result, code) {
  return result.diagnostics.some((d) => d.code === code);
}

describe("Symbol resolver — LLN-NAME-001 undeclared name", () => {
  it("emits LLN-NAME-001 when identifier in expression is not declared", () => {
    const result = parseAndResolve(`
flow test() -> Int {
  return missingValue
}
`);
    assert.ok(hasDiag(result, "LLN-NAME-001"), "Expected LLN-NAME-001 for missingValue");
  });

  it("does not emit LLN-NAME-001 for None, Some, Ok, Err", () => {
    const result = parseAndResolve(`
flow test() -> String {
  let a = None
  let b = Some
  let c = Ok
  let d = Err
  return "ok"
}
`);
    assert.ok(!hasDiag(result, "LLN-NAME-001"), "Option/Result constructors are built-in values");
  });

  it("does not emit LLN-NAME-001 for standard prelude names", () => {
    const result = parseAndResolve(`
flow test(raw: String) -> String {
  let email = validate.email(raw)?
  let audit = redact(email)
  let money = Money.gbp("1.00")
  return audit
}
`);
    assert.ok(!hasDiag(result, "LLN-NAME-001"), "Prelude names should be predeclared");
  });

  it("does not emit LLN-NAME-001 for flow-scoped parameter names", () => {
    const result = parseAndResolve(`
flow test(value: String) -> String {
  return value
}
`);
    assert.ok(!hasDiag(result, "LLN-NAME-001"), "Flow parameter should be in scope");
  });
});

describe("Symbol resolver — LLN-NAME-002 duplicate name", () => {
  it("emits LLN-NAME-002 when same name declared twice in same scope", () => {
    const result = parseAndResolve(`
flow test() -> Int {
  let total: Int = 1
  let total: Int = 2
  return total
}
`);
    assert.ok(hasDiag(result, "LLN-NAME-002"), "Expected LLN-NAME-002 for duplicate total");
  });

  it("does not emit LLN-NAME-002 for shadowing in inner scope", () => {
    const result = parseAndResolve(`
flow test() -> Int {
  let total: Int = 1
  if true {
    let total: Int = 2
  }
  return total
}
`);
    assert.ok(!hasDiag(result, "LLN-NAME-002"), "Inner shadowing is not same-scope duplicate");
  });
});
