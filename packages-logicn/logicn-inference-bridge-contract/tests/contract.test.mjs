import { test } from "node:test";
import assert from "node:assert/strict";
import { assertDeterminism, validateManifestShape, canonicalManifestString, oracleAgrees } from "../dist/index.js";

function caught(fn) { try { fn(); return null; } catch (e) { return e; } }
const H = "a".repeat(64);

test("assertDeterminism throws on a non-deterministic ternary result", () => {
  assert.doesNotThrow(() => assertDeterminism({ value: 1, executedNatively: false, bridgeId: "b", technique: "ternary", latencyMs: 0, deterministic: true }));
  const err = caught(() => assertDeterminism({ value: 1, executedNatively: true, bridgeId: "b", technique: "ternary", latencyMs: 0, deterministic: false }));
  assert.ok(err); assert.match(String(err.message), /CITIZEN_STANDARD_VIOLATION/);
  // non-ternary non-deterministic is allowed
  assert.doesNotThrow(() => assertDeterminism({ value: 0, executedNatively: false, bridgeId: "b", technique: "fp4_block", latencyMs: 0, deterministic: false }));
});

test("validateManifestShape enforces hashes + certified determinism", () => {
  const base = { bridgeId: "bitnet-cpu", packageName: "@logicn/ext-bridge-cpp", packageHash: H, sourceEngine: "microsoft/BitNet", precision: "ternary", layoutVersion: "i2s-v1", hardwareIdentity: "x86_64-avx2", determinismMode: "exact", certificationProfile: "certified" };
  assert.equal(validateManifestShape(base).ok, true);
  assert.equal(validateManifestShape({ ...base, packageHash: "nothex" }).ok, false);
  assert.equal(validateManifestShape({ ...base, determinismMode: "unverified" }).ok, false, "certified cannot be unverified");
  assert.equal(validateManifestShape({ ...base, certificationProfile: "dev", determinismMode: "unverified" }).ok, true, "dev may be unverified");
});

test("canonicalManifestString is deterministic + order-stable", () => {
  const m = { bridgeId: "b", packageName: "p", packageHash: H, sourceEngine: "e", precision: "ternary", layoutVersion: "v1", hardwareIdentity: "hw", determinismMode: "exact", certificationProfile: "dev" };
  assert.equal(canonicalManifestString(m), canonicalManifestString({ ...m }));
});

test("oracleAgrees compares the scaled integer accumulator bit-exactly", () => {
  const a = { value: 42, technique: "ternary", bridgeId: "x", executedNatively: true, latencyMs: 0, deterministic: true };
  const b = { value: 42, technique: "ternary", bridgeId: "oracle", executedNatively: false, latencyMs: 0, deterministic: true };
  assert.equal(oracleAgrees(a, b), true);
  assert.equal(oracleAgrees({ ...a, value: 43 }, b), false);
});
