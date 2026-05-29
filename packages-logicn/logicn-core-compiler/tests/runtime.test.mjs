import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { run } from "../dist/index.js";

describe("Runtime pipeline", () => {
  it("check-only mode runs checkers without executing", () => {
    const result = run(`
pure flow greet() -> String {
  return "hello"
}
`, "test.lln", "greet", new Map(), { mode: "check-only" });

    assert.equal(result.ok, true);
    assert.equal(result.value, undefined);
    assert.equal(result.mode, "check-only");
  });

  it("check-only mode reports type errors", () => {
    const result = run(`
flow bad() -> Strng {
  return "hello"
}
`, "test.lln", "bad", new Map(), { mode: "check-only" });

    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "LLN-TYPE-001"));
  });

  it("dev mode executes a flow", () => {
    const result = run(`
pure flow answer() -> Int {
  return 42
}
`, "test.lln", "answer");

    assert.equal(result.ok, true);
    assert.equal(result.value?.__tag, "int");
  });

  it("returns ok false for parse errors", () => {
    const result = run(`flow {`, "test.lln", "missing");

    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code.startsWith("LLN-PARSE-")));
  });

  it("diagnostics array contains checker results", () => {
    const result = run(`
flow bad() -> UnknownType {
  return "hello"
}
`, "test.lln", "bad", new Map(), { mode: "check-only" });

    assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "LLN-TYPE-001"));
  });
});
