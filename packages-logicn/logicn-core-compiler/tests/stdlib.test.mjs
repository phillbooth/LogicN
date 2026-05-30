import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LLN_NONE, LLN_VOID, callStdlib } from "../dist/index.js";

function ctx() {
  return {
    recordEffect: () => {},
    resolveIdentifier: () => undefined,
    callFlow: () => LLN_VOID,
    applyFn: (_fn, arg) => arg,
  };
}

describe("Stdlib - Option", () => {
  it("None.isSome() -> false", () => {
    const r = callStdlib("isSome", LLN_NONE, [], ctx());
    assert.equal(r?.__tag, "bool");
    assert.equal(r?.value, false);
  });
  it("Some(x).isSome() -> true", () => {
    const r = callStdlib("isSome", { __tag: "some", value: { __tag: "string", value: "x" } }, [], ctx());
    assert.equal(r?.__tag, "bool");
    assert.equal(r?.value, true);
  });
  it("None.unwrapOr(default) -> default", () => {
    const r = callStdlib("unwrapOr", LLN_NONE, [{ __tag: "string", value: "default" }], ctx());
    assert.equal(r?.__tag, "string");
    assert.equal(r?.value, "default");
  });
  it("Some(value).unwrapOr(default) -> value", () => {
    const r = callStdlib("unwrapOr", { __tag: "some", value: { __tag: "string", value: "value" } }, [{ __tag: "string", value: "default" }], ctx());
    assert.equal(r?.__tag, "string");
    assert.equal(r?.value, "value");
  });
  it("Some(x).isNone() -> false", () => {
    const r = callStdlib("isNone", { __tag: "some", value: { __tag: "string", value: "x" } }, [], ctx());
    assert.equal(r?.__tag, "bool");
    assert.equal(r?.value, false);
  });
});

describe("Stdlib - Result", () => {
  it("Ok(v).isOk() -> true", () => {
    const r = callStdlib("isOk", { __tag: "ok", value: { __tag: "string", value: "v" } }, [], ctx());
    assert.equal(r?.__tag, "bool");
    assert.equal(r?.value, true);
  });
  it("Err(e).isErr() -> true", () => {
    const r = callStdlib("isErr", { __tag: "err", error: { __tag: "string", value: "e" } }, [], ctx());
    assert.equal(r?.__tag, "bool");
    assert.equal(r?.value, true);
  });
  it("Err(e).unwrapOr(default) -> default", () => {
    const r = callStdlib("unwrapOr", { __tag: "err", error: { __tag: "string", value: "e" } }, [{ __tag: "string", value: "default" }], ctx());
    assert.equal(r?.__tag, "string");
    assert.equal(r?.value, "default");
  });
  it("Ok(v).unwrapOr(default) -> v", () => {
    const r = callStdlib("unwrapOr", { __tag: "ok", value: { __tag: "string", value: "v" } }, [{ __tag: "string", value: "default" }], ctx());
    assert.equal(r?.__tag, "string");
    assert.equal(r?.value, "v");
  });
});

describe("Stdlib - String", () => {
  const s = { __tag: "string", value: "hello" };
  it("toUpper", () => assert.equal(callStdlib("toUpper", s, [], ctx())?.value, "HELLO"));
  it("trim", () => assert.equal(callStdlib("trim", { __tag: "string", value: " hi " }, [], ctx())?.value, "hi"));
  it("startsWith", () => assert.equal(callStdlib("startsWith", s, [{ __tag: "string", value: "hel" }], ctx())?.value, true));
  it("contains", () => assert.equal(callStdlib("contains", s, [{ __tag: "string", value: "ell" }], ctx())?.value, true));
  it("split length", () => {
    const split = callStdlib("split", { __tag: "string", value: "a,b,c" }, [{ __tag: "string", value: "," }], ctx());
    const len = callStdlib("length", split, [], ctx());
    assert.equal(len?.value, 3);
  });
  it("length", () => assert.equal(callStdlib("length", s, [], ctx())?.value, 5));
  it("replace", () => assert.equal(callStdlib("replace", { __tag: "string", value: "hello world" }, [{ __tag: "string", value: "world" }, { __tag: "string", value: "LogicN" }], ctx())?.value, "hello LogicN"));
  it("toLower", () => assert.equal(callStdlib("toLower", { __tag: "string", value: "HI" }, [], ctx())?.value, "hi"));
});

describe("Stdlib - Array", () => {
  const list = { __tag: "list", items: [{ __tag: "int", value: 1 }, { __tag: "int", value: 2 }, { __tag: "int", value: 3 }] };
  it("length", () => assert.equal(callStdlib("length", list, [], ctx())?.value, 3));
  it("isEmpty", () => assert.equal(callStdlib("isEmpty", { __tag: "list", items: [] }, [], ctx())?.value, true));
  it("first", () => assert.equal(callStdlib("first", list, [], ctx())?.__tag, "some"));
  it("last", () => assert.equal(callStdlib("last", list, [], ctx())?.__tag, "some"));
  it("empty first is None", () => assert.equal(callStdlib("first", { __tag: "list", items: [] }, [], ctx())?.__tag, "none"));
  it("contains", () => assert.equal(callStdlib("contains", list, [{ __tag: "int", value: 2 }], ctx())?.value, true));
});

describe("Stdlib - Map", () => {
  const map = { __tag: "record", fields: new Map([["key", { __tag: "string", value: "val" }]]) };
  it("size", () => assert.equal(callStdlib("size", { __tag: "record", fields: new Map() }, [], ctx())?.value, 0));
  it("has", () => assert.equal(callStdlib("has", map, [{ __tag: "string", value: "key" }], ctx())?.value, true));
  it("get", () => assert.equal(callStdlib("get", map, [{ __tag: "string", value: "key" }], ctx())?.__tag, "some"));
});

describe("Stdlib - Numeric", () => {
  it("Int.parse success", () => {
    const r = callStdlib("Int.parse", undefined, [{ __tag: "string", value: "42" }], ctx());
    assert.equal(r?.__tag, "ok");
    assert.equal(r?.value.__tag, "int");
    assert.equal(r?.value.value, 42);
  });
  it("Int.parse invalid", () => assert.equal(callStdlib("Int.parse", undefined, [{ __tag: "string", value: "abc" }], ctx())?.__tag, "err"));
  it("Math.abs", () => assert.equal(callStdlib("Math.abs", undefined, [{ __tag: "int", value: -5 }], ctx())?.value, 5));
  it("Math.min", () => assert.equal(callStdlib("Math.min", undefined, [{ __tag: "int", value: 3 }, { __tag: "int", value: 7 }], ctx())?.value, 3));
});

describe("Stdlib - Serialization", () => {
  it("json.decode valid", () => {
    const r = callStdlib("json.decode", undefined, [{ __tag: "string", value: "{\"a\":1}" }], ctx());
    assert.equal(r?.__tag, "ok");
    assert.equal(r?.value.__tag, "record");
  });
  it("json.decode invalid", () => assert.equal(callStdlib("json.decode", undefined, [{ __tag: "string", value: "invalid" }], ctx())?.__tag, "err"));
  it("json.encode", () => {
    const r = callStdlib("json.encode", undefined, [{ __tag: "record", fields: new Map([["name", { __tag: "string", value: "test" }]]) }], ctx());
    assert.equal(r?.__tag, "string");
    assert.ok(r?.value.includes("name"));
  });
});

describe("Stdlib - Gates", () => {
  it("validate.email valid", () => {
    const r = callStdlib("validate.email", undefined, [{ __tag: "string", value: "user@example.com" }], ctx());
    assert.equal(r?.__tag, "ok");
    assert.equal(r?.value.__tag, "protected");
  });
  it("validate.email invalid", () => assert.equal(callStdlib("validate.email", undefined, [{ __tag: "string", value: "notanemail" }], ctx())?.__tag, "err"));
  it("redact", () => {
    const p = { __tag: "protected", baseType: "Email", value: { __tag: "string", value: "x@example.com" } };
    const r = callStdlib("redact", undefined, [p], ctx());
    assert.equal(r?.__tag, "redacted");
    assert.equal(r?.baseType, "Email");
  });
});

describe("Stdlib - format", () => {
  it("format hello", () => assert.equal(callStdlib("format", undefined, [{ __tag: "string", value: "hello {}" }, { __tag: "string", value: "world" }], ctx())?.value, "hello world"));
  it("format multiple", () => assert.equal(callStdlib("format", undefined, [{ __tag: "string", value: "{} + {} = {}" }, { __tag: "int", value: 1 }, { __tag: "int", value: 2 }, { __tag: "int", value: 3 }], ctx())?.value, "1 + 2 = 3"));
});
