/**
 * AuditLogger — structured sidecar log channel for Tower executions
 *
 * Implements the LOAD→EXEC→ERASE breadcrumb pattern.
 * Every Tower action produces a structured AuditEvent referencing the artifact hash.
 *
 * Aligns with: CBOR Tag 410 AuditEvent schema (logicn-governed-tower-specification.md §3E)
 */

import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface TowerAuditEvent {
  readonly eventId:       string;   // unique per event: "EVT-{timestamp}-{seq}"
  readonly timestamp:     string;   // ISO 8601 UTC
  readonly phase:         "LOAD" | "EXEC" | "ERASE" | "TRAP" | "VIOLATION";
  readonly correlationId: string;   // flows through entire lifecycle
  readonly artifactHash:  string;   // sha256 of the .wasm/.lnb artifact
  readonly engineId:      string;   // "bitnet-cpu", "groq-cloud", "nvfp4", "logicn"
  readonly severity:      "INFO" | "WARNING" | "ERROR" | "CRITICAL";
  readonly category:      "LIFECYCLE" | "RUNTIME_VIOLATION" | "GOVERNANCE_DENIED" | "AUDIT_TRAIL" | "RESOURCE_LIMIT";
  readonly details:       Record<string, unknown>;
  readonly governancePass: boolean;
}

export interface AuditFilter {
  correlationId?: string;
  phase?: TowerAuditEvent["phase"];
  severity?: TowerAuditEvent["severity"];
  since?: string; // ISO timestamp
  limit?: number;
}

export class AuditLogger {
  private readonly logPath: string;
  private seq = 0;

  constructor(logDir = "build/audit-log") {
    mkdirSync(logDir, { recursive: true });
    this.logPath = join(logDir, "tower-citizen-audit.jsonl");
  }

  append(event: Omit<TowerAuditEvent, "eventId" | "timestamp">): TowerAuditEvent {
    const full: TowerAuditEvent = {
      ...event,
      eventId: `EVT-${Date.now()}-${++this.seq}`,
      timestamp: new Date().toISOString(),
    };
    appendFileSync(this.logPath, JSON.stringify(full) + "\n");
    return full;
  }

  load(correlationId: string, artifactHash: string, engineId: string): TowerAuditEvent {
    return this.append({
      phase: "LOAD", correlationId, artifactHash, engineId,
      severity: "INFO", category: "LIFECYCLE",
      details: { action: "artifact_loaded" },
      governancePass: true,
    });
  }

  exec(correlationId: string, artifactHash: string, engineId: string, inputHash: string): TowerAuditEvent {
    return this.append({
      phase: "EXEC", correlationId, artifactHash, engineId,
      severity: "INFO", category: "LIFECYCLE",
      details: { inputHash, action: "execution_started" },
      governancePass: true,
    });
  }

  trap(correlationId: string, artifactHash: string, engineId: string, violation: string, details: Record<string, unknown>): TowerAuditEvent {
    return this.append({
      phase: "TRAP", correlationId, artifactHash, engineId,
      severity: "ERROR", category: "RUNTIME_VIOLATION",
      details: { violation, rollbackStatus: "clean", ...details },
      governancePass: false,
    });
  }

  erase(correlationId: string, artifactHash: string, engineId: string, success: boolean, outputHash?: string): TowerAuditEvent {
    return this.append({
      phase: "ERASE", correlationId, artifactHash, engineId,
      severity: success ? "INFO" : "WARNING", category: "LIFECYCLE",
      details: { success, outputHash, action: "sandbox_erased" },
      governancePass: success,
    });
  }

  query(filter: AuditFilter = {}): TowerAuditEvent[] {
    if (!existsSync(this.logPath)) return [];
    const lines = readFileSync(this.logPath, "utf-8").trim().split("\n").filter(Boolean);
    let events = lines.map(l => { try { return JSON.parse(l) as TowerAuditEvent; } catch { return null; } }).filter((e): e is TowerAuditEvent => e !== null);
    if (filter.correlationId) events = events.filter(e => e.correlationId === filter.correlationId);
    if (filter.phase) events = events.filter(e => e.phase === filter.phase);
    if (filter.severity) events = events.filter(e => e.severity === filter.severity);
    if (filter.since) events = events.filter(e => e.timestamp >= filter.since!);
    if (filter.limit) events = events.slice(-filter.limit);
    return events;
  }

  /** Return the LOAD→EXEC→ERASE lifecycle for a correlationId */
  getLifecycle(correlationId: string): { complete: boolean; phases: TowerAuditEvent["phase"][]; violations: string[] } {
    const events = this.query({ correlationId });
    const phases = events.map(e => e.phase);
    const violations = events.filter(e => e.phase === "TRAP" || e.phase === "VIOLATION").map(e => String(e.details["violation"] ?? "unknown"));
    return {
      complete: phases.includes("LOAD") && phases.includes("ERASE"),
      phases,
      violations,
    };
  }
}
