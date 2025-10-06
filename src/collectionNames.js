// Centralized collection naming for the entire app.                                                // inline-review
// Keep ALL collection ids in one place to prevent casing drift like "invoiceTemplates" vs "invoicetemplates".
// Also provides helpers to build per-tenant Firestore paths consistently.
//
// Usage:
//   import { COLLECTIONS, tenantCollectionPath, collectionIdForBranch } from "./collectionNames";
//   const path = tenantCollectionPath({ appId, tenantId, key: COLLECTIONS.customers });
//
// Note: branch names are UI labels (e.g., "Customers", "InvoiceTemplates"),
// while collection ids are the exact Firestore collection ids (lowerCamelCase).                     // inline-review

export const COLLECTIONS = {
  customers: "customers",
  employees: "employees",
  assets: "assets",
  transactions: "transactions",
  invoices: "invoices",
  invoiceTemplates: "invoiceTemplates",
  expenses: "expenses",
  vendors: "vendors",
};

/** Map a sidebar branch label → collection id (Firestorm-safe string). */
export function collectionIdForBranch(branchLabel) {
  switch (String(branchLabel || "")) {
    case "Customers":
      return COLLECTIONS.customers;
    case "Employees":
      return COLLECTIONS.employees;
    case "Assets":
      return COLLECTIONS.assets;
    case "Finances":
      return COLLECTIONS.transactions;
    case "Expenses":
      return COLLECTIONS.expenses;
    case "Vendors":
      return COLLECTIONS.vendors;

    case "InvoiceTemplates":
      // Special virtual branch used by "List Templates" screen
      return COLLECTIONS.invoiceTemplates;
    case "Invoices":
      return COLLECTIONS.invoices;
    default:
      // Fallback: try lowercasing first letter & removing spaces (best-effort)
      return String(branchLabel || "")
        .replace(/\s/g, "")
        .replace(/^./, (c) => c.toLowerCase());
  }
}

/** Build the canonical per-tenant collection path. */
export function tenantCollectionPath({ appId, tenantId, key }) {
  if (!appId || !tenantId || !key)
    throw new Error("tenantCollectionPath: missing arg(s)"); // guard  // inline-review
  return `artifacts/${appId}/tenants/${tenantId}/${key}`;
}
