// run-core-tests.js
// Stop hook: runs `npm test` in every logicn-core and logicn-core-* package
// whenever a sentinel file indicates that core files were edited this turn.
// If all package tests pass, runs the project graph (logicn-devtools-project-graph).
// Outputs a JSON { systemMessage } result so Claude Code shows a status chip.

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages-logicn');
const SENTINEL = path.join(ROOT, '.claude', '.core-changed');
const GRAPH_PKG = 'logicn-devtools-project-graph';

// ── Guard: only run when core files changed this turn ──────────────────────

if (!fs.existsSync(SENTINEL)) {
  process.exit(0);
}

// Clear sentinel immediately so a crash won't leave it stale
try { fs.unlinkSync(SENTINEL); } catch { /* ignore */ }

// ── Discover core packages ──────────────────────────────────────────────────

function hasTestScript(pkgDir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
    return typeof pkg.scripts?.test === 'string';
  } catch {
    return false;
  }
}

const corePackages = fs
  .readdirSync(PACKAGES_DIR)
  .filter(name => /^logicn-core/.test(name) && name !== GRAPH_PKG)
  .map(name => ({ name, dir: path.join(PACKAGES_DIR, name) }))
  .filter(({ dir }) => hasTestScript(dir));

// ── Run a single package's test suite ──────────────────────────────────────

function runTest(dir, label) {
  const r = spawnSync('npm', ['test'], {
    cwd: dir,
    encoding: 'utf8',
    shell: true,
    timeout: 180_000,
  });
  return { label, passed: r.status === 0 };
}

// ── Main ────────────────────────────────────────────────────────────────────

const results = [];
let allPassed = true;

for (const { name, dir } of corePackages) {
  const result = runTest(dir, name);
  results.push(result);
  if (!result.passed) allPassed = false;
}

// Build status lines
const lines = results.map(r => `${r.passed ? '✅' : '❌'} ${r.label}`);

// If all core packages passed, run the project graph
if (allPassed) {
  const graphDir = path.join(PACKAGES_DIR, GRAPH_PKG);
  if (hasTestScript(graphDir)) {
    const gr = runTest(graphDir, GRAPH_PKG);
    lines.push(`${gr.passed ? '✅' : '❌'} ${GRAPH_PKG} (graph)`);
    if (!gr.passed) allPassed = false;
  }
}

const header = allPassed
  ? 'LogicN core tests — all passed'
  : 'LogicN core tests — failures detected';

process.stdout.write(
  JSON.stringify({ systemMessage: `${header}:\n${lines.join('\n')}` })
);
