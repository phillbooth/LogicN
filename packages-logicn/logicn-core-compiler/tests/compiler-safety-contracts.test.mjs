import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateCoreSyntaxSafety,
  checkBindingReassignment,
  checkReadonlyMutation,
  checkMethodChain,
  validateTypedContentBlock,
  LLN_SYNTAX_001,
  LLN_SYNTAX_002,
  LLN_BINDING_001,
  LLN_BINDING_002,
  LLN_BINDING_003,
  LLN_BLOCK_001,
  LLN_BLOCK_002,
  LLN_INTENT_DIAGNOSTICS,
  LLN_BINDING_DIAGNOSTICS,
  LLN_PIPELINE_DIAGNOSTICS,
  LLN_SYNTAX_DIAGNOSTICS,
  LLN_BLOCK_DIAGNOSTICS,
} from "../dist/index.js";

describe("logicn-core-compiler syntax safety contracts", () => {
  it("rejects Tri values used directly as branch conditions", () => {
    const result = validateCoreSyntaxSafety({
      file: "branch.lln",
      text: `
pure flow check(signal: Tri) -> Bool {
  if signal {
    return true
  }
  return false
}
`,
    });

    assert.equal(result.ok, false);
    assert.equal(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "LogicN_COMPILER_TRI_BRANCH_CONDITION",
      ),
      true,
    );
  });

  it("rejects implicit Tri, Decision and Bool boundary assignments", () => {
    const result = validateCoreSyntaxSafety({
      file: "assignment.lln",
      text: `
secure flow decide(signal: Tri, decision: Decision) -> Decision {
  let allowed: Bool = signal
  let direct: Decision = signal
  let state: Tri = decision
  return Review
}
`,
    });

    assert.equal(result.ok, false);
    assert.equal(
      result.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "LogicN_COMPILER_UNSAFE_LOGIC_ASSIGNMENT",
      ).length,
      3,
    );
  });

  it("rejects non-exhaustive Tri matches", () => {
    const result = validateCoreSyntaxSafety({
      file: "match.lln",
      text: `
pure flow signalAllowed(signal: Tri) -> Bool {
  match signal {
    Positive => return true
    Negative => return false
  }
}
`,
    });

    assert.equal(result.ok, false);
    assert.equal(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "LogicN_COMPILER_TRI_MATCH_NOT_EXHAUSTIVE" &&
          diagnostic.message.includes("Neutral"),
      ),
      true,
    );
  });

  it("treats unknown_as true as an error in secure flows", () => {
    const result = validateCoreSyntaxSafety({
      file: "secure-policy.lln",
      text: `
secure flow canAccess(signal: Tri) -> Bool {
  return tri.toBool(signal, unknown_as: true)
}
`,
    });

    assert.equal(result.ok, false);
    assert.equal(
      result.diagnostics.find(
        (diagnostic) =>
          diagnostic.code === "LogicN_COMPILER_TRI_UNKNOWN_AS_TRUE",
      )?.severity,
      "error",
    );
  });

  it("blocks secret literals and unsafe dynamic execution", () => {
    const result = validateCoreSyntaxSafety({
      file: "secrets.lln",
      text: `
flow load() -> Bool {
  let api_key = "live-secret"
  eval("danger")
  return true
}
`,
    });

    assert.equal(result.ok, false);
    assert.equal(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === "LogicN_COMPILER_SECRET_LITERAL",
      ),
      true,
    );
    assert.equal(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "LogicN_COMPILER_UNSAFE_DYNAMIC_CODE",
      ),
      true,
    );
  });

  it("accepts explicit exhaustive Tri handling", () => {
    const result = validateCoreSyntaxSafety({
      file: "safe.lln",
      text: `
secure flow riskToDecision(signal: Tri) -> Decision {
  match signal {
    Positive => Deny
    Neutral => Review
    Negative => Allow
  }
}
`,
    });

    assert.equal(result.ok, true);
    assert.equal(result.diagnostics.length, 0);
  });

  it("rejects var and const as unsupported binding keywords", () => {
    const varResult = validateCoreSyntaxSafety({
      file: "bindings.lln",
      text: `
flow setCount() {
  var count = 0
}
`,
    });

    const constResult = validateCoreSyntaxSafety({
      file: "bindings.lln",
      text: `
flow setVersion() {
  const VERSION = "1.0.0"
}
`,
    });

    assert.equal(varResult.ok, false);
    assert.ok(
      varResult.diagnostics.some((d) => d.code === LLN_SYNTAX_001.code),
      "Expected LLN-SYNTAX-001 for var usage",
    );

    assert.equal(constResult.ok, false);
    assert.ok(
      constResult.diagnostics.some((d) => d.code === LLN_SYNTAX_002.code),
      "Expected LLN-SYNTAX-002 for const usage",
    );
  });

  it("does not flag var/const inside comment lines", () => {
    const result = validateCoreSyntaxSafety({
      file: "comments.lln",
      text: `
/// This flow replaces the old var-based counter.
/// const is not supported — use let or readonly.
flow doWork() {
  let count = 0
}
`,
    });

    assert.equal(result.ok, true);
    assert.equal(result.diagnostics.length, 0);
  });

  it("checkBindingReassignment emits LLN-BINDING-001 for let, LLN-BINDING-002 for readonly, nothing for mut", () => {
    const loc = { file: "test.lln", line: 5, column: 3 };

    const letDiags = checkBindingReassignment({ bindingKind: "let", bindingName: "count", location: loc });
    const readonlyDiags = checkBindingReassignment({ bindingKind: "readonly", bindingName: "config", location: loc });
    const mutDiags = checkBindingReassignment({ bindingKind: "mut", bindingName: "retries", location: loc });

    assert.ok(letDiags.some((d) => d.code === LLN_BINDING_001.code));
    assert.ok(readonlyDiags.some((d) => d.code === LLN_BINDING_002.code));
    assert.equal(mutDiags.length, 0);
  });

  it("checkReadonlyMutation emits LLN-BINDING-003 only for readonly bindings", () => {
    const loc = { file: "test.lln", line: 8, column: 5 };

    const readonlyDiags = checkReadonlyMutation({ bindingKind: "readonly", bindingName: "cfg", propertyName: "apiUrl", location: loc });
    const letDiags = checkReadonlyMutation({ bindingKind: "let", bindingName: "user", propertyName: "name", location: loc });

    assert.ok(readonlyDiags.some((d) => d.code === LLN_BINDING_003.code));
    assert.equal(letDiags.length, 0);
  });

  it("checkMethodChain returns empty diagnostics (stub — pending type scope)", () => {
    const diags = checkMethodChain({
      receiver: "input",
      calls: [{ methodName: "validate" }, { methodName: "sanitize" }, { methodName: "save" }],
      location: { file: "test.lln", line: 3, column: 1 },
    });

    assert.equal(diags.length, 0);
  });

  it("diagnostic constant arrays are complete and have correct codes", () => {
    assert.equal(LLN_SYNTAX_DIAGNOSTICS.length, 2);
    assert.equal(LLN_BINDING_DIAGNOSTICS.length, 4);
    assert.equal(LLN_PIPELINE_DIAGNOSTICS.length, 5);
    assert.equal(LLN_INTENT_DIAGNOSTICS.length, 5);

    assert.ok(LLN_SYNTAX_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-SYNTAX-")));
    assert.ok(LLN_BINDING_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-BINDING-")));
    assert.ok(LLN_PIPELINE_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-PIPELINE-")));
    assert.ok(LLN_INTENT_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-INTENT-")));
  });
});
