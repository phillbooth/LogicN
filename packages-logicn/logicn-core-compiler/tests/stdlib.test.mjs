import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LLN_NONE, LLN_VOID, callStdlib } from "../dist/index.js";

function ctx() {
  return {
    recordEffect: () => {},
    resolveIdentifier: () => undefined,
    callFlow: async () => LLN_VOID,
    applyFn: async (_fn, arg) => arg,
  };
}

describe("Stdlib - Option", () => {
  it("None.isSome() -> false", async () => {
    const r = await callStdlib("isSome", LLN_NONE, [], ctx());
    assert.equal(r?.__tag, "bool");
    assert.equal(r?.value, false);
  });
  it("Some(x).isSome() -> true", async () => {
    const r = await callStdlib("isSome", { __tag: "some", value: { __tag: "string", value: "x" } }, [], ctx());
    assert.equal(r?.__tag, "bool");
    assert.equal(r?.value, true);
  });
  it("None.unwrapOr(default) -> default", async () => {
    const r = await callStdlib("unwrapOr", LLN_NONE, [{ __tag: "string", value: "default" }], ctx());
    assert.equal(r?.__tag, "string");
    assert.equal(r?.value, "default");
  });
  it("Some(value).unwrapOr(default) -> value", async () => {
    const r = await callStdlib("unwrapOr", { __tag: "some", value: { __tag: "string", value: "value" } }, [{ __tag: "string", value: "default" }], ctx());
    assert.equal(r?.__tag, "string");
    assert.equal(r?.value, "value");
  });
  it("Some(x).isNone() -> false", async () => {
    const r = await callStdlib("isNone", { __tag: "some", value: { __tag: "string", value: "x" } }, [], ctx());
    assert.equal(r?.__tag, "bool");
    assert.equal(r?.value, false);
  });
});

describe("Stdlib - Result", () => {
  it("Ok(v).isOk() -> true", async () => {
    const r = await callStdlib("isOk", { __tag: "ok", value: { __tag: "string", value: "v" } }, [], ctx());
    assert.equal(r?.__tag, "bool");
    assert.equal(r?.value, true);
  });
  it("Err(e).isErr() -> true", async () => {
    const r = await callStdlib("isErr", { __tag: "err", error: { __tag: "string", value: "e" } }, [], ctx());
    assert.equal(r?.__tag, "bool");
    assert.equal(r?.value, true);
  });
  it("Err(e).unwrapOr(default) -> default", async () => {
    const r = await callStdlib("unwrapOr", { __tag: "err", error: { __tag: "string", value: "e" } }, [{ __tag: "string", value: "default" }], ctx());
    assert.equal(r?.__tag, "string");
    assert.equal(r?.value, "default");
  });
  it("Ok(v).unwrapOr(default) -> v", async () => {
    const r = await callStdlib("unwrapOr", { __tag: "ok", value: { __tag: "string", value: "v" } }, [{ __tag: "string", value: "default" }], ctx());
    assert.equal(r?.__tag, "string");
    assert.equal(r?.value, "v");
  });
});

describe("Stdlib - String", () => {
  const s = { __tag: "string", value: "hello" };
  it("toUpper", async () => assert.equal((await callStdlib("toUpper", s, [], ctx()))?.value, "HELLO"));
  it("trim", async () => assert.equal((await callStdlib("trim", { __tag: "string", value: " hi " }, [], ctx()))?.value, "hi"));
  it("startsWith", async () => assert.equal((await callStdlib("startsWith", s, [{ __tag: "string", value: "hel" }], ctx()))?.value, true));
  it("contains", async () => assert.equal((await callStdlib("contains", s, [{ __tag: "string", value: "ell" }], ctx()))?.value, true));
  it("split length", async () => {
    const split = await callStdlib("split", { __tag: "string", value: "a,b,c" }, [{ __tag: "string", value: "," }], ctx());
    const len = await callStdlib("length", split, [], ctx());
    assert.equal(len?.value, 3);
  });
  it("length", async () => assert.equal((await callStdlib("length", s, [], ctx()))?.value, 5));
  it("replace", async () => assert.equal((await callStdlib("replace", { __tag: "string", value: "hello world" }, [{ __tag: "string", value: "world" }, { __tag: "string", value: "LogicN" }], ctx()))?.value, "hello LogicN"));
  it("toLower", async () => assert.equal((await callStdlib("toLower", { __tag: "string", value: "HI" }, [], ctx()))?.value, "hi"));
});

describe("Stdlib - Array", () => {
  const list = { __tag: "list", items: [{ __tag: "int", value: 1 }, { __tag: "int", value: 2 }, { __tag: "int", value: 3 }] };
  it("length", async () => assert.equal((await callStdlib("length", list, [], ctx()))?.value, 3));
  it("isEmpty", async () => assert.equal((await callStdlib("isEmpty", { __tag: "list", items: [] }, [], ctx()))?.value, true));
  it("first", async () => assert.equal((await callStdlib("first", list, [], ctx()))?.__tag, "some"));
  it("last", async () => assert.equal((await callStdlib("last", list, [], ctx()))?.__tag, "some"));
  it("empty first is None", async () => assert.equal((await callStdlib("first", { __tag: "list", items: [] }, [], ctx()))?.__tag, "none"));
  it("contains", async () => assert.equal((await callStdlib("contains", list, [{ __tag: "int", value: 2 }], ctx()))?.value, true));
});

describe("Stdlib - Map", () => {
  const map = { __tag: "record", fields: new Map([["key", { __tag: "string", value: "val" }]]) };
  it("size", async () => assert.equal((await callStdlib("size", { __tag: "record", fields: new Map() }, [], ctx()))?.value, 0));
  it("has", async () => assert.equal((await callStdlib("has", map, [{ __tag: "string", value: "key" }], ctx()))?.value, true));
  it("get", async () => assert.equal((await callStdlib("get", map, [{ __tag: "string", value: "key" }], ctx()))?.__tag, "some"));
});

describe("Stdlib - Numeric", () => {
  it("Int.parse success", async () => {
    const r = await callStdlib("Int.parse", undefined, [{ __tag: "string", value: "42" }], ctx());
    assert.equal(r?.__tag, "ok");
    assert.equal(r?.value.__tag, "int");
    assert.equal(r?.value.value, 42);
  });
  it("Int.parse invalid", async () => assert.equal((await callStdlib("Int.parse", undefined, [{ __tag: "string", value: "abc" }], ctx()))?.__tag, "err"));
  it("Math.abs", async () => assert.equal((await callStdlib("Math.abs", undefined, [{ __tag: "int", value: -5 }], ctx()))?.value, 5));
  it("Math.min", async () => assert.equal((await callStdlib("Math.min", undefined, [{ __tag: "int", value: 3 }, { __tag: "int", value: 7 }], ctx()))?.value, 3));
});

describe("Stdlib - Serialization", () => {
  it("json.decode valid", async () => {
    const r = await callStdlib("json.decode", undefined, [{ __tag: "string", value: "{\"a\":1}" }], ctx());
    assert.equal(r?.__tag, "ok");
    assert.equal(r?.value.__tag, "record");
  });
  it("json.decode invalid", async () => assert.equal((await callStdlib("json.decode", undefined, [{ __tag: "string", value: "invalid" }], ctx()))?.__tag, "err"));
  it("json.encode", async () => {
    const r = await callStdlib("json.encode", undefined, [{ __tag: "record", fields: new Map([["name", { __tag: "string", value: "test" }]]) }], ctx());
    assert.equal(r?.__tag, "string");
    assert.ok(r?.value.includes("name"));
  });
});

describe("Stdlib - Gates", () => {
  it("validate.email valid", async () => {
    const r = await callStdlib("validate.email", undefined, [{ __tag: "string", value: "user@example.com" }], ctx());
    assert.equal(r?.__tag, "ok");
    assert.equal(r?.value.__tag, "protected");
  });
  it("validate.email invalid", async () => assert.equal((await callStdlib("validate.email", undefined, [{ __tag: "string", value: "notanemail" }], ctx()))?.__tag, "err"));
  it("redact", async () => {
    const p = { __tag: "protected", baseType: "Email", value: { __tag: "string", value: "x@example.com" } };
    const r = await callStdlib("redact", undefined, [p], ctx());
    assert.equal(r?.__tag, "redacted");
    assert.equal(r?.baseType, "Email");
  });
});

describe("Stdlib - format", () => {
  it("format hello (positional)", async () => assert.equal((await callStdlib("format", undefined, [{ __tag: "string", value: "hello {}" }, { __tag: "string", value: "world" }], ctx()))?.value, "hello world"));
  it("format multiple positional", async () => assert.equal((await callStdlib("format", undefined, [{ __tag: "string", value: "{} + {} = {}" }, { __tag: "int", value: 1 }, { __tag: "int", value: 2 }, { __tag: "int", value: 3 }], ctx()))?.value, "1 + 2 = 3"));
});

// ── Phase 9A-3: String.format named interpolation ────────────────────────────

describe("Stdlib - String.format named interpolation (Phase 9A-3)", () => {
  it("named single field", async () => {
    const receiver = { __tag: "string", value: "Hello {name}!" };
    const record = { __tag: "record", fields: new Map([["name", { __tag: "string", value: "Alice" }]]) };
    const r = await callStdlib("format", receiver, [record], ctx());
    assert.equal(r?.__tag, "string");
    assert.equal(r?.value, "Hello Alice!");
  });

  it("named multiple fields", async () => {
    const receiver = { __tag: "string", value: "{greeting}, {name}! You have {count} messages." };
    const record = { __tag: "record", fields: new Map([
      ["greeting", { __tag: "string", value: "Hi" }],
      ["name",     { __tag: "string", value: "Bob" }],
      ["count",    { __tag: "int",    value: 3      }],
    ]) };
    const r = await callStdlib("format", receiver, [record], ctx());
    assert.equal(r?.value, "Hi, Bob! You have 3 messages.");
  });

  it("positional {} still works on string receiver", async () => {
    const receiver = { __tag: "string", value: "Hello {}!" };
    const r = await callStdlib("format", receiver, [{ __tag: "string", value: "World" }], ctx());
    assert.equal(r?.value, "Hello World!");
  });
});

// ── Phase 9A-3: Timestamp.format ─────────────────────────────────────────────

describe("Stdlib - Timestamp.format (Phase 9A-3)", () => {
  const makeTimestampVal = (ms) => ({
    __tag: "record",
    fields: new Map([
      ["__isTimestamp", { __tag: "bool",  value: true }],
      ["__ms",          { __tag: "int",   value: ms   }],
    ]),
  });

  it("formats YYYY-MM-DD", async () => {
    // 2024-03-15 UTC = 1710460800000 ms
    const ts = makeTimestampVal(1710460800000);
    const r = await callStdlib("format", ts, [{ __tag: "string", value: "YYYY-MM-DD" }], ctx());
    assert.equal(r?.__tag, "string");
    assert.equal(r?.value, "2024-03-15");
  });

  it("formats YYYY-MM-DD HH:mm:ss", async () => {
    // 2024-01-01 12:30:00 UTC
    // = 1704067200000 (Jan 1 00:00 UTC) + (12*3600 + 30*60)*1000
    // = 1704067200000 + 45000000 = 1704112200000
    const ts = makeTimestampVal(1704112200000);
    const r = await callStdlib("format", ts, [{ __tag: "string", value: "YYYY-MM-DD HH:mm:ss" }], ctx());
    assert.equal(r?.__tag, "string");
    assert.equal(r?.value, "2024-01-01 12:30:00");
  });
});

// ── Phase 9A-3: BigInt decimal arithmetic precision ───────────────────────────

describe("Stdlib - BigInt decimal arithmetic (Phase 9A-3)", () => {
  it("Money.add avoids floating-point rounding 0.1 + 0.2", async () => {
    const gbp01 = { __tag: "record", fields: new Map([
      ["__isMoney", { __tag: "bool", value: true }],
      ["__amount",  { __tag: "decimal", value: "0.1" }],
      ["__currency",{ __tag: "string", value: "GBP" }],
    ]) };
    const gbp02 = { __tag: "record", fields: new Map([
      ["__isMoney", { __tag: "bool", value: true }],
      ["__amount",  { __tag: "decimal", value: "0.2" }],
      ["__currency",{ __tag: "string", value: "GBP" }],
    ]) };
    const r = await callStdlib("add", gbp01, [gbp02], ctx());
    assert.equal(r?.__tag, "record");
    const amount = r?.fields.get("__amount");
    // With BigInt arithmetic this should be exactly 0.30, NOT 0.30000000000000004
    assert.equal(amount?.value, "0.30", `Expected 0.30, got ${amount?.value}`);
  });

  it("Money.subtract exact result", async () => {
    const gbp10 = { __tag: "record", fields: new Map([
      ["__isMoney", { __tag: "bool", value: true }],
      ["__amount",  { __tag: "decimal", value: "10.00" }],
      ["__currency",{ __tag: "string", value: "GBP" }],
    ]) };
    const gbp333 = { __tag: "record", fields: new Map([
      ["__isMoney", { __tag: "bool", value: true }],
      ["__amount",  { __tag: "decimal", value: "3.33" }],
      ["__currency",{ __tag: "string", value: "GBP" }],
    ]) };
    const r = await callStdlib("subtract", gbp10, [gbp333], ctx());
    const amount = r?.fields.get("__amount");
    assert.equal(amount?.value, "6.67", `Expected 6.67, got ${amount?.value}`);
  });
});
