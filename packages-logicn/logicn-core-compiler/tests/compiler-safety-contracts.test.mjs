import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateCoreSyntaxSafety,
  validateIntentEffects,
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
  LLN_STRING_001,
  LLN_STRING_002,
  LLN_CHAR_001,
  LLN_CHAR_003,
  LLN_BYTE_001,
  LLN_BYTE_004,
  LLN_INTENT_DIAGNOSTICS,
  LLN_BINDING_DIAGNOSTICS,
  LLN_PIPELINE_DIAGNOSTICS,
  LLN_SYNTAX_DIAGNOSTICS,
  LLN_BLOCK_DIAGNOSTICS,
  LLN_STRING_DIAGNOSTICS,
  LLN_CHAR_DIAGNOSTICS,
  LLN_BYTE_DIAGNOSTICS,
  LLN_MEMORY_001,
  LLN_MEMORY_003,
  LLN_MEMORY_005,
  LLN_MEMORY_006,
  LLN_MEMORY_008,
  LLN_MEMORY_DIAGNOSTICS,
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
    assert.equal(LLN_BLOCK_DIAGNOSTICS.length, 4);
    assert.equal(LLN_STRING_DIAGNOSTICS.length, 4);
    assert.equal(LLN_CHAR_DIAGNOSTICS.length, 4);
    assert.equal(LLN_BYTE_DIAGNOSTICS.length, 5);

    assert.ok(LLN_SYNTAX_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-SYNTAX-")));
    assert.ok(LLN_BINDING_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-BINDING-")));
    assert.ok(LLN_PIPELINE_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-PIPELINE-")));
    assert.ok(LLN_INTENT_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-INTENT-")));
    assert.ok(LLN_BLOCK_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-BLOCK-")));
    assert.ok(LLN_STRING_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-STRING-")));
    assert.ok(LLN_CHAR_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-CHAR-")));
    assert.ok(LLN_BYTE_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-BYTE-")));
  });

  it("accepts a well-formed typed content block without errors", () => {
    const result = validateCoreSyntaxSafety({
      file: "content.lln",
      text: `
flow renderPage() -> Html {
  html <<HTML
    <div class="container">
      <h1>Hello LogicN</h1>
    </div>
  HTML
}
`,
    });

    assert.equal(result.ok, true);
    assert.equal(result.diagnostics.length, 0);
  });

  it("emits LLN-BLOCK-001 for an unknown content block type", () => {
    const result = validateCoreSyntaxSafety({
      file: "content.lln",
      text: `
flow renderFeed() {
  xml <<XML
    <feed/>
  XML
}
`,
    });

    assert.equal(result.ok, false);
    assert.ok(
      result.diagnostics.some((d) => d.code === LLN_BLOCK_001.code),
      "Expected LLN-BLOCK-001 for unknown block type",
    );
  });

  it("emits LLN-BLOCK-002 for an unclosed typed content block", () => {
    const result = validateCoreSyntaxSafety({
      file: "content.lln",
      text: `
flow renderPage() -> Html {
  html <<PAGE
    <div>This block is never closed.
}
`,
    });

    assert.equal(result.ok, false);
    assert.ok(
      result.diagnostics.some((d) => d.code === LLN_BLOCK_002.code),
      "Expected LLN-BLOCK-002 for unclosed content block",
    );
  });

  it("does not flag var/const keywords found inside a typed content block", () => {
    const result = validateCoreSyntaxSafety({
      file: "content.lln",
      text: `
flow renderScript() {
  script <<SCRIPT
    const count = 0
    var message = "hello"
  SCRIPT
}
`,
    });

    assert.equal(result.ok, true);
    assert.equal(result.diagnostics.length, 0);
  });

  it("validateTypedContentBlock stub returns empty diagnostics", () => {
    const diags = validateTypedContentBlock({
      blockType: "html",
      marker: "HTML",
      content: "<div>hello</div>",
      file: "test.lln",
      startLine: 3,
    });

    assert.equal(diags.length, 0);
  });

  it("validateIntentEffects stub returns correct empty result shape", () => {
    const result = validateIntentEffects(
      "createOrder",
      "guarded",
      "create customer order",
      ["database.write", "network.call"],
      ["database.write", "network.call"],
      false,
    );

    assert.equal(result.flowName, "createOrder");
    assert.equal(result.safetyLevel, "guarded");
    assert.equal(result.intent, "create customer order");
    assert.deepEqual(result.declaredEffects, ["database.write", "network.call"]);
    assert.deepEqual(result.inferredEffects, ["database.write", "network.call"]);
    assert.deepEqual(result.mismatches, []);
    assert.deepEqual(result.diagnostics, []);
  });

  it("validateIntentEffects stub omits intent field when undefined", () => {
    const result = validateIntentEffects(
      "processWebhook",
      "guarded",
      undefined,
      [],
      ["network.call"],
      false,
    );

    assert.equal(result.flowName, "processWebhook");
    assert.equal(Object.hasOwn(result, "intent"), false);
    assert.deepEqual(result.mismatches, []);
    assert.deepEqual(result.diagnostics, []);
  });

  it("String/Char/Byte diagnostic constants carry correct codes and names", () => {
    // String
    assert.equal(LLN_STRING_001.code, "LLN-STRING-001");
    assert.equal(LLN_STRING_001.name, "INVALID_UTF8_DECODE");
    assert.equal(LLN_STRING_002.code, "LLN-STRING-002");
    assert.equal(LLN_STRING_002.name, "SECRET_STORED_AS_STRING");
    assert.equal(LLN_STRING_002.severity, "error");

    // Char
    assert.equal(LLN_CHAR_001.code, "LLN-CHAR-001");
    assert.equal(LLN_CHAR_001.name, "CHAR_BYTE_CONFUSION");
    assert.equal(LLN_CHAR_003.code, "LLN-CHAR-003");
    assert.equal(LLN_CHAR_003.name, "MULTI_CHAR_LITERAL");

    // Byte
    assert.equal(LLN_BYTE_001.code, "LLN-BYTE-001");
    assert.equal(LLN_BYTE_001.name, "BYTE_OUT_OF_RANGE");
    assert.equal(LLN_BYTE_004.code, "LLN-BYTE-004");
    assert.equal(LLN_BYTE_004.name, "RAW_BYTES_LOGGED");

    // All String/Char/Byte constants are severity "error" except LLN_STRING_004 (warning)
    assert.ok(LLN_STRING_DIAGNOSTICS.filter((d) => d.severity === "error").length === 3);
    assert.ok(LLN_CHAR_DIAGNOSTICS.every((d) => d.severity === "error"));
    assert.ok(LLN_BYTE_DIAGNOSTICS.every((d) => d.severity === "error"));
  });

  it("Memory diagnostic constants carry correct codes, names, and are all errors", () => {
    // Spot-check individual constants
    assert.equal(LLN_MEMORY_001.code, "LLN-MEMORY-001");
    assert.equal(LLN_MEMORY_001.name, "USE_AFTER_MOVE");
    assert.equal(LLN_MEMORY_001.severity, "error");

    assert.equal(LLN_MEMORY_003.code, "LLN-MEMORY-003");
    assert.equal(LLN_MEMORY_003.name, "BORROW_ESCAPES_SCOPE");

    assert.equal(LLN_MEMORY_005.code, "LLN-MEMORY-005");
    assert.equal(LLN_MEMORY_005.name, "MUTABLE_ALIAS");

    assert.equal(LLN_MEMORY_006.code, "LLN-MEMORY-006");
    assert.equal(LLN_MEMORY_006.name, "BOUNDS_VIOLATION");

    assert.equal(LLN_MEMORY_008.code, "LLN-MEMORY-008");
    assert.equal(LLN_MEMORY_008.name, "UNSAFE_MEMORY_REQUIRES_FALLBACK");

    // Array completeness and uniformity
    assert.equal(LLN_MEMORY_DIAGNOSTICS.length, 8);
    assert.ok(LLN_MEMORY_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-MEMORY-")));
    assert.ok(LLN_MEMORY_DIAGNOSTICS.every((d) => d.severity === "error"));
  });
});
