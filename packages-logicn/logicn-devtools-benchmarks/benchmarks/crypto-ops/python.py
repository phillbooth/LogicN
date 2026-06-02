import json, os, sys, time, hashlib, hmac

DEFAULT_ITERATIONS = 5000

def bench(name, fn, iterations):
    for _ in range(10): fn()
    t0 = time.perf_counter()
    for _ in range(iterations): fn()
    elapsed = (time.perf_counter() - t0) * 1000
    return {
        "name": name,
        "iterations": iterations,
        "elapsedMs": round(elapsed, 3),
        "operationsPerSecond": round(iterations / max(elapsed / 1000, 1e-9), 0),
        "nsPerOp": round(elapsed * 1e6 / max(iterations, 1), 1),
    }

KEY_SIZE = 1024
DATA = bytes([0x42] * KEY_SIZE)
KEY  = bytes([0x1f] * 32)

its = DEFAULT_ITERATIONS
for i, a in enumerate(sys.argv):
    if a in ("--iterations", "--operations") and i + 1 < len(sys.argv): its = int(sys.argv[i + 1])

sha256_r = bench("SHA-256",     lambda: hashlib.sha256(DATA).digest(), its)
hmac_r   = bench("HMAC-SHA256", lambda: hmac.new(KEY, DATA, hashlib.sha256).digest(), its)

sha256_mbs = (KEY_SIZE * its / 1e6) / max(sha256_r["elapsedMs"] / 1000, 1e-9)
print(json.dumps({
    "runtime": "python",
    "benchmark": "crypto-ops-v1",
    "dataBytes": KEY_SIZE,
    "results": {"sha256": sha256_r, "hmacSha256": hmac_r},
    "notes": [f"hashlib (C-backed) SHA-256 throughput: {sha256_mbs:.0f} MB/s"],
}, indent=2))
