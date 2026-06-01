import json, os, platform, sys, time

DEFAULT_N = 30
DEFAULT_ITERATIONS = 20   # fib(30) takes ~100ms in Python; 20 iters ≈ 2s

def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

def run_bench(n, iterations):
    # Warmup
    fib(n)

    t0 = time.perf_counter()
    cpu0 = time.process_time()
    result = 0
    for _ in range(iterations):
        result = fib(n)
    elapsed = (time.perf_counter() - t0) * 1000
    cpu_ms = (time.process_time() - cpu0) * 1000
    return {
        "runtime": "python", "benchmark": "fibonacci-recursive-v1",
        "n": n, "result": result, "iterations": iterations,
        "elapsedMs": round(elapsed, 3),
        "callsPerSecond": round(iterations / max(elapsed / 1000, 1e-9), 2),
        "cpu": {"processMs": round(cpu_ms, 3)},
        "memory": {},
        "process": {"pid": os.getpid(), "python": platform.python_version(),
                    "platform": platform.platform(), "arch": platform.machine()},
    }

if __name__ == "__main__":
    n = DEFAULT_N
    its = DEFAULT_ITERATIONS
    for i, a in enumerate(sys.argv):
        if a == "--n" and i + 1 < len(sys.argv):
            n = int(sys.argv[i + 1])
        if a in ("--operations", "--iterations") and i + 1 < len(sys.argv):
            its = int(sys.argv[i + 1])
    print(json.dumps(run_bench(n, its), indent=2))
