*** Begin Patch
*** Add File: README-scripts.md
# Operational Guardrails for Ignite (Customers-first)

This doc shows **exactly when and how to run the local guard scripts** so we don’t accidentally break the stable **Customers** UI/data while adding new entities (Employees, Vendors, Assets, …), even if a future chat starts fresh in GPT.

---

## TL;DR Flow (VS Code-friendly)

1) **Snapshot current stable Customer UI** (run once whenever you stabilize Customers):
```bash
npm run entity:snapshot
```
This records SHA‑256 hashes of key UI files in `.entity-snapshots.json`.  <!-- audit baseline -->

2) **Before working on a new entity** (Employees/Vendors/Assets, etc.):
```bash
npm run entity:verify
```
If any protected file differs from the snapshot, the command **fails** so you can re‑sync or review before continuing.  <!-- regression catch -->

3) **After you intentionally improve Customers UI**:
```bash
npm run entity:snapshot
```
This updates the baseline to the new good state.  <!-- refresh baseline -->

---

## What each script does

### 1) `scripts/entity-guard.js`
- **snapshot**: hashes key files and saves them to `.entity-snapshots.json`.
- **verify**: compares current hashes to the snapshot; **fails** if anything drifted.

**Protected files** (config in `package.json` script):
- `src/App.js`, `src/Sidebar.js`, `src/DataEntryForm.js`, `src/ChangeEntity.js`, `src/DataSchemas.js`, `src/ListDataView.js`

> You can change the protected set in the `entity:snapshot` script in `package.json`.

### 2) `scripts/patch-verify.js`
Verifies a single file’s SHA‑256 (useful during chat-driven patches to ensure we’re operating on the **exact** file the patch was built against).
```bash
node scripts/patch-verify.js src/ListDataView.js <expected_sha256>
```

### 3) `scripts/removeCreatedAt.js` (optional one-off)
Backfill tool to **remove** `createdAt` from Firestore across tenants/collections (we removed `createdAt` from UI & new writes). Default is **dry-run**:
```bash
node scripts/removeCreatedAt.js --appId=default-app-id
node scripts/removeCreatedAt.js --appId=default-app-id --apply
node scripts/removeCreatedAt.js --appId=default-app-id --tenantId=<TENANT> --collections=customers,employees --apply
```
> Requires `firebase-admin` credentials via `GOOGLE_APPLICATION_CREDENTIALS` or `gcloud auth application-default login`.

---

## VS Code integration

The repo contains a `tasks.json` with two tasks:
- **Entity: Snapshot** → runs `npm run entity:snapshot`
- **Entity: Verify** → runs `npm run entity:verify`

Open the VS Code Command Palette → “**Tasks: Run Task**” → pick the guard you want.  <!-- easy workflow -->

---

## GitHub CI (protect in PRs)

CI workflow `.github/workflows/entity-verify.yml` runs on every push/PR:
1) `npm ci`
2) `npm run entity:verify`  <!-- blocks regressions -->
3) `npm run lint`

This ensures no one can merge a change that breaks the protected Customers UI files without explicitly updating the snapshot.

---

## When starting a **new GPT chat**

Paste this short reminder as your first message to the assistant:
```
Please verify we’re on the current source baseline:
1) I will run `npm run entity:verify` locally and paste the result.
2) Only propose patches **after** verification passes.
3) If verification fails, ask me to re-upload the changed file(s) and rebuild the patch from my uploads—do not guess old lines.
```

This keeps the assistant aligned with your **current** files and prevents line‑mismatch patches.

---

## FAQ

**Q: I improved Customers UI intentionally. `entity:verify` fails now.**
> Re-run `npm run entity:snapshot` to update the baseline after reviewing the diffs. Commit the updated `.entity-snapshots.json`.

**Q: Can I protect more files (e.g., ChangeEntity helpers)?**
> Yes. Edit the `entity:snapshot` script in `package.json` and add files. Re-run snapshot.

**Q: Where do I store my GitHub URL?**
> Not required for the guard scripts. If you want CI protection, push this repo to GitHub with the included workflow; it will run automatically on PRs.

---

## Security & Multi-tenant notes
- The guard stores **only hashes** (no code, no secrets).  <!-- safe -->
- Firestore write paths remain per-tenant: `artifacts/{appId}/tenants/{tenantId}/...` (your UI changes do not alter tenant isolation).
- When you later add Firestore Rules, enforce: auth required, `doc.tenantId == request.auth.token.tenantId` (row-level security), and deny writes to immutable audit fields.

*** End Patch
