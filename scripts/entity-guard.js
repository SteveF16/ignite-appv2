/* eslint-env node */
'use strict';


/***I see the problem 👍 — your entity-guard.js script is written as a Node.js CLI utility 
 * (uses require, process, fs, path, etc.), but your IDE (VS Code with ESLint) is linting it
 *  as if it were browser-side JavaScript. In the browser, require and process don’t exist,
 *  hence all those no-undef errors.

✅ You don’t need to change the script itself — it’s correct for Node.js.
Instead, you need to tell ESLint that this file should be linted in a Node environment. */

//*** Add File: scripts/entity-guard.js
/**
 * Entity UI Guard — prevents regressions to stable entities (e.g., Customers)
 * by snapshotting file hashes and verifying before applying patches for other entities.
 *
 * USAGE
 * 1) Initialize snapshots (once, when Customers UI is good):
 *      node scripts/entity-guard.js snapshot --files src/App.js,src/Sidebar.js,src/DataEntryForm.js,src/ChangeEntity.js,src/DataSchemas.js,src/ListDataView.js
 *
 * 2) Verify (before you start adding Employees/Vendors/etc.):
 *      node scripts/entity-guard.js verify
 *
 * Snapshots are stored in .entity-snapshots.json at repo root.
 * The verify step fails the process if any hashed file differs from the snapshot.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SNAPSHOT_FILE = path.resolve(process.cwd(), '.entity-snapshots.json');

function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function loadSnapshot() {
  if (!fs.existsSync(SNAPSHOT_FILE)) return {};
  return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
}

function saveSnapshot(obj) {
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(obj, null, 2)  + '\n', 'utf8');
}

function parseFileList(arg) {
  if (!arg) return [];
  return String(arg)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function snapshot(files) {
  const snap = loadSnapshot();
  const ts = new Date().toISOString();
  snap._updatedAt = ts;
  if (!snap.files) snap.files = {};
  for (const f of files) {
    const p = path.resolve(process.cwd(), f);
    if (!fs.existsSync(p)) {
      console.error(`❌ Not found: ${f}`);
      process.exitCode = 2;
      continue;
    }
    const hash = sha256(p);
    snap.files[f] = { hash, ts };
    console.log(`📸 snapshot ${f} = ${hash}`);
  }
  saveSnapshot(snap);
  console.log(`\n✅ Snapshot updated in ${path.relative(process.cwd(), SNAPSHOT_FILE)}`);
}

function verify() {
  const snap = loadSnapshot();
  if (!snap.files || !Object.keys(snap.files).length) {
    console.error('❌ No snapshots found. Run: node scripts/entity-guard.js snapshot --files <list>');
    process.exit(1);
  }
  let ok = true;
  console.log(`🔎 Verifying ${Object.keys(snap.files).length} files from snapshot ${snap._updatedAt || ''}\n`);
  for (const [f, meta] of Object.entries(snap.files)) {
    const p = path.resolve(process.cwd(), f);
    if (!fs.existsSync(p)) {
      console.error(`❌ Missing file: ${f}`);
      ok = false;
      continue;
    }
    const cur = sha256(p);
    if (cur !== meta.hash) {
      console.error(`❌ Hash mismatch: ${f}\n   snapshot=${meta.hash}\n   current =${cur}`);
      ok = false;
    } else {
      console.log(`✅ OK: ${f}`);
    }
  }
  if (!ok) {
    console.error('\n❌ Verification failed. Refuse to proceed to protect stable entity UIs.');
    process.exit(2);
  }
  console.log('\n✅ All protected files match snapshots.');
}

// CLI

const args = process.argv.slice(2);
const cmd = args[0];

// Accept BOTH "--files=a,b,c" and "--files a,b,c" forms for convenience          // inline-review
function getArg(name) {
  const withEq = args.find(a => a.startsWith(`--${name}=`));
  if (withEq) return withEq.split('=').slice(1).join('=');
  const idx = args.findIndex(a => a === `--${name}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return '';
}
const filesArg = getArg('files');

if (cmd === 'snapshot') {
  // Parse list once; accept both --files=... and "--files ..." forms              // inline-review
  const files = parseFileList(filesArg);
  if (!files.length) {
    console.error('❌ Provide files: snapshot --files src/App.js,src/Sidebar.js,...');
    console.error('   (You can also use the space form: --files src/App.js,src/Sidebar.js)');
    process.exit(1);
  }
  snapshot(files);
} else if (cmd === 'verify') {

  verify();
} else {
  console.log(`Usage:
  node scripts/entity-guard.js snapshot --files src/App.js,src/Sidebar.js,src/DataEntryForm.js,src/ChangeEntity.js,src/DataSchemas.js,src/ListDataView.js
  node scripts/entity-guard.js verify
`);
}
// ─────────────────────────────────────────────────────────────────────────────