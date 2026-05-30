// =============================================================================
// LogicN Phase 9B — Event Checker
//
// Checks that events are declared before use (LLN-EVENT-001) and that
// declared events are emitted at least once (LLN-EVENT-002).
//
// Entry point: checkEvents(ast)
// =============================================================================

import { type AstNode, type SourceLocation } from "./parser.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface EventDiagnostic {
  readonly code: string;
  readonly name: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly location?: SourceLocation;
  readonly suggestedFix?: string;
}

export interface EventCheckResult {
  readonly diagnostics: readonly EventDiagnostic[];
}

// ---------------------------------------------------------------------------
// Diagnostic constants
// ---------------------------------------------------------------------------

export const LLN_EVENT_001 = {
  code: "LLN-EVENT-001",
  name: "EventNotDeclared",
  severity: "error" as const,
  message: "Event emitted but not declared at program scope. Add a top-level 'event EventName' declaration.",
};

export const LLN_EVENT_002 = {
  code: "LLN-EVENT-002",
  name: "EventNeverEmitted",
  severity: "warning" as const,
  message: "Event declared but never emitted anywhere in the program.",
};

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Walks the AST to collect declared events and emitted events, then checks
 * for mismatches.
 *
 * - LLN-EVENT-001: `emit X` in a flow body with no top-level `event X` declaration
 * - LLN-EVENT-002: `event X` declared globally but never emitted anywhere
 */
export function checkEvents(ast: AstNode): EventCheckResult {
  const diagnostics: EventDiagnostic[] = [];

  // Collect declared event names from top-level intentDecl nodes with value "event:X"
  const declaredEvents = new Set<string>();
  for (const child of ast.children ?? []) {
    if (child.kind === "intentDecl" && child.value?.startsWith("event:")) {
      const name = child.value.slice("event:".length);
      if (name !== "") declaredEvents.add(name);
    }
  }

  // Walk the entire AST to collect emitted events (identifier nodes with value "emit:X")
  const emittedEvents: Array<{ name: string; location: SourceLocation | undefined }> = [];

  function walk(node: AstNode): void {
    if (node.kind === "identifier" && node.value?.startsWith("emit:")) {
      const name = node.value.slice("emit:".length);
      if (name !== "") {
        emittedEvents.push({ name, location: node.location });
      }
    }
    for (const child of node.children ?? []) {
      walk(child);
    }
  }
  walk(ast);

  // LLN-EVENT-001: emitted name not in declared set
  for (const { name, location } of emittedEvents) {
    if (!declaredEvents.has(name)) {
      const d: EventDiagnostic = {
        code: LLN_EVENT_001.code,
        name: LLN_EVENT_001.name,
        severity: LLN_EVENT_001.severity,
        message: `Event '${name}' is emitted but not declared. Add: event ${name}`,
        ...(location !== undefined ? { location } : {}),
        suggestedFix: `Add at program scope: event ${name}`,
      };
      diagnostics.push(d);
    }
  }

  // LLN-EVENT-002: declared name not in emitted set
  const emittedNames = new Set(emittedEvents.map((e) => e.name));
  for (const name of declaredEvents) {
    if (!emittedNames.has(name)) {
      const d: EventDiagnostic = {
        code: LLN_EVENT_002.code,
        name: LLN_EVENT_002.name,
        severity: LLN_EVENT_002.severity,
        message: `Event '${name}' is declared but never emitted.`,
        suggestedFix: `Emit the event in a flow: emit ${name}`,
      };
      diagnostics.push(d);
    }
  }

  return { diagnostics };
}
