// =============================================================================
// logicn-core — canonical shared types for the LogicN platform
//
// Package: @logicn/core
// Role:    Foundational type definitions for compiler, runtime, and tooling.
//          The compiler itself (compiler/logicn.js) stays in plain CJS.
//          This module provides typed contracts for downstream packages.
// =============================================================================

// ---------------------------------------------------------------------------
// Diagnostic types
// ---------------------------------------------------------------------------

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface SourceLocation {
  /** Source file path (relative to project root). */
  readonly file: string;
  /** 1-based line number. */
  readonly line: number;
  /** 1-based column number. */
  readonly column: number;
}

export interface CompilerDiagnostic {
  /**
   * Structured diagnostic code in LLN-* format.
   * Example: "LLN-LEX-001", "LLN-TYPE-004".
   */
  readonly code: string;
  /** Human-readable code name. Example: "UNEXPECTED_CHARACTER". */
  readonly name: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly location?: SourceLocation;
  readonly suggestedFix?: string;
}

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

export type TokenKind =
  | "identifier"
  | "keyword"
  | "string"
  | "number"
  | "boolean"
  | "operator"
  | "symbol"
  | "comment"
  | "docComment"
  | "newline"
  | "eof";

export interface Token {
  readonly kind: TokenKind;
  readonly value: string;
  /** 1-based line number. */
  readonly line: number;
  /** 1-based column number. */
  readonly column: number;
  /** Byte offset of token start in source. */
  readonly start: number;
  /** Byte offset of token end in source (exclusive). */
  readonly end: number;
}

export interface LexResult {
  readonly tokens: readonly Token[];
  readonly diagnostics: readonly CompilerDiagnostic[];
}

// ---------------------------------------------------------------------------
// AST types
// ---------------------------------------------------------------------------

export type AstNodeKind =
  | "program"
  | "importDecl"
  | "useDecl"
  | "typeDecl"
  | "enumDecl"
  | "flowDecl"
  | "secureFlowDecl"
  | "pureFlowDecl"
  | "apiDecl"
  | "routeDecl"
  | "handlerDecl"
  | "effectsDecl"
  | "webhookDecl"
  | "computeDecl"
  | "targetDecl"
  | "letDecl"
  | "mutDecl"
  | "identifier"
  | "stringLiteral"
  | "numberLiteral"
  | "boolLiteral"
  | "binaryExpr"
  | "callExpr"
  | "memberExpr"
  | "matchExpr"
  | "matchArm"
  | "ifStmt"
  | "block"
  | "returnStmt"
  | "parallelBlock"
  | "workerDecl"
  | "channelDecl"
  | "checkpointStmt"
  | "rollbackStmt"
  | "traceFlowDecl"
  | "secretDecl"
  | "vaultGlobalDecl"
  | "securityBlock"
  | "permissionsBlock"
  | "jsonPolicyBlock"
  | "memoryBlock";

export interface AstNode {
  readonly kind: AstNodeKind;
  readonly location?: SourceLocation;
  /** Child nodes for structural nodes (blocks, declarations, etc.). */
  readonly children?: readonly AstNode[];
  /** Raw value for leaf nodes (literals, identifiers). */
  readonly value?: string;
}

export interface ParseResult {
  readonly ast?: AstNode;
  readonly diagnostics: readonly CompilerDiagnostic[];
}

// ---------------------------------------------------------------------------
// Build types
// ---------------------------------------------------------------------------

export type BuildOutputKind = "target" | "target-plan" | "report" | "manifest";

export interface BuildOutput {
  readonly path: string;
  readonly kind: BuildOutputKind;
  readonly format: "placeholder" | "javascript-placeholder" | "text" | "json" | "binary";
  readonly cleanup?: boolean;
}

export interface BuildManifest {
  readonly schemaVersion: string;
  readonly generatedAt: string;
  readonly project: string;
  readonly version: string;
  readonly targets: readonly string[];
  readonly outputs: readonly BuildOutput[];
  readonly diagnostics: readonly CompilerDiagnostic[];
}

// ---------------------------------------------------------------------------
// Environment mode (foundational)
// ---------------------------------------------------------------------------

export const LOGICN_ENVIRONMENT_MODES = [
  "development",
  "test",
  "staging",
  "production",
] as const;

export type EnvironmentMode = (typeof LOGICN_ENVIRONMENT_MODES)[number];

const ENVIRONMENT_MODE_SET: ReadonlySet<string> = new Set(
  LOGICN_ENVIRONMENT_MODES,
);

/**
 * Type guard for EnvironmentMode.
 * Safe to call with any unknown value.
 */
export function isEnvironmentMode(value: unknown): value is EnvironmentMode {
  return typeof value === "string" && ENVIRONMENT_MODE_SET.has(value);
}

// ---------------------------------------------------------------------------
// Compiler diagnostic helpers
// ---------------------------------------------------------------------------

/**
 * Construct a CompilerDiagnostic with the canonical LLN-* code format.
 */
export function createCompilerDiagnostic(
  code: string,
  name: string,
  severity: DiagnosticSeverity,
  message: string,
  location?: SourceLocation,
  suggestedFix?: string,
): CompilerDiagnostic {
  return {
    code,
    name,
    severity,
    message,
    ...(location === undefined ? {} : { location }),
    ...(suggestedFix === undefined ? {} : { suggestedFix }),
  };
}

/**
 * Returns true if the diagnostics array contains at least one error.
 */
export function hasErrors(
  diagnostics: readonly CompilerDiagnostic[],
): boolean {
  return diagnostics.some((d) => d.severity === "error");
}

/**
 * Returns only the diagnostics with the given severity.
 */
export function filterBySeverity(
  diagnostics: readonly CompilerDiagnostic[],
  severity: DiagnosticSeverity,
): readonly CompilerDiagnostic[] {
  return diagnostics.filter((d) => d.severity === severity);
}
