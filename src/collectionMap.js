
//*** Add File: src/collectionMap.js
// Centralized mapping between sidebar "branch" display names and Firestore collection ids.
// Keeping this in one place allows you to add 10–20 tables once and reuse across Add/List views.
// NOTE: Keys are the labels you show in the UI; values are the collection ids under each tenant.
export const BRANCH_TO_COLLECTION = {
  Customers: "customers",
  Employees: "employees",
  Assets: "assets",
  Finances: "transactions", // ← example; keep human label decoupled from collection id
  Vendors: "vendors",        // ← you can enable later by adding the sidebar item only
};

/**
 * Returns a Firestore collection id for a given sidebar branch label.
 * Falls back to a sensible snake-cased id so new branches won’t break the UI.
 */
export function getCollectionFromBranch(branchLabel) {
  if (!branchLabel) return "";
  if (BRANCH_TO_COLLECTION[branchLabel]) return BRANCH_TO_COLLECTION[branchLabel];
  // default: lower, replace spaces with underscores (safe fallback until schema is added)
  return String(branchLabel).trim().toLowerCase().replace(/\s/g, "_");
}


