// =============================================================================
// Lexer — Comment Styles and govComment Token Tests (task #93)
//
// Tests for the three comment forms supported by the LogicN lexer:
//   1. // line comment          → produces "comment" token
//   2. ;; governance annotation → produces "govComment" token (FIRST-CLASS)
//   3. /* ... */  block comment → produces "comment" token
//
// The ;; govComment is distinct from // because its text flows into the
// .lmanifest governance narrative, making it a first-class security artifact.
//
// Also tests that a trailing ; (single semicolon) produces a "newline" token,
// not a "symbol" token.
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lex } from "../../dist/index.js";

// ---------------------------------------------------------------------------
// // line comment → "comment" token
// ---------------------------------------------------------------------------

describe("// line comment: produces 'comment' token", () => {
  it("// text produces a token with kind 'comment'", () => {
    const result = lex("// this is a code comment\nlet x = 1", "test.lln");
    const commentTok = result.tokens.find((t) => t.kind === "comment");
    assert.ok(commentTok !== undefined, "Expected a 'comment' token for //");
    assert.ok(
      commentTok.value.includes("this is a code comment"),
      `comment token value must include the comment text, got: '${commentTok.value}'`,
    );
  });

  it("// comment token appears before subsequent code tokens", () => {
    const result = lex("// header\nflow", "test.lln");
    const nonEof = result.tokens.filter(
      (t) => t.kind !== "eof" && t.kind !== "newline",
    );
    assert.ok(nonEof.length >= 2, "Expected comment token and 'flow' keyword");
    assert.equal(nonEof[0]?.kind, "comment", "First non-newline token must be comment");
    assert.equal(nonEof[1]?.kind, "keyword", "Second token must be the 'flow' keyword");
    assert.equal(nonEof[1]?.value, "flow");
  });

  it("// comment does NOT produce a govComment token", () => {
    const result = lex("// regular code comment\n", "test.lln");
    const govCommentTok = result.tokens.find((t) => t.kind === "govComment");
    assert.equal(
      govCommentTok,
      undefined,
      "// comment must not produce a govComment token",
    );
  });

  it("multiple // comments each produce distinct comment tokens", () => {
    const result = lex("// first\n// second\n// third\n", "test.lln");
    const comments = result.tokens.filter((t) => t.kind === "comment");
    assert.equal(comments.length, 3, "Expected 3 comment tokens");
  });
});

// ---------------------------------------------------------------------------
// ;; governance annotation → "govComment" token (FIRST-CLASS)
// ---------------------------------------------------------------------------

describe(";; governance annotation: produces 'govComment' token", () => {
  it(";; text produces a token with kind 'govComment'", () => {
    const result = lex(";; governance annotation\nlet x = 1", "test.lln");
    const govTok = result.tokens.find((t) => t.kind === "govComment");
    assert.ok(govTok !== undefined, "Expected a 'govComment' token for ;;");
  });

  it(";; govComment token value contains the annotation text", () => {
    const result = lex(";; amount is validated\n", "test.lln");
    const govTok = result.tokens.find((t) => t.kind === "govComment");
    assert.ok(govTok !== undefined, "Expected govComment token");
    assert.ok(
      govTok.value.includes("amount is validated"),
      `govComment value must include the annotation text, got: '${govTok.value}'`,
    );
  });

  it(";; govComment does NOT produce an ordinary 'comment' token", () => {
    const result = lex(";; governance annotation\n", "test.lln");
    const regularComment = result.tokens.find((t) => t.kind === "comment");
    assert.equal(
      regularComment,
      undefined,
      ";; annotation must not produce a regular 'comment' token",
    );
  });

  it(";; govComment and // comment coexist as distinct token kinds", () => {
    const result = lex(";; security reasoning\n// code reasoning\n", "test.lln");
    const govTok = result.tokens.find((t) => t.kind === "govComment");
    const commentTok = result.tokens.find((t) => t.kind === "comment");
    assert.ok(govTok !== undefined, "Expected govComment token for ;;");
    assert.ok(commentTok !== undefined, "Expected comment token for //");
    assert.notEqual(govTok, commentTok, "govComment and comment must be distinct tokens");
  });

  it("govComment appears in the token stream at the correct line", () => {
    const result = lex("flow\n;; validated here\nlet", "test.lln");
    const govTok = result.tokens.find((t) => t.kind === "govComment");
    assert.ok(govTok !== undefined, "Expected govComment token");
    assert.equal(govTok.line, 2, "govComment must be on line 2");
  });

  it("multiple ;; annotations each produce a govComment token", () => {
    const result = lex(";; first annotation\n;; second annotation\n", "test.lln");
    const govTokens = result.tokens.filter((t) => t.kind === "govComment");
    assert.equal(govTokens.length, 2, "Expected 2 govComment tokens");
  });
});

// ---------------------------------------------------------------------------
// /* ... */ block comment → "comment" token
// ---------------------------------------------------------------------------

describe("/* */ block comment: produces 'comment' token", () => {
  it("/* single-line block */ produces a 'comment' token", () => {
    const result = lex("/* single line block */\nflow", "test.lln");
    const commentTok = result.tokens.find((t) => t.kind === "comment");
    assert.ok(commentTok !== undefined, "Expected a 'comment' token for /* */");
    assert.ok(
      commentTok.value.includes("single line block"),
      `comment value must include the block text, got: '${commentTok.value}'`,
    );
  });

  it("/* multi\nline\nblock */ spans multiple lines in one token", () => {
    const result = lex("/* block\nmulti\nline */\nflow", "test.lln");
    const commentTok = result.tokens.find((t) => t.kind === "comment");
    assert.ok(commentTok !== undefined, "Expected a comment token for block comment");
    assert.ok(
      commentTok.value.includes("block") && commentTok.value.includes("multi"),
      `Block comment token must contain all lines, got: '${commentTok.value}'`,
    );
  });

  it("block comment does NOT produce a govComment token", () => {
    const result = lex("/* a block comment */\n", "test.lln");
    const govTok = result.tokens.find((t) => t.kind === "govComment");
    assert.equal(
      govTok,
      undefined,
      "/* */ block comment must not produce a govComment token",
    );
  });

  it("lexer produces no errors for a well-formed block comment", () => {
    const result = lex("/* ok */\n", "test.lln");
    assert.equal(result.diagnostics.length, 0, "Expected 0 diagnostics for well-formed block comment");
  });
});

// ---------------------------------------------------------------------------
// Trailing ; — newline token, not symbol
// ---------------------------------------------------------------------------

describe("trailing ; produces newline-like separation, not a symbol", () => {
  it("let x = 1; — the ; is not emitted as a bare 'symbol' ; token", () => {
    // In LogicN, ; at end of line acts as a statement terminator / newline.
    // The lexer emits a newline token (or just moves to the next statement),
    // not a raw symbol ";". If it emits any token for ;, it should be newline.
    const result = lex("let x = 1;", "test.lln");
    const semiTokens = result.tokens.filter(
      (t) => t.kind === "symbol" && t.value === ";",
    );
    assert.equal(
      semiTokens.length,
      0,
      `Single ; must not appear as a bare 'symbol' ; token (got ${semiTokens.length} such tokens)`,
    );
  });

  it(";; is lexed as a govComment, not as two separate ; symbols", () => {
    const result = lex(";; annotation\n", "test.lln");
    // There must be NO symbol tokens with value ";"
    const semiSymbols = result.tokens.filter(
      (t) => t.kind === "symbol" && t.value === ";",
    );
    assert.equal(
      semiSymbols.length,
      0,
      ";; must be a single govComment token, not two ; symbols",
    );
    // The govComment token must be present
    const govTok = result.tokens.find((t) => t.kind === "govComment");
    assert.ok(govTok !== undefined, "Expected govComment token for ;;");
  });
});
