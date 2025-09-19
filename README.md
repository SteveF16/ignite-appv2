\*\*\* a/README.md
--- b/README.md
@@

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
  +- [Invoices Module](#invoices-module) <!-- inline-review: reflect current development focus -->
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
+├── firebaseConfig.js          # Firebase web app init (keys managed outside VCS)                 <!-- inline-review -->
+├── IgniteConfig.js            # 🔸 single source of truth for appId (and future org/workspace)   <!-- inline-review -->
+├── collectionNames.js         # 🔸 canonical collection ids + tenantCollectionPath()             <!-- inline-review -->
+├── navMap.js                  # 🔸 navigation map (branch→collection), no special-casing         <!-- inline-review -->
+└── invoice/
+    ├── TemplateDesigner.js    # create invoice templates; uniqueness/validation + UX feedback    <!-- inline-review -->
+    ├── InvoiceEditor.js       # fill an invoice from a template; export PDF                      <!-- inline-review -->
+    └── pdf/
+        └── makeInvoicePdf.js  # jsPDF + autotable helper (package imports, not relative)         <!-- inline-review -->

scripts/
├── entity-guard.js            # snapshot/verify protected files
├── patch-verify.js            # check single file hash before patching
-└── removeCreatedAt.js         # optional one-off backfill to drop createdAt
+├── protected-files.json       # 🔸 list of guarded files/dirs (used by entity-guard)             <!-- inline-review -->
+└── removeCreatedAt.js         # optional one-off backfill to drop createdAt

+docs/
+└── zip-intake.md              # upload guidance for full-repo reviews (optional)                 <!-- inline-review -->


Core Screens
<!-- inline-review: Document the three standardized screens per entity -->

Add <Entity> – DataEntryForm.js

Change <Entity> – ChangeEntity.js (left: fields; right: audit panel)

List <Entity> – ListDataView.js (sticky header/sidebar, CSV export, paging)

Currently implemented: Customers (baseline), with placeholders for Employees, Vendors, Assets, Inventory, Transactions, Company Info.

+## Invoices Module
+<!-- inline-review: New section summarizing current workstream -->
+
+- TemplateDesigner: create and save reusable invoice templates (per-tenant).

Duplicate-name guard, robust error handling, and visible success state.

Uses canonical pathing via tenantCollectionPath({ appId: getAppId(), tenantId, key: COLLECTIONS.invoiceTemplates }).
+- InvoiceEditor: choose a template, enter line items, and Generate PDF using makeInvoicePdf.
+- PDF: jsPDF + jspdf-autotable imported from packages (no relative ../jspdf paths).
+<!-- inline-review: This documents decisions that remove confusion & drift -->

Entity Schemas
<!-- inline-review: Explain how DataSchemas.js drives Add/Change/List -->

DataSchemas.js declares fields and behaviors for each branch. Notable points:

All entities include five user-defined text fields: userField1..userField5. <!-- inline-review -->

Customers no longer store createdAt. We still stamp createdBy, updatedAt, updatedBy. <!-- inline-review -->

List views exclude sensitive items (e.g., SSN/tax IDs) from CSV and table by default.

Default sort is customerNbr asc for Customers; other entities can set meaningful defaults.

User-Defined Fields
<!-- inline-review: Make the flexibility explicit for all entities -->

Every entity exposes five optional text inputs labeled User Field 1–5. They persist with the document and appear on both Add and Change screens.

Guardrails (Protect Customers UI)
<!-- inline-review: Document the snapshot/verify flow that prevents regressions -->

-Snapshot the “golden” Customers UI files and verify before accepting patches or starting a new chat.
+Snapshot the “golden” UI files and verify before accepting patches or starting a new chat.

Snapshot (create/update baseline):

-npm run entity:snapshot
+npm run entity:snapshot


-This writes .entity-snapshots.json with SHA-256 hashes for protected files:
-src/App.js, src/Sidebar.js, src/DataEntryForm.js, src/ChangeEntity.js, src/DataSchemas.js, src/ListDataView.js, src/index.js, src/Register.js
+This writes .entity-snapshots.json with SHA-256 hashes for files listed in scripts/protected-files.json.
+Protected now includes core entity UIs and invoice/nav/config modules:
+src/App.js, src/Sidebar.js, src/DataEntryForm.js, src/ChangeEntity.js, src/DataSchemas.js,
+src/ListDataView.js, src/index.js, src/Register.js, src/collectionNames.js, src/navMap.js,
+src/IgniteConfig.js, src/invoice/TemplateDesigner.js, src/invoice/InvoiceEditor.js, src/invoice/pdf/makeInvoicePdf.js
+<!-- inline-review: Aligns with current scripts/protected-files.json -->

Verify (before applying patches or starting work):

npm run entity:verify
CI / GitHub
<!-- inline-review: CI mirrors local guardrails; add branch protection guidance -->

Badge at top reflects the Entity UI Guard workflow status.

Workflow file: .github/workflows/entity-verify.yml

It runs on push/PR: npm ci, npm run entity:verify, npm run lint.

Add a branch protection rule to require the check to pass before merging.

Repo: https://github.com/SteveF16/ignite-appv2

Environment & Firebase Setup
<!-- inline-review: Clarify Firebase expectations and multitenant pathing -->

Create a Firebase project and enable Firestore and Authentication (Email/Password).

Add web app credentials in src/firebaseConfig.js (keep secrets out of source control).
-- App expects tenant-scoped paths: artifacts/{appId}/tenants/{tenantId}/{collection}.
-- AppWrapper.js supplies FirebaseContext with { appId, tenantId, db, user }.
+- App expects tenant-scoped paths: artifacts/{appId}/tenants/{tenantId}/{collection}.
+- App ID is resolved centrally via IgniteConfig.getAppId(); do not hardcode.

Optionally inject at runtime for each environment:

Scripts
<!-- inline-review: Surface the key npm scripts as source-of-truth -->

// package.json (excerpt)
{
 "scripts": {
   "start": "react-scripts start",
   "build": "react-scripts build",
   "lint": "eslint src --ext .js,.jsx",
   "patch:verify": "node scripts/patch-verify.js",
-    "entity:snapshot": "node scripts/entity-guard.js snapshot --files=src/App.js,src/Sidebar.js,src/DataEntryForm.js,src/ChangeEntity.js,src/DataSchemas.js,src/ListDataView.js,src/index.js,src/Register.js",
+    "entity:snapshot": "node scripts/entity-guard.js snapshot --filelist scripts/protected-files.json", // 🔸 use filelist
   "entity:verify": "node scripts/entity-guard.js verify",
+    "entity:refresh": "npm run -s entity:snapshot && npm run -s entity:verify",                         // convenience
   "guard:snapshot": "npm run entity:snapshot",
   "guard:verify": "npm run entity:verify",
   "prepare": "husky"
 }
}


One-off Firestore backfill (optional)

Remove createdAt field across tenants/collections (dry-run by default):

node scripts/removeCreatedAt.js --appId=default-app-id
node scripts/removeCreatedAt.js --appId=default-app-id --apply


Contributing
<!-- inline-review: Standard OSS flow tailored to this repo -->

Fork and clone.

npm install

npm run entity:verify (should pass)

Create a feature branch; develop and test.
-5. If you intentionally change Customers UI, npm run entity:snapshot and commit .entity-snapshots.json.
+5. If you intentionally change a protected file, npm run entity:refresh and commit .entity-snapshots.json. <!-- inline-review -->

PR to main (Entity UI Guard lint must pass).

License

MIT
*** End Patch


## Multi-tenant considerations
- The README now explicitly documents `IgniteConfig.getAppId()` and the canonical `tenantCollectionPath({ appId, tenantId, key })`, reinforcing that every read/write is scoped by **tenantId** and **appId**. If/when you add **orgId**/**workspaceId**, you’ll update the helper once and the posture (row-level isolation, least privilege) remains intact.

## Security notes
- We call out Firestore rules assumptions and the protected-files workflow so accidental path/name drift (which can undermine **authorization**, **RBAC/ABAC**, and **Firestore rules**) is less likely.
- No secrets are added to the README. The example for injecting `window.__ignite.appId` is safe and intentionally environment-specific.

## Where this goes
- Save this patch to update `README.md`.
- Optionally run:


```
