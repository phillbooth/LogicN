// =============================================================================
// LogicN Stage A - top-level runtime pipeline
// =============================================================================

import { parseProgram } from "./parser.js";
import { resolveSymbols } from "./symbol-resolver.js";
import { checkTypes } from "./type-checker.js";
import { checkValueStates } from "./value-state-checker.js";
import { checkEffects } from "./effect-checker.js";
import { executeFlow, type FlowExecutionResult, type LogicNValue } from "./interpreter.js";
import { buildFlowAuditEvent, createAuditWriter } from "./audit-writer.js";

export type RuntimeMode = "check-only" | "dev" | "production" | "deterministic";

export interface RuntimeOptions {
  readonly mode?: RuntimeMode;
  readonly auditFilePath?: string;
  readonly traceId?: string;
}

export interface RuntimeResult {
  readonly ok: boolean;
  readonly value?: LogicNValue;
  readonly execution?: FlowExecutionResult;
  readonly diagnostics: readonly { code: string; severity: string; message: string }[];
  readonly mode: RuntimeMode;
}

export function run(
  source: string,
  file: string,
  flowName: string,
  args: ReadonlyMap<string, LogicNValue> = new Map(),
  options: RuntimeOptions = {},
): RuntimeResult {
  const mode = options.mode ?? "dev";
  const allDiagnostics: Array<{ code: string; severity: string; message: string }> = [];

  const parseResult = parseProgram(source, file);
  for (const diagnostic of parseResult.diagnostics) {
    allDiagnostics.push({
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message,
    });
  }

  const symbolResult = resolveSymbols(parseResult.ast);
  for (const diagnostic of symbolResult.diagnostics) {
    allDiagnostics.push({
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message,
    });
  }

  const typeResult = checkTypes(parseResult.ast);
  for (const diagnostic of typeResult.diagnostics) {
    allDiagnostics.push({
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message,
    });
  }

  const valueStateResult = checkValueStates(parseResult.ast);
  for (const diagnostic of valueStateResult.diagnostics) {
    allDiagnostics.push({
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message,
    });
  }

  const effectResults = checkEffects(parseResult.flows, parseResult.ast);
  for (const result of effectResults) {
    for (const diagnostic of result.diagnostics) {
      allDiagnostics.push({
        code: diagnostic.code,
        severity: diagnostic.severity,
        message: diagnostic.message,
      });
    }
  }

  const hasErrors = allDiagnostics.some((diagnostic) => diagnostic.severity === "error");
  if (mode === "check-only" || hasErrors) {
    return { ok: !hasErrors, diagnostics: allDiagnostics, mode };
  }

  const execution = executeFlow(flowName, args, parseResult.ast, parseResult.flows);
  for (const diagnostic of execution.diagnostics) {
    allDiagnostics.push({
      code: diagnostic.code,
      severity: "error",
      message: diagnostic.message,
    });
  }

  if (mode === "production" || mode === "deterministic") {
    const writer = createAuditWriter(
      options.auditFilePath === undefined ? "memory" : "file",
      options.auditFilePath,
    );
    const auditEvent = buildFlowAuditEvent(
      flowName,
      execution.audit.qualifier,
      execution.value.__tag === "runtimeError" || execution.value.__tag === "error" ? "Failed" : "Success",
      options.traceId ?? `trace_${Date.now()}`,
      execution.auditEntries,
    );
    writer.append(auditEvent);
    writer.flush();
  }

  const isError = execution.value.__tag === "runtimeError" || execution.value.__tag === "error";
  return {
    ok: !isError,
    value: execution.value,
    execution,
    diagnostics: allDiagnostics,
    mode,
  };
}
