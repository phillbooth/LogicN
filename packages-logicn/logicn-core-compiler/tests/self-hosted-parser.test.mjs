// =============================================================================
// Self-Hosted Parser — End-to-End Execution Test
//
// Verifies that src/self-hosted/parser.lln parses and executes correctly,
// producing valid FlowDecl records from a token stream produced by lexer.lln.
//
// Pipeline under test:
//   LogicN source text
//     → tokenize() from lexer.lln  → Array<Token>
//     → parseFlows() from parser.lln → ParseResult { flows, errors }
//
// Milestones exercised:
//   - Stage B: self-hosted parser Milestone 1 (flow headers only)
//   - Phase 12A: while loops (active)
//   - Phase 11A runtime: mut reassignment (active)
//   - stdlib: Array.empty, Array.append, list.get
//   - Interpreter: match on enum variant (TokenKind.Keyword etc.)
//   - Interpreter: record literal construction
//   - Constructs parsed: pure/guarded/secure/flow qualifiers
//   - Constructs parsed: parameter lists (readonly and plain)
//   - Constructs parsed: return type annotation (split "-" ">" tokens)
//   - Constructs parsed: with effects [...] clause (dotted names)
//   - Constructs parsed: shallow body brace-skipping
// =============================================================================

import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

import { parseProgram, resolveSymbols, checkTypes, executeFlow } from "../dist/index.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __dir = dirname(fileURLToPath(import.meta.url));
const LEXER_PATH  = join(__dir, "../src/self-hosted/lexer.lln");
const PARSER_PATH = join(__dir, "../src/self-hosted/parser.lln");

// ---------------------------------------------------------------------------
// Setup: load and compile the combined lexer + parser into a single AST
// ---------------------------------------------------------------------------

let combinedAst;

before(() => {
  let lexerSrc = readFileSync(LEXER_PATH, "utf8");
  if (lexerSrc.charCodeAt(0) === 0xFEFF) lexerSrc = lexerSrc.slice(1);

  let parserSrc = readFileSync(PARSER_PATH, "utf8");
  if (parserSrc.charCodeAt(0) === 0xFEFF) parserSrc = parserSrc.slice(1);

  // Combine into one compilation unit so lexer types are visible to the parser
  const combined = lexerSrc + "\n" + parserSrc;
  const parsed = parseProgram(combined, "lexer+parser.lln");
  resolveSymbols(parsed.ast);
  checkTypes(parsed.ast);
  combinedAst = parsed.ast;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Tokenize LogicN source via the self-hosted lexer, then parse it via the
 * self-hosted parser. Returns the ParseResult record value.
 */
async function pipeline(source) {
  const lexResult = await executeFlow(
    "tokenize",
    new Map([["source", { __tag: "string", value: source }]]),
    combinedAst,
  );
  assert.equal(lexResult.value.__tag, "ok", "tokenize must return Ok");
  const tokens = lexResult.value.value;

  const parseResult = await executeFlow(
    "parseFlows",
    new Map([["tokens", tokens]]),
    combinedAst,
  );
  assert.equal(parseResult.value.__tag, "record", "parseFlows must return a record");
  return parseResult.value;
}

/** Extract a string field from a LogicN record value. */
function strField(record, field) {
  const v = record.fields.get(field);
  if (v?.__tag === "string")  return v.value;
  if (v?.__tag === "bool")    return String(v.value);
  if (v?.__tag === "unresolved") return v.name;
  return undefined;
}

/** Extract the flows list from a ParseResult record. */
function flowsList(result) {
  const flows = result.fields.get("flows");
  assert.equal(flows?.__tag, "list", "ParseResult.flows must be a list");
  return flows.items;
}

/** Extract the effects list from a FlowDecl record. Returns array of strings. */
function effectsList(flowDecl) {
  const efx = flowDecl.fields.get("effects");
  assert.equal(efx?.__tag, "list", "FlowDecl.effects must be a list");
  return efx.items.map((e) => e.__tag === "string" ? e.value : "??");
}

/** Extract the params list from a FlowDecl record. */
function paramsList(flowDecl) {
  const p = flowDecl.fields.get("params");
  assert.equal(p?.__tag, "list", "FlowDecl.params must be a list");
  return p.items.map((item) => ({
    name:       strField(item, "name"),
    typeName:   strField(item, "typeName"),
    isReadonly: strField(item, "isReadonly"),
  }));
}

// ---------------------------------------------------------------------------
// Section 1: Parse-time sanity
// ---------------------------------------------------------------------------

describe("Self-Hosted Parser (parser.lln) — parse-time sanity", () => {

  it("parser.lln alone parses with zero errors", () => {
    let src = readFileSync(PARSER_PATH, "utf8");
    if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
    const parsed = parseProgram(src, "parser.lln");
    const errors = parsed.diagnostics.filter((d) => d.severity === "error");
    assert.equal(
      errors.length,
      0,
      `Expected 0 parse errors, got: ${errors.map((e) => e.message).join("; ")}`,
    );
  });

  it("parser.lln exports the three expected flows", () => {
    let src = readFileSync(PARSER_PATH, "utf8");
    if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
    const parsed = parseProgram(src, "parser.lln");
    const names = parsed.flows?.map((f) => f.name) ?? [];
    assert.ok(names.includes("parseFlows"), "parseFlows should be present");
    assert.ok(names.includes("tokVal"),     "tokVal helper should be present");
    assert.ok(names.includes("isKw"),       "isKw helper should be present");
  });

  it("combined lexer + parser compiles with zero errors", () => {
    let lexerSrc = readFileSync(LEXER_PATH, "utf8");
    if (lexerSrc.charCodeAt(0) === 0xFEFF) lexerSrc = lexerSrc.slice(1);
    let parserSrc = readFileSync(PARSER_PATH, "utf8");
    if (parserSrc.charCodeAt(0) === 0xFEFF) parserSrc = parserSrc.slice(1);
    const parsed = parseProgram(lexerSrc + "\n" + parserSrc, "combined.lln");
    const errors = parsed.diagnostics.filter((d) => d.severity === "error");
    assert.equal(
      errors.length,
      0,
      `Combined has errors: ${errors.map((e) => e.message).join("; ")}`,
    );
  });

});

// ---------------------------------------------------------------------------
// Section 2: pure flow — simplest case
// ---------------------------------------------------------------------------

describe("Self-Hosted Parser — pure flow declaration", () => {

  it("parseFlows returns a ParseResult record", async () => {
    const result = await pipeline('pure flow greet() -> String { return "hello" }');
    assert.equal(result.__tag, "record");
    assert.ok(result.fields.has("flows"),  "must have flows field");
    assert.ok(result.fields.has("errors"), "must have errors field");
  });

  it("parseFlows produces exactly one FlowDecl for a single pure flow", async () => {
    const result = await pipeline('pure flow greet() -> String { return "hello" }');
    const flows = flowsList(result);
    assert.equal(flows.length, 1, "should produce exactly one FlowDecl");
  });

  it("FlowDecl.kind is 'pure' for a pure flow", async () => {
    const result = await pipeline('pure flow greet() -> String { return "hello" }');
    const [flow] = flowsList(result);
    assert.equal(strField(flow, "kind"), "pure");
  });

  it("FlowDecl.name is 'greet'", async () => {
    const result = await pipeline('pure flow greet() -> String { return "hello" }');
    const [flow] = flowsList(result);
    assert.equal(strField(flow, "name"), "greet");
  });

  it("FlowDecl.returnType is 'String'", async () => {
    const result = await pipeline('pure flow greet() -> String { return "hello" }');
    const [flow] = flowsList(result);
    assert.equal(strField(flow, "returnType"), "String");
  });

  it("FlowDecl.params is an empty list for a no-param flow", async () => {
    const result = await pipeline('pure flow greet() -> String { return "hello" }');
    const [flow] = flowsList(result);
    assert.equal(paramsList(flow).length, 0);
  });

  it("FlowDecl.effects is an empty list when no effects clause", async () => {
    const result = await pipeline('pure flow greet() -> String { return "hello" }');
    const [flow] = flowsList(result);
    assert.deepEqual(effectsList(flow), []);
  });

});

// ---------------------------------------------------------------------------
// Section 3: guarded flow with parameters
// ---------------------------------------------------------------------------

describe("Self-Hosted Parser — guarded flow with parameters", () => {

  it("recognises 'guarded' qualifier", async () => {
    const result = await pipeline("guarded flow add(x: Int, y: Int) -> Int { return x }");
    const [flow] = flowsList(result);
    assert.equal(strField(flow, "kind"), "guarded");
  });

  it("parses two plain parameters correctly", async () => {
    const result = await pipeline("guarded flow add(x: Int, y: Int) -> Int { return x }");
    const [flow] = flowsList(result);
    const params = paramsList(flow);
    assert.equal(params.length, 2);
    assert.equal(params[0]?.name,     "x");
    assert.equal(params[0]?.typeName, "Int");
    assert.equal(params[0]?.isReadonly, "false");
    assert.equal(params[1]?.name,     "y");
    assert.equal(params[1]?.typeName, "Int");
  });

  it("return type Int is captured", async () => {
    const result = await pipeline("guarded flow add(x: Int, y: Int) -> Int { return x }");
    const [flow] = flowsList(result);
    assert.equal(strField(flow, "returnType"), "Int");
  });

});

// ---------------------------------------------------------------------------
// Section 4: secure flow with readonly parameter
// ---------------------------------------------------------------------------

describe("Self-Hosted Parser — secure flow with readonly parameter", () => {

  it("recognises 'secure' qualifier", async () => {
    const result = await pipeline('secure flow login(readonly user: String) -> Result { return "ok" }');
    const [flow] = flowsList(result);
    assert.equal(strField(flow, "kind"), "secure");
  });

  it("parses readonly parameter with isReadonly=true", async () => {
    const result = await pipeline('secure flow login(readonly user: String) -> Result { return "ok" }');
    const [flow] = flowsList(result);
    const params = paramsList(flow);
    assert.equal(params.length, 1);
    assert.equal(params[0]?.name,       "user");
    assert.equal(params[0]?.typeName,   "String");
    assert.equal(params[0]?.isReadonly, "true");
  });

});

// ---------------------------------------------------------------------------
// Section 5: with effects clause
// ---------------------------------------------------------------------------

describe("Self-Hosted Parser — with effects clause", () => {

  it("parses a single effect name", async () => {
    const result = await pipeline("pure flow fetch() -> String with effects [io.read] { return x }");
    const [flow] = flowsList(result);
    assert.deepEqual(effectsList(flow), ["io.read"]);
  });

  it("parses multiple dotted effect names", async () => {
    const result = await pipeline(
      "pure flow sync(x: Int) -> Int with effects [io.read, db.write] { return x }",
    );
    const [flow] = flowsList(result);
    assert.deepEqual(effectsList(flow), ["io.read", "db.write"]);
  });

  it("effects don't bleed into returnType", async () => {
    const result = await pipeline(
      "pure flow sync(x: Int) -> Int with effects [io.read] { return x }",
    );
    const [flow] = flowsList(result);
    assert.equal(strField(flow, "returnType"), "Int");
  });

});

// ---------------------------------------------------------------------------
// Section 6: bare "flow" keyword (no qualifier)
// ---------------------------------------------------------------------------

describe("Self-Hosted Parser — bare flow keyword", () => {

  it("bare 'flow' keyword produces kind='flow'", async () => {
    const result = await pipeline("flow process(x: Int) -> Int { return x }");
    const [flow] = flowsList(result);
    assert.equal(strField(flow, "kind"), "flow");
    assert.equal(strField(flow, "name"), "process");
  });

  it("bare flow captures its parameter", async () => {
    const result = await pipeline("flow process(x: Int) -> Int { return x }");
    const [flow] = flowsList(result);
    const params = paramsList(flow);
    assert.equal(params.length, 1);
    assert.equal(params[0]?.name, "x");
  });

});

// ---------------------------------------------------------------------------
// Section 7: multiple flow declarations in one source
// ---------------------------------------------------------------------------

describe("Self-Hosted Parser — multiple flow declarations", () => {

  it("parses two consecutive flows", async () => {
    const src = [
      'pure flow a() -> Int { return 1 }',
      'guarded flow b(x: String) -> String { return x }',
    ].join("\n");
    const result = await pipeline(src);
    const flows = flowsList(result);
    assert.equal(flows.length, 2);
  });

  it("first flow is 'a', second flow is 'b'", async () => {
    const src = [
      'pure flow a() -> Int { return 1 }',
      'guarded flow b(x: String) -> String { return x }',
    ].join("\n");
    const result = await pipeline(src);
    const flows = flowsList(result);
    assert.equal(strField(flows[0], "name"), "a");
    assert.equal(strField(flows[1], "name"), "b");
  });

  it("qualifiers are preserved across multiple flows", async () => {
    const src = [
      'pure flow a() -> Int { return 1 }',
      'guarded flow b(x: String) -> String { return x }',
    ].join("\n");
    const result = await pipeline(src);
    const flows = flowsList(result);
    assert.equal(strField(flows[0], "kind"), "pure");
    assert.equal(strField(flows[1], "kind"), "guarded");
  });

  it("non-flow tokens between declarations are skipped without error", async () => {
    const src = [
      "// This is a comment line that becomes symbols/identifiers",
      'pure flow a() -> Int { return 1 }',
      'let x = 42',
      'guarded flow b() -> String { return "hi" }',
    ].join("\n");
    const result = await pipeline(src);
    const flows = flowsList(result);
    assert.equal(flows.length, 2, "should find exactly the two flow declarations");
  });

});

// ---------------------------------------------------------------------------
// Section 8: body brace skipping
// ---------------------------------------------------------------------------

describe("Self-Hosted Parser — body brace skipping", () => {

  it("correctly skips a multi-statement body and does not confuse tokens after '}'", async () => {
    const src = [
      'pure flow calc(x: Int) -> Int { let y = x + 1 return y }',
      'pure flow next() -> String { return "done" }',
    ].join("\n");
    const result = await pipeline(src);
    const flows = flowsList(result);
    assert.equal(flows.length, 2);
    assert.equal(strField(flows[1], "name"), "next");
  });

  it("handles nested braces in body without confusion", async () => {
    const src = 'pure flow nested() -> Int { if true { return 1 } return 0 }\npure flow after() -> Int { return 2 }';
    const result = await pipeline(src);
    const flows = flowsList(result);
    assert.equal(flows.length, 2);
    assert.equal(strField(flows[1], "name"), "after");
  });

});

// ---------------------------------------------------------------------------
// Section 9: error resilience
// ---------------------------------------------------------------------------

describe("Self-Hosted Parser — error resilience", () => {

  it("returns ParseResult with errors list (empty on clean input)", async () => {
    const result = await pipeline('pure flow ok() -> Int { return 1 }');
    const errs = result.fields.get("errors");
    assert.equal(errs?.__tag, "list");
  });

  it("produces zero runtime diagnostics for well-formed input", async () => {
    const lexResult = await executeFlow(
      "tokenize",
      new Map([["source", { __tag: "string", value: 'pure flow greet() -> String { return "hello" }' }]]),
      combinedAst,
    );
    const tokens = lexResult.value.value;
    const parseResult = await executeFlow(
      "parseFlows",
      new Map([["tokens", tokens]]),
      combinedAst,
    );
    const runtimeErrors = parseResult.diagnostics.filter((d) => d.code === "LLN-RUNTIME-002");
    assert.equal(runtimeErrors.length, 0, "Should produce no unresolved-call runtime errors");
  });

  it("empty token stream returns empty flows list without crash", async () => {
    // Tokenize empty source — should give just Eof
    const lexResult = await executeFlow(
      "tokenize",
      new Map([["source", { __tag: "string", value: "" }]]),
      combinedAst,
    );
    const tokens = lexResult.value.value;
    const parseResult = await executeFlow(
      "parseFlows",
      new Map([["tokens", tokens]]),
      combinedAst,
    );
    const flows = flowsList(parseResult.value);
    assert.equal(flows.length, 0);
  });

});
