import { createHash, createHmac, generateKeyPairSync, sign, verify } from "node:crypto";
import { performance } from "node:perf_hooks";

const DEFAULT_ITERATIONS = 10000;
const KEY_SIZE = 1024; // bytes for hashing

function bench(name, fn, iterations) {
  // Warmup
  for (let i = 0; i < 10; i++) fn();
  if (typeof globalThis.gc === "function") globalThis.gc();

  const t0 = performance.now();
  const cpu0 = process.cpuUsage();
  for (let i = 0; i < iterations; i++) fn();
  const elapsedMs = performance.now() - t0;
  const cpu = process.cpuUsage(cpu0);

  return {
    name,
    iterations,
    elapsedMs: Number(elapsedMs.toFixed(3)),
    operationsPerSecond: Number((iterations / (elapsedMs / 1000)).toFixed(0)),
    nsPerOp: Number((elapsedMs * 1e6 / iterations).toFixed(1)),
    cpu: { totalMs: Number(((cpu.user + cpu.system) / 1000).toFixed(3)) },
  };
}

function runBench(iterations = DEFAULT_ITERATIONS) {
  const data = Buffer.alloc(KEY_SIZE, 0x42);
  const key  = Buffer.alloc(32, 0x1f);

  // Ed25519 keygen (do once, not per iteration)
  const { privateKey, publicKey } = generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "der" },
    publicKeyEncoding:  { type: "spki",  format: "der" },
  });
  const privObj = { key: privateKey, format: "der", type: "pkcs8" };
  const pubObj  = { key: publicKey,  format: "der", type: "spki"  };
  let sig;

  const results = {
    runtime: "nodejs",
    benchmark: "crypto-ops-v1",
    dataBytes: KEY_SIZE,
    results: {
      sha256:     bench("SHA-256",       () => createHash("sha256").update(data).digest(), iterations),
      hmacSha256: bench("HMAC-SHA256",   () => createHmac("sha256", key).update(data).digest(), iterations),
      ed25519Sign:   bench("Ed25519 sign",   () => { sig = sign(null, data, privObj); }, Math.min(iterations, 2000)),
      ed25519Verify: bench("Ed25519 verify", () => verify(null, data, pubObj, sig),    Math.min(iterations, 2000)),
    },
    notes: [
      "bcrypt intentionally excluded from this runner (use bcrypt.mjs for that)",
      "SHA-256 throughput: (computed after)",
    ],
  };

  // Fix notes after we have sha256 timing
  const sha256TimeSec = results.results.sha256.elapsedMs / 1000;
  const sha256ThroughputMBs = (KEY_SIZE * iterations / 1e6) / sha256TimeSec;
  results.notes[1] = `SHA-256 throughput: ${sha256ThroughputMBs.toFixed(0)} MB/s (${KEY_SIZE} byte chunks)`;

  return results;
}

function parseIntFlag(name, fb) { const i = process.argv.indexOf(name); return i >= 0 ? parseInt(process.argv[i + 1] || "", 10) || fb : fb; }
const its = parseIntFlag("--iterations", parseIntFlag("--operations", DEFAULT_ITERATIONS));
console.log(JSON.stringify(runBench(its), null, 2));
