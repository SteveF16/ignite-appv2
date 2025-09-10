import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from "react";
import {
  collection,
  onSnapshot,
  query,
  where, // Add this import
  deleteDoc,
  doc,
} from "firebase/firestore";
import { FirebaseContext } from "./AppWrapper";
import { getAppId } from "./IgniteConfig"; // centralized app id
import { Edit, Trash2, Download } from "lucide-react";
import ChangeEntity from "./ChangeEntity"; // use unified editor instead of legacy inline form
import { CollectionSchemas } from "./DataSchemas";
// Centralize collection ids & per-tenant paths (prevents casing drift like invoiceTemplates vs invoicetemplates) // inline-review
import { collectionIdForBranch, tenantCollectionPath } from "./collectionNames"; // inline-review

// Helper: presentable label from a collection key (e.g., "invoiceTemplates" → "Invoice Templates")   // inline-review
const labelFromCollectionKey = (key) =>
  String(key || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

// ---------------------------------------------------------------------------
// Render helpers
//  - Pretty prints Firestore Timestamps
//  - Truncates long cells with a tooltip (title attr)
//  - Formats known nested shapes (e.g., Customers.contacts.primary)
// ---------------------------------------------------------------------------
// CSV helpers ---------------------------------------------------------------
// Escapes quotes and wraps each value in quotes for RFC-4180–style CSV.
const toCsvCell = (val) => {
  // NOTE: removed unused `key` param to satisfy eslint(no-unused-vars).
  // Keep this helper focused on escaping & quoting the provided value.
  const safe = val === undefined || val === null ? "" : String(val);
  return `"${safe.replace(/"/g, '""')}"`; // <-- escape inner quotes
};

const renderValue = (value, key) => {
  if (value && typeof value === "object") {
    // Firestore Timestamp -> Date string
    if (typeof value.toDate === "function") {
      const dateObj = value.toDate();
      return dateObj.toLocaleString();
    }
    // Known nested: Customers.contacts.primary -> "First Last (email, phone)"
    if (key === "primaryContact" && value) {
      const first = value.firstName || "";
      const last = value.lastName || "";
      const email = value.email || "";
      const phone = value.phone || "";
      return `${[first, last].filter(Boolean).join(" ")}${
        email || phone ? " (" : ""
      }${[email, phone].filter(Boolean).join(", ")}${
        email || phone ? ")" : ""
      }`;
    }
    // Generic nested object → compact JSON
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return value !== undefined && value !== null ? String(value) : "";
};

// Props:
//   branch       → UI label context (e.g., "Customers", "Invoices") for headings/breadcrumbs
//   collectionKey→ canonical collection id (e.g., "customers", "invoiceTemplates"); if omitted, we derive from branch
const ListDataView = ({
  branch,
  collectionKey: collectionKeyProp,
  navTick,
}) => {
  // navTick forces a refresh when user re-presses "List ..."
  const { db, tenantId } = useContext(FirebaseContext);
  const [data, setData] = useState([]); // raw firestore rows
  const [viewData, setViewData] = useState([]); // shaped rows for table/CSV
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);

  // Sorting state – seeded from schema.defaultSort
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  // 🔄 Unified nav/listener effect
  // When the user navigates (Change → List), **first** leave edit mode, **then**
  // wire exactly one Firestore listener for the list. This removes the previous
  // race between two effects (one clearing editItem, one subscribing), which in
  // StrictMode could subscribe and immediately unsubscribe before data arrived.
  useEffect(() => {
    // 1) Always leave edit mode on branch change so the table renders.
    console.log(
      "ListDataView: STEVE- NAV change → leaving edit mode & (re)subscribing",
      { branch, navTick }
    );

    setEditItem(null);

    // 2) Guard prerequisites.
    if (!db || !tenantId || !branch) {
      console.debug(
        "ListDataView: Skipping subscribe — missing db/tenantId/branch"
      );
      setLoading(false);
      return;
    }

    // 3) Build query scoped to tenant + collection.
    const appId = getAppId(); // no globals/env scatter

    // ✅ Resolve a canonical collection key & per-tenant path from a single source of truth
    // Prefer explicit collectionKey prop; otherwise derive from branch label.                            // inline-review
    const branchLabel = String(branch || "").replace(/^List\s+/i, ""); // UI label, no "List " prefix
    const collectionKey =
      collectionKeyProp || collectionIdForBranch(branchLabel); // e.g., "customers", "invoiceTemplates"
    const collectionPath = tenantCollectionPath({
      appId,
      tenantId,
      key: collectionKey,
    });

    console.info("[list] STEVE- Resolved path (centralized)", {
      branch,
      branchLabel,
      collectionKey,
      collectionPath,
    });

    const q = query(
      collection(db, collectionPath),
      where("tenantId", "==", tenantId)
    );

    // 4) Subscribe once; protect setState against StrictMode double-invoke.
    setLoading(true);
    let cancelled = false;
    console.log(`ListDataView: STEVE- Subscribing to '${collectionPath}'`);
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (cancelled) return; // ignore late emissions after cleanup
        const fetchedData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(fetchedData);
        setLoading(false);
        console.log(
          `ListDataView: STEVE- Snapshot received for '${collectionPath}' (${fetchedData.length} rows)`
        );
      },
      (error) => {
        if (cancelled) return;
        console.error("ListDataView STEVE- onSnapshot error", error);
        setLoading(false);
      }
    );

    // 5) Single cleanup path.
    return () => {
      cancelled = true;
      console.log(
        `ListDataView: Cleanup → unsubscribing from '${collectionPath}'`
      );
      unsubscribe();
    };
  }, [db, tenantId, branch, navTick]); // include navTick so re-pressing "List ..." resets and resubscribes

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Download CSV function is added here
  // ── Column visibility & order (simple UX for step 1; drag/drop can come later)
  const [columns, setColumns] = useState([]); // [{ key, visible }]
  //const [expandedRowId, setExpandedRowId] = useState(null); // detail expander per row

  // Flatten/derive row values for list readability.
  // NOTE: We purposely avoid leaking sensitive fields here (see schema.excludes).
  const shapeForList = useCallback(
    (rawRows) => {
      // Schema tables are keyed by Capitalized name (e.g., "Customers", "InvoiceTemplates")             // inline-review
      const schemaKey = collectionKeyProp
        ? collectionKeyProp.charAt(0).toUpperCase() + collectionKeyProp.slice(1)
        : branch.replace("List ", "");
      const colSchema = CollectionSchemas?.[schemaKey];

      const exclude = new Set(colSchema?.list?.exclude || []);
      if (!rawRows?.length) return [];

      // Customers: derive readable fields from nested objects
      if (schemaKey === "Customers") {
        return rawRows.map((row) => {
          const shaped = {
            id: row.id,
            customerNbr: row.customerNbr,
            name1: row.name1,
            name2: row.name2,
            name3: row.name3,
            status: row.status,
            // Primary contact rendered separately via renderValue("primaryContact")
            primaryContact: row.contacts?.primary || null,
            // Billing address (1-liner)
            billingAddress: [
              row.billing?.address?.line1,
              row.billing?.address?.line2,
              row.billing?.address?.city,
              row.billing?.address?.state,
              row.billing?.address?.postalCode,
              row.billing?.address?.country,
            ]
              .filter(Boolean)
              .join(", "),
            // Credit controls (unify on new `credit.*` shape; keep legacy fallback)
            creditLimit: row.credit?.limit ?? row.billing?.creditLimit ?? "",
            onCreditHold:
              row.credit?.onHold ?? row.billing?.onCreditHold ? "Yes" : "No",
            paymentTerms: row.billing?.paymentTerms ?? "",
            // Timestamps
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          };
          // Remove excluded keys defensively
          for (const k of exclude) delete shaped[k];
          return shaped;
        });
      }
      // Default: shallow copy and drop excluded keys
      return rawRows.map((row) => {
        const shaped = { ...row };
        for (const k of exclude) delete shaped[k];
        return shaped;
      });
    },
    [branch, collectionKeyProp]
  );

  const deriveColumns = (rows) => {
    if (!rows.length) return [];
    // Hide metadata; the shaper already removed sensitive/audit fields
    const keys = Object.keys(rows[0]).filter(
      (k) => k !== "id" && k !== "tenantId"
    );
    return keys.map((k) => ({ key: k, visible: true }));
  };

  useEffect(() => {
    // Whenever data changes, shape rows for display and recompute columns
    const shaped = shapeForList(data);
    setViewData(shaped); // keep raw data separate to avoid loops
    setColumns((prev) => {
      const next = deriveColumns(shaped);
      if (!prev.length) return next;
      const asMap = new Map(prev.map((c) => [c.key, c]));
      return next.map((c) => asMap.get(c.key) || c);
    });
  }, [data, shapeForList]);

  // Initialize sort from the schema for this branch/collection (no global listCfg).
  useEffect(() => {
    if (sortKey) return;
    const schemaKey = collectionKeyProp
      ? collectionKeyProp.charAt(0).toUpperCase() + collectionKeyProp.slice(1)
      : branch.replace("List ", "");
    const ds = CollectionSchemas?.[schemaKey]?.list?.defaultSort;

    if (ds?.key) {
      setSortKey(ds.key);
      setSortDir(ds.dir === "desc" ? "desc" : "asc");
    }
  }, [branch, collectionKeyProp, sortKey]); // keep deps small to avoid re-initializing on every render

  // Safe getter for nested paths like "billing.address.city"
  const getByPath = (obj, path) => {
    if (!obj || !path) return undefined;
    return path
      .split(".")
      .reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
  };

  // Compare two values (numbers, strings, booleans, dates, timestamps)
  const cmp = (a, b) => {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    // Firestore Timestamp or Date support
    const ax = typeof a?.toDate === "function" ? a.toDate() : a;
    const bx = typeof b?.toDate === "function" ? b.toDate() : b;
    if (typeof ax === "number" && typeof bx === "number") return ax - bx;
    if (ax instanceof Date && bx instanceof Date) return ax - bx;
    return String(ax).localeCompare(String(bx), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  };

  // Derive sorted rows from viewData
  const sortedRows = useMemo(() => {
    if (!Array.isArray(viewData) || viewData.length === 0) return [];
    if (!sortKey) return viewData;
    const copy = [...viewData];
    copy.sort((r1, r2) => {
      const v1 = getByPath(r1, sortKey);
      const v2 = getByPath(r2, sortKey);
      const c = cmp(v1, v2);
      return sortDir === "desc" ? -c : c;
    });
    return copy;
  }, [viewData, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (!key) return;
    // click same header to flip direction, new header resets to asc
    setSortKey((prevKey) => (prevKey === key ? prevKey : key));
    setSortDir((prevDir) =>
      sortKey === key ? (prevDir === "asc" ? "desc" : "asc") : "asc"
    );
  };

  // end of sortable routines

  // Download CSV respects current column visibility  schema-level CSV exclusions
  const handleDownloadCSV = () => {
    // guard: nothing to export
    if (!Array.isArray(viewData) || viewData.length === 0) return;

    // derive config
    const schemaKey = collectionKeyProp
      ? collectionKeyProp.charAt(0).toUpperCase() + collectionKeyProp.slice(1)
      : branch.replace("List ", "");
    const colSchema = CollectionSchemas?.[schemaKey];
    const excludeCsv = new Set(colSchema?.csv?.exclude || []); // <- from schema

    // build header list from currently visible columns (minus excluded)
    const headers = columns
      .filter((c) => c.visible && !excludeCsv.has(c.key))
      .map((c) => c.key);

    // build row lines
    const lines = viewData.map((row) =>
      headers
        .map((h) => toCsvCell(renderValue(row[h], h))) // <- render formatting + escape (param removed)
        .join(",")
    );

    // compose CSV (prepend header row)
    const csv = [headers.join(","), ...lines].join("\n");

    // trigger browser download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);

    const fileKey = collectionKeyProp || collectionIdForBranch(branch);
    a.download = `${String(fileKey).toLowerCase()}_export.csv`; // consistent filename

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // free memory for long sessions
    URL.revokeObjectURL(a.href);
  };

  // Fetch data from Firestore
  // - Use onSnapshot for real-time updates
  // useEffect(() => {  STEVE THIS CODE was 2 listners fighting each other!!!
  // 🔁 (Removed) The old subscribe effect lived here and fought the edit-mode effect.

  // 🎯 Re-introduce edit handler used by the ACTIONS column
  // (line ~471 calls: onClick={() => handleEdit(item)} )
  const handleEdit = (item) => {
    console.log("ListDataView: edit click → entering edit mode", {
      id: item?.id,
    });
    setEditItem(item); // this toggles the component from list/table view → edit form
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !db || !tenantId) return;
    try {
      // Use the same centralized mapping for deletes so list/edit/delete are always in the same collection // inline-review
      const appId = getAppId();
      const branchLabel = String(branch || "").replace(/^List\s+/i, "");
      const key = collectionKeyProp || collectionIdForBranch(branchLabel);
      const path = tenantCollectionPath({
        appId,
        tenantId,
        key,
      });
      const docRef = doc(db, path, itemToDelete.id);

      await deleteDoc(docRef);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error removing document: ", error);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false); // single close call is enough
    setItemToDelete(null);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Unified editor: render ChangeEntity instead of the legacy DataEntryForm.
  // This keeps a single edit surface (same as the Sidebar → Change Customer).
  // If user clicked Edit, render the standardized ChangeEntity (deep‑linked)
  if (editItem) {
    // Use schemaKey derived from collectionKey so templates/invoices work even when branch is generic ("Invoices")  // inline-review
    const schemaKey = collectionKeyProp
      ? collectionKeyProp.charAt(0).toUpperCase() + collectionKeyProp.slice(1)
      : branch.replace("List ", "");
    const uiLabel = labelFromCollectionKey(
      collectionKeyProp || collectionIdForBranch(branch)
    );
    return (
      <ChangeEntity
        entityLabel={uiLabel}
        collectionName={collectionKeyProp || collectionIdForBranch(branch)}
        schema={CollectionSchemas?.[schemaKey]}
        initialDocId={editItem.id} /* open the exact row the user clicked */
        // ✅ Let the Change screen bring us back to the list without extra clicks
        onCancel={() => setEditItem(null)} // Cancel button returns to list
        onSaved={() => setEditItem(null)} // After save, return to list (optional UX)
        key={`edit:${schemaKey}:${editItem.id}`} // force a clean editor mount per row
      />
    );
  }

  if (viewData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No data found for {branch.replace("List ", "")}.</p>
        <p>
          Add new records using the {`Add ${branch.replace("List ", "")}`}{" "}
          option in the sidebar.
        </p>
      </div>
    );
  }

  // Determine the headers dynamically from the SHAPED rows (what the table actually renders)
  // Using `viewData` keeps headers aligned with the visible/derived columns.
  const headers =
    viewData.length > 0
      ? Object.keys(viewData[0]).filter(
          (key) => key !== "id" && key !== "tenantId"
        )
      : [];

  return (
    // Keep outer padding only; let the scroll container own the gray background
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          {labelFromCollectionKey(
            collectionKeyProp || collectionIdForBranch(branch)
          )}{" "}
          Records
        </h2>
        <button
          onClick={handleDownloadCSV}
          className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors shadow-md"
        >
          <Download size={20} />
          <span>Download CSV</span>
        </button>
      </div>
      {/* Scroll region — background travels with horizontal scroll (no “cut off” edge) */}
      <div className="overflow-x-auto rounded-2xl shadow-sm border border-gray-200 bg-gray-50">
        <table className="min-w-[1200px] w-full divide-y divide-gray-200 table-sticky">
          {/* Sticky header so labels remain visible while scrolling */}
          <thead className="bg-gray-100">
            <tr>
              {headers.map((header) => {
                const isActive = sortKey === header;
                const label = header.replace(/([A-Z])/g, " $1").trim();
                return (
                  <th
                    key={header}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(header)}
                      className="inline-flex items-center gap-1 hover:text-gray-900"
                      title={`Sort by ${label}`}
                    >
                      <span>{label}</span>
                      {isActive && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </button>
                  </th>
                );
              })}

              <th
                scope="col"
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedRows.map((item) => (
              <tr key={item.id} className="hover:bg-gray-100 transition-colors">
                {headers.map((header) => (
                  <td
                    key={header}
                    className="px-6 py-4 text-sm text-gray-800 max-w-[320px] truncate"
                    title={String(renderValue(item[header], header))}
                  >
                    {renderValue(item[header], header)}
                  </td>
                ))}

                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-indigo-600 hover:text-indigo-900 transition-colors"
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* This delete confirmation modal is new */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative p-8 bg-white w-96 rounded-lg shadow-xl">
            <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
            <p className="mb-6">
              Are you sure you want to delete this item? This action cannot be
              undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListDataView;
