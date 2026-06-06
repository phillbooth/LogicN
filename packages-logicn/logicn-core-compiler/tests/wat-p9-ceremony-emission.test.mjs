/**
 * P9 bootstrap ceremony — EMISSION gate.
 *
 * The single gate to P9 is self-hosting: the self-hosted lexer (src/self-hosted/
 * lexer.lln), whose `tokenize` flow RETURNS a record (a token list), must emit real
 * WASM instead of `unreachable`. Before P9.4b record lowering, `tokenize` fell back
 * to `unreachable`; with P9.4b (record construction + field access) and P9.4c (guarded
 * export gating), the whole lexer now lowers to a real, wabt-assembling WASM module.
 *
 * This test pins the EMISSION milestone: every self-hosted lexer flow has a real body,
 * `tokenize` included, and the module assembles to a valid WASM binary.
 *
 * NOT covered here (the remaining Post-P9 step, overlaps #105): EXECUTING tokenize.wasm
 * and byte-comparing its output to the interpreter requires the full host-import runtime
 * (string table, array bridge, char classification) wired into WebAssembly.instantiate.
 * Interpreter-level Stage-A == Stage-B parity is already locked by lexer-parity.test.mjs.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

import {
  parseProgram, checkEffects, emitGIR,
  buildWATModuleFromGIR, renderWAT, assembleWAT,
} from "../dist/index.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const LEXER_PATH = join(__dir, "../src/self-hosted/lexer.lln");

function isStub(body) {
  const b = (body ?? "").trim();
  return b === "unreachable" || b === "" || /^\(i32\.const 0\)/.test(b);
}

function compileLexer() {
  let src = readFileSync(LEXER_PATH, "utf8");
  if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
  const prog = parseProgram(src, "lexer.lln");
  const perr = (prog.diagnostics ?? []).filter((d) => d.severity === "error");
  assert.equal(perr.length, 0, "lexer.lln parses cleanly");
  const fx = checkEffects(prog.flows, prog.ast);
  const { gir } = emitGIR(prog.ast, prog.flows, fx);
  const mod = buildWATModuleFromGIR(gir, undefined, "lexer", prog.ast, true);
  return { mod, wat: renderWAT(mod) };
}

describe("P9 ceremony — self-hosted lexer emits real WASM", () => {
  it("every self-hosted lexer flow lowers to a real body (no unreachable stubs)", () => {
    const { mod } = compileLexer();
    const stubs = mod.functions.filter((f) => isStub(f.body)).map((f) => f.name);
    assert.equal(stubs.length, 0, `flows still stubbed: ${stubs.join(", ")}`);
  });

  it("the record-returning `tokenize` flow has a real body using the record heap", () => {
    const { mod, wat } = compileLexer();
    const tok = mod.functions.find((f) => f.name === "tokenize");
    assert.ok(tok, "tokenize flow present");
    assert.equal(isStub(tok.body), false, "tokenize emits a real body, not unreachable");
    assert.match(wat, /global \$__lln_heap/, "record bump-allocator heap is emitted");
  });

  it("the whole self-hosted lexer module assembles to a valid WASM binary (wabt)", async () => {
    const { wat } = compileLexer();
    const asm = await assembleWAT(wat);
    assert.equal(asm.valid, true, `lexer.wasm must assemble: ${JSON.stringify(asm.diagnostics)}`);
    // sanity: real WebAssembly magic header
    assert.equal(asm.wasm[0], 0x00);
    assert.equal(asm.wasm[1], 0x61);
    assert.equal(asm.wasm[2], 0x73);
    assert.equal(asm.wasm[3], 0x6d);
  });
});
