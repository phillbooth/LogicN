// =============================================================================
// CEC Promotion Pass — runs the full pipeline on all 215 examples and
// determines which draft examples can be promoted to stable.
// =============================================================================

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseProgram,
  resolveSymbols,
  checkTypes,
  checkValueStates,
  checkEffects,
  effectResultsToDiagnostics,
  verifyGovernance,
  checkEvents,
} from "../dist/index.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = join(__dir, "../../../docs/Examples");

// Phase 1 suppression codes (same as specified in the task)
const SUPPRESS = new Set([
  "LLN-TYPE-001",
  "LLN-TYPE-009",
  "LLN-NAME-001",
  "LLN-GOV-002",
  "LLN-SYNTAX-006",
  "LLN-SYNTAX-007",
  "LLN-SYNTAX-008",
]);

// Proposal-only syntax patterns to detect
const PROPOSAL_SYNTAX_PATTERNS = [
  /result\s+of\s+\w+\s+else\s+/,
  /\bresult\s+of\b/,
];

// Placeholder diagnostic code patterns
const PLACEHOLDER_CODE_PATTERN = /LLN-[A-Z]+-XXX/;

function runPipeline(source, filePath) {
  const parsed = parseProgram(source, filePath);
  const symbolResult = resolveSymbols(parsed.ast);
  const typeResult = checkTypes(parsed.ast);
  const vsResult = checkValueStates(parsed.ast);
  const effectResults = checkEffects(parsed.flows, parsed.ast);
  const govResult = verifyGovernance(parsed.ast, parsed.flows, effectResults, "dev");
  const eventResult = checkEvents(parsed.ast);

  return [
    ...parsed.diagnostics,
    ...symbolResult.diagnostics,
    ...typeResult.diagnostics,
    ...vsResult.diagnostics,
    ...effectResultsToDiagnostics(effectResults),
    ...govResult.diagnostics,
    ...eventResult.diagnostics,
  ];
}

function walkDir(dir) {
  const found = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) found.push(...walkDir(full));
    else if (e.name === "example.lln") found.push(full);
  }
  return found;
}

function parseHeader(source) {
  const status = (source.match(/^\/\/\/\s*test_status:\s*(\w+)/m) || [])[1] || "draft";
  const expectedDiag = (source.match(/^\/\/\/\s*expected_diagnostics:\s*(.+)/m) || [])[1]?.trim() || "none";
  return { status, expectedDiag };
}

function hasProposalSyntax(source) {
  return PROPOSAL_SYNTAX_PATTERNS.some((p) => p.test(source));
}

function hasPlaceholderCodes(source) {
  return PLACEHOLDER_CODE_PATTERN.test(source);
}

function parseName(llnFile) {
  const normalized = llnFile.replace(/\\/g, "/");
  const marker = "/Examples/";
  const after = normalized.slice(normalized.indexOf(marker) + marker.length);
  return after.replace("/example.lln", "");
}

// Results tracking
const results = {
  alreadyStable: [],
  promoted: [],
  keptDraft: [],
};

const draftReasons = new Map();

const allFiles = walkDir(EXAMPLES_DIR);
console.log(`Found ${allFiles.length} example files\n`);

for (const llnFile of allFiles) {
  const raw = readFileSync(llnFile, "utf8");
  const source = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  const name = parseName(llnFile);
  const { status, expectedDiag } = parseHeader(source);

  // Skip already-stable examples
  if (status === "stable") {
    results.alreadyStable.push(name);
    continue;
  }

  // Check promotion criteria 3: no proposal-only syntax
  if (hasProposalSyntax(source)) {
    results.keptDraft.push(name);
    draftReasons.set(name, "uses proposal-only syntax (result of X else Y)");
    continue;
  }

  // Check promotion criteria 4: no placeholder diagnostic codes
  if (hasPlaceholderCodes(source)) {
    results.keptDraft.push(name);
    draftReasons.set(name, "uses placeholder diagnostic codes (LLN-XXX)");
    continue;
  }

  // Check promotion criteria 2: expected_diagnostics must be "none"
  if (expectedDiag.toLowerCase() !== "none") {
    // Also check the expected.diagnostics.txt file
    const diagFile = llnFile.replace(/example\.lln$/, "expected.diagnostics.txt");
    let rawExpected = "none";
    try {
      rawExpected = readFileSync(diagFile, "utf8").trim();
    } catch {
      /* not present */
    }
    const lines = rawExpected
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("//") && !l.startsWith("#"));
    const expectNone =
      lines.length === 0 || lines[0].toLowerCase() === "none";

    if (!expectNone) {
      // Has expected diagnostics - check if actual matches
      // For now, keep as draft if expected errors exist (unless they exactly match)
      // We still run the pipeline to verify it doesn't throw
      try {
        const diags = runPipeline(source, llnFile);
        const filteredDiags = diags.filter((d) => !SUPPRESS.has(d.code));
        const errors = filteredDiags.filter((d) => d.severity === "error");
        const expectedCodes = lines
          .filter((l) => /^LLN-[A-Z]+-\d+/.test(l))
          .map((l) => l.split(/\s/)[0]);

        // Check if all expected codes are present
        const allFound = expectedCodes.every((code) =>
          filteredDiags.some((d) => d.code === code)
        );

        if (allFound && expectedCodes.length > 0) {
          // Expected errors present and matched — this is a valid "expects errors" example
          // But the task says stable requires expected_diagnostics = "none" AND actual errors = 0
          // So keep as draft
          results.keptDraft.push(name);
          draftReasons.set(name, `expects specific error codes: ${expectedCodes.join(", ")}`);
        } else {
          results.keptDraft.push(name);
          draftReasons.set(
            name,
            `expected codes not matched: want ${expectedCodes.join(", ")}, got ${filteredDiags.map((d) => d.code).join(", ")}`
          );
        }
      } catch (err) {
        results.keptDraft.push(name);
        draftReasons.set(name, `pipeline threw: ${err.message}`);
      }
      continue;
    }
  }

  // Run the pipeline for zero-error check
  let diags;
  try {
    diags = runPipeline(source, llnFile);
  } catch (err) {
    results.keptDraft.push(name);
    draftReasons.set(name, `pipeline threw: ${err.message}`);
    continue;
  }

  // Apply Phase 1 suppression
  const filtered = diags.filter((d) => !SUPPRESS.has(d.code));
  const errors = filtered.filter((d) => d.severity === "error");

  if (errors.length === 0) {
    // All promotion criteria met — promote!
    results.promoted.push(name);

    // Write the updated file with test_status: stable
    // Insert after expected_diagnostics line
    const updated = source.replace(
      /(\/\/\/\s*expected_diagnostics:[^\n]*\n)/,
      "$1/// test_status: stable\n"
    );
    writeFileSync(llnFile, updated, "utf8");
  } else {
    results.keptDraft.push(name);
    const errorSummary = errors.map((d) => `${d.code}(${d.severity})`).join(", ");
    draftReasons.set(name, `${errors.length} error(s) after suppression: ${errorSummary}`);
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log("=".repeat(70));
console.log("CEC PROMOTION PASS RESULTS");
console.log("=".repeat(70));
console.log(`\nAlready stable : ${results.alreadyStable.length}`);
console.log(`Newly promoted : ${results.promoted.length}`);
console.log(`Kept as draft  : ${results.keptDraft.length}`);
console.log(`Total examples : ${allFiles.length}`);

console.log("\n" + "─".repeat(70));
console.log("NEWLY PROMOTED TO STABLE:");
console.log("─".repeat(70));
for (const name of results.promoted) {
  console.log(`  ✓ ${name}`);
}

console.log("\n" + "─".repeat(70));
console.log("KEPT AS DRAFT (with reasons):");
console.log("─".repeat(70));
for (const name of results.keptDraft) {
  const reason = draftReasons.get(name) || "unknown";
  console.log(`  ✗ ${name}`);
  console.log(`      → ${reason}`);
}

console.log("\n" + "─".repeat(70));
console.log("ALREADY STABLE (unchanged):");
console.log("─".repeat(70));
for (const name of results.alreadyStable) {
  console.log(`  • ${name}`);
}
