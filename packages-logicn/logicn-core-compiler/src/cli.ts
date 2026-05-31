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
import { parseProgram } from "./parser.js";
import { resolveSymbols } from "./symbol-resolver.js";
import { checkTypes } from "./type-checker.js";
import { checkValueStates } from "./value-state-checker.js";
import { checkEffects } from "./effect-checker.js";
import { checkSourceEscapes } from "./source-escape-checker.js";
import { verifyGovernance } from "./governance-verifier.js";
import { buildAiGraph } from "./gir-emitter.js";
import type { Dirent } from "node:fs";

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
  | "fix-effects"
  | "emit-ai-graph"
  | "verify-selfhost";

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

  const effectResults = checkEffects(parseResult.flows, parseResult.ast);
  for (const result of effectResults) {
    for (const d of result.diagnostics) {
      // LLN-EFFECT-001 is downgraded to warning in dev/check/build modes
      const isEffectMissing = d.code === "LLN-EFFECT-001";
      const severity: CliDiagnostic["severity"] =
        isEffectMissing && (mode === "check" || mode === "build")
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
// verify-selfhost (Phase 14 stub)
// ---------------------------------------------------------------------------

function runVerifySelfhost(): void {
  // Phase 14 stub: full implementation pending canonical hashing module.
  // Full implementation will:
  //   1. Compile source once → build1/
  //   2. Compile source again → build2/
  //   3. Compute canonical hashes of both outputs (strip timestamps, sort keys)
  //   4. If hashes match → PASS
  //   5. If hashes differ → emit LLN-BUILD-001 and exit(1)
  process.stdout.write(
    "logicn verify-selfhost: B1→B2 canonical hash comparison" +
    " (Phase 14 stub — full implementation pending canonical hashing module)\n",
  );
  process.exit(0);
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
    case "build":
      mode = flags.has("--production") ? "build-production" : "build";
      break;
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
    default:
      process.stderr.write(
        "Usage: logicn <command> [options] [path]\n" +
        "Commands:\n" +
        "  check              Check .lln files (dev mode)\n" +
        "  check --strict     Check .lln files (strict mode)\n" +
        "  build              Build .lln files\n" +
        "  build --production Build with governance enforcement\n" +
        "  fix --effects      Suggest missing effect declarations\n" +
        "  emit --ai-graph    Emit build/semantic/logicn.ai.json\n" +
        "  verify-selfhost    Verify deterministic (reproducible) build\n",
      );
      process.exit(1);
  }

  return { mode, targetDir };
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
