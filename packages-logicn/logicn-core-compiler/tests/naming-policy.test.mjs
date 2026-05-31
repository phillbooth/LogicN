// =============================================================================
// Naming Policy Checker Tests — Phase 17A
//
// Covers:
//   1. camelCase flow names pass (no LLN-STYLE-001)
//   2. PascalCase type names pass (no LLN-STYLE-002)
//   3. Get_User → LLN-STYLE-001 with suggested fix "getUser"
//   4. userId type → LLN-STYLE-002 with suggested fix "UserId"
//   5. Binding named "password" → LLN-STYLE-SEC-001
//   6. Binding named "rawPassword" → no SEC warning (raw prefix acknowledges boundary)
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseProgram, checkNamingPolicy, LLN_STYLE_001, LLN_STYLE_002, LLN_STYLE_SEC_001 } from "../dist/index.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function parse(source) {
  return parseProgram(source, "test.lln").ast;
}

function hasDiag(diags, code) {
  return diags.some((d) => d.code === code);
}

function getDiag(diags, code) {
  return diags.find((d) => d.code === code);
}

// ── Exported constants ────────────────────────────────────────────────────────

describe("Naming policy — exported constants", () => {
  it("LLN_STYLE_001 has correct code and severity", () => {
    assert.equal(LLN_STYLE_001.code, "LLN-STYLE-001");
    assert.equal(LLN_STYLE_001.severity, "warning");
  });

  it("LLN_STYLE_002 has correct code and severity", () => {
    assert.equal(LLN_STYLE_002.code, "LLN-STYLE-002");
    assert.equal(LLN_STYLE_002.severity, "warning");
  });

  it("LLN_STYLE_SEC_001 has correct code and severity", () => {
    assert.equal(LLN_STYLE_SEC_001.code, "LLN-STYLE-SEC-001");
    assert.equal(LLN_STYLE_SEC_001.severity, "warning");
  });
});

// ── Flow naming (LLN-STYLE-001) ────────────────────────────────────────────────

describe("LLN-STYLE-001 — flow camelCase convention", () => {
  it("camelCase flow name passes without LLN-STYLE-001", () => {
    const ast = parse(`
flow getUser(id: String) -> String {
  return id
}
`);
    const result = checkNamingPolicy(ast);
    assert.ok(
      !hasDiag(result.diagnostics, "LLN-STYLE-001"),
      `getUser should pass camelCase check, got: ${result.diagnostics.map((d) => d.code).join(", ")}`,
    );
  });

  it("camelCase flow names: createPatient, validateEmail pass", () => {
    const ast = parse(`
flow createPatient(name: String) -> String {
  return name
}

flow validateEmail(email: String) -> Bool {
  return true
}
`);
    const result = checkNamingPolicy(ast);
    const style001 = result.diagnostics.filter((d) => d.code === "LLN-STYLE-001");
    assert.equal(
      style001.length,
      0,
      `createPatient, validateEmail should pass, got violations: ${style001.map((d) => d.message).join("; ")}`,
    );
  });

  it("Get_User emits LLN-STYLE-001 with suggested fix 'getUser'", () => {
    const ast = parse(`
flow Get_User(id: String) -> String {
  return id
}
`);
    const result = checkNamingPolicy(ast);
    assert.ok(
      hasDiag(result.diagnostics, "LLN-STYLE-001"),
      `Get_User should emit LLN-STYLE-001`,
    );
    const diag = getDiag(result.diagnostics, "LLN-STYLE-001");
    assert.ok(diag !== undefined, "Should have LLN-STYLE-001 diagnostic");
    assert.ok(
      diag.message.includes("Get_User"),
      `Message should mention 'Get_User', got: ${diag.message}`,
    );
    assert.equal(
      diag.suggestedFix,
      "getUser",
      `Suggested fix should be 'getUser', got: ${diag.suggestedFix}`,
    );
  });

  it("GetUser (PascalCase) emits LLN-STYLE-001", () => {
    const ast = parse(`
flow GetUser(id: String) -> String {
  return id
}
`);
    const result = checkNamingPolicy(ast);
    assert.ok(
      hasDiag(result.diagnostics, "LLN-STYLE-001"),
      `GetUser (PascalCase) should emit LLN-STYLE-001`,
    );
  });

  it("snake_case flow name (get_user) emits LLN-STYLE-001", () => {
    // snake_case is not valid camelCase — should emit LLN-STYLE-001
    const fakeAst = {
      kind: "program",
      children: [
        {
          kind: "flowDecl",
          value: "get_user(id: String) -> String",
        },
      ],
    };
    const result = checkNamingPolicy(fakeAst);
    assert.ok(
      hasDiag(result.diagnostics, "LLN-STYLE-001"),
      `get_user (snake_case) should emit LLN-STYLE-001`,
    );
  });

  it("LLN-STYLE-001 message contains 'camelCase'", () => {
    const ast = parse(`
flow Get_User(id: String) -> String {
  return id
}
`);
    const result = checkNamingPolicy(ast);
    const diag = getDiag(result.diagnostics, "LLN-STYLE-001");
    assert.ok(diag !== undefined);
    assert.ok(
      diag.message.toLowerCase().includes("camelcase"),
      `Message should mention camelCase, got: ${diag.message}`,
    );
  });

  it("fnDecl with PascalCase emits LLN-STYLE-001", () => {
    const fakeAst = {
      kind: "program",
      children: [
        {
          kind: "fnDecl",
          value: "ComputeScore(x: Int) -> Float",
        },
      ],
    };
    const result = checkNamingPolicy(fakeAst);
    assert.ok(
      hasDiag(result.diagnostics, "LLN-STYLE-001"),
      `ComputeScore fnDecl should emit LLN-STYLE-001`,
    );
  });
});

// ── Type naming (LLN-STYLE-002) ────────────────────────────────────────────────

describe("LLN-STYLE-002 — type PascalCase convention", () => {
  it("PascalCase type name passes without LLN-STYLE-002", () => {
    const ast = parse(`
type UserId = String
`);
    const result = checkNamingPolicy(ast);
    assert.ok(
      !hasDiag(result.diagnostics, "LLN-STYLE-002"),
      `UserId should pass PascalCase check, got: ${result.diagnostics.map((d) => d.code).join(", ")}`,
    );
  });

  it("PascalCase names: PatientRecord, OrderStatus pass", () => {
    const ast = parse(`
type PatientRecord = String
type OrderStatus = String
`);
    const result = checkNamingPolicy(ast);
    const style002 = result.diagnostics.filter((d) => d.code === "LLN-STYLE-002");
    assert.equal(
      style002.length,
      0,
      `PatientRecord, OrderStatus should pass PascalCase check`,
    );
  });

  it("userId type emits LLN-STYLE-002 with suggested fix 'UserId'", () => {
    const ast = parse(`
type userId = String
`);
    const result = checkNamingPolicy(ast);
    assert.ok(
      hasDiag(result.diagnostics, "LLN-STYLE-002"),
      `userId type should emit LLN-STYLE-002`,
    );
    const diag = getDiag(result.diagnostics, "LLN-STYLE-002");
    assert.ok(diag !== undefined, "Should have LLN-STYLE-002 diagnostic");
    assert.ok(
      diag.message.includes("userId"),
      `Message should mention 'userId', got: ${diag.message}`,
    );
    assert.equal(
      diag.suggestedFix,
      "UserId",
      `Suggested fix should be 'UserId', got: ${diag.suggestedFix}`,
    );
  });

  it("user_id type emits LLN-STYLE-002", () => {
    const fakeAst = {
      kind: "program",
      children: [
        {
          kind: "typeDecl",
          value: "user_id = String",
        },
      ],
    };
    const result = checkNamingPolicy(fakeAst);
    assert.ok(
      hasDiag(result.diagnostics, "LLN-STYLE-002"),
      `user_id type should emit LLN-STYLE-002`,
    );
  });

  it("USER_ID type emits LLN-STYLE-002", () => {
    const fakeAst = {
      kind: "program",
      children: [
        {
          kind: "typeDecl",
          value: "USER_ID = String",
        },
      ],
    };
    const result = checkNamingPolicy(fakeAst);
    assert.ok(
      hasDiag(result.diagnostics, "LLN-STYLE-002"),
      `USER_ID type should emit LLN-STYLE-002`,
    );
  });

  it("recordDecl with lowercase name emits LLN-STYLE-002", () => {
    const fakeAst = {
      kind: "program",
      children: [
        {
          kind: "recordDecl",
          value: "patientRecord { name: String }",
        },
      ],
    };
    const result = checkNamingPolicy(fakeAst);
    assert.ok(
      hasDiag(result.diagnostics, "LLN-STYLE-002"),
      `patientRecord recordDecl should emit LLN-STYLE-002`,
    );
  });

  it("LLN-STYLE-002 message contains 'PascalCase'", () => {
    const ast = parse(`
type userId = String
`);
    const result = checkNamingPolicy(ast);
    const diag = getDiag(result.diagnostics, "LLN-STYLE-002");
    assert.ok(diag !== undefined);
    assert.ok(
      diag.message.toLowerCase().includes("pascalcase"),
      `Message should mention PascalCase, got: ${diag.message}`,
    );
  });
});

// ── Sensitive binding (LLN-STYLE-SEC-001) ─────────────────────────────────────

describe("LLN-STYLE-SEC-001 — sensitive binding names", () => {
  it("binding named 'password' emits LLN-STYLE-SEC-001", () => {
    const fakeAst = {
      kind: "program",
      children: [
        {
          kind: "flowDecl",
          value: "login(x: String) -> Bool",
          children: [
            {
              kind: "block",
              children: [
                {
                  kind: "letDecl",
                  value: "password = x",
                },
              ],
            },
          ],
        },
      ],
    };
    const result = checkNamingPolicy(fakeAst);
    assert.ok(
      hasDiag(result.diagnostics, "LLN-STYLE-SEC-001"),
      `Binding 'password' should emit LLN-STYLE-SEC-001`,
    );
    const diag = getDiag(result.diagnostics, "LLN-STYLE-SEC-001");
    assert.ok(diag !== undefined);
    assert.ok(
      diag.message.includes("password"),
      `Message should mention 'password', got: ${diag.message}`,
    );
  });

  it("binding named 'secret' emits LLN-STYLE-SEC-001", () => {
    const fakeAst = {
      kind: "program",
      children: [
        {
          kind: "letDecl",
          value: "secret = apiCall()",
        },
      ],
    };
    const result = checkNamingPolicy(fakeAst);
    assert.ok(
      hasDiag(result.diagnostics, "LLN-STYLE-SEC-001"),
      `Binding 'secret' should emit LLN-STYLE-SEC-001`,
    );
  });

  it("binding named 'apiKey' emits LLN-STYLE-SEC-001", () => {
    const fakeAst = {
      kind: "program",
      children: [
        {
          kind: "letDecl",
          value: "apiKey = getKey()",
        },
      ],
    };
    const result = checkNamingPolicy(fakeAst);
    assert.ok(
      hasDiag(result.diagnostics, "LLN-STYLE-SEC-001"),
      `Binding 'apiKey' should emit LLN-STYLE-SEC-001`,
    );
  });

  it("binding named 'token' emits LLN-STYLE-SEC-001", () => {
    const fakeAst = {
      kind: "program",
      children: [
        {
          kind: "letDecl",
          value: "token = getToken()",
        },
      ],
    };
    const result = checkNamingPolicy(fakeAst);
    assert.ok(
      hasDiag(result.diagnostics, "LLN-STYLE-SEC-001"),
      `Binding 'token' should emit LLN-STYLE-SEC-001`,
    );
  });

  it("binding named 'rawPassword' does NOT emit LLN-STYLE-SEC-001", () => {
    const fakeAst = {
      kind: "program",
      children: [
        {
          kind: "letDecl",
          value: "rawPassword = input",
        },
      ],
    };
    const result = checkNamingPolicy(fakeAst);
    assert.ok(
      !hasDiag(result.diagnostics, "LLN-STYLE-SEC-001"),
      `Binding 'rawPassword' with raw prefix should NOT emit LLN-STYLE-SEC-001, got: ${result.diagnostics.map((d) => d.code).join(", ")}`,
    );
  });

  it("binding named 'unsafeToken' does NOT emit LLN-STYLE-SEC-001", () => {
    const fakeAst = {
      kind: "program",
      children: [
        {
          kind: "letDecl",
          value: "unsafeToken = rawInput",
        },
      ],
    };
    const result = checkNamingPolicy(fakeAst);
    assert.ok(
      !hasDiag(result.diagnostics, "LLN-STYLE-SEC-001"),
      `Binding 'unsafeToken' with unsafe prefix should NOT emit LLN-STYLE-SEC-001`,
    );
  });

  it("non-sensitive binding 'username' does not emit LLN-STYLE-SEC-001", () => {
    const fakeAst = {
      kind: "program",
      children: [
        {
          kind: "letDecl",
          value: "username = input",
        },
      ],
    };
    const result = checkNamingPolicy(fakeAst);
    assert.ok(
      !hasDiag(result.diagnostics, "LLN-STYLE-SEC-001"),
      `Binding 'username' should not emit LLN-STYLE-SEC-001`,
    );
  });
});

// ── Severity config override ───────────────────────────────────────────────────

describe("Naming policy — severity config", () => {
  it("default severity for style violations is 'warning'", () => {
    const ast = parse(`
flow Get_User(id: String) -> String {
  return id
}
`);
    const result = checkNamingPolicy(ast);
    const diag = getDiag(result.diagnostics, "LLN-STYLE-001");
    assert.ok(diag !== undefined);
    assert.equal(diag.severity, "warning");
  });

  it("severity 'error' config escalates style violations", () => {
    const ast = parse(`
flow Get_User(id: String) -> String {
  return id
}
`);
    const result = checkNamingPolicy(ast, { severity: "error" });
    const diag = getDiag(result.diagnostics, "LLN-STYLE-001");
    assert.ok(diag !== undefined);
    assert.equal(diag.severity, "error");
  });

  it("flowNames: 'none' disables LLN-STYLE-001", () => {
    const ast = parse(`
flow Get_User(id: String) -> String {
  return id
}
`);
    const result = checkNamingPolicy(ast, { flowNames: "none" });
    assert.ok(
      !hasDiag(result.diagnostics, "LLN-STYLE-001"),
      `flowNames: 'none' should disable LLN-STYLE-001`,
    );
  });

  it("typeNames: 'none' disables LLN-STYLE-002", () => {
    const ast = parse(`
type userId = String
`);
    const result = checkNamingPolicy(ast, { typeNames: "none" });
    assert.ok(
      !hasDiag(result.diagnostics, "LLN-STYLE-002"),
      `typeNames: 'none' should disable LLN-STYLE-002`,
    );
  });

  it("SEC-001 is always emitted regardless of flowNames/typeNames config", () => {
    const fakeAst = {
      kind: "program",
      children: [
        {
          kind: "letDecl",
          value: "password = x",
        },
      ],
    };
    const result = checkNamingPolicy(fakeAst, { flowNames: "none", typeNames: "none" });
    assert.ok(
      hasDiag(result.diagnostics, "LLN-STYLE-SEC-001"),
      `SEC-001 should fire even when other checks are disabled`,
    );
  });
});

// ── Empty / clean AST ─────────────────────────────────────────────────────────

describe("Naming policy — clean programs", () => {
  it("empty program returns no diagnostics", () => {
    const ast = parse("");
    const result = checkNamingPolicy(ast);
    assert.equal(result.diagnostics.length, 0);
  });

  it("well-named program returns no style diagnostics", () => {
    const ast = parse(`
type UserId = String
type PatientRecord = String

flow getUser(id: UserId) -> PatientRecord {
  return "ok"
}

flow createPatient(name: String) -> UserId {
  return "new-id"
}
`);
    const result = checkNamingPolicy(ast);
    const styleDiags = result.diagnostics.filter(
      (d) => d.code === "LLN-STYLE-001" || d.code === "LLN-STYLE-002",
    );
    assert.equal(
      styleDiags.length,
      0,
      `Well-named program should have no style diagnostics, got: ${styleDiags.map((d) => d.message).join("; ")}`,
    );
  });
});
