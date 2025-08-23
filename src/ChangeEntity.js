import React, { useContext, useEffect, useMemo, useState } from "react"; // drop unused useRef to satisfy no-unused-vars  // inline-review
import { collection, 
  doc, 
  getDoc, 
  getDocs, 
  limit, 
  orderBy, 
  query, 
  updateDoc, 
  serverTimestamp } from "firebase/firestore"; // add serverTimestamp  

import { FirebaseContext } from "./AppWrapper"; // FIX: get context from AppWrapper, not firestore  // inline-review

// Generic, schema‑driven "Change <Entity>" editor for 10–20 tables.
// - search-as-you-type picker (client-filtered for now; server rules later)
// - locks immutable fields both visually and by stripping them from update payload
// - standardized Audit panel visible on all entities (createdAt/By, updatedAt/By)

// Prefer customerNbr (your canonical key) so default search finds the record.        // inline-review
const DEFAULT_SEARCH_KEYS = [
  "name1",
  "customerNbr",
  "email",
  "city",
  "state",
  "country",
]; // align with customers schema  // inline-review
const COMMON_IMMUTABLE = ["tenantId", "appId", "createdAt", "createdBy"]; // baseline immutables across all collections

export default function ChangeEntity({ entityLabel, collectionName, schema }) {
  const {
    db,
    tenantId,
    appId = "default-app-id",
    user,
  } = useContext(FirebaseContext);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [queryText, setQueryText] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Normalize schema helpers  // keep logic here so DataSchemas.js doesn't need immediate edits
  const fields = schema?.fields ?? []; // array of { path/key, label, type, edit, immutable? }  // inline-review
  const searchKeys = schema?.search?.keys?.length
    ? schema.search.keys
    : DEFAULT_SEARCH_KEYS; // per‑entity override
  const collectionImmutable = schema?.meta?.immutable ?? []; // per‑entity list
  const allImmutable = useMemo(
    () => Array.from(new Set([...COMMON_IMMUTABLE, ...collectionImmutable])),
    [collectionImmutable]
  );
  const defaultSort = schema?.list?.defaultSort || {
    key: searchKeys[0] || "name1",
    dir: "asc",
  }; // basic default

  //  const qRef = useRef(0); // used to ignore stale responses

  // Initial fetch (first 100, sorted); we filter client‑side for now
  useEffect(() => {
    let cancelled = false;
    async function fetchInitial() {
      if (!db || !tenantId || !collectionName) return;
      setLoading(true);
      try {
        const base = collection(
          db,
          `artifacts/${appId}/tenants/${tenantId}/${collectionName}`
        );
        const q = query(
          base,
          orderBy(defaultSort.key, defaultSort.dir === "desc" ? "desc" : "asc"),
          limit(100) // first 100 as requested
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setItems(list);
      } catch (e) {
        console.error("fetchInitial failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchInitial();
    return () => {
      cancelled = true;
    };
  }, [db, tenantId, appId, collectionName, defaultSort.key, defaultSort.dir]);

  // ──────────────────────────────────────────────────────────────────────────
  // Dot‑path helpers so nested schema paths (e.g. "billing.address.line1")
  // render and update correctly instead of appearing blank.
  // ──────────────────────────────────────────────────────────────────────────
  function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    if (path.indexOf(".") === -1) return obj[path];
    return path
      .split(".")
      .reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
  }
  function setByPath(obj, path, value) {
    if (!obj || !path) return;
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
  }

  // Consistent audit time rendering (supports Firestore Timestamp | Date | string)
  function formatWhen(v) {   // tolerate bad historic data (e.g., "steve")
    try {
      if (!v) return "";
      if (typeof v?.toDate === "function") return v.toDate().toLocaleString();
      if (v instanceof Date) return v.toLocaleString();
      if (typeof v === "number") return new Date(v).toLocaleString();
      if (typeof v === "string") return new Date(v).toLocaleString();
      return String(v);
    } catch {
      return "";  // show blank instead of "Invalid Date"
    }
  }

  // Client-side filter (debounced feel via onChange).
  const filtered = useMemo(() => {
    const t = queryText.trim().toLowerCase();
    if (!t) return items;
    return items.filter((it) => {
      return searchKeys.some((k) =>
        String(it?.[k] ?? "")
          .toLowerCase()
          .includes(t)
      );
    });
  }, [items, queryText, searchKeys]);

  async function loadOne(id) {
    setSelectedId(id);
    setMessage("");
    if (!id) return;
    try {
      const ref = doc(
        db,
        `artifacts/${appId}/tenants/${tenantId}/${collectionName}/${id}`
      );
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setForm(snap.data());
      } else {
        setForm({});
        setMessage("Record not found.");
      }
    } catch (e) {
      console.error("loadOne failed", e);
      setMessage("Error loading record.");
    }
  }

  function onChangeField(key, value) {
    // write by dot‑path so nested fields (e.g. "billing.city") edit correctly   // inline-review
    setForm((prev) => {
      const next = { ...prev }; // inline-review
      setByPath(next, key, value); // inline-review
      return next;
    });
  }

  async function onSave() {
    if (!selectedId) return;
    setSaving(true);
    setMessage("");
    try {
      
      const payload = { ...form };
      // Always stamp audit on update using server time & current actor             
      payload.updatedAt = serverTimestamp();
      payload.updatedBy = user?.email || user?.uid || "unknown";
      // Strip immutable fields (created*, tenant/app ids) from outgoing payload    
      for (const k of allImmutable) delete payload[k];
      for (const f of fields) {
        const k = f?.path || f?.key || f?.name;
        if (k && f?.immutable) delete payload[k];
      }
      

      
      const ref = doc(
        db,
        `artifacts/${appId}/tenants/${tenantId}/${collectionName}/${selectedId}`
      );

      // Update the document in Firestore
      await updateDoc(ref, payload);

      
      // Update local state to reflect changes
      setMessage(`${entityLabel.slice(0, -1)} updated successfully.`);
    } catch (e) {
      console.error("save failed", e);
      setMessage("Error saving changes.");
    } finally {
      setSaving(false);
    }
  }

  function renderField(f) {
    // render a single input
    const key = f.path || f.key || f.name; // prefer explicit path
    if (!key) return null;
    const label = f.label || key;
    const type = f.type || "text";

    // Skip fields marked non-editable
    if (f.edit === false) return null;

    const immutable = allImmutable.includes(key) || !!f.immutable; // lock via schema or global list
    const value = getByPath(form, key) ?? "";

    if (type === "textarea") {
      return (
        <div key={key} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
          <textarea
            className={`w-full rounded-md border border-gray-300 p-2 ${
              immutable ? "readonly-field" : ""
            }`}
            value={value}
            onChange={(e) => onChangeField(key, e.target.value)} // dot‑path safe writer  // inline-review
            disabled={immutable}
            readOnly={immutable}
          />
          {immutable && (
            <p className="text-xs text-gray-500 mt-1">
              This field is immutable.
            </p>
          )}
        </div>
      );
    }

    // Add a default return for other field types
    return (
      <div key={key} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <input
          type={type}
          className={`w-full rounded-md border border-gray-300 p-2 ${
            immutable ? "readonly-field" : ""
          }`}
          value={value}
          onChange={(e) => onChangeField(key, e.target.value)}
          disabled={immutable}
          readOnly={immutable}
        />
        {immutable && (
          <p className="text-xs text-gray-500 mt-1">This field is immutable.</p>
        )}
      </div>
    );
  }

  // Always-render primitives: union(schema-declared fields + simple leaf props from the document)  // keeps UI from showing blanks
  function collectPrimitiveFields(obj) {
    const out = [];
    if (!obj || typeof obj !== "object") return out;
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) continue;
      const t = typeof v;
      if (t === "string" || t === "number" || t === "boolean") {
        out.push({
          key: k,
          label: k,
          type: t === "number" ? "number" : "text",
        });
      }
    }
    return out;
  }
  const primitiveFields = useMemo(() => collectPrimitiveFields(form), [form]); // recompute when doc changes
  const mergedFields = useMemo(() => {
    // union + de-dupe
    const declared = (fields || [])
      .map((f) => f.path || f.key || f.name)
      .filter(Boolean);
    const seen = new Set(declared);
    const extra = (primitiveFields || []).filter((f) => !seen.has(f.key));
    return [...(fields || []), ...extra];
  }, [fields, primitiveFields]);

  return (
    <div className="max-w-6xl">
      {/* Search & select row */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search {entityLabel}
          </label>
          <input
            className="w-full rounded-md border border-gray-300 p-2"
            placeholder={`Type to filter by ${searchKeys
              .slice(0, 3)
              .join(", ")}…`}
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Fetching first 100. Type 2 characters to narrow results.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pick a record
          </label>
          <select
            className="w-full rounded-md border border-gray-300 p-2"
            value={selectedId}
            onChange={(e) => loadOne(e.target.value)}
            disabled={loading}
          >
            <option value="">— Choose —</option>
            {filtered.map((it) => (
              <option key={it.id} value={it.id}>
                {/* try to form a helpful label: prefer number then name */}
                {(it.customerNbr ||
                  it.employeeNumber ||
                  it.vendorNumber ||
                  it.assetTag ||
                  it.transactionId ||
                  it.id) +
                  " — " +
                  (it.name1 || it.name || it.title || "")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Form + Audit panel */}
      {selectedId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mergedFields.map(renderField)}
            </div>
          </div>
          <aside className="lg:col-span-1">
            <div className="rounded-lg border p-4 bg-gray-50">
              <h3 className="font-semibold mb-2">Audit</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-gray-600">Created By</div>
                  <div className="readonly-field rounded p-2">
                    {String(form.createdBy || "")}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Created At</div>
                  <div className="font-medium">
                    {formatWhen(form?.createdAt)}
                  </div>{" "}
                  {/* use helper → no Invalid Date */}
                </div>
                <div>
                  <div className="text-gray-600">Updated By</div>
                  <div className="readonly-field rounded p-2">
                    {String(form.updatedBy || "")}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Updated At</div>
                  <div className="font-medium">
                    {formatWhen(form?.updatedAt)}
                  </div>{" "}
                  {/* normalize Timestamp/Date/num */}
                </div>
              </div>
            </div>
            <button
              onClick={onSave}
              disabled={saving}
              className="mt-4 w-full h-10 px-4 rounded-lg bg-blue-600 text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {message && (
              <div className="mt-3 text-sm text-gray-700">{message}</div>
            )}
          </aside>
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          Select a record to edit. Immutable fields are shaded and locked.
        </p>
      )}
    </div>
  );
}
