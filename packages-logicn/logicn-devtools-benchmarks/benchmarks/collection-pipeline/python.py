import json, os, platform, sys, time

DEFAULT_SIZE = 10000
DEFAULT_ITERATIONS = 5000

def run_bench(size, iterations):
    arr = list(range(size))

    # Warmup
    sum(x * 2 for x in arr if x % 2 == 0)

    t0 = time.perf_counter()
    cpu0 = time.process_time()
    result = 0
    for _ in range(iterations):
        result = sum(x * 2 for x in arr if x % 2 == 0)
    elapsed = (time.perf_counter() - t0) * 1000
    cpu_ms = (time.process_time() - cpu0) * 1000
    return {
        "runtime": "python", "benchmark": "collection-pipeline-v1",
        "size": size, "iterations": iterations, "result": result,
        "elapsedMs": round(elapsed, 3),
        "iterationsPerSecond": round(iterations / max(elapsed / 1000, 1e-9), 2),
        "cpu": {"processMs": round(cpu_ms, 3)},
        "memory": {},
        "process": {"pid": os.getpid(), "python": platform.python_version(),
                    "platform": platform.platform(), "arch": platform.machine()},
    }

if __name__ == "__main__":
    size = DEFAULT_SIZE
    its = DEFAULT_ITERATIONS
    for i, a in enumerate(sys.argv):
        if a == "--size" and i + 1 < len(sys.argv):
            size = int(sys.argv[i + 1])
        if a in ("--operations", "--iterations") and i + 1 < len(sys.argv):
            its = int(sys.argv[i + 1])
    print(json.dumps(run_bench(size, its), indent=2))
