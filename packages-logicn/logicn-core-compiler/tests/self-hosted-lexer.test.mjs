// =============================================================================
// Self-Hosted Lexer — End-to-End Execution Test
//
// Verifies that src/self-hosted/lexer.lln parses and executes correctly,
// producing a valid token stream from LogicN source text.
//
// Milestones exercised:
//   - Phase 12A: while loops (active)
//   - Phase 11A runtime: mut reassignment (active)
//   - stdlib: Array.append (single-item push), String.charAt, charCount
//   - stdlib: Char.isLetter, Char.isDigit, Char.toString
//   - stdlib: Array.contains, String.toInt
//   - Interpreter: enum variant member access (TokenKind.Keyword etc.)
//   - Interpreter: else if chains
//   - Interpreter: char literal escape sequences (\t, \n, \r)
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

import { parseProgram, resolveSymbols, checkTypes, executeFlow } from "../dist/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __dir = dirname(fileURLToPath(import.meta.url));
const LEXER_PATH = join(__dir, "../src/self-hosted/lexer.lln");

/**
 * Load, parse, and compile the self-hosted lexer.
 * Strips UTF-8 BOM if present (file may be saved with BOM on Windows).
 */
function loadLexer() {
  let source = readFileSync(LEXER_PATH, "utf8");
  if (source.charCodeAt(0) === 0xFEFF) source = source.slice(1);
  const parsed = parseProgram(source, "lexer.lln");
  resolveSymbols(parsed.ast);
  checkTypes(parsed.ast);
  return parsed;
}

/**
 * Run the tokenize flow from the self-hosted lexer.
 * @param {string} input - LogicN source text to tokenize
 * @returns {Promise<import("../dist/index.js").FlowExecutionResult>}
 */
async function tokenize(ast, input) {
  return await executeFlow(
    "tokenize",
    new Map([["source", { __tag: "string", value: input }]]),
    ast,
  );
}

/**
 * Extract token kind name and value from a record-shaped token value.
 * @param {import("../dist/index.js").LogicNValue} token
 * @returns {{ kind: string, value: string }}
 */
function extractToken(token) {
  if (token.__tag !== "record") return { kind: "??", value: "??" };
  const kind = token.fields.get("kind");
  const val = token.fields.get("value");
  const kindStr = kind?.__tag === "unresolved" ? kind.name
    : kind?.__tag === "string" ? kind.value
    : "??";
  const valStr = val?.__tag === "string" ? val.value : "??";
  return { kind: kindStr, value: valStr };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Self-Hosted Lexer (lexer.lln) — end-to-end", () => {

  // ── Step 1: Parse check ─────────────────────────────────────────────────

  it("lexer.lln parses with zero errors", () => {
    let source = readFileSync(LEXER_PATH, "utf8");
    if (source.charCodeAt(0) === 0xFEFF) source = source.slice(1);
    const parsed = parseProgram(source, "lexer.lln");
    const errors = parsed.diagnostics.filter((d) => d.severity === "error");
    assert.equal(errors.length, 0, `Expected 0 parse errors, got: ${errors.map((e) => e.message).join("; ")}`);
  });

  it("lexer.lln exports the four expected flows", () => {
    let source = readFileSync(LEXER_PATH, "utf8");
    if (source.charCodeAt(0) === 0xFEFF) source = source.slice(1);
    const parsed = parseProgram(source, "lexer.lln");
    const names = parsed.flows?.map((f) => f.name) ?? [];
    assert.ok(names.includes("tokenize"), "tokenize flow should be present");
    assert.ok(names.includes("makeKeywordTable"), "makeKeywordTable flow should be present");
    assert.ok(names.includes("scanWord"), "scanWord helper flow should be present");
    assert.ok(names.includes("scanDigits"), "scanDigits helper flow should be present");
  });

  // ── Step 2: Array.append (single-item push) ─────────────────────────────

  it("Array.append pushes a single item (regression guard)", async () => {
    const parsed = parseProgram(`
guarded flow test() -> Int {
  mut arr: Array<String> = Array.empty()
  arr = arr.append("x")
  arr = arr.append("y")
  arr = arr.append("z")
  return arr.count()
}
`, "test.lln");
    const result = await executeFlow("test", new Map(), parsed.ast);
    assert.equal(result.value.__tag, "int");
    assert.equal(result.value.value, 3);
  });

  // ── Step 3: String.charAt returns Option<Char> ──────────────────────────

  it("String.charAt(0) returns Some('h') for \"hello\"", async () => {
    const parsed = parseProgram(`
pure flow test() -> Option<Char> {
  return "hello".charAt(0)
}
`, "test.lln");
    const result = await executeFlow("test", new Map(), parsed.ast);
    assert.equal(result.value.__tag, "some");
    assert.equal(result.value.value.__tag, "char");
    assert.equal(result.value.value.value, "h");
  });

  it("String.charAt(99) returns None for \"hello\"", async () => {
    const parsed = parseProgram(`
pure flow test() -> Option<Char> {
  return "hello".charAt(99)
}
`, "test.lln");
    const result = await executeFlow("test", new Map(), parsed.ast);
    assert.equal(result.value.__tag, "none");
  });

  // ── Step 4: Char escape sequences ───────────────────────────────────────

  it("char literal '\\t' resolves to an actual tab character", async () => {
    const parsed = parseProgram(`
pure flow test() -> Bool {
  let tab = '\t'
  return tab.codePoint() == 9
}
`, "test.lln");
    const result = await executeFlow("test", new Map(), parsed.ast);
    assert.equal(result.value.__tag, "bool");
    assert.equal(result.value.value, true);
  });

  it("char literal '\\\\n' (backslash-n) resolves to a newline character (codePoint 10)", async () => {
    // Use raw string to pass backslash-n as two chars to the LogicN parser
    const src = "pure flow test() -> Bool {\n  let nl = '\\n'\n  return nl.codePoint() == 10\n}\n";
    const parsed = parseProgram(src, "test.lln");
    const result = await executeFlow("test", new Map(), parsed.ast);
    assert.equal(result.value.__tag, "bool");
    assert.equal(result.value.value, true);
  });

  // ── Step 5: else if chain ────────────────────────────────────────────────

  it("else if chain evaluates the correct branch", async () => {
    const parsed = parseProgram(`
pure flow classify(n: Int) -> String {
  if n == 1 {
    return "one"
  }
  else if n == 2 {
    return "two"
  }
  else if n == 3 {
    return "three"
  }
  else {
    return "other"
  }
}
`, "test.lln");
    for (const [n, expected] of [[1, "one"], [2, "two"], [3, "three"], [4, "other"]]) {
      const result = await executeFlow("classify", new Map([["n", { __tag: "int", value: n }]]), parsed.ast);
      assert.equal(result.value.__tag, "string", `n=${n} should give string`);
      assert.equal(result.value.value, expected, `n=${n} expected "${expected}"`);
    }
  });

  // ── Step 6: Full lexer execution ─────────────────────────────────────────

  it("tokenize('let x: Int = 123') returns Ok(Array<Token>)", async () => {
    const { ast } = loadLexer();
    const result = await tokenize(ast, "let x: Int = 123");

    assert.equal(result.value.__tag, "ok", "Result should be Ok");
    assert.equal(result.value.value.__tag, "list", "Ok value should be a list of tokens");
  });

  it("tokenize produces correct token count for 'let x: Int = 123'", async () => {
    const { ast } = loadLexer();
    const result = await tokenize(ast, "let x: Int = 123");

    assert.equal(result.value.__tag, "ok");
    const tokens = result.value.value;
    assert.equal(tokens.__tag, "list");
    // Expect: Keyword(let) Identifier(x) Symbol(:) Identifier(Int) Symbol(=) NumberLiteral(123) Eof
    assert.equal(tokens.items.length, 7, `Expected 7 tokens, got ${tokens.items.length}`);
  });

  it("tokenize produces Keyword('let') as first token", async () => {
    const { ast } = loadLexer();
    const result = await tokenize(ast, "let x: Int = 123");

    const tokens = result.value.value;
    const tok = extractToken(tokens.items[0]);
    assert.equal(tok.kind, "Keyword", `Expected Keyword, got ${tok.kind}`);
    assert.equal(tok.value, "let");
  });

  it("tokenize produces Identifier('x') as second token", async () => {
    const { ast } = loadLexer();
    const result = await tokenize(ast, "let x: Int = 123");

    const tokens = result.value.value;
    const tok = extractToken(tokens.items[1]);
    assert.equal(tok.kind, "Identifier", `Expected Identifier, got ${tok.kind}`);
    assert.equal(tok.value, "x");
  });

  it("tokenize produces Symbol(':') as third token", async () => {
    const { ast } = loadLexer();
    const result = await tokenize(ast, "let x: Int = 123");

    const tokens = result.value.value;
    const tok = extractToken(tokens.items[2]);
    assert.equal(tok.kind, "Symbol");
    assert.equal(tok.value, ":");
  });

  it("tokenize produces Identifier('Int') as fourth token", async () => {
    const { ast } = loadLexer();
    const result = await tokenize(ast, "let x: Int = 123");

    const tokens = result.value.value;
    const tok = extractToken(tokens.items[3]);
    assert.equal(tok.kind, "Identifier");
    assert.equal(tok.value, "Int");
  });

  it("tokenize produces Symbol('=') as fifth token", async () => {
    const { ast } = loadLexer();
    const result = await tokenize(ast, "let x: Int = 123");

    const tokens = result.value.value;
    const tok = extractToken(tokens.items[4]);
    assert.equal(tok.kind, "Symbol");
    assert.equal(tok.value, "=");
  });

  it("tokenize produces NumberLiteral('123') as sixth token", async () => {
    const { ast } = loadLexer();
    const result = await tokenize(ast, "let x: Int = 123");

    const tokens = result.value.value;
    const tok = extractToken(tokens.items[5]);
    assert.equal(tok.kind, "NumberLiteral", `Expected NumberLiteral, got ${tok.kind}`);
    assert.equal(tok.value, "123");
  });

  it("tokenize produces Eof as last token", async () => {
    const { ast } = loadLexer();
    const result = await tokenize(ast, "let x: Int = 123");

    const tokens = result.value.value;
    const last = tokens.items[tokens.items.length - 1];
    const tok = extractToken(last);
    assert.equal(tok.kind, "Eof");
    assert.equal(tok.value, "");
  });

  // ── Step 7: Keyword detection ────────────────────────────────────────────

  it("tokenize classifies 'flow' as Keyword, not Identifier", async () => {
    const { ast } = loadLexer();
    const result = await tokenize(ast, "flow");

    const tokens = result.value.value;
    assert.ok(tokens.__tag === "list" && tokens.items.length >= 1);
    const tok = extractToken(tokens.items[0]);
    assert.equal(tok.kind, "Keyword");
    assert.equal(tok.value, "flow");
  });

  it("tokenize classifies 'myVar' as Identifier", async () => {
    const { ast } = loadLexer();
    const result = await tokenize(ast, "myVar");

    const tokens = result.value.value;
    assert.ok(tokens.__tag === "list" && tokens.items.length >= 1);
    const tok = extractToken(tokens.items[0]);
    assert.equal(tok.kind, "Identifier");
    assert.equal(tok.value, "myVar");
  });

  it("tokenize skips whitespace (no whitespace tokens in output)", async () => {
    const { ast } = loadLexer();
    const result = await tokenize(ast, "let   x");

    assert.equal(result.value.__tag, "ok");
    const tokens = result.value.value;
    assert.ok(tokens.__tag === "list");
    // Should be: Keyword(let) Identifier(x) Eof — whitespace skipped
    const kinds = tokens.items.map((t) => extractToken(t).kind);
    assert.ok(!kinds.some((k) => k === "Whitespace"), "Should not emit whitespace tokens");
  });

  it("tokenize handles multiple identifiers and keywords", async () => {
    const { ast } = loadLexer();
    const result = await tokenize(ast, "mut count return");

    assert.equal(result.value.__tag, "ok");
    const tokens = result.value.value;
    assert.ok(tokens.__tag === "list");
    const toks = tokens.items.map(extractToken);
    assert.equal(toks[0].kind, "Keyword");
    assert.equal(toks[0].value, "mut");
    assert.equal(toks[1].kind, "Identifier");
    assert.equal(toks[1].value, "count");
    assert.equal(toks[2].kind, "Keyword");
    assert.equal(toks[2].value, "return");
  });

  it("tokenize produces no runtime errors for simple input", async () => {
    const { ast } = loadLexer();
    const result = await tokenize(ast, "let x: Int = 123");

    assert.equal(result.diagnostics.filter((d) => d.code === "LLN-RUNTIME-002").length, 0,
      "Should produce no LLN-RUNTIME-002 unresolved call errors");
  });
});
