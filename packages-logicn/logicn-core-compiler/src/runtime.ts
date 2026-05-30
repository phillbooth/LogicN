// =============================================================================
// LogicN Stage A — top-level runtime pipeline
//
// Chains all compiler passes and execution in the correct order:
//   Parse → Symbol Resolve → Type Check → Value-State Check → Effect Check
//   → Governance Verify → GIR Emit → Execute → Audit → Proof Chain
// =============================================================================

import { parseProgram } from "./parser.js";
import { resolveSymbols } from "./symbol-resolver.js";
import { checkTypes } from "./type-checker.js";
import { checkValueStates } from "./value-state-checker.js";
import { checkEffects } from "./effect-checker.js";
import { verifyGovernance, type GovernanceDiagnostic, type DeploymentProfile } from "./governance-verifier.js";
import { emitGIR } from "./gir-emitter.js";
import { executeFlow, type FlowExecutionResult, type LogicNValue } from "./interpreter.js";
import { buildFlowAuditEvent, createAuditWriter } from "./audit-writer.js";
import { buildProofChain, type ExecutionProofChain } from "./proof-chain.js";
import { startServer, type RunningServer, type ServerConfig } from "./route-dispatcher.js";
import { buildRouteRegistry } from "./route-registry.js";
import { buildAttestation, signAttestation, type LogicNAttestation, type AttestationKeyPair } from "./attestation.js";

export type RuntimeMode = "check-only" | "dev" | "production" | "deterministic";

export interface RuntimeOptions {
  readonly mode?: RuntimeMode;
  readonly auditFilePath?: string;
  readonly traceId?: string;
  readonly port?: number;
  readonly host?: string;
  readonly flowName?: string;
  readonly attestation?: {
    readonly keyPair?: AttestationKeyPair;
    readonly includeSource?: boolean;
  };
}

export interface RuntimeResult {
  readonly ok: boolean;
  readonly value?: LogicNValue;
  readonly execution?: FlowExecutionResult;
  readonly diagnostics: readonly { code: string; severity: string; message: string }[];
  readonly governanceDiagnostics: readonly GovernanceDiagnostic[];
  readonly proofChain?: ExecutionProofChain;
  readonly attestation?: LogicNAttestation;
  readonly mode: RuntimeMode;
}

export async function run(
  source: string,
  file: string,
  flowName: string,
  args: ReadonlyMap<string, LogicNValue> = new Map(),
  options: RuntimeOptions = {},
): Promise<RuntimeResult> {
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

  // Pass 7: Governance verification (runs even in check-only, uses profile to adjust severity)
  const profile = (mode === "check-only" ? "dev" : mode) as DeploymentProfile;
  const govResult = verifyGovernance(parseResult.ast, parseResult.flows, effectResults, profile);

  if (mode === "check-only" || hasErrors) {
    return {
      ok: !hasErrors,
      diagnostics: allDiagnostics,
      governanceDiagnostics: govResult.diagnostics,
      mode,
    };
  }

  // Pass 8: GIR emission (on clean AST)
  const girResult = emitGIR(parseResult.ast, parseResult.flows, effectResults);

  // Pass 10: Execute
  const execution = await executeFlow(flowName, args, parseResult.ast, parseResult.flows);
  for (const diagnostic of execution.diagnostics) {
    allDiagnostics.push({
      code: diagnostic.code,
      severity: "error",
      message: diagnostic.message,
    });
  }

  // Audit + proof chain
  const writer = createAuditWriter(
    options.auditFilePath !== undefined ? "file" : "memory",
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

  // Build proof chain in production / deterministic modes
  let proofChain: ExecutionProofChain | undefined;
  if (mode === "production" || mode === "deterministic") {
    proofChain = buildProofChain({
      source,
      gir: girResult.gir,
      auditEvents: writer.getEvents(),
      evidence: [writer.getEvidenceRecord()],
      denials: writer.getDenials(),
    });
  }

  // Build attestation if requested
  let attestationResult: LogicNAttestation | undefined;
  if (options.attestation !== undefined) {
    const includeSource = options.attestation.includeSource !== false;
    const attestInputs: import("./attestation.js").AttestationInputs = {
      flowName: options.flowName ?? flowName,
      ...(includeSource ? { sourceText: source } : {}),
      ...(girResult !== undefined ? { girJson: JSON.stringify(girResult) } : {}),
      ...(proofChain !== undefined ? { auditProofJson: JSON.stringify(proofChain) } : {}),
    };
    let att = await buildAttestation(attestInputs);
    if (options.attestation.keyPair !== undefined) {
      att = signAttestation(att, options.attestation.keyPair);
    }
    attestationResult = att;
  }

  const isError = execution.value.__tag === "runtimeError" || execution.value.__tag === "error";
  return {
    ok: !isError,
    value: execution.value,
    execution,
    diagnostics: allDiagnostics,
    governanceDiagnostics: govResult.diagnostics,
    ...(proofChain !== undefined ? { proofChain } : {}),
    ...(attestationResult !== undefined ? { attestation: attestationResult } : {}),
    mode,
  };
}

export async function serve(
  source: string,
  file: string,
  serverConfig: ServerConfig,
  options: RuntimeOptions = {},
): Promise<RunningServer> {
  const _mode = options.mode ?? "dev";
  void _mode;

  const parseResult = parseProgram(source, file);
  const symbolResult = resolveSymbols(parseResult.ast);
  const typeResult = checkTypes(parseResult.ast);
  const valueStateResult = checkValueStates(parseResult.ast);
  const effectResults = checkEffects(parseResult.flows, parseResult.ast);

  const allDiagnostics = [
    ...parseResult.diagnostics,
    ...symbolResult.diagnostics,
    ...typeResult.diagnostics,
    ...valueStateResult.diagnostics,
    ...effectResults.flatMap((result) => result.diagnostics),
  ];

  const hasErrors = allDiagnostics.some((diagnostic) => diagnostic.severity === "error");
  if (hasErrors) {
    const codes = allDiagnostics
      .filter((diagnostic) => diagnostic.severity === "error")
      .map((diagnostic) => diagnostic.code)
      .join(", ");
    throw new Error(`LogicN: cannot serve - compiler errors: ${codes}`);
  }

  const registry = buildRouteRegistry(parseResult.ast);
  if (registry.routes.length === 0) {
    throw new Error("LogicN: no routes declared - nothing to serve");
  }

  return startServer(parseResult.ast, parseResult.flows, serverConfig);
}
