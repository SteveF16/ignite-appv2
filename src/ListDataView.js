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
  where,
  deleteDoc,
  doc,
  getDocs, // + one-shot fetch when realtime is paused
} from "firebase/firestore";
import { FirebaseContext } from "./AppWrapper";
import { getAppId, IgniteConfig } from "./IgniteConfig";
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

// ────────────────────────────────────────────────────────────────────────────
// Debug helper (enable with: window.__igniteDebugList = true)
function ldbg(...args) {
  try {
    if (typeof window !== "undefined" && window.__igniteDebugList) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  } catch {
    ("STEVE-Some Debugging Error has occurred");
  }
}

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

  // Stable id to force editor mount even if other effects touch editItem
  const [editItem, setEditItem] = useState(null);

  // Stable id to force editor mount even if other effects touch editItem
  const [editDocId, setEditDocId] = useState(null);
  const [realtime, setRealtime] = useState(true); // + live updates on/off

  // Track *why* realtime is off so we can show an idle banner only for auto-pauses.
  const [pausedReason, setPausedReason] = useState(null); // 'idle' | 'manual' | null
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Sorting state – seeded from schema.defaultSort
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  // Auto-pause realtime if the user is idle for a while; resume on activity.
  useEffect(() => {
    const idleMs = IgniteConfig.realtimePauseOnIdleMs;
    if (!idleMs) return; // disabled
    let lastActivity = Date.now();
    const markActive = () => {
      lastActivity = Date.now();
      // Let ChangeEntity know the app is active
      try {
        window.__igniteActive = true;
      } catch {
        ("STEVE- ChangeEntity should be active- ERROR!!");
      }

      if (!document.hidden && !realtime && pausedReason === "idle") {
        console.log("[list] idle → resume realtime");
        setRealtime(true);
        setPausedReason(null);
        setBannerDismissed(true); // hide banner after auto-resume
      }
    };
    const events = ["mousemove", "keydown", "click", "scroll", "focus"];
    events.forEach((ev) =>
      window.addEventListener(ev, markActive, { passive: true })
    );
    const check = () => {
      const idleFor = Date.now() - lastActivity;
      if (realtime && !document.hidden && idleFor >= idleMs) {
        console.log("[list] idle → pause realtime", { idleFor, idleMs });
        setRealtime(false);
        setPausedReason("idle");
        setBannerDismissed(false);

        // Mark app inactive while auto-paused
        try {
          window.__igniteActive = false;
        } catch {
          ("STEVE- ChangeEntity should be inactive- ERROR!!");
        }
      }
    };
    const t = window.setInterval(
      check,
      Math.min(Math.max(Math.floor(idleMs / 3), 1000), 15000)
    );
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, markActive));
      window.clearInterval(t);
    };
  }, [realtime, pausedReason]);

  // Pause realtime when the tab is hidden; resume when visible.
  useEffect(() => {
    const apply = () => {
      const visible = document.visibilityState === "visible";
      setRealtime(visible);
      if (visible) {
        setPausedReason(null);
        setBannerDismissed(true);
        try {
          window.__igniteActive = true;
        } catch {
          ("STEVE- ChangeEntity should be active- ERROR!!");
        }
      } else {
        // If hidden, treat as manual pause for banner purposes (no idle banner).
        setPausedReason("manual");
        try {
          window.__igniteActive = false;
        } catch {
          ("Steve- ChangeEntity should be inactive- ERROR!!");
        }
      }
    };
    document.addEventListener("visibilitychange", apply);
    apply(); // initialize on mount
    return () => document.removeEventListener("visibilitychange", apply);
  }, []);

  // One-shot fetch helper (used when realtime is paused or user presses Refresh)
  const fetchOnce = useCallback(async () => {
    if (!db || !tenantId || !branch) return;
    const appId = getAppId();
    const branchLabel = String(branch || "").replace(/^List\s+/i, "");
    const key = collectionKeyProp || collectionIdForBranch(branchLabel);
    const path = tenantCollectionPath({ appId, tenantId, key });
    const q = query(collection(db, path), where("tenantId", "==", tenantId));
    setLoading(true);
    try {
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setData(rows);
    } finally {
      setLoading(false);
    }
  }, [db, tenantId, branch, collectionKeyProp]);

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

    // leave edit mode on nav change
    setEditItem(null);
    setEditDocId(null);

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

    // 4) Either attach a realtime listener, or do a one-shot fetch if realtime is paused.
    let cancelled = false;
    if (!realtime) {
      (async () => {
        setLoading(true);
        try {
          const snap = await getDocs(q);
          if (cancelled) return;
          const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setData(fetched);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      // Nothing to clean up when paused.
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    console.log(`ListDataView: STEVE- Subscribing to '${collectionPath}'`);
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        if (cancelled) return;
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
  }, [db, tenantId, branch, navTick, realtime]); // + react to realtime toggle/visibility

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

  // 🎯 Edit handler used by the ACTIONS column
  // (onClick={() => handleEdit(item)})
  const handleEdit = (item) => {
    console.log("ListDataView: edit click → entering edit mode", {
      id: item?.id,
    });
    // Optional interactive breakpoint: enable with window.__igniteBreakOnEdit = true
    // eslint-disable-next-line no-unused-expressions
    // if (typeof window !== "undefined" && window.__igniteBreakOnEdit) debugger;

    setEditItem(item); // this toggles the component from list/table view → edit form
    setEditDocId(item?.id || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // Cash-flow summary (safe on any shape of rows)
  const renderCashFlowSummary = (rowsMaybe) => {
    const rows = Array.isArray(rowsMaybe) ? rowsMaybe : [];
    let income = 0,
      expense = 0,
      unreconciled = 0;
    rows.forEach((r) => {
      const type = (r.type || r?.data?.type || "").toString().toLowerCase();
      const amt = Number(r.amount ?? r?.data?.amount ?? 0) || 0;
      const rec = !!(r.reconciled ?? r?.data?.reconciled);
      if (type === "income") income += amt;
      if (type === "expense") expense += amt;
      if (!rec) unreconciled += type === "income" ? amt : -amt;
    });
    const net = income - expense;
    return (
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border shadow-sm">
          <div className="text-xs text-gray-500">Income</div>
          <div className="text-lg font-semibold">{income.toFixed(2)}</div>
        </div>
        <div className="p-3 rounded-lg border shadow-sm">
          <div className="text-xs text-gray-500">Expenses</div>
          <div className="text-lg font-semibold">{expense.toFixed(2)}</div>
        </div>
        <div className="p-3 rounded-lg border shadow-sm">
          <div className="text-xs text-gray-500">Net</div>
          <div className="text-lg font-semibold">{net.toFixed(2)}</div>
        </div>
        <div className="p-3 rounded-lg border shadow-sm">
          <div className="text-xs text-gray-500">Unreconciled</div>
          <div className="text-lg font-semibold">{unreconciled.toFixed(2)}</div>
        </div>
      </div>
    );
  };

  // Resolve a reliable collection key for conditional UI (e.g., transactions summary)
  const effectiveCollectionKey =
    collectionKeyProp ||
    collectionIdForBranch(String(branch || "").replace(/^List\s+/i, "")) ||
    "";

  // ────────────────────────────────────────────────────────────────────────────
  // Unified editor: render ChangeEntity instead of the legacy DataEntryForm.
  // This keeps a single edit surface (same as the Sidebar → Change Customer).
  // If user clicked Edit, render the standardized ChangeEntity (deep‑linked)
  if (editItem || editDocId) {
    // Use schemaKey derived from collectionKey so templates/invoices work even when branch is generic ("Invoices")  // inline-review
    const schemaKey = collectionKeyProp
      ? collectionKeyProp.charAt(0).toUpperCase() + collectionKeyProp.slice(1)
      : branch.replace("List ", "");
    const uiLabel = labelFromCollectionKey(
      collectionKeyProp || collectionIdForBranch(branch)
    );

    const initId = editDocId || editItem?.id || null;
    ldbg("[list→change] rendering ChangeEntity with", {
      initId,
      schemaKey,
      uiLabel,
      collection: collectionKeyProp || collectionIdForBranch(branch),
    });

    return (
      <ChangeEntity
        entityLabel={uiLabel}
        collectionName={collectionKeyProp || collectionIdForBranch(branch)}
        schema={CollectionSchemas?.[schemaKey]}
        initialDocId={initId}
        key={`edit:${schemaKey}:${initId}`}
        // ✅ Let the Change screen bring us back to the list without extra clicks

        onCancel={() => {
          setEditItem(null);
          setEditDocId(null);
        }}
        onSaved={() => {
          setEditItem(null);
          setEditDocId(null);
        }}
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
      {/* Idle pause banner (only when paused by IDLE and not dismissed) */}
      {!realtime && pausedReason === "idle" && !bannerDismissed && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              {IgniteConfig.idleBannerText ||
                "Realtime updates are paused due to inactivity to reduce Firestore reads. Click Resume to re-enable live updates."}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setRealtime(true);
                  setPausedReason(null);
                  setBannerDismissed(true);
                  // Optionally sync once on resume
                  fetchOnce();
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                Resume
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="px-3 py-1.5 rounded-lg bg-white border text-sm font-semibold hover:bg-gray-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          {labelFromCollectionKey(
            collectionKeyProp || collectionIdForBranch(branch)
          )}{" "}
          Records
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors shadow-md"
            title="Export current view to CSV"
          >
            <Download size={20} />
            <span>Download CSV</span>
          </button>
          <button
            onClick={() =>
              setRealtime((r) => {
                const next = !r;
                setPausedReason(next ? null : "manual");
                setBannerDismissed(false);
                return next;
              })
            }
            className={`px-3 py-2 rounded-lg font-semibold shadow-md ${
              realtime
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
            title={
              realtime
                ? "Realtime is ON (listens for changes)"
                : "Realtime is PAUSED (no background reads)"
            }
          >
            {realtime ? "Live" : "Paused"}
          </button>
          {!realtime && (
            <button
              onClick={fetchOnce}
              className="px-3 py-2 rounded-lg font-semibold shadow-md bg-white border hover:bg-gray-50"
              title="Fetch latest once"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Cash-flow summary (Transactions only) */}
      {effectiveCollectionKey === "transactions" &&
        renderCashFlowSummary(viewData)}

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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item);
                      }}
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
