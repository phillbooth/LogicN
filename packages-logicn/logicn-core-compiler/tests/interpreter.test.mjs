import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseProgram, checkTypes, resolveSymbols, executeFlow, LLN_VOID, LLN_NONE } from "../dist/index.js";

function parseAndRun(source, flowName, args = new Map()) {
  const parsed = parseProgram(source, "test.lln");
  resolveSymbols(parsed.ast);
  checkTypes(parsed.ast);
  return executeFlow(flowName, args, parsed.ast);
}

describe("Interpreter - basic execution", () => {
  it("exports canonical void and none constants", () => {
    assert.equal(LLN_VOID.__tag, "void");
    assert.equal(LLN_NONE.__tag, "none");
  });

  it("returns a string literal from a pure flow", () => {
    const result = parseAndRun(`
pure flow greet() -> String {
  return "hello"
}
`, "greet");

    assert.equal(result.value.__tag, "string");
    assert.equal(result.value.value, "hello");
  });

  it("evaluates arithmetic with parameters", () => {
    const result = parseAndRun(`
pure flow add(a: Int, b: Int) -> Int {
  return a + b
}
`, "add", new Map([
      ["a", { __tag: "int", value: 3 }],
      ["b", { __tag: "int", value: 4 }],
    ]));

    assert.equal(result.value.__tag, "int");
    assert.equal(result.value.value, 7);
  });

  it("returns an integer literal from a pure flow", () => {
    const result = parseAndRun(`
pure flow answer() -> Int {
  return 42
}
`, "answer");

    assert.equal(result.value.__tag, "int");
    assert.equal(result.value.value, 42);
  });

  it("evaluates arithmetic without parameters", () => {
    const result = parseAndRun(`
pure flow add() -> Int {
  return 3 + 4
}
`, "add");

    assert.equal(result.value.__tag, "int");
    assert.equal(result.value.value, 7);
  });

  it("concatenates strings", () => {
    const result = parseAndRun(`
pure flow concat() -> String {
  return "foo" + "bar"
}
`, "concat");

    assert.equal(result.value.__tag, "string");
    assert.equal(result.value.value, "foobar");
  });

  it("executes if branches", () => {
    const source = `
pure flow check(x: Int) -> String {
  if x == 0 {
    return "zero"
  }
  return "nonzero"
}
`;

    const zero = parseAndRun(source, "check", new Map([["x", { __tag: "int", value: 0 }]]));
    const nonzero = parseAndRun(source, "check", new Map([["x", { __tag: "int", value: 1 }]]));

    assert.equal(zero.value.__tag, "string");
    assert.equal(zero.value.value, "zero");
    assert.equal(nonzero.value.__tag, "string");
    assert.equal(nonzero.value.value, "nonzero");
  });

  it("registers let bindings", () => {
    const result = parseAndRun(`
pure flow double(n: Int) -> Int {
  let result: Int = n + n
  return result
}
`, "double", new Map([["n", { __tag: "int", value: 3 }]]));

    assert.equal(result.value.__tag, "int");
    assert.equal(result.value.value, 6);
  });

  it("uses a let binding in return", () => {
    const result = parseAndRun(`
pure flow ten() -> Int {
  let x: Int = 10
  return x
}
`, "ten");

    assert.equal(result.value.__tag, "int");
    assert.equal(result.value.value, 10);
  });

  it("executes an if true branch", () => {
    const result = parseAndRun(`
pure flow yes() -> String {
  if 1 == 1 {
    return "yes"
  } else {
    return "no"
  }
}
`, "yes");

    assert.equal(result.value.__tag, "string");
    assert.equal(result.value.value, "yes");
  });

  it("executes an if false branch", () => {
    const result = parseAndRun(`
pure flow no() -> String {
  if 1 == 2 {
    return "yes"
  } else {
    return "no"
  }
}
`, "no");

    assert.equal(result.value.__tag, "string");
    assert.equal(result.value.value, "no");
  });

  it("matches on bool literals", () => {
    const result = parseAndRun(`
pure flow decide(flag: Bool) -> String {
  match flag {
    true => "yes"
    false => "no"
  }
}
`, "decide", new Map([["flag", { __tag: "bool", value: true }]]));

    assert.equal(result.value.__tag, "string");
    assert.equal(result.value.value, "yes");
  });

  it("matches on None", () => {
    const result = parseAndRun(`
pure flow maybe() -> String {
  match None {
    None => "absent"
    Some(v) => v
  }
}
`, "maybe");

    assert.equal(result.value.__tag, "string");
    assert.equal(result.value.value, "absent");
  });

  it("matches on Some and binds the inner value", () => {
    const result = parseAndRun(`
pure flow maybe() -> String {
  match Some("inner") {
    Some(v) => v
    None => "absent"
  }
}
`, "maybe");

    assert.equal(result.value.__tag, "string");
    assert.equal(result.value.value, "inner");
  });

  it("matches on Ok and unwraps the value", () => {
    const result = parseAndRun(`
pure flow okData() -> String {
  match Ok("data") {
    Ok(v) => v
    Err(e) => e
  }
}
`, "okData");

    assert.equal(result.value.__tag, "string");
    assert.equal(result.value.value, "data");
  });

  it("passes flow parameters", () => {
    const result = parseAndRun(`
pure flow greet(name: String) -> String {
  return "Hello " + name
}
`, "greet", new Map([["name", { __tag: "string", value: "World" }]]));

    assert.equal(result.value.__tag, "string");
    assert.equal(result.value.value, "Hello World");
  });

  it("executes nested pure flow calls", () => {
    const result = parseAndRun(`
pure flow child() -> String {
  return "child"
}

pure flow parent() -> String {
  return child()
}
`, "parent");

    assert.equal(result.value.__tag, "string");
    assert.equal(result.value.value, "child");
  });
});

describe("Interpreter - Result and audit", () => {
  it("propagates Err values with the postfix ? operator", () => {
    const result = parseAndRun(`
pure flow run() -> Result<Int, Error> {
  fn fail() -> Result<Int, Error> {
    return Err("bad")
  }
  return fail()?
}
`, "run");

    assert.equal(result.value.__tag, "err");
  });

  it("unwraps Ok values with postfix ? before returning", () => {
    const result = parseAndRun(`
pure flow run() -> Int {
  return Ok(1)?
}
`, "run");

    assert.equal(result.value.__tag, "int");
    assert.equal(result.value.value, 1);
  });

  it("emits the runtime audit schema", () => {
    const result = parseAndRun(`
pure flow greet() -> String {
  return "hello"
}
`, "greet");

    assert.equal(result.audit.schemaVersion, "lln.runtime.audit.v1");
  });

  it("records AuditLog.write calls", () => {
    const result = parseAndRun(`
guarded flow audited() -> Void
effects [audit.write] {
  AuditLog.write(event: "Test")
  return
}
`, "audited");

    assert.equal(result.audit.auditEntries.length, 1);
    assert.equal(result.audit.auditEntries[0].event, "Test");
  });

  it("records AuditLog.write block-style calls", () => {
    const result = parseAndRun(`
guarded flow audited() -> Void
effects [audit.write] {
  AuditLog.write({ event: "Test" })
  return
}
`, "audited");

    assert.equal(result.auditEntries.length, 1);
    assert.equal(result.auditEntries[0].event, "Test");
  });

  it("validate gate wraps a value in protected", () => {
    const result = parseAndRun(`
pure flow validateEmail(rawEmail: String) -> protected Email {
  return validate.email(rawEmail)?
}
`, "validateEmail", new Map([["rawEmail", { __tag: "string", value: "a@example.com" }]]));

    assert.equal(result.value.__tag, "protected");
    assert.equal(result.value.baseType, "Email");
  });

  it("masks protected values in console output", () => {
    const originalLog = console.log;
    const lines = [];
    console.log = (value) => {
      lines.push(String(value));
    };

    try {
      parseAndRun(`
secure flow logEmail() -> Void {
  let email: protected Email = "raw@example.com"
  print(email)
  return
}
`, "logEmail");
    } finally {
      console.log = originalLog;
    }

    assert.ok(lines.includes("[PROTECTED]"));
    assert.equal(lines.some((line) => line.includes("raw@example.com")), false);
  });
});
