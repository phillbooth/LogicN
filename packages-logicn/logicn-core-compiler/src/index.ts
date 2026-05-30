// =============================================================================
// logicn-core-compiler — compiler pipeline contracts
//
// Package: @logicn/core-compiler
// Role:    Parsing, checking, diagnostics, and IR contracts for the
//          LogicN compiler pipeline.
//
// Phase 3: scanner-level safety rules (validateCoreSyntaxSafety)
// Phase 4: lexer + parser (lex, parseProgram)
// Phase 5: effect checker (checkEffects, checkFlowEffects)
// =============================================================================

// Phase 4 — Lexer
export {
  lex,
  V1_ACTIVE_KEYWORDS,
  V1_FUTURE_RESERVED,
  type Token,
  type TokenKind,
  type LexResult,
  type LexerDiagnostic,
} from "./lexer.js";

// Phase 4 — Parser
export {
  parseProgram,
  type AstNode,
  type AstNodeKind,
  type ParseResult,
  type ParseDiagnostic,
  type FlowMeta,
  type SourceLocation as ParserSourceLocation,
} from "./parser.js";

// Phase 5 — Effect Checker
export {
  checkEffects,
  checkFlowEffects,
  effectResultsToDiagnostics,
  type EffectCheckResult,
  type EffectDiagnostic,
} from "./effect-checker.js";

// Phase 6 — Value-State Checker
export {
  checkValueStates,
  type ValueStateDiagnostic,
  type ValueStateCheckResult,
} from "./value-state-checker.js";

/** LLN-VALUESTATE-005: A value derived from an unsafe binding reached a governed sink. */
export const LLN_VALUESTATE_005 = {
  code: "LLN-VALUESTATE-005",
  name: "DERIVED_UNSAFE_VALUE_AT_SINK",
  severity: "error" as const,
  message: "A value derived from an unsafe binding reached a governed sink. Even after transformation (e.g. .trim()), a value derived from unsafe input is still tainted.",
  why: "SQL injection and similar attacks pass through string methods like .trim(), .replace(), and .toLowerCase().",
  suggestedFix: "Use a validation gate (validate.*, sanitize.*) to transform the unsafe value into a safe/validated type.",
};

// Phase 6 — Type Checker
export {
  checkTypes,
  type TypeDiagnostic,
  type TypeCheckResult,
} from "./type-checker.js";

/** LLN-TYPE-003: raw String assigned to a branded type (Brand<T,"Name"> alias) without a validation gate. */
export const LLN_TYPE_003 = {
  code: "LLN-TYPE-003",
  name: "InvalidNominalConversion",
  severity: "error",
  message:
    "Branded types (type X = Brand<T, \"Name\">) cannot be assigned a raw String value. "
    + "Use a validation gate such as validate.x(raw)? to produce a trusted branded value.",
} as const;

export const LLN_TYPE_010 = { code: "LLN-TYPE-010", name: "CollectionElementTypeMismatch", severity: "error", message: "Collection element type mismatch." } as const;
export const LLN_TYPE_011 = { code: "LLN-TYPE-011", name: "MapKeyTypeViolation", severity: "error", message: "Map key or value type mismatch." } as const;
export const LLN_TYPE_012 = { code: "LLN-TYPE-012", name: "TensorElementTypeMismatch", severity: "error", message: "Tensor element type does not match declared element type." } as const;
export const LLN_TYPE_013 = { code: "LLN-TYPE-013", name: "TensorShapeIncompatibility", severity: "error", message: "Tensor shape incompatibility — shapes cannot be assigned or composed." } as const;
export const LLN_TYPE_014 = { code: "LLN-TYPE-014", name: "ChannelTypeMismatch", severity: "error", message: "Channel element type mismatch." } as const;
export const LLN_TYPE_015 = { code: "LLN-TYPE-015", name: "EnumVariantTypeMismatch", severity: "error", message: "Wrong enum variant used in this context." } as const;
export const LLN_TYPE_016 = { code: "LLN-TYPE-016", name: "GenericConstraintViolation", severity: "error", message: "Type does not satisfy the required generic constraint." } as const;
export const LLN_TYPE_017 = { code: "LLN-TYPE-017", name: "NumericPrecisionLoss", severity: "warning", message: "Implicit numeric narrowing may lose precision (e.g. Float64 → Float16)." } as const;
export const LLN_TYPE_018 = { code: "LLN-TYPE-018", name: "ProtectedBoundaryViolation", severity: "error", message: "A protected value is used where the plain (unprotected) type is required. Remove the protection qualifier explicitly before use." } as const;
export const LLN_TYPE_019 = { code: "LLN-TYPE-019", name: "RedactedBoundaryViolation", severity: "error", message: "A redacted value cannot be converted back to its original type. Redaction is irreversible." } as const;

export {
  resolveSymbols,
  type SymbolDiagnostic,
  type SymbolResolveResult,
} from "./symbol-resolver.js";

// Pass 8 - GIR Emitter
export {
  emitGIR,
  emitExpr,
  type GIRFlow,
  type GIRProgram,
  type GIREmitResult,
  type GIRExpr,
  type GIRRecordField,
} from "./gir-emitter.js";

// Stage A - AST Interpreter
export {
  executeFlow,
  LLN_VOID,
  LLN_NONE,
  type LogicNValue,
  type ExecutionResult,
  type ExecutionAuditRecord,
  type FlowExecutionResult,
  type RuntimeAuditEntry,
} from "./interpreter.js";

// Stage A - Audit Writer
export {
  createAuditWriter,
  buildFlowAuditEvent,
  type AuditEvent,
  type AuditWriter,
} from "./audit-writer.js";

// Stage A - Runtime Pipeline
export {
  run,
  serve,
  type RuntimeResult,
  type RuntimeOptions,
  type RuntimeMode,
} from "./runtime.js";

// Stage A - Route Registry
export {
  buildRouteRegistry,
  type RouteEntry,
  type RouteRegistry,
  type RouteMatch,
} from "./route-registry.js";

// Stage A - Route Dispatcher
export {
  startServer,
  makeResponseValue,
  makeApiErrorValue,
  type ServerConfig,
  type RunningServer,
} from "./route-dispatcher.js";

// Stage A - Standard Library
export {
  callStdlib,
  jsObjectToLogicN,
  logicNValuesEqual,
  type StdlibContext,
} from "./stdlib.js";

// Stage A - Proof Chain
export {
  buildProofChain,
  verifyProofChain,
  type ExecutionProofChain,
  type ProofHashes,
  type EvidenceRecord,
  type DenialRecord,
  type ProofChainInputs,
} from "./proof-chain.js";

// Stage A - Governance Verifier
export {
  verifyGovernance,
  LLN_GOV_003,
  LLN_CONTEXT_001,
  LLN_GOV_011,
  LLN_GOV_012,
  type GovernanceDiagnostic,
  type GovernanceVerifyResult,
  type DeploymentProfile,
} from "./governance-verifier.js";

// Phase 9B — Event Checker
export {
  checkEvents,
  LLN_EVENT_001,
  LLN_EVENT_002,
  type EventDiagnostic,
  type EventCheckResult,
} from "./event-checker.js";

// Phase 10A — Signed Attestation
export {
  buildAttestation,
  signAttestation,
  verifyAttestation,
  generateAttestationKey,
  attestationToYaml,
  attestationFromJson,
  type LogicNAttestation,
  type AttestationInputs,
  type AttestationKeyPair,
} from "./attestation.js";

// Phase 11C — Runtime Contract Enforcement
export {
  createContractEnforcer,
  type ContractEnforcer,
} from "./runtime/contractEnforcer.js";

export type { ContractEnforcementRecord } from "./runtime/runtimeReport.js";
export type { RuntimeContext } from "./runtime/runtimeContext.js";

// Phase 11C — Capability Host
export {
  createCapabilityHost,
  type CapabilityHost,
  type CapabilityCall,
  type CapabilityResult,
  type CapabilityCheckResult,
} from "./runtime/capabilityHost.js";

// Phase 11D — Governed Memory (skeleton)
export {
  createGovernedMemory,
  type GovernedMemory,
  type GovernedValueTag,
} from "./runtime/governedMemory.js";

export interface CompilerInput {
  readonly projectRoot: string;
  readonly entryFiles: readonly string[];
}

export interface SourceLocation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
}

export interface CompilerDiagnostic {
  readonly code: string;
  /** Screaming-snake-case diagnostic name, e.g. "TRI_BRANCH_CONDITION". */
  readonly name: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
  readonly location?: SourceLocation;
  /** Human-readable fix suggestion for IDE quick-fix integration. */
  readonly suggestedFix?: string;
}

export interface CompilerResult {
  readonly ok: boolean;
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly reports: readonly string[];
}

export interface CompilerSourceText {
  readonly file: string;
  readonly text: string;
}

export interface CoreSyntaxSafetyOptions {
  readonly scanSecrets?: boolean;
  readonly scanUnsafeDynamicCode?: boolean;
}

// ---------------------------------------------------------------------------
// Intent and safety level types
// ---------------------------------------------------------------------------

/**
 * All recognised flow safety levels — mirrors SafetyLevel in @logicn/core.
 * Kept local until workspace links are in place.
 */
export type CompilerSafetyLevel =
  | "safe"
  | "guarded"
  | "privileged"
  | "unsafe"
  | "experimental";

/**
 * A kind mismatch found during intent/effect consistency checking.
 */
export type IntentMismatchKind =
  | "undeclared_effect"
  | "destructive_effect_in_safe_flow"
  | "missing_intent"
  | "unsafe_without_fallback"
  | "unsafe_without_reason"
  | "privileged_without_capability"
  | "experimental_in_production";

export interface IntentMismatch {
  readonly kind: IntentMismatchKind;
  readonly message: string;
  readonly path?: string;
}

/**
 * Result of running the intent/effect consistency checker on a single flow.
 * Structurally compatible with CompilerResult.
 */
export interface IntentCheckResult {
  readonly flowName: string;
  readonly safetyLevel: CompilerSafetyLevel;
  readonly intent?: string;
  readonly declaredEffects: readonly string[];
  /** Effects the checker could infer from the flow body. */
  readonly inferredEffects: readonly string[];
  readonly mismatches: readonly IntentMismatch[];
  readonly diagnostics: readonly CompilerDiagnostic[];
}

// ---------------------------------------------------------------------------
// Intent diagnostic codes — LLN-INTENT-001..005
//
// Note: The source document uses "LN-INTENT-*"; the canonical repo format
// is "LLN-INTENT-*" (matching LLN-CONFIG-*, LLN-LOGIC-*, etc.).
// ---------------------------------------------------------------------------

/** Declared intent conflicts with inferred behavior (e.g. delete in a "send receipt" flow). */
export const LLN_INTENT_001 = {
  code: "LLN-INTENT-001",
  name: "INTENT_BEHAVIOR_MISMATCH",
  severity: "error",
  message: "Declared intent conflicts with inferred behavior.",
} as const;

/** API route, webhook, payment flow, or other governed surface is missing a required intent declaration. */
export const LLN_INTENT_002 = {
  code: "LLN-INTENT-002",
  name: "MISSING_REQUIRED_INTENT",
  severity: "error",
  message: "Governed surface requires an intent declaration.",
} as const;

/** Unsafe block is missing a reason, approval, or fallback declaration. */
export const LLN_INTENT_003 = {
  code: "LLN-INTENT-003",
  name: "UNSAFE_MISSING_REASON_OR_FALLBACK",
  severity: "error",
  message: "Unsafe block must declare reason, approval, and a safe fallback.",
} as const;

/** Privileged flow does not declare the required capability. */
export const LLN_INTENT_004 = {
  code: "LLN-INTENT-004",
  name: "PRIVILEGED_MISSING_CAPABILITY",
  severity: "error",
  message: "Privileged flow must declare its required capability.",
} as const;

/** Experimental flow or block is included in a production build target. */
export const LLN_INTENT_005 = {
  code: "LLN-INTENT-005",
  name: "EXPERIMENTAL_IN_PRODUCTION",
  severity: "error",
  message: "Experimental code must not be included in a production build target without explicit approval.",
} as const;

export const LLN_INTENT_DIAGNOSTICS = [
  LLN_INTENT_001,
  LLN_INTENT_002,
  LLN_INTENT_003,
  LLN_INTENT_004,
  LLN_INTENT_005,
] as const;

// ---------------------------------------------------------------------------
// Syntax diagnostics — LLN-SYNTAX-001..002
// ---------------------------------------------------------------------------

/** `var` is not a valid LogicN keyword. Use `let` or `mut`. */
export const LLN_SYNTAX_001 = {
  code: "LLN-SYNTAX-001",
  name: "VAR_NOT_SUPPORTED",
  severity: "error",
  message: "LogicN does not support var. Use let for immutable bindings or mut for mutable bindings.",
} as const;

/** `const` is not a valid LogicN keyword. Use `let` or `readonly`. */
export const LLN_SYNTAX_002 = {
  code: "LLN-SYNTAX-002",
  name: "CONST_NOT_SUPPORTED",
  severity: "error",
  message: "LogicN does not support const. Use let for immutable bindings or readonly for read-only values.",
} as const;

/** `let` binding at top level — must be inside a flow. */
export const LLN_SYNTAX_006 = {
  code: "LLN-SYNTAX-006",
  name: "LET_AT_TOP_LEVEL",
  severity: "error",
  message: "Top-level let bindings are not allowed. Move this inside a flow, or use const for compile-time constants.",
} as const;

/** `mut` binding at top level — mutable state must be flow-local. */
export const LLN_SYNTAX_007 = {
  code: "LLN-SYNTAX-007",
  name: "MUT_AT_TOP_LEVEL",
  severity: "error",
  message: "Top-level mut bindings are not allowed. Mutable state must be flow-local.",
} as const;

/** `unsafe let` at top level — boundary data must be owned by a secure flow. */
export const LLN_SYNTAX_008 = {
  code: "LLN-SYNTAX-008",
  name: "UNSAFE_LET_AT_TOP_LEVEL",
  severity: "error",
  message: "unsafe let is only allowed inside a secure flow. Boundary data must be owned by a governed flow.",
} as const;

/** `emit` at top level — events may only be emitted inside flows. */
export const LLN_SYNTAX_009 = {
  code: "LLN-SYNTAX-009",
  name: "EMIT_AT_TOP_LEVEL",
  severity: "error",
  message: "Events may only be emitted inside flows. Declare events globally, emit them inside governed execution.",
} as const;

export const LLN_SYNTAX_DIAGNOSTICS = [
  LLN_SYNTAX_001,
  LLN_SYNTAX_002,
  LLN_SYNTAX_006,
  LLN_SYNTAX_007,
  LLN_SYNTAX_008,
  LLN_SYNTAX_009,
] as const;

// ---------------------------------------------------------------------------
// Binding diagnostics — LLN-BINDING-001..004
// ---------------------------------------------------------------------------

/** Attempt to reassign an immutable `let` binding. */
export const LLN_BINDING_001 = {
  code: "LLN-BINDING-001",
  name: "IMMUTABLE_LET_REASSIGNMENT",
  severity: "error",
  message: "Cannot reassign immutable let binding. Use mut only if reassignment is required.",
} as const;

/** Attempt to reassign a `readonly` binding. */
export const LLN_BINDING_002 = {
  code: "LLN-BINDING-002",
  name: "READONLY_REASSIGNMENT",
  severity: "error",
  message: "Cannot reassign readonly binding.",
} as const;

/** Attempt to mutate a value through a `readonly` binding. */
export const LLN_BINDING_003 = {
  code: "LLN-BINDING-003",
  name: "READONLY_PROPERTY_MUTATION",
  severity: "error",
  message: "Cannot mutate a value through a readonly binding.",
} as const;

/** `mut` binding used in a pure or safe context where mutation is forbidden. */
export const LLN_BINDING_004 = {
  code: "LLN-BINDING-004",
  name: "MUT_IN_PURE_CONTEXT",
  severity: "error",
  message: "mut binding used where mutation is forbidden. Use let or a functional accumulator (fold, count, filter).",
} as const;

/** LLN-BINDING-005: Reassignment of immutable let binding denied. */
export const LLN_BINDING_005 = {
  code: "LLN-BINDING-005",
  name: "IMMUTABLE_BINDING_REASSIGNED",
  severity: "error",
  message: "Cannot reassign an immutable 'let' binding. Use 'mut' if reassignment is intended.",
} as const;

/** LLN-BINDING-006: Type-changing reassignment of mut binding denied. */
export const LLN_BINDING_006 = {
  code: "LLN-BINDING-006",
  name: "MUT_TYPE_CHANGE",
  severity: "error",
  message: "Cannot change the type of a 'mut' binding on reassignment. 'mut' bindings are type-stable.",
} as const;

export const LLN_BINDING_DIAGNOSTICS = [
  LLN_BINDING_001,
  LLN_BINDING_002,
  LLN_BINDING_003,
  LLN_BINDING_004,
  LLN_BINDING_005,
  LLN_BINDING_006,
] as const;

// ---------------------------------------------------------------------------
// Raw-pointer diagnostics — LLN-RAWPTR-001
// ---------------------------------------------------------------------------

/**
 * Raw pointer syntax detected outside an approved unsafe block.
 *
 * LogicN bans raw pointer access in normal code. Only approved unsafe blocks
 * may use raw pointer expressions, and they must declare reason + fallback.
 */
export const LLN_RAWPTR_001 = {
  code: "LLN-RAWPTR-001",
  name: "RAW_POINTER_OUTSIDE_UNSAFE",
  severity: "error",
  message: "Raw pointer access is not allowed in normal LogicN code. Move this into an approved unsafe block with declared reason and fallback.",
} as const;

export const LLN_RAWPTR_DIAGNOSTICS = [LLN_RAWPTR_001] as const;

// ---------------------------------------------------------------------------
// Pipeline diagnostics — LLN-PIPELINE-001..005
// ---------------------------------------------------------------------------

/** A method called in a pipeline chain does not exist on the current type. */
export const LLN_PIPELINE_001 = {
  code: "LLN-PIPELINE-001",
  name: "UNKNOWN_PIPELINE_METHOD",
  severity: "error",
  message: "Unknown method in pipeline chain.",
} as const;

/** The return type of a pipeline stage does not match the input of the next. */
export const LLN_PIPELINE_002 = {
  code: "LLN-PIPELINE-002",
  name: "PIPELINE_TYPE_MISMATCH",
  severity: "error",
  message: "Pipeline stage output type does not match the next stage's input type.",
} as const;

/** A pipeline contains a fallible stage whose Result is not handled. */
export const LLN_PIPELINE_003 = {
  code: "LLN-PIPELINE-003",
  name: "UNHANDLED_FALLIBLE_PIPELINE",
  severity: "error",
  message: "Fallible pipeline stage produces a Result that is not handled or propagated.",
} as const;

/** A pipeline stage uses an effect not declared on the enclosing flow. */
export const LLN_PIPELINE_004 = {
  code: "LLN-PIPELINE-004",
  name: "PIPELINE_UNDECLARED_EFFECT",
  severity: "error",
  message: "Pipeline stage requires an effect that is not declared on the enclosing flow.",
} as const;

/** A pipeline attempts to mutate a value through a readonly receiver. */
export const LLN_PIPELINE_005 = {
  code: "LLN-PIPELINE-005",
  name: "PIPELINE_READONLY_MUTATION",
  severity: "error",
  message: "Pipeline stage attempts to mutate a readonly receiver.",
} as const;

export const LLN_PIPELINE_DIAGNOSTICS = [
  LLN_PIPELINE_001,
  LLN_PIPELINE_002,
  LLN_PIPELINE_003,
  LLN_PIPELINE_004,
  LLN_PIPELINE_005,
] as const;

// ---------------------------------------------------------------------------
// Typed content block diagnostics — LLN-BLOCK-001..004
// ---------------------------------------------------------------------------

/** Unknown typed content block type — only html, dom, script, css are valid. */
export const LLN_BLOCK_001 = {
  code: "LLN-BLOCK-001",
  name: "UNKNOWN_CONTENT_BLOCK_TYPE",
  severity: "error",
  message: "Unknown typed content block type. Valid types are: html, dom, script, css.",
} as const;

/** Typed content block was opened but its closing marker was never found. */
export const LLN_BLOCK_002 = {
  code: "LLN-BLOCK-002",
  name: "UNCLOSED_CONTENT_BLOCK",
  severity: "error",
  message: "Typed content block is never closed. The closing marker must appear alone at the start of a line.",
} as const;

/** The closing marker does not match the opening marker. */
export const LLN_BLOCK_003 = {
  code: "LLN-BLOCK-003",
  name: "MISMATCHED_CONTENT_BLOCK_MARKER",
  severity: "error",
  message: "Typed content block closing marker does not match the opening marker.",
} as const;

/** A ProtectedSecret value was emitted into a script or html block. */
export const LLN_BLOCK_004 = {
  code: "LLN-BLOCK-004",
  name: "SECRET_IN_CONTENT_BLOCK",
  severity: "error",
  message: "ProtectedSecret cannot be emitted into a typed content block.",
} as const;

export const LLN_BLOCK_DIAGNOSTICS = [
  LLN_BLOCK_001,
  LLN_BLOCK_002,
  LLN_BLOCK_003,
  LLN_BLOCK_004,
] as const;

// ---------------------------------------------------------------------------
// String diagnostics — LLN-STRING-001..004
// ---------------------------------------------------------------------------

/** Attempted String.decode() produced an invalid UTF-8 sequence. */
export const LLN_STRING_001 = {
  code: "LLN-STRING-001",
  name: "INVALID_UTF8_DECODE",
  severity: "error",
  message: "Attempted decode produced invalid UTF-8. Handle the DecodeError with a map block.",
} as const;

/** A secret value was assigned to a plain String binding instead of SecureString. */
export const LLN_STRING_002 = {
  code: "LLN-STRING-002",
  name: "SECRET_STORED_AS_STRING",
  severity: "error",
  message: "Secret value must not be stored in a plain String. Use SecureString or Secret.env().",
} as const;

/** A Bytes value was assigned to a String binding without an explicit decode step. */
export const LLN_STRING_003 = {
  code: "LLN-STRING-003",
  name: "IMPLICIT_STRING_BYTE_CONVERSION",
  severity: "error",
  message: "Bytes cannot become String without an explicit decode. Use String.decode(bytes, Encoding.UTF8).",
} as const;

/** `.length` was called on a String without specifying whether chars or bytes are counted. */
export const LLN_STRING_004 = {
  code: "LLN-STRING-004",
  name: "AMBIGUOUS_STRING_LENGTH",
  severity: "warning",
  message: "Ambiguous String length. Use .charCount() for Unicode scalar count or .encodedLength(Encoding.UTF8) for byte length.",
} as const;

export const LLN_STRING_DIAGNOSTICS = [
  LLN_STRING_001,
  LLN_STRING_002,
  LLN_STRING_003,
  LLN_STRING_004,
] as const;

// ---------------------------------------------------------------------------
// Char diagnostics — LLN-CHAR-001..004
// ---------------------------------------------------------------------------

/** A Char value was assigned to or compared with a Byte without an explicit conversion. */
export const LLN_CHAR_001 = {
  code: "LLN-CHAR-001",
  name: "CHAR_BYTE_CONFUSION",
  severity: "error",
  message: "Char cannot be assigned to Byte. Char is text; Byte is raw data. Encode explicitly with .toString().encode(Encoding.UTF8).",
} as const;

/** A character literal contains an invalid Unicode scalar value. */
export const LLN_CHAR_002 = {
  code: "LLN-CHAR-002",
  name: "INVALID_CHAR_LITERAL",
  severity: "error",
  message: "Character literal contains an invalid Unicode scalar value.",
} as const;

/** A character literal contains more than one character unit. */
export const LLN_CHAR_003 = {
  code: "LLN-CHAR-003",
  name: "MULTI_CHAR_LITERAL",
  severity: "error",
  message: "Char literal must contain exactly one character unit. Use String for multi-character values.",
} as const;

/** A Char was used as an integer without calling .codePoint(). */
export const LLN_CHAR_004 = {
  code: "LLN-CHAR-004",
  name: "IMPLICIT_CHAR_NUMBER_CONVERSION",
  severity: "error",
  message: "Char cannot be used as an integer directly. Use .codePoint() to get the Unicode code point.",
} as const;

export const LLN_CHAR_DIAGNOSTICS = [
  LLN_CHAR_001,
  LLN_CHAR_002,
  LLN_CHAR_003,
  LLN_CHAR_004,
] as const;

// ---------------------------------------------------------------------------
// Byte diagnostics — LLN-BYTE-001..005
// ---------------------------------------------------------------------------

/** A Byte literal value is outside the valid 0–255 range. */
export const LLN_BYTE_001 = {
  code: "LLN-BYTE-001",
  name: "BYTE_OUT_OF_RANGE",
  severity: "error",
  message: "Byte value must be between 0 and 255.",
} as const;

/** A Byte arithmetic result could exceed 255 without explicit overflow handling. */
export const LLN_BYTE_002 = {
  code: "LLN-BYTE-002",
  name: "BYTE_OVERFLOW",
  severity: "error",
  message: "Byte arithmetic result may exceed 255. Use wrapping, checked, or saturating arithmetic explicitly.",
} as const;

/** A Bytes value was assigned to a String binding without an explicit decode step. */
export const LLN_BYTE_003 = {
  code: "LLN-BYTE-003",
  name: "IMPLICIT_BYTE_STRING_CONVERSION",
  severity: "error",
  message: "Bytes cannot become String without an explicit decode. Use String.decode(bytes, Encoding.UTF8).",
} as const;

/** A raw Bytes value was passed to a log sink without redaction. */
export const LLN_BYTE_004 = {
  code: "LLN-BYTE-004",
  name: "RAW_BYTES_LOGGED",
  severity: "error",
  message: "Raw Bytes must not be passed directly to a log sink. Redact, hash, or encode before logging.",
} as const;

/** A Bytes read has no declared memory limit or streaming path. */
export const LLN_BYTE_005 = {
  code: "LLN-BYTE-005",
  name: "UNBOUNDED_BYTES_READ",
  severity: "error",
  message: "Bytes read without a declared memory limit or a streaming path. Declare maxBodyMb or use a streaming reader.",
} as const;

export const LLN_BYTE_DIAGNOSTICS = [
  LLN_BYTE_001,
  LLN_BYTE_002,
  LLN_BYTE_003,
  LLN_BYTE_004,
  LLN_BYTE_005,
] as const;

// ---------------------------------------------------------------------------
// Memory diagnostics — LLN-MEMORY-001..008
// ---------------------------------------------------------------------------

/** A moved value was used again after ownership transferred. */
export const LLN_MEMORY_001 = {
  code: "LLN-MEMORY-001",
  name: "USE_AFTER_MOVE",
  severity: "error",
  message: "A moved value cannot be used again. Ownership transferred at the move site.",
} as const;

/** A value was borrowed after its ownership had already moved. */
export const LLN_MEMORY_002 = {
  code: "LLN-MEMORY-002",
  name: "BORROW_AFTER_MOVE",
  severity: "error",
  message: "Cannot borrow a value after ownership has moved.",
} as const;

/** A borrowed reference outlives the scope of its owner. */
export const LLN_MEMORY_003 = {
  code: "LLN-MEMORY-003",
  name: "BORROW_ESCAPES_SCOPE",
  severity: "error",
  message: "Borrowed reference cannot outlive its owner. Return ownership via move instead.",
} as const;

/** Mutation was attempted through a readonly reference. */
export const LLN_MEMORY_004 = {
  code: "LLN-MEMORY-004",
  name: "READONLY_MUTATION",
  severity: "error",
  message: "Cannot mutate a value through a readonly reference.",
} as const;

/** A mutable borrow exists while another borrow or alias is active. */
export const LLN_MEMORY_005 = {
  code: "LLN-MEMORY-005",
  name: "MUTABLE_ALIAS",
  severity: "error",
  message: "A mutable borrow cannot coexist with another active borrow or alias of the same value.",
} as const;

/** An index may be outside the bounds of the target collection. */
export const LLN_MEMORY_006 = {
  code: "LLN-MEMORY-006",
  name: "BOUNDS_VIOLATION",
  severity: "error",
  message: "Index may be outside collection bounds. Use .get(index) for safe access or prove bounds at compile time.",
} as const;

/** An unchecked access was used outside an approved unsafe block. */
export const LLN_MEMORY_007 = {
  code: "LLN-MEMORY-007",
  name: "UNCHECKED_ACCESS_OUTSIDE_UNSAFE",
  severity: "error",
  message: "Unchecked index or memory access must be inside an approved unsafe block with a declared reason and fallback.",
} as const;

/** An unsafe memory operation has no declared safe fallback. */
export const LLN_MEMORY_008 = {
  code: "LLN-MEMORY-008",
  name: "UNSAFE_MEMORY_REQUIRES_FALLBACK",
  severity: "error",
  message: "Unsafe memory operation must declare a safe fallback. Every unsafe block requires a fallback flow.",
} as const;

export const LLN_MEMORY_DIAGNOSTICS = [
  LLN_MEMORY_001,
  LLN_MEMORY_002,
  LLN_MEMORY_003,
  LLN_MEMORY_004,
  LLN_MEMORY_005,
  LLN_MEMORY_006,
  LLN_MEMORY_007,
  LLN_MEMORY_008,
] as const;

// ---------------------------------------------------------------------------
// Safety diagnostics — LLN-SAFETY-001..006
//
// These replace the deprecated LogicN_COMPILER_* diagnostic codes from
// validateCoreSyntaxSafety. All new safety-checker diagnostics must use
// this series. LogicN_COMPILER_* codes are frozen — do not extend them.
// ---------------------------------------------------------------------------

/** A Tri value was used directly as a branch condition without explicit conversion. */
export const LLN_SAFETY_001 = {
  code: "LLN-SAFETY-001",
  name: "TRI_BRANCH_CONDITION",
  severity: "error",
  message: "Tri values must not be used directly as branch conditions. Use exhaustive match or an explicit conversion policy.",
} as const;

/** An unsafe implicit assignment occurred between Bool, Tri, or Decision types. */
export const LLN_SAFETY_002 = {
  code: "LLN-SAFETY-002",
  name: "UNSAFE_LOGIC_ASSIGNMENT",
  severity: "error",
  message: "Implicit conversion between Tri, Bool, and Decision is not allowed. Use an explicit policy-bearing conversion flow.",
} as const;

/** A Tri unknown value was mapped to true without policy justification. */
export const LLN_SAFETY_003 = {
  code: "LLN-SAFETY-003",
  name: "TRI_UNKNOWN_AS_TRUE",
  severity: "error",
  message: "Converting Tri unknown to true requires explicit policy justification. In secure flows, this is always an error.",
} as const;

/** A raw secret literal was detected in source code. */
export const LLN_SAFETY_004 = {
  code: "LLN-SAFETY-004",
  name: "SECRET_LITERAL",
  severity: "error",
  message: "Source must not contain raw secret literals. Use SecureString or an environment reference.",
} as const;

/** An unsafe dynamic code execution call was detected. */
export const LLN_SAFETY_005 = {
  code: "LLN-SAFETY-005",
  name: "UNSAFE_DYNAMIC_CODE",
  severity: "error",
  message: "Unsafe dynamic code execution must not appear in LogicN source. Declare intent and use a governed flow.",
} as const;

/** A Tri match block is missing one or more required cases. */
export const LLN_SAFETY_006 = {
  code: "LLN-SAFETY-006",
  name: "TRI_MATCH_NOT_EXHAUSTIVE",
  severity: "error",
  message: "Tri match must handle all three cases: Positive, Neutral, and Negative.",
} as const;

export const LLN_SAFETY_DIAGNOSTICS = [
  LLN_SAFETY_001,
  LLN_SAFETY_002,
  LLN_SAFETY_003,
  LLN_SAFETY_004,
  LLN_SAFETY_005,
  LLN_SAFETY_006,
] as const;

// ---------------------------------------------------------------------------
// Governed surface types — surfaces that require intent declarations
// ---------------------------------------------------------------------------

export type GovernedSurfaceKind =
  | "api.route"
  | "webhook"
  | "payment.flow"
  | "secret.access"
  | "network.call"
  | "ai.invoke"
  | "native.interop"
  | "deployment.action"
  | "unsafe.block"
  | "privileged.flow";

// ---------------------------------------------------------------------------
// Private internal types
// ---------------------------------------------------------------------------

// Mirrors ContentBlockType in @logicn/core — kept local until workspace links are in place.
type ContentBlockType = "html" | "dom" | "script" | "css";

const VALID_CONTENT_BLOCK_TYPES: ReadonlySet<string> = new Set<ContentBlockType>([
  "html", "dom", "script", "css",
]);

interface ContentBlockScope {
  readonly blockType: ContentBlockType;
  readonly marker: string;
  readonly startLine: number;
}

type ContentBlockOpenResult =
  | { readonly kind: "entered"; readonly scope: ContentBlockScope }
  | { readonly kind: "unknown_type"; readonly diagnostics: readonly CompilerDiagnostic[] };

type KnownCoreType = "Bool" | "Tri" | "Decision";

interface KnownSymbol {
  readonly name: string;
  readonly type: KnownCoreType;
  readonly location: SourceLocation;
}

interface FlowScope {
  readonly kind:
    | "flow"
    | "secure flow"
    | "pure flow"
    | "guarded flow"
    | "privileged flow"
    | "unsafe flow"
    | "experimental flow"
    | "unsafe block";
  readonly startLine: number;
  readonly braceDepth: number;
}

interface MatchBlock {
  readonly symbol: KnownSymbol;
  readonly startLine: number;
  readonly braceDepth: number;
  readonly cases: Set<string>;
}

const TRI_CASES = ["Positive", "Neutral", "Negative"] as const;

export function validateCoreSyntaxSafety(
  source: CompilerSourceText,
  options: CoreSyntaxSafetyOptions = {},
): CompilerResult {
  const diagnostics: CompilerDiagnostic[] = [];
  const symbols = new Map<string, KnownSymbol>();
  const lines = source.text.split(/\r?\n/);
  let flowScope: FlowScope | undefined;
  let matchBlock: MatchBlock | undefined;
  let contentBlockScope: ContentBlockScope | undefined;
  let braceDepth = 0;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    // ── Typed content block tracking ─────────────────────────────────────
    // When inside a block, skip all other checks. Brace depth is not updated
    // so that { } in HTML/CSS/JS do not affect LogicN scope tracking.
    if (contentBlockScope !== undefined) {
      if (trimmed === contentBlockScope.marker) {
        contentBlockScope = undefined;
      }
      return;
    }

    // Detect typed content block opens (html/dom/script/css <<MARKER).
    const blockOpen = parseContentBlockOpen(source.file, line, lineNumber);
    if (blockOpen !== undefined) {
      if (blockOpen.kind === "entered") {
        contentBlockScope = blockOpen.scope;
      } else {
        diagnostics.push(...blockOpen.diagnostics);
      }
      return; // block opener line needs no further processing
    }
    // ─────────────────────────────────────────────────────────────────────

    collectFlowSymbols(source.file, line, lineNumber, symbols);
    collectVariableSymbol(source.file, line, lineNumber, symbols);

    const flowStart = parseFlowStart(line, lineNumber, braceDepth);

    if (flowStart !== undefined) {
      flowScope = flowStart;
    }

    if (matchBlock !== undefined) {
      collectMatchCases(line, matchBlock);
    }

    if (matchBlock === undefined) {
      matchBlock = parseTriMatchStart(source.file, line, lineNumber, braceDepth, symbols);
    }

    diagnostics.push(
      ...detectTriBranchCondition(source.file, line, lineNumber, symbols),
      ...detectUnsafeCoreAssignment(source.file, line, lineNumber, symbols),
      ...detectRiskyTriBoolPolicy(source.file, line, lineNumber, flowScope),
      ...detectUnsupportedBindingKeyword(source.file, line, lineNumber),
      ...detectMutInPureFlow(source.file, line, lineNumber, flowScope),
      ...detectUnsafeBlockWithoutReason(source.file, line, lineNumber),
      ...detectRawPointerOutsideUnsafe(source.file, line, lineNumber, flowScope),
    );

    if (options.scanSecrets ?? true) {
      diagnostics.push(...detectSecretLiteral(source.file, line, lineNumber));
    }

    if (options.scanUnsafeDynamicCode ?? true) {
      diagnostics.push(...detectUnsafeDynamicCode(source.file, line, lineNumber));
    }

    braceDepth += countBraceDelta(line);

    if (
      matchBlock !== undefined &&
      braceDepth < matchBlock.braceDepth
    ) {
      diagnostics.push(...validateTriMatchExhaustive(source.file, matchBlock));
      matchBlock = undefined;
    }

    if (flowScope !== undefined && braceDepth < flowScope.braceDepth) {
      flowScope = undefined;
    }

    if (trimmed === "") {
      return;
    }
  });

  if (matchBlock !== undefined) {
    diagnostics.push(...validateTriMatchExhaustive(source.file, matchBlock));
  }

  // Report any typed content block that was opened but never closed.
  if (contentBlockScope !== undefined) {
    diagnostics.push(
      createCompilerDiagnostic(
        LLN_BLOCK_002.code,
        LLN_BLOCK_002.name,
        LLN_BLOCK_002.severity,
        `${contentBlockScope.blockType} block opened with marker ${contentBlockScope.marker} is never closed.`,
        { file: source.file, line: contentBlockScope.startLine, column: 1 },
      ),
    );
  }

  return {
    ok: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
    diagnostics,
    reports: [],
  };
}

/**
 * Validates a typed content block at the AST level.
 *
 * Stage 1 status: STUB — returns empty diagnostics.
 * Full implementation (Stage 2) will validate block content based on type:
 *   html/dom — HTML structure validation
 *   script   — JavaScript syntax check; LLN-BLOCK-004 secret detection
 *   css      — CSS property/selector validation
 *
 * TODO LLN-BLOCK-004: detect ProtectedSecret references interpolated into script blocks.
 */
export function validateTypedContentBlock(_input: {
  readonly blockType: "html" | "dom" | "script" | "css";
  readonly marker: string;
  readonly content: string;
  readonly file: string;
  readonly startLine: number;
}): readonly CompilerDiagnostic[] {
  return [];
}

function collectFlowSymbols(
  file: string,
  line: string,
  lineNumber: number,
  symbols: Map<string, KnownSymbol>,
): void {
  const flowMatch = line.match(
    /^\s*(?:secure\s+|pure\s+)?flow\s+[A-Za-z_][A-Za-z0-9_]*\s*\(([^)]*)\)/,
  );

  if (flowMatch?.[1] === undefined) {
    return;
  }

  for (const parameter of flowMatch[1].split(",")) {
    const parameterMatch = parameter.match(
      /\b([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(Bool|Tri|Decision)\b/,
    );

    if (parameterMatch?.[1] === undefined || parameterMatch[2] === undefined) {
      continue;
    }

    symbols.set(parameterMatch[1], {
      name: parameterMatch[1],
      type: parameterMatch[2] as KnownCoreType,
      location: { file, line: lineNumber, column: line.indexOf(parameterMatch[1]) + 1 },
    });
  }
}

function collectVariableSymbol(
  file: string,
  line: string,
  lineNumber: number,
  symbols: Map<string, KnownSymbol>,
): void {
  const variableMatch = line.match(
    /^\s*(?:let|const)\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(Bool|Tri|Decision)\b/,
  );

  if (variableMatch?.[1] === undefined || variableMatch[2] === undefined) {
    return;
  }

  symbols.set(variableMatch[1], {
    name: variableMatch[1],
    type: variableMatch[2] as KnownCoreType,
    location: { file, line: lineNumber, column: line.indexOf(variableMatch[1]) + 1 },
  });
}

function parseFlowStart(
  line: string,
  lineNumber: number,
  braceDepth: number,
): FlowScope | undefined {
  // Match: [safety-level] flow <name> or unsafe block <name>
  const flowMatch = line.match(
    /^\s*(secure\s+|pure\s+|guarded\s+|privileged\s+|unsafe\s+|experimental\s+)?(?:(flow)\b|(block)\b)/,
  );

  if (flowMatch === null) {
    return undefined;
  }

  // "unsafe block" is distinct from "unsafe flow"
  const isBlock = flowMatch[3] === "block";
  const prefix = flowMatch[1]?.trim() ?? "";

  let kind: FlowScope["kind"];

  if (isBlock && prefix === "unsafe") {
    kind = "unsafe block";
  } else {
    switch (prefix) {
      case "secure":       kind = "secure flow";       break;
      case "pure":         kind = "pure flow";         break;
      case "guarded":      kind = "guarded flow";      break;
      case "privileged":   kind = "privileged flow";   break;
      case "unsafe":       kind = "unsafe flow";       break;
      case "experimental": kind = "experimental flow"; break;
      default:             kind = "flow";              break;
    }
  }

  return {
    kind,
    startLine: lineNumber,
    braceDepth: braceDepth + Math.max(countBraceDelta(line), 1),
  };
}

/**
 * Validates that declared intent and effects are consistent with inferred behavior.
 *
 * Stage 1 status: STUB — returns an empty result.
 * Full implementation requires the compiler AST to carry FlowDeclarationMetadata.
 * Wire up in Stage 3 once the parser emits intent/effect nodes.
 *
 * TODO LLN-INTENT-001: check inferred effects against declared effects.
 * TODO LLN-INTENT-002: require intent on governed surfaces.
 * TODO LLN-INTENT-003: require unsafe blocks to declare reason + fallback.
 * TODO LLN-INTENT-004: require privileged flows to declare capability.
 * TODO LLN-INTENT-005: block experimental flows in production targets.
 */
export function validateIntentEffects(
  _flowName: string,
  _safetyLevel: CompilerSafetyLevel,
  _intent: string | undefined,
  _declaredEffects: readonly string[],
  _inferredEffects: readonly string[],
  _isProductionTarget: boolean,
): IntentCheckResult {
  return {
    flowName: _flowName,
    safetyLevel: _safetyLevel,
    ...(_intent === undefined ? {} : { intent: _intent }),
    declaredEffects: [..._declaredEffects],
    inferredEffects: [..._inferredEffects],
    mismatches: [],
    diagnostics: [],
  };
}

function parseTriMatchStart(
  file: string,
  line: string,
  lineNumber: number,
  braceDepth: number,
  symbols: Map<string, KnownSymbol>,
): MatchBlock | undefined {
  const match = line.match(/^\s*match\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/);

  if (match?.[1] === undefined) {
    return undefined;
  }

  const symbol = symbols.get(match[1]);

  if (symbol?.type !== "Tri") {
    return undefined;
  }

  return {
    symbol: {
      ...symbol,
      location: { file, line: lineNumber, column: line.indexOf(match[1]) + 1 },
    },
    startLine: lineNumber,
    braceDepth: braceDepth + 1,
    cases: new Set<string>(),
  };
}

function collectMatchCases(line: string, matchBlock: MatchBlock): void {
  const caseMatch = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=>/);

  if (caseMatch?.[1] !== undefined) {
    matchBlock.cases.add(caseMatch[1]);
  }
}

function detectTriBranchCondition(
  file: string,
  line: string,
  lineNumber: number,
  symbols: Map<string, KnownSymbol>,
): readonly CompilerDiagnostic[] {
  const conditionMatch = line.match(/^\s*if\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/);
  const symbol = conditionMatch?.[1] === undefined ? undefined : symbols.get(conditionMatch[1]);

  if (symbol?.type !== "Tri") {
    return [];
  }

  return [
    createCompilerDiagnostic(
      LLN_SAFETY_001.code,
      LLN_SAFETY_001.name,
      LLN_SAFETY_001.severity,
      LLN_SAFETY_001.message,
      { file, line: lineNumber, column: line.indexOf(symbol.name) + 1 },
    ),
  ];
}

function detectUnsafeCoreAssignment(
  file: string,
  line: string,
  lineNumber: number,
  symbols: Map<string, KnownSymbol>,
): readonly CompilerDiagnostic[] {
  const assignmentMatch = line.match(
    /^\s*(?:let|const)\s+[A-Za-z_][A-Za-z0-9_]*\s*:\s*(Bool|Tri|Decision)\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\b/,
  );

  if (assignmentMatch?.[1] === undefined || assignmentMatch[2] === undefined) {
    return [];
  }

  const targetType = assignmentMatch[1] as KnownCoreType;
  const sourceSymbol = symbols.get(assignmentMatch[2]);

  if (sourceSymbol === undefined || sourceSymbol.type === targetType) {
    return [];
  }

  if (
    (sourceSymbol.type === "Tri" && (targetType === "Bool" || targetType === "Decision")) ||
    (sourceSymbol.type === "Decision" && targetType === "Tri")
  ) {
    return [
      createCompilerDiagnostic(
        LLN_SAFETY_002.code,
        LLN_SAFETY_002.name,
        LLN_SAFETY_002.severity,
        `${sourceSymbol.type} must not implicitly convert to ${targetType}. Use an explicit policy-bearing conversion flow.`,
        { file, line: lineNumber, column: line.indexOf(sourceSymbol.name) + 1 },
      ),
    ];
  }

  return [];
}

function detectRiskyTriBoolPolicy(
  file: string,
  line: string,
  lineNumber: number,
  flowScope: FlowScope | undefined,
): readonly CompilerDiagnostic[] {
  if (!/\bunknown_as(?:\s*:\s*true|_true)\b/.test(line)) {
    return [];
  }

  const secure = flowScope?.kind === "secure flow";

  return [
    createCompilerDiagnostic(
      LLN_SAFETY_003.code,
      LLN_SAFETY_003.name,
      secure ? "error" : "warning",
      secure
        ? "secure flow must not convert Tri unknown to true."
        : "Converting Tri unknown to true is risky and must be justified by policy.",
      { file, line: lineNumber, column: line.search(/\bunknown_as/) + 1 },
    ),
  ];
}

function detectSecretLiteral(
  file: string,
  line: string,
  lineNumber: number,
): readonly CompilerDiagnostic[] {
  const secretMatch = line.match(
    /\b(api[_-]?key|token|secret|password)\b\s*[:=]\s*"([^"]+)"/i,
  );

  if (secretMatch?.[2] === undefined || isPlaceholderSecret(secretMatch[2])) {
    return [];
  }

  return [
    createCompilerDiagnostic(
      LLN_SAFETY_004.code,
      LLN_SAFETY_004.name,
      LLN_SAFETY_004.severity,
      LLN_SAFETY_004.message,
      { file, line: lineNumber, column: line.indexOf(secretMatch[2]) + 1 },
    ),
  ];
}

function detectUnsafeDynamicCode(
  file: string,
  line: string,
  lineNumber: number,
): readonly CompilerDiagnostic[] {
  if (!/\b(?:eval|Function|unsafe_exec|raw_shell)\s*\(/.test(line)) {
    return [];
  }

  return [
    createCompilerDiagnostic(
      LLN_SAFETY_005.code,
      LLN_SAFETY_005.name,
      LLN_SAFETY_005.severity,
      LLN_SAFETY_005.message,
      { file, line: lineNumber, column: Math.max(line.search(/\b(?:eval|Function|unsafe_exec|raw_shell)\s*\(/) + 1, 1) },
    ),
  ];
}

function validateTriMatchExhaustive(
  file: string,
  matchBlock: MatchBlock,
): readonly CompilerDiagnostic[] {
  const missing = TRI_CASES.filter((triCase) => !matchBlock.cases.has(triCase));

  if (missing.length === 0) {
    return [];
  }

  return [
    createCompilerDiagnostic(
      LLN_SAFETY_006.code,
      LLN_SAFETY_006.name,
      LLN_SAFETY_006.severity,
      `Tri match is missing cases: ${missing.join(", ")}.`,
      { file, line: matchBlock.startLine, column: matchBlock.symbol.location.column },
    ),
  ];
}

// Pattern: optional `print ` prefix, then a word, then ` <<MARKER`
// Valid:   html <<HTML, dom <<DOM, script <<SCRIPT, css <<CSS
// Invalid: xml <<XML (unknown type)
const CONTENT_BLOCK_OPEN_RE =
  /^\s*(?:print\s+)?([a-zA-Z][a-zA-Z0-9_]*)\s+<<([A-Z_][A-Z0-9_]*)\s*$/;

function parseContentBlockOpen(
  file: string,
  line: string,
  lineNumber: number,
): ContentBlockOpenResult | undefined {
  const match = line.match(CONTENT_BLOCK_OPEN_RE);

  if (match === null || match[1] === undefined || match[2] === undefined) {
    return undefined;
  }

  const rawType = match[1].toLowerCase();
  const marker = match[2];

  if (!VALID_CONTENT_BLOCK_TYPES.has(rawType)) {
    return {
      kind: "unknown_type",
      diagnostics: [
        createCompilerDiagnostic(
          LLN_BLOCK_001.code,
          LLN_BLOCK_001.name,
          LLN_BLOCK_001.severity,
          `Unknown typed content block type "${rawType}". Valid types are: html, dom, script, css.`,
          { file, line: lineNumber, column: line.search(new RegExp(`\\b${match[1]}\\b`)) + 1 },
        ),
      ],
    };
  }

  return {
    kind: "entered",
    scope: {
      blockType: rawType as ContentBlockType,
      marker,
      startLine: lineNumber,
    },
  };
}

function detectUnsupportedBindingKeyword(
  file: string,
  line: string,
  lineNumber: number,
): readonly CompilerDiagnostic[] {
  const trimmed = line.trim();

  // Ignore comment lines and doc comments
  if (trimmed.startsWith("//") || trimmed.startsWith("///")) {
    return [];
  }

  // Detect `var <identifier>` or `var <identifier>:` as a statement
  if (/^\s*\bvar\s+[A-Za-z_]/.test(line)) {
    return [
      createCompilerDiagnostic(
        LLN_SYNTAX_001.code,
        LLN_SYNTAX_001.name,
        LLN_SYNTAX_001.severity,
        LLN_SYNTAX_001.message,
        { file, line: lineNumber, column: line.search(/\bvar\b/) + 1 },
      ),
    ];
  }

  // Detect `const <identifier>` or `const <identifier>:` as a statement
  // Exclude TypeScript-style `export const` — this scanner runs on .lln files
  if (/^\s*\bconst\s+[A-Za-z_]/.test(line)) {
    return [
      createCompilerDiagnostic(
        LLN_SYNTAX_002.code,
        LLN_SYNTAX_002.name,
        LLN_SYNTAX_002.severity,
        LLN_SYNTAX_002.message,
        { file, line: lineNumber, column: line.search(/\bconst\b/) + 1 },
      ),
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Binding and pipeline checker stubs
// ---------------------------------------------------------------------------

/**
 * Checks whether a reassignment targets an immutable binding.
 *
 * Stage 1 status: STUB — returns diagnostics based on binding kind alone.
 * Full implementation requires AST-level binding scope tracking.
 *
 * TODO LLN-BINDING-001: reject reassignment of let bindings.
 * TODO LLN-BINDING-002: reject reassignment of readonly bindings.
 */
export function checkBindingReassignment(input: {
  readonly bindingKind: "let" | "mut" | "readonly";
  readonly bindingName: string;
  readonly location: SourceLocation;
}): readonly CompilerDiagnostic[] {
  if (input.bindingKind === "let") {
    return [
      createCompilerDiagnostic(
        LLN_BINDING_001.code,
        LLN_BINDING_001.name,
        LLN_BINDING_001.severity,
        `Cannot reassign immutable let binding ${input.bindingName}. Use mut only if reassignment is required.`,
        input.location,
      ),
    ];
  }

  if (input.bindingKind === "readonly") {
    return [
      createCompilerDiagnostic(
        LLN_BINDING_002.code,
        LLN_BINDING_002.name,
        LLN_BINDING_002.severity,
        `Cannot reassign readonly binding ${input.bindingName}.`,
        input.location,
      ),
    ];
  }

  return [];
}

/**
 * Checks whether a property mutation occurs through a readonly binding.
 *
 * Stage 1 status: STUB — returns diagnostic when binding is readonly.
 * Full implementation requires property access tracking in the AST.
 *
 * TODO LLN-BINDING-003: reject property mutation through readonly binding.
 */
export function checkReadonlyMutation(input: {
  readonly bindingKind: "let" | "mut" | "readonly";
  readonly bindingName: string;
  readonly propertyName: string;
  readonly location: SourceLocation;
}): readonly CompilerDiagnostic[] {
  if (input.bindingKind !== "readonly") {
    return [];
  }

  return [
    createCompilerDiagnostic(
      LLN_BINDING_003.code,
      LLN_BINDING_003.name,
      LLN_BINDING_003.severity,
      `Cannot mutate property ${input.propertyName} through readonly binding ${input.bindingName}.`,
      input.location,
    ),
  ];
}

/**
 * Validates a method-chain pipeline for type safety, effects, and readonly rules.
 *
 * Stage 1 status: STUB — returns an empty result.
 * Full implementation requires:
 *   - Type scope (to resolve method return types)
 *   - Effect context (to compare declared vs used effects)
 *   - Readonly scope (to detect readonly receiver mutation)
 *
 * TODO LLN-PIPELINE-001: reject unknown pipeline methods.
 * TODO LLN-PIPELINE-002: reject type mismatches between stages.
 * TODO LLN-PIPELINE-003: require Result handling in fallible pipelines.
 * TODO LLN-PIPELINE-004: require declared effects for effectful stages.
 * TODO LLN-PIPELINE-005: reject readonly receiver mutation.
 */
export function checkMethodChain(_input: {
  readonly receiver: string;
  readonly calls: readonly { readonly methodName: string }[];
  readonly location: SourceLocation;
}): readonly CompilerDiagnostic[] {
  return [];
}

/**
 * Checks whether a `mut` binding is used inside a pure-context flow.
 *
 * Implemented: Phase 3 (binding-level, no AST required).
 * `pure flow` bodies must not contain mutable bindings; callers should use
 * `let` or a functional accumulator (fold, count, filter).
 *
 * @param flowSafetyLevel - The safety level of the enclosing flow.
 * @param bindingName     - Name of the binding declared with `mut`.
 * @param location        - Source location for the diagnostic.
 */
export function checkMutInPureContext(input: {
  readonly flowSafetyLevel: "pure" | "safe" | "secure" | "guarded" | "privileged" | "unsafe" | "experimental";
  readonly bindingName: string;
  readonly location: SourceLocation;
}): readonly CompilerDiagnostic[] {
  if (input.flowSafetyLevel !== "pure") {
    return [];
  }

  return [
    createCompilerDiagnostic(
      LLN_BINDING_004.code,
      LLN_BINDING_004.name,
      LLN_BINDING_004.severity,
      `mut binding ${input.bindingName} is not allowed in a pure flow. Use let or a functional accumulator (fold, count, filter).`,
      input.location,
    ),
  ];
}

/**
 * Emits LLN-BINDING-004 when a `mut` binding declaration appears inside a
 * `pure flow` body. `pure flow` contexts forbid all mutable state.
 *
 * Phase 3 binding-level rule — no AST required. Full effect tracking
 * (including deeply nested pure closures) is Phase 5 work.
 */
function detectMutInPureFlow(
  file: string,
  line: string,
  lineNumber: number,
  flowScope: FlowScope | undefined,
): readonly CompilerDiagnostic[] {
  if (flowScope?.kind !== "pure flow") {
    return [];
  }

  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("///")) {
    return [];
  }

  // Match `mut <identifier>` as a binding declaration (not a type name or argument label)
  const mutMatch = line.match(/^\s*\bmut\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
  if (mutMatch === null || mutMatch[1] === undefined) {
    return [];
  }

  return [
    createCompilerDiagnostic(
      LLN_BINDING_004.code,
      LLN_BINDING_004.name,
      LLN_BINDING_004.severity,
      `mut binding "${mutMatch[1]}" is not allowed in a pure flow. Use let or a functional accumulator (fold, count, filter).`,
      { file, line: lineNumber, column: line.search(/\bmut\b/) + 1 },
    ),
  ];
}

/**
 * Emits LLN-MEMORY-008 when an `unsafe block` opening line is missing a
 * `reason` declaration. Every unsafe block must declare a human-readable
 * reason justification on the same line as the block header.
 *
 * Syntax required: unsafe block <name> reason "<text>" fallback <safeFlow> {
 *
 * Phase 3 binding-level rule. Structural validation of reason/fallback content
 * is Phase 5 (AST) work.
 */
function detectUnsafeBlockWithoutReason(
  file: string,
  line: string,
  lineNumber: number,
): readonly CompilerDiagnostic[] {
  // Only fire on lines that begin an unsafe block scope
  if (!/^\s*\bunsafe\s+block\b/.test(line)) {
    return [];
  }

  // If `reason` keyword already appears on the same line, declaration is present
  if (/\breason\b/.test(line)) {
    return [];
  }

  return [
    createCompilerDiagnostic(
      LLN_MEMORY_008.code,
      LLN_MEMORY_008.name,
      LLN_MEMORY_008.severity,
      `unsafe block must declare a reason on the opening line. Expected: unsafe block <name> reason "<justification>" fallback <safeFlow> { ... }`,
      { file, line: lineNumber, column: line.search(/\bunsafe\b/) + 1 },
    ),
  ];
}

/**
 * Emits LLN-RAWPTR-001 when a raw-pointer dereference expression appears
 * outside an approved unsafe block.
 *
 * LogicN bans raw pointer access in normal code. The pattern `*identifier`
 * at the start of an expression (after whitespace, `=`, or `(`) is treated
 * as a pointer dereference. Inside an `unsafe flow` or `unsafe block` scope
 * the expression is permitted.
 *
 * Phase 3 binding-level rule. Type-level pointer tracking is Phase 5 work.
 */
function detectRawPointerOutsideUnsafe(
  file: string,
  line: string,
  lineNumber: number,
  flowScope: FlowScope | undefined,
): readonly CompilerDiagnostic[] {
  // Pointer access is permitted inside unsafe scopes
  if (flowScope?.kind === "unsafe flow" || flowScope?.kind === "unsafe block") {
    return [];
  }

  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("///")) {
    return [];
  }

  // Detect `*identifier` as a pointer dereference — after `=`, `(`, or at start
  const ptrMatch = line.match(/(?:^|[=(,\s])\*([A-Za-z_][A-Za-z0-9_]*)\b/);
  if (ptrMatch === null) {
    return [];
  }

  const column = line.search(/(?:^|[=(,\s])\*[A-Za-z_]/) + 1;

  return [
    createCompilerDiagnostic(
      LLN_RAWPTR_001.code,
      LLN_RAWPTR_001.name,
      LLN_RAWPTR_001.severity,
      LLN_RAWPTR_001.message,
      { file, line: lineNumber, column },
    ),
  ];
}

function createCompilerDiagnostic(
  code: string,
  name: string,
  severity: CompilerDiagnostic["severity"],
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

function countBraceDelta(line: string): number {
  let delta = 0;

  for (const character of line) {
    if (character === "{") {
      delta += 1;
    }

    if (character === "}") {
      delta -= 1;
    }
  }

  return delta;
}

function isPlaceholderSecret(value: string): boolean {
  return /^(?:example|placeholder|redacted|change-me|todo|SecureString\(redacted\))$/i.test(
    value,
  );
}
