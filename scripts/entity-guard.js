/* eslint-env node */
"use strict";

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

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// NEW: simple recursive directory expansion (so you can keep a JSON file of “protected” paths)        // inline-review
const DEFAULT_EXTS = new Set([".js", ".jsx", ".ts", ".tsx"]); // inline-review

const SNAPSHOT_FILE = path.resolve(process.cwd(), ".entity-snapshots.json");

function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function loadSnapshot() {
  if (!fs.existsSync(SNAPSHOT_FILE)) return {};
  return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));
}

function saveSnapshot(obj) {
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function parseFileList(arg) {
  if (!arg) return [];
  return String(arg)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listFilesRecursively(root, acc = []) {
  // Only include source files (JS/TS) by default to keep snapshots focused on UI code                  // inline-review
  for (const entry of fs.readdirSync(root)) {
    const p = path.join(root, entry);
    if (isDir(p)) listFilesRecursively(p, acc);
    else if (DEFAULT_EXTS.has(path.extname(p))) acc.push(p);
  }
  return acc;
}

function loadFileListJson(filePath) {
  if (!filePath) return [];
  const abs = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(abs)) {
    console.error(`❌ filelist not found: ${filePath}`);
    process.exit(1);
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (e) {
    console.error(`❌ invalid JSON in ${filePath}: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(raw)) {
    console.error(`❌ ${filePath} must be an array of strings (paths).`);
    process.exit(1);
  }
  return raw.map(String);
}

function expandEntries(entries) {
  // Accept files and directories; expand directories recursively.                                      // inline-review
  const out = new Set();
  for (const rel of entries) {
    const abs = path.resolve(process.cwd(), rel);
    if (!fs.existsSync(abs)) {
      console.error(`❌ Not found: ${rel}`);
      process.exitCode = 2;
      continue;
    }
    if (isDir(abs)) {
      for (const f of listFilesRecursively(abs)) {
        out.add(path.relative(process.cwd(), f).replace(/\\/g, "/"));
      }
    } else {
      out.add(path.relative(process.cwd(), abs).replace(/\\/g, "/"));
    }
  }
  return Array.from(out);
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
  console.log(
    `\n✅ Snapshot updated in ${path.relative(process.cwd(), SNAPSHOT_FILE)}`
  );
}

function verify() {
  const snap = loadSnapshot();
  if (!snap.files || !Object.keys(snap.files).length) {
    console.error(
      "❌ No snapshots found. Run: node scripts/entity-guard.js snapshot --files <list>"
    );
    process.exit(1);
  }
  let ok = true;
  console.log(
    `🔎 Verifying ${Object.keys(snap.files).length} files from snapshot ${
      snap._updatedAt || ""
    }\n`
  );
  for (const [f, meta] of Object.entries(snap.files)) {
    const p = path.resolve(process.cwd(), f);
    if (!fs.existsSync(p)) {
      console.error(`❌ Missing file: ${f}`);
      ok = false;
      continue;
    }
    const cur = sha256(p);
    if (cur !== meta.hash) {
      console.error(
        `❌ Hash mismatch: ${f}\n   snapshot=${meta.hash}\n   current =${cur}`
      );
      ok = false;
    } else {
      console.log(`✅ OK: ${f}`);
    }
  }
  if (!ok) {
    console.error(
      "\n❌ Verification failed. Refuse to proceed to protect stable entity UIs."
    );
    process.exit(2);
  }
  console.log("\n✅ All protected files match snapshots.");
}

// CLI

const args = process.argv.slice(2);
const cmd = args[0];

// Accept BOTH "--files=a,b,c" and "--files a,b,c" forms for convenience          // inline-review
function getArg(name) {
  const withEq = args.find((a) => a.startsWith(`--${name}=`));
  if (withEq) return withEq.split("=").slice(1).join("=");
  const idx = args.findIndex((a) => a === `--${name}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return "";
}
const filesArg = getArg("files");
const fileListArg = getArg("filelist"); // NEW: point to JSON array of protected files/dirs            // inline-review

if (cmd === "snapshot") {
  // Build the protected set from JSON (--filelist) and/or inline list (--files).                       // inline-review
  const fromJson = fileListArg ? loadFileListJson(fileListArg) : [];
  const fromArg = parseFileList(filesArg);
  const combined = expandEntries([...new Set([...fromJson, ...fromArg])]);
  if (!combined.length) {
    console.error("❌ Provide protected paths via:");
    console.error("   - snapshot --filelist scripts/protected-files.json");
    console.error("   - snapshot --files src/App.js,src/Sidebar.js");
    console.error("   - or both (they will be merged).");
    process.exit(1);
  }
  snapshot(combined);
} else if (cmd === "verify") {
  verify();
} else {
  console.log(`Usage:
  node scripts/entity-guard.js snapshot --filelist scripts/protected-files.json
  node scripts/entity-guard.js snapshot --files src/App.js,src/Sidebar.js
  node scripts/entity-guard.js snapshot --filelist scripts/protected-files.json --files src/extra.js
  node scripts/entity-guard.js verify
`);
}
// ─────────────────────────────────────────────────────────────────────────────
