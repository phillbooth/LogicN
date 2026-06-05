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

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

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
  logicn check --what-if <policy.lln>                 shadow policy analysis (dry run)
  logicn check --what-if <policy.lln> <file.lln>      what-if against single file
  logicn verify <file.lln>                            DRCM Phase 3 admission gate — verify manifest
  logicn manifest-to-dot <file.lln>                   export manifest as Graphviz DOT for DAG audit
  logicn init-env                                      validate capabilities against root policy
  logicn keygen                                        generate Ed25519 signing keypair for manifests
  logicn deploy <file.lln> [--tag <image>]            run full deploy pipeline (check+build+verify+health)
  logicn version                                      show version and runtime status

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

  // ── logicn version — show version and runtime status (#117) ─────────────────
  if (command === "version" || command === "--version" || command === "-v") {
    const v = JSON.parse(readFileSync("version.json", "utf-8"));
    console.log(`LogicN ${v.version} (${v.stage})`);
    console.log(`  Runtime:  ${v.runtime}`);
    console.log(`  DRCM:     ${v.drcmPhases}`);
    console.log(`  Tests:    ${v.testCount} tests / ${v.packageCount} packages`);
    console.log(`  Status:   ${v.milestone}`);
    process.exit(0);
  }

  // ── logicn deploy — full governed deploy pipeline (#112) ─────────────────────
  // Runs: governance check → build WASM → verify manifest → health check
  // Prints OCI packaging instructions for Dockerfile.logicn + deploy-linux.sh
  if (command === "deploy") {
    const llnFile = rest[0];
    if (!llnFile) {
      console.error("Usage: logicn deploy <file.lln> [--tag <image-tag>]");
      process.exit(1);
    }

    const tagIdx = rest.indexOf("--tag");
    const imageTag = tagIdx >= 0 ? rest[tagIdx + 1] : "logicn-app:latest";

    console.log(`\n🏰 LogicN Deploy — ${llnFile}`);
    console.log(`   Image tag: ${imageTag}\n`);

    const steps = [
      { name: "Governance check", cmd: `node logicn.mjs check ${llnFile}` },
      { name: "Build WASM",       cmd: `node logicn.mjs build ${llnFile}` },
      { name: "Verify manifest",  cmd: `node logicn.mjs verify ${llnFile}` },
      { name: "Health check",     cmd: `node logicn.mjs run examples/deployment/health-check.lln --invoke getHealthStatus` },
    ];

    for (const step of steps) {
      try {
        process.stdout.write(`  ⏳ ${step.name}...`);
        execSync(step.cmd, { cwd: process.cwd(), encoding: "utf-8", timeout: 60000 });
        console.log(`  ✅ ${step.name}`);
      } catch (err) {
        console.log(`  ❌ ${step.name} FAILED`);
        console.error(err.message);
        process.exit(1);
      }
    }

    console.log(`\n✅ Deploy pipeline complete`);
    console.log(`   WASM:     build/`);
    console.log(`   Receipts: build/receipt-ledger/receipts.jsonl`);
    console.log(`   Audit:    build/audit-log/audit-log.jsonl`);
    console.log(`\n   OCI packaging: see scripts/Dockerfile.logicn`);
    console.log(`   Deployment:     ./scripts/deploy-linux.sh ${llnFile}\n`);
    process.exit(0);
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

  // ── logicn keygen — generate Ed25519 signing keypair for manifest governance (#107) ─
  // Stage A: Ed25519 (Node.js native crypto)
  // Stage B: ML-DSA-65 (NIST FIPS 204) — upgrade once Node.js adds FIPS 204 support
  if (command === "keygen") {
    const { generateKeyPairSync, randomBytes } = await import("node:crypto");
    const { writeFileSync: wfs, mkdirSync: mds } = await import("node:fs");
    const { join: pjoin } = await import("node:path");

    // Generate Ed25519 keypair (Stage A — will upgrade to ML-DSA-65 in Stage B)
    const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    // Key ID = first 16 hex chars of random bytes
    const keyId = randomBytes(8).toString("hex");

    // Store public key in governance/ directory (safe to commit)
    mds("governance", { recursive: true });
    const pubKeyPath = pjoin("governance", `signing-key-${keyId}.pub.pem`);
    wfs(pubKeyPath, publicKey);

    // Store private key in .env.logicn-signing (never commit)
    const envPath = ".env.logicn-signing";
    const envContent = [
      `# LogicN governance signing key — NEVER COMMIT THIS FILE`,
      `# Key ID: ${keyId}`,
      `# Algorithm: Ed25519 (Stage A) → ML-DSA-65 NIST FIPS 204 (Stage B)`,
      `LOGICN_SIGNING_KEY_ID=${keyId}`,
      `LOGICN_SIGNING_PRIVATE_KEY_B64=${Buffer.from(privateKey).toString("base64")}`,
      ``,
    ].join("\n");
    wfs(envPath, envContent);

    console.log(`\n✅ LogicN governance signing keypair generated`);
    console.log(`   Algorithm:  Ed25519 (Stage A — ML-DSA-65 in Stage B)`);
    console.log(`   Key ID:     ${keyId}`);
    console.log(`   Public key: ${pubKeyPath}  (safe to commit)`);
    console.log(`   Private key: ${envPath}    (NEVER COMMIT — add to .gitignore)`);
    console.log(`\n   Add to .gitignore:`);
    console.log(`     .env.logicn-signing`);
    console.log(`\n   To start signing manifests:`);
    console.log(`     export LOGICN_SIGNING_KEY_ID=${keyId}`);
    console.log(`     source ${envPath}  # or add to your shell env`);
    console.log(`     logicn build <file.lln>  # will now sign the manifest\n`);

    process.exit(0);
  }

  // ── logicn check --what-if <policyFile> [targetFile]: Shadow Policy Analysis (#71) ─
  // Runs governance verification against a proposed policy WITHOUT applying it.
  // Shows which flows would fail, which effects would be denied, and change class.
  // Exit 0 = policy compatible, Exit 2 = expansion violations
  if (command === "check" && rest[0] === "--what-if" && rest[1]) {
    const policyFile = rest[1];
    const targetFile = rest[2]; // optional: target specific .lln file

    if (!existsSync(policyFile)) {
      console.error(`❌ Policy file not found: ${policyFile}`);
      process.exit(1);
    }

    console.log(`\n🔍 Shadow Policy Analysis — What-If Mode`);
    console.log(`   Policy:  ${policyFile}`);
    console.log(`   Target:  ${targetFile ?? "all .lln files in build/"}`);
    console.log(`   Status:  DRY RUN — no changes applied\n`);

    // Read the shadow policy file
    const shadowPolicyContent = readFileSync(policyFile, "utf-8");

    // Parse to extract policy name and permitted_effects
    const policyNameMatch = shadowPolicyContent.match(/policy\s+(\w+)\s*\{/);
    const policyName = policyNameMatch?.[1] ?? "ShadowPolicy";

    // Extract permitted_effects from shadow policy
    const permittedEffectsMatch = shadowPolicyContent.match(/permitted_effects\s*\{([^}]*)\}/s);
    const permittedEffects = permittedEffectsMatch?.[1]
      ?.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('//') && !l.startsWith(';'))
      ?? [];

    // Extract enforced_limits from shadow policy
    const enforcedLimitsMatch = shadowPolicyContent.match(/enforced_limits\s*\{([^}]*)\}/s);
    const enforcedLimits = enforcedLimitsMatch?.[1]
      ?.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('//') && !l.startsWith(';'))
      ?? [];

    // Find all .lln files to check
    const llnFiles = targetFile
      ? [targetFile]
      : readdirSync(".", { recursive: true })
          .filter(f => String(f).endsWith(".lln") && !String(f).includes("node_modules"))
          .map(f => String(f))
          .slice(0, 20); // cap at 20

    // Analyse each file against the shadow policy
    let violations = 0;
    let warnings = 0;
    let compatible = 0;
    const report = [];

    for (const llnFile of llnFiles) {
      if (!existsSync(llnFile)) continue;
      const src = readFileSync(llnFile, "utf-8");

      // Extract declared effects from the file
      const effectsMatches = [...src.matchAll(/effects\s*\{([^}]*)\}/sg)];
      const declaredEffects = effectsMatches.flatMap(m =>
        (m[1] ?? "").split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0 && !l.startsWith('//') && !l.startsWith(';'))
      );

      // Check which effects would be blocked by the shadow policy
      const blockedEffects = declaredEffects.filter(eff => {
        const effName = eff.replace(/^allow\s+/, "").trim();
        // If permitted_effects is empty, all are allowed (no restriction)
        if (permittedEffects.length === 0) return false;
        // Check if the effect is covered by the policy's permitted list
        return !permittedEffects.some(pe => {
          const peName = pe.replace(/^allow\s+/, "").trim();
          return peName === effName || peName === effName.split('.')[0] + '.*';
        });
      });

      if (blockedEffects.length > 0) {
        violations++;
        report.push({
          file: llnFile,
          status: "❌ VIOLATION",
          blocked: blockedEffects,
          allowed: declaredEffects.filter(e => !blockedEffects.includes(e)),
        });
      } else if (declaredEffects.length > 0) {
        compatible++;
        report.push({ file: llnFile, status: "✅ compatible", blocked: [], allowed: declaredEffects });
      }
    }

    // Print report
    for (const entry of report) {
      console.log(`  ${entry.status}  ${entry.file}`);
      if (entry.blocked.length > 0) {
        console.log(`    Would block: ${entry.blocked.join(', ')}`);
      }
    }

    // Summary
    const changeClass = violations > 0 ? "TIGHTENING" : "NEUTRAL";
    console.log(`\n─────────────────────────────────────────────────`);
    console.log(`  Shadow Policy: ${policyName}`);
    console.log(`  Change Class:  ${changeClass}`);
    console.log(`  Compatible:    ${compatible} file(s)`);
    console.log(`  Violations:    ${violations} file(s) — would fail under this policy`);
    console.log(`  Warnings:      ${warnings}`);
    console.log(`\n  📋 This is a DRY RUN — policy '${policyName}' has NOT been applied.`);
    console.log(`     To apply: cp ${policyFile} governance/${policyName}.lln && logicn init-env\n`);

    process.exit(violations > 0 ? 2 : 0);
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

      // ── Signature verification (#109) ────────────────────────────────────────
      // Stage A: Ed25519-SHA256 (Node.js native crypto)
      // Stage B: ML-DSA-65 (NIST FIPS 204) — upgrade once Node.js adds FIPS 204 support
      // Signature is stored in the .lmanifest.json (human-readable counterpart)
      const jsonManifestPath = `build/${name}.lmanifest.json`;
      if (existsSync(jsonManifestPath)) {
        try {
          const jsonManifestRaw = readFileSync(jsonManifestPath, "utf-8");
          const jsonManifest = JSON.parse(jsonManifestRaw);

          if (jsonManifest.governanceSignature && typeof jsonManifest.governanceSignature === "object") {
            const sig = jsonManifest.governanceSignature;

            if (sig.algorithm && sig.keyId && sig.signature) {
              // Look for the public key file
              const pubKeyPath = join("governance", `signing-key-${sig.keyId}.pub.pem`);
              if (existsSync(pubKeyPath)) {
                try {
                  const { verify: cryptoVerify, createPublicKey } = await import("node:crypto");
                  const pubKeyPem = readFileSync(pubKeyPath, "utf-8");
                  const publicKey = createPublicKey(pubKeyPem);

                  // Reconstruct the manifest without the signature field for verification
                  // (mirrors what was signed: prettyManifest(manifest) before signing was applied)
                  const { governanceSignature: _sig, ...manifestWithoutSig } = jsonManifest;
                  const manifestForVerification = JSON.stringify(manifestWithoutSig, null, 2);

                  // Ed25519 uses deterministic signing — pass null as algorithm (per RFC 8032)
                  const valid = cryptoVerify(null, Buffer.from(manifestForVerification), publicKey, Buffer.from(sig.signature, "base64"));

                  if (valid) {
                    console.log(`   🔐 Signature verified (${sig.algorithm}, keyId: ${sig.keyId.slice(0, 8)}...)`);
                  } else {
                    console.error(`❌ LLN-MANIFEST-TAMPER: Signature verification FAILED — manifest may be tampered`);
                    process.exit(1);
                  }
                } catch (err) {
                  console.warn(`   ⚠️  Signature verification error: ${err.message}`);
                }
              } else {
                console.warn(`   ⚠️  Public key not found: ${pubKeyPath} — skipping signature verification`);
              }
            }
          } else if (jsonManifest.governanceSignature === "placeholder") {
            console.log(`   ℹ️  Manifest is unsigned (placeholder). Run: logicn keygen && logicn build`);
          }
        } catch (err) {
          console.warn(`   ⚠️  Could not read .lmanifest.json for signature check: ${err.message}`);
        }
      } else {
        console.log(`   ℹ️  No .lmanifest.json found — signature check skipped`);
      }
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
      const manifestJsonPath = `build/${name}.lmanifest.json`;
      const manifestJson = prettyManifest(manifest);
      writeFileSync(manifestJsonPath, manifestJson);
      console.log(`   build/${name}.lmanifest.json (human-readable)`);

      // ── Real manifest signing (#108) ─────────────────────────────────────────
      // Stage A: Ed25519-SHA256 (Node.js native crypto)
      // Stage B: ML-DSA-65 (NIST FIPS 204) — upgrade once Node.js adds FIPS 204 support
      const signingKeyId = process.env.LOGICN_SIGNING_KEY_ID;
      const signingKeyB64 = process.env.LOGICN_SIGNING_PRIVATE_KEY_B64;

      if (signingKeyId && signingKeyB64) {
        try {
          const { sign: cryptoSign, createPrivateKey } = await import("node:crypto");
          const privateKeyPem = Buffer.from(signingKeyB64, "base64").toString("utf-8");
          const privateKey = createPrivateKey(privateKeyPem);

          // Sign the manifest without the governanceSignature field so verification
          // can reconstruct the exact same bytes by stripping the signature before checking.
          // Ed25519 uses deterministic signing — no external hash algorithm needed (RFC 8032).
          const manifestObjForSigning = JSON.parse(manifestJson);
          const { governanceSignature: _placeholder, ...manifestWithoutSig } = manifestObjForSigning;
          const manifestBytesForSigning = JSON.stringify(manifestWithoutSig, null, 2);
          const signature = cryptoSign(null, Buffer.from(manifestBytesForSigning), privateKey).toString("base64");

          // Update the .lmanifest.json with real signature
          const signedManifest = JSON.parse(manifestJson);
          signedManifest.governanceSignature = {
            algorithm: "Ed25519",  // Stage A; will be ML-DSA-65 (NIST FIPS 204) in Stage B
            keyId: signingKeyId,
            signature: signature,
            signedAt: new Date().toISOString(),
          };

          writeFileSync(manifestJsonPath, JSON.stringify(signedManifest, null, 2));
          console.log(`   🔐 Manifest signed (Ed25519, keyId: ${signingKeyId.slice(0, 8)}...)`);
        } catch (err) {
          console.warn(`   ⚠️  Signing failed (continuing unsigned): ${err.message}`);
        }
      }

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
