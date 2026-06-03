#!/usr/bin/env node
// =============================================================================
// @logicn/devtools-context — CLI
//
// logicn-context receipt <file.lln> [--flow <flowName>] [--json] [--markdown]
//
// Without --flow: generates receipts for ALL flows in the file.
// With --flow:    generates receipt for just that one flow.
//
// Output formats:
//   default / --markdown  : human-readable Markdown (AI-friendly)
//   --json                : machine-readable JSON
//
// Exit codes:
//   0 — success
//   1 — usage error
//   2 — file not found / parse error
//   3 — flow not found (--flow used but flow name not in file)
// =============================================================================

import { readFileSync } from "node:fs";
import { generateReceipts, generateFlowReceiptByName } from "./receipt-generator.js";
import { renderFileReceiptsMarkdown, renderReceiptMarkdown } from "./markdown-renderer.js";
import type { ReceiptOptions } from "./types.js";

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<number> {
  switch (command) {
    case "receipt": {
      const filePath = args[1];
      if (!filePath) {
        process.stderr.write(
          "Usage: logicn-context receipt <file.lln> [--flow <flowName>] [--json] [--markdown]\n",
        );
        return 1;
      }

      const wantJson     = args.includes("--json");
      const wantMarkdown = args.includes("--markdown") || !wantJson;

      const flowIdx  = args.indexOf("--flow");
      const flowName = flowIdx >= 0 ? args[flowIdx + 1] : undefined;

      if (flowIdx >= 0 && !flowName) {
        process.stderr.write("--flow requires a flow name argument\n");
        return 1;
      }

      let source: string;
      try {
        source = readFileSync(filePath, "utf8");
      } catch {
        process.stderr.write(`Cannot read '${filePath}'\n`);
        return 2;
      }

      // Single-flow mode
      if (flowName) {
        const receipt = generateFlowReceiptByName(source, flowName, filePath);
        if (!receipt) {
          process.stderr.write(`Flow '${flowName}' not found in '${filePath}'\n`);
          return 3;
        }
        if (wantJson) {
          process.stdout.write(JSON.stringify(receipt, null, 2) + "\n");
        } else {
          process.stdout.write(renderReceiptMarkdown(receipt) + "\n");
        }
        return 0;
      }

      // All-flows mode
      const opts: ReceiptOptions = { fileName: filePath };
      const fileReceipts = generateReceipts(source, opts);

      if (wantJson) {
        process.stdout.write(JSON.stringify(fileReceipts, null, 2) + "\n");
      } else {
        process.stdout.write(renderFileReceiptsMarkdown(fileReceipts) + "\n");
      }

      // Summary to stderr so it doesn't pollute JSON piping
      process.stderr.write(
        `\nContext Receipts generated for ${fileReceipts.flowCount} flow(s). ` +
        `Token reduction: ${fileReceipts.overallReductionPct}% ` +
        `(${fileReceipts.totalReceiptTokens} receipt tokens vs ${fileReceipts.totalFullSourceTokens} source tokens)\n`,
      );

      return 0;
    }

    default: {
      process.stdout.write(`logicn-context — LogicN Context Receipt Generator\n\n`);
      process.stdout.write(`Commands:\n`);
      process.stdout.write(
        `  receipt <file.lln> [--flow <name>] [--json] [--markdown]   Generate context receipt(s)\n\n`,
      );
      process.stdout.write(`Options:\n`);
      process.stdout.write(`  --flow <name>   Generate receipt for a specific flow only\n`);
      process.stdout.write(`  --json          Output machine-readable JSON\n`);
      process.stdout.write(`  --markdown      Output human-readable Markdown (default)\n\n`);
      process.stdout.write(`Exit codes: 0=success, 1=usage error, 2=file error, 3=flow not found\n`);
      return 0;
    }
  }
}

main().then(code => process.exit(code)).catch(e => {
  process.stderr.write(`Fatal: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
