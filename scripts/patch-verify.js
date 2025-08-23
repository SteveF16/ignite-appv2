#!/usr/bin/env node
/* eslint-env node */ // <-- tell ESLint this is a Node script (enables `require`, `process`)
/* eslint-disable no-console */

/***I see the problem 👍 — your entity-guard.js script is written as a Node.js CLI utility 
 * (uses require, process, fs, path, etc.), but your IDE (VS Code with ESLint) is linting it
 *  as if it were browser-side JavaScript. In the browser, require and process don’t exist,
 *  hence all those no-undef errors.

✅ You don’t need to change the script itself — it’s correct for Node.js.
Instead, you need to tell ESLint that this file should be linted in a Node environment. */

'use strict';
/**
 * Patch Base-Hash Verifier
 * -------------------------------------------------------------
 * Usage:
 *   node scripts/patch-verify.js <path/to/file> <expected-sha256>
 *
 * Returns a non-zero exit code on mismatch. Intended for local use
 * AND CI gating. This does NOT apply the patch; it only verifies that
 * the file on disk matches the hash used to generate the patch.
 *
 * Multitenant note:
 * - This script does not read app content; it only hashes the file.
 * - Safe for all tenants; no PII is emitted.
 */

const fs = require('fs');
const crypto = require('crypto');

function usage() {
  console.error('Usage: node scripts/patch-verify.js <file> <expected-sha256>');
  process.exit(2);
}

const [, , filePath, expected] = process.argv;
if (!filePath || !expected) usage();

try {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  const buf = fs.readFileSync(filePath);
  const actual = crypto.createHash('sha256').update(buf).digest('hex');
  if (actual.toLowerCase() === expected.toLowerCase()) {
    console.log(`✅ OK: ${filePath}\n   sha256=${actual}`);
    process.exit(0);
  } else {
    console.error(`❌ Mismatch for ${filePath}\n   expected=${expected}\n   actual  =${actual}`);
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}

//*** End Patch
