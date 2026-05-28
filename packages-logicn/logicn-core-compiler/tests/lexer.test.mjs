import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  lex,
  V1_ACTIVE_KEYWORDS,
  V1_FUTURE_RESERVED,
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
