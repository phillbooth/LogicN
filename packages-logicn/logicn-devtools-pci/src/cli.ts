#!/usr/bin/env node
// =============================================================================
// @logicn/devtools-pci — CLI
//
// logicn-pci audit <file.lln> [--json]
// logicn-pci audit <directory> [--json]
//
// Exit codes:
//   0 — passed (no critical/high findings)
//   2 — findings present
//   3 — parse/read error
// =============================================================================

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { runPciAudit } from "./pci-checker.js";
import type { PciFinding, PciAuditReport } from "./types.js";

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<number> {
  switch (command) {
    case "audit": {
      const target = args[1];
      if (!target) {
        process.stderr.write("Usage: logicn-pci audit <file.lln|directory> [--json]\n");
        return 1;
      }
      const wantJson = args.includes("--json");

      let stat;
      try { stat = statSync(target); }
      catch { process.stderr.write(`Cannot access '${target}'\n`); return 3; }

      if (stat.isDirectory()) {
        return auditDirectory(target, wantJson);
      } else {
        return auditFile(target, wantJson);
      }
    }

    default:
      process.stdout.write(`logicn-pci — PCI DSS 4.0.1 Compliance Audit for LogicN\n\n`);
      process.stdout.write(`Commands:\n`);
      process.stdout.write(`  audit <file.lln|directory> [--json]   Run PCI compliance audit\n\n`);
      process.stdout.write(`Exit codes: 0=passed, 2=findings present, 3=parse/read error\n`);
      return 0;
  }
}

function auditFile(filePath: string, wantJson: boolean): number {
  let source: string;
  try { source = readFileSync(filePath, "utf8"); }
  catch { process.stderr.write(`Cannot read '${filePath}'\n`); return 3; }

  const report = runPciAudit(source, filePath);

  if (wantJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    printReport(report, filePath);
  }

  return report.passed ? 0 : 2;
}

function auditDirectory(dirPath: string, wantJson: boolean): number {
  let llnFiles: string[];
  try {
    llnFiles = readdirSync(dirPath)
      .filter(f => f.endsWith(".lln"))
      .map(f => join(dirPath, f));
  } catch {
    process.stderr.write(`Cannot read directory '${dirPath}'\n`);
    return 3;
  }

  if (llnFiles.length === 0) {
    process.stderr.write(`No .lln files found in '${dirPath}'\n`);
    return 0;
  }

  const reports: PciAuditReport[] = [];
  let anyFail = false;

  for (const filePath of llnFiles) {
    let source: string;
    try { source = readFileSync(filePath, "utf8"); }
    catch { process.stderr.write(`Cannot read '${filePath}'\n`); continue; }
    const report = runPciAudit(source, filePath);
    reports.push(report);
    if (!report.passed) anyFail = true;
  }

  if (wantJson) {
    process.stdout.write(JSON.stringify(reports, null, 2) + "\n");
  } else {
    for (const report of reports) {
      printReport(report, report.source.slice(0, 60));
    }
    process.stdout.write(`\n=== Directory summary: ${reports.length} file(s), ${anyFail ? "FAIL" : "PASS"} ===\n`);
  }

  return anyFail ? 2 : 0;
}

function printReport(report: PciAuditReport, label: string): void {
  const status = report.passed ? "PASS" : "FAIL";
  process.stdout.write(`\nLogicN PCI DSS 4.0.1 Audit — ${label}\n`);
  process.stdout.write(`PCI DSS: ${report.pciDssVersion} | ${status} | ${report.findings.length} finding(s)\n\n`);

  if (report.findings.length === 0) {
    process.stdout.write("  No PCI compliance findings.\n");
  } else {
    for (const f of report.findings) {
      const icon = f.severity === "critical" ? "[CRIT]" : f.severity === "high" ? "[HIGH]" : "[MED] ";
      const flow = f.flowName ? `(${f.flowName}) ` : "";
      process.stdout.write(`  ${icon} [${f.code}] PCI Req ${f.pciRequirement} ${flow}${f.message}\n`);
    }
    process.stdout.write(`\nFailed requirements: ${report.failedRequirements.join(", ")}\n`);
  }
  process.stdout.write(`\n`);
}

main().then(code => process.exit(code)).catch(e => {
  process.stderr.write(`Fatal: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
