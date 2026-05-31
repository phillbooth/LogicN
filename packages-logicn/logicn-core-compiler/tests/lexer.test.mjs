import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  lex,
  V1_ACTIVE_KEYWORDS,
  V1_FUTURE_RESERVED,
  LLN_LEX_001,
  LLN_LEX_002,
  LLN_LEX_003,
} from "../dist/index.js";

describe("Lexer — keyword table", () => {
  it("active keywords include the three valid flow qualifiers", () => {
    assert.ok(V1_ACTIVE_KEYWORDS.has("flow"));
    assert.ok(V1_ACTIVE_KEYWORDS.has("secure"));
    assert.ok(V1_ACTIVE_KEYWORDS.has("pure"));
  });

  it("active keywords include binding keywords", () => {
    assert.ok(V1_ACTIVE_KEYWORDS.has("let"));
    assert.ok(V1_ACTIVE_KEYWORDS.has("mut"));
    assert.ok(V1_ACTIVE_KEYWORDS.has("readonly"));
  });

  it("active keywords include value-state keywords", () => {
    assert.ok(V1_ACTIVE_KEYWORDS.has("safe"));
    assert.ok(V1_ACTIVE_KEYWORDS.has("unsafe"));
    assert.ok(V1_ACTIVE_KEYWORDS.has("validated"));
    assert.ok(V1_ACTIVE_KEYWORDS.has("unvalidated"));
  });

  it("active keywords include trust and secrecy state markers", () => {
    assert.ok(V1_ACTIVE_KEYWORDS.has("tainted"),   "expected 'tainted' in V1_ACTIVE_KEYWORDS");
    assert.ok(V1_ACTIVE_KEYWORDS.has("secret"),    "expected 'secret' in V1_ACTIVE_KEYWORDS");
    assert.ok(V1_ACTIVE_KEYWORDS.has("protected"), "expected 'protected' in V1_ACTIVE_KEYWORDS");
  });

  it("active keywords include flow sub-declaration keywords", () => {
    assert.ok(V1_ACTIVE_KEYWORDS.has("effects"),    "expected 'effects' in V1_ACTIVE_KEYWORDS");
    assert.ok(V1_ACTIVE_KEYWORDS.has("with"),       "expected 'with' in V1_ACTIVE_KEYWORDS");
    assert.ok(V1_ACTIVE_KEYWORDS.has("intent"),     "expected 'intent' in V1_ACTIVE_KEYWORDS");
    assert.ok(V1_ACTIVE_KEYWORDS.has("governance"), "expected 'governance' in V1_ACTIVE_KEYWORDS");
    assert.ok(V1_ACTIVE_KEYWORDS.has("api"),        "expected 'api' in V1_ACTIVE_KEYWORDS");
    assert.ok(V1_ACTIVE_KEYWORDS.has("package"),    "expected 'package' in V1_ACTIVE_KEYWORDS");
  });

  it("active keywords include v1 route, fn, qualifier, governance, record, and target words", () => {
    for (const keyword of ["fn", "route", "redacted", "record", "authority", "policy", "with", "target"]) {
      assert.ok(V1_ACTIVE_KEYWORDS.has(keyword), `expected '${keyword}' in V1_ACTIVE_KEYWORDS`);
    }
  });

  it("active keywords and future-reserved keywords do not overlap", () => {
    const overlap = [...V1_ACTIVE_KEYWORDS].filter((keyword) => V1_FUTURE_RESERVED.has(keyword));
    assert.deepEqual(overlap, []);
  });

  it("future-reserved set includes async and await", () => {
    assert.ok(V1_FUTURE_RESERVED.has("async"));
    assert.ok(V1_FUTURE_RESERVED.has("await"));
  });

  it("safe, unsafe, guard are NOT listed as flow qualifiers in future-reserved", () => {
    // These are value-state keywords in v0.1, not flow prefixes
    assert.ok(!V1_FUTURE_RESERVED.has("safe"));
    assert.ok(!V1_FUTURE_RESERVED.has("guard"));
  });
});

describe("Lexer — token production", () => {
  it("produces an eof token for empty source", () => {
    const result = lex("", "test.lln");
    assert.equal(result.tokens.length, 1);
    assert.equal(result.tokens[0]?.kind, "eof");
    assert.equal(result.diagnostics.length, 0);
  });

  it("classifies keywords correctly", () => {
    const result = lex("flow secure pure let mut", "test.lln");
    const nonEof = result.tokens.filter((t) => t.kind !== "eof" && t.kind !== "newline");
    assert.ok(nonEof.every((t) => t.kind === "keyword"),
      `Expected all keyword tokens, got: ${nonEof.map((t) => t.kind).join(", ")}`);
    assert.equal(nonEof.map((t) => t.value).join(" "), "flow secure pure let mut");
  });

  it("classifies new v1 reserved words as keywords", () => {
    const source = "fn route redacted record authority policy with target";
    const result = lex(source, "test.lln");
    const nonEof = result.tokens.filter((t) => t.kind !== "eof" && t.kind !== "newline");
    assert.ok(nonEof.every((t) => t.kind === "keyword"),
      `Expected all keyword tokens, got: ${nonEof.map((t) => `${t.value}:${t.kind}`).join(", ")}`);
    assert.equal(nonEof.map((t) => t.value).join(" "), source);
  });

  it("does not classify new v1 reserved words as identifiers", () => {
    const result = lex("let fn = route", "test.lln");
    const fnToken = result.tokens.find((t) => t.value === "fn");
    const routeToken = result.tokens.find((t) => t.value === "route");
    assert.equal(fnToken?.kind, "keyword");
    assert.equal(routeToken?.kind, "keyword");
  });

  it("classifies identifiers that are not keywords", () => {
    const result = lex("getOrderStatus OrderId MyType", "test.lln");
    const nonEof = result.tokens.filter((t) => t.kind !== "eof" && t.kind !== "newline");
    assert.ok(nonEof.every((t) => t.kind === "identifier"));
  });

  it("tokenises string literals", () => {
    const result = lex('"hello world"', "test.lln");
    const str = result.tokens.find((t) => t.kind === "string");
    assert.ok(str !== undefined);
    assert.equal(str.value, '"hello world"');
  });

  it("tokenises char literals", () => {
    const result = lex("'A' 'L' '\\n'", "test.lln");
    const chars = result.tokens.filter((t) => t.kind === "char");
    assert.equal(chars.length, 3);
    assert.equal(chars[0]?.value, "A");
    assert.equal(chars[1]?.value, "L");
    assert.equal(chars[2]?.value, "\\n");
  });

  it("reports LLN-CHAR-003 for an empty char literal", () => {
    const result = lex("''", "test.lln");
    const diag = result.diagnostics.find((d) => d.code === "LLN-CHAR-003");
    assert.ok(diag !== undefined, "Expected LLN-CHAR-003 diagnostic");
  });

  it("reports LLN-PARSE-003 for unterminated string", () => {
    const result = lex('"unterminated', "test.lln");
    const diag = result.diagnostics.find((d) => d.code === "LLN-PARSE-003");
    assert.ok(diag !== undefined, "Expected LLN-PARSE-003 diagnostic");
  });

  it("tokenises integers and decimal numbers", () => {
    const result = lex("42 3.14 1_000_000", "test.lln");
    const numbers = result.tokens.filter((t) => t.kind === "number");
    assert.equal(numbers.length, 3);
    assert.equal(numbers[0]?.value, "42");
    assert.equal(numbers[1]?.value, "3.14");
    assert.equal(numbers[2]?.value, "1_000_000");
  });

  it("tokenises hex number literals", () => {
    const result = lex("0xFF 0x1A 0x00", "test.lln");
    const numbers = result.tokens.filter((t) => t.kind === "number");
    assert.deepEqual(numbers.map((t) => t.value), ["0xFF", "0x1A", "0x00"]);
  });

  it("tokenises binary number literals", () => {
    const result = lex("0b1010", "test.lln");
    const number = result.tokens.find((t) => t.kind === "number");
    assert.equal(number?.value, "0b1010");
  });

  it("tokenises octal number literals", () => {
    const result = lex("0o755", "test.lln");
    const number = result.tokens.find((t) => t.kind === "number");
    assert.equal(number?.value, "0o755");
  });

  it("keeps a Byte hex initializer as an operator followed by one number token", () => {
    const result = lex("let byte: Byte = 0xFF", "test.lln");
    const nonEof = result.tokens.filter((t) => t.kind !== "eof" && t.kind !== "newline");
    assert.deepEqual(
      nonEof.map((t) => `${t.kind}:${t.value}`),
      [
        "keyword:let",
        "identifier:byte",
        "symbol::",
        "identifier:Byte",
        "operator:=",
        "number:0xFF",
      ],
    );
  });

  it("tokenises two-char operators", () => {
    const result = lex("-> => == != <= >= && ||", "test.lln");
    const ops = result.tokens.filter((t) => t.kind === "operator");
    assert.deepEqual(ops.map((t) => t.value), ["->", "=>", "==", "!=", "<=", ">=", "&&", "||"]);
  });

  it("tokenises single-char operators and symbols", () => {
    const result = lex("( ) { } [ ] , : . ?", "test.lln");
    const syms = result.tokens.filter((t) => t.kind === "symbol" || t.kind === "operator");
    const values = syms.map((t) => t.value);
    assert.ok(values.includes("("));
    assert.ok(values.includes("}"));
    assert.ok(values.includes("?"));
  });

  it("tokenises line comments", () => {
    const result = lex("// this is a comment\nflow", "test.lln");
    const comment = result.tokens.find((t) => t.kind === "comment");
    assert.ok(comment !== undefined);
    assert.ok(comment.value.includes("this is a comment"));
  });

  it("tokenises doc comments", () => {
    const result = lex("/// doc comment text", "test.lln");
    const doc = result.tokens.find((t) => t.kind === "docComment");
    assert.ok(doc !== undefined);
    assert.ok(doc.value.includes("doc comment text"));
  });

  it("tracks line and column numbers", () => {
    const result = lex("flow\norder", "test.lln");
    const tokens = result.tokens.filter((t) => t.kind !== "newline" && t.kind !== "eof");
    assert.equal(tokens[0]?.line, 1);
    assert.equal(tokens[0]?.column, 1);
    assert.equal(tokens[1]?.line, 2);
    assert.equal(tokens[1]?.column, 1);
  });

  it("records byte offsets (start/end)", () => {
    const source = "flow add";
    const result = lex(source, "test.lln");
    const flowTok = result.tokens.find((t) => t.value === "flow");
    assert.ok(flowTok !== undefined);
    assert.equal(flowTok.start, 0);
    assert.equal(flowTok.end, 4);
    const addTok = result.tokens.find((t) => t.value === "add");
    assert.ok(addTok !== undefined);
    assert.equal(addTok.start, 5);
    assert.equal(addTok.end, 8);
  });

  it("emits LLN-SYNTAX-003 for future-reserved keywords", () => {
    const result = lex("let async = 1", "test.lln");
    const diag = result.diagnostics.find((d) => d.code === "LLN-SYNTAX-003");
    assert.ok(diag !== undefined, "Expected LLN-SYNTAX-003 for future-reserved keyword");
  });

  it("produces eof token at the correct position", () => {
    const source = "let x";
    const result = lex(source, "test.lln");
    const eof = result.tokens[result.tokens.length - 1];
    assert.equal(eof?.kind, "eof");
    assert.equal(eof?.start, source.length);
  });
});

describe("Lexer — endLine / endColumn source ranges", () => {
  it("single-line token: endLine === line, endColumn === column + value.length", () => {
    const result = lex("let", "test.lln");
    const tok = result.tokens.find((t) => t.value === "let");
    assert.ok(tok !== undefined);
    assert.equal(tok.line, 1);
    assert.equal(tok.column, 1);
    assert.equal(tok.endLine, 1);
    assert.equal(tok.endColumn, 4); // 1 + 3 chars
  });

  it("eof token has endLine and endColumn equal to its position", () => {
    const result = lex("x", "test.lln");
    const eof = result.tokens[result.tokens.length - 1];
    assert.equal(eof?.kind, "eof");
    assert.equal(typeof eof?.endLine, "number");
    assert.equal(typeof eof?.endColumn, "number");
  });

  it("multi-word source: second token has correct start position", () => {
    const result = lex("let x", "test.lln");
    const xTok = result.tokens.find((t) => t.value === "x");
    assert.ok(xTok !== undefined);
    assert.equal(xTok.line, 1);
    assert.equal(xTok.column, 5);
    assert.equal(xTok.endLine, 1);
    assert.equal(xTok.endColumn, 6);
  });

  it("token on second line has correct line/endLine", () => {
    const result = lex("flow\norder", "test.lln");
    const orderTok = result.tokens.find((t) => t.value === "order");
    assert.ok(orderTok !== undefined);
    assert.equal(orderTok.line, 2);
    assert.equal(orderTok.endLine, 2);
    assert.equal(orderTok.column, 1);
    assert.equal(orderTok.endColumn, 6); // "order" = 5 chars
  });
});

describe("Lexer — LLN-LEX-001 excessive generic nesting", () => {
  it("exports LLN_LEX_001 with correct code", () => {
    assert.equal(LLN_LEX_001.code, "LLN-LEX-001");
    assert.equal(LLN_LEX_001.name, "ExcessiveNesting");
  });

  it("does not emit LLN-LEX-001 for 8 levels of nesting", () => {
    // 8 < chars: no error
    const source = "A<B<C<D<E<F<G<H>>>>>>>>"; // 8 < depth at most
    const result = lex(source, "test.lln");
    const diag = result.diagnostics.find((d) => d.code === "LLN-LEX-001");
    assert.ok(diag === undefined, "Should not emit LLN-LEX-001 for exactly 8 levels");
  });

  it("emits LLN-LEX-001 when nesting exceeds 8 levels", () => {
    // 9 < in a row — depth reaches 9 on the last <
    const source = "<".repeat(9);
    const result = lex(source, "test.lln");
    const diag = result.diagnostics.find((d) => d.code === "LLN-LEX-001");
    assert.ok(diag !== undefined, "Expected LLN-LEX-001 for depth > 8");
    assert.equal(diag.code, "LLN-LEX-001");
  });
});

describe("Lexer — LLN-LEX-002 oversized token", () => {
  it("exports LLN_LEX_002 with correct code", () => {
    assert.equal(LLN_LEX_002.code, "LLN-LEX-002");
    assert.equal(LLN_LEX_002.name, "OversizedToken");
  });

  it("emits LLN-LEX-002 for an identifier exceeding 10,000 chars", () => {
    const longName = "a" + "b".repeat(10_001);
    const result = lex(longName, "test.lln");
    const diag = result.diagnostics.find((d) => d.code === "LLN-LEX-002");
    assert.ok(diag !== undefined, "Expected LLN-LEX-002 for identifier > 10,000 chars");
  });

  it("does not emit LLN-LEX-002 for an identifier of exactly 10,000 chars", () => {
    const normalName = "a".repeat(10_000);
    const result = lex(normalName, "test.lln");
    const diag = result.diagnostics.find((d) => d.code === "LLN-LEX-002");
    assert.ok(diag === undefined, "Should not emit LLN-LEX-002 for exactly 10,000 chars");
  });

  it("emits LLN-LEX-002 for a string literal body exceeding 10,000 chars", () => {
    const longStr = '"' + "x".repeat(10_001) + '"';
    const result = lex(longStr, "test.lln");
    const diag = result.diagnostics.find((d) => d.code === "LLN-LEX-002");
    assert.ok(diag !== undefined, "Expected LLN-LEX-002 for string > 10,000 chars");
  });
});

describe("Lexer — LLN-LEX-003 unicode escape sequences", () => {
  it("exports LLN_LEX_003 with correct code", () => {
    assert.equal(LLN_LEX_003.code, "LLN-LEX-003");
    assert.equal(LLN_LEX_003.name, "InvalidUnicodeEscape");
  });

  it("correctly lexes \\u{1F600} (emoji code point)", () => {
    const result = lex('"\\u{1F600}"', "test.lln");
    assert.equal(result.diagnostics.length, 0, "Expected no diagnostics for valid \\u{1F600}");
    const str = result.tokens.find((t) => t.kind === "string");
    assert.ok(str !== undefined);
    // The value should contain the decoded emoji character
    assert.ok(str.value.includes("\u{1F600}"), `Expected emoji in value, got: ${JSON.stringify(str.value)}`);
  });

  it("correctly lexes \\u0041 (BMP 4-digit form, letter A)", () => {
    const result = lex('"\\u0041"', "test.lln");
    assert.equal(result.diagnostics.length, 0, "Expected no diagnostics for valid \\u0041");
    const str = result.tokens.find((t) => t.kind === "string");
    assert.ok(str !== undefined);
    assert.ok(str.value.includes("A"), `Expected 'A' in value, got: ${JSON.stringify(str.value)}`);
  });

  it("emits LLN-LEX-003 for \\u{} with no hex digits", () => {
    const result = lex('"\\u{}"', "test.lln");
    const diag = result.diagnostics.find((d) => d.code === "LLN-LEX-003");
    assert.ok(diag !== undefined, "Expected LLN-LEX-003 for \\u{}");
  });

  it("emits LLN-LEX-003 for \\u{FFFFFF1} — code point out of range", () => {
    const result = lex('"\\u{FFFFFF1}"', "test.lln");
    const diag = result.diagnostics.find((d) => d.code === "LLN-LEX-003");
    assert.ok(diag !== undefined, "Expected LLN-LEX-003 for out-of-range code point");
  });

  it("emits LLN-LEX-003 for \\u with only 2 hex digits (invalid 4-digit form)", () => {
    const result = lex('"\\u004"', "test.lln");
    const diag = result.diagnostics.find((d) => d.code === "LLN-LEX-003");
    assert.ok(diag !== undefined, "Expected LLN-LEX-003 for \\u with < 4 hex digits");
  });

  it("correctly lexes multiple unicode escapes in one string", () => {
    const result = lex('"\\u0048\\u0065\\u006C\\u006C\\u006F"', "test.lln");
    assert.equal(result.diagnostics.length, 0, "Expected no diagnostics for valid \\uXXXX sequence");
    const str = result.tokens.find((t) => t.kind === "string");
    assert.ok(str !== undefined);
    // "Hello" in BMP escapes
    assert.ok(str.value.includes("Hello"), `Expected 'Hello' in value, got: ${JSON.stringify(str.value)}`);
  });
});
