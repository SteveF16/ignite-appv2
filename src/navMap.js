// Centralized navigation → collection mapping                                                       // inline-review
// Goal: remove special-cases from App.js by defining overrides here.
//
// Defaults:
//   - Most "List <Branch>" screens resolve to collectionIdForBranch(<Branch>) (see collectionNames.js)
//   - When a sub-branch needs a different collection (e.g., Invoices → "List Templates"),
//     declare it here so App.js can stay generic.

import { COLLECTIONS, collectionIdForBranch } from "./collectionNames";

// Key format is "<Branch>|<SubBranch>"
const NAV_LIST_COLLECTION = {
  // Invoices
  "Invoices|List Templates": COLLECTIONS.invoiceTemplates, // differs from branch "Invoices"
  "Invoices|List Invoices": COLLECTIONS.invoices,

  // Add more explicit overrides here if needed in the future.
};

/** Resolve the canonical collection key for a given branch/sub-branch. */
export function listCollectionKeyFor(branch, subBranch) {
  const explicit =
    NAV_LIST_COLLECTION[`${String(branch)}|${String(subBranch)}`];
  if (explicit) return explicit;
  // Fallback: derive from branch label ("Customers" → "customers", etc.)
  return collectionIdForBranch(branch);
}
