*** Begin Patch
*** Add File: docs/AssistantPatchWorkflow.md
+# Assistant Patch Workflow (Always-Current Source Enforcement)
+
+> Goal: make sure diffs from “Steve’s Secure Multitenant Reviewer” are **always generated against your latest files**, so red (−) lines actually match what you have.
+
+## What we’ll do on every patch
+
+1. **You upload the current file(s).**  
+2. I compute and include a **BASE HASH** (SHA‑256) for each file in the patch header.  
+3. You (optionally) run `node scripts/patch-verify.js` to confirm your on‑disk files match the **BASE HASH** before applying.
+4. If hashes mismatch, I’ll re‑request the file(s) and regenerate the diff.
+
+## Patch header format (example)
+
+```text
+### PATCH-METADATA
+file: src/ListDataView.js
+base-sha256: 0c2a5a10b2b3baf5f5c7a2b0c3e47c191abf2f6f2d0f0c3f3a8d1b33e6d2c4aa
+generated-at: 2025-08-19T13:37:00Z
+tenant-aware: true
+### END-PATCH-METADATA
+```
+
+- `base-sha256` = hash of the **exact file version you uploaded**.  
+- If your local file’s hash differs, do **not** apply the patch; upload the current file and I’ll refresh the diff.
+
+## Verifying before apply
+
+```bash
+node scripts/patch-verify.js src/ListDataView.js 0c2a5a10b2b3baf5f5c7a2b0c3e47c191abf2f6f2d0f0c3f3a8d1b33e6d2c4aa
+```
+
+If it prints ✅, you’re safe to apply. If ❌, re-upload the file and I’ll regenerate.
+
+## Why hashes (and not line numbers)?
+
+- Line numbers drift fast. Hashing the base file makes **mismatches obvious** before you apply.  
+- You can commit the patch metadata into PR comments for CI to verify.
+
+---
+
+## Optional: CI Gate (recommended)
+
+- Add a CI step to run `patch-verify.js` for each file in a patch.  
+- Fail the pipeline if any base hash mismatches.  
+- This enforces “always-current source” across the team.
+
+---
+
+## FAQs
+
+- **What if I edited the file after uploading to you?**  
+  Re-upload the new file; I’ll rehash and regenerate the diff.
+
+- **Can we avoid re-uploads entirely?**  
+  Not reliably. Correct diffs require the **exact** source the patch targets.
+
+---
+
+**Security & Multitenancy notes**  
+- Hash headers don’t include secrets.  
+- We’ll continue to call out `tenantId`, `orgId`, `workspaceId` fields explicitly in patches.  
+- Use this flow for every collection UI change (Add/Change/List) so sensitive-field handling stays consistent across tenants.
+
*** End Patch
