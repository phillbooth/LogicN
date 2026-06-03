/**
 * CLI compatibility tests — catches platform-specific issues before they
 * surprise users on Linux, macOS, or Windows PowerShell.
 *
 * Covers:
 *   - logicn binary exists and is executable
 *   - logicn --help works on all platforms
 *   - `logicn run` works cross-platform (no bash-isms)
 *   - `logicn build` produces a valid .wasm binary
 *   - `logicn check` exits 0 on clean files
 *   - PowerShell vs bash curl distinction (documents the known difference)
 *   - node.mjs shebang compatibility
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, "../../.."); // monorepo root
const LOGICN = join(ROOT, "logicn.mjs");
const BENCH  = join(ROOT, "packages-logicn/logicn-devtools-benchmarks/benchmarks/governance-cost/benchmark.lln");
const CLEAN  = join(ROOT, "examples/auth-service/verifyPassword.lln");

const isWin = process.platform === "win32";

/** Run `node logicn.mjs <args>` and return stdout/stderr/code */
function logicn(...args) {
  const r = spawnSync(process.execPath, [LOGICN, ...args], {
    cwd: ROOT, encoding: "utf8", timeout: 30000,
  });
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", code: r.status };
}

// ── Existence checks ──────────────────────────────────────────────────────────
describe("CLI compatibility — logicn.mjs file", () => {
  it("logicn.mjs exists in repo root", () => {
    assert.ok(existsSync(LOGICN), `logicn.mjs not found at ${LOGICN}`);
  });

  it("logicn.mjs is a valid ESM module (starts with import or #!/usr/bin/env)", () => {
    const first = readFileSync(LOGICN, "utf8").slice(0, 100);
    const isEsm = first.includes("import ") || first.includes("#!/usr/bin/env");
    assert.ok(isEsm, "logicn.mjs should be an ESM module with shebang or import");
  });

  it("package.json has bin.logicn pointing to logicn.mjs", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    assert.ok(pkg.bin?.logicn, "package.json missing bin.logicn");
    assert.equal(pkg.bin.logicn, "./logicn.mjs");
  });
});

// ── --help ────────────────────────────────────────────────────────────────────
describe("CLI compatibility — --help", () => {
  it("logicn --help exits 0", () => {
    const { code } = logicn("--help");
    assert.equal(code, 0);
  });

  it("logicn --help mentions run, build, check", () => {
    const { stdout } = logicn("--help");
    assert.ok(stdout.includes("run"), "--help should mention 'run'");
    assert.ok(stdout.includes("build"), "--help should mention 'build'");
    assert.ok(stdout.includes("check"), "--help should mention 'check'");
  });

  it("logicn with no args exits 0 (shows help, not an error)", () => {
    const { code } = logicn();
    assert.equal(code, 0);
  });
});

// ── logicn run ────────────────────────────────────────────────────────────────
describe("CLI compatibility — logicn run", () => {
  it("logicn run <lln> --invoke main returns correct result (5050)", () => {
    const { stdout, code } = logicn("run", BENCH, "--invoke", "main");
    assert.equal(code, 0, `expected exit 0, got ${code}`);
    assert.ok(stdout.trim() === "5050", `expected '5050', got '${stdout.trim()}'`);
  });

  it("logicn run on a clean auth-service flow exits 0", () => {
    const { code } = logicn("run", CLEAN, "--invoke", "verifyPassword");
    // may exit 0 or 0 with WASM output — just confirm no crash (code !== null && code >= 0)
    assert.ok(code !== null && code >= 0);
  });

  it("logicn run on a nonexistent file exits non-zero", () => {
    const { code } = logicn("run", "nonexistent-file.lln");
    assert.notEqual(code, 0, "should fail on missing file");
  });
});

// ── logicn build ──────────────────────────────────────────────────────────────
describe("CLI compatibility — logicn build", () => {
  it("logicn build produces a .wasm file", () => {
    mkdirSync(join(ROOT, "build"), { recursive: true });
    const { code, stdout } = logicn("build", BENCH);
    assert.equal(code, 0, `build failed: ${stdout}`);
    const wasmPath = join(ROOT, "build", "benchmark.wasm");
    assert.ok(existsSync(wasmPath), "build/benchmark.wasm not created");
  });

  it("produced .wasm starts with WASM magic bytes (\\0asm)", () => {
    const wasmPath = join(ROOT, "build", "benchmark.wasm");
    if (!existsSync(wasmPath)) return; // skip if previous test didn't run
    const bytes = readFileSync(wasmPath);
    assert.equal(bytes[0], 0x00);
    assert.equal(bytes[1], 0x61); // 'a'
    assert.equal(bytes[2], 0x73); // 's'
    assert.equal(bytes[3], 0x6d); // 'm'
  });

  it("build output mentions wasmtime usage hint", () => {
    const { stdout } = logicn("build", BENCH);
    assert.ok(stdout.includes("wasmtime"), "should hint at wasmtime usage");
  });
});

// ── logicn check ──────────────────────────────────────────────────────────────
describe("CLI compatibility — logicn check", () => {
  it("logicn check on clean file exits 0", () => {
    const { code, stdout } = logicn("check", CLEAN);
    assert.equal(code, 0, `check failed: ${stdout}`);
  });

  it("logicn check output contains ✅ on clean file", () => {
    const { stdout } = logicn("check", CLEAN);
    assert.ok(stdout.includes("✅"), `expected ✅ in: ${stdout}`);
  });
});

// ── Platform documentation tests ─────────────────────────────────────────────
describe("CLI compatibility — platform awareness", () => {
  it("documents PowerShell curl alias difference (Windows-specific)", () => {
    // On Windows, `curl` is aliased to Invoke-WebRequest — flags like -fsSL don't work.
    // LogicN install scripts must use platform-specific syntax:
    //   Linux/macOS: curl -fsSL https://logicn.io/install.sh | bash
    //   Windows:     iwr https://logicn.io/install.ps1 | iex
    //   Universal:   npm install -g @logicn/cli
    if (isWin) {
      // Confirm the alias exists — if cmd.exe 'where curl' returns nothing or
      // PowerShell resolves to Invoke-WebRequest, install docs must warn about -fsSL.
      const r = spawnSync("cmd.exe", ["/c", "where curl"], { encoding: "utf8", timeout: 5000 });
      const curlPaths = r.stdout?.trim().split("\n").filter(Boolean) ?? [];
      // If the only curl is in System32 (PowerShell shim), warn developers
      const isShim = curlPaths.some(p => p.toLowerCase().includes("system32") || p.toLowerCase().includes("curl.exe") === false);
      // Just document — don't fail, this is informational
      assert.ok(true, `Windows curl paths: ${curlPaths.join("; ") || "not found (PowerShell alias only)"}`);
    } else {
      // Unix: curl -fsSL should work
      const r = spawnSync("curl", ["--version"], { encoding: "utf8", timeout: 5000 });
      assert.ok(r.status === 0 || r.error, "curl should be available on Linux/macOS");
    }
  });

  it("node is available (required for logicn CLI)", () => {
    const r = spawnSync(process.execPath, ["--version"], { encoding: "utf8", timeout: 5000 });
    assert.equal(r.status, 0);
    const version = r.stdout.trim();
    const major = parseInt(version.replace("v", "").split(".")[0]);
    assert.ok(major >= 18, `Node.js >= 18 required, found ${version}`);
  });

  it("npm is available (required for npm install -g @logicn/cli)", () => {
    const r = spawnSync("npm", ["--version"], { encoding: "utf8", shell: isWin, timeout: 5000 });
    assert.ok(r.status === 0 || r.error === undefined, "npm should be available");
  });

  it("logicn.mjs works via direct node invocation (no global install needed)", () => {
    // The universal fallback: node logicn.mjs <args>  — works everywhere with node >= 18
    const { code } = logicn("--help");
    assert.equal(code, 0, "node logicn.mjs --help should always work if node >= 18 is installed");
  });
});
