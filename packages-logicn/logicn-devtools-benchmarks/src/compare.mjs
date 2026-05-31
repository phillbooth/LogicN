import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const dataPath  = join(__dirname, "..", "results", "latest.json");

const ORDER = ["rust","cpp","nodejs","python","logicnManifest","logicnGoverned"];
const LABEL = {
  rust:"Rust",
  cpp:"C++",
  nodejs:"Node.js",
  python:"Python",
  logicnManifest:"LogicN (manifest)",
  logicnGoverned:"LogicN (governed)",
};

function metric(r) {
  if (!r || r.error) return null;
  if (r.operationsPerSecond)  return r.operationsPerSecond;
  if (r.additionsPerSecond)   return r.additionsPerSecond;
  if (r.attemptsPerSecond)    return r.attemptsPerSecond;
  if (r.execMs && r.execMs>0) return 1000/r.execMs;
  return null;
}

function fmt(n) {
  if (n===null) return "--";
  if (n>=1e9) return (n/1e9).toFixed(2)+"B/s";
  if (n>=1e6) return (n/1e6).toFixed(2)+"M/s";
  if (n>=1e3) return (n/1e3).toFixed(1)+"K/s";
  return n.toFixed(1)+"/s";
}

let data;
try { data = JSON.parse(readFileSync(dataPath,"utf8")); }
catch { console.error("No results found. Run: npm run run"); process.exit(1); }

console.log("# LogicN Benchmark Results\n");
console.log("| Benchmark | Rust | C++ | Node.js | Python | LogicN manifest | LogicN governed | Node/LogicN |");
console.log("|---|---|---|---|---|---|---|---|");

for (const bench of data) {
  const m = {};
  for (const rt of ORDER) m[rt] = metric(bench.results?.[rt]);
  const row = [bench.benchmark];
  for (const rt of ORDER) row.push(fmt(m[rt]));
  const ratio = (m.nodejs && m.logicnGoverned) ? (m.nodejs/m.logicnGoverned).toFixed(1)+"x" : "--";
  row.push(ratio);
  console.log("| "+row.join(" | ")+" |");
}

console.log("\n## Individual Benchmark Details\n");
for (const bench of data) {
  console.log(`### ${bench.benchmark}\n`);
  console.log("| Runtime | Throughput | vs Python | vs Node.js |");
  console.log("|---|---|---|---|");
  const m = {};
  for (const rt of ORDER) m[rt] = metric(bench.results?.[rt]);
  const py = m.python, node = m.nodejs;
  for (const rt of ORDER) {
    const v = m[rt]; if (!v) continue;
    const vsPy   = py   ? (v/py  ).toFixed(1)+"x" : "--";
    const vsNode = node ? (v/node).toFixed(1)+"x" : "--";
    console.log(`| ${LABEL[rt]} | ${fmt(v)} | ${vsPy} | ${vsNode} |`);
  }
  console.log();
}
