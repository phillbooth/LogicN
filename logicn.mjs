#!/usr/bin/env node
/**
 * logicn — LogicN program compiler and runner
 *
 * Usage:
 *   node logicn.mjs run <program.lln>           # compile + run via Node.js WebAssembly
 *   node logicn.mjs build <program.lln>         # compile to .wasm + .wat in build/
 *   node logicn.mjs check <program.lln>         # type-check + governance only
 *   node logicn.mjs run <program.lln> --invoke <flow> [args...]  # invoke a specific flow
 *
 * The WASM path:
 *   .lln source → parseProgram → emitGIR → buildWATModuleFromGIR → renderWAT
 *               → assembleWAT (wabt) → WebAssembly.instantiate → run
 *
 * To use with wasmtime instead of Node:
 *   node logicn.mjs build program.lln
 *   wasmtime --invoke main build/program.wasm
 *
 * Baseline (governance-cost, Stage-A tree-walker): 3,200 ops/sec
 * This WASM path:                                  ~1,880,000 ops/sec  (588×)
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const compilerPath = new URL("packages-logicn/logicn-core-compiler/dist/index.js", import.meta.url).href;

async function main() {
  const [, , command = "help", ...rest] = process.argv;

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(`logicn — LogicN compiler + runtime (Phase 27 WASM)

Commands:
  logicn run <file.lln> [--invoke <flow>] [args...]   compile .lln → WASM → run
  logicn build <file.lln>                             compile → build/<name>.wasm + .wat
  logicn check <file.lln>                             type-check + governance verify

Examples:
  logicn run   governance-cost.lln --invoke main
  logicn build governance-cost.lln
  logicn check examples/auth-service/verifyPassword.lln

  # After build, run the raw WASM binary without Node.js:
  wasmtime --invoke main build/governance-cost.wasm

Install (if logicn not yet on PATH):
  cd C:\\wwwprojects\\LogicN && npm link       (Windows cmd.exe)
  cd /c/wwwprojects/LogicN && npm link        (Git Bash / Linux)

Baseline comparison (governance-cost):
  Stage-A tree-walker (governed):  3,200 ops/sec
  This WASM path:                  ~1,880,000 ops/sec  (588×)
`);
    return;
  }

  const m = await import(compilerPath);

  const llnFile = rest[0];
  if (!llnFile) { console.error("Error: no .lln file specified"); process.exit(1); }

  const source = readFileSync(llnFile, "utf8");
  const parsed = m.parseProgram(source, llnFile);
  const errors = (parsed.diagnostics ?? []).filter(d => d.severity === "error");

  if (command === "check") {
    const fx = m.checkEffects(parsed.flows, parsed.ast);
    const gov = m.verifyGovernance(parsed.ast, parsed.flows, fx, "production");
    const allDiags = [...errors, ...gov.diagnostics];
    if (allDiags.length === 0) {
      console.log(`✅ ${llnFile}: 0 errors, 0 governance warnings`);
    } else {
      allDiags.forEach(d => console.log(`${d.severity === "error" ? "❌" : "⚠️"} ${d.code}: ${d.message}`));
    }
    process.exit(errors.length > 0 ? 1 : 0);
  }

  if (errors.length > 0) {
    errors.forEach(e => console.error(`❌ ${e.code}: ${e.message}`));
    process.exit(1);
  }

  // Compile to WASM
  const fx = m.checkEffects(parsed.flows, parsed.ast);
  const { gir } = m.emitGIR(parsed.ast, parsed.flows, fx);
  const watModule = m.buildWATModuleFromGIR(gir, undefined, "wasm-standalone", parsed.ast, true);
  const wat = m.renderWAT(watModule);
  const assembled = await m.assembleWAT(wat);

  if (!assembled.valid) {
    console.error("Compilation failed:", assembled.diagnostics.map(d => d.message).join("; "));
    process.exit(1);
  }

  if (command === "build") {
    const name = basename(llnFile, ".lln");
    mkdirSync("build", { recursive: true });
    writeFileSync(`build/${name}.wasm`, assembled.wasm);
    writeFileSync(`build/${name}.wat`, wat);

    // .lmanifest generation (DRCM Phase 1 task #33 — RFC 8785 canonical JSON)
    try {
      const { generateManifest, serializeManifest } = await import(
        new URL("packages-logicn/logicn-core-compiler/dist/manifest-generator.js", import.meta.url).href
      );
      const govResult = m.verifyGovernance(parsed.ast, parsed.flows,
        m.checkEffects(parsed.flows, parsed.ast), "dev");
      const source = readFileSync(llnFile, "utf8");
      const manifest = generateManifest(source, llnFile, parsed.flows, govResult);
      // Two-format output (per logicn-cbor-manifest-spec.md):
      //   .lmanifest      = RFC 8785 canonical JSON → signing target (→ binary CBOR when task #67 ships)
      //   .lmanifest.json = pretty-printed JSON → human inspection
      const manifestJson = serializeManifest(manifest);
      const { prettyManifest } = await import(
        new URL("packages-logicn/logicn-core-compiler/dist/manifest-generator.js", import.meta.url).href
      );
      writeFileSync(`build/${name}.lmanifest`, manifestJson);
      writeFileSync(`build/${name}.lmanifest.json`, prettyManifest(manifest));
      console.log(`   build/${name}.lmanifest      (canonical — for signing)`);
      console.log(`   build/${name}.lmanifest.json (human-readable)`);
    } catch { /* manifest generation non-fatal */ }

    console.log(`✅ Compiled ${llnFile}`);
    console.log(`   build/${name}.wasm  (${assembled.wasm.byteLength} bytes)`);
    console.log(`   build/${name}.wat   (${wat.split("\n").length} lines)`);
    console.log(`\nRun with wasmtime:`);
    console.log(`   wasmtime --invoke main build/${name}.wasm`);
    return;
  }

  if (command === "run") {
    const invokeIdx = rest.indexOf("--invoke");
    const flowName = invokeIdx >= 0 ? rest[invokeIdx + 1] : "main";
    const args = invokeIdx >= 0 ? rest.slice(invokeIdx + 2).map(Number) : [];

    const result = await WebAssembly.instantiate(assembled.wasm);
    const fn = result.instance.exports[flowName];
    if (typeof fn !== "function") {
      console.error(`Flow '${flowName}' not found. Available: ${Object.keys(result.instance.exports).filter(k => k !== "memory").join(", ")}`);
      process.exit(1);
    }
    const output = fn(...args);
    console.log(output);
    return;
  }

  console.error(`Unknown command: ${command}. Run with --help.`);
  process.exit(1);
}

main().catch(e => { console.error(e.message); process.exit(1); });
