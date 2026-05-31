import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateCoreSyntaxSafety,
  validateIntentEffects,
  checkBindingReassignment,
  checkReadonlyMutation,
  checkMethodChain,
  checkMutInPureContext,
  validateTypedContentBlock,
  LLN_SYNTAX_001,
  LLN_SYNTAX_002,
  LLN_BINDING_001,
  LLN_BINDING_002,
  LLN_BINDING_003,
  LLN_BINDING_004,
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
  LLN_RAWPTR_001,
  LLN_RAWPTR_DIAGNOSTICS,
  LLN_SAFETY_001,
  LLN_SAFETY_002,
  LLN_SAFETY_003,
  LLN_SAFETY_004,
  LLN_SAFETY_005,
  LLN_SAFETY_006,
  LLN_SAFETY_DIAGNOSTICS,
  LLN_SEC_020,
  LLN_SEC_021,
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
    assert.ok(
      result.diagnostics.some((d) => d.code === LLN_SAFETY_001.code),
      "Expected LLN-SAFETY-001 for Tri branch condition",
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
      result.diagnostics.filter((d) => d.code === LLN_SAFETY_002.code).length,
      3,
      "Expected 3 × LLN-SAFETY-002 for implicit Tri/Decision/Bool conversions",
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
    assert.ok(
      result.diagnostics.some(
        (d) => d.code === LLN_SAFETY_006.code && d.message.includes("Neutral"),
      ),
      "Expected LLN-SAFETY-006 mentioning missing Neutral case",
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
      result.diagnostics.find((d) => d.code === LLN_SAFETY_003.code)?.severity,
      "error",
      "Expected LLN-SAFETY-003 as error severity in secure flow",
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
    assert.ok(
      result.diagnostics.some((d) => d.code === LLN_SAFETY_004.code),
      "Expected LLN-SAFETY-004 for raw secret literal",
    );
    assert.ok(
      result.diagnostics.some((d) => d.code === LLN_SAFETY_005.code),
      "Expected LLN-SAFETY-005 for eval() usage",
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

  it("diagnostic constant arrays use correct LLN-* code prefixes", () => {
    assert.ok(LLN_SYNTAX_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-SYNTAX-")));
    assert.ok(LLN_BINDING_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-BINDING-")));
    assert.ok(LLN_PIPELINE_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-PIPELINE-")));
    assert.ok(LLN_INTENT_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-INTENT-")));
    assert.ok(LLN_BLOCK_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-BLOCK-")));
    assert.ok(LLN_STRING_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-STRING-")));
    assert.ok(LLN_CHAR_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-CHAR-")));
    assert.ok(LLN_BYTE_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-BYTE-")));
    assert.ok(LLN_MEMORY_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-MEMORY-")));
    assert.ok(LLN_RAWPTR_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-RAWPTR-")));
    assert.ok(LLN_SAFETY_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-SAFETY-")));
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

  it("Safety diagnostic constants carry correct codes and names (LLN-SAFETY-* series)", () => {
    assert.equal(LLN_SAFETY_001.code, "LLN-SAFETY-001");
    assert.equal(LLN_SAFETY_001.name, "TRI_BRANCH_CONDITION");
    assert.equal(LLN_SAFETY_001.severity, "error");

    assert.equal(LLN_SAFETY_002.code, "LLN-SAFETY-002");
    assert.equal(LLN_SAFETY_002.name, "UNSAFE_LOGIC_ASSIGNMENT");

    assert.equal(LLN_SAFETY_003.code, "LLN-SAFETY-003");
    assert.equal(LLN_SAFETY_003.name, "TRI_UNKNOWN_AS_TRUE");

    assert.equal(LLN_SAFETY_004.code, "LLN-SAFETY-004");
    assert.equal(LLN_SAFETY_004.name, "SECRET_LITERAL");

    assert.equal(LLN_SAFETY_005.code, "LLN-SAFETY-005");
    assert.equal(LLN_SAFETY_005.name, "UNSAFE_DYNAMIC_CODE");

    assert.equal(LLN_SAFETY_006.code, "LLN-SAFETY-006");
    assert.equal(LLN_SAFETY_006.name, "TRI_MATCH_NOT_EXHAUSTIVE");

    assert.equal(LLN_SAFETY_DIAGNOSTICS.length, 6);
    assert.ok(LLN_SAFETY_DIAGNOSTICS.every((d) => d.code.startsWith("LLN-SAFETY-")));
    assert.ok(LLN_SAFETY_DIAGNOSTICS.every((d) => d.severity === "error"));
  });

  it("LLN_SEC_020 has code LLN-SEC-020, name RuntimeMutation, severity error, and suggestedFix", () => {
    assert.equal(LLN_SEC_020.code, "LLN-SEC-020");
    assert.equal(LLN_SEC_020.name, "RuntimeMutation");
    assert.equal(LLN_SEC_020.severity, "error");
    assert.ok(typeof LLN_SEC_020.message === "string" && LLN_SEC_020.message.length > 0);
    assert.ok(typeof LLN_SEC_020.suggestedFix === "string" && LLN_SEC_020.suggestedFix.length > 0);
  });

  it("LLN_SEC_021 has code LLN-SEC-021, name PrototypeMutation, severity error, and suggestedFix", () => {
    assert.equal(LLN_SEC_021.code, "LLN-SEC-021");
    assert.equal(LLN_SEC_021.name, "PrototypeMutation");
    assert.equal(LLN_SEC_021.severity, "error");
    assert.ok(typeof LLN_SEC_021.message === "string" && LLN_SEC_021.message.length > 0);
    assert.ok(typeof LLN_SEC_021.suggestedFix === "string" && LLN_SEC_021.suggestedFix.length > 0);
  });

  it("LLN_SEC_020 and LLN_SEC_021 are exported from dist/index.js", () => {
    // Verified by the fact that this test file imported them without error.
    assert.ok(LLN_SEC_020 !== undefined, "LLN_SEC_020 must be exported");
    assert.ok(LLN_SEC_021 !== undefined, "LLN_SEC_021 must be exported");
  });

  it("diagnostic constants export complete arrays check — including LLN-SAFETY-* and LLN-RAWPTR-*", () => {
    assert.equal(LLN_SYNTAX_DIAGNOSTICS.length, 6); // 2 original + 4 new (006-009)
    assert.equal(LLN_BINDING_DIAGNOSTICS.length, 6); // 4 original + LLN-BINDING-005 + LLN-BINDING-006 (Phase 11A.2)
    assert.equal(LLN_PIPELINE_DIAGNOSTICS.length, 5);
    assert.equal(LLN_INTENT_DIAGNOSTICS.length, 5);
    assert.equal(LLN_BLOCK_DIAGNOSTICS.length, 4);
    assert.equal(LLN_STRING_DIAGNOSTICS.length, 4);
    assert.equal(LLN_CHAR_DIAGNOSTICS.length, 4);
    assert.equal(LLN_BYTE_DIAGNOSTICS.length, 5);
    assert.equal(LLN_MEMORY_DIAGNOSTICS.length, 8);
    assert.equal(LLN_SAFETY_DIAGNOSTICS.length, 6);
    assert.equal(LLN_RAWPTR_DIAGNOSTICS.length, 1);
    assert.equal(LLN_RAWPTR_001.code, "LLN-RAWPTR-001");
    assert.equal(LLN_RAWPTR_001.name, "RAW_POINTER_OUTSIDE_UNSAFE");
    assert.equal(LLN_RAWPTR_001.severity, "error");
  });

  // ── Phase 3 scanner-level memory rules ───────────────────────────────────

  it("rejects mut binding declared inside a pure flow — LLN-BINDING-004", () => {
    const result = validateCoreSyntaxSafety({
      file: "pure-mut.lln",
      text: `
pure flow accumulateValues(items: Array<Int>) -> Int {
  mut total: Int = 0
  return total
}
`,
    });

    assert.equal(result.ok, false);
    assert.ok(
      result.diagnostics.some((d) => d.code === LLN_BINDING_004.code),
      "Expected LLN-BINDING-004 for mut in pure flow",
    );
  });

  it("allows mut binding in non-pure flows — no LLN-BINDING-004", () => {
    const result = validateCoreSyntaxSafety({
      file: "guarded-mut.lln",
      text: `
guarded flow buildPayload(items: Array<String>) -> Array<String> {
  mut result: Array<String> = []
  return result
}
`,
    });

    assert.equal(result.ok, true);
    assert.ok(
      !result.diagnostics.some((d) => d.code === LLN_BINDING_004.code),
      "Should not emit LLN-BINDING-004 outside pure flow",
    );
  });

  it("checkMutInPureContext emits LLN-BINDING-004 for pure flows and nothing otherwise", () => {
    const loc = { file: "test.lln", line: 4, column: 3 };

    const pureDiags = checkMutInPureContext({ flowSafetyLevel: "pure", bindingName: "counter", location: loc });
    const guardedDiags = checkMutInPureContext({ flowSafetyLevel: "guarded", bindingName: "counter", location: loc });
    const safeDiags = checkMutInPureContext({ flowSafetyLevel: "safe", bindingName: "counter", location: loc });

    assert.ok(pureDiags.some((d) => d.code === LLN_BINDING_004.code), "Expected LLN-BINDING-004 for pure");
    assert.equal(guardedDiags.length, 0, "No diagnostic for guarded");
    assert.equal(safeDiags.length, 0, "No diagnostic for safe");
  });

  it("rejects unsafe block without reason declaration — LLN-MEMORY-008", () => {
    const result = validateCoreSyntaxSafety({
      file: "unsafe-no-reason.lln",
      text: `
flow copyBuffer() -> Result<Void, String> {
  unsafe block copyRaw {
    return Ok(Void)
  }
}
`,
    });

    assert.equal(result.ok, false);
    assert.ok(
      result.diagnostics.some((d) => d.code === LLN_MEMORY_008.code),
      "Expected LLN-MEMORY-008 for unsafe block without reason",
    );
  });

  it("accepts unsafe block with reason declaration — no LLN-MEMORY-008", () => {
    const result = validateCoreSyntaxSafety({
      file: "unsafe-with-reason.lln",
      text: `
flow copyBuffer() -> Result<Void, String> {
  unsafe block copyRaw reason "DMA requires direct pointer access" fallback safeMemcopy {
    return Ok(Void)
  }
}
`,
    });

    assert.ok(
      !result.diagnostics.some((d) => d.code === LLN_MEMORY_008.code),
      "Should not emit LLN-MEMORY-008 when reason is present",
    );
  });
});
