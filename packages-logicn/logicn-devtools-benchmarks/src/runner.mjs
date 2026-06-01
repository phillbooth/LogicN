import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const benchDir   = join(__dirname, "..", "benchmarks");
const resultsDir  = join(__dirname, "..", "results");

// opsPerRun: how many operations the LogicN .lln benchmark does per flow call.
// Used to normalise runsPerSecond → ops/second for fair comparison.
// passiveCallCount: how many outer-loop calls to make in passive mode.
//   Heavy benchmarks (internal loops doing thousands of ops): use 3 calls
//   → just enough to measure warm-path overhead without running for minutes.
//   Light benchmarks (tiny single-op flows): use 1000 calls
//   → gives stable throughput measurement.
//
// Rule of thumb: passiveCallCount × execMs < 1000ms (keep passive < 1s total)
const BENCHMARKS = [
  { id: "compute-mix",          dir: "compute-mix",          logicnOpsPerRun: 50000, timeBased: true, passiveCallCount: 3  },
  { id: "arithmetic-threshold", dir: "arithmetic-threshold", logicnOpsPerRun: null,                   passiveCallCount: 3  },
  { id: "six-digit-guess",      dir: "six-digit-guess",      logicnOpsPerRun: null,                   passiveCallCount: 3  },
  { id: "record-allocation",    dir: "record-allocation",    logicnOpsPerRun: 10000,                  passiveCallCount: 20 },
  { id: "fibonacci-recursive",  dir: "fibonacci-recursive",  logicnOpsPerRun: 1,                      passiveCallCount: 5  },
  { id: "collection-pipeline",  dir: "collection-pipeline",  logicnOpsPerRun: 10000,                  passiveCallCount: 30 },
  { id: "governance-cost",      dir: "governance-cost",      logicnOpsPerRun: 1,                      passiveCallCount: 100 },
  { id: "hardware-targets",     dir: "hardware-targets",     logicnOpsPerRun: 1,                      passiveCallCount: 1000 },
];

function runProc(cmd, args=[]) {
  const r = spawnSync(cmd, args, { encoding:"utf8", timeout:180000 });
  if (r.status !== 0 || !r.stdout?.trim()) return null;
  try { return JSON.parse(r.stdout.trim()); } catch { return null; }
}

async function runLogicN(llnPath, mode, bench) {
  try {
    const { runLogicNBenchmark, runLogicNPassiveBenchmark } = await import("./logicn-runner.mjs");
    if (mode === "passive") {
      const callCount = bench?.passiveCallCount ?? 10;
      return await runLogicNPassiveBenchmark(llnPath, callCount);
    }
    return await runLogicNBenchmark(llnPath, mode);
  } catch(e) { return { error: true, reason: String(e), runtime: `logicn-${mode}` }; }
}

async function runBenchmark(bench) {
  const dir = join(benchDir, bench.dir);
  const res = {};

  // time-based benchmarks get --target-ms flag to override defaults in quick mode
  const timeBased  = bench.timeBased === true;
  const targetArgs = timeBased && QUICK_MODE ? ["--target-ms", "3000", "--warmup-ms", "500"] : [];

  const node = join(dir, "node.mjs");
  if (existsSync(node)) { console.log(`  node...`); res.nodejs = runProc("node", [node, ...targetArgs]); }

  const py = join(dir, "python.py");
  if (existsSync(py)) { console.log(`  python...`); res.python = runProc("python3",[py, ...targetArgs]) ?? runProc("python",[py, ...targetArgs]); }

  // ── Native hardware variants ─────────────────────────────────────────────
  // Naming convention:
  //   bench-native-rust        — generic x86-64 (safe, runs everywhere)
  //   bench-native-avx2        — AVX2 optimised (i5+, 256-bit SIMD)
  //   bench-native-avx512      — AVX-512 optimised (i9 HX/K only)
  //   bench-compute-mix-rust   — legacy name (kept for backwards compat)
  //   bench-arithmetic-rust    — legacy name
  //   bench-guess-rust         — legacy name
  for (const [key, suffixes] of [
    ["cpp",       ["bench-compute-mix","bench-arithmetic","bench-guess"]],
    ["rust",      ["bench-native-rust","bench-compute-mix-rust","bench-arithmetic-rust","bench-guess-rust"]],
    ["rustAvx2",  ["bench-native-avx2"]],
    ["rustAvx512",["bench-native-avx512"]],  // only populated on i9 machines
  ]) {
    for (const suf of suffixes) {
      const bin = join(dir, suf); const binE = bin + ".exe";
      const exe = existsSync(bin)?bin:existsSync(binE)?binE:null;
      if (exe) { console.log(`  ${key}...`); res[key] = runProc(exe); break; }
    }
  }

  // ── WASM execution (Phase 27 — requires wat-wasm assembler) ─────────────
  // When bench-native-wasm.mjs exists, it executes the WAT-compiled flow via
  // WebAssembly.instantiate and measures execution throughput.
  const wasmRunner = join(dir, "bench-wasm.mjs");
  if (existsSync(wasmRunner)) {
    console.log(`  wasm...`);
    try { res.wasm = await (await import(wasmRunner)).runWasmBenchmark(); }
    catch(e) { res.wasm = { error: true, reason: String(e), runtime: "wasm" }; }
  }

  const lln = join(dir, "benchmark.lln");
  if (existsSync(lln)) {
    console.log(`  logicn (governed)...`);
    res.logicnGoverned = await runLogicN(lln, "governed", bench);
    console.log(`  logicn (manifest)...`);
    res.logicnManifest = await runLogicN(lln, "manifest", bench);
    console.log(`  logicn (passive)...`);
    res.logicnPassive = await runLogicN(lln, "passive", bench);
  }

  // Add normalised throughput for LogicN results
  // ops/sec = opsPerRun × runsPerSec  OR  result.value (if that IS the op count)
  for (const key of ["logicnGoverned", "logicnManifest"]) {
    const r = res[key];
    if (!r || r.error) continue;
    const resultValue = r.result?.__tag === "int" ? r.result.value : null;
    const opsPerRun   = bench.logicnOpsPerRun ?? resultValue ?? null;
    if (opsPerRun !== null && r.execMs > 0) {
      r.logicnOpsPerSecond = Math.round((opsPerRun / r.execMs) * 1000);
      r.logicnOpsPerRun    = opsPerRun;
    }
  }

  return { benchmark: bench.id, results: res };
}

// --quick: use 3s for time-based benchmarks (compute-mix), halve iteration counts.
// Good for CI and development feedback. Use without --quick for publication numbers.
export const QUICK_MODE = process.argv.includes("--quick");

async function main() {
  const filterIdx = process.argv.indexOf("--benchmark");
  const filter    = filterIdx >= 0 ? process.argv[filterIdx+1] : null;
  const toRun     = filter ? BENCHMARKS.filter(b=>b.id===filter) : BENCHMARKS;
  if (QUICK_MODE) console.log("⚡ Quick mode: 3s compute-mix, reduced iteration counts");
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
