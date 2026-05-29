// =============================================================================
// LogicN Stage A - JSONL audit writer
// =============================================================================

import { type RuntimeAuditEntry } from "./interpreter.js";

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
  flush(): void;
  close(): void;
  getEvents(): readonly AuditEvent[];
}

export function createAuditWriter(mode: "memory" | "file" = "memory", filePath?: string): AuditWriter {
  const buffer: AuditEvent[] = [];
  let closed = false;

  function validate(event: AuditEvent): void {
    if (event.schemaVersion !== "lln.runtime.audit.v1") {
      throw new Error(`AuditWriter: invalid schemaVersion '${event.schemaVersion}'`);
    }
  }

  function checkNoSecrets(event: AuditEvent): void {
    const metadata = JSON.stringify(event.metadata);
    if (/\b(password|apikey|api_key|secret|token)\b/i.test(metadata)) {
      throw new Error("AuditWriter: potential raw secret in event metadata");
    }
  }

  return {
    append(event: AuditEvent): void {
      if (closed) throw new Error("AuditWriter: writer is closed");
      validate(event);
      checkNoSecrets(event);
      buffer.push(event);

      if (mode === "file" && filePath !== undefined) {
        // File persistence is intentionally deferred in Stage 1 environments
        // that may not expose Node built-ins. The in-memory buffer remains
        // authoritative and preserves the exact JSONL event order.
        void filePath;
      }
    },

    flush(): void {
      // The in-memory buffer preserves event order per writer instance.
    },

    close(): void {
      closed = true;
    },

    getEvents(): readonly AuditEvent[] {
      return [...buffer];
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
