import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TPLSimulator,
  TritState,
  SecurityTrap,
  TPLIntegrityFault,
  GovernanceEnforcer,
  AuditLogger,
} from "../dist/index.js";

function makeSim(sizeInTrits = 64) {
  const logger = new AuditLogger();
  const gov = new GovernanceEnforcer();
  return { sim: new TPLSimulator(logger, gov, sizeInTrits), logger, gov };
}

// ── Test A: Ternary Identity Verification (TPL Standard §4 Test A) ────────────

test("Test A: ternary identity — [-1, 0, 1] round-trips exactly", () => {
  const { sim } = makeSim();
  sim.setTrit(0, -1);
  sim.setTrit(1, 0);
  sim.setTrit(2, 1);
  assert.equal(sim.getTrit(0), -1);
  assert.equal(sim.getTrit(1), 0);
  assert.equal(sim.getTrit(2), 1);
});

test("Test A: packing survives across word + byte boundaries (all 64 trits)", () => {
  const { sim } = makeSim(64);
  const pattern = [];
  for (let i = 0; i < 64; i++) {
    const v = (i % 3) - 1; // cycles -1, 0, 1
    pattern.push(v);
    sim.setTrit(i, v);
  }
  assert.deepEqual(sim.snapshot(), pattern);
});

test("BitNet-faithful: 16 trits pack into one i32 (4 bytes for 16 trits)", () => {
  const { sim } = makeSim(16);
  assert.equal(sim.packedByteLength(), 4); // 16 trits × 2 bits = 32 bits = 4 bytes
});

// ── Test C: Toxic Photonic Injection (TPL Standard §4 Test C) ─────────────────

test("Test C: injecting 2 triggers a SecurityTrap (value outside ternary set)", () => {
  const { sim } = makeSim();
  assert.throws(() => sim.setTrit(0, 2), SecurityTrap);
});

test("Test C: injecting 0.5 triggers a SecurityTrap", () => {
  const { sim } = makeSim();
  assert.throws(() => sim.setTrit(0, 0.5), SecurityTrap);
});

test("Test C: out-of-bounds trit index triggers a SecurityTrap", () => {
  const { sim } = makeSim(16);
  assert.throws(() => sim.setTrit(99, 1), SecurityTrap);
});

// ── Test B: BitNet T-MAC (ternary multiply-accumulate, add/sub/skip) ──────────

test("Test B: T-MAC computes ternary dot product via add/subtract/skip", () => {
  const { sim } = makeSim(8);
  // weights: [+1, -1, 0, +1]  activations: [10, 20, 30, 40]
  // expected: +10 -20 +0 +40 = 30
  sim.loadWeights([1, -1, 0, 1]);
  const acts = Int32Array.from([10, 20, 30, 40]);
  const result = sim.tmacVector(acts, 0, 4, "TMAC-TEST-1");
  assert.equal(result, 30);
});

test("Test B: T-MAC applies the per-tensor scale (BitNet i2_scale)", () => {
  const { sim } = makeSim(8);
  sim.loadWeights([1, 1, 1]);
  sim.setScale(2);
  const acts = Int32Array.from([5, 5, 5]); // sum 15 × scale 2 = 30
  assert.equal(sim.tmacVector(acts, 0, 3, "TMAC-TEST-2"), 30);
});

test("Test B: T-MAC zero weights are skipped (no contribution)", () => {
  const { sim } = makeSim(8);
  sim.loadWeights([0, 0, 0, 0]);
  const acts = Int32Array.from([100, 200, 300, 400]);
  assert.equal(sim.tmacVector(acts, 0, 4, "TMAC-TEST-3"), 0);
});

// ── Epistemic Hold governance (TPL Standard §3) ───────────────────────────────

test("Epistemic Hold: 0 -> +1 gate without audit signature is trapped", () => {
  const { sim } = makeSim(8);
  sim.setTrit(0, 0);  // input = HOLD
  sim.setTrit(1, 0);  // weight (0×0=0, won't trigger — set up commit below)
  // Force a 0 -> +1 by making input HOLD and result COMMIT via direct gate path:
  // gate computes input×weight; to get result=+1 from input=0 is impossible by
  // multiplication, so we verify the governance check directly instead.
  const check = sim.gate ? null : null;
  // Direct governance check: HOLD -> COMMIT must be denied without signature
  const { gov } = makeSim();
  const verdict = gov.checkTransition(TritState.HOLD, TritState.COMMIT);
  assert.equal(verdict.allowed, false);
});

test("Epistemic Hold: 0 -> +1 permitted after audit signature + schema validation", () => {
  const gov = new GovernanceEnforcer();
  gov.signAudit("CORR-1", "sha256:input");
  gov.markSchemaValidated();
  const verdict = gov.checkTransition(TritState.HOLD, TritState.COMMIT);
  assert.equal(verdict.allowed, true);
});

test("Epistemic Hold: unrestricted transitions always allowed", () => {
  const gov = new GovernanceEnforcer();
  assert.equal(gov.checkTransition(TritState.REJECT, TritState.HOLD).allowed, true);
  assert.equal(gov.checkTransition(TritState.COMMIT, TritState.REJECT).allowed, true);
});

// ── Guard pages / Hardened Border ─────────────────────────────────────────────

test("guard pages: verifyIntegrity passes on a clean buffer", () => {
  const { sim } = makeSim();
  sim.loadWeights([1, -1, 0, 1]);
  assert.doesNotThrow(() => sim.verifyIntegrity());
});

test("hard erasure: wipes state but preserves guard pages", () => {
  const { sim } = makeSim(16);
  sim.loadWeights([1, 1, 1, 1, 1]);
  sim.erase();
  // After erase, all trits decode to -1 (0b00 = REJECT, the wiped state)
  assert.equal(sim.getTrit(0), -1);
  assert.doesNotThrow(() => sim.verifyIntegrity()); // canaries re-stamped
});

test("gate: input×weight stores correct ternary result", () => {
  const { sim } = makeSim(8);
  sim.setTrit(0, 1);   // input = COMMIT
  sim.setTrit(1, -1);  // weight = REJECT
  const result = sim.gate(0, 1, 2, "GATE-TEST");
  assert.equal(result, -1);  // 1 × -1 = -1
  assert.equal(sim.getTrit(2), -1);
});

// ── Audit trail ───────────────────────────────────────────────────────────────

test("audit: T-MAC emits one vector-level transition (not per-trit)", () => {
  const { sim, logger } = makeSim(8);
  // Unique correlation ID per run — the audit log is append-only and persists
  // across runs (immutable ledger), so a fixed ID would accumulate entries.
  const corr = `AUDIT-TMAC-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  sim.loadWeights([1, -1, 1]);
  sim.tmacVector(Int32Array.from([1, 2, 3]), 0, 3, corr);
  const events = logger.query({ correlationId: corr });
  const tmacEvents = events.filter(e => e.details?.operation === "TMAC");
  assert.equal(tmacEvents.length, 1); // exactly one — vector-level audit
});
