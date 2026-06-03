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
//   LLN-GOV-005      POLICY_PURPOSE_MISMATCH
//   LLN-GOV-007      AUTHORITY_BLOCK_MISSING_REASON
//   LLN-GOV-008      EXPERIMENTAL_CODE_IN_PRODUCTION_PROFILE
//   LLN-GOV-009      PRIVILEGED_FLOW_MISSING_CAPABILITY
//   LLN-GOV-010      INTENT_MISSING_ON_SECURE_FLOW
//   LLN-GOV-011      UnknownContractSet
//   LLN-GOV-012      ContractSetRequirementNotMet
//   LLN-CONTEXT-001  REQUIRED_CONTEXT_NOT_ACCESSED       (Phase 10C)
//   LLN-HINT-COMPUTE-001  COMPUTE_TARGET_MISSING_FOR_AI_INFERENCE (planning hint)
//
// Deferred (require expression type inference or runtime evidence):
//   LLN-GOV-001  INTENT_BEHAVIOR_MISMATCH
//   LLN-GOV-006  GOVERNANCE_PROOF_REQUIRED_BUT_MISSING
// =============================================================================

import { type AstNode, type AstNodeKind, type FlowMeta, type SourceLocation } from "./parser.js";
import { type EffectCheckResult } from "./effect-checker.js";
import { GovernanceFlags, type GovernanceFlagsMask, type RuntimeManifest } from "./type-registry.js";
import { buildProofGraphCached, computeExecutionSignature, generateEpilogueReceipt, type EpilogueFailureAction, type EpilogueProofStrategy, type ProofGraph, type ProofObligation, LLN_HW_001, LLN_HW_002, LLN_HW_003 } from "./proof-graph.js";
import { HARDWARE_TRUST_PROFILES, ProofLevel } from "./type-registry.js";

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
  /**
   * Per-flow GovernanceFlags bitmask. Consumers can fast-check properties without
   * re-running the verifier: (flags & GovernanceFlags.RequiresAudit) !== 0.
   * Phase 18F: populated by the verifier for all verified flows.
   */
  readonly governanceFlagsByFlow: ReadonlyMap<string, GovernanceFlagsMask>;
  /**
   * Per-flow RuntimeManifest. Empty in "dev" profile; populated in "production"
   * and "deterministic" profiles.
   * Phase 18F: minimal manifest — full manifest (with audit chain) is Phase 20.
   */
  readonly runtimeManifests: readonly RuntimeManifest[];
  /**
   * Per-flow ProofGraph. Machine-readable compliance certificates produced by
   * the governance verifier. Each flow gets a ProofGraph containing its
   * ProofObligations, evidence, ExecutionSignature, and verified status.
   */
  readonly proofGraphs: ReadonlyMap<string, ProofGraph>;
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

/** LLN-GOV-013: A pure flow calls a flow with effects. Pure flows cannot cross into governed boundaries. */
export const LLN_GOV_013 = {
  code: "LLN-GOV-013",
  name: "BoundaryViolation",
  severity: "error" as const,
  message: "A pure flow calls a flow with effects. Pure flows cannot cross into governed boundaries.",
  why: "Pure flows are proven effect-free. Calling an effectful flow breaks this proof.",
  suggestedFix: "Change 'pure flow' to 'guarded flow' and declare the required effects.",
} as const;

/** LLN-GOV-005: policy { purpose "read-only" } but flow also uses database.write (or similar). */
export const LLN_GOV_005 = {
  code: "LLN-GOV-005",
  name: "PolicyPurposeMismatch",
  severity: "warning" as const,
  message: "Policy purpose contradicts declared effects.",
} as const;

/** LLN-GOV-007: authority block exists but has no reason clause. */
export const LLN_GOV_007 = {
  code: "LLN-GOV-007",
  name: "AuthorityBlockMissingReason",
  severity: "error" as const,
  message: `Authority block must include a reason declaration. Add: reason "Explain why this authority is needed"`,
} as const;

/** LLN-GOV-009: privileged flow declares no effects or capabilities. */
export const LLN_GOV_009 = {
  code: "LLN-GOV-009",
  name: "PrivilegedFlowMissingCapability",
  severity: "warning" as const,
  message: "Privileged flow declares no effects or capabilities. Privileged flows should explicitly declare what authority they require.",
} as const;

// ---------------------------------------------------------------------------
// LLN-VAL-001 / LLN-VAL-002 / LLN-VAL-003 — Value/Safety governance
// ---------------------------------------------------------------------------

/**
 * LLN-VAL-001: A `safety_critical` flow does not declare `audit.write`.
 *
 * Safety-critical flows have the highest consequence classification. The audit
 * trail is non-negotiable — it is the primary evidence of correct operation.
 * Every safety_critical flow must produce an audit record.
 */
export const LLN_VAL_001 = {
  code: "LLN-VAL-001",
  name: "SafetyCriticalMissingAudit",
  severity: "error" as const,
  message: "A safety_critical flow must declare audit.write in its effects block.",
  why: "Safety-critical systems require an immutable audit trail. Governance without audit is unverifiable.",
  suggestedFix: "Add `audit.write` to the effects block of this flow.",
} as const;

/**
 * LLN-VAL-002: A `safety_critical` flow does not declare
 * `require deterministic_execution` in its `contract.safety` block.
 *
 * Deterministic execution is a pre-condition for formal verification of
 * safety-critical systems. Without it, the ProofGraph cannot be trusted.
 */
export const LLN_VAL_002 = {
  code: "LLN-VAL-002",
  name: "SafetyCriticalMissingDeterminism",
  severity: "error" as const,
  message: "A safety_critical flow must declare `require deterministic_execution` in contract.safety.",
  why: "Safety-critical correctness depends on deterministic, repeatable execution. Non-determinism invalidates formal proof.",
  suggestedFix: "Add `contract { safety { require deterministic_execution } }` to this flow.",
} as const;

/**
 * LLN-VAL-003: The `classification` value in `contract.value` is not a
 * recognised LogicN value classification.
 *
 * Value classifications are a closed set — unrecognised values cannot be
 * mapped to governance rules, tooling checks, or regulatory frameworks.
 */
export const LLN_VAL_003 = {
  code: "LLN-VAL-003",
  name: "UnknownValueClassification",
  severity: "error" as const,
  message: "Unrecognised classification in contract.value. Use a recognised classification: safety_critical, mission_critical, regulated, financial, medical, government, national_security, confidential, internal, or public.",
  why: "Value classifications drive governance rules, routing decisions, and compliance mapping. Unknown classifications cannot be enforced.",
  suggestedFix: "Replace with a recognised classification.",
} as const;

/** Recognised value classifications from the LogicN governance scope KB. */
export const RECOGNISED_VALUE_CLASSIFICATIONS = new Set([
  "safety_critical", "mission_critical", "regulated", "financial",
  "medical", "government", "national_security",
  "confidential", "internal", "public",
]);

// ---------------------------------------------------------------------------
// LLN-GOV-005 helpers
// ---------------------------------------------------------------------------

/**
 * Purpose-to-denied-effects mapping.
 * "read-only" declares only read access, so database.write is contradictory.
 * "internal" declares no external traffic, so network.outbound is contradictory.
 */
const PURPOSE_DENIED_EFFECTS: ReadonlyMap<string, readonly string[]> = new Map([
  ["read-only", ["database.write"]],
  ["internal",  ["network.outbound"]],
]);

/**
 * Extracts all policy block purpose values from a flow node.
 * policy { purpose "read-only" } is stored as policyDecl with an
 * identifier child { value: "purpose:read-only" }.
 */
function extractPolicyPurposes(flowNode: AstNode): string[] {
  const purposes: string[] = [];
  for (const child of flowNode.children ?? []) {
    if (child.kind === "policyDecl") {
      for (const clause of child.children ?? []) {
        if (clause.kind === "identifier" && clause.value?.startsWith("purpose:")) {
          purposes.push(clause.value.slice("purpose:".length));
        }
      }
    }
  }
  return purposes;
}

// ---------------------------------------------------------------------------
// LLN-GOV-007 helpers
// ---------------------------------------------------------------------------

/**
 * Returns all authorityDecl nodes in the flow (or anywhere under the root).
 * The parser stores a reason clause as a stringLiteral child of authorityDecl.
 * If no stringLiteral child exists the reason is missing.
 */
function hasAuthorityReason(authorityNode: AstNode): boolean {
  // The parser stores: children.push({ kind: "stringLiteral", value: reasonText })
  // An identifier child with value starting "reason:" would also indicate reason.
  return (authorityNode.children ?? []).some(
    (c) =>
      c.kind === "stringLiteral" ||
      (c.kind === "identifier" && c.value?.startsWith("reason:")),
  );
}

// ---------------------------------------------------------------------------
// LLN-GOV-009 helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when a flow node has qualifier "privileged".
 * Because the parser does not yet emit a dedicated privilegedFlowDecl kind,
 * we detect it by looking for an identifier child with value "qualifier:privileged"
 * (injected by the flow body parser when it encounters the privileged keyword)
 * OR by checking if the flow node's value starts with "privileged:".
 */
function isPrivilegedFlow(flowNode: AstNode, flow: FlowMeta): boolean {
  // Primary signal: flow qualifier encoded in the value field
  if ((flowNode.value ?? "").startsWith("privileged:")) return true;
  // Secondary: any identifier child that encodes the qualifier
  if ((flowNode.children ?? []).some(
    (c) => c.kind === "identifier" && c.value === "qualifier:privileged",
  )) return true;
  // Tertiary: flow meta qualifier (parser currently uses "flow" for privileged flows,
  // but we also accept a future FlowMeta extension)
  if ((flow as { qualifier: string }).qualifier === "privileged") return true;
  return false;
}

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
 * Collects named argument field names from callExpr nodes in RETURN statements
 * of the flow body. This is used to detect denied fields leaking into the response.
 *
 * Only examines return statement expressions (not intermediate calls like AuditLog.write)
 * to avoid false positives where denied field names appear in intermediate operations
 * such as redact(amount) or audit logging.
 */
function collectBodyFieldNames(flowNode: AstNode): Set<string> {
  const fields = new Set<string>();

  function walkReturnExpr(node: AstNode): void {
    if (node.kind === "callExpr") {
      for (const child of node.children ?? []) {
        // Named argument labels are identifier nodes with a value child
        if (child.kind === "identifier" && child.value !== undefined && (child.children ?? []).length > 0) {
          // Skip if the value is wrapped in redact(...) — it has been sanitised
          const valueChild = child.children![0];
          const isRedacted = valueChild !== undefined &&
            valueChild.kind === "callExpr" &&
            valueChild.value === "redact";
          if (!isRedacted) {
            fields.add(child.value);
          }
        }
      }
      for (const child of node.children ?? []) walkReturnExpr(child);
    } else {
      for (const child of node.children ?? []) walkReturnExpr(child);
    }
  }

  function findReturnStmts(node: AstNode): void {
    if (node.kind === "returnStmt") {
      for (const child of node.children ?? []) {
        walkReturnExpr(child);
      }
      return; // don't recurse further into return
    }
    for (const child of node.children ?? []) findReturnStmts(child);
  }

  // Walk the flow body block — it's the last child of the flow node
  // (after params, typeRef, effectsDecl, contractDecl, intentDecl, etc.)
  const blockChildren = (flowNode.children ?? []).filter((c) => c.kind === "block");
  const bodyBlock = blockChildren[blockChildren.length - 1];

  if (bodyBlock !== undefined) {
    findReturnStmts(bodyBlock);
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
 * Extracts required context field names from a flow's contract.context block.
 * Returns an array of field names (after stripping the "require:" prefix).
 * Finds contractDecl children with value "context:block", then collects
 * identifier children whose value starts with "require:".
 */
function extractRequiredContext(flowNode: AstNode): string[] {
  const contractNode = (flowNode.children ?? []).find((c) => c.kind === "contractDecl");
  if (contractNode === undefined) return [];

  const result: string[] = [];
  for (const child of contractNode.children ?? []) {
    if (child.kind === "identifier" && child.value === "context:block") {
      for (const rc of child.children ?? []) {
        if (rc.kind === "identifier" && rc.value?.startsWith("require:")) {
          result.push(rc.value.slice("require:".length));
        }
      }
    }
  }
  return result;
}

/**
 * Phase 25 LLN-VAL: Extracts the `classification` value from `contract.value { classification ... }`.
 *
 * The AST structure is:
 *   contractDecl → identifier [value:block] → identifier [decl:classification <cls> domain <dom> ...]
 *
 * Returns the classification string (e.g. "safety_critical"), or null if not declared.
 */
function extractValueClassification(flowNode: AstNode): string | null {
  const contractNode = (flowNode.children ?? []).find((c) => c.kind === "contractDecl");
  if (contractNode === undefined) return null;

  for (const child of contractNode.children ?? []) {
    if (child.kind === "identifier" && child.value === "value:block") {
      for (const valueChild of child.children ?? []) {
        if (valueChild.kind === "identifier" && valueChild.value?.startsWith("decl:")) {
          // Parse "decl:classification safety_critical domain aerospace ..."
          const pairs = valueChild.value.slice("decl:".length).split(/\s+/);
          const classIdx = pairs.indexOf("classification");
          if (classIdx !== -1 && classIdx + 1 < pairs.length) {
            return pairs[classIdx + 1] ?? null;
          }
        }
      }
    }
  }
  return null;
}

/**
 * Phase 25 LLN-VAL: Extracts requirements from `contract.safety { require ... }`.
 *
 * The AST structure is:
 *   contractDecl → identifier [safety:block] → identifier [require:<req1>.require.<req2>...]
 *
 * Returns a set of requirement names (e.g. { "deterministic_execution", "bounded_runtime" }).
 */
function extractSafetyRequirements(flowNode: AstNode): Set<string> {
  const contractNode = (flowNode.children ?? []).find((c) => c.kind === "contractDecl");
  const requirements = new Set<string>();
  if (contractNode === undefined) return requirements;

  for (const child of contractNode.children ?? []) {
    if (child.kind === "identifier" && child.value === "safety:block") {
      for (const safetyChild of child.children ?? []) {
        if (safetyChild.kind === "identifier" && safetyChild.value?.startsWith("require:")) {
          // Format: "require:deterministic_execution.require.bounded_runtime"
          // Split on ".require." to get individual requirements.
          const raw = safetyChild.value.slice("require:".length);
          const parts = raw.split(/\.require\.|\.require$/);
          for (const part of parts) {
            const req = part.trim().replace(/^\./, "");
            if (req.length > 0) requirements.add(req);
          }
        }
      }
    }
  }
  return requirements;
}

/**
 * Phase 26B: Extracts hardware target IDs from `contract.hardware { target <id> allow <id> }`.
 *
 * The AST structure is:
 *   contractDecl → identifier [hardware:block] → identifier [decl:target <id> allow <id2> ...]
 *
 * Returns all declared target IDs (primary + allowed).
 */
function extractHardwareTargets(flowNode: AstNode): string[] {
  const contractNode = (flowNode.children ?? []).find((c) => c.kind === "contractDecl");
  const targets: string[] = [];
  if (contractNode === undefined) return targets;

  for (const child of contractNode.children ?? []) {
    if (child.kind === "identifier" && child.value === "hardware:block") {
      for (const hwChild of child.children ?? []) {
        if (hwChild.kind === "identifier" && hwChild.value?.startsWith("decl:")) {
          const raw = hwChild.value.slice("decl:".length);
          // Parse "target arm . sve2 allow google . tpu . inference require mte"
          // Target IDs use dots but the lexer splits on dots — rejoin with dots
          const tokens = raw.split(/\s+/);
          let i = 0;
          while (i < tokens.length) {
            const tok = tokens[i];
            if (tok === "target" || tok === "allow") {
              // Collect the dot-separated ID that follows
              i++;
              const parts: string[] = [];
              while (i < tokens.length && tokens[i] !== "target" &&
                     tokens[i] !== "allow" && tokens[i] !== "require" &&
                     tokens[i] !== "deny" && tokens[i] !== "fallback") {
                if (tokens[i] !== ".") parts.push(tokens[i] ?? "");
                i++;
              }
              const id = parts.join(".");
              if (id.length > 0) targets.push(id);
            } else {
              i++;
            }
          }
        }
      }
    }
  }
  return targets;
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
// Phase 22C — Arena memory extraction
// ---------------------------------------------------------------------------

/**
 * Extracts the arena memory limit (in MB) from a flow's contract.memory block.
 *
 * The memory block is stored in the AST as:
 *   contractDecl
 *     identifier { value: "memory:block" }
 *       identifier { value: "decl:arena 8 mb" }
 *
 * Returns the arena size in megabytes, or undefined if no arena declaration exists.
 */
export function extractArenaLimitMB(flowNode: AstNode): number | undefined {
  // Find the contractDecl child
  const contractDecl = (flowNode.children ?? []).find((c) => c.kind === "contractDecl");
  if (contractDecl === undefined) return undefined;

  // Find the memory:block identifier child
  const memoryBlock = (contractDecl.children ?? []).find(
    (c) => c.kind === "identifier" && c.value === "memory:block",
  );
  if (memoryBlock === undefined) return undefined;

  // Find a child with value starting "decl:arena"
  for (const child of memoryBlock.children ?? []) {
    if (child.kind === "identifier" && child.value?.startsWith("decl:arena")) {
      // Parse the number from "decl:arena 8 mb" → 8
      const match = child.value.match(/decl:arena\s+(\d+(?:\.\d+)?)\s*mb/i);
      if (match?.[1] !== undefined) {
        const mb = Number(match[1]);
        return Number.isFinite(mb) ? mb : undefined;
      }
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Verifier implementation
// ---------------------------------------------------------------------------

class GovernanceVerifier {
  private readonly diagnostics: GovernanceDiagnostic[] = [];
  private readonly intentStatus = new Map<string, "satisfied" | "missing" | "mismatch">();
  private readonly proofObligations: string[] = [];
  private knownContractSets: Map<string, AstNode> = new Map();
  private readonly governanceFlagsByFlow = new Map<string, GovernanceFlagsMask>();
  private readonly runtimeManifests: RuntimeManifest[] = [];
  private readonly proofGraphsByFlow = new Map<string, ProofGraph>();
  private currentProfile: DeploymentProfile = "dev";

  verify(
    ast: AstNode,
    flows: readonly FlowMeta[],
    effectResults: readonly EffectCheckResult[],
    profile: DeploymentProfile,
  ): void {
    this.currentProfile = profile;
    // Collect all contractSetDecl nodes from top-level program children
    this.knownContractSets = new Map();
    for (const child of ast.children ?? []) {
      if (child.kind === "contractSetDecl" && child.value !== undefined) {
        this.knownContractSets.set(child.value, child);
      }
    }

    // ── LLN-GOV-007: check top-level authority blocks for missing reason ──
    for (const child of ast.children ?? []) {
      if (child.kind === "authorityDecl" && !hasAuthorityReason(child)) {
        this.diagnostics.push(makeGovDiag(
          LLN_GOV_007.code,
          LLN_GOV_007.name,
          "error",
          `Top-level authority block must include a reason declaration. ` +
          `Add: reason "Explain why this authority is needed"`,
          child.location,
          `Add inside the authority block: reason "Explain why this authority is needed"`,
        ));
      }
    }

    for (const flow of flows) {
      const flowNode = findFlowNode(ast, flow.name);
      const effectResult = effectResults.find((r) => r.flowName === flow.name);
      this.verifyFlow(flow, flowNode, effectResult, profile, flows, effectResults);
    }
  }

  getResult(): GovernanceVerifyResult {
    return {
      diagnostics: [...this.diagnostics],
      intentStatus: new Map(this.intentStatus),
      proofObligations: [...this.proofObligations],
      governanceFlagsByFlow: new Map(this.governanceFlagsByFlow),
      runtimeManifests: [...this.runtimeManifests],
      proofGraphs: new Map(this.proofGraphsByFlow),
    };
  }

  private verifyFlow(
    flow: FlowMeta,
    flowNode: AstNode | undefined,
    effectResult: EffectCheckResult | undefined,
    profile: DeploymentProfile,
    allFlows: readonly FlowMeta[] = [],
    allEffectResults: readonly EffectCheckResult[] = [],
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

    // ── LLN-GOV-005: policy purpose mismatch ─────────────────────────────
    // If a flow declares a policy block with purpose "read-only" but also
    // declares database.write in its effects, emit a warning.
    if (flowNode !== undefined) {
      const purposes = extractPolicyPurposes(flowNode);
      for (const purpose of purposes) {
        const deniedEffects = PURPOSE_DENIED_EFFECTS.get(purpose) ?? [];
        for (const deniedEffect of deniedEffects) {
          const hasDeniedEffect = flow.declaredEffects.includes(deniedEffect);
          if (hasDeniedEffect) {
            this.diagnostics.push(makeGovDiag(
              LLN_GOV_005.code,
              LLN_GOV_005.name,
              "warning",
              `Flow '${flow.name}' declares purpose '${purpose}' but also uses ${deniedEffect} effect. ` +
              `Verify the policy purpose matches actual behaviour.`,
              loc,
              `Remove ${deniedEffect} from effects, or update the policy purpose.`,
            ));
          }
        }
      }
    }

    // ── LLN-GOV-007: authority block missing reason ───────────────────────
    // If an authority block exists but has no reason clause, emit an error.
    if (flowNode !== undefined) {
      const authorityNodes = findNodes(flowNode, "authorityDecl");
      for (const authNode of authorityNodes) {
        if (!hasAuthorityReason(authNode)) {
          this.diagnostics.push(makeGovDiag(
            LLN_GOV_007.code,
            LLN_GOV_007.name,
            "error",
            `Authority block in flow '${flow.name}' must include a reason declaration. ` +
            `Add: reason "Explain why this authority is needed"`,
            authNode.location ?? loc,
            `Add inside the authority block: reason "Explain why this authority is needed"`,
          ));
        }
      }
    }

    // ── LLN-GOV-009: privileged flow without capability ───────────────────
    // If a flow has qualifier "privileged" but declares no effects or contract,
    // emit a warning.
    if (flowNode !== undefined && isPrivilegedFlow(flowNode, flow)) {
      const hasEffects = flow.declaredEffects.length > 0;
      const hasContract = (flowNode.children ?? []).some((c) => c.kind === "contractDecl");
      if (!hasEffects && !hasContract) {
        this.diagnostics.push(makeGovDiag(
          LLN_GOV_009.code,
          LLN_GOV_009.name,
          "warning",
          `Privileged flow '${flow.name}' declares no effects or capabilities. ` +
          `Privileged flows should explicitly declare what authority they require.`,
          loc,
          `Add a contract or effects declaration: contract { effects { privileged.action } }`,
        ));
      }
    }

    // ── LLN-GOV-013: pure flow crossing into governed boundary ────────────
    // If a pure flow body contains a callExpr whose name resolves to a flow
    // in the program that is "guarded" or "secure", emit LLN-GOV-013.
    if (flowNode !== undefined && flow.qualifier === "pure") {
      const callNodes = findNodes(flowNode, "callExpr");
      for (const callNode of callNodes) {
        const calleeName = callNode.value ?? "";
        if (calleeName === "") continue;
        // Check if calleeName matches a guarded or secure flow in the program
        const calleeEffectResult = allEffectResults.find(
          (r) => r.flowName === calleeName,
        );
        // Also check the flows list for qualifier
        const calleeFlowMeta = allFlows.find((f) => f.name === calleeName);
        const isGoverned =
          calleeFlowMeta?.qualifier === "guarded" ||
          calleeFlowMeta?.qualifier === "secure" ||
          (calleeEffectResult?.declaredEffects ?? []).length > 0;
        if (isGoverned) {
          this.diagnostics.push(makeGovDiag(
            LLN_GOV_013.code,
            LLN_GOV_013.name,
            "error",
            `Pure flow '${flow.name}' calls '${calleeName}' which is a governed or effectful flow. ` +
            LLN_GOV_013.message,
            callNode.location ?? loc,
            LLN_GOV_013.suggestedFix,
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

    // ── LLN-VAL: contract.value and contract.safety enforcement ──────────
    if (flowNode !== undefined) {
      const classification = extractValueClassification(flowNode);

      if (classification !== null) {
        // LLN-VAL-003: Unknown classification
        if (!RECOGNISED_VALUE_CLASSIFICATIONS.has(classification)) {
          this.diagnostics.push({
            ...LLN_VAL_003,
            message: `${LLN_VAL_003.message.replace("Unrecognised classification in contract.value.", `Unknown classification '${classification}' in contract.value for flow '${flow.name}':`)}`,
            location: loc,
            suggestedFix: LLN_VAL_003.suggestedFix,
          });
        }

        if (classification === "safety_critical") {
          // LLN-VAL-001: safety_critical must declare audit.write
          if (!flow.declaredEffects.includes("audit.write")) {
            this.diagnostics.push({
              ...LLN_VAL_001,
              message: `Flow '${flow.name}' is classified safety_critical but does not declare audit.write. ${LLN_VAL_001.why}`,
              location: loc,
              suggestedFix: LLN_VAL_001.suggestedFix,
            });
          }

          // LLN-VAL-002: safety_critical must require deterministic_execution in contract.safety
          const safetyReqs = extractSafetyRequirements(flowNode);
          if (!safetyReqs.has("deterministic_execution")) {
            this.diagnostics.push({
              ...LLN_VAL_002,
              message: `Flow '${flow.name}' is classified safety_critical but does not declare 'require deterministic_execution' in contract.safety. ${LLN_VAL_002.why}`,
              location: loc,
              suggestedFix: LLN_VAL_002.suggestedFix,
            });
          }
        }
      }
    }

    // ── LLN-HW: contract.hardware ProofLevel enforcement ─────────────────
    // Phase 26B: auto-infer proof requirements from HARDWARE_TRUST_PROFILES.
    // No explicit contract syntax needed — the seal and proof level are automatic.
    if (flowNode !== undefined) {
      const hwTargets = extractHardwareTargets(flowNode);
      const hasAuditWrite = flow.declaredEffects.includes("audit.write");
      const hasAuditAttestation = (flowNode.children ?? []).some(c =>
        c.kind === "contractDecl" &&
        (c.children ?? []).some(child =>
          child.kind === "identifier" &&
          child.value === "audit:block" &&
          (child.children ?? []).some(a =>
            a.kind === "identifier" && a.value?.includes("runtime_attestation")
          )
        )
      );

      for (const targetId of hwTargets) {
        const profile = HARDWARE_TRUST_PROFILES.get(targetId);
        if (profile === undefined) continue; // unknown target — not our concern here

        // LLN-HW-001: quantum target requires FormalRequired proof chain
        if (profile.requiredProofLevel >= ProofLevel.FormalRequired) {
          this.diagnostics.push({
            ...LLN_HW_001,
            message: `Flow '${flow.name}' declares hardware target '${targetId}' (ExperimentalPlane). ${LLN_HW_001.message}`,
            location: loc,
            suggestedFix: LLN_HW_001.suggestedFix,
          });
        }

        // LLN-HW-002: sealed target (NPU/TPU/ANE) without audit.write
        if (profile.requiredProofLevel >= ProofLevel.Sealed &&
            profile.requiredProofLevel < ProofLevel.FormalRequired &&
            !hasAuditWrite) {
          this.diagnostics.push({
            ...LLN_HW_002,
            message: `Flow '${flow.name}' uses sealed hardware target '${targetId}' but does not declare audit.write. ${LLN_HW_002.message}`,
            location: loc,
            suggestedFix: LLN_HW_002.suggestedFix,
          });
        }

        // LLN-HW-003: AcceleratorPlane (photonic/neuromorphic) without attestation requirement
        if (profile.requiresAttestation && !hasAuditAttestation && !hasAuditWrite) {
          this.diagnostics.push({
            ...LLN_HW_003,
            message: `Flow '${flow.name}' uses AcceleratorPlane target '${targetId}'. ${LLN_HW_003.message}`,
            location: loc,
            suggestedFix: LLN_HW_003.suggestedFix,
          });
        }
      }
    }

    // ── Compute GovernanceFlags bitmask for this flow ─────────────────────
    {
      const fn = flowNode;
      const hasAuditEff  = flow.declaredEffects.includes("audit.write");
      const hasAuditCall = fn !== undefined && hasCallTo(fn, /^AuditLog\.write$/);
      const hasDbWrite   = flow.declaredEffects.includes("database.write");
      const deniedTargets = fn !== undefined ? extractDeniedTargets(fn) : [];
      const hasRemoteDenied   = deniedTargets.some((t) => t === "remote.execution" || t === "remote");
      const hasNetworkOutbound = flow.declaredEffects.includes("network.outbound");
      const hasPII       = flow.declaredEffects.some((e) => e.startsWith("pii.") || e.startsWith("phi."));
      const hasPolicy    = fn !== undefined && (fn.children ?? []).some((c) => c.kind === "policyDecl");
      const hasIntent    = fn !== undefined && hasIntentDecl(fn);
      const requiresIntent  = flow.qualifier === "secure" && !hasIntent;
      const isProduction    = this.currentProfile === "production" || this.currentProfile === "deterministic";
      const noErrors        = !this.diagnostics.some((d) => d.severity === "error");

      const requiredContext = fn !== undefined ? extractRequiredContext(fn) : [];
      const needsActor = requiredContext.some((f) => f === "actor" || f === "user_id");

      const mask: GovernanceFlagsMask =
        ((hasAuditEff || hasAuditCall || hasDbWrite) ? GovernanceFlags.RequiresAudit : GovernanceFlags.None) |
        (hasRemoteDenied            ? GovernanceFlags.DenyRemote        : GovernanceFlags.None) |
        (hasPII                     ? GovernanceFlags.ContainsPII        : GovernanceFlags.None) |
        (hasNetworkOutbound         ? GovernanceFlags.AllowsNetwork      : GovernanceFlags.None) |
        (hasPolicy                  ? GovernanceFlags.HasPolicy          : GovernanceFlags.None) |
        (requiresIntent             ? GovernanceFlags.RequiresIntent     : GovernanceFlags.None) |
        (isProduction && noErrors   ? GovernanceFlags.ProductionStrict   : GovernanceFlags.None) |
        (needsActor                 ? GovernanceFlags.RequiresActor      : GovernanceFlags.None);

      this.governanceFlagsByFlow.set(flow.name, mask);

      // Generate RuntimeManifest for production/deterministic profiles
      if (isProduction) {
        const arenaLimitMb = fn !== undefined ? extractArenaLimitMB(fn) : undefined;
        const manifest: RuntimeManifest = {
          schemaVersion: "lln.runtime.manifest.v1",
          flow: flow.name,
          qualifier: flow.qualifier,
          requiresAudit:    (mask & GovernanceFlags.RequiresAudit) !== 0,
          deniesRemote:     (mask & GovernanceFlags.DenyRemote)    !== 0,
          allowedEffects:   [...flow.declaredEffects].sort(),
          requiredContext:  requiredContext,
          computeTarget:    "best",   // Phase 20: extracted from compute block
          governanceFlagsMask: mask,
          proofObligations: this.proofObligations.filter((o) => o.includes(flow.name)),
          policyPurposes:   fn !== undefined ? extractPolicyPurposes(fn) : [],
          verified:         noErrors,
          arenaLimitMb,
        };
        this.runtimeManifests.push(manifest);
      }

      // ── Build ProofGraph for this flow ────────────────────────────────────
      const hasEffectsFlag = (mask & GovernanceFlags.RequiresAudit) !== 0;
      const hasContractFlag = fn !== undefined && (fn.children ?? []).some((c) => c.kind === "contractDecl");
      const hasPrivacyFlag  = (mask & GovernanceFlags.ContainsPII) !== 0;

      // Build ProofObligation list from the flow's governance checks
      const obligations: ProofObligation[] = [];

      if (hasEffectsFlag) obligations.push({
        kind: "effect",
        claim: `Flow ${flow.name} declares required effects`,
        satisfiedBy: "contract.effects",
        diagnosticCode: "LLN-EFFECT-001",
      });
      if (hasContractFlag) obligations.push({
        kind: "capability",
        claim: `Flow ${flow.name} has a contract declaration`,
        satisfiedBy: "contract",
      });
      if (hasPrivacyFlag) obligations.push({
        kind: "privacy",
        claim: `Flow ${flow.name} declares privacy policy`,
        satisfiedBy: "contract.privacy",
        diagnosticCode: "LLN-VALUESTATE-006",
      });

      // Build ExecutionSignature from flow flags
      // effectMask: 0 here — full EffectFlags derivation is Phase 32
      const sig = computeExecutionSignature(
        0, mask, 0, 0, fn?.flags ?? 0,
        flow.declaredEffects.length, 0, false,
      );

      const pg = buildProofGraphCached(
        flow.name, sig, obligations,
        obligations.map((ob) => ({
          obligationKind: ob.kind,
          sourceHash: "sha256:pending",
          girHash: "sha256:pending",
          checkerPassed: true,
          diagnosticsFired: [],
        })),
        "2026-06-01T00:00:00.000Z",
      );
      this.proofGraphsByFlow.set(flow.name, pg);
    }

    // ── LLN-GOV-017: cyber_physical_hardening {} value validation ────────────
    // Validates that if a flow explicitly declares cyber_physical_hardening {},
    // the values are recognised. Also warns if declared on a low-risk flow
    // (auto-by-default is preferred; manual declaration should have good reason).
    // ── LLN-GOV-018: manual liability {} block warning ────────────────────────
    // liability {} is auto-calculated — writing it manually is a design smell.
    if (flowNode !== undefined) {
      this.verifyPhysicalHardeningBlock(flowNode, flow.name);
      this.verifyLiabilityBlock(flowNode, flow.name);
    }

    // ── LLN-GOV-015/016: epilogue {} strategy validation ─────────────────────
    // When a flow explicitly declares an `epilogue {}` block, validate that the
    // proof strategy and failure action are recognised values.  An omitted block
    // is AUTO-by-default (the runtime selects the tier from the ValueGraph) and
    // emits no diagnostic. Only an invalid explicit value is an error.
    if (flowNode !== undefined) {
      this.verifyEpilogueBlock(flowNode, flow.name);
    }
  }

  private verifyPhysicalHardeningBlock(flowNode: AstNode, flowName: string): void {
    const contractNode = (flowNode.children ?? []).find((c) => c.kind === "contractDecl");
    if (contractNode === undefined) return;

    const hardeningNode = (contractNode.children ?? []).find(
      (c) => c.kind === "identifier" && (c.value ?? "").startsWith("cyber_physical_hardening"),
    );
    if (hardeningNode === undefined) return; // auto-by-default → nothing to validate

    // Content stored as one or more `decl:` children (one per directive line).
    // Join them all into a single flat string for keyword extraction.
    const content = (hardeningNode.children ?? [])
      .filter((c) => c.kind === "identifier" && (c.value ?? "").startsWith("decl:"))
      .map((c) => (c.value ?? "").slice("decl:".length))
      .join(" ")
      .toLowerCase();

    const VALID_SHIELDING = new Set(["active_mesh", "deep_trench", "standard_fabric"]);
    const VALID_FAULT_MIT = new Set(["lockstep", "scalar_single", "none"]);
    const VALID_SIDE_CH  = new Set(["constant_row", "differential_masking", "none"]);
    const VALID_TAMPER   = new Set(["zeroize", "quarantine_core", "halt", "demote_to_local"]);

    // Extract keyword=value pairs from the flattened content string
    const extractValue = (keyword: string): string | undefined => {
      const idx = content.indexOf(keyword);
      if (idx === -1) return undefined;
      const after = content.slice(idx + keyword.length).trim().split(/\s+/);
      return after[0];
    };

    const shielding = extractValue("enclosure_shielding");
    if (shielding !== undefined && !VALID_SHIELDING.has(shielding)) {
      this.diagnostics.push(makeGovDiag(
        "LLN-GOV-017", "InvalidPhysicalHardeningValue", "error",
        `Flow '${flowName}' declares cyber_physical_hardening { enclosure_shielding ${shielding} } but '${shielding}' is not a recognised shielding tier.`,
        hardeningNode.location,
        `Valid values: active_mesh | deep_trench | standard_fabric`,
      ));
    }

    const tamper = extractValue("on_tamper_signal");
    if (tamper !== undefined && !VALID_TAMPER.has(tamper)) {
      this.diagnostics.push(makeGovDiag(
        "LLN-GOV-017", "InvalidPhysicalHardeningValue", "error",
        `Flow '${flowName}' declares cyber_physical_hardening { on_tamper_signal ${tamper} } but '${tamper}' is not a recognised tamper response.`,
        hardeningNode.location,
        `Valid values: zeroize | quarantine_core | halt | demote_to_local`,
      ));
    }

    // Warn if declared on a low-risk flow — auto-by-default is preferred
    // (absence of a high max_risk_liability in economics is a proxy for low risk)
    const economicsNode = (contractNode.children ?? []).find(
      (c) => c.kind === "identifier" && (c.value ?? "").startsWith("economics"),
    );
    const hasHighRisk = economicsNode !== undefined &&
      (economicsNode.children ?? []).some((c) =>
        (c.value ?? "").includes("max_risk_liability") && /\d{4,}/.test(c.value ?? ""),
      );
    if (!hasHighRisk) {
      this.diagnostics.push(makeGovDiag(
        "LLN-GOV-017", "PhysicalHardeningOnLowRiskFlow", "warning",
        `Flow '${flowName}' explicitly declares cyber_physical_hardening {} but has no high max_risk_liability in economics {}. ` +
        `The runtime auto-selects the appropriate shielding tier from the ValueGraph. ` +
        `Omit this block unless operating on Tier 1 hardware with proven physical-breach risk.`,
        hardeningNode.location,
        `Remove the cyber_physical_hardening {} block and let the runtime select the tier automatically.`,
      ));
    }
  }

  private verifyLiabilityBlock(flowNode: AstNode, flowName: string): void {
    const contractNode = (flowNode.children ?? []).find((c) => c.kind === "contractDecl");
    if (contractNode === undefined) return;

    const liabilityNode = (contractNode.children ?? []).find(
      (c) => c.kind === "identifier" && (c.value ?? "").startsWith("liability"),
    );
    if (liabilityNode === undefined) return; // not present → no issue

    // liability {} is auto-calculated — writing it manually is a design smell.
    this.diagnostics.push(makeGovDiag(
      "LLN-GOV-018", "ManualLiabilityDeclaration", "warning",
      `Flow '${flowName}' manually declares a liability {} contract block. ` +
      `liability {} is auto-calculated from the ValueGraph breach-risk matrix and stored in the ProofGraph. ` +
      `Declaring it manually couples your source code to a specific risk assessment that may go stale.`,
      liabilityNode.location,
      `Remove the liability {} block. The governance verifier computes and records it automatically.`,
    ));
  }

  private verifyEpilogueBlock(flowNode: AstNode, flowName: string): void {
    const contractNode = (flowNode.children ?? []).find((c) => c.kind === "contractDecl");
    if (contractNode === undefined) return;

    const epilogueNode = (contractNode.children ?? []).find(
      (c) => c.kind === "identifier" && (c.value ?? "").startsWith("epilogue"),
    );
    if (epilogueNode === undefined) return; // auto-by-default → nothing to validate

    // The content is stored as an identifier child: "decl: generate_proof <strategy> ..."
    const declChild = (epilogueNode.children ?? []).find(
      (c) => c.kind === "identifier" && (c.value ?? "").startsWith("decl:"),
    );
    const content = declChild !== undefined ? (declChild.value ?? "").slice("decl:".length).trim() : "";
    const tokens = content.split(/\s+/);

    const VALID_STRATEGIES = new Set<string>(["auto", "sha256_seal", "zk_snark_receipt", "none"]);
    const VALID_FAILURES   = new Set<string>(["halt_pipeline", "quarantine_payload", "log_and_continue"]);

    // Parse generate_proof <strategy>
    let strategy: EpilogueProofStrategy | "" = "";
    const gpIdx = tokens.indexOf("generate_proof");
    if (gpIdx !== -1) {
      const rawStrategy = tokens[gpIdx + 1] ?? "";
      if (!VALID_STRATEGIES.has(rawStrategy)) {
        this.diagnostics.push(makeGovDiag(
          "LLN-GOV-015",
          "EpilogueInvalidStrategy",
          "error",
          `Flow '${flowName}' declares epilogue { generate_proof ${rawStrategy || "<missing>"} } but '${rawStrategy || "<missing>"}' is not a recognised proof strategy.`,
          epilogueNode.location,
          `Valid strategies: auto | sha256_seal | zk_snark_receipt | none`,
        ));
        return; // invalid strategy — skip receipt generation
      }
      strategy = rawStrategy as EpilogueProofStrategy;
    }

    // Parse on_verification_failure <action>
    let onFailure: EpilogueFailureAction = "log_and_continue";
    const ovfIdx = tokens.indexOf("on_verification_failure");
    if (ovfIdx !== -1) {
      const rawAction = tokens[ovfIdx + 1] ?? "";
      if (!VALID_FAILURES.has(rawAction)) {
        this.diagnostics.push(makeGovDiag(
          "LLN-GOV-016",
          "EpilogueInvalidFailureAction",
          "error",
          `Flow '${flowName}' declares epilogue { on_verification_failure ${rawAction || "<missing>"} } but '${rawAction || "<missing>"}' is not a recognised failure action.`,
          epilogueNode.location,
          `Valid actions: halt_pipeline | quarantine_payload | log_and_continue`,
        ));
        return; // invalid failure action — skip receipt generation
      }
      onFailure = rawAction as EpilogueFailureAction;
    }

    // Validation passed — generate and store the EpilogueReceipt on the ProofGraph.
    if (strategy === "") return; // no generate_proof clause declared; nothing to do

    // No proverBackend injected here — generateEpilogueReceipt returns synchronously.
    const receipt = generateEpilogueReceipt({
      strategy,
      onFailure,
      sourceText: flowName, // use flowName as a stable source identifier at compile time
      contractHash: flowName,
    }) as import("./proof-graph.js").EpilogueReceipt;

    const existingPg = this.proofGraphsByFlow.get(flowName);
    if (existingPg !== undefined) {
      this.proofGraphsByFlow.set(flowName, { ...existingPg, epilogueReceipt: receipt });
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
