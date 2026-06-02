import { runWASMBenchmark } from "../../src/wasm-runner.mjs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
const __dir = dirname(fileURLToPath(import.meta.url));
export async function runWasmBenchmark() {
  const base = await runWASMBenchmark(join(__dir, "benchmark.lln"), 32 * 32);
  if (base.error) return base;
  return { ...base, notes: [...(base.notes ?? []), "LogicN integer matmul (scaled ×1000) compiled to WASM"] };
}
