// =============================================================================
// LogicN Standard Library — Stage 1
//
// DECIMAL PRECISION NOTE (Stage 1):
//   Decimal arithmetic uses JavaScript parseFloat() internally.
//   This is NOT suitable for financial/money calculations requiring exact
//   decimal arithmetic. Money<C> * Decimal is marked experimental at this stage.
//
//   Stage 2 will replace with arbitrary-precision decimal arithmetic before
//   Money<C> arithmetic is considered production-valid.
//
//   Decision: docs/Knowledge-Bases/logicn-architecture-layers.md
// =============================================================================

import { LLN_NONE, LLN_VOID, type LogicNValue } from "./interpreter.js";

declare function require(name: string): any;
declare const process: { env?: Record<string, string | undefined> };

export interface StdlibContext {
  readonly recordEffect: (effect: string) => void;
  readonly resolveIdentifier: (name: string) => LogicNValue | undefined;
  readonly callFlow: (name: string, args: ReadonlyMap<string, LogicNValue>) => LogicNValue;
  readonly applyFn: (fn: LogicNValue, arg: LogicNValue) => LogicNValue;
}

function safeDisplay(v: LogicNValue): string {
  switch (v.__tag) {
    case "string":
    case "char":
    case "decimal":
      return v.value;
    case "int":
    case "float":
    case "byte":
      return String(v.value);
    case "bool":
      return v.value ? "true" : "false";
    case "bytes":
      return `[${v.value.byteLength} bytes]`;
    case "none":
      return "None";
    case "void":
      return "()";
    case "secure":
      return "[SECURE]";
    case "protected":
      return "[PROTECTED]";
    case "redacted":
      return "[REDACTED]";
    case "some":
      return `Some(${safeDisplay(v.value)})`;
    case "ok":
      return `Ok(${safeDisplay(v.value)})`;
    case "err":
      return `Err(${safeDisplay(v.error)})`;
    case "record":
      return "{...}";
    case "list":
      return `[${v.items.map((item) => safeDisplay(item)).join(", ")}]`;
    case "unresolved":
      return v.name;
    case "runtimeError":
    case "error":
      return v.message;
    case "function":
      return v.name;
  }
}

function strVal(v: LogicNValue): string {
  return v.__tag === "string" ? v.value : safeDisplay(v);
}

function numVal(v: LogicNValue): number {
  return v.__tag === "int" || v.__tag === "float" ? v.value : 0;
}

function asList(v: LogicNValue): readonly LogicNValue[] {
  return v.__tag === "list" ? v.items : [];
}

function ok(value: LogicNValue): LogicNValue {
  return { __tag: "ok", value };
}

function err(message: string): LogicNValue {
  return { __tag: "err", error: { __tag: "string", value: message } };
}

function mkSome(v: LogicNValue): LogicNValue {
  return { __tag: "some", value: v };
}

function optionMethod(
  receiver: LogicNValue,
  method: string,
  args: readonly LogicNValue[],
  ctx: StdlibContext,
): LogicNValue | undefined {
  if (receiver.__tag !== "some" && receiver.__tag !== "none") return undefined;
  switch (method) {
    case "unwrapOr":
      return receiver.__tag === "some" ? receiver.value : (args[0] ?? LLN_VOID);
    case "isSome":
      return { __tag: "bool", value: receiver.__tag === "some" };
    case "isNone":
      return { __tag: "bool", value: receiver.__tag === "none" };
    case "map":
      if (receiver.__tag === "none") return LLN_NONE;
      return args[0] !== undefined ? mkSome(ctx.applyFn(args[0], receiver.value)) : LLN_NONE;
    case "flatMap":
      if (receiver.__tag === "none") return LLN_NONE;
      return args[0] !== undefined ? ctx.applyFn(args[0], receiver.value) : LLN_NONE;
    case "value":
    case "get":
      return receiver.__tag === "some" ? receiver.value : LLN_NONE;
    default:
      return undefined;
  }
}

function resultMethod(
  receiver: LogicNValue,
  method: string,
  args: readonly LogicNValue[],
  ctx: StdlibContext,
): LogicNValue | undefined {
  if (receiver.__tag !== "ok" && receiver.__tag !== "err") return undefined;
  switch (method) {
    case "unwrapOr":
      return receiver.__tag === "ok" ? receiver.value : (args[0] ?? LLN_VOID);
    case "isOk":
      return { __tag: "bool", value: receiver.__tag === "ok" };
    case "isErr":
      return { __tag: "bool", value: receiver.__tag === "err" };
    case "map":
      if (receiver.__tag === "err") return receiver;
      return args[0] !== undefined ? ok(ctx.applyFn(args[0], receiver.value)) : receiver;
    case "mapErr":
      if (receiver.__tag === "ok") return receiver;
      return args[0] !== undefined ? { __tag: "err", error: ctx.applyFn(args[0], receiver.error) } : receiver;
    case "value":
    case "get":
      return receiver.__tag === "ok" ? mkSome(receiver.value) : LLN_NONE;
    default:
      return undefined;
  }
}

function stringMethod(receiver: LogicNValue, method: string, args: readonly LogicNValue[]): LogicNValue | undefined {
  if (receiver.__tag !== "string") return undefined;
  const s = receiver.value;
  switch (method) {
    case "length":
    case "charCount":
      return { __tag: "int", value: [...s].length };
    case "toLower":
      return { __tag: "string", value: s.toLowerCase() };
    case "toUpper":
      return { __tag: "string", value: s.toUpperCase() };
    case "trim":
      return { __tag: "string", value: s.trim() };
    case "trimStart":
      return { __tag: "string", value: s.trimStart() };
    case "trimEnd":
      return { __tag: "string", value: s.trimEnd() };
    case "toString":
      return receiver;
    case "isEmpty":
      return { __tag: "bool", value: s.length === 0 };
    case "startsWith":
      return { __tag: "bool", value: s.startsWith(strVal(args[0] ?? LLN_VOID)) };
    case "endsWith":
      return { __tag: "bool", value: s.endsWith(strVal(args[0] ?? LLN_VOID)) };
    case "contains":
    case "includes":
      return { __tag: "bool", value: s.includes(strVal(args[0] ?? LLN_VOID)) };
    case "split":
      return {
        __tag: "list",
        items: s.split(strVal(args[0] ?? { __tag: "string", value: "" })).map((p): LogicNValue => ({ __tag: "string", value: p })),
      };
    case "replace":
      return { __tag: "string", value: s.replace(strVal(args[0] ?? LLN_VOID), strVal(args[1] ?? { __tag: "string", value: "" })) };
    case "replaceAll":
      return { __tag: "string", value: s.replaceAll(strVal(args[0] ?? LLN_VOID), strVal(args[1] ?? { __tag: "string", value: "" })) };
    case "slice": {
      const start = numVal(args[0] ?? { __tag: "int", value: 0 });
      const end = args[1] !== undefined ? numVal(args[1]) : undefined;
      return { __tag: "string", value: end === undefined ? s.slice(start) : s.slice(start, end) };
    }
    case "encode":
      return { __tag: "bytes", value: new TextEncoder().encode(s) };
    case "encodedLength":
      return { __tag: "int", value: new TextEncoder().encode(s).length };
    case "codePoints":
      return { __tag: "list", items: [...s].map((c): LogicNValue => ({ __tag: "int", value: c.codePointAt(0) ?? 0 })) };
    default:
      return undefined;
  }
}

function stringStaticMethod(method: string, args: readonly LogicNValue[]): LogicNValue | undefined {
  if (method !== "decode") return undefined;
  const input = args[0];
  if (input === undefined) return err("DecodeError: no input provided");
  if (input.__tag === "string") return ok(input);
  if (input.__tag === "bytes") {
    try {
      return ok({ __tag: "string", value: new TextDecoder("utf-8", { fatal: true }).decode(input.value) });
    } catch {
      return err("DecodeError: invalid UTF-8 sequence");
    }
  }
  return err("DecodeError: expected Bytes");
}

function listMethod(
  receiver: LogicNValue,
  method: string,
  args: readonly LogicNValue[],
  ctx: StdlibContext,
): LogicNValue | undefined {
  if (receiver.__tag !== "list") return undefined;
  const items = receiver.items;
  switch (method) {
    case "length":
    case "count":
      return { __tag: "int", value: items.length };
    case "isEmpty":
      return { __tag: "bool", value: items.length === 0 };
    case "first":
      return items.length > 0 ? mkSome(items[0] ?? LLN_VOID) : LLN_NONE;
    case "last":
      return items.length > 0 ? mkSome(items[items.length - 1] ?? LLN_VOID) : LLN_NONE;
    case "get": {
      const idx = numVal(args[0] ?? { __tag: "int", value: -1 });
      const item = items[idx];
      return item === undefined ? LLN_NONE : mkSome(item);
    }
    case "push":
      return { __tag: "list", items: [...items, args[0] ?? LLN_VOID] };
    case "append":
      return { __tag: "list", items: [...items, ...asList(args[0] ?? LLN_VOID)] };
    case "filter": {
      const fn = args[0];
      if (fn === undefined) return receiver;
      return {
        __tag: "list",
        items: items.filter((item) => {
          const result = ctx.applyFn(fn, item);
          return result.__tag === "bool" && result.value;
        }),
      };
    }
    case "map": {
      const fn = args[0];
      if (fn === undefined) return receiver;
      return { __tag: "list", items: items.map((item) => ctx.applyFn(fn, item)) };
    }
    case "reduce": {
      const init = args[0] ?? LLN_VOID;
      const fn = args[1];
      if (fn === undefined) return init;
      let acc = init;
      for (const item of items) {
        acc = ctx.applyFn(fn, {
          __tag: "record",
          fields: new Map<string, LogicNValue>([["acc", acc], ["item", item]]),
        });
      }
      return acc;
    }
    case "sum": {
      if (items.length === 0) return { __tag: "int", value: 0 };
      const isFloat = items.some((i) => i.__tag === "float");
      const total = items.reduce((acc, item) => acc + numVal(item), 0);
      return isFloat ? { __tag: "float", value: total } : { __tag: "int", value: total };
    }
    case "contains":
      return { __tag: "bool", value: items.some((item) => logicNValuesEqual(item, args[0] ?? LLN_VOID)) };
    case "reverse":
      return { __tag: "list", items: [...items].reverse() };
    case "slice": {
      const start = numVal(args[0] ?? { __tag: "int", value: 0 });
      const end = args[1] !== undefined ? numVal(args[1]) : undefined;
      return { __tag: "list", items: end === undefined ? items.slice(start) : items.slice(start, end) };
    }
    case "join":
      return { __tag: "string", value: items.map((i) => strVal(i)).join(strVal(args[0] ?? { __tag: "string", value: "" })) };
    case "find": {
      const fn = args[0];
      if (fn === undefined) return LLN_NONE;
      for (const item of items) {
        const result = ctx.applyFn(fn, item);
        if (result.__tag === "bool" && result.value) return mkSome(item);
      }
      return LLN_NONE;
    }
    case "toList":
    case "toArray":
      return receiver;
    default:
      return undefined;
  }
}

function mapMethod(receiver: LogicNValue, method: string, args: readonly LogicNValue[]): LogicNValue | undefined {
  if (receiver.__tag !== "record") return undefined;
  const fields = receiver.fields;
  switch (method) {
    case "get": {
      const key = strVal(args[0] ?? LLN_VOID);
      const value = fields.get(key);
      return value === undefined ? LLN_NONE : mkSome(value);
    }
    case "set": {
      const updated = new Map(fields);
      updated.set(strVal(args[0] ?? LLN_VOID), args[1] ?? LLN_VOID);
      return { __tag: "record", fields: updated };
    }
    case "has":
      return { __tag: "bool", value: fields.has(strVal(args[0] ?? LLN_VOID)) };
    case "size":
    case "length":
      return { __tag: "int", value: fields.size };
    case "isEmpty":
      return { __tag: "bool", value: fields.size === 0 };
    case "keys":
      return { __tag: "list", items: [...fields.keys()].map((k): LogicNValue => ({ __tag: "string", value: k })) };
    case "values":
      return { __tag: "list", items: [...fields.values()] };
    case "delete":
    case "remove": {
      const updated = new Map(fields);
      updated.delete(strVal(args[0] ?? LLN_VOID));
      return { __tag: "record", fields: updated };
    }
    default:
      return undefined;
  }
}

export function makeMoney(amount: string, currency: string): LogicNValue {
  return {
    __tag: "record",
    fields: new Map<string, LogicNValue>([
      ["__amount", { __tag: "decimal", value: amount }],
      ["__currency", { __tag: "string", value: currency }],
      ["__isMoney", { __tag: "bool", value: true }],
    ]),
  };
}

export function isMoney(v: LogicNValue): boolean {
  if (v.__tag !== "record") return false;
  const flag = v.fields.get("__isMoney");
  return flag?.__tag === "bool" && flag.value;
}

function moneyAmount(v: LogicNValue): number {
  const amount = v.__tag === "record" ? v.fields.get("__amount") : undefined;
  return amount?.__tag === "decimal" ? parseFloat(amount.value) : 0;
}

function moneyCurrency(v: LogicNValue): string {
  const currency = v.__tag === "record" ? v.fields.get("__currency") : undefined;
  return currency?.__tag === "string" ? currency.value : "";
}

function moneyStatic(method: string, args: readonly LogicNValue[]): LogicNValue | undefined {
  switch (method) {
    case "gbp":
      return makeMoney(strVal(args[0] ?? { __tag: "string", value: "0.00" }), "GBP");
    case "usd":
      return makeMoney(strVal(args[0] ?? { __tag: "string", value: "0.00" }), "USD");
    case "eur":
      return makeMoney(strVal(args[0] ?? { __tag: "string", value: "0.00" }), "EUR");
    case "jpy":
      return makeMoney(strVal(args[0] ?? { __tag: "string", value: "0.00" }), "JPY");
    case "of":
      return makeMoney(args[0]?.__tag === "decimal" ? args[0].value : strVal(args[0] ?? { __tag: "string", value: "0.00" }), strVal(args[1] ?? { __tag: "string", value: "GBP" }));
    default:
      return undefined;
  }
}

function moneyMethod(receiver: LogicNValue, method: string, args: readonly LogicNValue[]): LogicNValue | undefined {
  if (!isMoney(receiver)) return undefined;
  const amount = moneyAmount(receiver);
  const currency = moneyCurrency(receiver);
  switch (method) {
    case "amount":
      return { __tag: "decimal", value: amount.toFixed(2) };
    case "currency":
      return { __tag: "string", value: currency };
    case "toString":
      return { __tag: "string", value: `${currency} ${amount.toFixed(2)}` };
    case "add": {
      const other = args[0];
      if (other === undefined || !isMoney(other)) return { __tag: "runtimeError", message: "Money.add requires Money argument" };
      if (moneyCurrency(other) !== currency) return err(`Cannot add ${currency} and ${moneyCurrency(other)}`);
      return makeMoney((amount + moneyAmount(other)).toFixed(2), currency);
    }
    case "subtract": {
      const other = args[0];
      if (other === undefined || !isMoney(other)) return { __tag: "runtimeError", message: "Money.subtract requires Money argument" };
      if (moneyCurrency(other) !== currency) return err(`Cannot subtract ${moneyCurrency(other)} from ${currency}`);
      return makeMoney((amount - moneyAmount(other)).toFixed(2), currency);
    }
    case "multiply": {
      const factor = args[0]?.__tag === "decimal" ? parseFloat(args[0].value) : numVal(args[0] ?? LLN_VOID);
      return makeMoney((amount * factor).toFixed(2), currency);
    }
    case "divideBy": {
      const rhs = args[0];
      if (rhs === undefined) return err("Division by zero");
      if (isMoney(rhs)) {
        const divisor = moneyAmount(rhs);
        if (divisor === 0) return err("Division by zero");
        return { __tag: "decimal", value: (amount / divisor).toString() };
      }
      const divisor = rhs.__tag === "decimal" ? parseFloat(rhs.value) : numVal(rhs);
      if (divisor === 0) return err("Division by zero");
      return makeMoney((amount / divisor).toFixed(2), currency);
    }
    default:
      return undefined;
  }
}

export function moneyBinary(left: LogicNValue, op: string, right: LogicNValue): LogicNValue | undefined {
  if (isMoney(left) && isMoney(right)) {
    if (op === "+") return moneyMethod(left, "add", [right]);
    if (op === "-") return moneyMethod(left, "subtract", [right]);
    if (op === "/") return moneyMethod(left, "divideBy", [right]);
  }
  if (isMoney(left) && (right.__tag === "decimal" || right.__tag === "int" || right.__tag === "float")) {
    if (op === "*") return moneyMethod(left, "multiply", [right]);
    if (op === "/") return moneyMethod(left, "divideBy", [right]);
  }
  return undefined;
}

function numericStatic(receiver: string, method: string, args: readonly LogicNValue[]): LogicNValue | undefined {
  switch (`${receiver}.${method}`) {
    case "Int.parse": {
      const n = parseInt(strVal(args[0] ?? LLN_VOID), 10);
      return Number.isNaN(n) ? err("ParseError: not a valid integer") : ok({ __tag: "int", value: n });
    }
    case "Float.parse": {
      const n = parseFloat(strVal(args[0] ?? LLN_VOID));
      return Number.isNaN(n) ? err("ParseError: not a valid float") : ok({ __tag: "float", value: n });
    }
    case "Decimal.parse": {
      const s = strVal(args[0] ?? LLN_VOID);
      const n = parseFloat(s);
      return Number.isNaN(n) ? err("ParseError: not a valid decimal") : ok({ __tag: "decimal", value: s });
    }
    case "Math.abs": {
      const n = numVal(args[0] ?? LLN_VOID);
      const v = args[0] ?? { __tag: "int", value: 0 };
      return v.__tag === "float" ? { __tag: "float", value: Math.abs(n) } : { __tag: "int", value: Math.abs(n) };
    }
    case "Math.min": {
      const a = numVal(args[0] ?? LLN_VOID);
      const b = numVal(args[1] ?? LLN_VOID);
      const isFloat = args[0]?.__tag === "float" || args[1]?.__tag === "float";
      return isFloat ? { __tag: "float", value: Math.min(a, b) } : { __tag: "int", value: Math.min(a, b) };
    }
    case "Math.max": {
      const a = numVal(args[0] ?? LLN_VOID);
      const b = numVal(args[1] ?? LLN_VOID);
      const isFloat = args[0]?.__tag === "float" || args[1]?.__tag === "float";
      return isFloat ? { __tag: "float", value: Math.max(a, b) } : { __tag: "int", value: Math.max(a, b) };
    }
    case "Math.floor":
      return { __tag: "int", value: Math.floor(numVal(args[0] ?? LLN_VOID)) };
    case "Math.ceil":
      return { __tag: "int", value: Math.ceil(numVal(args[0] ?? LLN_VOID)) };
    case "Math.round":
      return { __tag: "int", value: Math.round(numVal(args[0] ?? LLN_VOID)) };
    default:
      return undefined;
  }
}

function decimalConstructor(args: readonly LogicNValue[]): LogicNValue {
  return { __tag: "decimal", value: strVal(args[0] ?? { __tag: "string", value: "0" }) };
}

function validateValue(gateName: string, value: LogicNValue): boolean {
  if (value.__tag !== "string") return value.__tag !== "void";
  const s = value.value.trim();
  if (s === "") return false;
  switch (gateName) {
    case "email":
      return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
    case "url":
      try {
        new URL(s);
        return true;
      } catch {
        return false;
      }
    default:
      return s.length > 0;
  }
}

function sanitizeValue(value: LogicNValue): LogicNValue {
  if (value.__tag !== "string") return value;
  return {
    __tag: "string",
    value: value.value.replace(/<[^>]*>/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ""),
  };
}

function gateFunction(fullName: string, args: readonly LogicNValue[]): LogicNValue | undefined {
  const arg0 = args[0] ?? LLN_VOID;
  if (fullName.startsWith("validate.")) {
    const gateName = fullName.slice("validate.".length);
    const raw = arg0.__tag === "protected" ? arg0.value : arg0;
    if (!validateValue(gateName, raw)) return err(`ValidationError: invalid ${gateName}`);
    return ok({ __tag: "protected", baseType: gateName.charAt(0).toUpperCase() + gateName.slice(1), value: raw });
  }
  if (fullName.startsWith("sanitize.")) {
    const raw = arg0.__tag === "protected" ? arg0.value : arg0;
    return ok({ __tag: "protected", baseType: "String", value: sanitizeValue(raw) });
  }
  if (fullName.startsWith("parse.")) {
    const raw = arg0.__tag === "string" ? arg0.value : strVal(arg0);
    if (raw === "") return err("ParseError: empty input");
    return ok({ __tag: "protected", baseType: "String", value: arg0 });
  }
  if (fullName === "redact") {
    const baseType = arg0.__tag === "protected" ? arg0.baseType : arg0.__tag === "string" ? "String" : "Unknown";
    return { __tag: "redacted", baseType };
  }
  if (fullName === "constantTimeEquals") {
    const a = arg0.__tag === "secure" ? arg0.value : strVal(arg0);
    const bArg = args[1] ?? LLN_VOID;
    const b = bArg.__tag === "secure" ? bArg.value : strVal(bArg);
    return { __tag: "bool", value: a === b };
  }
  return undefined;
}

function jsValueToLogicN(v: unknown): LogicNValue {
  if (v === null || v === undefined) return LLN_NONE;
  if (typeof v === "string") return { __tag: "string", value: v };
  if (typeof v === "number") return Number.isInteger(v) ? { __tag: "int", value: v } : { __tag: "float", value: v };
  if (typeof v === "boolean") return { __tag: "bool", value: v };
  if (Array.isArray(v)) return { __tag: "list", items: v.map((item) => jsValueToLogicN(item)) };
  if (typeof v === "object") {
    const fields = new Map<string, LogicNValue>();
    for (const [key, value] of Object.entries(v)) fields.set(key, jsValueToLogicN(value));
    return { __tag: "record", fields };
  }
  return { __tag: "string", value: String(v) };
}

function logicNToJsValue(v: LogicNValue): unknown {
  switch (v.__tag) {
    case "string":
      return v.value;
    case "int":
    case "float":
      return v.value;
    case "decimal":
      return parseFloat(v.value);
    case "bool":
      return v.value;
    case "void":
    case "none":
      return null;
    case "some":
      return logicNToJsValue(v.value);
    case "ok":
      return logicNToJsValue(v.value);
    case "err":
      return { error: logicNToJsValue(v.error) };
    case "list":
      return v.items.map((item) => logicNToJsValue(item));
    case "secure":
    case "protected":
    case "redacted":
      return null;
    case "record": {
      const out: Record<string, unknown> = {};
      for (const [k, val] of v.fields) {
        if (!k.startsWith("__")) out[k] = logicNToJsValue(val);
      }
      return out;
    }
    default:
      return null;
  }
}

function serialization(fullName: string, args: readonly LogicNValue[]): LogicNValue | undefined {
  if (fullName === "json.decode" || fullName.startsWith("json.decode<")) {
    const input = args[0] ?? LLN_VOID;
    let raw: string;
    if (input.__tag === "string") {
      raw = input.value;
    } else if (input.__tag === "bytes") {
      try {
        raw = new TextDecoder().decode(input.value);
      } catch {
        return err("DecodeError: invalid UTF-8");
      }
    } else {
      return err("DecodeError: expected String or Bytes");
    }
    try {
      return ok(jsValueToLogicN(JSON.parse(raw)));
    } catch {
      return err("DecodeError: invalid JSON");
    }
  }

  if (fullName === "json.encode") {
    try {
      return { __tag: "string", value: JSON.stringify(logicNToJsValue(args[0] ?? LLN_VOID)) };
    } catch {
      return err("EncodeError: value cannot be serialized");
    }
  }

  if (fullName === "toml.decode" || fullName.startsWith("toml.decode<")) {
    const raw = strVal(args[0] ?? LLN_VOID);
    try {
      const fields = new Map<string, LogicNValue>();
      for (const line of raw.split("\n")) {
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        const value = line.slice(eq + 1).trim().replace(/^"|"$/g, "");
        if (key !== "") fields.set(key, { __tag: "string", value });
      }
      return ok({ __tag: "record", fields });
    } catch {
      return err("DecodeError: invalid TOML");
    }
  }
  return undefined;
}

function networkSync(fullName: string, _args: readonly LogicNValue[], ctx: StdlibContext): LogicNValue | undefined {
  if (!fullName.startsWith("http.")) return undefined;
  const method = fullName.slice("http.".length);
  if (!["get", "post", "put", "patch", "delete"].includes(method)) return undefined;
  ctx.recordEffect("network.outbound");
  return err("NetworkError: async network calls require Phase 9 runtime");
}

function filesystemSync(fullName: string, args: readonly LogicNValue[], ctx: StdlibContext): LogicNValue | undefined {
  if (!fullName.startsWith("fs.") && !fullName.startsWith("File.")) return undefined;
  const isRead = fullName.includes("read") || fullName.includes("Read");
  const isWrite = fullName.includes("write") || fullName.includes("Write");
  if (isRead) ctx.recordEffect("filesystem.read");
  if (isWrite) ctx.recordEffect("filesystem.write");

  const path = strVal(args[0] ?? LLN_VOID);
  if (path === "") return err("FileError: empty path");

  try {
    const fs = require("node:fs");
    if (fullName === "fs.readText" || fullName === "File.readText") {
      return ok({ __tag: "string", value: String(fs.readFileSync(path, "utf8")) });
    }
    if (fullName === "fs.readBytes" || fullName === "File.readBytes") {
      const buffer = fs.readFileSync(path);
      return ok({ __tag: "bytes", value: new Uint8Array(buffer) });
    }
    if (fullName === "fs.writeText" || fullName === "File.writeText") {
      fs.writeFileSync(path, strVal(args[1] ?? LLN_VOID), "utf8");
      return ok(LLN_VOID);
    }
    if (fullName === "fs.writeBytes" || fullName === "File.writeBytes") {
      const bytes = args[1]?.__tag === "bytes" ? args[1].value : new Uint8Array();
      fs.writeFileSync(path, bytes);
      return ok(LLN_VOID);
    }
  } catch (error) {
    return err(`FileError: ${error instanceof Error ? error.message : String(error)}`);
  }
  return undefined;
}

function environmentFn(fullName: string, args: readonly LogicNValue[], ctx: StdlibContext): LogicNValue | undefined {
  if (!fullName.startsWith("Env.") && !fullName.startsWith("env.")) return undefined;
  ctx.recordEffect("secret.read");
  const env = process?.env ?? {};
  const key = strVal(args[0] ?? LLN_VOID);
  if (fullName === "Env.get" || fullName === "env.get") {
    const value = env[key];
    return value !== undefined ? ok({ __tag: "string", value }) : err(`EnvError: '${key}' not set`);
  }
  if (fullName === "env.secret") {
    return { __tag: "secure", value: env[key] ?? "" };
  }
  if (fullName === "env.optional" || fullName === "Env.optional") {
    const value = env[key];
    return value !== undefined ? mkSome({ __tag: "string", value }) : LLN_NONE;
  }
  return undefined;
}

function formatString(args: readonly LogicNValue[]): LogicNValue {
  const template = args[0];
  if (template?.__tag !== "string") return { __tag: "string", value: "" };
  let output = template.value;
  for (let i = 1; i < args.length; i += 1) {
    output = output.replace("{}", safeDisplay(args[i] ?? LLN_VOID));
  }
  return { __tag: "string", value: output };
}

export function logicNValuesEqual(a: LogicNValue, b: LogicNValue): boolean {
  if (a.__tag !== b.__tag) return false;
  if (a.__tag === "string" && b.__tag === "string") return a.value === b.value;
  if (a.__tag === "int" && b.__tag === "int") return a.value === b.value;
  if (a.__tag === "float" && b.__tag === "float") return a.value === b.value;
  if (a.__tag === "decimal" && b.__tag === "decimal") return parseFloat(a.value) === parseFloat(b.value);
  if (a.__tag === "bool" && b.__tag === "bool") return a.value === b.value;
  if (a.__tag === "char" && b.__tag === "char") return a.value === b.value;
  if (a.__tag === "none" && b.__tag === "none") return true;
  if (a.__tag === "void" && b.__tag === "void") return true;
  return false;
}

export function callStdlib(
  fullName: string,
  receiver: LogicNValue | undefined,
  args: readonly LogicNValue[],
  ctx: StdlibContext,
): LogicNValue | undefined {
  if (receiver === undefined) {
    if (fullName === "format") return formatString(args);
    if (fullName === "Decimal") return decimalConstructor(args);

    // Timestamp.now() and Timestamp.fromMs(n)
    if (fullName === "Timestamp.now") return makeTimestamp(Date.now());
    if (fullName === "Timestamp.fromMs") return makeTimestamp(numVal(args[0] ?? { __tag: "int", value: 0 }));
    if (fullName === "Timestamp.fromIso") {
      const s = strVal(args[0] ?? LLN_VOID);
      const ms = Date.parse(s);
      return isNaN(ms) ? err("ParseError: invalid ISO timestamp") : ok(makeTimestamp(ms));
    }

    // Set.empty() / Set.from([...])
    if (fullName === "Set.empty") return makeSet([]);
    if (fullName === "Set.from") return makeSet([...(args[0]?.__tag === "list" ? args[0].items : [])]);

    // Bytes static constructors
    if (fullName === "Bytes.fromHex") {
      const hex = strVal(args[0] ?? LLN_VOID).replace(/\s/g, "");
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      }
      return { __tag: "bytes", value: bytes };
    }
    if (fullName === "Bytes.empty")  return { __tag: "bytes", value: new Uint8Array(0) };
    if (fullName === "Bytes.of")     return { __tag: "bytes", value: new Uint8Array(args.map(numVal)) };

    const gateResult = gateFunction(fullName, args);
    if (gateResult !== undefined) return gateResult;

    const serialResult = serialization(fullName, args);
    if (serialResult !== undefined) return serialResult;

    const dotIdx = fullName.lastIndexOf(".");
    if (dotIdx !== -1) {
      const receiverName = fullName.slice(0, dotIdx);
      const method = fullName.slice(dotIdx + 1);

      if (receiverName === "Money") return moneyStatic(method, args);
      if (receiverName === "String") return stringStaticMethod(method, args);

      const numeric = numericStatic(receiverName, method, args);
      if (numeric !== undefined) return numeric;

      const net = networkSync(fullName, args, ctx);
      if (net !== undefined) return net;

      const fs = filesystemSync(fullName, args, ctx);
      if (fs !== undefined) return fs;

      const env = environmentFn(fullName, args, ctx);
      if (env !== undefined) return env;
    }

    return undefined;
  }

  const method = fullName.includes(".") ? fullName.slice(fullName.lastIndexOf(".") + 1) : fullName;

  const option = optionMethod(receiver, method, args, ctx);
  if (option !== undefined) return option;

  const result = resultMethod(receiver, method, args, ctx);
  if (result !== undefined) return result;

  const string = stringMethod(receiver, method, args);
  if (string !== undefined) return string;

  const list = listMethod(receiver, method, args, ctx);
  if (list !== undefined) return list;

  const map = mapMethod(receiver, method, args);
  if (map !== undefined) return map;

  const money = moneyMethod(receiver, method, args);
  if (money !== undefined) return money;

  const bytes = bytesMethod(receiver, method, args);
  if (bytes !== undefined) return bytes;

  const char = charMethod(receiver, method, args);
  if (char !== undefined) return char;

  const set = setMethod(receiver, method, args, ctx);
  if (set !== undefined) return set;

  const ts = timestampMethod(receiver, method, args);
  if (ts !== undefined) return ts;

  return undefined;
}

// ---------------------------------------------------------------------------
// Bytes operations
// ---------------------------------------------------------------------------

function bytesMethod(
  receiver: LogicNValue,
  method: string,
  args: readonly LogicNValue[],
): LogicNValue | undefined {
  if (receiver.__tag !== "bytes") return undefined;
  const buf = receiver.value;

  switch (method) {
    case "length":
    case "size":     return { __tag: "int", value: buf.length };
    case "isEmpty":  return { __tag: "bool", value: buf.length === 0 };

    case "get": {
      const idx = numVal(args[0] ?? { __tag: "int", value: -1 });
      return idx >= 0 && idx < buf.length
        ? mkSome({ __tag: "byte", value: buf[idx]! })
        : LLN_NONE;
    }

    case "slice": {
      const start = numVal(args[0] ?? { __tag: "int", value: 0 });
      const end   = args[1] !== undefined ? numVal(args[1]) : buf.length;
      return { __tag: "bytes", value: buf.slice(start, end) };
    }

    case "toHex": {
      const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
      return { __tag: "string", value: hex };
    }

    case "toBase64": {
      // Base64 encoding without Buffer dependency
      const b64 = typeof btoa !== "undefined"
        ? btoa(String.fromCharCode(...buf))
        : Array.from(buf).map((b) => String.fromCharCode(b)).join("");
      return { __tag: "string", value: b64 };
    }

    case "equals": {
      const other = args[0];
      if (other?.__tag !== "bytes") return { __tag: "bool", value: false };
      if (buf.length !== other.value.length) return { __tag: "bool", value: false };
      const equal = buf.every((b, i) => b === other.value[i]);
      return { __tag: "bool", value: equal };
    }

    case "append": {
      const other = args[0];
      if (other?.__tag !== "bytes") return receiver;
      const merged = new Uint8Array(buf.length + other.value.length);
      merged.set(buf, 0);
      merged.set(other.value, buf.length);
      return { __tag: "bytes", value: merged };
    }

    case "decode":
    case "toString": {
      // Attempt UTF-8 decode
      try {
        const decoder = new TextDecoder("utf-8", { fatal: true });
        return ok({ __tag: "string", value: decoder.decode(buf) });
      } catch {
        return err("DecodeError: invalid UTF-8");
      }
    }

    default: return undefined;
  }
}

// ---------------------------------------------------------------------------
// Char operations
// ---------------------------------------------------------------------------

function charMethod(
  receiver: LogicNValue,
  method: string,
  _args: readonly LogicNValue[],
): LogicNValue | undefined {
  if (receiver.__tag !== "char") return undefined;
  const ch = receiver.value;
  const code = ch.codePointAt(0) ?? 0;

  switch (method) {
    case "codePoint":  return { __tag: "int", value: code };
    case "toString":   return { __tag: "string", value: ch };
    case "isDigit":    return { __tag: "bool", value: ch >= "0" && ch <= "9" };
    case "isLetter":   return { __tag: "bool", value: /\p{L}/u.test(ch) };
    case "isUpper":    return { __tag: "bool", value: ch === ch.toUpperCase() && ch !== ch.toLowerCase() };
    case "isLower":    return { __tag: "bool", value: ch === ch.toLowerCase() && ch !== ch.toUpperCase() };
    case "isWhitespace": return { __tag: "bool", value: /\s/.test(ch) };
    case "toUpper":    return { __tag: "char", value: ch.toUpperCase() };
    case "toLower":    return { __tag: "char", value: ch.toLowerCase() };
    default: return undefined;
  }
}

// ---------------------------------------------------------------------------
// Set<T> operations
// ---------------------------------------------------------------------------

function makeSet(items: LogicNValue[]): LogicNValue {
  // Represent Set as a record with __isSet marker and items list
  const fields = new Map<string, LogicNValue>([
    ["__isSet",  { __tag: "bool", value: true }],
    ["__items",  { __tag: "list", items }],
  ]);
  return { __tag: "record", fields };
}

function isSet(v: LogicNValue): boolean {
  return v.__tag === "record" && (v.fields.get("__isSet") as { __tag: "bool"; value: boolean } | undefined)?.value === true;
}

function setItems(v: LogicNValue): readonly LogicNValue[] {
  if (v.__tag === "record") {
    const items = v.fields.get("__items");
    if (items?.__tag === "list") return items.items;
  }
  return [];
}

function setMethod(
  receiver: LogicNValue,
  method: string,
  args: readonly LogicNValue[],
  ctx: StdlibContext,
): LogicNValue | undefined {
  if (!isSet(receiver)) return undefined;
  const items = [...setItems(receiver)];

  switch (method) {
    case "size":
    case "length":  return { __tag: "int", value: items.length };
    case "isEmpty": return { __tag: "bool", value: items.length === 0 };

    case "contains": {
      const target = args[0] ?? LLN_VOID;
      return { __tag: "bool", value: items.some((i) => logicNValuesEqual(i, target)) };
    }

    case "add": {
      const item = args[0] ?? LLN_VOID;
      if (items.some((i) => logicNValuesEqual(i, item))) return receiver;
      return makeSet([...items, item]);
    }

    case "remove": {
      const target = args[0] ?? LLN_VOID;
      return makeSet(items.filter((i) => !logicNValuesEqual(i, target)));
    }

    case "toList":
    case "toArray": return { __tag: "list", items };

    case "union": {
      const other = setItems(args[0] ?? LLN_VOID);
      const merged = [...items];
      for (const item of other) {
        if (!merged.some((i) => logicNValuesEqual(i, item))) merged.push(item);
      }
      return makeSet(merged);
    }

    case "intersection": {
      const other = setItems(args[0] ?? LLN_VOID);
      return makeSet(items.filter((i) => other.some((o) => logicNValuesEqual(i, o))));
    }

    case "difference": {
      const other = setItems(args[0] ?? LLN_VOID);
      return makeSet(items.filter((i) => !other.some((o) => logicNValuesEqual(i, o))));
    }

    case "map": {
      const fn = args[0];
      if (fn === undefined) return receiver;
      const mapped = items.map((item) => ctx.applyFn(fn, item));
      return makeSet(mapped);
    }

    case "filter": {
      const fn = args[0];
      if (fn === undefined) return receiver;
      const filtered = items.filter((item) => {
        const r = ctx.applyFn(fn, item);
        return r.__tag === "bool" && r.value;
      });
      return makeSet(filtered);
    }

    default: return undefined;
  }
}

// ---------------------------------------------------------------------------
// Timestamp and Duration operations
// ---------------------------------------------------------------------------

/** Stage 1: Timestamp is a record wrapping a JS Date millisecond value. */
function makeTimestamp(ms: number): LogicNValue {
  const fields = new Map<string, LogicNValue>([
    ["__isTimestamp", { __tag: "bool", value: true }],
    ["__ms",          { __tag: "int",  value: ms }],
  ]);
  return { __tag: "record", fields };
}

function isTimestamp(v: LogicNValue): boolean {
  return v.__tag === "record" && (v.fields.get("__isTimestamp") as { __tag: "bool"; value: boolean } | undefined)?.value === true;
}

function tsMs(v: LogicNValue): number {
  if (v.__tag === "record") {
    const ms = v.fields.get("__ms");
    if (ms?.__tag === "int") return ms.value;
  }
  return 0;
}

function timestampMethod(
  receiver: LogicNValue,
  method: string,
  args: readonly LogicNValue[],
): LogicNValue | undefined {
  if (!isTimestamp(receiver)) return undefined;
  const ms = tsMs(receiver);

  switch (method) {
    case "toIso":
    case "toString":  return { __tag: "string", value: new Date(ms).toISOString() };
    case "toMs":      return { __tag: "int",    value: ms };
    case "toSeconds": return { __tag: "int",    value: Math.floor(ms / 1000) };

    case "add": {
      // Timestamp + Duration (duration is int ms)
      const dur = numVal(args[0] ?? { __tag: "int", value: 0 });
      return makeTimestamp(ms + dur);
    }

    case "subtract": {
      const other = args[0] ?? LLN_VOID;
      if (isTimestamp(other)) {
        // Timestamp - Timestamp = Duration (ms)
        return { __tag: "int", value: ms - tsMs(other) };
      }
      // Timestamp - Duration
      return makeTimestamp(ms - numVal(other));
    }

    case "before":    return { __tag: "bool", value: ms <  tsMs(args[0] ?? LLN_VOID) };
    case "after":     return { __tag: "bool", value: ms >  tsMs(args[0] ?? LLN_VOID) };
    case "equals":    return { __tag: "bool", value: ms === tsMs(args[0] ?? LLN_VOID) };

    default: return undefined;
  }
}
