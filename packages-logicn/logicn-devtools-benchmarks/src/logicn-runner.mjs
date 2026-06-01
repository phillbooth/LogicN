import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

/**
 * Runs a LogicN .lln benchmark file through the governed interpreter.
 * Captures parse time, execution time, memory before/after, and CPU usage.
 */
export async function runLogicNBenchmark(llnPath, mode = "governed") {
  const compilerPath = new URL("../../logicn-core-compiler/dist/index.js", import.meta.url);
  const m = await import(compilerPath.href);

  const source = readFileSync(llnPath, "utf8");

  // ── Parse ──────────────────────────────────────────────────────────────────
  const t0 = performance.now();
  const parsed = m.parseProgram(source, llnPath);
  const parseMs = performance.now() - t0;

  const errors = parsed.diagnostics.filter(d => d.severity === "error");
  if (errors.length > 0) {
    return {
      runtime: `logicn-${mode}`, error: true,
      parseErrors: errors.length, firstError: errors[0]?.message,
      parseMs: Math.round(parseMs * 100) / 100,
    };
  }

  const mainFlow = parsed.flows.find(f => f.name === "main") ?? parsed.flows[0];
  if (!mainFlow) return { runtime: `logicn-${mode}`, error: true, reason: "No flow found" };

  let manifest;
  if (mode === "manifest") {
    try {
      const eff = m.checkEffects(parsed.flows, parsed.ast);
      const gov = m.verifyGovernance(parsed.ast, parsed.flows, eff, "production");
      manifest = gov.runtimeManifests.find(r => r.flow === mainFlow.name);
    } catch { manifest = undefined; }
  }

  // Clear the pure-flow memoization cache between benchmark files.
  // All benchmarks use "main()" with no args — without clearing, the cached
  // result from one benchmark would be served to the next.
  m.clearPureFlowCache?.();

  // ── Memory + CPU snapshot before execution ─────────────────────────────────
  // Run GC hint if available (Node.js --expose-gc flag) to get a clean baseline
  if (typeof globalThis.gc === "function") globalThis.gc();

  const memBefore  = process.memoryUsage();
  const cpuBefore  = process.cpuUsage();
  const t1         = performance.now();

  // ── Execute ────────────────────────────────────────────────────────────────
  let result;
  let execError;
  try {
    // pureFastPath: true enables LRU memoization for pure EffectFree flows
    // sourceTag: the benchmark file path scopes the cache so "main()" in
    // arithmetic-threshold doesn't collide with "main()" in compute-mix.
    const runtimeOpts = { pureFastPath: true, sourceTag: llnPath };
    result = await m.executeFlow(
      mainFlow.name, new Map(), parsed.ast, parsed.flows,
      undefined, undefined, runtimeOpts, undefined, manifest,
    );
  } catch (e) {
    execError = e;
  }

  // ── Memory + CPU snapshot after execution ──────────────────────────────────
  const execMs    = performance.now() - t1;
  const cpuAfter  = process.cpuUsage(cpuBefore);
  const memAfter  = process.memoryUsage();

  if (execError) {
    return {
      runtime: `logicn-${mode}`, error: true,
      reason: String(execError), parseMs: Math.round(parseMs * 100) / 100,
    };
  }

  const val      = result?.value ?? result;
  const isError  = val?.__tag === "runtimeError";

  // Memory delta (bytes)
  const heapDelta = memAfter.heapUsed - memBefore.heapUsed;
  const rssDelta  = memAfter.rss - memBefore.rss;

  // Throughput — operations implied by the benchmark
  // For LogicN we report exec-iterations-per-second as a proxy
  const iterPerSec = execMs > 0 ? Math.round(1000 / execMs) : 0;

  return {
    runtime:        `logicn-${mode}`,
    mode,
    parseMs:        Math.round(parseMs * 100) / 100,
    execMs:         Math.round(execMs * 100) / 100,
    totalMs:        Math.round((parseMs + execMs) * 100) / 100,
    result:         val,
    error:          isError,
    ...(isError ? { reason: val?.message } : {}),

    // Throughput proxy
    runsPerSecond:  iterPerSec,

    // CPU
    cpu: {
      userMs:         Number((cpuAfter.user   / 1000).toFixed(3)),
      systemMs:       Number((cpuAfter.system / 1000).toFixed(3)),
      totalMs:        Number(((cpuAfter.user + cpuAfter.system) / 1000).toFixed(3)),
    },

    // Memory
    memory: {
      heapUsedBefore:  memBefore.heapUsed,
      heapUsedAfter:   memAfter.heapUsed,
      heapUsedDelta:   heapDelta,
      rssBefore:       memBefore.rss,
      rssAfter:        memAfter.rss,
      rssDelta:        rssDelta,
      externalBefore:  memBefore.external,
      externalAfter:   memAfter.external,
      externalDelta:   memAfter.external - memBefore.external,
    },
  };
}
