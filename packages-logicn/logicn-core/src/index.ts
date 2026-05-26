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

/**
 * Minimal diagnostic shape shared across all LogicN packages.
 *
 * Every package-specific diagnostic type (LogicDiagnostic, ConfigDiagnostic,
 * SecurityDiagnostic, etc.) is structurally compatible with this interface.
 * Once workspace links are established, package diagnostics will formally
 * extend BaseDiagnostic via imports from @logicn/core.
 */
export interface BaseDiagnostic {
  /** Structured diagnostic code in LLN-SERIES-NNN format. */
  readonly code: string;
  /** Screaming-snake-case name. Example: "DUPLICATE_STATE". */
  readonly name: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
}

/**
 * Full compiler diagnostic — extends BaseDiagnostic with source location
 * and an optional suggested fix for IDE integration.
 */
export interface CompilerDiagnostic extends BaseDiagnostic {
  /**
   * Source location of the error or warning.
   * Absent for diagnostics that cannot be attributed to a specific position.
   */
  readonly location?: SourceLocation;
  /** Human-readable fix suggestion for IDE quick-fix integration. */
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
  | "charLiteral"
  | "byteLiteral"
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
// Note: EnvironmentMode is the canonical type for deployment environments.
// It is defined and owned by @logicn/core-config. When workspace links are
// established, packages that need EnvironmentMode should import it from there.
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
