import { readFileSync } from "node:fs";
import { parseProgram, resolveSymbols, checkTypes, checkValueStates, checkEffects, effectResultsToDiagnostics, verifyGovernance, checkEvents } from "../dist/index.js";

const SUPPRESS = new Set([
  "LLN-TYPE-001",
  "LLN-TYPE-009",
  "LLN-NAME-001",
  "LLN-GOV-002",
  "LLN-SYNTAX-006",
  "LLN-SYNTAX-007",
  "LLN-SYNTAX-008",
]);

const src = readFileSync("C:/laragon/www/LO/docs/Examples/Level-1-Basics/003-secure-flow/example.lln", "utf8");
const parsed = parseProgram(src, "test.lln");
const sr = resolveSymbols(parsed.ast);
const tr = checkTypes(parsed.ast);
const vr = checkValueStates(parsed.ast);
const ef = checkEffects(parsed.flows, parsed.ast);
const gov = verifyGovernance(parsed.ast, parsed.flows, ef, "dev");
const ev = checkEvents(parsed.ast);
const all = [...parsed.diagnostics, ...sr.diagnostics, ...tr.diagnostics, ...vr.diagnostics, ...effectResultsToDiagnostics(ef), ...gov.diagnostics, ...ev.diagnostics];

console.log("All diags:");
all.forEach(d => console.log(`  ${JSON.stringify(d.code)} severity=${d.severity} suppressed=${SUPPRESS.has(d.code)}`));

const filtered = all.filter(d => !SUPPRESS.has(d.code));
console.log("\nFiltered:");
filtered.forEach(d => console.log(`  ${JSON.stringify(d.code)} severity=${d.severity}`));

const errors = filtered.filter(d => d.severity === "error");
console.log("\nErrors after filter:", errors.length);
errors.forEach(d => console.log(`  ${d.code}: ${d.message}`));
