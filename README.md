# Ignite App v2
<!-- inline-review: Promote the actual app name/version; remove CRA boilerplate -->

[![Entity UI Guard](https://github.com/SteveF16/ignite-appv2/actions/workflows/entity-verify.yml/badge.svg)](https://github.com/SteveF16/ignite-appv2/actions/workflows/entity-verify.yml)
<!-- inline-review: CI badge surfaces the Customers UI guardrail status -->

Ignite is an open-source business management tool built with **React** and **Firebase/Firestore** for managing customers, employees, vendors, assets, inventory, and transactions.
<!-- inline-review: Expanded overview to reflect multi-entity scope -->

---

## Table of Contents
<!-- inline-review: Add ToC so new contributors can navigate quickly -->
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Core Screens](#core-screens)
- [Entity Schemas](#entity-schemas)
- [Audit & Mutability](#audit--mutability)
- [User-Defined Fields](#user-defined-fields)
- [Guardrails (Protect Customers UI)](#guardrails-protect-customers-ui)
- [CI / GitHub](#ci--github)
- [Environment & Firebase Setup](#environment--firebase-setup)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

---

## Quick Start
<!-- inline-review: Replace CRA boilerplate with concrete steps used in this repo -->

```bash
npm install
npm start
```

App runs at http://localhost:3000.

---

## Project Structure
<!-- inline-review: Replace partial tree with current files and scripts -->

```
src/
├── App.js
├── AppWrapper.js              # provides FirebaseContext { appId, tenantId, db, user }
├── ChangeEntity.js            # generic edit screen with audit panel
├── DataEntryForm.js           # generic create screen
├── DataSchemas.js             # per-branch schema config (fields, list, csv)
├── ListDataView.js            # list/table view (paging, sort, CSV export)
├── Login.js
├── LogoutButton.js
├── Register.js
├── Sidebar.js                 # navigation; sticky on desktop
├── index.js
├── App.css
├── Sidebar.css
└── index.css

scripts/
├── entity-guard.js            # snapshot/verify protected files
├── patch-verify.js            # check single file hash before patching
└── removeCreatedAt.js         # optional one-off backfill to drop createdAt
```

---

## Core Screens
<!-- inline-review: Document the three standardized screens per entity -->

- **Add &lt;Entity&gt;** – `DataEntryForm.js`
- **Change &lt;Entity&gt;** – `ChangeEntity.js` (left: fields; right: audit panel)
- **List &lt;Entity&gt;** – `ListDataView.js` (sticky header/sidebar, CSV export, paging)

Currently implemented: **Customers** (baseline), with placeholders for **Employees, Vendors, Assets, Inventory, Transactions, Company Info**.

---

## Entity Schemas
<!-- inline-review: Explain how DataSchemas.js drives Add/Change/List -->

`DataSchemas.js` declares fields and behaviors for each branch. Notable points:

- All entities include **five user-defined text fields**: `userField1..userField5`. <!-- inline-review -->
- Customers no longer store `createdAt`. We still stamp **createdBy, updatedAt, updatedBy**. <!-- inline-review -->
- List views exclude sensitive items (e.g., SSN/tax IDs) from CSV and table by default.
- Default sort is `customerNbr` asc for Customers; other entities can set meaningful defaults.

---

## Audit & Mutability
<!-- inline-review: Centralize audit behavior so new entities follow the same rules -->

- Immutable across collections: **createdBy** (displayed), partition keys (**tenantId**, **appId**).
- On **create**: `createdBy`, `updatedBy = user.email|uid`, `updatedAt = serverTimestamp()`.
- On **update**: `updatedBy`, `updatedAt` restamped. Client-provided audit/partition fields are stripped before write.
- Audit panel in `ChangeEntity.js` shows: **Created By**, **Updated By**, **Updated At**.

---

## User-Defined Fields
<!-- inline-review: Make the flexibility explicit for all entities -->

Every entity exposes five optional text inputs labeled **User Field 1–5**. They persist with the document and appear on both Add and Change screens.

---

## Guardrails (Protect Customers UI)
<!-- inline-review: Document the snapshot/verify flow that prevents regressions -->

Snapshot the “golden” Customers UI files and verify before accepting patches or starting a new chat.

**Snapshot (create/update baseline):**
```bash
npm run entity:snapshot
```
This writes `.entity-snapshots.json` with SHA-256 hashes for protected files:
`src/App.js, src/Sidebar.js, src/DataEntryForm.js, src/ChangeEntity.js, src/DataSchemas.js, src/ListDataView.js, src/index.js, src/Register.js`

**Verify (before applying patches or starting work):**
```bash
npm run entity:verify
```
If it fails, re-sync or re-snapshot intentionally.

**Pre-commit hook (automatic):**
Husky runs `entity:verify`  `lint` on every commit and blocks if either fails.

---

## CI / GitHub
<!-- inline-review: CI mirrors local guardrails; add branch protection guidance -->

- **Badge** at top reflects the `Entity UI Guard` workflow status.
- Workflow file: `.github/workflows/entity-verify.yml`
- It runs on push/PR: `npm ci`, `npm run entity:verify`, `npm run lint`.
- Add a **branch protection rule** to require the check to pass before merging.

Repo: https://github.com/SteveF16/ignite-appv2

---

## Environment & Firebase Setup
<!-- inline-review: Clarify Firebase expectations and multitenant pathing -->

- Create a Firebase project and enable **Firestore** and **Authentication (Email/Password)**.
- Add web app credentials in `src/firebaseConfig.js` (keep secrets out of source control).
- App expects tenant-scoped paths: `artifacts/{appId}/tenants/{tenantId}/{collection}`.
- `AppWrapper.js` supplies `FirebaseContext` with `{ appId, tenantId, db, user }`.

---

## Scripts
<!-- inline-review: Surface the key npm scripts as source-of-truth -->

```jsonc
// package.json (excerpt)
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "lint": "eslint src --ext .js,.jsx",
    "patch:verify": "node scripts/patch-verify.js",
    "entity:snapshot": "node scripts/entity-guard.js snapshot --files=src/App.js,src/Sidebar.js,src/DataEntryForm.js,src/ChangeEntity.js,src/DataSchemas.js,src/ListDataView.js,src/index.js,src/Register.js",
    "entity:verify": "node scripts/entity-guard.js verify",
    "guard:snapshot": "npm run entity:snapshot",
    "guard:verify": "npm run entity:verify",
    "prepare": "husky"
  }
}
```

### One-off Firestore backfill (optional)
Remove `createdAt` field across tenants/collections (dry-run by default):
```bash
node scripts/removeCreatedAt.js --appId=default-app-id
node scripts/removeCreatedAt.js --appId=default-app-id --apply
```

Credentials: use `GOOGLE_APPLICATION_CREDENTIALS` or `gcloud auth application-default login`.

---

## Contributing
<!-- inline-review: Standard OSS flow tailored to this repo -->

1. Fork and clone.
2. `npm install`
3. `npm run entity:verify` (should pass)  
4. Create a feature branch; develop and test.
5. If you intentionally change Customers UI, `npm run entity:snapshot` and commit `.entity-snapshots.json`.
6. PR to `main` (Entity UI Guard  lint must pass).

---

## License

MIT

