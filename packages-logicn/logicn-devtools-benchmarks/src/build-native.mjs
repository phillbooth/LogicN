import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const benchDir  = join(__dirname, "..", "benchmarks");

// Output names must match the lookup in runner.mjs:
//   cpp  → bench-compute-mix  / bench-arithmetic  / bench-guess
//   rust → bench-compute-mix-rust / bench-arithmetic-rust / bench-guess-rust
const BENCHMARKS = [
  { dir: "compute-mix",          cpp: "bench.cpp", rs: "bench.rs", out: "bench-compute-mix" },
  { dir: "arithmetic-threshold", cpp: "bench.cpp", rs: "bench.rs", out: "bench-arithmetic" },
  { dir: "six-digit-guess",      cpp: "bench.cpp", rs: "bench.rs", out: "bench-guess" },
];

function tryCmd(label, cmd, opts = {}) {
  try {
    execSync(cmd, { stdio: "pipe", ...opts });
    console.log(`  [ok] ${label}`);
    return true;
  } catch {
    console.log(`  [skip] ${label} — not available`);
    return false;
  }
}

for (const b of BENCHMARKS) {
  const dir    = join(benchDir, b.dir);
  console.log(`\n=== ${b.dir} ===`);
  const cpp    = join(dir, b.cpp);
  const rs     = join(dir, b.rs);
  const cppOut = join(dir, b.out);
  const rsOut  = join(dir, b.out + "-rust");

  // ── C++ (try g++, clang++, then MSVC cl) ────────────────────────────────
  if (existsSync(cpp)) {
    tryCmd(`C++ ${b.dir} (g++)`,      `g++ -O2 -march=native -o "${cppOut}" "${cpp}" -lm`) ||
    tryCmd(`C++ ${b.dir} (clang++)`,  `clang++ -O2 -o "${cppOut}" "${cpp}" -lm`) ||
    tryCmd(`C++ ${b.dir} (MSVC cl)`,  `cl /O2 /EHsc "${cpp}" /Fe:"${cppOut}.exe"`, { cwd: dir });
  }

  // ── Rust ─────────────────────────────────────────────────────────────────
  if (existsSync(rs)) {
    tryCmd(`Rust ${b.dir}`, `rustc -O -o "${rsOut}" "${rs}"`);
  }
}
console.log("\nDone.");
