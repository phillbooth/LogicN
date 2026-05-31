// =============================================================================
// LogicN Pass 8 - Governed Intermediate Representation emitter
// =============================================================================

import { type AstNode, type AstNodeKind, type FlowMeta, type SourceLocation } from "./parser.js";
import { type EffectCheckResult } from "./effect-checker.js";
import { SemanticGraphBuilder, type SemanticGraph } from "@logicn/devtools-graph-algorithms";
import { buildExecutionPlan as _buildExecutionPlanImpl } from "./runtime/executionPlan.js";
import type { PassiveExecutionPlan } from "./runtime/executionPlan.js";

export interface GIREffect {
  readonly declared: readonly string[];
  readonly observed: readonly string[];
  readonly status: "compliant" | "violation";
}

export interface GIRIntent {
  readonly declared: string | null;
  readonly status: "satisfied" | "mismatch" | null;
}

export interface GIRProtectedValue {
  readonly name: string;
  readonly type: string;
}

export interface GIRAudit {
  readonly protected_values_redacted: boolean;
}

export interface GIRExecution {
  readonly preferred: readonly string[];
  readonly denied: readonly string[];
  readonly fallback: string | null;
}

export interface GIRProof {
  readonly name: string;
  readonly status: "satisfied" | "missing" | "failed";
}

export interface GIRTensorInfo {
  /** Binding name that holds the tensor value. */
  readonly name: string;
  /** Full type annotation string, e.g. "Tensor<Float32, [Batch, 768]>". */
  readonly type: string;
  /** Element type, e.g. "Float32". */
  readonly elementType: string;
  /** Shape descriptor, e.g. "[Batch, 768]" or "DynamicShape". */
  readonly shape: string;
  /**
   * True when the element type and shape are known to be compatible with
   * photonic target bridges. Float16/Float32 with concrete or dynamic shapes
   * are compatible. Int8 (quantized) requires explicit dequantization.
   */
  readonly photonic_compatible: boolean;
}

export interface GIRTargetAffinity {
  /** Suggested compute targets based on declared effects (planning hint). */
  readonly suggested: readonly string[];
  /** Human-readable reason for the suggestion. */
  readonly reason: string;
}

export interface GIRFlow {
  readonly name: string;
  readonly qualifier: "flow" | "pure" | "guarded" | "secure";
  readonly effects: GIREffect;
  readonly intent: GIRIntent;
  readonly protected_values: readonly GIRProtectedValue[];
  readonly audit: GIRAudit;
  readonly execution: GIRExecution;
  readonly proofs: readonly GIRProof[];
  /** Tensor binding metadata for compute planning. Empty when no tensors present. */
  readonly tensors: readonly GIRTensorInfo[];
  /** Target affinity hint derived from declared effects. Absent when no hint needed. */
  readonly target_affinity?: GIRTargetAffinity;
  /** Phase 15: pre-verified execution plan. Present when built via buildExecutionPlan. */
  readonly executionPlan?: PassiveExecutionPlan;
}

export interface GIRProgram {
  readonly schemaVersion: "lln.gir.v1";
  readonly generatedAt: string;
  readonly flows: readonly GIRFlow[];
}

export interface GIREmitResult {
  readonly gir: GIRProgram;
  readonly diagnostics: readonly { code: string; message: string }[];
}

// ---------------------------------------------------------------------------
// GIR expression representation — used by emitExpr for body analysis passes
// ---------------------------------------------------------------------------

export interface GIRRecordField {
  readonly name: string;
  readonly value: GIRExpr;
}

export type GIRExpr =
  | { readonly kind: "recordLiteral"; readonly fields: readonly GIRRecordField[]; readonly location?: SourceLocation }
  | { readonly kind: "callExpr"; readonly name: string; readonly args: readonly GIRExpr[]; readonly location?: SourceLocation }
  | { readonly kind: "identifier"; readonly name: string; readonly location?: SourceLocation }
  | { readonly kind: "stringLiteral"; readonly value: string; readonly location?: SourceLocation }
  | { readonly kind: "numberLiteral"; readonly value: string; readonly location?: SourceLocation }
  | { readonly kind: "void" };

/**
 * Converts an AstNode expression into a typed GIRExpr.
 *
 * Handles the `#record` special form explicitly so that record literals
 * are never silently skipped — downstream passes receive a typed
 * `recordLiteral` node with named fields they can inspect.
 */
export function emitExpr(node: AstNode): GIRExpr {
  if (node.kind === "callExpr" && node.value === "#record") {
    // Record literal: { field: value, ... }
    return {
      kind: "recordLiteral",
      fields: (node.children ?? []).map((child) => ({
        name: child.value ?? "<field>",
        value: child.children?.[0] !== undefined ? emitExpr(child.children[0]) : { kind: "void" },
      })),
      ...(node.location !== undefined ? { location: node.location } : {}),
    };
  }

  if (node.kind === "callExpr") {
    return {
      kind: "callExpr",
      name: node.value ?? "<call>",
      args: (node.children ?? []).map((child) => emitExpr(child)),
      ...(node.location !== undefined ? { location: node.location } : {}),
    };
  }

  if (node.kind === "identifier") {
    return {
      kind: "identifier",
      name: node.value ?? "<id>",
      ...(node.location !== undefined ? { location: node.location } : {}),
    };
  }

  if (node.kind === "stringLiteral") {
    return {
      kind: "stringLiteral",
      value: node.value ?? "",
      ...(node.location !== undefined ? { location: node.location } : {}),
    };
  }

  if (node.kind === "numberLiteral") {
    return {
      kind: "numberLiteral",
      value: node.value ?? "",
      ...(node.location !== undefined ? { location: node.location } : {}),
    };
  }

  return { kind: "void" };
}

const FLOW_KINDS: readonly AstNodeKind[] = [
  "flowDecl",
  "secureFlowDecl",
  "pureFlowDecl",
  "guardedFlowDecl",
];

export function emitGIR(
  ast: AstNode,
  flows: readonly FlowMeta[],
  effectResults: readonly EffectCheckResult[],
): GIREmitResult {
  const resultByFlow = new Map(effectResults.map((result) => [result.flowName, result]));

  const girFlows = flows.map((flow) => {
    const flowNode = findFlowNode(ast, flow.name);
    const effectResult = resultByFlow.get(flow.name);
    const observed = [...(effectResult?.observedEffects ?? [])];
    const declaredSet = new Set(flow.declaredEffects);
    const effectsStatus = observed.every((effect) => declaredSet.has(effect))
      ? "compliant"
      : "violation";

    const protectedValues = flowNode === undefined ? [] : extractProtectedValues(flowNode);
    const protectedValuesRedacted =
      flowNode === undefined || protectedValues.every((value) => isRedactedInFlow(flowNode, value.name));
    const declaredIntent = flowNode === undefined ? null : extractIntent(flowNode);
    const intent: GIRIntent = {
      declared: declaredIntent,
      status: declaredIntent === null ? null : "satisfied",
    };
    const audit: GIRAudit = { protected_values_redacted: protectedValuesRedacted };
    const effects: GIREffect = {
      declared: [...flow.declaredEffects],
      observed,
      status: effectsStatus,
    };

    const tensors = flowNode === undefined ? [] : extractTensors(flowNode);
    const targetAffinity = inferTargetAffinity(flow.declaredEffects, tensors);

    const flowGIR: GIRFlow = {
      name: flow.name,
      qualifier: flow.qualifier,
      effects,
      intent,
      protected_values: protectedValues,
      audit,
      execution: flowNode === undefined ? defaultExecution() : extractExecution(flowNode),
      proofs: buildProofs(effects, intent, audit, protectedValues),
      tensors,
      ...(targetAffinity !== undefined ? { target_affinity: targetAffinity } : {}),
    };
    return flowGIR;
  });

  return {
    gir: {
      schemaVersion: "lln.gir.v1",
      generatedAt: new Date().toISOString(),
      flows: girFlows,
    },
    diagnostics: [],
  };
}

export function findNodes(root: AstNode, kind: AstNodeKind): AstNode[] {
  const found: AstNode[] = [];

  function walk(node: AstNode): void {
    if (node.kind === kind) found.push(node);
    for (const child of node.children ?? []) walk(child);
  }

  walk(root);
  return found;
}

function findFlowNode(ast: AstNode, name: string): AstNode | undefined {
  function walk(node: AstNode): AstNode | undefined {
    if (FLOW_KINDS.includes(node.kind) && node.value === name) return node;
    for (const child of node.children ?? []) {
      const found = walk(child);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  return walk(ast);
}

function extractIntent(flowNode: AstNode): string | null {
  const intentNode = findNodes(flowNode, "intentDecl")[0];
  const value = intentNode?.value?.trim();
  return value === undefined || value === "" ? null : stripStringQuotes(value);
}

function extractProtectedValues(flowNode: AstNode): GIRProtectedValue[] {
  const declarations = [
    ...findNodes(flowNode, "letDecl"),
    ...findNodes(flowNode, "mutDecl"),
    ...findNodes(flowNode, "readonlyDecl"),
  ];
  const values: GIRProtectedValue[] = [];

  for (const declaration of declarations) {
    const parsed = parseBindingValue(declaration.value ?? "");
    if (parsed?.type.startsWith("protected ") === true) {
      values.push({
        name: parsed.name,
        type: parsed.type.slice("protected ".length).trim(),
      });
    }
  }

  return values;
}

function parseBindingValue(raw: string): { readonly name: string; readonly type: string } | undefined {
  let input = raw.trim();
  if (input.startsWith("unsafe ")) input = input.slice("unsafe ".length).trim();
  if (input.startsWith("safe ")) input = input.slice("safe ".length).trim();

  const colon = input.indexOf(":");
  if (colon < 0) return undefined;

  const name = input.slice(0, colon).trim();
  const type = input.slice(colon + 1).trim();
  if (name === "" || type === "") return undefined;

  return { name, type };
}

function isRedactedInFlow(flowNode: AstNode, protectedName: string): boolean {
  return findNodes(flowNode, "callExpr").some((call) =>
    call.value === "redact" && hasIdentifierDescendant(call, protectedName),
  );
}

function hasIdentifierDescendant(node: AstNode, value: string): boolean {
  if (node.kind === "identifier" && node.value === value) return true;
  return (node.children ?? []).some((child) => hasIdentifierDescendant(child, value));
}

function extractExecution(flowNode: AstNode): GIRExecution {
  const compute = findNodes(flowNode, "computeTargetBlock")[0];
  if (compute === undefined) return defaultExecution();

  const preferred: string[] = [];
  const denied: string[] = [];
  let fallback: string | null = null;
  const entries = flattenComputeEntries(compute);

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry?.kind !== "identifier") continue;

    if (entry.value === "prefer") {
      preferred.push(...identifiersFromNode(entries[index + 1]));
    } else if (entry.value === "deny") {
      denied.push(...identifiersFromNode(entries[index + 1]));
    } else if (entry.value === "fallback") {
      const next = entries[index + 1];
      if (next?.kind === "identifier" && next.value !== undefined) {
        fallback = next.value;
      }
    }
  }

  return {
    preferred: preferred.length > 0 ? unique(preferred) : ["cpu"],
    denied: unique(denied),
    fallback,
  };
}

function defaultExecution(): GIRExecution {
  return { preferred: ["cpu"], denied: [], fallback: null };
}

function flattenComputeEntries(node: AstNode): AstNode[] {
  if (node.kind === "block" || node.kind === "computeTargetBlock") {
    return (node.children ?? []).flatMap((child) => flattenComputeEntries(child));
  }
  return [node];
}

function identifiersFromNode(node: AstNode | undefined): string[] {
  if (node === undefined) return [];
  if (node.kind === "identifier" && node.value !== undefined) return [node.value];
  return (node.children ?? []).flatMap((child) => identifiersFromNode(child));
}

function buildProofs(
  effects: GIREffect,
  intent: GIRIntent,
  audit: GIRAudit,
  protectedValues: readonly GIRProtectedValue[],
): GIRProof[] {
  const proofs: GIRProof[] = [
    {
      name: "effects_declared",
      status: effects.status === "compliant" ? "satisfied" : "failed",
    },
  ];

  if (intent.declared !== null) {
    proofs.push({ name: "intent_matches_behavior", status: "satisfied" });
  }

  if (audit.protected_values_redacted) {
    proofs.push({ name: "protected_values_redacted", status: "satisfied" });
  } else if (protectedValues.length > 0) {
    proofs.push({ name: "protected_values_redacted", status: "missing" });
  }

  return proofs;
}

// ---------------------------------------------------------------------------
// Tensor shape inference (Phase 8A — type annotation based)
// ---------------------------------------------------------------------------

/** Photonic-compatible float types (full and half precision). */
const PHOTONIC_FLOAT_TYPES = new Set(["Float16", "Float32", "Float"]);

/**
 * Extracts tensor binding metadata from a flow node.
 * Looks for letDecl/mutDecl bindings whose type annotation starts with "Tensor".
 */
function extractTensors(flowNode: AstNode): GIRTensorInfo[] {
  const declarations = [
    ...findNodes(flowNode, "letDecl"),
    ...findNodes(flowNode, "mutDecl"),
    ...findNodes(flowNode, "readonlyDecl"),
  ];
  const tensors: GIRTensorInfo[] = [];

  for (const decl of declarations) {
    const parsed = parseBindingValue(decl.value ?? "");
    if (parsed === undefined) continue;

    const typeStr = parsed.type;
    // Check for Tensor<ElementType, Shape> annotation
    if (!typeStr.startsWith("Tensor<") && typeStr !== "AnyTensor") continue;

    if (typeStr === "AnyTensor") {
      tensors.push({
        name: parsed.name,
        type: typeStr,
        elementType: "Unknown",
        shape: "Erased",
        photonic_compatible: false, // unknown element type — cannot confirm
      });
      continue;
    }

    // Extract element type and shape from Tensor<ElementType, Shape>
    const inner = typeStr.slice("Tensor<".length, typeStr.lastIndexOf(">")).trim();
    const firstComma = inner.indexOf(",");
    const elementType = firstComma === -1 ? inner.trim() : inner.slice(0, firstComma).trim();
    const shape = firstComma === -1 ? "Unknown" : inner.slice(firstComma + 1).trim();

    // Photonic compatibility: known float types with concrete or dynamic shapes
    const isFloatType = PHOTONIC_FLOAT_TYPES.has(elementType);
    const isConcreteShape = shape.includes("[") || shape === "DynamicShape";
    const photonic_compatible = isFloatType && isConcreteShape;

    tensors.push({ name: parsed.name, type: typeStr, elementType, shape, photonic_compatible });
  }

  return tensors;
}

// ---------------------------------------------------------------------------
// Effect → target affinity inference (LLN-HINT-COMPUTE-001 planning)
// ---------------------------------------------------------------------------

/**
 * Infers suggested compute targets from declared effects.
 * This is a planning hint, not a governance decision.
 * Returns undefined when no affinity can be inferred.
 */
function inferTargetAffinity(
  declaredEffects: readonly string[],
  tensors: readonly GIRTensorInfo[],
): GIRTargetAffinity | undefined {
  const effects = new Set(declaredEffects);
  const suggested: string[] = [];
  let reason = "";

  if (effects.has("ai.inference")) {
    suggested.push("npu", "gpu", "cpu");
    reason = "ai.inference effect benefits from NPU or GPU acceleration";
  }

  // Photonic hint when all tensors are photonic-compatible
  if (tensors.length > 0 && tensors.every((t) => t.photonic_compatible)) {
    if (!suggested.includes("photonic")) {
      suggested.unshift("photonic");
      reason = reason !== ""
        ? `photonic-compatible tensors detected; ${reason}`
        : "all tensor types are photonic-compatible";
    }
  }

  if (suggested.length === 0) return undefined;

  return { suggested, reason };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function stripStringQuotes(value: string): string {
  if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Phase 13A — SemanticGraph emission
// ---------------------------------------------------------------------------

/**
 * Builds a SemanticGraph from the parsed AST and flow metadata.
 * Adds a flow node for each flow, plus effect nodes and declaresEffect edges.
 */
export function buildSemanticGraph(
  _ast: AstNode,
  flows: readonly FlowMeta[],
): SemanticGraph {
  const builder = new SemanticGraphBuilder();

  // Add flow nodes
  for (const flow of flows) {
    builder.addNode({
      id: `flow:${flow.name}`,
      kind: "flow",
      name: flow.name,
      meta: {
        qualifier: flow.qualifier,
        returnType: flow.returnType,
        params: flow.params,
        declaredEffects: flow.declaredEffects,
      },
    });

    // Add edges for declared effects
    for (const effect of flow.declaredEffects) {
      const effectId = `effect:${effect}`;
      if (!builder.hasNode(effectId)) {
        builder.addNode({ id: effectId, kind: "effect", name: effect });
      }
      builder.addEdge({ from: `flow:${flow.name}`, to: effectId, kind: "declaresEffect", label: effect });
    }
  }

  return builder.build();
}

export type { SemanticGraph };

// ---------------------------------------------------------------------------
// AI Graph — version 2 structured output (no values, metadata only)
// ---------------------------------------------------------------------------

/**
 * Maps declared LogicN effects to host capability identifiers.
 * Only types and governance metadata — never actual values or secrets.
 */
export const EFFECT_TO_CAPABILITY: ReadonlyMap<string, string> = new Map([
  ["database.read",    "host.database.read"],
  ["database.write",   "host.database.write"],
  ["audit.write",      "host.audit.write"],
  ["network.outbound", "host.network.outbound"],
  ["network.inbound",  "host.network.inbound"],
  ["ai.inference",     "host.ai.inference"],
  ["filesystem.read",  "host.filesystem.read"],
  ["filesystem.write", "host.filesystem.write"],
  ["email.send",       "host.email.send"],
]);

export interface AiGraphSourceSpan {
  readonly line: number;
  readonly column: number;
}

export interface AiGraphParameter {
  readonly name: string;
  readonly type: string;
  readonly isReadonly: boolean;
}

export interface AiGraphEvent {
  readonly kind: "emits";
  readonly name: string;
}

export interface AiGraphContract {
  readonly effects: readonly string[];
  readonly privacy: readonly string[];
  readonly audit: readonly string[];
  readonly rules: readonly string[];
  readonly errors: readonly string[];
  readonly context: readonly string[];
  readonly timeouts: string;
  readonly retries: string;
  readonly limits: readonly string[];
}

export interface AiGraphFlow {
  readonly name: string;
  readonly qualifier: "pure" | "guarded" | "secure" | "flow";
  readonly intent?: string;
  readonly parameters: readonly AiGraphParameter[];
  readonly returnType: string;
  readonly effects: readonly string[];
  readonly capabilities: readonly string[];
  readonly calls: readonly string[];
  readonly events: readonly AiGraphEvent[];
  readonly sourceFile?: string;
  readonly sourceSpan: AiGraphSourceSpan;
  readonly contract?: AiGraphContract;
}

export interface AiGraphDiagnostic {
  readonly code: string;
  readonly severity: string;
  readonly message: string;
  readonly sourceSpan?: AiGraphSourceSpan;
}

export interface AiGraphGovernance {
  readonly privacy: readonly string[];
  readonly audit: readonly string[];
  readonly rules: readonly string[];
}

export interface LogicNAiGraph {
  readonly version: "2";
  readonly generatedAt: string;
  readonly sourceFile?: string;
  readonly flows: readonly AiGraphFlow[];
  readonly diagnostics: readonly AiGraphDiagnostic[];
  readonly governance: AiGraphGovernance;
}

/**
 * Extracts string items from a contractSetDecl block whose value matches sectionName.
 * Walks children of the contractDecl and returns identifier/stringLiteral values within
 * the matched section block. Only types and governance declarations — no actual values.
 */
function extractContractSection(contractNode: AstNode, sectionName: string): string[] {
  const results: string[] = [];
  for (const child of contractNode.children ?? []) {
    if (child.kind === "contractSetDecl" && child.value === sectionName) {
      for (const item of child.children ?? []) {
        const v = item.value?.trim();
        if (v !== undefined && v !== "") {
          results.push(v);
        }
      }
    }
  }
  return results;
}

/**
 * Extracts a single string scalar from a contract section (for timeouts, retries).
 */
function extractContractScalar(contractNode: AstNode, sectionName: string): string {
  const items = extractContractSection(contractNode, sectionName);
  return items[0] ?? "";
}

/**
 * Walks the flow body and collects `emit:EventName` identifier nodes.
 */
function extractEmitEvents(flowNode: AstNode): AiGraphEvent[] {
  const events: AiGraphEvent[] = [];
  function walk(node: AstNode): void {
    if (node.kind === "identifier" && node.value !== undefined && node.value.startsWith("emit:")) {
      const eventName = node.value.slice("emit:".length).trim();
      if (eventName !== "") {
        events.push({ kind: "emits", name: eventName });
      }
    }
    for (const child of node.children ?? []) walk(child);
  }
  walk(flowNode);
  return events;
}

/**
 * Extracts names of other flows called inside the given flow node body.
 * Uses callExpr nodes whose value is a known identifier (not a stdlib dot-form).
 */
function extractCalledFlows(flowNode: AstNode, allFlowNames: ReadonlySet<string>): string[] {
  const called = new Set<string>();
  function walk(node: AstNode): void {
    if (node.kind === "callExpr" && node.value !== undefined && allFlowNames.has(node.value)) {
      called.add(node.value);
    }
    for (const child of node.children ?? []) walk(child);
  }
  walk(flowNode);
  return [...called];
}

/**
 * Parses a parameter string like "name: Type" or "readonly name: Type"
 * into an AiGraphParameter. Only type metadata — no actual values.
 */
function parseAiGraphParam(raw: string): AiGraphParameter {
  let input = raw.trim();
  let isReadonly = false;
  if (input.startsWith("readonly ")) {
    isReadonly = true;
    input = input.slice("readonly ".length).trim();
  }
  const colon = input.indexOf(":");
  if (colon < 0) {
    return { name: input, type: "Unknown", isReadonly };
  }
  return {
    name: input.slice(0, colon).trim(),
    type: input.slice(colon + 1).trim(),
    isReadonly,
  };
}

/**
 * Builds the version-2 AI graph output from the parsed AST and flow metadata.
 *
 * IMPORTANT: does NOT include actual values (request bodies, secrets, protected
 * literals). Only types, effects, capabilities, metadata, and governance declarations.
 */
export function buildAiGraph(
  ast: AstNode,
  flows: readonly FlowMeta[],
  sourceFile?: string,
): LogicNAiGraph {
  const allFlowNames: ReadonlySet<string> = new Set(flows.map((f) => f.name));

  const aiFlows: AiGraphFlow[] = flows.map((flow) => {
    const flowNode = findFlowNodeForAi(ast, flow.name);
    const loc = flow.location;
    const sourceSpan: AiGraphSourceSpan = { line: loc.line, column: loc.column };

    // Parameters — types and readonly metadata only, not values
    const parameters: AiGraphParameter[] = flow.params.map((p) => parseAiGraphParam(p));

    // Effects and capabilities
    const effects = [...flow.declaredEffects];
    const capabilities = effects
      .map((e) => EFFECT_TO_CAPABILITY.get(e))
      .filter((c): c is string => c !== undefined);

    // Intent — declared intent string only (no body values)
    let intent: string | undefined;
    if (flowNode !== undefined) {
      const extracted = extractIntent(flowNode);
      if (extracted !== null) intent = extracted;
    }

    // Events — emit:EventName identifiers in the body
    const events: AiGraphEvent[] = flowNode !== undefined ? extractEmitEvents(flowNode) : [];

    // Calls — other user-defined flows called from this body
    const calls: string[] = flowNode !== undefined ? extractCalledFlows(flowNode, allFlowNames) : [];

    // Contract — governance declarations only
    let contract: AiGraphContract | undefined;
    if (flowNode !== undefined) {
      const contractNode = (flowNode.children ?? []).find((c) => c.kind === "contractDecl");
      if (contractNode !== undefined) {
        contract = {
          effects: extractContractSection(contractNode, "effects"),
          privacy: extractContractSection(contractNode, "privacy"),
          audit: extractContractSection(contractNode, "audit"),
          rules: extractContractSection(contractNode, "rules"),
          errors: extractContractSection(contractNode, "errors"),
          context: extractContractSection(contractNode, "context"),
          timeouts: extractContractScalar(contractNode, "timeouts"),
          retries: extractContractScalar(contractNode, "retries"),
          limits: extractContractSection(contractNode, "limits"),
        };
      }
    }

    const aiFlow: AiGraphFlow = {
      name: flow.name,
      qualifier: flow.qualifier === "secure" ? "secure" : flow.qualifier,
      ...(intent !== undefined ? { intent } : {}),
      parameters,
      returnType: flow.returnType,
      effects,
      capabilities,
      calls,
      events,
      ...(sourceFile !== undefined ? { sourceFile } : {}),
      sourceSpan,
      ...(contract !== undefined ? { contract } : {}),
    };
    return aiFlow;
  });

  return {
    version: "2",
    generatedAt: new Date().toISOString(),
    ...(sourceFile !== undefined ? { sourceFile } : {}),
    flows: aiFlows,
    diagnostics: [],
    governance: {
      privacy: [],
      audit: [],
      rules: [],
    },
  };
}

/** Finds a flow AST node by name — variant used by AI graph builder. */
function findFlowNodeForAi(ast: AstNode, name: string): AstNode | undefined {
  const FLOW_KINDS_AI: readonly AstNodeKind[] = [
    "flowDecl",
    "secureFlowDecl",
    "pureFlowDecl",
    "guardedFlowDecl",
  ];
  function walk(node: AstNode): AstNode | undefined {
    if (FLOW_KINDS_AI.includes(node.kind) && node.value === name) return node;
    for (const child of node.children ?? []) {
      const found = walk(child);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  return walk(ast);
}

// ---------------------------------------------------------------------------
// Phase 15 — buildExecutionPlan delegate
// ---------------------------------------------------------------------------

/**
 * Builds a PassiveExecutionPlan for a named flow from its AST and flow metadata.
 * Delegates to the execution plan builder in src/runtime/executionPlan.ts.
 *
 * @param ast      - Full program AST (used to find the flow node).
 * @param flowMeta - FlowMeta for the target flow.
 * @returns PassiveExecutionPlan for the flow.
 */
export function buildExecutionPlan(
  ast: AstNode,
  flowMeta: FlowMeta,
): PassiveExecutionPlan {
  const flowNode = findFlowNodeForAi(ast, flowMeta.name);
  if (flowNode === undefined) {
    throw new Error(`buildExecutionPlan: flow '${flowMeta.name}' not found in AST`);
  }
  return _buildExecutionPlanImpl(flowNode, flowMeta);
}

export type { PassiveExecutionPlan };
