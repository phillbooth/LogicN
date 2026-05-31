import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

export async function runLogicNBenchmark(llnPath, mode = "governed") {
  const compilerPath = new URL("../../logicn-core-compiler/dist/index.js", import.meta.url);
  const m = await import(compilerPath.href);

  const source = readFileSync(llnPath, "utf8");
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

  // Correct signature: executeFlow(flowName, args, ast, knownFlows, enforcer, capabilityHost, runtimeOptions, executionPlans, manifest)
  const t1 = performance.now();
  try {
    const result = await m.executeFlow(
      mainFlow.name,       // flowName: string
      new Map(),           // args: Map<string, LogicNValue>
      parsed.ast,          // ast: AstNode
      parsed.flows,        // knownFlows: FlowMeta[]
      undefined,           // enforcer
      undefined,           // capabilityHost
      undefined,           // runtimeOptions
      undefined,           // executionPlans
      manifest,            // manifest (Phase R6 fast-path)
    );
    const execMs = performance.now() - t1;
    const val = result?.value ?? result;
    const isError = val?.__tag === "runtimeError";

    return {
      runtime:  `logicn-${mode}`,
      mode,
      parseMs:  Math.round(parseMs * 100) / 100,
      execMs:   Math.round(execMs * 100) / 100,
      totalMs:  Math.round((parseMs + execMs) * 100) / 100,
      result:   val,
      error:    isError,
      ...(isError ? { reason: val?.message } : {}),
    };
  } catch (e) {
    return {
      runtime: `logicn-${mode}`, error: true,
      reason: String(e), parseMs: Math.round(parseMs * 100) / 100,
    };
  }
}
