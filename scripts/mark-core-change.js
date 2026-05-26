// mark-core-change.js
// PostToolUse hook (Write|Edit): writes a sentinel file when any file
// inside a logicn-core-* package is edited during a Claude turn.
// The Stop hook reads this sentinel to decide whether to run tests.

'use strict';

const fs = require('fs');
const path = require('path');

const SENTINEL = path.join(__dirname, '..', '.claude', '.core-changed');

const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const rawPath = input.tool_input?.file_path || '';
    const filePath = rawPath.replace(/\\/g, '/');

    // Match any file inside a logicn-core or logicn-core-* package
    if (/packages-logicn\/logicn-core/.test(filePath)) {
      fs.writeFileSync(SENTINEL, new Date().toISOString(), 'utf8');
    }
  } catch {
    // Malformed stdin — do nothing. Never block the hook.
  }
});
