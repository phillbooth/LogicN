/**
 * compare.mjs — reads results/latest.json and prints a full comparison report:
 *   1. Throughput summary table
 *   2. Memory usage table (RSS + heap per runtime)
 *   3. CPU efficiency table (ops per CPU ms)
 *   4. Per-benchmark detail tables
 *   5. Key observations
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const dataPath  = join(__dirname, "..", "results", "latest.json");

const ORDER = ["rust", "cpp", "nodejs", "python", "logicnManifest", "logicnGoverned"];
const LABEL = {
  rust:           "Rust",
  cpp:            "C++",
  nodejs:         "Node.js",
  python:         "Python",
  logicnManifest: "LogicN (manifest)",
  logicnGoverned: "LogicN (governed)",
};

// ── Metric extractors ──────────────────────────────────────────────────────────

function throughput(r) {
  if (!r || r.error) return null;
  // LogicN: use normalised opsPerSecond when available (opsPerRun × runsPerSec)
  if (r.logicnOpsPerSecond) return r.logicnOpsPerSecond;
  return r.operationsPerSecond ?? r.additionsPerSecond ?? r.attemptsPerSecond ?? r.runsPerSecond ?? null;
}

function cpuEfficiency(r) {
  if (!r || r.error) return null;
  if (r.operationsPerCpuMs) return r.operationsPerCpuMs;
  const t = throughput(r);
  const wall = r.elapsedMs ?? r.execMs;
  const cpu  = r.cpu?.totalMs ?? r.cpu?.processMs;
  if (t && wall && cpu && cpu > 0) return (t * (wall / 1000)) / cpu;
  return null;
}

function rssBytes(r)      { return r?.memory?.rssAfter  ?? r?.memory?.rssBytes         ?? null; }
function peakRss(r)       { return r?.memory?.peakRssBytes ?? r?.memory?.maxRssBytes    ?? rssBytes(r); }
function heapUsed(r)      { return r?.memory?.heapUsedAfter ?? r?.memory?.heapUsedBytes ?? null; }
function heapDelta(r)     { return r?.memory?.heapUsedDelta                             ?? null; }
function cpuMs(r)         { return r?.cpu?.totalMs ?? r?.cpu?.processMs                 ?? null; }
function wallMs(r)        { return r?.elapsedMs ?? r?.execMs                            ?? null; }

// ── Formatters ─────────────────────────────────────────────────────────────────

function fmtT(n) {
  if (n === null) return "—";
  if (n >= 1e9) return (n/1e9).toFixed(2)+"B/s";
  if (n >= 1e6) return (n/1e6).toFixed(2)+"M/s";
  if (n >= 1e3) return (n/1e3).toFixed(1)+"K/s";
  return n.toFixed(1)+"/s";
}

function fmtB(b) {
  if (b === null || b === undefined) return "—";
  const abs = Math.abs(b);
  const sign = b < 0 ? "-" : "";
  if (abs >= 1e9) return sign+(abs/1e9).toFixed(2)+"GB";
  if (abs >= 1e6) return sign+(abs/1e6).toFixed(1)+"MB";
  if (abs >= 1e3) return sign+(abs/1e3).toFixed(0)+"KB";
  return sign+abs+"B";
}

function fmtMs(ms) {
  if (ms === null || ms === undefined) return "—";
  if (ms >= 1000) return (ms/1000).toFixed(2)+"s";
  return ms.toFixed(1)+"ms";
}

function fmtEff(n) {
  if (n === null) return "—";
  if (n >= 1e6) return (n/1e6).toFixed(2)+"M ops/CPU-ms";
  if (n >= 1e3) return (n/1e3).toFixed(1)+"K ops/CPU-ms";
  return n.toFixed(2)+" ops/CPU-ms";
}

function ratio(a, b) {
  if (!a || !b || b === 0) return "—";
  const r = a / b;
  if (r >= 1e6) return (r/1e6).toFixed(1)+"M×";
  if (r >= 1e3) return (r/1e3).toFixed(1)+"K×";
  if (r >= 10)  return r.toFixed(1)+"×";
  return r.toFixed(2)+"×";
}

// ── Load ───────────────────────────────────────────────────────────────────────

let data;
try { data = JSON.parse(readFileSync(dataPath, "utf8")); }
catch { console.error("No results — run: npm run run"); process.exit(1); }

// ── 1. Throughput summary ──────────────────────────────────────────────────────

console.log("# LogicN Benchmark Report\n");
console.log("## 1. Throughput\n");
console.log("| Benchmark | Rust | C++ | Node.js | Python | LogicN manifest | LogicN governed | Node÷LogicN |");
console.log("|---|---|---|---|---|---|---|---|");

for (const bench of data) {
  const m = {}; for (const rt of ORDER) m[rt] = throughput(bench.results?.[rt]);
  const row = [bench.benchmark, ...ORDER.map(rt => fmtT(m[rt]))];
  row.push((m.nodejs && m.logicnGoverned) ? ratio(m.nodejs, m.logicnGoverned) : "—");
  console.log("| "+row.join(" | ")+" |");
}

// ── 2. Memory usage ────────────────────────────────────────────────────────────

console.log("\n## 2. Memory Usage\n");
console.log("| Benchmark | Runtime | RSS | Peak RSS | Heap Used | Heap Δ (execution) |");
console.log("|---|---|---|---|---|---|");

for (const bench of data) {
  for (const rt of ORDER) {
    const r = bench.results?.[rt];
    if (!r || r.error) continue;
    const rss = rssBytes(r), peak = peakRss(r), heap = heapUsed(r), hd = heapDelta(r);
    if (rss === null && heap === null) continue;
    console.log(`| ${bench.benchmark} | ${LABEL[rt]} | ${fmtB(rss)} | ${fmtB(peak)} | ${fmtB(heap)} | ${fmtB(hd)} |`);
  }
}

console.log("\n> **Heap Δ** = heap after minus heap before execution. Negative means GC reclaimed memory during the run.");
console.log("> **LogicN:** each tree-walker node evaluation allocates a new LogicNValue object — visible as positive heap delta.");

// ── 3. CPU efficiency ──────────────────────────────────────────────────────────

console.log("\n## 3. CPU Efficiency\n");
console.log("| Benchmark | Runtime | Wall time | CPU time | CPU utilisation | Ops/CPU-ms |");
console.log("|---|---|---|---|---|---|");

for (const bench of data) {
  for (const rt of ORDER) {
    const r = bench.results?.[rt];
    if (!r || r.error) continue;
    const wall = wallMs(r), cpu = cpuMs(r), eff = cpuEfficiency(r);
    if (wall === null) continue;
    const util = (cpu !== null && wall > 0) ? ((cpu/wall)*100).toFixed(0)+"%" : "—";
    console.log(`| ${bench.benchmark} | ${LABEL[rt]} | ${fmtMs(wall)} | ${fmtMs(cpu)} | ${util} | ${fmtEff(eff)} |`);
  }
}

console.log("\n> **CPU utilisation** = CPU ms ÷ wall ms × 100. Node.js approaches 100% (single-thread JIT). Python may show <100% on Windows where process_time measures differently.");

// ── 4. Per-benchmark detail ────────────────────────────────────────────────────

console.log("\n## 4. Per-Benchmark Detail\n");

for (const bench of data) {
  console.log(`### ${bench.benchmark}\n`);
  console.log("| Runtime | Throughput | Wall | CPU | RSS | Heap | vs Python | vs Node |");
  console.log("|---|---|---|---|---|---|---|---|");

  const mt = {}; for (const rt of ORDER) mt[rt] = throughput(bench.results?.[rt]);
  const py = mt.python, nd = mt.nodejs;

  for (const rt of ORDER) {
    const r = bench.results?.[rt];
    if (!r || r.error) continue;
    const t = mt[rt];
    console.log(`| ${LABEL[rt]} | ${fmtT(t)} | ${fmtMs(wallMs(r))} | ${fmtMs(cpuMs(r))} | ${fmtB(rssBytes(r))} | ${fmtB(heapUsed(r))} | ${ratio(t,py)} | ${ratio(t,nd)} |`);
  }
  console.log();
}

// ── 5. Observations ────────────────────────────────────────────────────────────

console.log("## 5. Key Observations\n");
console.log("**Throughput gap:**");
console.log("- Node.js JIT eliminates interpreter overhead — V8 compiles hot loops to native machine code.");
console.log("- Python CPython is slower than Node.js but much faster than LogicN's tree-walker.");
console.log("- LogicN governed ≈ LogicN manifest (Phase R6 fast-path not yet meaningful — tree-walker dominates).\n");
console.log("**Memory:**");
console.log("- LogicN tree-walker allocates a new `{ __tag, value }` object per AST node evaluation.");
console.log("- Node.js heap is low because V8 JIT operates on native tagged integers (no boxing).");
console.log("- Heap Δ for LogicN shows GC pressure — short executions show net allocation, long ones show GC reclaim.\n");
console.log("**CPU efficiency:**");
console.log("- Node.js ops/CPU-ms is very high — JIT eliminates per-operation overhead.");
console.log("- LogicN CPU utilisation is low — the tree-walker spends time in JS function call overhead, not computation.\n");
console.log("**Phase 25 projection (WASM):**");
console.log("- Pure flows compiled to WASM should reach Python-level throughput (1-10M ops/s).");
console.log("- Phase 23C bytecode VM should reach 100K-1M ops/s before WASM.");
console.log("- Integer fast-path (skip boxing for Int+Int) alone gives 10-50× improvement in interpreter mode.");
