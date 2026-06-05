#!/usr/bin/env bash
# LogicN Linux Deployment Script
# Usage: ./scripts/deploy-linux.sh <app.lln> [--port <N>]
#
# Builds .lln -> .wasm, verifies governance manifest, runs a
# health-check probe, then prints the commands needed to start
# the governed runtime under Wasmtime (available in Phase 9+).
#
# Requires:
#   - Node.js >= 18  (logicn CLI runs on the Stage A interpreter today)
#   - wasmtime       (optional — used at runtime when DRCM Phase 9 lands)
#
# Examples:
#   ./scripts/deploy-linux.sh examples/auth-service/createSession.lln
#   ./scripts/deploy-linux.sh examples/auth-service/createSession.lln --port 9000

set -euo pipefail

# ── args ──────────────────────────────────────────────────────────────────────
LLN_FILE="${1:-examples/auth-service/createSession.lln}"
PORT="8080"
if [[ "${2:-}" == "--port" && -n "${3:-}" ]]; then
  PORT="$3"
fi

BUILD_DIR="build"
BASE_NAME="$(basename "${LLN_FILE%.lln}")"
WASM_FILE="${BUILD_DIR}/${BASE_NAME}.wasm"
MANIFEST_FILE="${BUILD_DIR}/${BASE_NAME}.lmanifest"
MANIFEST_JSON="${BUILD_DIR}/${BASE_NAME}.lmanifest.json"
HEALTH_LLN="examples/deployment/health-check.lln"

echo "LogicN Governed Runtime -- Deployment"
echo "   File:    ${LLN_FILE}"
echo "   Port:    ${PORT}"
echo ""

# ── step 1: governance check ─────────────────────────────────────────────────
echo "Checking governance..."
if ! node logicn.mjs check "${LLN_FILE}" 2>&1; then
  echo "Governance check failed: ${LLN_FILE}"
  exit 1
fi
echo ""

# ── step 2: build WASM ───────────────────────────────────────────────────────
echo "Building .wasm..."
node logicn.mjs build "${LLN_FILE}"
echo ""

if [ ! -f "${WASM_FILE}" ]; then
  echo "Build failed: ${WASM_FILE} not found"
  exit 1
fi
echo "Built: ${WASM_FILE}"

# ── step 3: verify manifest ───────────────────────────────────────────────────
echo "Verifying governance manifest..."
if node logicn.mjs verify "${LLN_FILE}" 2>&1; then
  echo "Manifest verified"
else
  echo "Manifest verification returned non-zero -- review ${MANIFEST_JSON}"
  # Non-fatal in Stage A (placeholder signing); will be fatal in Phase 9+
fi
echo ""

# ── step 4: verify sourceHash present ────────────────────────────────────────
if [ -f "${MANIFEST_JSON}" ]; then
  SOURCE_HASH="$(node -e "const m=JSON.parse(require('fs').readFileSync('${MANIFEST_JSON}','utf8')); process.stdout.write(m.sourceHash||'')")"
  if [ -n "${SOURCE_HASH}" ]; then
    echo "Manifest sourceHash: ${SOURCE_HASH}"
  else
    echo "Warning: manifest has no sourceHash -- rebuild may be needed"
  fi
fi

# ── step 5: health check probe ───────────────────────────────────────────────
echo ""
echo "Running health check flow..."
if [ -f "${HEALTH_LLN}" ]; then
  if node logicn.mjs check "${HEALTH_LLN}" 2>&1 | grep -q "0 errors"; then
    echo "Health check flow: ACCEPT (0 errors)"
  else
    echo "Health check flow: governance warning -- review ${HEALTH_LLN}"
  fi
else
  echo "Health check flow not found at ${HEALTH_LLN} -- skipping"
fi
echo ""

# ── step 6: deployment summary ───────────────────────────────────────────────
echo "Deployment complete"
echo ""
echo "Artefacts:"
echo "   WASM:            ${WASM_FILE}"
echo "   Manifest (CBOR): ${MANIFEST_FILE}"
echo "   Manifest (JSON): ${MANIFEST_JSON}"
echo "   Audit log:       ${BUILD_DIR}/audit-log/audit-log.jsonl"
echo ""
echo "To run with Wasmtime (available from Phase 9 / DRCM DSS.wasm):"
echo "   wasmtime --invoke main ${WASM_FILE}"
echo ""
echo "To check Tower logs:"
echo "   node logicn.mjs tower-log list"
echo "   node logicn.mjs tower-log audit-log"
echo ""
echo "Stage note: Stage A (Phase 5-7 DRCM) -- Stage B + DSS.wasm supervision in Phase 9"
