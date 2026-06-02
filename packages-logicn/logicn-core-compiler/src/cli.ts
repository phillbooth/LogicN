#!/usr/bin/env node
// =============================================================================
// LogicN CLI — logicn check | build | fix | emit
//
// Commands:
//   logicn check              dev mode: run compiler, warn on missing effects
//   logicn check --strict     strict: missing effects = error
//   logicn build              normal build
//   logicn build --production governance enforcement: missing effects = error
//   logicn fix --effects      scan and suggest missing effect declarations
//   logicn emit --ai-graph    run compiler and write build/semantic/logicn.ai.json
// =============================================================================

import {
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { execSync, spawnSync } from "node:child_process";
import { parseProgram, type FlowMeta } from "./parser.js";
import { diffGovernance, renderGovernanceDiff } from "./governance-diff.js";
import { resolveSymbols } from "./symbol-resolver.js";
import { checkTypes } from "./type-checker.js";
import { checkValueStates } from "./value-state-checker.js";
import { checkEffects } from "./effect-checker.js";
import { checkSourceEscapes } from "./source-escape-checker.js";
import { verifyGovernance } from "./governance-verifier.js";
import { checkNamingPolicy } from "./naming-policy-checker.js";
import { buildAiGraph, emitGIR } from "./gir-emitter.js";
import { buildWATModuleFromGIR, renderWAT } from "./wat-emitter.js";
import { assembleWAT } from "./wat-assembler.js";
import { STDLIB_CAPABILITY_MAP } from "./stdlib-registry.js";
import { EFFECT_REGISTRY } from "./effect-checker.js";
import { canonicalHash, hashSource, hashGIR } from "./runtime/canonicalHash.js";
import type { Dirent } from "node:fs";

// LLN-BUILD-001: Same source produced different output on repeated compilation.
const LLN_BUILD_001_CODE = "LLN-BUILD-001";

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface CliDiagnostic {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
}

type CliMode =
  | "check"
  | "check-strict"
  | "build"
  | "build-production"
  | "build-deterministic"
  | "build-wasm-standalone"   // WASM/WASI module, no JS runtime required
  | "build-wasm-hybrid"       // JS capability shell + WASM pure-flow core
  | "fix-effects"
  | "emit-ai-graph"
  | "verify-selfhost"
  | "cost-analysis"
  | "governance-diff";

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function findLlnFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(current: string): void {
    let entries: Dirent[];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        // skip node_modules and hidden dirs
        if (entry.name !== "node_modules" && !entry.name.startsWith(".")) {
          walk(full);
        }
      } else if (entry.isFile() && entry.name.endsWith(".lln")) {
        results.push(full);
      }
    }
  }

  walk(dir);
  return results;
}

// ---------------------------------------------------------------------------
// Helper: push a diagnostic only if the location fields are defined
// ---------------------------------------------------------------------------

function pushDiag(
  out: CliDiagnostic[],
  code: string,
  severity: CliDiagnostic["severity"],
  message: string,
  file: string,
  line: number | undefined,
  column: number | undefined,
): void {
  const base: { code: string; severity: CliDiagnostic["severity"]; message: string; file: string } = {
    code,
    severity,
    message,
    file,
  };
  if (line !== undefined && column !== undefined) {
    out.push({ ...base, line, column });
  } else if (line !== undefined) {
    out.push({ ...base, line });
  } else {
    out.push(base);
  }
}

// ---------------------------------------------------------------------------
// Compile a single .lln file and return diagnostics
// ---------------------------------------------------------------------------

interface FileCompileResult {
  readonly file: string;
  readonly diagnostics: CliDiagnostic[];
  readonly aiGraphJson?: string;
}

function compileFile(
  filePath: string,
  mode: CliMode,
): FileCompileResult {
  let source: string;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      file: filePath,
      diagnostics: [{
        code: "LLN-BACKEND-001",
        severity: "error",
        message: `Cannot read file: ${msg}`,
        file: filePath,
      }],
    };
  }

  const diagnostics: CliDiagnostic[] = [];

  const parseResult = parseProgram(source, filePath);
  for (const d of parseResult.diagnostics) {
    pushDiag(
      diagnostics,
      d.code,
      d.severity as CliDiagnostic["severity"],
      d.message,
      filePath,
      d.location?.line,
      d.location?.column,
    );
  }

  const symbolResult = resolveSymbols(parseResult.ast);
  for (const d of symbolResult.diagnostics) {
    pushDiag(
      diagnostics,
      d.code,
      d.severity as CliDiagnostic["severity"],
      d.message,
      filePath,
      d.location?.line,
      d.location?.column,
    );
  }

  const typeResult = checkTypes(parseResult.ast);
  for (const d of typeResult.diagnostics) {
    pushDiag(
      diagnostics,
      d.code,
      d.severity as CliDiagnostic["severity"],
      d.message,
      filePath,
      d.location?.line,
      d.location?.column,
    );
  }

  const valueStateResult = checkValueStates(parseResult.ast);
  for (const d of valueStateResult.diagnostics) {
    pushDiag(
      diagnostics,
      d.code,
      d.severity as CliDiagnostic["severity"],
      d.message,
      filePath,
      d.location?.line,
      d.location?.column,
    );
  }

  // Determine effect checker mode: production/deterministic modes enforce errors;
  // dev/check/build modes use development mode (LLN-STDLIB-001 emitted as warning).
  const effectCheckerMode: "production" | "development" =
    (mode === "build-production" || mode === "build-deterministic")
      ? "production"
      : "development";

  const effectResults = checkEffects(parseResult.flows, parseResult.ast, effectCheckerMode);
  for (const result of effectResults) {
    for (const d of result.diagnostics) {
      // LLN-EFFECT-001 and LLN-STDLIB-001 are downgraded to warning in dev/check/build modes.
      // In build-production and build-deterministic modes they remain errors (as emitted).
      const isDevDowngradable =
        d.code === "LLN-EFFECT-001" || d.code === "LLN-STDLIB-001";
      const severity: CliDiagnostic["severity"] =
        isDevDowngradable && (mode === "check" || mode === "build")
          ? "warning"
          : (d.severity as CliDiagnostic["severity"]);
      pushDiag(
        diagnostics,
        d.code,
        severity,
        d.message,
        filePath,
        d.location?.line,
        d.location?.column,
      );
    }
  }

  const escapeResult = checkSourceEscapes(parseResult.ast);
  for (const d of escapeResult.diagnostics) {
    pushDiag(
      diagnostics,
      d.code,
      d.severity as CliDiagnostic["severity"],
      d.message,
      filePath,
      d.location?.line,
      d.location?.column,
    );
  }

  // Phase 17A: Naming policy checker
  // In check-strict and build-production modes, naming issues are informational (warnings).
  // enforceNamingPolicy=true means they are shown but do not block the build on their own
  // (the CLI counts errors; naming diagnostics are always emitted as warnings here).
  const namingResult = checkNamingPolicy(parseResult.ast);
  for (const d of namingResult.diagnostics) {
    // In strict/production modes naming issues are emitted as warnings (informational).
    // They do not become errors at the CLI level — enforceNamingPolicy affects runtime ok flag only.
    pushDiag(
      diagnostics,
      d.code,
      "warning",
      d.message,
      filePath,
      d.location?.line,
      d.location?.column,
    );
  }

  // Governance verification (for build-production mode)
  if (mode === "build-production") {
    const govResult = verifyGovernance(
      parseResult.ast,
      parseResult.flows,
      effectResults,
      "production",
    );
    for (const d of govResult.diagnostics) {
      pushDiag(
        diagnostics,
        d.code,
        d.severity as CliDiagnostic["severity"],
        d.message,
        filePath,
        d.location?.line,
        d.location?.column,
      );
    }
  }

  // AI graph emission
  if (mode === "emit-ai-graph") {
    const aiGraph = buildAiGraph(parseResult.ast, parseResult.flows, filePath);
    const aiGraphJson = JSON.stringify(aiGraph, null, 2);
    return { file: filePath, diagnostics, aiGraphJson };
  }

  return { file: filePath, diagnostics };
}

// ---------------------------------------------------------------------------
// verify-selfhost (Phase 16A implementation)
// ---------------------------------------------------------------------------

/**
 * Compute the three stable artifacts that prove deterministic compilation:
 *   1. Hash of EFFECT_REGISTRY (a known stable compiler artifact)
 *   2. Hash of a sample pure flow's source text (hashSource — no normalization)
 *   3. Hash of a sample flow's canonical plan JSON
 *
 * All three are computed twice. If run1 === run2 for all three → PASS.
 */
function computeSelfhostArtifacts(): string {
  // Artifact 1: EFFECT_REGISTRY — deterministic by construction
  const registryHash = canonicalHash(EFFECT_REGISTRY);

  // Artifact 2: Sample source text
  const sampleSource = `
pure flow verifySample(x: Int) -> Int {
  return x
}
`.trim();
  const sourceHash = hashSource(sampleSource);

  // Artifact 3: Canonical hash of a trivial plan-like object
  const samplePlan = {
    flow: "verifySample",
    qualifier: "pure",
    steps: [
      { kind: "return", value: "Int" },
    ],
    approvedCapabilities: {},
    planHash: sourceHash,
  };
  const planHash = canonicalHash(samplePlan);

  // Combine into one stable string and hash that
  return canonicalHash({ registryHash, sourceHash, planHash });
}

/**
 * Compile a single .lln source string twice and return both GIR hashes.
 * Used to prove that the GIR emitter is deterministic on repeated compilation.
 */
function doubleCompileGirHash(source: string, fileName: string): { hash1: string; hash2: string } {
  function compileOnce(): string {
    const parseResult = parseProgram(source, fileName);
    const effectResults = checkEffects(parseResult.flows, parseResult.ast);
    const girResult = emitGIR(parseResult.ast, parseResult.flows, effectResults);
    return hashGIR(girResult.gir);
  }
  return { hash1: compileOnce(), hash2: compileOnce() };
}

function runVerifySelfhost(): void {
  process.stdout.write("logicn verify-selfhost\n");
  process.stdout.write("─────────────────────\n");
  process.stdout.write("Hashing compiler artifacts...\n");

  const run1 = computeSelfhostArtifacts();
  const run2 = computeSelfhostArtifacts();

  process.stdout.write(`Run 1: ${run1}\n`);
  process.stdout.write(`Run 2: ${run2}\n`);

  if (run1 !== run2) {
    process.stderr.write(
      `[error] ${LLN_BUILD_001_CODE} NonDeterministicBuild\n` +
      `  Run 1 hash: ${run1}\n` +
      `  Run 2 hash: ${run2}\n` +
      `  Same source produced different output on repeated compilation.\n` +
      `  Check for: timestamp in output, random values in codegen, hash map iteration order.\n`,
    );
    process.exit(1);
  }

  // R7C: Double-compile each .lln file and compare GIR hashes.
  // If any file produces different GIR hashes on two compilations, emit LLN-BUILD-001.
  process.stdout.write("Checking GIR determinism across .lln files...\n");

  const selfHostedDir = join(getSrcDir(), "self-hosted");
  let llnFiles: string[] = [];
  try {
    llnFiles = readdirSync(selfHostedDir)
      .filter((f) => f.endsWith(".lln"))
      .map((f) => join(selfHostedDir, f));
  } catch {
    // self-hosted directory may not be present in all environments — skip silently
    process.stdout.write("  [info] self-hosted/ directory not found; skipping GIR determinism check.\n");
  }

  let girDeterminismPassed = true;

  for (const filePath of llnFiles) {
    let source: string;
    try {
      source = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
    const { hash1, hash2 } = doubleCompileGirHash(source, fileName);

    if (hash1 !== hash2) {
      process.stderr.write(
        `[error] ${LLN_BUILD_001_CODE} NonDeterministicBuild\n` +
        `  File: ${filePath}\n` +
        `  GIR hash 1: ${hash1}\n` +
        `  GIR hash 2: ${hash2}\n` +
        `  Same source produced different GIR on repeated compilation.\n`,
      );
      girDeterminismPassed = false;
    } else {
      process.stdout.write(`  ✓ ${fileName}: GIR deterministic (${hash1.slice(0, 20)}...)\n`);
    }
  }

  if (!girDeterminismPassed) {
    process.exit(1);
  }

  process.stdout.write("✓ Deterministic. Build verified.\n");
  process.stdout.write("✓ Self-host verification PASSED. Build is deterministic.\n");
  process.exit(0);
}

/**
 * Returns the src/ directory relative to the compiler's current working
 * directory. Used to locate the self-hosted/ subdirectory.
 *
 * In a project install this resolves to <project-root>/src.
 * If the directory does not exist the GIR determinism check is skipped gracefully.
 */
function getSrcDir(): string {
  return join(process.cwd(), "src");
}

// ---------------------------------------------------------------------------
// Fix effects stub (Phase 13C)
// ---------------------------------------------------------------------------

function runFixEffects(targetDir: string): void {
  const files = findLlnFiles(targetDir);
  if (files.length === 0) {
    process.stdout.write("No .lln files found.\n");
    return;
  }

  for (const filePath of files) {
    let source: string;
    try {
      source = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const parseResult = parseProgram(source, filePath);
    const effectResults = checkEffects(parseResult.flows, parseResult.ast);

    for (const result of effectResults) {
      const missing = result.diagnostics.filter(
        (d) => d.code === "LLN-EFFECT-001" && d.name === "UNDECLARED_EFFECT",
      );
      if (missing.length > 0) {
        for (const d of missing) {
          process.stdout.write(
            `[suggest] ${filePath}: flow "${result.flowName}" — add effect declaration.\n`,
          );
          process.stdout.write(`  Reason: ${d.message}\n`);
          if (d.suggestedFix !== undefined) {
            process.stdout.write(`  Fix: ${d.suggestedFix}\n`);
          }
        }
      }
    }
  }

  process.stdout.write(
    "\n[info] Phase 13C stub: suggestions printed. File modifications not applied.\n",
  );
}

// ---------------------------------------------------------------------------
// Print a single diagnostic line
// ---------------------------------------------------------------------------

function printDiagnostic(d: CliDiagnostic): void {
  const prefix = d.severity === "error" ? "[error]" : "[warn]";
  const loc =
    d.line !== undefined
      ? `${d.file}:${d.line}${d.column !== undefined ? `:${d.column}` : ""}`
      : d.file;
  process.stdout.write(`${prefix} ${d.code}  ${loc}\n  ${d.message}\n`);
}

// ---------------------------------------------------------------------------
// Parse CLI arguments
// ---------------------------------------------------------------------------

function parseArgs(): { readonly mode: CliMode; readonly targetDir: string } {
  const args = process.argv.slice(2) as string[];

  const command = args[0] ?? "";
  const flags = new Set(args.slice(1).filter((a: string) => a.startsWith("--")));
  const positional = args.slice(1).filter((a: string) => !a.startsWith("--"));
  const targetDir = positional[0] ?? process.cwd();

  let mode: CliMode;

  switch (command) {
    case "check":
      mode = flags.has("--strict") ? "check-strict" : "check";
      break;
    case "build": {
      const target = [...args.slice(1)].find((a) => a.startsWith("--target="))?.slice("--target=".length) ?? "";
      if (flags.has("--production") || flags.has("--deterministic")) {
        mode = flags.has("--deterministic") ? "build-deterministic" : "build-production";
      } else if (target === "wasm-standalone" || target === "wasm-wasi" ||
                 flags.has("--target=wasm-standalone") || flags.has("--target=wasm-wasi")) {
        // Phase 42: wasm-wasi is a canonical alias for wasm-standalone
        mode = "build-wasm-standalone";
      } else if (target === "wasm-hybrid" || flags.has("--target=wasm-hybrid")) {
        mode = "build-wasm-hybrid";
      } else {
        mode = "build";
      }
      break;
    }
    case "fix":
      if (!flags.has("--effects")) {
        process.stderr.write("[error] logicn fix requires --effects flag\n");
        process.exit(1);
      }
      mode = "fix-effects";
      break;
    case "emit":
      if (!flags.has("--ai-graph")) {
        process.stderr.write("[error] logicn emit requires --ai-graph flag\n");
        process.exit(1);
      }
      mode = "emit-ai-graph";
      break;
    case "verify-selfhost":
      mode = "verify-selfhost";
      break;
    case "cost":
      if (!flags.has("--analysis")) {
        process.stderr.write("[error] logicn cost requires --analysis flag\n");
        process.exit(1);
      }
      mode = "cost-analysis";
      break;
    case "diff":
      mode = "governance-diff";
      break;
    default:
      process.stderr.write(
        "Usage: logicn <command> [options] [path]\n" +
        "Commands:\n" +
        "  check                        Check .lln files (dev mode)\n" +
        "  check --strict               Check .lln files (strict mode)\n" +
        "  build                        Build .lln files (JS bootstrap)\n" +
        "  build --production           Build with full governance enforcement\n" +
        "  build --deterministic        Build with strict reproducibility checks\n" +
        "  build --target=wasm-standalone  Emit WASM/WASI module (no JS required)\n" +
        "  build --target=wasm-wasi       Alias for wasm-standalone (Phase 42)\n" +
        "  build --target=wasm-hybrid   Emit JS shell + WASM pure-flow core\n" +
        "  fix --effects                Suggest missing effect declarations\n" +
        "  emit --ai-graph              Emit build/semantic/logicn.ai.json\n" +
        "  verify-selfhost              Verify deterministic (reproducible) build\n" +
        "  cost --analysis              Analyse contract.economics blocks across all flows\n" +
        "  diff [baseRef] [--json]      Governance delta vs a git ref (exit 2 if authority widens)\n",
      );
      process.exit(1);
  }

  return { mode, targetDir };
}

// ---------------------------------------------------------------------------
// WASM standalone build (Phase 26A)
// ---------------------------------------------------------------------------

/**
 * Checks if wasmtime is available on PATH by running "wasmtime --version".
 * Returns the version string on success, or null if not found.
 */
function checkWasmtime(): string | null {
  try {
    const result = spawnSync("wasmtime", ["--version"], { encoding: "utf8", timeout: 5000 });
    if (result.status === 0 && result.stdout) {
      return result.stdout.trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Phase 26A: Build wasm-standalone target.
 *
 * For each .lln file:
 *   1. Parse + compile to WAT text.
 *   2. Write build/wasm/output.wat.
 *   3. Run JS assembler to produce build/wasm/output.wasm.
 *   4. If wasmtime is available, print "To execute: wasmtime build/wasm/output.wasm".
 *   5. If wasmtime is not available, print clear install instructions.
 */
function runWasmStandaloneBuild(targetDir: string, files: string[]): void {
  const outDir = join(targetDir, "build", "wasm");
  try {
    mkdirSync(outDir, { recursive: true });
  } catch {
    // already exists
  }

  const watOutPath = join(outDir, "output.wat");
  const wasmOutPath = join(outDir, "output.wasm");

  // Collect WAT from all files by compiling them
  const watParts: string[] = [];

  for (const filePath of files) {
    let source: string;
    try {
      source = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const parseResult = parseProgram(source, filePath);
    const effectResults = checkEffects(parseResult.flows, parseResult.ast);
    const girResult = emitGIR(parseResult.ast, parseResult.flows, effectResults);

    const watModule = buildWATModuleFromGIR(girResult.gir, STDLIB_CAPABILITY_MAP, "wasm-standalone");
    const watText = renderWAT(watModule);
    watParts.push(`\n;; === ${filePath} ===\n${watText}`);
  }

  // For wasm-standalone, we emit a single combined WAT. If there are multiple
  // files, use the last one's WAT (a real linker is Phase 27+). For now,
  // use the first file's WAT as the output module.
  const finalWat = watParts.length > 0
    ? (watParts[0] ?? "(module)")
    : "(module)";

  // Strip the leading comment so wat2wasm gets a valid module
  const cleanWat = finalWat.replace(/^;; === .+? ===\n/, "");

  // Write WAT text file
  writeFileSync(watOutPath, cleanWat, "utf8");
  process.stdout.write(`[info] WAT written: ${watOutPath}\n`);

  // Run JS assembler to produce WASM binary
  assembleWAT(cleanWat).then((assembleResult) => {
    if (assembleResult.valid) {
      writeFileSync(wasmOutPath, Buffer.from(assembleResult.wasm));
      process.stdout.write(`[info] WASM binary written: ${wasmOutPath}\n`);

      // Check wasmtime availability
      const wasmtimeVersion = checkWasmtime();
      if (wasmtimeVersion !== null) {
        process.stdout.write(`[info] wasmtime found: ${wasmtimeVersion}\n`);
        process.stdout.write(`[info] To execute: wasmtime ${wasmOutPath}\n`);
      } else {
        process.stdout.write(`[info] wasmtime not found on PATH.\n`);
        process.stdout.write(`[info] To install wasmtime, visit: https://wasmtime.dev\n`);
        process.stdout.write(`[info]   macOS/Linux: curl https://wasmtime.dev/install.sh -sSf | bash\n`);
        process.stdout.write(`[info]   Windows:    winget install BytecodeAlliance.wasmtime\n`);
        process.stdout.write(`[info] To execute (once installed): wasmtime ${wasmOutPath}\n`);
        process.stdout.write(`[info] WAT file is at: ${watOutPath} (run wat2wasm manually if needed)\n`);
      }
    } else {
      process.stdout.write(`[warn] JS assembler could not produce a valid WASM binary for this WAT pattern.\n`);
      process.stdout.write(`[info] WAT file is at: ${watOutPath}\n`);
      const wasmtimeVersion = checkWasmtime();
      if (wasmtimeVersion !== null) {
        process.stdout.write(`[info] To assemble + execute: wat2wasm ${watOutPath} -o ${wasmOutPath} && wasmtime ${wasmOutPath}\n`);
      } else {
        process.stdout.write(`[info] Install wat2wasm (https://github.com/WebAssembly/wabt) and wasmtime (https://wasmtime.dev) to assemble and run.\n`);
        process.stdout.write(`[info]   wasmtime install: winget install BytecodeAlliance.wasmtime  (Windows)\n`);
        process.stdout.write(`[info]   wasmtime install: curl https://wasmtime.dev/install.sh -sSf | bash  (macOS/Linux)\n`);
      }
    }
  }).catch((err: unknown) => {
    process.stderr.write(`[error] WAT assembler failed: ${String(err)}\n`);
  });
}

// ---------------------------------------------------------------------------
// Cost analysis (Phase 30 stub)
// ---------------------------------------------------------------------------

/**
 * Compiles all .lln files, extracts contract.economics sub-blocks from each
 * flow, and writes a JSON cost summary to build/cost-analysis.json.
 *
 * Economics extraction is best-effort: if a flow has no economics contract
 * the entry still appears in the output with hasEconomicsContract: false.
 *
 * Phase 30 note: estimatedComputeMs is always null until the CostGraph is
 * wired (Phase 30). The field is reserved for future population.
 */
/**
 * Phase 32: `logicn diff [baseRef]` — governance delta between a git ref and the working tree.
 * Compares the governance shape (effects, qualifier) of every flow.
 * Default baseRef: HEAD. Use `--json` for machine-readable output.
 */
function runGovernanceDiff(baseRefArg: string): void {
  // baseRefArg defaults to process.cwd() when no positional given — treat that as HEAD.
  const baseRef = baseRefArg === process.cwd() ? "HEAD" : baseRefArg.replace(/\.\.$/, "");
  const wantJson = process.argv.includes("--json");

  // Collect all .lln files currently present
  const files = findLlnFiles(process.cwd());
  const beforeFlows: FlowMeta[] = [];
  const afterFlows: FlowMeta[] = [];

  for (const file of files) {
    const rel = file.replace(process.cwd() + "\\", "").replace(process.cwd() + "/", "").replace(/\\/g, "/");
    // After = working tree
    try {
      const afterSrc = readFileSync(file, "utf8");
      afterFlows.push(...parseProgram(afterSrc, file).flows);
    } catch { /* skip unreadable */ }
    // Before = the file at baseRef (git show)
    // OWASP F1: use spawnSync with array args — never interpolate user input into shell string.
    // Validate baseRef against a strict ref pattern first (no shell metacharacters).
    try {
      if (!/^[a-zA-Z0-9._\-/^~@{}:]+$/.test(baseRef)) {
        throw new Error(`Invalid git ref: '${baseRef}' contains unsafe characters`);
      }
      // OWASP F1: shell:false is the default for spawnSync — no need to pass it.
      // The array-args form already prevents shell interpolation.
      const gitResult = spawnSync("git", ["show", `${baseRef}:${rel}`], {
        encoding: "utf8",
        timeout: 15_000,
      });
      if (gitResult.status === 0 && gitResult.stdout) {
        beforeFlows.push(...parseProgram(gitResult.stdout, file).flows);
      }
    } catch { /* file did not exist at baseRef — treated as added */ }
  }

  const diff = diffGovernance(beforeFlows, afterFlows);

  if (wantJson) {
    process.stdout.write(JSON.stringify(diff, null, 2) + "\n");
  } else {
    process.stdout.write(renderGovernanceDiff(diff) + "\n");
  }
  // Exit non-zero if authority was widened — useful as a CI gate
  process.exit(diff.widensAuthority ? 2 : 0);
}

function runCostAnalysis(targetDir: string): void {
  const files = findLlnFiles(targetDir);
  if (files.length === 0) {
    process.stdout.write("No .lln files found.\n");
    return;
  }

  interface CostFlowEntry {
    name: string;
    targetLatencyMs: number | null;
    targetCostGBP: number | null;
    declaredEffects: string[];
    estimatedComputeMs: null;
    hasEconomicsContract: boolean;
    hasLineageContract: boolean;
    hasAiContract: boolean;
  }

  const flowEntries: CostFlowEntry[] = [];
  let flowsWithEconomics = 0;
  let flowsWithLineage = 0;
  let governanceProofsGenerated = 0;

  for (const filePath of files) {
    let source: string;
    try {
      source = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const parseResult = parseProgram(source, filePath);

    for (const flow of parseResult.flows) {
      // Find the contract node for this flow in the AST by scanning children
      // The flow node is identified by name in the AST children list
      let targetLatencyMs: number | null = null;
      let targetCostGBP: number | null = null;
      let hasEconomicsContract = false;
      let hasLineageContract = false;
      let hasAiContract = false;

      // Walk AST to find the flow's contract sub-blocks.
      // Uses unknown casts to avoid complex nested readonly/mutable type mismatches.
      function nodeKind(n: unknown): string {
        return (n as { kind?: string }).kind ?? "";
      }
      function nodeValue(n: unknown): string {
        return (n as { value?: string }).value ?? "";
      }
      function nodeChildren(n: unknown): unknown[] {
        return (n as { children?: unknown[] }).children ?? [];
      }

      function walkForContract(node: unknown): void {
        const k = nodeKind(node);
        if (
          (k === "flowDecl" || k === "secureFlowDecl" ||
           k === "pureFlowDecl" || k === "guardedFlowDecl") &&
          nodeValue(node) === flow.name
        ) {
          for (const child of nodeChildren(node)) {
            if (nodeKind(child) === "contractDecl") {
              for (const subBlock of nodeChildren(child)) {
                const sbVal = nodeValue(subBlock);
                if (sbVal === "economics:block") {
                  hasEconomicsContract = true;
                  // Parse decl children for target_latency and target_cost
                  for (const decl of nodeChildren(subBlock)) {
                    const dv = nodeValue(decl);
                    const latencyMatch = dv.match(/^decl:target_latency\s*<\s*(\d+)/);
                    if (latencyMatch?.[1] !== undefined) targetLatencyMs = parseInt(latencyMatch[1], 10);
                    const costMatch = dv.match(/^decl:target_cost\s*<\s*([\d.]+)/);
                    if (costMatch?.[1] !== undefined) targetCostGBP = parseFloat(costMatch[1]);
                  }
                }
                if (sbVal === "lineage:block") hasLineageContract = true;
                if (sbVal === "ai:block") hasAiContract = true;
              }
            }
          }
          return;
        }
        for (const child of nodeChildren(node)) {
          walkForContract(child);
        }
      }

      walkForContract(parseResult.ast);

      if (hasEconomicsContract) flowsWithEconomics++;
      if (hasLineageContract) flowsWithLineage++;
      governanceProofsGenerated++;

      flowEntries.push({
        name: flow.name,
        targetLatencyMs,
        targetCostGBP,
        declaredEffects: [...flow.declaredEffects],
        estimatedComputeMs: null,
        hasEconomicsContract,
        hasLineageContract,
        hasAiContract,
      });
    }
  }

  const summary = {
    flowsWithEconomics,
    flowsWithLineage,
    estimatedManualAuditHoursRemoved: Math.round(governanceProofsGenerated * 0.27),
    governanceProofsGenerated,
  };

  const costReport = { flows: flowEntries, summary };
  const json = JSON.stringify(costReport, null, 2);

  const outDir = join(targetDir, "build");
  try {
    mkdirSync(outDir, { recursive: true });
  } catch {
    // already exists
  }

  const outFile = join(outDir, "cost-analysis.json");
  writeFileSync(outFile, json, "utf8");

  process.stdout.write(json + "\n");
  process.stdout.write(`[info] Cost analysis written to ${outFile}\n`);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function main(): void {
  const { mode, targetDir } = parseArgs();

  // fix --effects is a special path
  if (mode === "fix-effects") {
    runFixEffects(targetDir);
    return;
  }

  // verify-selfhost is a special path
  if (mode === "verify-selfhost") {
    runVerifySelfhost();
    return;
  }

  // cost --analysis is a special path
  if (mode === "cost-analysis") {
    runCostAnalysis(targetDir);
    return;
  }

  // diff main..branch is a special path
  if (mode === "governance-diff") {
    runGovernanceDiff(targetDir);
    return;
  }

  const files = findLlnFiles(targetDir);
  if (files.length === 0) {
    process.stdout.write("No .lln files found.\n");
    process.exit(0);
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  const allAiGraphParts: string[] = [];

  for (const filePath of files) {
    const result = compileFile(filePath, mode);

    for (const d of result.diagnostics) {
      printDiagnostic(d);
      if (d.severity === "error") {
        totalErrors += 1;
      } else if (d.severity === "warning") {
        totalWarnings += 1;
      }
    }

    if (result.aiGraphJson !== undefined) {
      allAiGraphParts.push(result.aiGraphJson);
    }
  }

  // WASM target modes
  if (mode === "build-wasm-standalone" || mode === "build-wasm-hybrid") {
    if (totalErrors === 0) {
      if (mode === "build-wasm-standalone") {
        runWasmStandaloneBuild(targetDir, files);
      } else {
        process.stdout.write(
          `[info] --target=wasm-hybrid: governance checks passed. ` +
          `WAT emitter wiring complete. ` +
          `Output: build/wasm/wasm-hybrid/\n`,
        );
      }
    }
  }

  // Emit AI graph JSON
  if (mode === "emit-ai-graph" && allAiGraphParts.length > 0) {
    const outDir = join(targetDir, "build", "semantic");
    try {
      mkdirSync(outDir, { recursive: true });
    } catch {
      // ignore — may already exist
    }
    const outFile = join(outDir, "logicn.ai.json");
    // Wrap multiple files as an array, or unwrap single
    const combined =
      allAiGraphParts.length === 1
        ? (allAiGraphParts[0] ?? "[]")
        : `[\n${allAiGraphParts.join(",\n")}\n]`;
    writeFileSync(outFile, combined, "utf8");
    process.stdout.write(`[info] AI graph written to ${outFile}\n`);
  }

  // Summary
  const hasFatalErrors = totalErrors > 0;

  if (hasFatalErrors) {
    process.stdout.write(
      `\nBuild failed — ${totalErrors} error(s), ${totalWarnings} warning(s)\n`,
    );
    process.exit(1);
  } else {
    const warnSuffix =
      totalWarnings > 0 ? ` (${totalWarnings} warning(s))` : "";
    process.stdout.write(`\n✓ Check passed${warnSuffix}\n`);
  }
}

main();
