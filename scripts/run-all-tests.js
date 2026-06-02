// run-all-tests.js
// Root test runner for the LogicN monorepo.
//
// There are no npm workspaces here — each package under packages-logicn/* is
// self-contained (file:../ deps, its own `npm test` that does
// typecheck && build && node --test). This script gives ONE command + ONE exit
// code across packages, parses each package's node:test summary, and prints an
// aggregate table (the same cross-package totals the runtime-status SOT tracks).
//
// Usage:
//   node scripts/run-all-tests.js              # all test-bearing packages
//   node scripts/run-all-tests.js --core       # just the SOT four (fast: ~30s)
//   node scripts/run-all-tests.js --list       # list discoverable test packages, no run
//   node scripts/run-all-tests.js <pkg> [pkg]  # only the named package(s)
//   node scripts/run-all-tests.js --bail       # stop at the first failing package
//
// Exit code: 0 if every selected package passed, 1 otherwise (3 = usage error).

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages-logicn');

// The four packages whose counts the runtime-status SOT aggregates, in build
// order (graph-algorithms is a compiler dependency; security builds last).
const CORE = [
  'logicn-devtools-graph-algorithms',
  'logicn-core-economics',
  'logicn-core-compiler',
  'logicn-core-security',
];

// Consumers that must run AFTER the rest (downstream of the generated graph).
const RUN_LAST = ['logicn-devtools-graph-project'];

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const named = argv.filter((a) => !a.startsWith('--'));
const isCore = flags.has('--core');
const isList = flags.has('--list');
const bail = flags.has('--bail');

// ── helpers ──────────────────────────────────────────────────────────────────
function readPkg(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}
function hasTestScript(dir) {
  const pkg = readPkg(dir);
  return typeof pkg?.scripts?.test === 'string';
}
// A "real" test suite runs node --test (or the logicn example runner) rather
// than only typechecking — used to distinguish suites from typecheck-only gates.
function isRealSuite(dir) {
  const t = readPkg(dir)?.scripts?.test || '';
  return /node\s+--test|logicn\.js\s+test/.test(t);
}

// Parse a node:test run summary from captured output. Handles both the TAP
// (`# tests N`) and spec-reporter (`ℹ tests N`) formats.
function parseCounts(out) {
  const grab = (label) => {
    const m = out.match(new RegExp(`(?:^|\\n)\\s*(?:#|\\u2139)\\s*${label}\\s+(\\d+)`));
    return m ? Number(m[1]) : null;
  };
  return { tests: grab('tests'), pass: grab('pass'), fail: grab('fail') };
}

function discover() {
  if (named.length) {
    return named.map((name) => ({ name, dir: path.join(PACKAGES_DIR, name) }));
  }
  if (isCore) {
    return CORE.map((name) => ({ name, dir: path.join(PACKAGES_DIR, name) }));
  }
  // All test-bearing packages: graph-algorithms-style first, RUN_LAST last.
  const all = fs
    .readdirSync(PACKAGES_DIR)
    .filter((name) => fs.statSync(path.join(PACKAGES_DIR, name)).isDirectory())
    .map((name) => ({ name, dir: path.join(PACKAGES_DIR, name) }))
    .filter(({ dir }) => hasTestScript(dir) && isRealSuite(dir));
  const last = all.filter((p) => RUN_LAST.includes(p.name));
  const mid = all.filter((p) => !RUN_LAST.includes(p.name)).sort((a, b) => a.name.localeCompare(b.name));
  return [...mid, ...last];
}

function runOne({ name, dir }) {
  if (!fs.existsSync(dir)) return { name, status: 'missing', tests: null, ms: 0 };
  if (!hasTestScript(dir)) return { name, status: 'no-test', tests: null, ms: 0 };
  const t0 = Date.now();
  const r = spawnSync('npm', ['test'], { cwd: dir, encoding: 'utf8', shell: true, timeout: 600_000 });
  const ms = Date.now() - t0;
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const counts = parseCounts(out);
  return { name, status: r.status === 0 ? 'pass' : 'fail', code: r.status, ...counts, ms, out };
}

// ── list mode ────────────────────────────────────────────────────────────────
if (isList) {
  const pkgs = discover();
  process.stdout.write(`Test-bearing packages (${pkgs.length}):\n`);
  for (const { name, dir } of pkgs) {
    const kind = isRealSuite(dir) ? 'suite' : hasTestScript(dir) ? 'typecheck-only' : 'no-test';
    process.stdout.write(`  ${name.padEnd(36)} ${kind}\n`);
  }
  process.exit(0);
}

// ── run ──────────────────────────────────────────────────────────────────────
const selection = discover();
const scope = named.length ? 'named' : isCore ? 'core (SOT four)' : 'all suites';
process.stdout.write(`LogicN root test runner — ${scope}: ${selection.length} package(s)\n\n`);

const results = [];
let totalTests = 0;
let anyFail = false;

for (const pkg of selection) {
  process.stdout.write(`▶ ${pkg.name} … `);
  const res = runOne(pkg);
  results.push(res);
  if (res.status === 'pass') {
    if (typeof res.tests === 'number') totalTests += res.tests;
    const cnt = typeof res.tests === 'number' ? `${res.tests} tests` : 'ok';
    process.stdout.write(`✅ ${cnt} (${(res.ms / 1000).toFixed(1)}s)\n`);
  } else if (res.status === 'fail') {
    anyFail = true;
    process.stdout.write(`❌ FAIL (exit ${res.code}, ${(res.ms / 1000).toFixed(1)}s)\n`);
    // surface the failing lines for quick triage
    const fails = (res.out || '').split('\n').filter((l) => /not ok|✖|Error:|fail \d/.test(l)).slice(0, 8);
    for (const l of fails) process.stdout.write(`    ${l.trim()}\n`);
    if (bail) break;
  } else {
    process.stdout.write(`⚠️  ${res.status}\n`);
  }
}

// ── summary ──────────────────────────────────────────────────────────────────
process.stdout.write('\n── Summary ──────────────────────────────\n');
const pad = (s, n) => String(s).padEnd(n);
process.stdout.write(`${pad('package', 38)}${pad('tests', 8)}status\n`);
for (const r of results) {
  const tests = typeof r.tests === 'number' ? r.tests : '—';
  const mark = r.status === 'pass' ? '✅ pass' : r.status === 'fail' ? '❌ fail' : `⚠️  ${r.status}`;
  process.stdout.write(`${pad(r.name, 38)}${pad(tests, 8)}${mark}\n`);
}
const passed = results.filter((r) => r.status === 'pass').length;
process.stdout.write('─────────────────────────────────────────\n');
process.stdout.write(`${passed}/${results.length} packages passed · ${totalTests} tests total\n`);

process.exit(anyFail ? 1 : 0);
