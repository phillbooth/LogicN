// =============================================================================
// @logicn/devtools-security — Security Audit Runner
//
// Orchestrates all security checks into a single structured audit report.
// Designed for CI integration: parse source, run all checks, return JSON.
//
// Usage:
//   const report = await runSecurityAudit(source, { profile: ["strict"] });
//   if (report.critical.length > 0) process.exit(1);
// =============================================================================

import type {
  FlowMeta,
} from "@logicn/core-compiler";

import {
  parseProgram,
  checkEffects,
  verifyGovernance,
  checkTaint,
  checkProfiles,
  checkValueStates,
  type ProfileDiagnostic,
  type TaintDiagnostic,
  type GovernanceDiagnostic,
  type RuntimeProfile,
} from "@logicn/core-compiler";

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

export type SecuritySeverity = "critical" | "high" | "medium" | "low" | "info";

export interface SecurityFinding {
  readonly code:     string;
  readonly name:     string;
  readonly severity: SecuritySeverity;
  readonly message:  string;
  readonly flowName?: string;
  readonly checker:  "taint" | "profile" | "governance" | "value-safety" | "hardware";
}

export interface SecurityAuditReport {
  readonly schemaVersion: "lln.security-audit.v1";
  readonly source:        string;
  readonly profiles:      readonly RuntimeProfile[];
  readonly findings:      readonly SecurityFinding[];
  readonly critical:      readonly SecurityFinding[];
  readonly high:          readonly SecurityFinding[];
  readonly medium:        readonly SecurityFinding[];
  readonly low:           readonly SecurityFinding[];
  readonly passed:        boolean;
  readonly summary:       string;
  readonly checkedAt:     string;
}

export interface SecurityAuditOptions {
  /** Deployment profiles to enforce. Default: ["strict"] */
  readonly profiles?: readonly RuntimeProfile[];
  /**
   * Deployment mode for the governance verifier. Default: "dev".
   * Non-production modes ("dev", "check-only") grade advisory findings such as
   * LLN-GOV-010 (secure flow missing intent) as info, so they do not fail the
   * audit; "production"/"deterministic" promote them to errors.
   */
  readonly governanceProfile?: "dev" | "production" | "deterministic" | "check-only";
  /** Source file name for error reporting */
  readonly fileName?: string;
  /** Fail on warnings (medium/low) in addition to errors */
  readonly strict?: boolean;
}

// ---------------------------------------------------------------------------
// Severity mapping from checker codes
// ---------------------------------------------------------------------------

const SEVERITY_MAP: ReadonlyMap<string, SecuritySeverity> = new Map([
  // Taint
  ["LLN-TAINT-001", "critical"],
  ["LLN-TAINT-003", "high"],
  ["LLN-TAINT-004", "medium"],
  ["LLN-TAINT-005", "high"],
  ["LLN-TAINT-006", "high"],
  // Profile
  ["LLN-PROFILE-001", "high"],
  ["LLN-PROFILE-002", "high"],
  ["LLN-PROFILE-005B", "high"],
  ["LLN-PROFILE-006", "medium"],
  ["LLN-PROFILE-007", "high"],
  // Value/Safety
  ["LLN-VAL-001", "critical"],
  ["LLN-VAL-002", "critical"],
  ["LLN-VAL-003", "high"],
  // Hardware
  ["LLN-HW-001", "high"],
  ["LLN-HW-002", "medium"],
  ["LLN-HW-003", "medium"],
  // Value-state / taint-sink (unsafe bindings reaching governed sinks)
  ["LLN-VALUESTATE-001", "high"],
  ["LLN-VALUESTATE-002", "medium"],
  ["LLN-VALUESTATE-003", "high"],    // unsafe value reached governed sink — unredacted PII/data
  ["LLN-VALUESTATE-004", "medium"],
  ["LLN-VALUESTATE-005", "high"],    // derived-unsafe reached sink
  ["LLN-VALUESTATE-006", "medium"],
  ["LLN-VALUESTATE-007", "medium"],
  // Gate violations
  ["LLN-GATE-001", "high"],
  // Secret sink violations
  ["LLN-SECRET-001", "critical"],   // secret logged
  ["LLN-SECRET-002", "critical"],   // secret sent to network
  ["LLN-SECRET-003", "critical"],   // secret serialized
  // Governance
  ["LLN-GOV-002", "high"],
  ["LLN-GOV-009", "high"],
  ["LLN-SOURCE-ESCAPE-001", "critical"],
  ["LLN-SEC-020", "critical"],
  ["LLN-SEC-021", "critical"],
]);

function classifySeverity(code: string, defaultSeverity?: "error" | "warning" | "info"): SecuritySeverity {
  const mapped = SEVERITY_MAP.get(code);
  if (mapped !== undefined) return mapped;
  if (defaultSeverity === "error") return "high";
  if (defaultSeverity === "warning") return "medium";
  return "info";
}

function mapCheckerType(
  code: string,
): SecurityFinding["checker"] {
  if (code.startsWith("LLN-TAINT")) return "taint";
  if (code.startsWith("LLN-PROFILE")) return "profile";
  if (code.startsWith("LLN-VAL")) return "value-safety";
  if (code.startsWith("LLN-HW")) return "hardware";
  // GOV-017 covers cyber_physical_hardening validation — a hardware-domain concern.
  if (code === "LLN-GOV-017") return "hardware";
  return "governance";
}

// ---------------------------------------------------------------------------
// Main audit runner
// ---------------------------------------------------------------------------

/**
 * Run all security checks on a LogicN source string.
 *
 * Orchestrates: value-state checker → taint checker → profile checker → governance verifier.
 * Returns a structured SecurityAuditReport usable in CI.
 *
 * @param source  - LogicN source code (.lln content)
 * @param options - Audit configuration
 */
export async function runSecurityAudit(
  source: string,
  options: SecurityAuditOptions = {},
): Promise<SecurityAuditReport> {
  const {
    profiles = ["strict"],
    governanceProfile = "dev",
    fileName = "source.lln",
    strict = false,
  } = options;

  const findings: SecurityFinding[] = [];
  const checkedAt = new Date().toISOString();

  // Parse
  const parsed = parseProgram(source, fileName);
  const parseErrors = (parsed.diagnostics ?? []).filter(d => d.severity === "error");
  for (const e of parseErrors) {
    findings.push({
      code: e.code ?? "LLN-PARSE",
      name: "ParseError",
      severity: "high",
      message: e.message,
      checker: "governance",
    });
  }

  // If parse failed entirely, return early
  if (parseErrors.length > 0 && parsed.flows.length === 0) {
    return buildReport(source, profiles, findings, checkedAt);
  }

  // Value-state / taint-sink check (LLN-VALUESTATE, LLN-GATE, LLN-SECRET codes)
  // Tracks unsafe bindings flowing to governed sinks (AuditLog.write, DB, network).
  // Distinct from checkTaint (LLN-TAINT capability flags) — both are needed.
  const vsResult = checkValueStates(parsed.ast);
  for (const d of vsResult.diagnostics ?? []) {
    findings.push({
      code: d.code,
      name: (d as any).name ?? d.code,
      severity: classifySeverity(d.code, d.severity === "error" ? "error" : "warning"),
      message: d.message,
      checker: "value-safety" as const,
    });
  }

  // Capability-flag taint check (LLN-TAINT codes)
  const taintDiags: TaintDiagnostic[] = checkTaint(parsed.ast, parsed.flows);
  for (const d of taintDiags) {
    findings.push({ code: d.code, name: d.name, severity: classifySeverity(d.code, d.severity === "error" ? "error" : "warning"), message: d.message, checker: "taint" as const, ...(d.flowName !== undefined ? { flowName: d.flowName } : {}) });
  }

  // Profile check
  const profileDiags: ProfileDiagnostic[] = checkProfiles(parsed.ast, parsed.flows, profiles);
  for (const d of profileDiags) {
    findings.push({ code: d.code, name: d.name, severity: classifySeverity(d.code, d.severity === "error" ? "error" : "warning"), message: d.message, checker: "profile" as const, ...(d.flowName !== undefined ? { flowName: d.flowName } : {}) });
  }

  // Governance check (LLN-VAL, LLN-HW, LLN-GOV, etc.)
  const fx = checkEffects(parsed.flows, parsed.ast);
  const gov = verifyGovernance(parsed.ast, parsed.flows, fx, governanceProfile);
  for (const d of gov.diagnostics as readonly GovernanceDiagnostic[]) {
    findings.push({
      code: d.code,
      name: d.name ?? d.code,
      severity: classifySeverity(d.code, d.severity),
      message: d.message,
      checker: mapCheckerType(d.code),
    });
  }

  return buildReport(source, profiles, findings, checkedAt, strict);
}

function buildReport(
  source: string,
  profiles: readonly RuntimeProfile[],
  findings: readonly SecurityFinding[],
  checkedAt: string,
  strict = false,
): SecurityAuditReport {
  const critical = findings.filter(f => f.severity === "critical");
  const high     = findings.filter(f => f.severity === "high");
  const medium   = findings.filter(f => f.severity === "medium");
  const low      = findings.filter(f => f.severity === "low");

  const passed = strict
    ? findings.length === 0
    : critical.length === 0 && high.length === 0;

  const total  = findings.length;
  const status = passed ? "PASS" : "FAIL";
  const summary = total === 0
    ? `${status} — no security findings`
    : `${status} — ${critical.length} critical, ${high.length} high, ${medium.length} medium, ${low.length} low`;

  return {
    schemaVersion: "lln.security-audit.v1",
    source: source.slice(0, 200) + (source.length > 200 ? "..." : ""),
    profiles,
    findings,
    critical,
    high,
    medium,
    low,
    passed,
    summary,
    checkedAt,
  };
}
