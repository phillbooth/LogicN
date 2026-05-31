import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const benchDir  = join(__dirname, "..", "benchmarks");

const BENCHMARKS = [
  { dir: "compute-mix",          cpp: "bench.cpp", rs: "bench.rs", out: "bench-compute-mix" },
  { dir: "arithmetic-threshold", cpp: "bench.cpp", rs: "bench.rs", out: "bench-arithmetic" },
  { dir: "six-digit-guess",      cpp: "bench.cpp", rs: "bench.rs", out: "bench-guess" },
];

function tryCmd(label, cmd) {
  try { execSync(cmd, { stdio: "pipe" }); console.log(`  [ok] ${label}`); return true; }
  catch { console.log(`  [skip] ${label} — not available`); return false; }
}

for (const b of BENCHMARKS) {
  const dir = join(benchDir, b.dir);
  console.log(`\n=== ${b.dir} ===`);
  const cpp = join(dir, b.cpp), rs = join(dir, b.rs);
  const cppOut = join(dir, b.out);
  const rsOut  = join(dir, b.out + "-rust");
  if (existsSync(cpp)) {
    tryCmd(`C++ ${b.dir}`, `g++ -O2 -march=native -o "${cppOut}" "${cpp}" -lm`) ||
    tryCmd(`C++ ${b.dir} (clang)`, `clang++ -O2 -o "${cppOut}" "${cpp}" -lm`);
  }
  if (existsSync(rs)) {
    tryCmd(`Rust ${b.dir}`, `rustc -O -o "${rsOut}" "${rs}"`);
  }
}
console.log("\nDone.");
