import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import {
  AuditEgress,
  readEgressLedger,
} from "../dist/audit-egress.js";

let counter = 0;
function freshDir() {
  counter += 1;
  return join("build", `egress-test-drop-${process.pid}-${counter}`);
}

test("pushing more than ringCapacity records never drops an audit record", () => {
  const dir = freshDir();
  // small ring so we cross full repeatedly; batchSize smaller than total
  const eg = new AuditEgress({ dir, batchSize: 4, ringCapacity: 4 });

  const total = 50; // >> ringCapacity
  for (let i = 0; i < total; i++) {
    eg.push(`audit-${i}`);
  }
  eg.flush(); // drain any tail

  const batches = readEgressLedger(dir);
  assert.equal(AuditEgress.verifyChain(batches), true);

  // every record present, in order, across all batches
  const all = batches.flatMap((b) => [...b.records]);
  assert.equal(all.length, total);
  for (let i = 0; i < total; i++) {
    assert.equal(all[i], `audit-${i}`);
  }

  // count field sums to total too
  const counted = batches.reduce((n, b) => n + b.count, 0);
  assert.equal(counted, total);
});

test("ringCapacity defaults to batchSize*4 and still loses nothing", () => {
  const dir = freshDir();
  const eg = new AuditEgress({ dir, batchSize: 5 }); // ring = 20
  const total = 23;
  for (let i = 0; i < total; i++) eg.push(`d-${i}`);
  eg.flush();
  const batches = readEgressLedger(dir);
  const all = batches.flatMap((b) => [...b.records]);
  assert.equal(all.length, total);
  assert.deepEqual(all, Array.from({ length: total }, (_, i) => `d-${i}`));
});
