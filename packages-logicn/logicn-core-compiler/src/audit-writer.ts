// =============================================================================
// LogicN Stage A — JSONL audit writer
//
// Implements the 7-rule JSONL audit contract from:
//   docs/Knowledge-Bases/logicn-audit-writer-spec.md
//
// Rules:
//   1. Append-only — never overwrite or delete records
//   2. One record per line — no multiline JSON
//   3. Newline-terminated — each record ends with \n
//   4. Reject invalid schemaVersion
//   5. Reject raw secrets in metadata
//   6. No pretty-printing — compact single-line JSON only
//   7. Preserve event order per writer instance
// =============================================================================

import { appendFileSync } from "node:fs";
import { type RuntimeAuditEntry } from "./interpreter.js";
import { type EvidenceRecord, type DenialRecord } from "./proof-chain.js";

export interface AuditEvent {
  readonly schemaVersion: "lln.runtime.audit.v1";
  readonly id: string;
  readonly timestamp: string;
  readonly status: "Success" | "Denied" | "Failed" | "Unsafe" | "Warning";
  readonly eventType: string;
  readonly source: "logicn-runtime";
  readonly message: string;
  readonly flowName: string;
  readonly qualifier: string;
  readonly traceId: string;
  readonly metadata: Readonly<Record<string, string>>;
  readonly evidence: readonly unknown[];
}

export interface AuditWriter {
  append(event: AuditEvent): void;
  /** Serialize all buffered events as JSONL — one compact JSON object per line. */
  toJSONL(): string;
  flush(): void;
  close(): void;
  getEvents(): readonly AuditEvent[];
  /** Track a validation gate firing (for evidence record). */
  recordGateFired(gateName: string): void;
  /** Track a redaction applied (for evidence record). */
  recordRedaction(bindingName: string): void;
  /** Track a governance denial (for denial record). */
  recordDenial(reason: string, flowName: string): void;
  /** Build the evidence record for the current session. */
  getEvidenceRecord(): EvidenceRecord;
  /** Get all denials recorded in this session. */
  getDenials(): readonly DenialRecord[];
}

export function createAuditWriter(mode: "memory" | "file" = "memory", filePath?: string): AuditWriter {
  const buffer: AuditEvent[] = [];
  const gatesFired: string[] = [];
  const redactionsApplied: string[] = [];
  const denials: DenialRecord[] = [];
  const effectsObserved: string[] = [];
  let closed = false;

  // Rule 4: reject invalid schemaVersion
  function validate(event: AuditEvent): void {
    if (event.schemaVersion !== "lln.runtime.audit.v1") {
      throw new Error(`AuditWriter: invalid schemaVersion '${event.schemaVersion}'`);
    }
  }

  // Rule 5: reject raw secrets in metadata
  function checkNoSecrets(event: AuditEvent): void {
    const metadata = JSON.stringify(event.metadata);
    if (/\b(password|apikey|api_key|secret|token)\b/i.test(metadata)) {
      throw new Error("AuditWriter: potential raw secret in event metadata");
    }
  }

  // Rule 6: compact single-line JSON — no pretty-printing
  function toLine(event: AuditEvent): string {
    return JSON.stringify(event); // Rule 3: newline added by caller
  }

  // Write to file when in file mode
  function persistToFile(event: AuditEvent): void {
    if (mode === "file" && filePath !== undefined) {
      try {
        // Rule 1 (append-only), Rule 2 (one line), Rule 3 (\n-terminated)
        appendFileSync(filePath, toLine(event) + "\n", "utf8");
      } catch {
        // Fail silently in Stage 1 — in-memory buffer is always authoritative
      }
    }
  }

  return {
    append(event: AuditEvent): void {
      if (closed) throw new Error("AuditWriter: writer is closed");
      validate(event);      // Rule 4
      checkNoSecrets(event); // Rule 5
      buffer.push(event);   // Rule 7: preserves order
      persistToFile(event); // Rule 1, 2, 3, 6
    },

    // Rule 2 + 3 + 6: compact JSONL
    toJSONL(): string {
      return buffer.map((e) => toLine(e)).join("\n") + (buffer.length > 0 ? "\n" : "");
    },

    flush(): void {
      // In-memory mode: buffer already preserves order (Rule 7)
      // File mode: appendFileSync writes immediately in append()
    },

    close(): void {
      closed = true;
    },

    getEvents(): readonly AuditEvent[] {
      return [...buffer];
    },

    recordGateFired(gateName: string): void {
      gatesFired.push(gateName);
    },

    recordRedaction(bindingName: string): void {
      redactionsApplied.push(bindingName);
    },

    recordDenial(reason: string, flowName: string): void {
      denials.push({
        denialId: `denial_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        reason,
        flowName,
        timestamp: new Date().toISOString(),
      });
    },

    getEvidenceRecord(): EvidenceRecord {
      return {
        validationGatesFired: [...gatesFired],
        redactionsApplied: [...redactionsApplied],
        effectsObserved: [...effectsObserved],
        timestamp: new Date().toISOString(),
      };
    },

    getDenials(): readonly DenialRecord[] {
      return [...denials];
    },
  };
}

export function buildFlowAuditEvent(
  flowName: string,
  qualifier: string,
  status: AuditEvent["status"],
  traceId: string,
  entries: readonly RuntimeAuditEntry[],
): AuditEvent {
  const metadata: Record<string, string> = {};
  for (const entry of entries) {
    for (const [key, value] of Object.entries(entry.fields)) {
      metadata[`${entry.event}.${key}`] = value;
    }
  }

  return {
    schemaVersion: "lln.runtime.audit.v1",
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    status,
    eventType: "FunctionExecution",
    source: "logicn-runtime",
    message: `Flow '${flowName}' ${status.toLowerCase()}`,
    flowName,
    qualifier,
    traceId,
    metadata,
    evidence: [],
  };
}
