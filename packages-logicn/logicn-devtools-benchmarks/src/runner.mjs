import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const benchDir   = join(__dirname, "..", "benchmarks");
const resultsDir  = join(__dirname, "..", "results");

const BENCHMARKS = [
  { id: "compute-mix",          dir: "compute-mix" },
  { id: "arithmetic-threshold", dir: "arithmetic-threshold" },
  { id: "six-digit-guess",      dir: "six-digit-guess" },
];

function runProc(cmd, args=[]) {
  const r = spawnSync(cmd, args, { encoding:"utf8", timeout:180000 });
  if (r.status !== 0 || !r.stdout.trim()) return null;
  try { return JSON.parse(r.stdout.trim()); } catch { return null; }
}

async function runLogicN(llnPath, mode) {
  try {
    const { runLogicNBenchmark } = await import("./logicn-runner.mjs");
    return await runLogicNBenchmark(llnPath, mode);
  } catch(e) { return { error: true, reason: String(e), runtime: `logicn-${mode}` }; }
}

async function runBenchmark(bench) {
  const dir = join(benchDir, bench.dir);
  const res = {};

  const node = join(dir, "node.mjs");
  if (existsSync(node)) { console.log(`  node...`); res.nodejs = runProc("node", [node]); }

  const py = join(dir, "python.py");
  if (existsSync(py)) { console.log(`  python...`); res.python = runProc("python3",[py]) ?? runProc("python",[py]); }

  for (const [key, suffixes] of [["cpp",["bench-compute-mix","bench-arithmetic","bench-guess"]],["rust",["bench-compute-mix-rust","bench-arithmetic-rust","bench-guess-rust"]]]) {
    for (const suf of suffixes) {
      const bin = join(dir, suf); const binE = bin + ".exe";
      const exe = existsSync(bin)?bin:existsSync(binE)?binE:null;
      if (exe) { console.log(`  ${key}...`); res[key] = runProc(exe); break; }
    }
  }

  const lln = join(dir, "benchmark.lln");
  if (existsSync(lln)) {
    console.log(`  logicn (governed)...`);
    res.logicnGoverned = await runLogicN(lln, "governed");
    console.log(`  logicn (manifest)...`);
    res.logicnManifest = await runLogicN(lln, "manifest");
  }

  return { benchmark: bench.id, results: res };
}

async function main() {
  const filterIdx = process.argv.indexOf("--benchmark");
  const filter    = filterIdx >= 0 ? process.argv[filterIdx+1] : null;
  const toRun     = filter ? BENCHMARKS.filter(b=>b.id===filter) : BENCHMARKS;
  const all       = [];

  for (const b of toRun) {
    console.log(`\n=== ${b.id} ===`);
    const r = await runBenchmark(b);
    all.push(r);
    console.log(JSON.stringify(r, null, 2));
  }

  const outPath = join(resultsDir, "latest.json");
  writeFileSync(outPath, JSON.stringify(all, null, 2));
  console.log(`\nResults: ${outPath}`);
}

main().catch(e => { console.error(e); process.exitCode=1; });
