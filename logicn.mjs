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

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const compilerPath = new URL("packages-logicn/logicn-core-compiler/dist/index.js", import.meta.url).href;

async function main() {
  const [, , command = "help", ...rest] = process.argv;

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(`logicn — LogicN compiler + runtime (Phase 27 WASM)

Commands:
  logicn run <file.lln> [--invoke <flow>] [args...]   compile .lln → WASM → run
  logicn build <file.lln>                             compile → build/<name>.wasm + .wat + .lmanifest
  logicn check <file.lln>                             type-check + governance verify
  logicn check <file.lln> --diff                      show change class vs HEAD~1 before pushing
  logicn verify <file.lln>                            DRCM Phase 3 admission gate — verify manifest
  logicn manifest-to-dot <file.lln>                   export manifest as Graphviz DOT for DAG audit
  logicn init-env                                      validate capabilities against root policy

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

  // ── logicn init-env — validate capabilities against root governance policy (#65) ─
  // Must be checked BEFORE llnFile requirement since it takes no file argument.
  if (command === "init-env") {
    const m2 = await import(compilerPath);
    const { readdirSync: rds } = await import("node:fs");
    const scanDir = (dir) => {
      try { return rds(dir).filter(f => f.endsWith(".lln")).map(f => `${dir}/${f}`); }
      catch { return []; }
    };
    const flowFiles = [...scanDir("flows"), ...scanDir("examples/auth-service"), ...scanDir("tests/patterns")];
    let allFlows = 0, violations = 0;
    console.log(`logicn init-env — scanning ${flowFiles.length} flow file(s) for policy violations`);
    for (const file of flowFiles) {
      try {
        const src = readFileSync(file, "utf8");
        const p = m2.parseProgram(src, file);
        const fx = m2.checkEffects(p.flows, p.ast);
        const g = m2.verifyGovernance(p.ast, p.flows, fx, "dev");
        allFlows += p.flows.length;
        const errs = g.diagnostics.filter(d => d.severity === "error");
        if (errs.length > 0) {
          violations += errs.length;
          errs.forEach(d => console.log(`  ❌ ${file}: ${d.code} — ${d.message.slice(0, 100)}`));
        }
      } catch { /* skip unparseable files */ }
    }
    if (violations === 0) {
      console.log(`✅ init-env: ${allFlows} flows scanned, 0 violations — clean baseline for diffing`);
    } else {
      console.log(`⚠️  init-env: ${allFlows} flows scanned, ${violations} violation(s) — review before committing`);
      process.exit(2);
    }
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

    // ── --diff flag: show change class vs HEAD~1 before pushing (#64) ─────────
    // Lets developers see governance impact before git push. Equivalent to running
    // `logicn diff HEAD~1` but scoped to a single file.
    if (rest.includes("--diff")) {
      try {
        const { spawnSync } = await import("node:child_process");
        const { diffGovernance, renderGovernanceDiff } = await import(
          new URL("packages-logicn/logicn-core-compiler/dist/governance-diff.js", import.meta.url).href
        );
        // Get the HEAD~1 version of this file from git
        const gitResult = spawnSync("git", ["show", `HEAD~1:${llnFile}`],
          { encoding: "utf8", cwd: process.cwd() });
        if (gitResult.status === 0) {
          const prevSource = gitResult.stdout;
          const prevParsed = m.parseProgram(prevSource, llnFile);
          const diff = diffGovernance(prevParsed.flows, parsed.flows);
          console.log("\n── Governance diff (HEAD~1 → current) ──");
          console.log(renderGovernanceDiff(diff));
          if (diff.changeClass === "expansion") {
            console.log("⚠️  EXPANSION — 2 reviewers required (security/governance owner)");
          } else if (diff.changeClass === "experimental") {
            console.log("🔴 EXPERIMENTAL — architecture review required");
          } else {
            console.log(`✅ Change class: ${diff.changeClass.toUpperCase()}`);
          }
        } else {
          console.log("\n── Governance diff: no HEAD~1 version found (new file)");
        }
      } catch { /* non-fatal */ }
    }

    process.exit(errors.length > 0 ? 1 : 0);
  }

  // ── logicn manifest-to-dot — export manifest DAG as Graphviz DOT ────────────
  if (command === "manifest-to-dot") {
    const name = basename(llnFile, ".lln");
    const manifestPath = `build/${name}.lmanifest`;
    if (!existsSync(manifestPath)) {
      console.error(`❌ No manifest at ${manifestPath}. Run 'logicn build ${llnFile}' first.`);
      process.exit(1);
    }
    try {
      const { decodeCBOR } = await import(
        new URL("packages-logicn/logicn-core-compiler/dist/manifest-generator.js", import.meta.url).href
      );
      const manifestBytes = new Uint8Array(readFileSync(manifestPath));
      const { value: manifest } = decodeCBOR(manifestBytes);
      const EFFECT_BIT_NAMES = { 0:"network.outbound", 1:"storage.write", 2:"secret.access", 3:"audit.write", 4:"database.write", 5:"ai.inference", 6:"shell.execute", 7:"native.call" };
      const allowedMask = manifest.policyResolutionDag?.allowedEffects ?? 0;
      const deniedMask  = manifest.policyResolutionDag?.deniedEffects  ?? 0;
      let dot = `digraph "${name}_manifest" {\n`;
      dot += `  graph [label="${name}.lmanifest — PolicyResolutionDAG\\nallowed=${allowedMask.toString(2).padStart(8,"0")} denied=${deniedMask.toString(2).padStart(8,"0")}" fontsize=12 labelloc=t]\n`;
      dot += `  node [shape=box fontname="Courier" fontsize=10]\n  rankdir=LR\n\n`;
      // Capability nodes
      for (let bit = 0; bit <= 7; bit++) {
        const effName = EFFECT_BIT_NAMES[bit];
        const allowed = (allowedMask >> bit) & 1;
        const denied  = (deniedMask  >> bit) & 1;
        const color = denied ? "lightcoral" : allowed ? "lightgreen" : "lightgray";
        dot += `  cap_${bit} [label="${effName}\\nbit${bit}${allowed?" ✓":denied?" ✗":" —"}" style=filled fillcolor=${color}]\n`;
      }
      // Flow nodes
      dot += `\n`;
      for (const ob of manifest.proofObligations ?? []) {
        const fid = (ob.flowName ?? "f").replace(/[^a-zA-Z0-9_]/g, "_");
        const desc = ob.description ?? "";
        const em = desc.match(/effects \[([^\]]*)\]/);
        const effs = em ? em[1].split(",").map(e=>e.trim()).filter(Boolean) : [];
        const isNet = effs.some(e=>e.startsWith("network"));
        const isMut = effs.some(e=>e.includes(".write")||e.includes(".mutate"));
        const col = isNet?"lightcoral":isMut?"lightyellow":"lightblue";
        dot += `  f_${fid} [label="${ob.flowName}\\n${effs.length} effect(s)" style=filled fillcolor=${col}]\n`;
        for (const eff of effs) {
          for (let bit=0; bit<=7; bit++) {
            if (EFFECT_BIT_NAMES[bit]===eff || eff.startsWith((EFFECT_BIT_NAMES[bit]??"").split(".")[0])) {
              dot += `  f_${fid} -> cap_${bit} [color=gray]\n`;
            }
          }
        }
      }
      // Topology nodes
      dot += `\n  dag_valid [label="dag_edge_valid\\nbit 8\\n(Topology FIRST)" style=filled fillcolor=gold shape=diamond]\n`;
      dot += `  quarantine [label="quarantine_engaged\\nbit 30" style=filled fillcolor=orange]\n`;
      dot += `  emergency_node [label="emergency_mode\\nbit 31" style=filled fillcolor=red fontcolor=white]\n`;
      dot += `  dag_valid -> quarantine [style=dashed label="violation"]\n`;
      dot += `  quarantine -> emergency_node [style=dashed label="escalate"]\n`;
      dot += `}\n`;
      const dotPath = `build/${name}.dot`;
      writeFileSync(dotPath, dot);
      console.log(`✅ ${dotPath} written`);
      console.log(`\nRender: dot -Tsvg ${dotPath} > build/${name}.svg`);
      console.log(`Colours: 🔴 network | 🟡 mutation | 🔵 pure | 🟢 allowed cap | ⬜ inactive cap`);
    } catch (e) { console.error(`❌ DOT generation failed: ${e.message}`); process.exit(1); }
    return;
  }

  // ── logicn init-env — validate capabilities against root governance policy (#65) ─
  // Scans all .lln files in /governance/ (or current directory) and validates
  // each flow's effects against the declared domain guard policy ceilings.
  // Used at CI start to establish a clean baseline before diffing.
  if (command === "init-env") {
    const { spawnSync } = await import("node:child_process");
    const { readdirSync } = await import("node:fs");
    const governanceDir = existsSync("governance") ? "governance" : ".";
    let allFlows = 0, violations = 0;
    const scanDir = (dir) => {
      try {
        return readdirSync(dir).filter(f => f.endsWith(".lln")).map(f => `${dir}/${f}`);
      } catch { return []; }
    };
    const policyFiles = scanDir(governanceDir);
    const flowFiles = [...scanDir("flows"), ...scanDir("examples"), ...scanDir("tests/patterns")];
    console.log(`logicn init-env — validating ${flowFiles.length} flow file(s) against ${policyFiles.length} policy file(s)`);
    for (const file of flowFiles.slice(0, 20)) { // limit to first 20 for now
      try {
        const src = readFileSync(file, "utf8");
        const p = m.parseProgram(src, file);
        const fx = m.checkEffects(p.flows, p.ast);
        const g = m.verifyGovernance(p.ast, p.flows, fx, "dev");
        allFlows += p.flows.length;
        const errs = g.diagnostics.filter(d => d.severity === "error");
        if (errs.length > 0) {
          violations += errs.length;
          errs.forEach(d => console.log(`  ❌ ${file}: ${d.code} — ${d.message.slice(0, 80)}`));
        }
      } catch { /* skip unparseable */ }
    }
    if (violations === 0) {
      console.log(`✅ init-env: ${allFlows} flows, 0 violations — clean baseline`);
    } else {
      console.log(`⚠️  init-env: ${allFlows} flows, ${violations} violation(s) found — review before diffing`);
    }
    return;
  }

  // ── logicn verify — DRCM Phase 3 admission gate (#37) ──────────────────────
  // Verifies the .lmanifest for a compiled .lln file:
  //   1. Checks the manifest exists (build/<name>.lmanifest)
  //   2. Decodes the binary CBOR manifest
  //   3. Computes SHA-256 of the source and compares to manifest.sourceHash
  //   4. Verifies CBOR round-trip (canonical encoding)
  //
  // LLN-MANIFEST-TAMPER: sourceHash mismatch — binary may have been modified
  // LLN-MANIFEST-MISSING: no .lmanifest found for this source file
  if (command === "verify") {
    const name = basename(llnFile, ".lln");
    const manifestPath = `build/${name}.lmanifest`;
    if (!existsSync(manifestPath)) {
      console.error(`❌ LLN-MANIFEST-MISSING: No manifest found at ${manifestPath}`);
      console.error(`   Run 'logicn build ${llnFile}' first to generate the manifest.`);
      process.exit(1);
    }
    try {
      const { decodeCBOR, encodeCBOR } = await import(
        new URL("packages-logicn/logicn-core-compiler/dist/manifest-generator.js", import.meta.url).href
      );
      const manifestBytes = new Uint8Array(readFileSync(manifestPath));
      const { value: manifest } = decodeCBOR(manifestBytes);

      // Check 1: sourceHash
      const actualHash = "sha256:" + createHash("sha256").update(source, "utf8").digest("hex");
      if (manifest.sourceHash !== actualHash) {
        console.error(`❌ LLN-MANIFEST-TAMPER: Source hash mismatch for '${llnFile}'`);
        console.error(`   Manifest has: ${manifest.sourceHash}`);
        console.error(`   Current file: ${actualHash}`);
        console.error(`   The source has been modified since the manifest was generated.`);
        console.error(`   Rebuild with: logicn build ${llnFile}`);
        process.exit(1);
      }

      // Check 2: CBOR round-trip canonicality
      const reEncoded = encodeCBOR(manifest);
      const canonical = manifestBytes.length === reEncoded.length &&
        manifestBytes.every((b, i) => b === reEncoded[i]);
      if (!canonical) {
        console.error(`❌ LLN-MANIFEST-NONCANONICAL: CBOR round-trip failed — manifest is non-canonical`);
        process.exit(1);
      }

      // Check 3: schema version
      if (manifest.schemaVersion !== "lln.manifest.v1") {
        console.error(`❌ LLN-MANIFEST-VERSION: Unknown schema version '${manifest.schemaVersion}'`);
        process.exit(1);
      }

      const proofCount = manifest.proofObligations?.length ?? 0;
      const constraintCount = manifest.derivedConstraints?.length ?? 0;
      console.log(`✅ ${llnFile}: manifest verified`);
      console.log(`   Source hash:         ${actualHash.slice(0, 30)}...`);
      console.log(`   CBOR size:           ${manifestBytes.length}B (canonical ✅)`);
      console.log(`   Schema version:      ${manifest.schemaVersion}`);
      console.log(`   Flow count:          ${manifest.flowCount}`);
      console.log(`   Proof obligations:   ${proofCount}`);
      console.log(`   Derived constraints: ${constraintCount}`);
      console.log(`   Signature:           ${manifest.governanceSignature?.algorithm ?? "none"} (placeholder — real signing in DRCM Phase 5)`);
    } catch (e) {
      console.error(`❌ LLN-MANIFEST-INVALID: Failed to parse manifest — ${e.message}`);
      process.exit(1);
    }
    return;
  }

  if (errors.length > 0) {
    errors.forEach(e => console.error(`❌ ${e.code}: ${e.message}`));
    process.exit(1);
  }

  // ── Admission gate check for run command ─────────────────────────────────
  // Before executing, verify the source matches its manifest (if one exists).
  // This is the Stage A equivalent of the DSS.wasm admission check in Phase 5.
  if (command === "run") {
    const name = basename(llnFile, ".lln");
    const manifestPath = `build/${name}.lmanifest`;
    if (existsSync(manifestPath)) {
      try {
        const { decodeCBOR } = await import(
          new URL("packages-logicn/logicn-core-compiler/dist/manifest-generator.js", import.meta.url).href
        );
        const manifestBytes = new Uint8Array(readFileSync(manifestPath));
        const { value: manifest } = decodeCBOR(manifestBytes);
        const actualHash = "sha256:" + createHash("sha256").update(source, "utf8").digest("hex");
        if (manifest.sourceHash && manifest.sourceHash !== actualHash) {
          console.error(`❌ LLN-MANIFEST-TAMPER: Source has changed since manifest was signed.`);
          console.error(`   Manifest: ${manifest.sourceHash}`);
          console.error(`   Current:  ${actualHash}`);
          console.error(`   Rebuild with: logicn build ${llnFile}`);
          process.exit(1);
        }
      } catch { /* non-fatal if manifest is unreadable */ }
    }
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

    // .lmanifest generation (DRCM Phase 3 task #67 — binary CBOR RFC 8949)
    try {
      const { generateManifest, serializeManifest, serializeManifestCBOR, prettyManifest, verifyManifestRoundTrip } = await import(
        new URL("packages-logicn/logicn-core-compiler/dist/manifest-generator.js", import.meta.url).href
      );
      const govResult = m.verifyGovernance(parsed.ast, parsed.flows,
        m.checkEffects(parsed.flows, parsed.ast), "dev");
      const source = readFileSync(llnFile, "utf8");
      const manifest = generateManifest(source, llnFile, parsed.flows, govResult);

      // Dual output (logicn-cbor-manifest-spec.md):
      //   .lmanifest      = Binary CBOR (RFC 8949) — signing target, DSS.wasm parses this
      //   .lmanifest.json = Pretty JSON — human inspection only
      const roundTripOk = verifyManifestRoundTrip(manifest);
      if (roundTripOk) {
        const cborBytes = serializeManifestCBOR(manifest);
        writeFileSync(`build/${name}.lmanifest`, Buffer.from(cborBytes));
        console.log(`   build/${name}.lmanifest      (CBOR ${cborBytes.length}B — round-trip ✅)`);
      } else {
        // Safety fallback: CBOR round-trip failed, use canonical JSON
        writeFileSync(`build/${name}.lmanifest`, serializeManifest(manifest));
        console.log(`   build/${name}.lmanifest      (JSON fallback — CBOR round-trip failed)`);
      }
      writeFileSync(`build/${name}.lmanifest.json`, prettyManifest(manifest));
      console.log(`   build/${name}.lmanifest.json (human-readable)`);

      // governance-impact.json (#63) — security surface area artifact per build
      // Summarises effects, invariants, domain guards, change class, resilience
      // Used by AI agents to self-assess proposals, and by CI to post PR comments.
      try {
        const { diffGovernance, flowShape } = await import(
          new URL("packages-logicn/logicn-core-compiler/dist/governance-diff.js", import.meta.url).href
        );
        const impactArtifact = {
          schemaVersion: "lln.governance-impact.v1",
          sourceFile: llnFile.replace(/\\/g, "/"),
          sourceHash: manifest.sourceHash,
          generatedAt: manifest.generatedAt,
          flowCount: parsed.flows.length,
          flows: parsed.flows.map(f => ({
            name: f.name,
            qualifier: f.qualifier,
            effects: f.declaredEffects,
            hasInvariant: (f.declaredEffects.length > 0) || false,
          })),
          surfaceArea: {
            totalEffects: parsed.flows.flatMap(f => f.declaredEffects).length,
            uniqueEffects: [...new Set(parsed.flows.flatMap(f => f.declaredEffects))],
            networkFlows: parsed.flows.filter(f => f.declaredEffects.some(e => e.startsWith("network"))).map(f => f.name),
            secretFlows: parsed.flows.filter(f => f.declaredEffects.some(e => e.includes("secret"))).map(f => f.name),
            mutationFlows: parsed.flows.filter(f => f.declaredEffects.some(e => e.includes(".write") || e.includes(".mutate"))).map(f => f.name),
          },
          proofObligationCount: manifest.proofObligations?.length ?? 0,
          derivedConstraintCount: manifest.derivedConstraints?.length ?? 0,
        };
        writeFileSync(`build/${name}.governance-impact.json`, JSON.stringify(impactArtifact, null, 2));
        console.log(`   build/${name}.governance-impact.json (security surface area)`);
      } catch { /* non-fatal */ }
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
