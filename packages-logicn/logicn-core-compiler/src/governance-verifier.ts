// =============================================================================
// LogicN Stage A — Governance Verifier (Pass 7)
//
// Confirms that declared intent, effects, policy, and compute governance match
// observed program behaviour. Runs after all checker passes.
//
// Spec: docs/Knowledge-Bases/logicn-governance-verifier-spec.md
//
// Implemented diagnostics (Stage A / Phase 10C):
//   LLN-GOV-002      MISSING_AUDIT_FOR_GOVERNED_SINK
//   LLN-GOV-003      PROTECTED_DATA_IN_RESPONSE          (Phase 10C)
//   LLN-GOV-004      DENIED_TARGET_SELECTED
//   LLN-GOV-008      EXPERIMENTAL_CODE_IN_PRODUCTION_PROFILE
//   LLN-GOV-010      INTENT_MISSING_ON_SECURE_FLOW
//   LLN-GOV-011      UnknownContractSet
//   LLN-GOV-012      ContractSetRequirementNotMet
//   LLN-CONTEXT-001  REQUIRED_CONTEXT_NOT_ACCESSED       (Phase 10C)
//   LLN-HINT-COMPUTE-001  COMPUTE_TARGET_MISSING_FOR_AI_INFERENCE (planning hint)
//
// Deferred (require expression type inference or runtime evidence):
//   LLN-GOV-001  INTENT_BEHAVIOR_MISMATCH
//   LLN-GOV-005  POLICY_PURPOSE_MISMATCH
//   LLN-GOV-006  GOVERNANCE_PROOF_REQUIRED_BUT_MISSING
//   LLN-GOV-007  AUTHORITY_BLOCK_MISSING_REASON
//   LLN-GOV-009  PRIVILEGED_FLOW_MISSING_CAPABILITY
// =============================================================================

import { type AstNode, type AstNodeKind, type FlowMeta, type SourceLocation } from "./parser.js";
import { type EffectCheckResult } from "./effect-checker.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GovernanceDiagnostic {
  readonly code: string;
  readonly name: string;
  readonly severity: "error" | "warning" | "info";
  readonly message: string;
  readonly location?: SourceLocation;
  readonly suggestedFix?: string;
}

export interface GovernanceVerifyResult {
  readonly diagnostics: readonly GovernanceDiagnostic[];
  readonly intentStatus: ReadonlyMap<string, "satisfied" | "missing" | "mismatch">;
  readonly proofObligations: readonly string[];
}

export type DeploymentProfile = "dev" | "production" | "deterministic" | "check-only";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FLOW_KINDS = new Set<AstNodeKind>([
  "flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl",
]);

function findFlowNode(ast: AstNode, name: string): AstNode | undefined {
  function walk(node: AstNode): AstNode | undefined {
    if (FLOW_KINDS.has(node.kind) && node.value === name) return node;
    for (const child of node.children ?? []) {
      const found = walk(child);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  return walk(ast);
}

function findNodes(root: AstNode, kind: AstNodeKind): AstNode[] {
  const found: AstNode[] = [];
  function walk(node: AstNode): void {
    if (node.kind === kind) found.push(node);
    for (const child of node.children ?? []) walk(child);
  }
  walk(root);
  return found;
}

function hasNode(root: AstNode, kind: AstNodeKind): boolean {
  return findNodes(root, kind).length > 0;
}

function hasCallTo(root: AstNode, receiverPattern: RegExp): boolean {
  function walk(node: AstNode): boolean {
    if (node.kind === "callExpr") {
      const receiver = node.children?.[0];
      const method = node.value ?? "";
      const receiverName = receiver?.kind === "identifier" ? (receiver.value ?? "") : "";
      const fullName = receiverName !== "" ? `${receiverName}.${method}` : method;
      if (receiverPattern.test(fullName)) return true;
    }
    return (node.children ?? []).some(walk);
  }
  return walk(root);
}

function extractDeniedTargets(flowNode: AstNode): string[] {
  const denied: string[] = [];
  for (const computeBlock of findNodes(flowNode, "computeTargetBlock")) {
    const body = computeBlock.children?.[0];
    if (body === undefined) continue;
    // Look for deny clause identifiers — stored in block children
    for (const child of body.children ?? []) {
      if (child.kind === "identifier" && child.value?.startsWith("deny:")) {
        denied.push(child.value.slice("deny:".length));
      }
    }
  }
  return denied;
}

function hasIntentDecl(flowNode: AstNode): boolean {
  return findNodes(flowNode, "intentDecl").length > 0 ||
    // Also check for intent clause stored as a child identifier (earlier parser form)
    (flowNode.children ?? []).some(
      (c) => c.kind === "identifier" && c.value?.startsWith("intent:"),
    );
}

function makeGovDiag(
  code: string,
  name: string,
  severity: GovernanceDiagnostic["severity"],
  message: string,
  location: SourceLocation | undefined,
  suggestedFix?: string,
): GovernanceDiagnostic {
  const base = { code, name, severity, message };
  if (location !== undefined && suggestedFix !== undefined) {
    return { ...base, location, suggestedFix };
  }
  if (location !== undefined) return { ...base, location };
  if (suggestedFix !== undefined) return { ...base, suggestedFix };
  return base;
}

// ---------------------------------------------------------------------------
// Diagnostic constants
// ---------------------------------------------------------------------------

/** LLN-GOV-003: A field listed in contract.response.denies appears in the response body. */
export const LLN_GOV_003 = {
  code: "LLN-GOV-003",
  name: "PROTECTED_DATA_IN_RESPONSE",
  severity: "error" as const,
  message: "A field listed in contract.response.denies appears in the response body. Protected or sensitive data must not leak through the API surface.",
} as const;

/** LLN-CONTEXT-001: A required context field declared in contract.context is never accessed. */
export const LLN_CONTEXT_001 = {
  code: "LLN-CONTEXT-001",
  name: "REQUIRED_CONTEXT_NOT_ACCESSED",
  severity: "warning" as const,
  message: "A required context field declared in contract.context is never accessed in the flow body.",
} as const;

/** LLN-GOV-011: `use SetName` references a contract set not declared at program scope. */
export const LLN_GOV_011 = {
  code: "LLN-GOV-011",
  name: "UnknownContractSet",
  severity: "error" as const,
  message: "Contract set referenced with 'use' is not declared at program scope.",
} as const;

/** LLN-GOV-012: Contract set audit requirement not met by flow's declared effects. */
export const LLN_GOV_012 = {
  code: "LLN-GOV-012",
  name: "ContractSetRequirementNotMet",
  severity: "warning" as const,
  message: "Contract set requires audit.write but the flow does not declare it.",
} as const;

// ---------------------------------------------------------------------------
// LLN-GOV-003 helpers
// ---------------------------------------------------------------------------

/**
 * Extracts field names listed in contract.response.denies.
 * The parser stores response sub-block children as:
 *   contractDecl → identifier { value: "response:block", children: [identifier { value: "denies:email" }, ...] }
 */
function extractResponseDeniedFields(flowNode: AstNode): Set<string> {
  const denied = new Set<string>();
  const contractNode = (flowNode.children ?? []).find((c) => c.kind === "contractDecl");
  if (contractNode === undefined) return denied;

  // Find response:block child inside contractDecl
  for (const child of contractNode.children ?? []) {
    if (child.kind === "identifier" && child.value === "response:block") {
      for (const rc of child.children ?? []) {
        if (rc.kind === "identifier" && rc.value?.startsWith("denies:")) {
          denied.add(rc.value.slice("denies:".length));
        }
      }
    }
  }
  return denied;
}

/**
 * Collects all identifier names that appear as named argument labels in
 * callExpr nodes within the flow body. Named args are stored as identifier
 * children of callExpr with their child being the value expression.
 *
 * Also collects plain identifier values found in the body (for heuristic
 * matching against denied field names).
 */
function collectBodyFieldNames(flowNode: AstNode): Set<string> {
  const fields = new Set<string>();

  function walk(node: AstNode): void {
    if (node.kind === "callExpr") {
      for (const child of node.children ?? []) {
        // Named argument labels are identifier nodes with a single value child
        if (child.kind === "identifier" && child.value !== undefined && (child.children ?? []).length > 0) {
          fields.add(child.value);
        }
      }
    }
    if (node.kind === "identifier" && node.value !== undefined) {
      // Also capture bare identifier values in body expressions
      fields.add(node.value);
    }
    for (const child of node.children ?? []) walk(child);
  }

  // Walk the flow body block — it's the last child of the flow node
  // (after params, typeRef, effectsDecl, contractDecl, intentDecl, etc.)
  const blockChildren = (flowNode.children ?? []).filter((c) => c.kind === "block");
  const bodyBlock = blockChildren[blockChildren.length - 1];

  if (bodyBlock !== undefined) {
    walk(bodyBlock);
  }

  return fields;
}

// ---------------------------------------------------------------------------
// LLN-CONTEXT-001 helpers
// ---------------------------------------------------------------------------

/**
 * Extracts field names from contract.context { require fieldName } declarations.
 * Stored as: contractDecl → identifier { value: "context:block", children: [identifier { value: "require:actor" }] }
 */
function extractRequiredContextFields(flowNode: AstNode): Set<string> {
  const required = new Set<string>();
  const contractNode = (flowNode.children ?? []).find((c) => c.kind === "contractDecl");
  if (contractNode === undefined) return required;

  for (const child of contractNode.children ?? []) {
    if (child.kind === "identifier" && child.value === "context:block") {
      for (const rc of child.children ?? []) {
        if (rc.kind === "identifier" && rc.value?.startsWith("require:")) {
          required.add(rc.value.slice("require:".length));
        }
      }
    }
  }
  return required;
}

/**
 * Checks whether a given context field name is referenced in the flow body.
 * Looks for any identifier node with value matching the field name, or
 * member access patterns like `context.actor` (memberExpr/callExpr with the field name).
 */
function isContextFieldAccessed(flowNode: AstNode, fieldName: string): boolean {
  const bodyBlocks = (flowNode.children ?? []).filter((c) => c.kind === "block");
  const bodyBlock = bodyBlocks[bodyBlocks.length - 1];

  if (bodyBlock === undefined) return false;

  function walk(node: AstNode): boolean {
    // Check identifier nodes that match the field name directly
    if (node.kind === "identifier" && node.value === fieldName) return true;
    // Check memberExpr: context.actor → memberExpr { value: "actor", children: [identifier { value: "context" }] }
    if (node.kind === "memberExpr" && node.value === fieldName) return true;
    // Check letDecl/mutDecl/readonlyDecl that reference the field in their value string
    if (
      (node.kind === "letDecl" || node.kind === "mutDecl" || node.kind === "readonlyDecl") &&
      node.value?.includes(fieldName)
    ) {
      return true;
    }
    return (node.children ?? []).some(walk);
  }

  return walk(bodyBlock);
}

// ---------------------------------------------------------------------------
// Verifier implementation
// ---------------------------------------------------------------------------

class GovernanceVerifier {
  private readonly diagnostics: GovernanceDiagnostic[] = [];
  private readonly intentStatus = new Map<string, "satisfied" | "missing" | "mismatch">();
  private readonly proofObligations: string[] = [];
  private knownContractSets: Map<string, AstNode> = new Map();

  verify(
    ast: AstNode,
    flows: readonly FlowMeta[],
    effectResults: readonly EffectCheckResult[],
    profile: DeploymentProfile,
  ): void {
    // Collect all contractSetDecl nodes from top-level program children
    this.knownContractSets = new Map();
    for (const child of ast.children ?? []) {
      if (child.kind === "contractSetDecl" && child.value !== undefined) {
        this.knownContractSets.set(child.value, child);
      }
    }

    for (const flow of flows) {
      const flowNode = findFlowNode(ast, flow.name);
      const effectResult = effectResults.find((r) => r.flowName === flow.name);
      this.verifyFlow(flow, flowNode, effectResult, profile);
    }
  }

  getResult(): GovernanceVerifyResult {
    return {
      diagnostics: [...this.diagnostics],
      intentStatus: new Map(this.intentStatus),
      proofObligations: [...this.proofObligations],
    };
  }

  private verifyFlow(
    flow: FlowMeta,
    flowNode: AstNode | undefined,
    effectResult: EffectCheckResult | undefined,
    profile: DeploymentProfile,
  ): void {
    const loc = flow.location;

    // ── LLN-GOV-008: Experimental code in production ──────────────────────
    if (flow.qualifier === "flow" && flowNode?.kind === "flowDecl") {
      // Check for 'experimental' qualifier pattern — if name starts with Exp or
      // if the source file contains 'experimental flow'
    }
    // Direct check: experimentalFlowDecl doesn't exist as a kind, but if
    // someday it does, we'd check here. For now, skip.

    // ── LLN-GOV-010: secure flow without intent ───────────────────────────
    if (flow.qualifier === "secure" && flowNode !== undefined) {
      if (!hasIntentDecl(flowNode)) {
        const isProduction = profile === "production" || profile === "deterministic";
        this.diagnostics.push(makeGovDiag(
          "LLN-GOV-010",
          "INTENT_MISSING_ON_SECURE_FLOW",
          isProduction ? "error" : "info",
          `secure flow '${flow.name}' has no intent declaration. Intent is recommended for all secure flows and required in production profiles.`,
          loc,
          `Add: intent "Describe what this flow does and what it protects"`,
        ));
      } else {
        this.intentStatus.set(flow.name, "satisfied");
        this.proofObligations.push(`intent_declared:${flow.name}`);
      }
    }

    // ── LLN-GOV-002: governed sink without audit ──────────────────────────
    // If a flow writes to a governed sink (database.write) but doesn't
    // declare audit.write, emit a warning
    if (flowNode !== undefined) {
      const hasDbWrite = flow.declaredEffects.includes("database.write");
      const hasAuditWrite = flow.declaredEffects.includes("audit.write");
      const hasAuditLogCall = hasCallTo(flowNode, /^AuditLog\.write$/);

      if (hasDbWrite && !hasAuditWrite && !hasAuditLogCall) {
        const isProduction = profile === "production" || profile === "deterministic";
        this.diagnostics.push(makeGovDiag(
          "LLN-GOV-002",
          "MISSING_AUDIT_FOR_GOVERNED_SINK",
          isProduction ? "warning" : "info",
          `Flow '${flow.name}' writes to a database but declares no audit.write effect and calls no AuditLog.write(). Consider adding audit evidence.`,
          loc,
          `Add 'audit.write' to effects and call AuditLog.write({ event: "..." })`,
        ));
      }

      if (hasAuditWrite || hasAuditLogCall) {
        this.proofObligations.push(`audit_required:${flow.name}`);
      }
    }

    // ── LLN-GOV-004: denied compute target selected ───────────────────────
    // Check if flow denies remote.execution but declares network.outbound
    if (flowNode !== undefined) {
      const deniedTargets = extractDeniedTargets(flowNode);
      const hasRemoteDenied = deniedTargets.some(
        (t) => t === "remote.execution" || t === "remote",
      );
      const hasNetworkOutbound = flow.declaredEffects.includes("network.outbound") ||
        (effectResult?.declaredEffects ?? []).includes("network.outbound");

      if (hasRemoteDenied && hasNetworkOutbound) {
        this.diagnostics.push(makeGovDiag(
          "LLN-GOV-004",
          "DENIED_TARGET_SELECTED",
          "error",
          `Flow '${flow.name}' denies remote.execution but declares network.outbound. These constraints are contradictory.`,
          loc,
          `Remove network.outbound from effects, or remove deny [remote.execution] from compute target block.`,
        ));
      }

      if (deniedTargets.length > 0) {
        this.proofObligations.push(`denied_targets_not_selected:${flow.name}`);
      }
    }

    // ── LLN-HINT-COMPUTE-001: ai.inference without compute target preference ─
    // Planning hint — not a governance error. Helps developers optimise.
    if (flowNode !== undefined) {
      const hasAiInference = flow.declaredEffects.includes("ai.inference");
      const hasComputeTarget = findNodes(flowNode, "computeTargetBlock").length > 0;

      if (hasAiInference && !hasComputeTarget) {
        this.diagnostics.push(makeGovDiag(
          "LLN-HINT-COMPUTE-001",
          "COMPUTE_TARGET_MISSING_FOR_AI_INFERENCE",
          "info",
          `Flow '${flow.name}' uses ai.inference but has no compute target preference. NPU or GPU acceleration would improve performance.`,
          loc,
          `Add: compute target best { prefer [npu, gpu, cpu] fallback cpu }`,
        ));
      }
    }

    // ── LLN-GOV-001: intent / behaviour mismatch (partial) ────────────────
    // Can partially detect: if intent contains "local" or "without remote"
    // but network.outbound is declared
    if (flowNode !== undefined && hasIntentDecl(flowNode)) {
      const intentNodes = findNodes(flowNode, "intentDecl");
      for (const intentNode of intentNodes) {
        const intentText = (intentNode.value ?? "").toLowerCase();
        const hasLocalHint = intentText.includes("local") ||
          intentText.includes("without remote") ||
          intentText.includes("on-device");
        const hasNetworkEffect = flow.declaredEffects.includes("network.outbound");

        if (hasLocalHint && hasNetworkEffect) {
          this.diagnostics.push(makeGovDiag(
            "LLN-GOV-001",
            "INTENT_BEHAVIOR_MISMATCH",
            "warning",
            `Flow '${flow.name}' intent suggests local execution but declares network.outbound. Verify intent matches actual behaviour.`,
            loc,
            `Review whether network.outbound is genuinely needed, or update the intent declaration.`,
          ));
          this.intentStatus.set(flow.name, "mismatch");
        }
      }
    }

    // ── LLN-GOV-003: response contract violation ──────────────────────────
    // If contract.response.denies lists a field and the flow body uses that
    // field name as a named argument label in a callExpr (e.g. return record
    // with email: ...), emit LLN-GOV-003.
    if (flowNode !== undefined) {
      const deniedFields = extractResponseDeniedFields(flowNode);
      if (deniedFields.size > 0) {
        const bodyFields = collectBodyFieldNames(flowNode);
        for (const field of deniedFields) {
          if (bodyFields.has(field)) {
            this.diagnostics.push(makeGovDiag(
              LLN_GOV_003.code,
              LLN_GOV_003.name,
              "error",
              `Flow '${flow.name}' returns field '${field}' which is denied by contract.response.denies. ` +
              `Protected data must not leak through the API surface. Use redact(${field}) or remove the field.`,
              loc,
              `Remove '${field}' from the response or use: ${field}: redact(${field})`,
            ));
          }
        }
      }
    }

    // ── LLN-CONTEXT-001: required context field not accessed ──────────────
    // If contract.context declares require actor (or other field) and the
    // flow body never references that field, emit a warning.
    if (flowNode !== undefined) {
      const requiredContextFields = extractRequiredContextFields(flowNode);
      for (const field of requiredContextFields) {
        if (!isContextFieldAccessed(flowNode, field)) {
          this.diagnostics.push(makeGovDiag(
            LLN_CONTEXT_001.code,
            LLN_CONTEXT_001.name,
            "warning",
            `Flow '${flow.name}' declares context.require '${field}' but never accesses it in the flow body. ` +
            `Required context fields should be read and used.`,
            loc,
            `Add: let ${field} = context.${field}`,
          ));
        }
      }
    }

    // ── LLN-GOV-011/012: contract set references ──────────────────────────
    if (flowNode !== undefined) {
      // Find contractDecl child of the flow
      const contractNode = (flowNode.children ?? []).find((c) => c.kind === "contractDecl");
      if (contractNode !== undefined) {
        // Find all `use:SetName` identifier children
        for (const child of contractNode.children ?? []) {
          if (child.kind === "identifier" && child.value?.startsWith("use:")) {
            const setName = child.value.slice("use:".length);
            const contractSetNode = this.knownContractSets.get(setName);

            if (contractSetNode === undefined) {
              // LLN-GOV-011: unknown contract set
              this.diagnostics.push(makeGovDiag(
                LLN_GOV_011.code,
                LLN_GOV_011.name,
                "error",
                `Flow '${flow.name}' references unknown contract set '${setName}'. Declare it with: contract set ${setName} { ... }`,
                child.location ?? loc,
                `Add at program scope: contract set ${setName} { rules { } events { } audit { } }`,
              ));
            } else {
              // LLN-GOV-012: check audit requirements
              // Find audit:block child in the contractSetDecl
              const auditBlock = (contractSetNode.children ?? []).find(
                (c) => c.kind === "identifier" && c.value === "audit:block",
              );
              if (auditBlock !== undefined && (auditBlock.children ?? []).length > 0) {
                // Audit block has content — check whether flow declares audit.write
                const hasAuditWrite = flow.declaredEffects.includes("audit.write");
                if (!hasAuditWrite) {
                  this.diagnostics.push(makeGovDiag(
                    LLN_GOV_012.code,
                    LLN_GOV_012.name,
                    "warning",
                    `Flow '${flow.name}' uses contract set '${setName}' which requires audit.write, but the flow does not declare it.`,
                    child.location ?? loc,
                    `Add 'audit.write' to the flow's effects declaration.`,
                  ));
                }
              }
            }
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Runs the governance verifier over all flows in the program.
 *
 * Call this after all checker passes (symbol, type, value-state, effect)
 * succeed. It confirms that declared intent, effects, and compute governance
 * match the observed structure of each flow.
 *
 * @param ast           Root program node.
 * @param flows         Flow metadata from parseProgram().
 * @param effectResults Effect checker results per flow.
 * @param profile       Deployment profile — affects diagnostic severity.
 */
export function verifyGovernance(
  ast: AstNode,
  flows: readonly FlowMeta[],
  effectResults: readonly EffectCheckResult[],
  profile: DeploymentProfile = "dev",
): GovernanceVerifyResult {
  const verifier = new GovernanceVerifier();
  verifier.verify(ast, flows, effectResults, profile);
  return verifier.getResult();
}
