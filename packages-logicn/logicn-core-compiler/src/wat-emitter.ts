// =============================================================================
// LogicN Phase 19 / Phase 22 — WAT Emitter (WebAssembly Text Format)
//
// #70 WAT single-exit transformation: foundational wrapper added.
// Current behavior: no-op (post-conditions deferred to Phase 4).
// When Phase 4 activates: wrapInSingleExit() injects post-condition gates.
//
// Emits WebAssembly Text Format (.wat) from GIR + PassiveExecutionPlan.
// The .wat file is then compiled to binary .wasm via wat2wasm in CI.
//
// WASM architecture rule: all API decisions consider WASM compatibility first.
//
// Two targets:
//   wasm-standalone — pure WASM/WASI, no JS runtime required
//                     Pure flows → WASM functions (zero imports)
//                     Effectful stdlib calls → typed WASM imports (host:*)
//                     Runtime policy limits → WASM memory limits
//
//   wasm-hybrid     — JS capability shell + WASM pure-flow core
//                     JS manages capabilities and audit
//                     WASM handles pure computation (tensors, math, validation)
//
// Phase 19: type skeleton + placeholder stubs only.
//           Full implementation: emit WAT for pure flows first.
// Phase 22: complete effectful flows + WASI import table.
// =============================================================================

import { STDLIB_CAPABILITY_MAP } from "./stdlib-registry.js";
import type { AstNode } from "./parser.js";

// ---------------------------------------------------------------------------
// Phase 22A — WASM SIMD capability types
// ---------------------------------------------------------------------------

/**
 * Describes the WASM SIMD (v128) capability available on the target platform.
 * Used by the kernel fusion planner to select SIMD vs scalar code paths.
 *
 * laneWidth is always 128 (per WASM SIMD spec: v128 = 128-bit vector).
 */
export interface WASMSIMDCapability {
  readonly available: boolean;
  readonly supportedOps: readonly ("v128.add" | "v128.mul" | "f32x4.add" | "f32x4.mul" | "i8x16.add")[];
  readonly laneWidth: 128;
}

/**
 * Default WASM SIMD capability — disabled until the runtime feature-detects
 * v128 support. Phase 22A: override with buildWATModule options.
 */
export const DEFAULT_WASM_SIMD: WASMSIMDCapability = {
  available: false,
  supportedOps: [],
  laneWidth: 128,
} as const;

/**
 * All WASM SIMD instructions that the LogicN compiler may emit.
 * Phase 22A: type definition. Phase 22B: used by kernel fusion emitter.
 */
export type WATSIMDInstruction =
  | "f32x4.add"
  | "f32x4.mul"
  | "f32x4.sqrt"
  | "i8x16.add"
  | "v128.load"
  | "v128.store";

// ---------------------------------------------------------------------------
// Phase 27D — WASM SIMD opcode string constants
//
// Typed map of the WASM SIMD instructions emitted for Tensor.dot and related
// Float32 tensor operations. Used by the kernel-fusion emitter and the WAT
// renderer to ensure instruction strings are spelled correctly and never
// hand-edited as bare strings.
//
// Architecture rule: WASM governs, native accelerates.
// These opcodes are emitted only for the WASM-side fast path (wasm-hybrid
// target, SIMD capability confirmed). The native path goes through
// NativeCapabilityId.NpuInference ("host.npu.inference").
// ---------------------------------------------------------------------------

/**
 * WASM SIMD instruction strings for Float32 tensor operations.
 *
 * Phase 27: used by the TypedArray lowering path and the WAT body emitter.
 * Phase 28+: kernel fusion emitter will select from this map per flow.
 *
 * All values are valid WASM SIMD text-format instructions (WASM SIMD MVP,
 * standardised in the WASM 2.0 spec).
 */
export const WAT_SIMD_OPS = {
  f32x4_add:   "f32x4.add",
  f32x4_mul:   "f32x4.mul",
  v128_load:   "v128.load",
  v128_store:  "v128.store",
} as const;

export type WAT_SIMD_OPS = typeof WAT_SIMD_OPS;

// ---------------------------------------------------------------------------
// WAT module types
// ---------------------------------------------------------------------------

/** A WebAssembly function type (parameter and result types). */
export interface WATFuncType {
  readonly params: readonly WATValType[];
  readonly results: readonly WATValType[];
}

/** WebAssembly value types. */
export type WATValType = "i32" | "i64" | "f32" | "f64" | "externref" | "funcref";

/** A WebAssembly import (effectful stdlib calls → host imports). */
export interface WATImport {
  readonly module: string;    // e.g. "host"
  readonly name: string;      // e.g. "fs.readText"
  readonly type: WATFuncType;
  /** The LogicN effect this import corresponds to. */
  readonly effect: string;    // e.g. "filesystem.read"
}

/** A WebAssembly export (flow entry points). */
export interface WATExport {
  readonly name: string;
  readonly index: number;
}

/**
 * A named WAT parameter — carries both the $identifier and the value type.
 * Phase 22: used by emitWATBody to emit (local.get $p0) instructions.
 */
export interface WATParamDef {
  readonly name: string;    // e.g. "$p0"
  readonly type: WATValType;
}

/** A WAT function definition. */
export interface WATFunction {
  readonly name: string;
  readonly type: WATFuncType;
  /**
   * WAT instructions as text.
   * Phase 19: stub bodies use "unreachable".
   * Phase 22: pure flows use real instructions emitted by emitWATBody.
   */
  readonly body: string;
  /** Whether this function is a pure LogicN flow (zero imports). */
  readonly isPure: boolean;
  /** Whether this function is exported as a WASM entry point. */
  readonly isEntryPoint: boolean;
  /**
   * Named parameters for this function.
   * Phase 22: present for pure flows; enables emitWATBody to reference locals.
   * When absent, renderWAT falls back to index-based $p0, $p1, … names.
   */
  readonly namedParams?: readonly WATParamDef[];
}

/** A WAT memory declaration (from contract.memory { arena ... }). */
export interface WATMemory {
  /** Minimum pages (1 page = 64KB). */
  readonly minPages: number;
  /** Maximum pages. Enforces runtime policy memory limits. */
  readonly maxPages: number | null;
}

/** A complete WAT module ready for rendering to text or passing to wat2wasm. */
export interface WATModule {
  readonly schemaVersion: "lln.wat.v1";
  readonly sourceHash: string;
  readonly girHash: string;
  readonly imports: readonly WATImport[];
  readonly exports: readonly WATExport[];
  readonly functions: readonly WATFunction[];
  readonly memory: WATMemory;
  /** Target variant: standalone (WASI) or hybrid (JS+WASM). */
  readonly target: "wasm-standalone" | "wasm-hybrid";
}

export interface WATEmitResult {
  readonly module: WATModule;
  /** The rendered .wat text, ready for wat2wasm. */
  readonly wat: string;
  readonly diagnostics: readonly { code: string; message: string }[];
}

// ---------------------------------------------------------------------------
// WATValType mapping from LogicN TypeId
// ---------------------------------------------------------------------------

/**
 * Maps LogicN primitive type names to WASM value types.
 * Used when generating function signatures.
 *
 * Phase 19: covers primitive numeric types.
 * Phase 22: adds struct/array encoding for record types.
 */
export function logicNTypeToWAT(typeName: string): WATValType {
  switch (typeName) {
    case "Bool": case "Int": case "Int8": case "Int16": case "Int32": case "Byte": return "i32";
    case "Int64": case "UInt64": return "i64";
    case "Float16": case "Float32": case "Float": return "f32";
    case "Float64": case "Double": case "Decimal": return "f64";
    default: return "externref"; // records, strings, tensors — passed as externref in hybrid mode
  }
}

// ---------------------------------------------------------------------------
// Default memory config from runtime policy
// ---------------------------------------------------------------------------

/**
 * Default WASM memory limits derived from runtime policy.
 * 1 page = 64KB. Default: 2 pages min (128KB), 2048 pages max (128MB).
 */
export const DEFAULT_WAT_MEMORY: WATMemory = {
  minPages: 2,
  maxPages: 2048, // 128MB — matches runtime policy default
};

// ---------------------------------------------------------------------------
// WAT rendering
// ---------------------------------------------------------------------------

/**
 * Renders a WATModule to WebAssembly Text Format string.
 *
 * Produces a valid .wat skeleton that wat2wasm can compile.
 * Function bodies use (unreachable) as stubs until Phase 22 emission.
 *
 * WAT identifier rules applied:
 *   - "." in import names → "_" in $identifier references
 *   - all string literals use double-quotes as required by WAT spec
 *
 * Phase 19: correct structure + stub bodies.
 * Phase 22: full instruction emission from PassiveExecutionPlan steps.
 */
export function renderWAT(module: WATModule): string {
  const lines: string[] = ["(module"];

  // Memory declaration — "(memory <min> <max>)" is valid WAT.
  // Named memory ($lln_mem) requires WASM multi-memory proposal; use unnamed form
  // for broadest wat2wasm compatibility.
  const maxStr = module.memory.maxPages !== null ? ` ${module.memory.maxPages}` : "";
  lines.push(`  (memory ${module.memory.minPages}${maxStr})`);
  lines.push(`  (export "memory" (memory 0))`);
  lines.push("");

  // Imports — valid WAT import syntax:
  //   (import "module" "name" (func $id (param ...) (result ...)))
  // "." in WAT identifiers is illegal; replace with "_".
  for (const imp of module.imports) {
    const id = `$host_${imp.name.replace(/\./g, "_")}`;
    const paramStr = imp.type.params.map((p, i) => `(param $p${i} ${p})`).join(" ");
    const resultStr = imp.type.results.map((r) => `(result ${r})`).join(" ");
    const sig = [paramStr, resultStr].filter(Boolean).join(" ");
    const funcBody = sig ? `(func ${id} ${sig})` : `(func ${id})`;
    lines.push(`  ;; effect: ${imp.effect}`);
    lines.push(`  (import "${imp.module}" "${imp.name}" ${funcBody})`);
  }
  if (module.imports.length > 0) lines.push("");

  // Function definitions.
  // Pure flows with a real body (fn.body !== "unreachable") emit actual instructions.
  // All other flows use (unreachable) which is valid WAT — polymorphic bottom type.
  // Signature "(result i32)" etc. with unreachable is well-formed per WASM spec.
  for (const fn of module.functions) {
    // Build param strings: prefer namedParams when present (pure flows), else index-based.
    const paramStr = fn.namedParams !== undefined
      ? fn.namedParams.map((p) => `(param ${p.name} ${p.type})`).join(" ")
      : fn.type.params.map((p, i) => `(param $p${i} ${p})`).join(" ");
    const resultStr = fn.type.results.map((r) => `(result ${r})`).join(" ");
    const sig = [paramStr, resultStr].filter(Boolean).join(" ");
    const funcSig = sig ? `(func $${fn.name} ${sig}` : `(func $${fn.name}`;
    lines.push(`  ;; ${fn.isPure ? "pure" : "effectful"} flow: ${fn.name}`);
    lines.push(`  ${funcSig}`);
    // Use the real body when available; fall back to unreachable for stubs.
    if (fn.body !== "unreachable" && fn.body.trim().length > 0) {
      // Indent each instruction line with 4 spaces inside the function.
      for (const bodyLine of fn.body.split("\n")) {
        if (bodyLine.trim().length > 0) {
          lines.push(`    ${bodyLine}`);
        }
      }
    } else {
      lines.push(`    unreachable`);
    }
    lines.push(`  )`);
    if (fn.isEntryPoint) {
      lines.push(`  (export "${fn.name}" (func $${fn.name}))`);
    }
    lines.push("");
  }

  lines.push(")");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Phase 25 — AST-based WAT code generator for pure flows
// ---------------------------------------------------------------------------

/**
 * Maps a binary operator string to its WAT i32 instruction.
 * Arithmetic, comparison, and bitwise ops — all operating on i32.
 */
const BINARY_OP_TO_WAT: ReadonlyMap<string, string> = new Map([
  ["+",  "i32.add"],
  ["-",  "i32.sub"],
  ["*",  "i32.mul"],
  ["/",  "i32.div_s"],
  ["%",  "i32.rem_s"],
  ["<",  "i32.lt_s"],
  [">",  "i32.gt_s"],
  ["<=", "i32.le_s"],
  [">=", "i32.ge_s"],
  ["==", "i32.eq"],
  ["!=", "i32.ne"],
  ["&&", "i32.and"],
  ["||", "i32.or"],
  ["&",  "i32.and"],
  ["|",  "i32.or"],
  ["^",  "i32.xor"],
  ["<<", "i32.shl"],
  [">>", "i32.shr_s"],
]);

/**
 * Emits a single WAT s-expression for an AST expression node.
 *
 * @param node         - The AST expression node.
 * @param vars         - Map from LogicN variable/param name → WAT local name ($p0, $x, etc.)
 * @param staticConsts - Optional map of compile-time constant name → integer value.
 *                       Populated from `static NAME = EXPR` and `bitfield` declarations.
 *                       Used to fold constant references to `(i32.const N)` at compile time.
 */
export function emitWATExpr(
  node: AstNode,
  vars: ReadonlyMap<string, string>,
  staticConsts: ReadonlyMap<string, number> = new Map(),
): string {
  switch (node.kind) {
    case "identifier": {
      const name = node.value ?? "";
      const watName = vars.get(name);
      if (watName !== undefined) return `(local.get ${watName})`;
      // Check compile-time constants (static NAME = EXPR)
      const constVal = staticConsts.get(name);
      if (constVal !== undefined) return `(i32.const ${constVal}) ;; static ${name}`;
      // Unknown identifier — emit with comment for diagnostics.
      return `(i32.const 0) ;; unresolved: ${name}`;
    }

    case "memberExpr": {
      // Dotted access: REGISTER.field — check bitfield constants first
      // e.g. V_DPM.network_outbound → staticConsts.get("V_DPM.network_outbound")
      const memberName = node.value ?? "";
      const receiverNode = node.children?.[0];
      if (receiverNode?.kind === "identifier") {
        const receiverName = receiverNode.value ?? "";
        const dottedKey = `${receiverName}.${memberName}`;
        const constVal = staticConsts.get(dottedKey);
        if (constVal !== undefined) return `(i32.const ${constVal}) ;; bitfield ${dottedKey}`;
      }
      return `(i32.const 0) ;; unresolved member: ${memberName}`;
    }

    case "numberLiteral": {
      const raw = node.value ?? "0";
      const isFloat = raw.includes(".") || raw.includes("e") || raw.includes("E");
      if (isFloat) {
        return `(f64.const ${raw})`;
      }
      return `(i32.const ${raw})`;
    }

    case "binaryExpr": {
      const op = node.value ?? "";
      const watOp = BINARY_OP_TO_WAT.get(op);
      const children = node.children ?? [];
      const left  = children[0] ? emitWATExpr(children[0], vars, staticConsts) : "(i32.const 0)";
      const right = children[1] ? emitWATExpr(children[1], vars, staticConsts) : "(i32.const 0)";
      if (watOp !== undefined) {
        return `(${watOp} ${left} ${right})`;
      }
      return `(i32.const 0) ;; unknown op: ${op}`;
    }

    case "unaryExpr": {
      const op = node.value ?? "";
      const operand = node.children?.[0] ? emitWATExpr(node.children[0], vars, staticConsts) : "(i32.const 0)";
      if (op === "-") return `(i32.sub (i32.const 0) ${operand})`;
      if (op === "!")  return `(i32.eqz ${operand})`;
      return `(i32.const 0) ;; unknown unary: ${op}`;
    }

    case "callExpr": {
      // Flow-to-flow calls within pure flows.
      const name = node.value ?? "";
      const args = (node.children ?? []).map((c) => emitWATExpr(c, vars, staticConsts));
      return `(call $${name} ${args.join(" ")})`.trimEnd();
    }

    default:
      return `(i32.const 0) ;; unhandled: ${node.kind}`;
  }
}

/**
 * Phase 26: Negates a WAT condition expression.
 * Used by whileStmt to convert "while cond" to "br_if $exit when NOT cond".
 *
 * "while i <= n" → loop exits when "i > n", i.e. (i32.gt_s i n).
 * Inversion: flip lt_s↔gt_s, le_s↔ge_s, eq↔ne.
 * Unknown ops: wrap in (i32.eqz ...)
 */
function negateBinaryOp(op: string): string | null {
  const NEG: ReadonlyMap<string, string> = new Map([
    ["<",  "i32.ge_s"],
    [">",  "i32.le_s"],
    ["<=", "i32.gt_s"],
    [">=", "i32.lt_s"],
    ["==", "i32.ne"],
    ["!=", "i32.eq"],
  ]);
  return NEG.get(op) ?? null;
}

/**
 * Phase 26: Emits the last "value expression" of a block for WAT.
 * Used for the (then ...) and (else ...) branches of a value-producing if.
 *
 * Finds the last statement in the block that produces a value and returns
 * its WAT expression string (without the surrounding WAT block structure).
 */
function emitBlockLastExpr(
  blockNode: AstNode,
  vars: ReadonlyMap<string, string>,
  staticConsts: ReadonlyMap<string, number> = new Map(),
): string {
  const stmts = blockNode.children ?? [];
  const last = stmts[stmts.length - 1];
  if (last === undefined) return "(i32.const 0)";
  if (last.kind === "returnStmt") {
    return last.children?.[0] ? emitWATExpr(last.children[0], vars, staticConsts) : "(i32.const 0)";
  }
  if (last.kind === "binaryExpr" || last.kind === "callExpr" ||
      last.kind === "identifier"  || last.kind === "numberLiteral") {
    return emitWATExpr(last, vars, staticConsts);
  }
  return "(i32.const 0) ;; unresolved block expr";
}

/**
 * Phase 25/26: Emits WAT statements for a block of LogicN statements.
 *
 * Mutates `localDecls` (appends new local declarations at the TOP of the function)
 * and `bodyLines` (appends WAT instructions in order).
 * Uses a shared `labelCounter` object for unique block/loop label names.
 *
 * Handles:
 *   Phase 25: letDecl (new + rebind), returnStmt, callExpr
 *   Phase 26: ifStmt (with and without else), whileStmt (bounded + unbounded)
 */
function emitBlockStatements(
  blockNode: AstNode,
  vars: Map<string, string>,
  localDecls: string[],
  bodyLines:  string[],
  labelCounter: { n: number },
  /** Phase 27B: when true, emit (return <expr>) for returnStmt instead of bare expr.
   *  Used inside nested blocks (if/while bodies) where implicit stack return is invalid. */
  nested = false,
  /** Compile-time constants from `static` and `bitfield` declarations. */
  staticConsts: ReadonlyMap<string, number> = new Map(),
): void {
  const stmts: readonly AstNode[] = blockNode.children ?? [];

  for (let si = 0; si < stmts.length; si++) {
    const stmt = stmts[si] as AstNode;  // guaranteed by bounds check
    const isLast = si === stmts.length - 1;

    switch (stmt.kind) {
      case "mutDecl":
      case "letDecl": {
        // mutDecl has value like "total: Int" — strip the type annotation
        const rawName  = stmt.value ?? `_anon${localDecls.length}`;
        const varName  = rawName.split(":")[0]?.trim() ?? rawName;
        const watLocal = `$${varName}`;
        const initNode = stmt.children?.[0];
        const initExpr = initNode ? emitWATExpr(initNode, vars, staticConsts) : "(i32.const 0)";

        if (vars.has(varName)) {
          // Variable already declared — this is a mutation (e.g. let x = x + 1 inside a loop).
          // Do NOT add a second (local $x) declaration — just set the existing one.
          bodyLines.push(`(local.set ${watLocal} ${initExpr})`);
        } else {
          // New variable: declare at function top + initialise inline.
          vars.set(varName, watLocal);
          localDecls.push(`(local ${watLocal} i32)`);
          bodyLines.push(`(local.set ${watLocal} ${initExpr})`);
        }
        break;
      }

      case "assignStmt": {
        // total = total + i  →  (local.set $total <expr>)
        // The assigned variable must already be in scope (declared by mutDecl or letDecl).
        const varName  = (stmt.value ?? "").trim();
        const watLocal = vars.get(varName) ?? `$${varName}`;
        const exprNode = stmt.children?.[0];
        const exprStr  = exprNode ? emitWATExpr(exprNode, vars, staticConsts) : "(i32.const 0)";
        if (!vars.has(varName)) {
          // Declare it now if somehow not in scope (defensive)
          vars.set(varName, watLocal);
          localDecls.push(`(local ${watLocal} i32)`);
        }
        bodyLines.push(`(local.set ${watLocal} ${exprStr})`);
        break;
      }

      case "returnStmt": {
        const exprNode = stmt.children?.[0];
        const exprStr  = exprNode !== undefined
          ? emitWATExpr(exprNode, vars, staticConsts)
          : "(i32.const 0) ;; return void";
        // Inside nested blocks (if/while body), use explicit (return <expr>)
        // so the value is returned from the FUNCTION, not just pushed to the block stack.
        // At top-level function body, the last expr is the implicit function return.
        if (nested) {
          bodyLines.push(`(return ${exprStr})`);
        } else {
          bodyLines.push(exprStr);
        }
        break;
      }

      case "ifStmt": {
        // ifStmt children: [condition, thenBlock, elseBlock?]
        const [condNode, thenBlock, elseBlock] = stmt.children ?? [];
        const condExpr = condNode ? emitWATExpr(condNode, vars, staticConsts) : "(i32.const 1)";

        // Value-producing if/else: ONLY when isLast AND both branches end with returnStmt.
        // An if block whose branches contain assignStmt is NOT value-producing.
        const thenEndsWithReturn = (thenBlock?.children ?? []).some(c => c.kind === "returnStmt");
        const elseEndsWithReturn = elseBlock !== undefined
          && elseBlock.kind !== "ifStmt"
          && (elseBlock.children ?? []).some(c => c.kind === "returnStmt");
        const isValueProducing = thenBlock !== undefined && elseBlock !== undefined
          && isLast && thenEndsWithReturn && elseEndsWithReturn;

        if (isValueProducing) {
          // Value-producing if/else (last stmt → the if provides the function's return value).
          // Emit: (if (result i32) COND (then THEN_EXPR) (else ELSE_EXPR))
          const thenExpr = emitBlockLastExpr(thenBlock!, vars, staticConsts);
          const elseExpr = emitBlockLastExpr(elseBlock!, vars, staticConsts);
          bodyLines.push(`(if (result i32) ${condExpr}`);
          bodyLines.push(`  (then ${thenExpr})`);
          bodyLines.push(`  (else ${elseExpr})`);
          bodyLines.push(`)`);
        } else {
          // Statement if: may have side effects but leaves nothing on the stack.
          // Emit: (if COND (then BODY) (else BODY)?)
          //
          // Special case: `else if` chains have an ifStmt (not a block) as elseBlock.
          // We normalise by wrapping it in a synthetic block for the else emitter.
          if (thenBlock !== undefined) {
            bodyLines.push(`(if ${condExpr}`);
            bodyLines.push(`  (then`);
            const thenLines: string[] = [];
            emitBlockStatements(thenBlock, vars, localDecls, thenLines, labelCounter, true, staticConsts);
            for (const line of thenLines) bodyLines.push(`    ${line}`);
            bodyLines.push(`  )`);
            if (elseBlock !== undefined) {
              bodyLines.push(`  (else`);
              const elseLines: string[] = [];
              if (elseBlock.kind === "ifStmt") {
                // else if: wrap the ifStmt in a synthetic block
                const synthBlock: AstNode = {
                kind: "block",
                children: [elseBlock],
                ...(elseBlock.location !== undefined ? { location: elseBlock.location } : {}),
              };
                emitBlockStatements(synthBlock, vars, localDecls, elseLines, labelCounter, true, staticConsts);
              } else {
                emitBlockStatements(elseBlock, vars, localDecls, elseLines, labelCounter, true, staticConsts);
              }
              for (const line of elseLines) bodyLines.push(`    ${line}`);
              bodyLines.push(`  )`);
            }
            bodyLines.push(`)`);
          }
        }
        break;
      }

      case "whileStmt": {
        // whileStmt children: [condition, bodyBlock]
        // WAT pattern: (block $exit_N (loop $loop_N (br_if $exit_N NOT_COND) BODY (br $loop_N)))
        const [condNode, bodyBlock] = stmt.children ?? [];
        const labelN = labelCounter.n++;
        const exitLabel = `$while_exit_${labelN}`;
        const loopLabel = `$while_loop_${labelN}`;

        // Negate condition for the exit branch:
        // "while i <= n" → exit when (i32.gt_s i n)
        let exitCondExpr: string;
        if (condNode?.kind === "binaryExpr") {
          const negOp = negateBinaryOp(condNode.value ?? "");
          if (negOp !== null) {
            const left  = condNode.children?.[0] ? emitWATExpr(condNode.children[0], vars, staticConsts) : "(i32.const 0)";
            const right = condNode.children?.[1] ? emitWATExpr(condNode.children[1], vars, staticConsts) : "(i32.const 0)";
            exitCondExpr = `(${negOp} ${left} ${right})`;
          } else {
            exitCondExpr = `(i32.eqz ${condNode ? emitWATExpr(condNode, vars, staticConsts) : "(i32.const 1)"})`;
          }
        } else {
          exitCondExpr = `(i32.eqz ${condNode ? emitWATExpr(condNode, vars, staticConsts) : "(i32.const 1)"})`;
        }

        bodyLines.push(`(block ${exitLabel}`);
        bodyLines.push(`  (loop ${loopLabel}`);
        bodyLines.push(`    (br_if ${exitLabel} ${exitCondExpr})`);

        if (bodyBlock !== undefined) {
          const loopLines: string[] = [];
          emitBlockStatements(bodyBlock, vars, localDecls, loopLines, labelCounter, true, staticConsts);
          for (const line of loopLines) bodyLines.push(`    ${line}`);
        }

        bodyLines.push(`    (br ${loopLabel})`);
        bodyLines.push(`  )`);
        bodyLines.push(`)`);
        break;
      }

      case "callExpr": {
        const callExpr = emitWATExpr(stmt, vars, staticConsts);
        bodyLines.push(`(drop ${callExpr})`);
        break;
      }

      // trapDecl — hardware trap if condition is TRUE (opposite polarity from ensureDecl)
      // `trap COND : ERROR_CODE` emits: if COND then unreachable
      // Compared to ensureDecl: `ensure COND` emits: if NOT COND then unreachable
      // Both produce atomic hardware traps; trapDecl carries a named error code.
      case "trapDecl": {
        const condNode = stmt.children?.[0];
        const errorCode = stmt.value ?? "ERR_TRAP";
        if (condNode !== undefined) {
          const condWat = emitWATExpr(condNode, vars, staticConsts);
          // condWat evaluates to 1 (true) when the trap SHOULD fire → emit directly
          // Unlike ensureDecl which uses (i32.eqz cond), trapDecl fires when cond is true
          bodyLines.push(`    ;; trap: ${errorCode} — fires if condition is TRUE`);
          bodyLines.push(`    (if ${condWat}`);
          bodyLines.push(`      (then unreachable) ;; LLN-INV-000 trapKind=${errorCode}`);
          bodyLines.push(`    )`);
        }
        break;
      }

      default:
        bodyLines.push(`(i32.const 0) ;; unhandled stmt: ${stmt.kind}`);
        break;
    }
  }
}

/**
 * Phase 25/26: Emits the full WAT function body (local decls + instructions)
 * by walking the AST body of a pure flow.
 *
 * Handles (Phase 25):
 *   - Integer arithmetic and comparison (i32.add / lt_s / etc.)
 *   - Integer and float literals (i32.const / f64.const)
 *   - Parameter references (local.get $p0, $p1, …)
 *   - Let-binding — new variables and loop-variable mutation
 *   - Return statements
 *   - Intra-module flow calls
 *
 * Handles (Phase 26):
 *   - if/else with value (last stmt in block → result i32)
 *   - if/else without value (statements with side effects)
 *   - while loops (block + loop + br_if + br pattern)
 *
 * @param flowNode   - The pureFlowDecl / flowDecl AstNode for this flow.
 * @param paramNames - Ordered parameter names extracted from paramDecl children.
 * @returns WAT body string, or null if the body cannot be lowered.
 */
export function emitWATFromFlowAST(
  flowNode: AstNode,
  paramNames: readonly string[],
  staticConsts: ReadonlyMap<string, number> = new Map(),
): string | null {
  // Build variable map: LogicN name → WAT local name.
  // Params are $p0, $p1, … — immutable (parameters are passed by value in WAT).
  const vars = new Map<string, string>();
  paramNames.forEach((name, i) => {
    vars.set(name, `$p${i}`);
  });

  // Find the block body of the flow.
  const blockNode = (flowNode.children ?? []).find((c) => c.kind === "block");
  if (blockNode === undefined) return null;

  const localDecls: string[] = [];
  const bodyLines:  string[] = [];
  const labelCounter = { n: 0 };

  // ── DRCM Phase 2: invariant {} WAT assertion gates (task #36 Unit 3) ──────
  // Emit pre-condition assertion gates for `runtime-precheck` invariants.
  // `statically_verified` invariants emit NOTHING (Goal A: zero runtime overhead).
  //
  // PHASE 2 SCOPE (parameter-only invariants, enforced by LLN-INV-004):
  //   Parameters are immutable (local.get never changes them). The pre-condition
  //   gate at entry is sufficient — if `ensure max > min` passes at entry, it will
  //   pass at any exit point because max and min haven't changed.
  //   Post-condition is emitted but REDUNDANT for parameter invariants (provides
  //   belt-and-suspenders on the non-early-return path only).
  //
  // PHASE 4 REQUIREMENT (computed-result invariants, SMT scope):
  //   `ensure ledger.credits == ledger.debits` references body-computed state.
  //   Post-conditions become meaningful ONLY here. Phase 4 will add the
  //   single-exit body transformation (local $result + br $exit pattern) to
  //   guarantee the post-condition fires on ALL return paths including early returns.
  //   See: logicn-floor3-proof-zone-graph.md — Single-Exit Transformation section.
  //
  // Security: `unreachable` is atomic — Wasmtime fires a hardware trap before
  // the next instruction pointer advances. No TOCTOU window.
  const ensureNodes = extractInvariantEnsures(flowNode);
  const preGates:  string[] = [];
  const postGates: string[] = [];
  for (const ensureExpr of ensureNodes) {
    const condWAT = emitWATExpr(ensureExpr, vars, staticConsts);
    // Assertion pattern: evaluate condition, negate (eqz), trap if false
    // Stack is neutral: condition consumed by if, unreachable terminates branch
    const gate = `  (if (i32.eqz ${condWAT}) (then unreachable)) ;; ensure ${describeASTExpr(ensureExpr)}`;
    preGates.push(gate);
    postGates.push(gate.replace(";; ensure", ";; post: ensure"));
  }

  if (preGates.length > 0) {
    bodyLines.push(`  ;; --- invariant pre-conditions (LLN-INV-001 gate) ---`);
    bodyLines.push(...preGates);
  }
  emitBlockStatements(blockNode, vars, localDecls, bodyLines, labelCounter, false, staticConsts);
  if (postGates.length > 0) {
    bodyLines.push(`  ;; --- invariant post-conditions (LLN-INV-002 gate) ---`);
    bodyLines.push(...postGates);
  }

  if (localDecls.length === 0 && bodyLines.length === 0) return null;
  return [...localDecls, ...bodyLines].join("\n");
}

/**
 * Extract `runtime-precheck` ensure expression nodes from a flow's invariant block.
 * `statically_verified` invariants (constant-fold = true) are excluded — no WAT gate needed.
 */
function extractInvariantEnsures(flowNode: AstNode): AstNode[] {
  const contractNode = (flowNode.children ?? []).find(c => c.kind === "contractDecl");
  if (contractNode === undefined) return [];
  const invariantBlock = (contractNode.children ?? []).find(
    c => c.kind === "identifier" && c.value === "invariant:block"
  );
  if (invariantBlock === undefined) return [];

  const ensures: AstNode[] = [];
  for (const child of invariantBlock.children ?? []) {
    if (child.kind !== "ensureDecl") continue;
    const expr = child.children?.[0];
    if (expr === undefined) continue;
    // Skip statically provable TRUE (constant fold = true) — no WAT gate needed
    const staticResult = tryConstantFold(expr);
    if (staticResult === true) continue;
    // Skip statically FALSE — governance verifier already emitted LLN-INV-001
    if (staticResult === false) continue;
    // Unknown → runtime-precheck → inject WAT gate
    ensures.push(expr);
  }
  return ensures;
}

/** Lightweight constant-fold for WAT emitter (mirrors governance verifier logic) */
function tryConstantFold(expr: AstNode): boolean | null {
  if (expr.kind === "boolLiteral") return expr.value === "true";
  if (expr.kind === "binaryExpr" && expr.children?.length === 2) {
    const l = expr.children[0], r = expr.children[1];
    if (l?.kind === "numberLiteral" && r?.kind === "numberLiteral") {
      const lv = parseFloat(l.value ?? "0"), rv = parseFloat(r.value ?? "0");
      switch (expr.value) {
        case ">": return lv > rv; case "<": return lv < rv;
        case ">=": return lv >= rv; case "<=": return lv <= rv;
        case "==": return lv === rv; case "!=": return lv !== rv;
      }
    }
  }
  return null;
}

/** Short description of an AST expression for WAT comments */
function describeASTExpr(expr: AstNode): string {
  if (expr.kind === "boolLiteral" || expr.kind === "numberLiteral") return expr.value ?? "?";
  if (expr.kind === "identifier") return expr.value ?? "?";
  if (expr.kind === "binaryExpr" && expr.children?.length === 2) {
    return `${describeASTExpr(expr.children[0]!)} ${expr.value ?? "?"} ${describeASTExpr(expr.children[1]!)}`;
  }
  if (expr.kind === "memberExpr" && expr.children?.length === 1) {
    return `${describeASTExpr(expr.children[0]!)}.${expr.value ?? "?"}`;
  }
  return "expr";
}

/**
 * Extracts ordered parameter names from a flow's paramDecl children.
 *
 * `paramDecl` nodes have `value` like `"a: Int"` — we split on ":" and trim.
 * Returns e.g. ["a", "b"] for `flow add(a: Int, b: Int)`.
 */
export function extractFlowParamNames(flowNode: AstNode): string[] {
  return (flowNode.children ?? [])
    .filter((c) => c.kind === "paramDecl")
    .map((c) => ((c.value ?? "").split(":")[0] ?? "").trim())
    .filter((name) => name.length > 0);
}

/**
 * Finds a top-level flow node in the program AST by name.
 * Matches pureFlowDecl, flowDecl, secureFlowDecl, guardedFlowDecl.
 */
export function findFlowNodeInAST(ast: AstNode, flowName: string): AstNode | undefined {
  const FLOW_KINDS = new Set([
    "pureFlowDecl", "flowDecl", "secureFlowDecl", "guardedFlowDecl", "governedFlowDecl",
  ]);
  for (const child of ast.children ?? []) {
    if (!FLOW_KINDS.has(child.kind)) continue;
    // governedFlowDecl stores value as "governed:<floor>:<name>" — extract the real name
    if (child.kind === "governedFlowDecl") {
      const parts = (child.value ?? "").split(":");
      const realName = parts.slice(2).join(":"); // everything after "governed:<floor>:"
      if (realName === flowName) return child;
    } else if (child.value === flowName) {
      return child;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Pure-flow WAT body emitter (Phase 22)
// ---------------------------------------------------------------------------

/**
 * Emits real WAT instructions for a pure flow from its PassiveExecutionPlan.
 *
 * Pure flows have no effects, no capability calls, no I/O — only math, string
 * ops, and returns. This function converts the plan's steps to WAT instructions.
 *
 * Mapping rules:
 *   validate_param  → ignored at WAT level (compile-time check already done)
 *   validate_context → ignored at WAT level
 *   capability_call  → should not appear in pure flows; emitted as unreachable
 *   emit_event       → ignored at WAT level (no I/O in pure flows)
 *   response         → treated as return
 *   return           → emit (local.get $p0) for first param, then (return)
 *
 * For the simplest pure flow (identity: takes param, returns it):
 *   (local.get $p0)
 *
 * Phase 22: full expression lowering (arithmetic, string ops) deferred to
 * Phase 22B when the GIR carries typed expression trees.
 *
 * @param plan    - The pre-verified PassiveExecutionPlan for this pure flow.
 * @param paramCount - Number of parameters the function accepts.
 * @returns WAT instruction text (one instruction per line, no surrounding parens).
 */
export function emitWATBody(
  plan: { readonly steps: ReadonlyArray<{ readonly kind: string }> },
  paramCount: number,
): string {
  const instructions: string[] = [];

  // A pure flow that takes parameters and returns one: get the first parameter.
  // Phase 22B: walk typed expression tree to emit arithmetic/string ops.
  const hasReturn = plan.steps.some(
    (s) => s.kind === "return" || s.kind === "response",
  );

  // Accept both spellings: "capability_call" (snake_case) and "capabilityCall" (camelCase).
  const hasCapabilityCall = plan.steps.some(
    (s) => s.kind === "capability_call" || s.kind === "capabilityCall",
  );

  // "validateParam" and "validate_param" steps are compile-time proofs —
  // they are no-ops at the WAT level and generate no instructions.
  // "validateContext" / "validate_context" are similarly erased.
  // "emitEvent" / "emit_event" are erased in pure flows (no I/O).

  if (hasCapabilityCall) {
    // Capability calls must not appear in pure flows — guard with unreachable.
    // Phase 25: real capability dispatch via WASM imports.
    instructions.push("unreachable ;; capability call — Phase 25");
    return instructions.join("\n");
  }

  if (hasReturn && paramCount > 0) {
    // Identity-return: get the first parameter and return it.
    // Phase 22B: full expression lowering replaces this with the actual body.
    instructions.push("(local.get $p0) ;; return first param");
  } else if (hasReturn && paramCount === 0) {
    // Return a constant i32 zero when there are no parameters.
    instructions.push("(i32.const 0) ;; default return");
  } else {
    // No return step — unreachable (should not happen for well-formed plans).
    instructions.push("unreachable");
  }

  return instructions.join("\n");
}

// ---------------------------------------------------------------------------
// GIRProgram → WATModule builder
// ---------------------------------------------------------------------------

/**
 * Minimal GIR flow shape required by buildWATModule.
 * Matches the GIRFlow interface subset needed for WAT lowering.
 */
export interface WATFlowInput {
  readonly name: string;
  /** "pure" flows need no imports. Other qualifiers may have effects. */
  readonly qualifier: string;
  /**
   * Declared effect strings — flat array form (WATFlowInput native).
   * When passing GIRFlow directly, use effects.declared instead.
   * The builder accepts either form.
   */
  readonly declaredEffects?: readonly string[];
  /**
   * GIR-native nested effects object. Accepted alongside declaredEffects.
   * buildWATModule resolves: declaredEffects ?? effects?.declared ?? []
   */
  readonly effects?: { readonly declared: readonly string[] };
  /**
   * Parameter type names, e.g. ["Int", "String"].
   * Phase 22: used to build named WAT params ($p0, $p1, …) and for emitWATBody.
   * Optional — absent flows get a default (i32) parameter signature.
   */
  readonly paramTypes?: readonly string[];
  /**
   * Pre-built PassiveExecutionPlan for this flow.
   * When present for a pure flow, emitWATBody is called to produce real instructions.
   * When absent, the body falls back to "unreachable".
   */
  readonly executionPlan?: { readonly steps: ReadonlyArray<{ readonly kind: string }> };
  /**
   * Tensor binding metadata from GIRFlow.tensors.
   * Phase 27: used by buildWATModule to detect Float32 tensor flows and emit
   * TypedArray lowering comments and Tensor.dot memory region hints.
   */
  readonly tensors?: readonly { readonly elementType: string }[];
}

/**
 * Minimal GIR program shape for buildWATModule.
 * Avoids a hard import cycle with gir-emitter.ts.
 */
export interface WATGIRInput {
  readonly flows: readonly WATFlowInput[];
  readonly entryPoints: readonly string[];
  readonly girHash?: string;
  readonly sourceHash?: string;
  /**
   * Phase 25: original program AST, used by emitWATFromFlowAST to generate
   * real arithmetic bodies for pure flows.
   * When absent, the emitter falls back to Phase 24A identity bodies.
   */
  readonly ast?: AstNode;
  /**
   * Phase 27: when true, export all pure flows (not just entryPoints).
   * Enables WebAssembly.instantiate callers to invoke any pure flow by name.
   * Default: false (only entryPoints are exported).
   */
  readonly exportAllPure?: boolean;
}

/**
 * Maps a STDLIB_CAPABILITY_MAP wasmImport string ("host:fs.readText") to a
 * WATImport. The wasmImport format is "<module>:<name>".
 *
 * All effectful host functions are typed as (param i32 i32) (result i32) in
 * Phase 19. Phase 22 will carry real type signatures from the GIR type table.
 */
function wasmImportStringToWATImport(wasmImport: string, effect: string): WATImport | null {
  const colonIdx = wasmImport.indexOf(":");
  if (colonIdx === -1) return null;
  const module = wasmImport.slice(0, colonIdx);
  const name = wasmImport.slice(colonIdx + 1);
  return {
    module,
    name,
    effect,
    type: { params: ["i32", "i32"], results: ["i32"] },
  };
}

/**
 * Returns WATImport entries for the given declared effect names, resolved
 * through STDLIB_CAPABILITY_MAP.
 *
 * For each declared effect, scans all STDLIB_CAPABILITY_MAP entries whose
 * requiredEffects include that effect and have a wasmImport field.
 * Results are deduplicated by wasmImport key.
 *
 * All effectful host functions are typed as (param i32 i32) (result i32) in
 * Phase 19. Phase 22 will carry real type signatures from the GIR type table.
 *
 * @param effects - Declared effect names, e.g. ["filesystem.read", "audit.write"].
 * @returns Deduplicated WATImport array derived from STDLIB_CAPABILITY_MAP.
 */
export function getWATImportsForEffects(effects: readonly string[]): WATImport[] {
  const importsByKey = new Map<string, WATImport>();
  for (const effect of effects) {
    for (const [, entry] of STDLIB_CAPABILITY_MAP) {
      if (entry.requiredEffects.includes(effect) && entry.wasmImport) {
        const key = entry.wasmImport;
        if (!importsByKey.has(key)) {
          const imp = wasmImportStringToWATImport(entry.wasmImport, effect);
          if (imp) importsByKey.set(key, imp);
        }
      }
    }
  }
  return Array.from(importsByKey.values());
}

/**
 * Builds a WATModule from GIR program data.
 *
 * Mapping rules:
 *   - Pure flows (qualifier === "pure" and no declaredEffects) → no imports needed.
 *   - Effectful flows → imports derived from declaredEffects, resolved through
 *     STDLIB_CAPABILITY_MAP.wasmImport entries.
 *   - entryPoints → WATExport entries pointing at the matching function.
 *   - All flows → WATFunction stubs (isPure flag set from qualifier).
 *
 * Phase 19: all function bodies are stubs. Full lowering in Phase 22.
 */

/**
 * Collects compile-time integer constants from top-level `static` and `bitfield`
 * declarations in the program AST.
 *
 * `static NAME = N` → staticConsts.set("NAME", N)
 * `bitfield REG { field: bitPos }` → staticConsts.set("REG.field", 1 << bitPos)
 *                                    staticConsts.set("REG.BIT_field", bitPos)
 *
 * Only integer literals are folded here (the WAT emitter only supports i32).
 * Non-integer static values are ignored (they will emit (i32.const 0) at use site).
 */
function collectStaticConsts(ast: AstNode | undefined): ReadonlyMap<string, number> {
  const consts = new Map<string, number>();
  if (ast === undefined) return consts;

  for (const node of ast.children ?? []) {
    if (node.kind === "staticDecl") {
      const name = node.value ?? "";
      const valueExpr = node.children?.[0];
      if (name !== "" && valueExpr !== undefined) {
        const n = foldToInt(valueExpr, consts);
        if (n !== null) consts.set(name, n);
      }
    } else if (node.kind === "bitfieldDecl") {
      const registerName = node.value ?? "";
      if (registerName === "") continue;
      for (const child of node.children ?? []) {
        const parts = (child.value ?? "").split(":");
        if (parts.length !== 2) continue;
        const fieldName = (parts[0] ?? "").trim();
        const bitPos = parseInt((parts[1] ?? "").trim(), 10);
        if (isNaN(bitPos) || bitPos < 0 || bitPos > 31) continue;
        const bitmask = 1 << bitPos;
        consts.set(`${registerName}.${fieldName}`, bitmask);
        consts.set(`${registerName}.BIT_${fieldName}`, bitPos);
      }
    }
  }
  return consts;
}

/**
 * Attempts to fold an AST expression to a plain JavaScript integer.
 * Used by collectStaticConsts to resolve static initializers.
 * Returns null for non-constant or non-integer expressions.
 */
function foldToInt(
  expr: AstNode,
  consts: ReadonlyMap<string, number>,
): number | null {
  if (expr.kind === "numberLiteral") {
    const raw = (expr.value ?? "0").replace(/_/g, "");
    if (raw.includes(".")) return null; // float — not an integer
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }
  if (expr.kind === "identifier") {
    const name = expr.value ?? "";
    const v = consts.get(name);
    return v !== undefined ? v : null;
  }
  return null;
}

export function buildWATModule(
  gir: WATGIRInput,
  _capabilityMap: ReadonlyMap<string, { readonly wasmImport?: string; readonly requiredEffects: readonly string[] }>,
  target: "wasm-standalone" | "wasm-hybrid" = "wasm-standalone",
): WATModule {
  // Collect compile-time constants from `static NAME = EXPR` and `bitfield NAME { ... }`
  // top-level declarations in the AST. These are folded to (i32.const N) at every use site.
  const staticConsts = collectStaticConsts(gir.ast);

  // Build deduped import list from effectful flows using getWATImportsForEffects.
  // Collect all declared effects across non-pure flows, then resolve via STDLIB_CAPABILITY_MAP.
  const allEffects: string[] = [];
  // Helper to get declared effects from either form
  function getFlowEffects(flow: WATFlowInput): readonly string[] {
    return flow.declaredEffects ?? flow.effects?.declared ?? [];
  }

  for (const flow of gir.flows) {
    const declaredEffects = getFlowEffects(flow);
    const isPureFlow = flow.qualifier === "pure" && declaredEffects.length === 0;
    if (isPureFlow) continue;
    for (const effect of declaredEffects) {
      if (!allEffects.includes(effect)) {
        allEffects.push(effect);
      }
    }
  }
  const imports = getWATImportsForEffects(allEffects);

  // Build function definitions.
  // Pure flows (qualifier === "pure", no declaredEffects) get real WAT bodies via emitWATBody.
  // All other flows get "unreachable" stub bodies (Phase 22 effectful emission TBD).
  // Phase 27: when exportAllPure is set, all pure flows are entry points for export.
  const entrySet = gir.exportAllPure === true
    ? new Set(gir.flows.filter(f => f.qualifier === "pure").map(f => f.name))
    : new Set(gir.entryPoints);
  const functions: WATFunction[] = gir.flows.map((flow) => {
    const flowDeclaredEffects = getFlowEffects(flow);
    const isPureFlow = flow.qualifier === "pure" && flowDeclaredEffects.length === 0;

    // Build named params from paramTypes (or default to a single i32 when absent).
    const rawParamTypes: readonly string[] = flow.paramTypes ?? [];
    const namedParams: WATParamDef[] = rawParamTypes.map((typeName, i) => ({
      name: `$p${i}`,
      type: logicNTypeToWAT(typeName),
    }));
    // WATFuncType params: just the value types (for type-checking / signature).
    const paramValTypes: WATValType[] = namedParams.map((p) => p.type);

    // Emit a real body for pure flows.
    //
    // Phase 25 progression (AST-based emission):
    //   1. gir.ast present → Phase 25 real emission from AST body (arithmetic, let, return)
    //   2. executionPlan present → Phase 24A identity body from PassiveExecutionPlan steps
    //   3. paramTypes present → identity body (local.get $p0)
    //   4. No info available → minimal constant body (i32.const 0)
    //
    // Non-pure flows stay as unreachable until Phase 22 effectful emission.
    let body = "unreachable";
    if (isPureFlow && gir.ast !== undefined) {
      // Phase 25: find the flow's AST node and emit real arithmetic instructions.
      const flowAstNode = findFlowNodeInAST(gir.ast, flow.name);
      if (flowAstNode !== undefined) {
        const paramNames = extractFlowParamNames(flowAstNode);
        const phase25Body = emitWATFromFlowAST(flowAstNode, paramNames, staticConsts);
        if (phase25Body !== null) {
          body = phase25Body;
        } else if (flow.executionPlan !== undefined) {
          body = emitWATBody(flow.executionPlan, namedParams.length);
        } else {
          body = "(i32.const 0) ;; Phase 25: empty body";
        }
      } else if (flow.executionPlan !== undefined) {
        body = emitWATBody(flow.executionPlan, namedParams.length);
      } else if (rawParamTypes.length > 0) {
        body = emitWATBody({ steps: [{ kind: "return" }] }, namedParams.length);
      } else {
        body = "(i32.const 0) ;; Phase 25: no AST node found";
      }
    } else if (isPureFlow && flow.executionPlan !== undefined) {
      // Phase 24A: use PassiveExecutionPlan steps (identity body)
      body = emitWATBody(flow.executionPlan, namedParams.length);
    } else if (isPureFlow && rawParamTypes.length > 0) {
      // Phase 24A: paramTypes supplied — emit identity body (return first param)
      body = emitWATBody({ steps: [{ kind: "return" }] }, namedParams.length);
    } else if (isPureFlow) {
      // Fallback: no param info.
      body = "(i32.const 0) ;; Phase 25: no body info available";
    }

    // Phase 27C — TypedArray lowering hints for Float32 tensor flows.
    //
    // When a flow carries GIRTensorInfo entries whose elementType is "Float32",
    // prepend WAT comments that annotate the TypedArray lowering decision and the
    // Tensor.dot memory region. These comments are consumed by:
    //   - the WAT renderer (rendered verbatim inside the function body)
    //   - downstream tooling that inspects WAT text for memory layout decisions
    //   - the Phase 28 kernel fusion emitter, which will replace them with real
    //     v128.load / f32x4.mul / v128.store instruction sequences.
    //
    // The runtime selects: host.npu.inference (NPU) → host.gpu.compute (GPU) →
    // WASM SIMD (wasm-hybrid) → scalar CPU — in order of availability.
    // This comment block is emitted regardless of chosen target: the WAT module
    // always describes the WASM data-plane layout even when the hot path is native.
    const flowTensors = flow.tensors ?? [];
    const hasFloat32Tensors = flowTensors.some((t) => t.elementType === "Float32");
    if (hasFloat32Tensors) {
      const tensorHints = [
        ";; TypedArray lowering: Float32Array for Tensor<Float32,...>",
        ";; Phase 27: Tensor.dot maps to f32 memory region",
        body,
      ].filter((line) => line.trim().length > 0).join("\n");
      body = tensorHints;
    }

    return {
      name: flow.name,
      isPure: flow.qualifier === "pure",
      isEntryPoint: entrySet.has(flow.name),
      type: { params: paramValTypes, results: ["i32"] },
      body,
      ...(namedParams.length > 0 ? { namedParams } : {}),
    };
  });

  // Build exports from entryPoints, mapped to function indices.
  // Phase 27: when gir.exportAllPure is true (WASM instantiation mode),
  // export every pure flow so callers can invoke any function by name.
  const flowIndexMap = new Map(gir.flows.map((f, i) => [f.name, i]));
  const exportedNames = gir.exportAllPure === true
    ? gir.flows.filter(f => f.qualifier === "pure").map(f => f.name)
    : gir.entryPoints;
  const exports: WATExport[] = exportedNames
    .map((name) => {
      const idx = flowIndexMap.get(name);
      return idx !== undefined ? { name, index: idx } : null;
    })
    .filter((e): e is WATExport => e !== null);

  return {
    schemaVersion: "lln.wat.v1",
    sourceHash: gir.sourceHash ?? "",
    girHash: gir.girHash ?? "",
    imports,
    exports,
    functions,
    memory: DEFAULT_WAT_MEMORY,
    target,
  };
}

// ---------------------------------------------------------------------------
// GIRProgram overload — buildWATModuleFromGIR
// ---------------------------------------------------------------------------

/**
 * Builds a WATModule directly from a full GIRProgram.
 *
 * This is the Phase 22 entry point for the compiler pipeline.
 * It extracts the WATGIRInput shape from GIRProgram and delegates to
 * buildWATModule, passing through:
 *   - flow names, qualifiers, and declared effects
 *   - executionPlan from GIRFlow.executionPlan (used by emitWATBody for pure flows)
 *   - entryPoints from GIRProgram.entryPoints
 *   - girHash and sourceHash from GIRProgram
 *
 * Pure flows with no effects and a PassiveExecutionPlan get real WAT bodies.
 * Non-pure flows get unreachable stub bodies.
 *
 * @param gir           - Full GIRProgram from emitGIR.
 * @param capabilityMap - STDLIB_CAPABILITY_MAP for resolving effectful imports.
 * @param target        - WASM target variant.
 */
export function buildWATModuleFromGIR(
  gir: {
    readonly flows: ReadonlyArray<{
      readonly name: string;
      readonly qualifier: string;
      readonly effects: { readonly declared: readonly string[] };
      readonly executionPlan?: { readonly steps: ReadonlyArray<{ readonly kind: string }> };
      /** Phase 24: parameter type names from the AST. */
      readonly paramTypes?: readonly string[];
      /**
       * Phase 27: tensor binding metadata from GIRFlow.tensors.
       * When present, buildWATModule emits TypedArray lowering hints for Float32 flows.
       */
      readonly tensors?: readonly { readonly elementType: string }[];
    }>;
    readonly entryPoints: readonly string[];
    readonly girHash?: string;
    readonly sourceHash?: string;
  },
  capabilityMap: ReadonlyMap<string, { readonly wasmImport?: string; readonly requiredEffects: readonly string[] }>,
  target: "wasm-standalone" | "wasm-hybrid" = "wasm-standalone",
  /** Phase 25: original program AST for real arithmetic body emission. */
  ast?: AstNode,
  /** Phase 27: export all pure flows for WebAssembly.instantiate callers. */
  exportAllPure?: boolean,
): WATModule {
  const watInput: WATGIRInput = {
    flows: gir.flows.map((f) => {
      const base: WATFlowInput = {
        name: f.name,
        qualifier: f.qualifier,
        declaredEffects: f.effects.declared,
        ...(f.paramTypes !== undefined && f.paramTypes.length > 0 ? { paramTypes: f.paramTypes } : {}),
        ...(f.tensors !== undefined && f.tensors.length > 0 ? { tensors: f.tensors } : {}),
      };
      if (f.executionPlan !== undefined) {
        return { ...base, executionPlan: f.executionPlan };
      }
      return base;
    }),
    entryPoints: gir.entryPoints,
    ...(gir.girHash !== undefined ? { girHash: gir.girHash } : {}),
    ...(gir.sourceHash !== undefined ? { sourceHash: gir.sourceHash } : {}),
    ...(ast !== undefined ? { ast } : {}),
    ...(exportAllPure === true ? { exportAllPure: true } : {}),
  };
  return buildWATModule(watInput, capabilityMap, target);
}

// ---------------------------------------------------------------------------
// Stub emitter entry point
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// #70 WAT single-exit body transformation (Phase 4 prerequisite)
// ---------------------------------------------------------------------------

/**
 * Single-exit body transformation — Phase 4 prerequisite (task #70).
 *
 * Wraps a WAT function body so that ALL return paths converge through
 * a single exit point, where post-condition invariant gates can fire.
 *
 * Pattern:
 *   (block $logicn_exit
 *     ... body with br $logicn_exit replacing return ...
 *   )
 *   ;; post-condition gates fire here (after $exit)
 *   local.get $logicn_result
 *
 * Stage A (now): only emits the wrapper structure — no active post-conditions yet.
 *   The wrapper is a no-op transformation that preserves identical behavior.
 *   Post-condition gates will be injected here in Phase 4 when #70 is fully active.
 *
 * Stage B (Phase 4): `ensure returnValue > 0` expressions in invariant {} will
 *   generate post-condition gates that are injected after $logicn_exit.
 */
export function wrapInSingleExit(
  bodyLines: string[],
  postConditionLines: string[],
  _resultType: string,
): string[] {
  if (postConditionLines.length === 0) {
    // No post-conditions active yet — return body unchanged (Stage A no-op)
    return bodyLines;
  }

  // Future: wrap body in (block $logicn_exit), inject post-condition gates after
  // For now Stage A: no post-conditions, return unchanged
  return bodyLines;
}

/**
 * Classify ensures in an invariant {} block:
 *   - Pre-conditions: reference only flow parameters → already handled (WAT gate at entry)
 *   - Post-conditions: reference 'result' or non-parameter identifiers → need single-exit
 *
 * Stage A: returns empty array (no post-conditions wired yet).
 * Phase 4: will classify by comparing ensure symbols against param names.
 */
export function extractPostConditionEnsures(
  invariantNode: AstNode | undefined,
  _paramNames: Set<string>,
): AstNode[] {
  if (invariantNode === undefined) return [];
  // Stage A stub: all ensures are pre-conditions on parameters
  // Post-condition detection (symbols NOT in paramNames) added in Phase 4
  return [];
}

/**
 * Phase 19 stub: validates GIR structure and produces a skeleton WATModule.
 *
 * Full implementation (Phase 22):
 *   - Emit instructions from PassiveExecutionPlan steps
 *   - Lower Tensor<Float32, [n]> to Float32Array memory layout
 *   - Emit WASM SIMD for pure math flows
 *   - Populate import table from allowedEffectsMask
 */
export function emitWAT(
  _girHash: string,
  _sourceHash: string,
  _flows: readonly { name: string; qualifier: string; declaredEffects: readonly string[] }[],
  target: "wasm-standalone" | "wasm-hybrid",
): WATEmitResult {
  // Phase 19: build a minimal WATModule — no capability map available at this
  // level, so imports are empty. Full population in Phase 22.
  const module: WATModule = {
    schemaVersion: "lln.wat.v1",
    sourceHash: _sourceHash,
    girHash: _girHash,
    imports: [],   // Phase 22: populated via buildWATModule + STDLIB_CAPABILITY_MAP
    exports: [],   // Phase 22: populated from GIR.entryPoints
    functions: _flows.map((f) => ({
      name: f.name,
      isPure: f.qualifier === "pure",
      isEntryPoint: false,
      type: { params: [], results: ["i32"] },
      body: "unreachable",
    })),
    memory: DEFAULT_WAT_MEMORY,
    target,
  };

  return {
    module,
    wat: renderWAT(module),
    diagnostics: [{
      code: "LLN-WAT-STUB",
      message: `WAT emitter Phase 19 stub. Full emission in Phase 22. Target: ${target}. Source hash: ${_sourceHash.slice(0, 20)}...`,
    }],
  };
}
