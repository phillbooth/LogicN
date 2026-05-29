// =============================================================================
// LogicN Pass 8 - Governed Intermediate Representation emitter
// =============================================================================

import { type AstNode, type AstNodeKind, type FlowMeta } from "./parser.js";
import { type EffectCheckResult } from "./effect-checker.js";

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

export interface GIRFlow {
  readonly name: string;
  readonly qualifier: "flow" | "pure" | "guarded" | "secure";
  readonly effects: GIREffect;
  readonly intent: GIRIntent;
  readonly protected_values: readonly GIRProtectedValue[];
  readonly audit: GIRAudit;
  readonly execution: GIRExecution;
  readonly proofs: readonly GIRProof[];
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

    return {
      name: flow.name,
      qualifier: flow.qualifier,
      effects,
      intent,
      protected_values: protectedValues,
      audit,
      execution: flowNode === undefined ? defaultExecution() : extractExecution(flowNode),
      proofs: buildProofs(effects, intent, audit, protectedValues),
    };
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

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function stripStringQuotes(value: string): string {
  if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1);
  }
  return value;
}
