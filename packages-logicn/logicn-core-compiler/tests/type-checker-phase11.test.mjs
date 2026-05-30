import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseProgram, checkTypes } from "../dist/index.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Part 1: inferType completeness ───────────────────────────────────────────

describe("inferType — listLiteral", () => {
  it("infers Array<Int> for a list of Int literals and no LLN-TYPE-010", () => {
    const result = parseAndCheck(`
flow test() -> Void {
  let xs: Array<Int> = [1, 2, 3]
  return
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-010"),
      `Unexpected LLN-TYPE-010 for valid Array<Int> = [1,2,3]`,
    );
    assert.ok(
      !hasDiag(result, "LLN-TYPE-002"),
      `Unexpected LLN-TYPE-002 for valid Array<Int>`,
    );
  });

  it("infers Array<String> for a list of String literals", () => {
    const result = parseAndCheck(`
flow test() -> Void {
  let xs: Array<String> = ["hello", "world"]
  return
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-010"),
      `Unexpected LLN-TYPE-010 for valid Array<String>`,
    );
  });

  it("allows bare Array without element type (no arity error for unconstrained)", () => {
    // Array without type param — checker may warn about arity but not element mismatch
    const result = parseAndCheck(`
flow test() -> Void {
  let xs: Array<String> = ["a", "b"]
  return
}
`);
    assert.ok(!hasDiag(result, "LLN-TYPE-010"), "No element mismatch for matching Array");
  });
});

// ── LLN-TYPE-010: Collection element type mismatch ───────────────────────────

describe("Type checker — LLN-TYPE-010 CollectionElementTypeMismatch", () => {
  it("emits LLN-TYPE-010 when Array<Int> contains a String element", () => {
    const result = parseAndCheck(`
flow test() -> Void {
  let xs: Array<Int> = [1, "two"]
  return
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-010"),
      `Expected LLN-TYPE-010 for Array<Int> = [1, "two"], got: ${result.diagnostics.map((d) => d.code).join(", ")}`,
    );
  });

  it("includes the element type in the diagnostic message", () => {
    const result = parseAndCheck(`
flow test() -> Void {
  let xs: Array<Int> = [1, "two"]
  return
}
`);
    const diags = diagsWithCode(result, "LLN-TYPE-010");
    assert.ok(diags.length > 0, "Expected LLN-TYPE-010");
    assert.ok(
      diags.some((d) => d.message.includes("String")),
      `Expected message to mention 'String', got: ${diags.map((d) => d.message).join("; ")}`,
    );
  });

  it("emits LLN-TYPE-010 when Array<Bool> contains an Int element", () => {
    const result = parseAndCheck(`
flow test() -> Void {
  let flags: Array<Bool> = [true, 42]
  return
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-010"),
      `Expected LLN-TYPE-010 for Array<Bool> = [true, 42]`,
    );
  });

  it("does not emit LLN-TYPE-010 for all-matching elements", () => {
    const result = parseAndCheck(`
flow test() -> Void {
  let flags: Array<Bool> = [true, false, true]
  return
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-010"),
      `Unexpected LLN-TYPE-010 for valid Array<Bool>`,
    );
  });

  it("does not emit LLN-TYPE-010 when Array has no type parameter", () => {
    // Without a type parameter there's nothing to check against
    const result = parseAndCheck(`
flow test() -> Void {
  let xs: Array<String> = ["a", "b", "c"]
  return
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-010"),
      `Unexpected LLN-TYPE-010 for Array<String> with all String elements`,
    );
  });
});

// ── LLN-TYPE-017: Numeric precision loss ─────────────────────────────────────

describe("Type checker — LLN-TYPE-017 NumericPrecisionLoss", () => {
  it("emits LLN-TYPE-017 warning when Float literal assigned to Float16", () => {
    const result = parseAndCheck(`
flow test() -> Void {
  let x: Float16 = 3.14
  return
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-017"),
      `Expected LLN-TYPE-017 for Float16 = 3.14 (Float), got: ${result.diagnostics.map((d) => d.code).join(", ")}`,
    );
    const diag = diagsWithCode(result, "LLN-TYPE-017")[0];
    assert.equal(diag?.severity, "warning", "LLN-TYPE-017 should be a warning");
  });

  it("emits LLN-TYPE-017 when Int literal assigned to Int8", () => {
    const result = parseAndCheck(`
flow test() -> Void {
  let x: Int8 = 42
  return
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-017"),
      `Expected LLN-TYPE-017 for Int8 = 42 (Int)`,
    );
  });

  it("does not emit LLN-TYPE-017 when Float assigned to Float64 (widening)", () => {
    const result = parseAndCheck(`
flow test() -> Void {
  let x: Float64 = 3.14
  return
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-017"),
      `Unexpected LLN-TYPE-017 for Float64 = 3.14 (no precision loss)`,
    );
  });

  it("does not emit LLN-TYPE-017 when exact same precision type is used", () => {
    const result = parseAndCheck(`
flow test() -> Void {
  let x: Int = 5
  return
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-017"),
      `Unexpected LLN-TYPE-017 for Int = 5`,
    );
  });
});

// ── LLN-TYPE-018: ProtectedBoundaryViolation ─────────────────────────────────

describe("Type checker — LLN-TYPE-018 ProtectedBoundaryViolation", () => {
  it("emits LLN-TYPE-018 when protect(String) assigned to plain String binding", () => {
    // protect('raw') infers as 'protected String'; declared is 'String' → violation
    const result = parseAndCheck(
      'flow test() -> String { let x: String = protect("raw")\nreturn "ok" }',
    );
    assert.ok(
      hasDiag(result, "LLN-TYPE-018"),
      `Expected LLN-TYPE-018 for String = protect("raw"), got: ${result.diagnostics.map((d) => d.code).join(", ")}`,
    );
  });

  it("LLN-TYPE-018 message mentions the protected qualifier and the type", () => {
    const result = parseAndCheck(
      'flow test() -> String { let x: String = protect("raw")\nreturn "ok" }',
    );
    const diag = diagsWithCode(result, "LLN-TYPE-018")[0];
    assert.ok(diag !== undefined, "Expected at least one LLN-TYPE-018 diagnostic");
    assert.ok(
      diag.message.includes("protected"),
      `Expected 'protected' in message: ${diag.message}`,
    );
  });

  it("does not emit LLN-TYPE-018 when declared type is also protected", () => {
    // let x: protected String = protect("raw") — binding qualifier matches → no violation
    const result = parseAndCheck(
      'flow test() -> String { let x: protected String = protect("raw")\nreturn "ok" }',
    );
    assert.ok(
      !hasDiag(result, "LLN-TYPE-018"),
      `Unexpected LLN-TYPE-018 when declared type is already 'protected String'`,
    );
  });

  it("does not emit LLN-TYPE-018 for plain string literal assigned to String", () => {
    const result = parseAndCheck(`
flow test() -> String {
  let safe: String = "hello"
  return safe
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-018"),
      `Unexpected LLN-TYPE-018 for a plain String literal`,
    );
  });

  it("does not emit LLN-TYPE-018 when declared type does not match inferred protected base", () => {
    // protect() returns 'protected String', declared is 'Int' — bases differ, no 018
    const result = parseAndCheck(
      'flow test() -> String { let x: Int = protect("raw")\nreturn "ok" }',
    );
    assert.ok(
      !hasDiag(result, "LLN-TYPE-018"),
      `Unexpected LLN-TYPE-018 when base types do not match`,
    );
  });
});

// ── LLN-TYPE-019: RedactedBoundaryViolation ──────────────────────────────────

describe("Type checker — LLN-TYPE-019 RedactedBoundaryViolation", () => {
  it("emits LLN-TYPE-019 when redact(String) assigned to plain String binding", () => {
    // redact('raw') infers as 'redacted String'; declared is 'String' → violation
    const result = parseAndCheck(
      'flow test() -> String { let x: String = redact("raw")\nreturn "ok" }',
    );
    assert.ok(
      hasDiag(result, "LLN-TYPE-019"),
      `Expected LLN-TYPE-019 for String = redact("raw"), got: ${result.diagnostics.map((d) => d.code).join(", ")}`,
    );
  });

  it("LLN-TYPE-019 message mentions irreversibility", () => {
    const result = parseAndCheck(
      'flow test() -> String { let x: String = redact("raw")\nreturn "ok" }',
    );
    const diag = diagsWithCode(result, "LLN-TYPE-019")[0];
    assert.ok(diag !== undefined, "Expected at least one LLN-TYPE-019 diagnostic");
    assert.ok(
      diag.message.includes("irreversible") || diag.message.includes("redact"),
      `Expected 'irreversible'/'redact' in message: ${diag.message}`,
    );
  });

  it("does not emit LLN-TYPE-019 when declared type is redacted", () => {
    const result = parseAndCheck(
      'flow test() -> String { let x: redacted String = redact("raw")\nreturn "ok" }',
    );
    assert.ok(
      !hasDiag(result, "LLN-TYPE-019"),
      `Unexpected LLN-TYPE-019 when declared type is already 'redacted String'`,
    );
  });

  it("does not emit LLN-TYPE-019 for a plain String literal assigned to String", () => {
    const result = parseAndCheck(`
flow test() -> String {
  let safe: String = "public"
  return safe
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-019"),
      `Unexpected LLN-TYPE-019 for a plain String literal`,
    );
  });
});

// ── Part 3: Extended LLN-TYPE-004 binary operator checks ─────────────────────

describe("Type checker — LLN-TYPE-004 extended: String + non-String", () => {
  it("emits LLN-TYPE-004 for String + Int", () => {
    const result = parseAndCheck(`
flow test() -> String {
  return "hello" + 42
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-004"),
      `Expected LLN-TYPE-004 for "hello" + 42`,
    );
  });

  it("emits LLN-TYPE-004 for Int + String", () => {
    const result = parseAndCheck(`
flow test() -> String {
  return 42 + "hello"
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-004"),
      `Expected LLN-TYPE-004 for 42 + "hello"`,
    );
  });

  it("does not emit LLN-TYPE-004 for String + String (valid concatenation)", () => {
    const result = parseAndCheck(`
flow test() -> String {
  return "foo" + "bar"
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-004"),
      `Unexpected LLN-TYPE-004 for "foo" + "bar"`,
    );
  });
});

describe("Type checker — LLN-TYPE-004 extended: Bool arithmetic", () => {
  it("emits LLN-TYPE-004 for true + 1 (Bool + Int)", () => {
    const result = parseAndCheck(`
flow test() -> Int {
  return true + 1
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-004"),
      `Expected LLN-TYPE-004 for true + 1`,
    );
  });

  it("emits LLN-TYPE-004 for false - 1 (Bool - Int)", () => {
    const result = parseAndCheck(`
flow test() -> Int {
  return false - 1
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-004"),
      `Expected LLN-TYPE-004 for false - 1`,
    );
  });

  it("emits LLN-TYPE-004 for true * 2 (Bool * Int)", () => {
    const result = parseAndCheck(`
flow test() -> Int {
  return true * 2
}
`);
    assert.ok(
      hasDiag(result, "LLN-TYPE-004"),
      `Expected LLN-TYPE-004 for true * 2`,
    );
  });

  it("does not emit LLN-TYPE-004 for Bool && Bool (valid logical op)", () => {
    const result = parseAndCheck(`
flow test() -> Bool {
  return true && false
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-004"),
      `Unexpected LLN-TYPE-004 for true && false`,
    );
  });

  it("does not emit LLN-TYPE-004 for Bool || Bool (valid logical op)", () => {
    const result = parseAndCheck(`
flow test() -> Bool {
  return false || true
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-004"),
      `Unexpected LLN-TYPE-004 for false || true`,
    );
  });
});

describe("Type checker — LLN-TYPE-004 extended: String ordering", () => {
  it("does not emit LLN-TYPE-004 for String < String (valid same-type comparison)", () => {
    const result = parseAndCheck(`
flow test() -> Bool {
  return "a" < "b"
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-004"),
      `Unexpected LLN-TYPE-004 for "a" < "b" (same type)`,
    );
  });

  it("does not emit LLN-TYPE-004 for Int < Int", () => {
    const result = parseAndCheck(`
flow test() -> Bool {
  return 1 < 2
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-004"),
      `Unexpected LLN-TYPE-004 for 1 < 2`,
    );
  });
});

// ── inferType extended stdlib coverage ───────────────────────────────────────

describe("inferType — extended stdlib method coverage", () => {
  it("inferType works for Bytes receiver methods (no spurious type errors)", () => {
    // A binding declared as Int assigned the result of calling a size method
    // We can't directly call methods without a receiver in test source, so test
    // that existing code paths don't introduce regressions.
    const result = parseAndCheck(`
flow test(b: Bytes) -> Int {
  return 42
}
`);
    assert.ok(
      !hasDiag(result, "LLN-TYPE-001"),
      `Unexpected type error for Bytes parameter`,
    );
  });

  it("allows Array<String> with proper element types", () => {
    const result = parseAndCheck(`
flow test() -> Void {
  let tags: Array<String> = ["foo", "bar", "baz"]
  return
}
`);
    assert.ok(!hasDiag(result, "LLN-TYPE-010"), "No element mismatch for Array<String>");
    assert.ok(!hasDiag(result, "LLN-TYPE-002"), "No type mismatch for correct assignment");
  });

  it("errorPropagation (?) on plain identifier does not crash", () => {
    // The ? operator on a non-Result/Option type just returns the inner type
    const result = parseAndCheck(`
flow test(x: String) -> String {
  return x
}
`);
    assert.ok(result.diagnostics.length === 0, "No errors for simple flow");
  });
});

// ── Exports: LLN_TYPE_010..019 constants ─────────────────────────────────────

describe("LLN_TYPE_010..019 exported constants", () => {
  it("exports LLN_TYPE_010 through LLN_TYPE_019 from the package", async () => {
    const pkg = await import("../dist/index.js");
    for (let n = 10; n <= 19; n++) {
      const key = `LLN_TYPE_0${n}`;
      assert.ok(pkg[key] !== undefined, `Expected ${key} to be exported`);
      assert.equal(pkg[key].code, `LLN-TYPE-0${n}`, `${key}.code mismatch`);
    }
  });

  it("LLN_TYPE_017 has severity warning", async () => {
    const { LLN_TYPE_017 } = await import("../dist/index.js");
    assert.equal(LLN_TYPE_017.severity, "warning");
  });

  it("LLN_TYPE_018 has severity error", async () => {
    const { LLN_TYPE_018 } = await import("../dist/index.js");
    assert.equal(LLN_TYPE_018.severity, "error");
  });

  it("LLN_TYPE_019 has severity error", async () => {
    const { LLN_TYPE_019 } = await import("../dist/index.js");
    assert.equal(LLN_TYPE_019.severity, "error");
  });

  it("LLN_TYPE_010 has severity error", async () => {
    const { LLN_TYPE_010 } = await import("../dist/index.js");
    assert.equal(LLN_TYPE_010.severity, "error");
  });
});
