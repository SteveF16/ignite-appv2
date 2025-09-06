import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
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
const EXCLUDE_ON_CHANGE = new Set(["createdAt", "updatedAt"]); // fields to exclude from onChange (e.g. timestamps)

export default function ChangeEntity({
  entityLabel,
  collectionName,
  schema,
  initialDocId, // ← NEW: allow deep‑linking a specific doc from List view
  onSaveAndClose, // legacy callback (kept for backward compatibility)
  onCancel, // optional: parent-provided "go back to list" callback
  onSaved, // optional: parent-provided "after save" callback
}) {
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
  }; // now used to sort list

  // load when a record is chosen (or deep‑linked via initialDocId)
  useEffect(() => {
    const idToLoad = initialDocId || selectedId; // prefer deep‑link on first load  // inline-review
    if (!idToLoad) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const app =
          typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        const fullPath = `artifacts/${app}/tenants/${tenantId}/${collectionName.toLowerCase()}`;
        const snap = await getDoc(doc(db, fullPath, idToLoad)); // use tenant-scoped path
        if (!cancelled) {
          setForm(snap.exists() ? snap.data() : {});
          if (initialDocId) setSelectedId(initialDocId); // reflect in selector            // inline-review
        }
      } catch (e) {
        if (!cancelled) setMessage(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, appId, tenantId, collectionName, selectedId, initialDocId]);

  // Fetch the first page (<=100) for the picker
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!db || !tenantId || !collectionName) return;
      try {
        const app =
          typeof __app_id !== "undefined" ? __app_id : "default-app-id";
        const fullPath = `artifacts/${app}/tenants/${tenantId}/${collectionName.toLowerCase()}`;
        const constraints = [limit(100)];
        if (defaultSort?.key) {
          constraints.unshift(
            orderBy(
              defaultSort.key,
              defaultSort.dir === "desc" ? "desc" : "asc"
            )
          );
        }
        const q = query(collection(db, fullPath), ...constraints);
        const snap = await getDocs(q);
        if (!cancelled) {
          setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      } catch (e) {
        if (!cancelled) setMessage(String(e?.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, tenantId, collectionName, defaultSort]);

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
  function formatWhen(v) {
    // tolerate bad historic data (e.g., "steve")
    try {
      if (!v) return "";
      if (typeof v?.toDate === "function") return v.toDate().toLocaleString();
      if (v instanceof Date) return v.toLocaleString();
      if (typeof v === "number") return new Date(v).toLocaleString();
      if (typeof v === "string") return new Date(v).toLocaleString();
      return String(v);
    } catch {
      return ""; // show blank instead of "Invalid Date"
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
      const app =
        typeof __app_id !== "undefined" ? __app_id : appId || "default-app-id";
      const fullPath = `artifacts/${app}/tenants/${tenantId}/${collectionName.toLowerCase()}`;
      const ref = doc(db, fullPath, id);
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
      const next = { ...prev }; // make a shallow copy of state
      setByPath(next, key, value); // dot-path write ensures e.g. "credit.onHold" is updated
      return next;
    });
  }

  async function onSave() {
    if (!selectedId) return;
    setSaving(true);
    setMessage("");
    try {
      // Make a deep copy so we can safely mutate before sending to Firestore
      const payload = JSON.parse(JSON.stringify(form)); // keeps nested updates like credit.onHold    // inline-review

      // Strip immutables **first** so our audit stamps (below) don't get deleted.                     // inline-review
      // Never strip updatedAt/updatedBy even if a schema accidentally marks them immutable.           // inline-review
      for (const k of allImmutable) {
        if (k === "updatedAt" || k === "updatedBy") continue;
        delete payload[k];
      }
      for (const f of fields) {
        const k = f?.path || f?.key || f?.name;
        if (!k) continue;
        if (k === "updatedAt" || k === "updatedBy") continue; // guard stamps                           // inline-review
        if (f?.immutable) delete payload[k];
      }

      // Now stamp audit using server time & current actor                                              // inline-review
      payload.updatedAt = serverTimestamp();
      payload.updatedBy = user?.email || user?.uid || "unknown";

      // Reference the document to update
      const ref = doc(
        db,
        `artifacts/${appId}/tenants/${tenantId}/${collectionName.toLowerCase()}`,
        selectedId
      );

      // Update the document in Firestore
      await updateDoc(ref, payload);

      // Update local state to reflect changes
      setMessage(`${entityLabel.slice(0, -1)} updated successfully.`);

      // 🔔 Navigation hooks — prefer new, fall back to legacy
      if (typeof onSaved === "function") {
        onSaved(); // e.g., ListDataView: return to list on save
      } else if (typeof onSaveAndClose === "function") {
        onSaveAndClose(); // legacy path (App.js Change → List)
      }
    } catch (e) {
      console.error("save failed", e);
      setMessage("Error saving changes.");
    } finally {
      setSaving(false);
    }
  }

  // 🚪 Cancel handler — avoid name collision with the `onCancel` prop by using `handleCancel`  // inline-review
  const handleCancel = () => {
    console.log("ChangeEntity: Cancel pressed → navigate back to list");
    if (typeof onCancel === "function") {
      onCancel(); // preferred new prop (e.g., from ListDataView)         // inline-review
    } else if (typeof onSaveAndClose === "function") {
      onSaveAndClose(); // fallback for existing App.js integration             // inline-review
    }
  };

  function renderField(f) {
    // render a single input
    const key = f.path || f.key || f.name; // prefer explicit path
    if (!key) return null;
    if (EXCLUDE_ON_CHANGE.has(key) || f.hideOnChange) return null;
    const label = f.label || key;
    const type = f.type || "text";

    // Skip fields marked non-editable
    if (f.edit === false) return null;

    const immutable = allImmutable.includes(key) || !!f.immutable; // lock via schema or global list
    // ✅ For checkboxes we must derive a boolean, not a string; other inputs keep prior behavior.
    const value =
      type === "checkbox" ? !!getByPath(form, key) : getByPath(form, key) ?? "";

    // dynamic options for select (countries/currencies) via Intl with fallback
    const getCountryOptions = () => {
      try {
        const codes =
          typeof Intl.supportedValuesOf === "function"
            ? Intl.supportedValuesOf("region")
            : ["US", "CA", "GB", "DE", "FR", "AU", "JP"];
        const dn = new Intl.DisplayNames([navigator.language || "en"], {
          type: "region",
        });
        return codes.map((c) => ({
          value: c,
          label: `${c} — ${dn.of(c) || c}`,
        }));
      } catch {
        return [
          { value: "US", label: "US — United States" },
          { value: "CA", label: "CA — Canada" },
        ];
      }
    };
    const getCurrencyOptions = () => {
      try {
        const codes =
          typeof Intl.supportedValuesOf === "function"
            ? Intl.supportedValuesOf("currency")
            : ["USD", "EUR", "GBP", "JPY", "AUD", "CAD"];
        const dn = new Intl.DisplayNames([navigator.language || "en"], {
          type: "currency",
        });
        return codes.map((c) => ({
          value: c,
          label: `${c} — ${dn.of(c) || c}`,
        }));
      } catch {
        return [
          { value: "USD", label: "USD — US Dollar" },
          { value: "EUR", label: "EUR — Euro" },
        ];
      }
    };

    if (type === "select") {
      // ✅ FIX: On *Change Employee* the Status select was blank because this component
      // only populated country/currency. Pull enum from the schema first.                 // inline-review
      const enumFromField = Array.isArray(f.enum) ? f.enum : undefined; // can be provided inline
      const enumFromSchema = (schema.fields || []).find(
        (ff) => (ff.path || ff.key || ff.name) === key
      )?.enum; // Employees.status enum
      const normalizedEnum =
        (enumFromField && enumFromField.length
          ? enumFromField
          : enumFromSchema) || [];
      const source = normalizedEnum.length
        ? normalizedEnum.map((v) => ({ value: String(v), label: String(v) })) // enum → options
        : key.endsWith(".country")
        ? getCountryOptions()
        : key === "credit.currency"
        ? getCurrencyOptions()
        : [];

      return (
        <div key={key} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
          <select
            className={`w-full rounded-md border border-gray-300 p-2 ${
              immutable ? "readonly-field" : ""
            }`}
            value={value}
            onChange={(e) => onChangeField(key, e.target.value)}
            disabled={immutable}
            readOnly={immutable}
          >
            <option value="">{""}</option>
            {source.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {immutable && (
            <p className="text-xs text-gray-500 mt-1">
              This field is immutable.
            </p>
          )}
        </div>
      );
    }

    // ✅ NEW: proper checkbox renderer so booleans persist as true/false
    if (type === "checkbox") {
      return (
        <div key={key} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={!!value}
            onChange={(e) => onChangeField(key, e.target.checked)} // writes boolean to e.g. credit.onHold
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

    // Amount preview for Credit Limit (formatter that won't fight user typing)
    const currencyCode = getByPath(form, "credit.currency") || "USD";
    const previewCurrency = (n) => {
      try {
        if (n === "" || n == null || Number.isNaN(Number(n))) return "";
        return new Intl.NumberFormat(navigator.language || "en-US", {
          style: "currency",
          currency: currencyCode,
        }).format(Number(n));
      } catch {
        return `${currencyCode} ${n ?? ""}`;
      }
    };

    if (key === "credit.limit") {
      const n = value ?? ""; // FIX: use the field's current value (val was undefined)  // inline-review
      return (
        <div key={key} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
          <div className="flex items-center gap-3">
            <input
              className={`w-full rounded-md border border-gray-300 p-2 ${
                immutable ? "readonly-field" : ""
              }`}
              type="number"
              step="0.01"
              value={n}
              onChange={(e) =>
                onChangeField(
                  key,
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              disabled={immutable}
              readOnly={immutable}
            />
            <span className="text-sm text-gray-600 shrink-0">
              ≈ {previewCurrency(n)} {currencyCode}
            </span>
          </div>
          {immutable && (
            <p className="text-xs text-gray-500 mt-1">
              This field is immutable.
            </p>
          )}
        </div>
      );
    }

    // “State/Region”: when US -> dropdown of states; otherwise keep free-form input.                   // inline-review
    if (key.endsWith(".state")) {
      const selectedCountry = getByPath(form, "billing.address.country");
      const US_STATES = [
        "AL",
        "AK",
        "AZ",
        "AR",
        "CA",
        "CO",
        "CT",
        "DE",
        "FL",
        "GA",
        "HI",
        "ID",
        "IL",
        "IN",
        "IA",
        "KS",
        "KY",
        "LA",
        "ME",
        "MD",
        "MA",
        "MI",
        "MN",
        "MS",
        "MO",
        "MT",
        "NE",
        "NV",
        "NH",
        "NJ",
        "NM",
        "NY",
        "NC",
        "ND",
        "OH",
        "OK",
        "OR",
        "PA",
        "RI",
        "SC",
        "SD",
        "TN",
        "TX",
        "UT",
        "VT",
        "VA",
        "WA",
        "WV",
        "WI",
        "WY",
      ];
      if (selectedCountry === "US") {
        return (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <select
              className={`w-full rounded-md border border-gray-300 p-2 ${
                immutable ? "readonly-field" : ""
              }`}
              value={value ?? ""}
              onChange={(e) => onChangeField(key, e.target.value || "")}
              disabled={immutable}
            >
              <option value="">{""}</option>
              {US_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            {immutable && (
              <p className="text-xs text-gray-500 mt-1">
                This field is immutable.
              </p>
            )}
          </div>
        );
      }
      // non-US: fall through to default renderer below (text)
    }

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
    // Ensure 'status' carries the enum from schema even if discovered via primitives.     // inline-review
    const stitched = [...(fields || []), ...extra].map((f) => {
      if ((f.path || f.key || f.name) !== "status") return f;
      const enumFromSchema = (schema.fields || []).find(
        (ff) => (ff.path || ff.key || ff.name) === "status"
      )?.enum;
      return enumFromSchema?.length
        ? { ...f, type: "select", enum: enumFromSchema }
        : f;
    });
    return stitched;
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
            disabled={loading || !!initialDocId} /* lock when deep‑linked */
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

            <button
              onClick={handleCancel} // unified cancel path (uses new prop or legacy fallback)
              className="mt-2 w-full h-10 px-4 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              Cancel
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
