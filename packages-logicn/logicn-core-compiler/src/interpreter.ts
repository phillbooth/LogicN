// =============================================================================
// LogicN Stage A - AST interpreter
// =============================================================================

import { type AstNode, type FlowMeta } from "./parser.js";
import { callStdlib, logicNValuesEqual, moneyBinary } from "./stdlib.js";
import { type CapabilityHost } from "./runtime/capabilityHost.js";
import { type RuntimeContext } from "./runtime/runtimeContext.js";
import { type ContractEnforcer } from "./runtime/contractEnforcer.js";
import { type ContractEnforcementRecord } from "./runtime/runtimeReport.js";

export type LogicNValue =
  | { readonly __tag: "int";       readonly value: number }
  | { readonly __tag: "float";     readonly value: number }
  | { readonly __tag: "decimal";   readonly value: string }
  | { readonly __tag: "string";    readonly value: string }
  | { readonly __tag: "bool";      readonly value: boolean }
  | { readonly __tag: "char";      readonly value: string }
  | { readonly __tag: "byte";      readonly value: number }
  | { readonly __tag: "bytes";     readonly value: Uint8Array }
  | { readonly __tag: "void" }
  | { readonly __tag: "none" }
  | { readonly __tag: "some";      readonly value: LogicNValue }
  | { readonly __tag: "ok";        readonly value: LogicNValue }
  | { readonly __tag: "err";       readonly error: LogicNValue }
  | { readonly __tag: "record";    readonly fields: ReadonlyMap<string, LogicNValue> }
  | { readonly __tag: "list";      readonly items: readonly LogicNValue[] }
  | { readonly __tag: "secure";    readonly value: string }
  | { readonly __tag: "protected"; readonly baseType: string; readonly value: LogicNValue }
  | { readonly __tag: "redacted";  readonly baseType: string }
  | { readonly __tag: "unresolved"; readonly name: string }
  | { readonly __tag: "runtimeError"; readonly message: string }
  // Backward-compatible tags from the first Stage A interpreter pass.
  | { readonly __tag: "function";  readonly name: string }
  | { readonly __tag: "error";     readonly message: string };

export const LLN_VOID: LogicNValue = { __tag: "void" };
export const LLN_NONE: LogicNValue = { __tag: "none" };

interface BindingEntry {
  readonly value: LogicNValue;
  readonly unsafe: boolean;
  readonly typeName: string;
}

class EarlyReturn {
  constructor(readonly value: LogicNValue) {}
}

export interface RuntimeAuditEntry {
  readonly event: string;
  readonly fields: Readonly<Record<string, string>>;
  readonly timestamp: string;
}

export interface ExecutionAuditRecord {
  readonly schemaVersion: "lln.runtime.audit.v1";
  readonly flowName: string;
  readonly qualifier: "flow" | "pure" | "guarded" | "secure";
  readonly startedAt: string;
  readonly completedAt: string;
  readonly effectsObserved: readonly string[];
  readonly auditEntries: readonly RuntimeAuditEntry[];
  readonly result: "ok" | "error";
  readonly error?: string;
}

export interface FlowExecutionResult {
  readonly value: LogicNValue;
  readonly effectsObserved: readonly string[];
  readonly auditEntries: readonly RuntimeAuditEntry[];
  readonly diagnostics: readonly { code: string; message: string }[];
  readonly audit: ExecutionAuditRecord;
  readonly enforcementRecord?: ContractEnforcementRecord;
}

export type ExecutionResult = FlowExecutionResult;

const FLOW_KINDS = new Set(["flowDecl", "secureFlowDecl", "pureFlowDecl", "guardedFlowDecl"]);
const STD_RECEIVERS = new Set([
  "AuditLog",
  "Env",
  "File",
  "FileSystem",
  "Int",
  "Float",
  "Math",
  "Money",
  "String",
  "console",
  "env",
  "fs",
  "http",
  "https",
  "json",
  "log",
  "parse",
  "sanitize",
  "toml",
  "validate",
]);
const STD_METHOD_NAMES = new Set([
  // Option
  "unwrapOr", "isSome", "isNone", "map", "flatMap", "value", "get",
  // Result
  "isOk", "isErr", "mapErr",
  // String
  "length", "charCount", "toLower", "toUpper", "trim", "trimStart", "trimEnd",
  "startsWith", "endsWith", "contains", "includes", "split", "replace", "replaceAll",
  "slice", "encode", "encodedLength", "codePoints", "isEmpty", "toString", "toText",
  "charAt", "indexOf", "lastIndexOf", "padStart", "padEnd", "repeat", "toChars",
  "toInt", "toFloat", "toDecimal",
  // Array
  "first", "last", "push", "append", "filter", "reduce", "sum", "reverse", "join", "find",
  "toList", "toArray", "take", "drop", "flatMap", "zip", "sortBy", "sort",
  "min", "max", "count", "distinct", "unique", "groupBy",
  // Map
  "set", "has", "size", "keys", "values", "delete", "remove", "entries", "merge",
  // Money
  "amount", "currency", "add", "subtract", "multiply", "divideBy",
  // Bytes
  "toHex", "toBase64", "equals", "decode", "sha256", "sha256Hex",
  // String extended — named format (Phase 9A-3)
  "format",
  // Char
  "codePoint", "isDigit", "isLetter", "isUpper", "isLower", "isWhitespace",
  // Timestamp + Duration
  "toMs", "toSeconds", "toMinutes", "toHours", "before", "after", "toIso",
  "isZero", "isNeg", "abs",
  // Numeric
  "toFixed", "toPlaces", "floor", "ceil", "round", "clamp", "sign",
]);

class Interpreter {
  private readonly scopes: Array<Map<string, BindingEntry>> = [];
  private readonly effectsObserved = new Set<string>();
  private readonly auditEntries: RuntimeAuditEntry[] = [];
  private readonly diagnostics: Array<{ code: string; message: string }> = [];
  private readonly flowIndex: ReadonlyMap<string, AstNode>;
  private readonly fnIndex = new Map<string, AstNode>();
  capabilityHost: CapabilityHost | undefined;
  private readonly enforcer: ContractEnforcer | undefined;

  constructor(
    private readonly ast: AstNode,
    private readonly knownFlows: readonly FlowMeta[],
    enforcer?: ContractEnforcer,
    capabilityHost?: CapabilityHost,
  ) {
    this.flowIndex = buildFlowIndex(ast);
    this.enforcer = enforcer;
    this.capabilityHost = capabilityHost;
  }

  private getContext(): RuntimeContext {
    return {
      flowName: "runtime",
      startedAt: Date.now(),
    };
  }

  private makeStdlibContext() {
    return {
      recordEffect: (effect: string) => this.effectsObserved.add(effect),
      resolveIdentifier: (name: string) => this.lookup(name)?.value,
      callFlow: async (name: string, fnArgs: ReadonlyMap<string, LogicNValue>) => {
        const sub = new Interpreter(this.ast, this.knownFlows);
        const result = await sub.runFlow(name, fnArgs);
        for (const effect of result.effectsObserved) this.effectsObserved.add(effect);
        this.auditEntries.push(...result.auditEntries);
        return result.value;
      },
      applyFn: async (fn: LogicNValue, arg: LogicNValue) => {
        if (fn.__tag === "unresolved" && this.flowIndex.has(fn.name)) {
          const callArgs = new Map<string, LogicNValue>([["arg", arg]]);
          const sub = new Interpreter(this.ast, this.knownFlows);
          const result = await sub.runFlow(fn.name, callArgs);
          for (const effect of result.effectsObserved) this.effectsObserved.add(effect);
          this.auditEntries.push(...result.auditEntries);
          return result.value;
        }
        return arg;
      },
    };
  }

  async runFlow(flowName: string, args: ReadonlyMap<string, LogicNValue>): Promise<FlowExecutionResult> {
    const startedAt = new Date().toISOString();
    const flowNode = this.flowIndex.get(flowName);
    const qualifier = flowNode === undefined ? "flow" : qualifierFromFlowKind(flowNode.kind);

    // Step 2A: Check deadline before doing any work
    if (this.enforcer !== undefined) {
      try {
        this.enforcer.checkDeadline();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const value: LogicNValue = { __tag: "err", error: { __tag: "string", value: message } };
        this.diagnostics.push({ code: "LLN-RUNTIME-DEADLINE", message });
        return this.buildResult(flowName, qualifier, startedAt, value, message);
      }
    }

    if (flowNode === undefined) {
      const value: LogicNValue = { __tag: "runtimeError", message: `Flow '${flowName}' not found` };
      this.diagnostics.push({ code: "LLN-RUNTIME-002", message: `Flow '${flowName}' not found` });
      return this.buildResult(flowName, qualifier, startedAt, value, value.message);
    }

    this.pushScope();
    this.seedPrelude();

    for (const child of flowNode.children ?? []) {
      if (child.kind === "paramDecl") {
        const paramName = extractParamName(child.value ?? "");
        const argVal = args.get(paramName) ?? LLN_VOID;
        this.declare(paramName, argVal, false, bindingTypeName(child.value ?? ""));
      }
    }

    let returnValue: LogicNValue = LLN_VOID;
    let runtimeError: string | undefined;

    try {
      for (const child of flowNode.children ?? []) {
        if (child.kind === "block") {
          returnValue = await this.executeBlock(child) ?? LLN_VOID;
        }
      }
    } catch (error: unknown) {
      if (error instanceof EarlyReturn) {
        returnValue = error.value;
      } else {
        const message = error instanceof Error ? error.message : String(error);
        runtimeError = message;
        this.diagnostics.push({ code: "LLN-RUNTIME-003", message: `Runtime exception: ${message}` });
        returnValue = { __tag: "runtimeError", message };
      }
    } finally {
      this.popScope();
    }

    return this.buildResult(flowName, qualifier, startedAt, returnValue, runtimeError);
  }

  private buildResult(
    flowName: string,
    qualifier: "flow" | "pure" | "guarded" | "secure",
    startedAt: string,
    value: LogicNValue,
    runtimeError: string | undefined,
  ): FlowExecutionResult {
    const error = runtimeError ?? (isRuntimeError(value) ? value.message : undefined);
    const audit: ExecutionAuditRecord = {
      schemaVersion: "lln.runtime.audit.v1",
      flowName,
      qualifier,
      startedAt,
      completedAt: new Date().toISOString(),
      effectsObserved: [...this.effectsObserved],
      auditEntries: [...this.auditEntries],
      result: error === undefined ? "ok" : "error",
      ...(error === undefined ? {} : { error }),
    };

    return {
      value,
      effectsObserved: [...this.effectsObserved],
      auditEntries: [...this.auditEntries],
      diagnostics: [...this.diagnostics],
      audit,
      ...(this.enforcer !== undefined ? { enforcementRecord: this.enforcer.enforcementRecord } : {}),
    };
  }

  private pushScope(): void {
    this.scopes.push(new Map());
  }

  private popScope(): void {
    this.scopes.pop();
  }

  private lookup(name: string): BindingEntry | undefined {
    for (let index = this.scopes.length - 1; index >= 0; index -= 1) {
      const entry = this.scopes[index]?.get(name);
      if (entry !== undefined) return entry;
    }
    return undefined;
  }

  private declare(name: string, value: LogicNValue, unsafe = false, typeName = ""): void {
    const scope = this.scopes[this.scopes.length - 1];
    if (scope !== undefined) {
      scope.set(name, { value, unsafe, typeName });
    }
  }

  private assign(name: string, value: LogicNValue, unsafe?: boolean): boolean {
    for (let index = this.scopes.length - 1; index >= 0; index -= 1) {
      const scope = this.scopes[index];
      const previous = scope?.get(name);
      if (scope !== undefined && previous !== undefined) {
        scope.set(name, {
          value,
          unsafe: unsafe ?? previous.unsafe,
          typeName: previous.typeName,
        });
        return true;
      }
    }
    return false;
  }

  private async executeBlock(node: AstNode): Promise<LogicNValue | undefined> {
    this.pushScope();
    let result: LogicNValue | undefined;

    try {
      for (const child of node.children ?? []) {
        const stmtResult = await this.executeStatement(child);
        if (stmtResult !== undefined) {
          result = stmtResult;
          break;
        }
      }
    } finally {
      this.popScope();
    }

    return result;
  }

  private async executeStatement(node: AstNode): Promise<LogicNValue | undefined> {
    switch (node.kind) {
      case "letDecl":
      case "readonlyDecl": {
        const initNode = node.children?.[0];
        const initVal = initNode !== undefined ? await this.evalExpr(initNode) : LLN_VOID;
        const { name, safetyPrefix, typeName, rawType } = parseBindingValue(node.value ?? "");
        this.declare(name, wrapGovernedValue(initVal, rawType), safetyPrefix === "unsafe", typeName);
        return undefined;
      }

      case "mutDecl": {
        const initNode = node.children?.[0];
        const initVal = initNode !== undefined ? await this.evalExpr(initNode) : LLN_VOID;
        const { name, safetyPrefix, typeName, rawType } = parseBindingValue(node.value ?? "");
        const value = wrapGovernedValue(initVal, rawType);
        if (safetyPrefix === "safe") {
          if (!this.assign(name, value, false)) this.declare(name, value, false, typeName);
        } else {
          this.declare(name, value, safetyPrefix === "unsafe", typeName);
        }
        return undefined;
      }

      case "returnStmt": {
        const retExpr = node.children?.[0];
        return retExpr !== undefined ? await this.evalExpr(retExpr) : LLN_VOID;
      }

      case "ifStmt": {
        const condition = node.children?.[0];
        const thenBlock = node.children?.[1];
        const elseBlock = node.children?.[2];
        if (condition === undefined || thenBlock === undefined) return undefined;
        const condVal = await this.evalExpr(condition);
        if (condVal.__tag === "bool" && condVal.value) return await this.executeBlock(thenBlock);
        if (elseBlock !== undefined) {
          // else if: the else branch may be another ifStmt node (not a block)
          if (elseBlock.kind === "ifStmt" || elseBlock.kind === "block") {
            if (elseBlock.kind === "block") return await this.executeBlock(elseBlock);
            return await this.executeStatement(elseBlock);
          }
          return await this.executeBlock(elseBlock);
        }
        return undefined;
      }

      case "matchExpr": {
        const matchResult = await this.evalExpr(node);
        return matchResult.__tag === "void" ? undefined : matchResult;
      }

      case "assignStmt": {
        const targetName = node.value ?? "";
        const rhsNode = node.children?.[0];
        if (targetName === "" || rhsNode === undefined) return undefined;
        const newValue = await this.evalExpr(rhsNode);
        if (!this.assign(targetName, newValue)) {
          this.diagnostics.push({
            code: "LLN-RUNTIME-004",
            message: `Cannot assign to undeclared binding '${targetName}'`,
          });
        }
        return undefined;
      }

      case "whileStmt": {
        const conditionNode = node.children?.[0];
        const bodyNode = node.children?.[1];
        if (conditionNode === undefined || bodyNode === undefined) return undefined;

        let iterations = 0;
        const MAX_ITERATIONS = 100_000;

        while (true) {
          if (iterations++ > MAX_ITERATIONS) {
            this.diagnostics.push({
              code: "LLN-RUNTIME-005",
              message: "Loop exceeded maximum iteration count (100,000)",
            });
            break;
          }
          const cond = await this.evalExpr(conditionNode);
          if (cond.__tag !== "bool" || !cond.value) break;
          const bodyResult = await this.executeBlock(bodyNode);
          if (bodyResult !== undefined) return bodyResult;
        }
        return undefined;
      }

      case "forEachStmt": {
        const varName = node.value ?? "item";
        const collectionNode = node.children?.[0];
        const bodyNode = node.children?.[1];
        if (collectionNode === undefined || bodyNode === undefined) return undefined;

        const collection = await this.evalExpr(collectionNode);
        const items = collection.__tag === "list" ? collection.items : [];

        for (const item of items) {
          this.pushScope();
          this.declare(varName, item);
          const bodyResult = await this.executeBlock(bodyNode);
          this.popScope();
          if (bodyResult !== undefined) return bodyResult;
        }
        return undefined;
      }

      case "fnDecl":
        if (node.value !== undefined) {
          this.fnIndex.set(node.value, node);
          this.declare(node.value, { __tag: "unresolved", name: node.value });
        }
        return undefined;

      case "block":
        return await this.executeBlock(node);

      default:
        await this.evalExpr(node);
        return undefined;
    }
  }

  private async evalExpr(node: AstNode): Promise<LogicNValue> {
    switch (node.kind) {
      case "stringLiteral": {
        const raw = node.value ?? "";
        return { __tag: "string", value: stripStringQuotes(raw) };
      }

      case "numberLiteral": {
        const raw = (node.value ?? "0").replace(/_/g, "");
        if (raw.startsWith("0x") || raw.startsWith("0X")) return { __tag: "int", value: parseInt(raw, 16) };
        if (raw.startsWith("0b") || raw.startsWith("0B")) return { __tag: "int", value: parseInt(raw.slice(2), 2) };
        if (raw.startsWith("0o") || raw.startsWith("0O")) return { __tag: "int", value: parseInt(raw.slice(2), 8) };
        return raw.includes(".")
          ? { __tag: "float", value: parseFloat(raw) }
          : { __tag: "int", value: parseInt(raw, 10) };
      }

      case "boolLiteral":
        return { __tag: "bool", value: node.value === "true" };

      case "charLiteral":
        return { __tag: "char", value: resolveCharEscape(node.value ?? "") };

      case "listLiteral": {
        const items: LogicNValue[] = [];
        for (const child of node.children ?? []) items.push(await this.evalExpr(child));
        return { __tag: "list", items };
      }

      case "identifier": {
        const name = node.value ?? "";
        if (name === "None") return LLN_NONE;
        if (name === "true") return { __tag: "bool", value: true };
        if (name === "false") return { __tag: "bool", value: false };
        if (name === "Ok" || name === "Err" || name === "Some") return { __tag: "unresolved", name };
        const entry = this.lookup(name);
        if (entry !== undefined) return entry.value;
        // Capital-letter identifiers not in scope are module/type names (Math, Duration, Array, etc.)
        // Return unresolved so the stdlib dispatcher can handle them as static calls.
        // Symbol resolver already validates lowercase identifiers — capital ones are stdlib modules.
        if (name.length > 0 && name[0]! >= "A" && name[0]! <= "Z") {
          return { __tag: "unresolved", name };
        }
        return { __tag: "runtimeError", message: `'${name}' is not in scope` };
      }

      case "binaryExpr": {
        const leftNode = node.children?.[0];
        const rightNode = node.children?.[1];
        if (leftNode === undefined || rightNode === undefined) return LLN_VOID;
        return await this.evalBinary(node.value ?? "", leftNode, rightNode);
      }

      case "unaryExpr": {
        const operandNode = node.children?.[0];
        if (operandNode === undefined) return LLN_VOID;
        const operand = await this.evalExpr(operandNode);
        const op = node.value ?? "";
        if (op === "!" && operand.__tag === "bool") return { __tag: "bool", value: !operand.value };
        if (op === "-" && operand.__tag === "int") return { __tag: "int", value: -operand.value };
        if (op === "-" && operand.__tag === "float") return { __tag: "float", value: -operand.value };
        return { __tag: "runtimeError", message: `Unary '${op}' not valid for ${operand.__tag}` };
      }

      case "errorPropagation": {
        const inner = node.children?.[0];
        if (inner === undefined) return LLN_VOID;
        const val = await this.evalExpr(inner);
        if (val.__tag === "err") throw new EarlyReturn(val);
        if (val.__tag === "ok") return val.value;
        return val;
      }

      case "callExpr":
        return await this.evalCall(node);

      case "memberExpr":
        return await this.evalMember(node);

      case "matchExpr":
        return await this.evalMatch(node);

      case "block":
        if (node.value === "(expr)") {
          const expr = node.children?.[0];
          return expr === undefined ? LLN_VOID : await this.evalExpr(expr);
        }
        return await this.executeBlock(node) ?? LLN_VOID;

      default:
        return LLN_VOID;
    }
  }

  private async evalBinary(op: string, leftNode: AstNode, rightNode: AstNode): Promise<LogicNValue> {
    if (op === "&&") {
      const left = await this.evalExpr(leftNode);
      if (left.__tag === "bool" && !left.value) return { __tag: "bool", value: false };
      return await this.evalExpr(rightNode);
    }

    if (op === "||") {
      const left = await this.evalExpr(leftNode);
      if (left.__tag === "bool" && left.value) return { __tag: "bool", value: true };
      return await this.evalExpr(rightNode);
    }

    const left = await this.evalExpr(leftNode);
    const right = await this.evalExpr(rightNode);

    if ((left.__tag === "int" || left.__tag === "float") && (right.__tag === "int" || right.__tag === "float")) {
      const resultTag = left.__tag === "float" || right.__tag === "float" ? "float" : "int";
      switch (op) {
        case "+": return { __tag: resultTag, value: left.value + right.value };
        case "-": return { __tag: resultTag, value: left.value - right.value };
        case "*": return { __tag: resultTag, value: left.value * right.value };
        case "/": return { __tag: resultTag, value: resultTag === "int" ? Math.trunc(left.value / right.value) : left.value / right.value };
        case "%": return { __tag: resultTag, value: left.value % right.value };
      }
    }

    if (op === "+" && left.__tag === "string" && right.__tag === "string") {
      return { __tag: "string", value: left.value + right.value };
    }

    // Money arithmetic
    const moneyResult = moneyBinary(left, op, right);
    if (moneyResult !== undefined) return moneyResult;

    if (op === "==") return { __tag: "bool", value: logicNValuesEqual(left, right) };
    if (op === "!=") return { __tag: "bool", value: !logicNValuesEqual(left, right) };

    if (left.__tag === "int" || left.__tag === "float") {
      const l = left.value;
      const r = right.__tag === "int" || right.__tag === "float" ? right.value : 0;
      switch (op) {
        case "<": return { __tag: "bool", value: l < r };
        case "<=": return { __tag: "bool", value: l <= r };
        case ">": return { __tag: "bool", value: l > r };
        case ">=": return { __tag: "bool", value: l >= r };
      }
    }

    return { __tag: "runtimeError", message: `Operator '${op}' not supported for ${left.__tag}` };
  }

  private async evalCall(node: AstNode): Promise<LogicNValue> {
    const methodName = node.value ?? "";
    const children = node.children ?? [];

    // Record literal: { field: expr, ... } parsed as callExpr { value: "#record" }
    // Each child is an identifier { value: "fieldName", children: [valueExpr] }
    if (methodName === "#record") {
      const fields = new Map<string, LogicNValue>();
      for (const child of children) {
        if (child.kind === "identifier" && child.value !== undefined) {
          const fieldName = child.value;
          const fieldValueNode = child.children?.[0];
          const fieldValue = fieldValueNode !== undefined
            ? await this.evalExpr(fieldValueNode)
            : { __tag: "void" as const };
          fields.set(fieldName, fieldValue);
        }
      }
      return { __tag: "record", fields };
    }
    const forceStandalone =
      methodName === "Ok" ||
      methodName === "Err" ||
      methodName === "Some" ||
      methodName === "format" ||
      methodName === "redact" ||
      methodName === "constantTimeEquals" ||
      this.fnIndex.has(methodName) ||
      this.flowIndex.has(methodName);
    const receiverFromSyntax = forceStandalone ? undefined : getReceiver(node);
    const receiver =
      receiverFromSyntax ??
      (!forceStandalone && STD_METHOD_NAMES.has(methodName) && children.length > 0 ? children[0] : undefined);
    const args = receiver === undefined ? children : children.slice(1);
    const receiverName = receiver === undefined ? "" : this.getReceiverName(receiver);
    const fullName = receiverName !== "" ? `${receiverName}.${methodName}` : methodName;

    if (methodName === "Ok") return { __tag: "ok", value: await this.evalExpr(args[0] ?? voidIdentifier()) };
    if (methodName === "Err") return { __tag: "err", error: await this.evalExpr(args[0] ?? voidIdentifier()) };
    if (methodName === "Some") return { __tag: "some", value: await this.evalExpr(args[0] ?? voidIdentifier()) };

    if (this.fnIndex.has(methodName) && receiver === undefined) {
      return await this.runLocalFn(methodName, args);
    }

    const evaluatedReceiver = receiver !== undefined ? await this.evalExpr(receiver) : undefined;
    const evaluatedArgs: LogicNValue[] = [];
    for (const arg of args) evaluatedArgs.push(await this.evalExpr(arg));

    // Route governed calls through the capability host when present
    if (this.capabilityHost !== undefined) {
      const capEffect = resolveCapabilityEffect(fullName);
      if (capEffect !== undefined) {
        const capId = `host.${capEffect}`;
        const stdlibCtx = this.makeStdlibContext();
        const result = await this.capabilityHost.execute(
          {
            capabilityId: capId,
            effect: capEffect,
            args: evaluatedArgs,
            context: this.getContext(),
          },
          async (capArgs) =>
            (await callStdlib(fullName, evaluatedReceiver, capArgs, stdlibCtx)) ?? LLN_VOID,
        );
        return result.value;
      }
    }

    const stdlibResult = await callStdlib(
      fullName,
      evaluatedReceiver,
      evaluatedArgs,
      this.makeStdlibContext(),
    );
    if (stdlibResult !== undefined) return stdlibResult;

    if (fullName.startsWith("validate.") || fullName.startsWith("sanitize.") || fullName.startsWith("parse.")) {
      const raw = args[0] !== undefined ? await this.evalExpr(args[0]) : LLN_VOID;
      const baseName = fullName.split(".").slice(1).join(".");
      return { __tag: "ok", value: { __tag: "protected", baseType: titleCase(baseName), value: raw } };
    }

    if (fullName.startsWith("json.decode") || fullName.startsWith("toml.decode")) {
      const raw = args[0] !== undefined ? await this.evalExpr(args[0]) : LLN_VOID;
      if (raw.__tag === "string") {
        try {
          return { __tag: "ok", value: jsObjectToLogicN(JSON.parse(raw.value)) };
        } catch {
          return { __tag: "err", error: { __tag: "string", value: "DecodeError: invalid JSON" } };
        }
      }
      return { __tag: "ok", value: raw };
    }

    if (methodName === "redact" || fullName === "redact") {
      const raw = args[0] !== undefined ? await this.evalExpr(args[0]) : LLN_VOID;
      return { __tag: "redacted", baseType: raw.__tag === "protected" ? raw.baseType : "Unknown" };
    }

    if (methodName === "constantTimeEquals" || fullName === "constantTimeEquals") {
      const a = args[0] !== undefined ? await this.evalExpr(args[0]) : LLN_NONE;
      const b = args[1] !== undefined ? await this.evalExpr(args[1]) : LLN_NONE;
      return { __tag: "bool", value: secureComparable(a) === secureComparable(b) };
    }

    if (fullName === "AuditLog.write") {
      if (this.capabilityHost !== undefined) {
        const auditArgs = evaluatedArgs;
        const result = await this.capabilityHost.execute(
          {
            capabilityId: "host.audit.write",
            effect: "audit.write",
            args: auditArgs,
            context: this.getContext(),
          },
          async (_capArgs) => {
            this.effectsObserved.add("audit.write");
            this.auditEntries.push(await this.buildAuditEntry(args));
            return LLN_VOID;
          },
        );
        return result.value;
      }
      this.effectsObserved.add("audit.write");
      this.auditEntries.push(await this.buildAuditEntry(args));
      return LLN_VOID;
    }

    if (methodName === "print" || fullName.startsWith("log.") || fullName.startsWith("console.")) {
      const arg = args[0] !== undefined ? await this.evalExpr(args[0]) : LLN_VOID;
      console.log(safeDisplay(arg));
      return LLN_VOID;
    }

    if (methodName === "format" || fullName === "format") {
      let result = args[0] !== undefined ? safeStringify(await this.evalExpr(args[0])) : "";
      for (let index = 1; index < args.length; index += 1) {
        const arg = args[index];
        result = result.replace("{}", arg === undefined ? "" : safeDisplay(await this.evalExpr(arg)));
      }
      return { __tag: "string", value: result };
    }

    // Response helpers
    if (fullName === "Response.ok" || (receiverName === "Response" && methodName === "ok")) {
      const data = args[0] !== undefined ? await this.evalExpr(args[0]) : LLN_VOID;
      return makeResponseValue(200, data);
    }
    if (fullName === "Response.created" || (receiverName === "Response" && methodName === "created")) {
      const id = args[0] !== undefined ? await this.evalExpr(args[0]) : LLN_VOID;
      return makeResponseValue(201, id);
    }
    if (fullName === "Response.accepted" || (receiverName === "Response" && methodName === "accepted")) {
      return makeResponseValue(202, LLN_VOID);
    }
    if (fullName === "Response.noContent" || (receiverName === "Response" && methodName === "noContent")) {
      return makeResponseValue(204, LLN_VOID);
    }
    if (fullName === "Response.redirect" || (receiverName === "Response" && methodName === "redirect")) {
      const url = args[0] !== undefined ? await this.evalExpr(args[0]) : LLN_VOID;
      return makeResponseValue(302, url);
    }

    // ApiError helpers
    if (fullName === "ApiError.notFound" || (receiverName === "ApiError" && methodName === "notFound")) {
      const msg = args[0] !== undefined ? await this.evalExpr(args[0]) : LLN_VOID;
      return makeApiErrorValue(404, safeDisplay(msg));
    }
    if (fullName === "ApiError.badRequest" || (receiverName === "ApiError" && methodName === "badRequest")) {
      const msg = args[0] !== undefined ? await this.evalExpr(args[0]) : LLN_VOID;
      return makeApiErrorValue(400, safeDisplay(msg));
    }
    if (fullName === "ApiError.internal" || (receiverName === "ApiError" && methodName === "internal")) {
      const msg = args[0] !== undefined ? await this.evalExpr(args[0]) : LLN_VOID;
      return makeApiErrorValue(500, safeDisplay(msg));
    }
    if (fullName === "ApiError.unauthorized" || (receiverName === "ApiError" && methodName === "unauthorized")) {
      const msg = args[0] !== undefined ? await this.evalExpr(args[0]) : LLN_VOID;
      return makeApiErrorValue(401, safeDisplay(msg));
    }

    if (this.flowIndex.has(methodName)) {
      return await this.runNestedFlow(methodName, args);
    }

    if (receiver !== undefined) {
      return this.evalMethodCall(evaluatedReceiver ?? await this.evalExpr(receiver), methodName, evaluatedArgs);
    }

    this.diagnostics.push({ code: "LLN-RUNTIME-002", message: `Unresolved call: '${fullName}'` });
    return { __tag: "runtimeError", message: `Unresolved call: '${fullName}'` };
  }

  private evalMethodCall(receiver: LogicNValue, method: string, args: readonly LogicNValue[]): LogicNValue {
    if (receiver.__tag === "string") {
      switch (method) {
        case "toLower": return { __tag: "string", value: receiver.value.toLowerCase() };
        case "toUpper": return { __tag: "string", value: receiver.value.toUpperCase() };
        case "trim": return { __tag: "string", value: receiver.value.trim() };
        case "length":
        case "charCount": return { __tag: "int", value: receiver.value.length };
        case "startsWith": return { __tag: "bool", value: receiver.value.startsWith(safeDisplay(args[0] ?? LLN_VOID)) };
        case "endsWith": return { __tag: "bool", value: receiver.value.endsWith(safeDisplay(args[0] ?? LLN_VOID)) };
        case "contains": return { __tag: "bool", value: receiver.value.includes(safeDisplay(args[0] ?? LLN_VOID)) };
        case "toString": return receiver;
      }
    }

    if (receiver.__tag === "list") {
      switch (method) {
        case "length": return { __tag: "int", value: receiver.items.length };
        case "isEmpty": return { __tag: "bool", value: receiver.items.length === 0 };
        case "first": return receiver.items.length > 0 ? { __tag: "some", value: receiver.items[0] ?? LLN_VOID } : LLN_NONE;
        case "last": return receiver.items.length > 0 ? { __tag: "some", value: receiver.items[receiver.items.length - 1] ?? LLN_VOID } : LLN_NONE;
      }
    }

    if (receiver.__tag === "record") {
      const field = receiver.fields.get(method);
      if (field !== undefined) return field;
    }

    if (receiver.__tag === "protected") {
      return this.evalMethodCall(receiver.value, method, args);
    }

    // Enum variant access: EnumType.VariantName → unresolved("VariantName")
    // This allows record fields like `{ kind: TokenKind.Keyword }` to store the
    // variant name as an opaque unresolved value for later pattern matching.
    if (receiver.__tag === "unresolved") {
      return { __tag: "unresolved", name: method };
    }

    return { __tag: "runtimeError", message: `Method '${method}' not found on ${receiver.__tag}` };
  }

  private async evalMatch(node: AstNode): Promise<LogicNValue> {
    const subject = node.children?.[0];
    if (subject === undefined) return LLN_VOID;
    const subjectVal = await this.evalExpr(subject);
    const arms = (node.children ?? []).slice(1);

    for (const arm of arms) {
      if (arm.kind !== "matchArm") continue;
      const match = matchPattern(subjectVal, arm.value ?? "");
      if (!match.matches) continue;

      this.pushScope();
      try {
        const children = arm.children ?? [];
        for (const child of children) {
          if (child.kind === "identifier" && match.bound !== undefined) {
            this.declare(child.value ?? "_", match.bound);
          }
        }
        const body = [...children].reverse().find((child) => child.kind !== "identifier");
        return body === undefined ? LLN_VOID : await this.evalExpr(body);
      } finally {
        this.popScope();
      }
    }

    return LLN_VOID;
  }

  private async evalMember(node: AstNode): Promise<LogicNValue> {
    const receiver = node.children?.[0];
    const memberName = node.value ?? "";
    if (receiver === undefined) return LLN_VOID;
    return this.evalMethodCall(await this.evalExpr(receiver), memberName, []);
  }

  private getReceiverName(node: AstNode): string {
    if (node.kind === "identifier") return node.value ?? "";
    if (node.kind === "memberExpr") {
      const parent = node.children?.[0];
      const parentName = parent !== undefined ? this.getReceiverName(parent) : "";
      return parentName !== "" ? `${parentName}.${node.value ?? ""}` : node.value ?? "";
    }
    if (node.kind === "callExpr") return node.value ?? "";
    return "";
  }

  private seedPrelude(): void {
    const prelude: Record<string, LogicNValue> = {
      None: LLN_NONE,
      true: { __tag: "bool", value: true },
      false: { __tag: "bool", value: false },
    };
    for (const [name, value] of Object.entries(prelude)) {
      this.declare(name, value);
    }
  }

  private async runLocalFn(name: string, argNodes: readonly AstNode[]): Promise<LogicNValue> {
    const fn = this.fnIndex.get(name);
    if (fn === undefined) return { __tag: "runtimeError", message: `Unresolved fn: '${name}'` };

    this.pushScope();
    try {
      const params = (fn.children ?? []).filter((child) => child.kind === "paramDecl");
      for (let index = 0; index < params.length; index += 1) {
        const param = params[index];
        if (param === undefined) continue;
        const paramName = extractParamName(param.value ?? "");
        if (paramName !== "") {
          const argNode = argNodes[index];
          this.declare(paramName, argNode === undefined ? LLN_VOID : await this.evalExpr(argNode));
        }
      }

      const body = [...(fn.children ?? [])].reverse().find((child) => child.kind === "block");
      return body === undefined ? LLN_VOID : await this.executeBlock(body) ?? LLN_VOID;
    } finally {
      this.popScope();
    }
  }

  private async runNestedFlow(name: string, argNodes: readonly AstNode[]): Promise<LogicNValue> {
    const flowNode = this.flowIndex.get(name);
    if (flowNode === undefined) return { __tag: "runtimeError", message: `Flow '${name}' not found` };

    const callArgs = new Map<string, LogicNValue>();
    const params = (flowNode.children ?? []).filter((child) => child.kind === "paramDecl");
    for (let index = 0; index < argNodes.length; index += 1) {
      const arg = argNodes[index];
      if (arg === undefined) continue;
      const paramName = extractParamName(params[index]?.value ?? `arg${index}`);
      callArgs.set(paramName, await this.evalExpr(arg));
    }

    const nested = new Interpreter(this.ast, this.knownFlows);
    const result = await nested.runFlow(name, callArgs);
    for (const effect of result.effectsObserved) this.effectsObserved.add(effect);
    this.auditEntries.push(...result.auditEntries);
    this.diagnostics.push(...result.diagnostics);
    return result.value;
  }

  private async buildAuditEntry(argNodes: readonly AstNode[]): Promise<RuntimeAuditEntry> {
    const fields: Record<string, string> = {};
    let event = "UnnamedEvent";

    for (const arg of argNodes) {
      if (arg.kind === "identifier" && arg.children?.[0] !== undefined) {
        const value = safeStringify(await this.evalExpr(arg.children[0]));
        const key = arg.value ?? `arg${Object.keys(fields).length}`;
        fields[key] = value;
        if (key === "event") event = value;
      } else if (arg.kind === "callExpr" && arg.value === "#record") {
        // Record literal { field: value, ... } — from parseRecordLiteral()
        for (const field of arg.children ?? []) {
          if (field.kind === "identifier" && field.children?.[0] !== undefined) {
            const value = safeStringify(await this.evalExpr(field.children[0]));
            const key = field.value ?? `arg${Object.keys(fields).length}`;
            fields[key] = value;
            if (key === "event") event = value;
          }
        }
      } else if (arg.kind === "block") {
        const blockStrings = findStringLiterals(arg).map((literal) => stripStringQuotes(literal.value ?? ""));
        if (blockStrings[0] !== undefined) {
          fields.event = blockStrings[0];
          event = blockStrings[0];
        }
      } else {
        fields[`arg${Object.keys(fields).length}`] = safeStringify(await this.evalExpr(arg));
      }
    }

    return { event, fields, timestamp: new Date().toISOString() };
  }
}

function buildFlowIndex(ast: AstNode): ReadonlyMap<string, AstNode> {
  const index = new Map<string, AstNode>();

  function walk(node: AstNode): void {
    if (FLOW_KINDS.has(node.kind) && node.value !== undefined) {
      index.set(node.value, node);
    }
    for (const child of node.children ?? []) walk(child);
  }

  walk(ast);
  return index;
}

function matchPattern(
  subject: LogicNValue,
  pattern: string,
): { readonly matches: boolean; readonly bound?: LogicNValue } {
  if (pattern === "_") return { matches: true };
  if (pattern === "None") return { matches: subject.__tag === "none" };
  if (pattern === "Some" && subject.__tag === "some") return { matches: true, bound: subject.value };
  if (pattern === "Ok" && subject.__tag === "ok") return { matches: true, bound: subject.value };
  if (pattern === "Err" && subject.__tag === "err") return { matches: true, bound: subject.error };
  if (pattern === "true" && subject.__tag === "bool") return { matches: subject.value };
  if (pattern === "false" && subject.__tag === "bool") return { matches: !subject.value };
  if (subject.__tag === "string") return { matches: subject.value === pattern };
  if (subject.__tag === "unresolved") return { matches: subject.name === pattern };
  if (subject.__tag === "record" && subject.fields.has(pattern)) return { matches: true };
  return { matches: subject.__tag === pattern };
}

function safeDisplay(value: LogicNValue): string {
  switch (value.__tag) {
    case "string": return value.value;
    case "char": return value.value;
    case "int":
    case "float":
    case "byte": return String(value.value);
    case "bytes": return `[${value.value.byteLength} bytes]`;
    case "decimal": return value.value;
    case "bool": return value.value ? "true" : "false";
    case "secure": return "[SECURE]";
    case "protected": return "[PROTECTED]";
    case "redacted": return "[REDACTED]";
    case "none": return "None";
    case "void": return "()";
    case "some": return `Some(${safeDisplay(value.value)})`;
    case "ok": return `Ok(${safeDisplay(value.value)})`;
    case "err": return `Err(${safeDisplay(value.error)})`;
    case "record": return `{${[...value.fields].map(([key, item]) => `${key}: ${safeDisplay(item)}`).join(", ")}}`;
    case "list": return `[${value.items.map((item) => safeDisplay(item)).join(", ")}]`;
    case "unresolved": return value.name;
    case "runtimeError": return value.message;
    case "function": return value.name;
    case "error": return value.message;
  }
}

function safeStringify(value: LogicNValue): string {
  return safeDisplay(value);
}

function jsObjectToLogicN(obj: unknown): LogicNValue {
  if (obj === null || obj === undefined) return LLN_NONE;
  if (typeof obj === "string") return { __tag: "string", value: obj };
  if (typeof obj === "number") return Number.isInteger(obj) ? { __tag: "int", value: obj } : { __tag: "float", value: obj };
  if (typeof obj === "boolean") return { __tag: "bool", value: obj };
  if (Array.isArray(obj)) return { __tag: "list", items: obj.map((item) => jsObjectToLogicN(item)) };
  if (typeof obj === "object") {
    const fields = new Map<string, LogicNValue>();
    for (const [key, value] of Object.entries(obj)) {
      fields.set(key, jsObjectToLogicN(value));
    }
    return { __tag: "record", fields };
  }
  return { __tag: "string", value: String(obj) };
}

function extractParamName(value: string): string {
  let rest = value.trim();
  if (rest.startsWith("readonly ")) rest = rest.slice("readonly ".length).trim();
  const colonIdx = rest.indexOf(":");
  return (colonIdx === -1 ? rest : rest.slice(0, colonIdx)).trim();
}

interface ParsedBinding {
  readonly name: string;
  readonly safetyPrefix?: "unsafe" | "safe";
  readonly typeName: string;
  readonly rawType: string;
}

function parseBindingValue(value: string): ParsedBinding {
  let rest = value.trim();
  let safetyPrefix: "unsafe" | "safe" | undefined;
  if (rest.startsWith("unsafe ")) {
    safetyPrefix = "unsafe";
    rest = rest.slice("unsafe ".length).trim();
  } else if (rest.startsWith("safe ")) {
    safetyPrefix = "safe";
    rest = rest.slice("safe ".length).trim();
  }

  const colonIdx = rest.indexOf(":");
  const name = colonIdx === -1 ? rest.trim() : rest.slice(0, colonIdx).trim();
  const rawType = colonIdx === -1 ? "" : rest.slice(colonIdx + 1).trim();
  const typeName = bindingBaseType(rawType);
  return {
    name,
    typeName,
    rawType,
    ...(safetyPrefix === undefined ? {} : { safetyPrefix }),
  };
}

function bindingTypeName(value: string): string {
  const colonIdx = value.indexOf(":");
  return colonIdx === -1 ? "" : bindingBaseType(value.slice(colonIdx + 1).trim());
}

function bindingBaseType(typeSection: string): string {
  const stripped = typeSection.replace(/^(protected|redacted)\s+/, "");
  return stripped.split(/[<\s]/)[0] ?? stripped;
}

function wrapGovernedValue(value: LogicNValue, rawType: string): LogicNValue {
  if (rawType.startsWith("protected ")) {
    return { __tag: "protected", baseType: rawType.slice("protected ".length).trim(), value };
  }
  if (rawType.startsWith("redacted ")) {
    return { __tag: "redacted", baseType: rawType.slice("redacted ".length).trim() };
  }
  if (rawType === "SecureString") {
    return { __tag: "secure", value: safeDisplay(value) };
  }
  return value;
}

function getReceiver(node: AstNode): AstNode | undefined {
  const first = node.children?.[0];
  if (first === undefined) return undefined;
  if (first.kind === "memberExpr") return first;
  if (first.kind !== "identifier") return undefined;
  const value = first.value ?? "";
  if (STD_RECEIVERS.has(value) || /^[A-Z]/.test(value)) return first;
  return undefined;
}

function secureComparable(value: LogicNValue): string {
  if (value.__tag === "secure") return value.value;
  if (value.__tag === "string") return value.value;
  return "";
}

function qualifierFromFlowKind(kind: AstNode["kind"]): "flow" | "pure" | "guarded" | "secure" {
  if (kind === "pureFlowDecl") return "pure";
  if (kind === "guardedFlowDecl") return "guarded";
  if (kind === "secureFlowDecl") return "secure";
  return "flow";
}

function isRuntimeError(value: LogicNValue): value is { readonly __tag: "runtimeError" | "error"; readonly message: string } {
  return value.__tag === "runtimeError" || value.__tag === "error";
}

function stripStringQuotes(value: string): string {
  if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
    return value.slice(1, -1);
  }
  return value;
}

/** Resolve backslash escape sequences in a char literal value (e.g. "\\n" → "\n"). */
function resolveCharEscape(value: string): string {
  if (value.length === 2 && value[0] === "\\") {
    switch (value[1]) {
      case "n": return "\n";
      case "t": return "\t";
      case "r": return "\r";
      case "0": return "\0";
      case "'": return "'";
      case "\\": return "\\";
    }
  }
  return value;
}

function titleCase(value: string): string {
  if (value === "") return "Value";
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

function voidIdentifier(): AstNode {
  return { kind: "identifier", value: "void" };
}

function findStringLiterals(node: AstNode): AstNode[] {
  const found: AstNode[] = [];

  function walk(current: AstNode): void {
    if (current.kind === "stringLiteral") found.push(current);
    for (const child of current.children ?? []) walk(child);
  }

  walk(node);
  return found;
}

function makeResponseValue(status: number, body: LogicNValue): LogicNValue {
  const fields = new Map<string, LogicNValue>([
    ["__httpStatus", { __tag: "int", value: status }],
    ["__body", body],
    ["__isResponse", { __tag: "bool", value: true }],
  ]);
  return { __tag: "record", fields };
}

function makeApiErrorValue(status: number, message: string): LogicNValue {
  const fields = new Map<string, LogicNValue>([
    ["__httpStatus", { __tag: "int", value: status }],
    ["__message", { __tag: "string", value: message }],
    ["__isApiError", { __tag: "bool", value: true }],
  ]);
  return { __tag: "record", fields };
}

/**
 * Maps a fully-qualified call name to a capability effect string, or
 * returns undefined when the call is not a governed side-effectful operation.
 */
function resolveCapabilityEffect(fullName: string): string | undefined {
  if (fullName.startsWith("http.") || fullName.startsWith("https.")) {
    return "network.outbound";
  }
  if (fullName.startsWith("fs.") || fullName.startsWith("File.")) {
    const isRead = fullName.includes("read") || fullName.includes("Read");
    const isWrite = fullName.includes("write") || fullName.includes("Write");
    if (isRead) return "filesystem.read";
    if (isWrite) return "filesystem.write";
  }
  // Database calls: any receiver ending in DB or Database (e.g. UserDB.find)
  if (/DB\.|Database\./.test(fullName)) {
    const isWrite = /\.(insert|update|delete|write|save|create|upsert)/i.test(fullName);
    return isWrite ? "database.write" : "database.read";
  }
  // AI model calls (e.g. AI.complete, Model.infer, Claude.generate)
  if (/^(AI|Model|Claude|GPT|LLM)\./i.test(fullName)) {
    return "ai.inference";
  }
  return undefined;
}

export async function executeFlow(
  flowName: string,
  args: ReadonlyMap<string, LogicNValue>,
  ast: AstNode,
  knownFlows?: readonly FlowMeta[],
  enforcer?: ContractEnforcer,
  capabilityHost?: CapabilityHost,
): Promise<FlowExecutionResult> {
  const interpreter = new Interpreter(ast, knownFlows ?? [], enforcer, capabilityHost);
  return interpreter.runFlow(flowName, args);
}
