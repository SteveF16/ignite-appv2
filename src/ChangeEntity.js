import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  //  where,
  query,
  updateDoc,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";
import { FirebaseContext } from "./AppWrapper"; // FIX: get context from AppWrapper, not firestore
// ✅ Centralized, tenant-scoped collection helpers (no more toLowerCase drift)
import { tenantCollectionPath } from "./collectionNames";
import { getAppId } from "./IgniteConfig"; // centralized appId

//import { dbg } from "./debug"; // 🔎 gated logger (no behavior change)
import * as IgniteCfg from "./IgniteConfig";

// schemaUtils.js is for normalizing schema shapes and building picker labels so we don't
// have to repeat that logic in multiple places.
// It is used by both ListDataView and ChangeEntity. To prevent RUNTIME ERRORS!
import {
  COMMON_IMMUTABLE,
  buildPickerLabel,
  selectOptionsFrom,
  normalizeSchema,
} from "./schemaUtils";

// ─────────────────────────────────────────────────────────────────────────────
const EXCLUDE_ON_CHANGE = new Set(["createdAt", "updatedAt"]); // fields to exclude from onChange (e.g. timestamps)
// ─────────────────────────────────────────────────────────────────────────────
// Back-compat DEBUG flag to avoid runtime "DBG_CHANGE is not defined".
// Some render helpers still check this symbol directly; define it safely.
// Turn on from DevTools with:  window.__igniteDebugChange = true
// NOTE: this definition is *harmless* and does not change behavior unless you
// explicitly set the window flag; it only prevents ReferenceErrors.
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
const DBG_CHANGE = (() => {
  try {
    return typeof window !== "undefined" && window.__igniteDebugChange === true;
  } catch {
    return false;
  }
})();
// ─────────────────────────────────────────────────────────────────────────────
// Local debug helper: logs only when window.__igniteDebugChange is truthy
const __dbgChange = (...args) => {
  try {
    if (typeof window !== "undefined" && window.__igniteDebugChange) {
      console.log(...args);
    }
  } catch (_) {
    ("Steve - Log Message failed, but no worries, continue.");
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// Focused (opt-in) debug for Change screen (reads flag at call-time; bypass global dbg gate)
const cdbg = (label, payload) => {
  try {
    const on =
      (typeof window !== "undefined" && window.__igniteDebugChange) === true;
    if (on) console.log(label, payload);
  } catch {
    /* no-op */
  }
};
// ─────────────────────────────────────────────────────────────────────────────

// Normalize anything → 'yyyy-MM-dd' **string** for HTML date inputs.
// Accepts: '', Date, Firestore.Timestamp, ISO strings, or already 'yyyy-MM-dd'. // inline guard
function toYmdString(val) {
  if (val === undefined || val === null || val === "") return ""; // keep controlled input happy
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val; // already in good shape
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) {
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    return ""; // bad historic data → blank
  }
  if (val && typeof val.toDate === "function") return toYmdString(val.toDate()); // Firestore Timestamp
  if (val instanceof Date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(
      val.getDate()
    )}`;
  }
  return ""; // anything else → blank
}

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
    appId: ctxAppId, // prefer context if provided
    user,
  } = useContext(FirebaseContext);
  const appId = ctxAppId || getAppId(); // unified fallback, no hardcoding
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [queryText, setQueryText] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Normalize schema once and use the safe, uniform shape everywhere.
  const norm = normalizeSchema(schema, { entityLabel, collectionName });
  //const fields = norm.fields;
  const fields = Array.isArray(schema?.fields) ? schema.fields : [];
  const searchKeys = norm.search.keys;
  // Ensure we always have an array for collection-level immutable keys
  const collectionImmutable = Array.isArray(schema?.meta?.immutable)
    ? schema.meta.immutable
    : [];
  // Compose global + collection immutables once; use Set for O(1) checks
  const allImmutable = new Set([...COMMON_IMMUTABLE, ...collectionImmutable]);

  // Normalize/guard the schema shape so `.fields`, `.list`, `.search`, `.meta` are always safe.
  // This prevents "Cannot read properties of undefined (reading 'fields')" when switching branches.
  schema = normalizeSchema(schema, { entityLabel, collectionName });
  if (!schema.fields?.length) {
    console.log(
      "[Change] warn: no schema.fields provided — falling back to discovered primitive fields",
      schema?.fields
    );
  }

  // 🔎 DIAGNOSTIC ONLY: confirm what arrived from the route
  __dbgChange("[Change][diag] entry", {
    entityLabel,
    collectionNameProp: collectionName,
    schemaHint: schema && (schema.collectionName || schema.collectionKey),
  });

  // Stabilize sorting so effects don't re-run on every render.
  // IMPORTANT: Only sort when the schema explicitly provides a defaultSort.
  // (Employees currently mounts with no schema; querying unsorted avoids empty result set.)
  const sortKey = norm?.list?.defaultSort?.key; // undefined when no schema
  const sortDir = norm?.list?.defaultSort?.dir === "desc" ? "desc" : "asc";

  const defaultSort = React.useMemo(
    () => ({ key: sortKey || "(unsorted)", dir: sortDir }),
    [sortKey, sortDir]
  ); // stable object identity

  // ── Ensure the deep-linked id is reflected in the selector immediately ──
  useEffect(() => {
    if (initialDocId) {
      setSelectedId(initialDocId);
      cdbg("[Change] initialDocId → selectedId", { initialDocId });
    }
  }, [initialDocId]);

  // ── Realtime idle pause (system-wide) ─────────────────────────────────────
  const pauseOnIdleMs = useMemo(() => {
    const viaFn =
      typeof IgniteCfg.getRealtimePauseOnIdleMs === "function"
        ? IgniteCfg.getRealtimePauseOnIdleMs()
        : undefined;
    const viaObj =
      IgniteCfg.REALTIME?.pauseOnIdleMs ??
      IgniteCfg.appRealtime?.pauseOnIdleMs ??
      IgniteCfg.realtimePauseOnIdleMs;
    return Number(viaFn ?? viaObj ?? 0) || 0;
  }, []);
  const [isRealtimePaused, setIsRealtimePaused] = useState(false);
  useEffect(() => {
    // If system configured to pause realtime while idle, respect it.

    let last = Date.now();
    let paused = false;
    const markActive = () => {
      last = Date.now();
      if (paused) {
        paused = false;
        setIsRealtimePaused(false);
        cdbg("[Change][idle] resume");
      }
    };
    const onVis = () => !document.hidden && markActive();
    window.addEventListener("mousemove", markActive);
    window.addEventListener("keydown", markActive);
    window.addEventListener("click", markActive);
    document.addEventListener("visibilitychange", onVis);
    const timer = setInterval(() => {
      if (Date.now() - last > pauseOnIdleMs && !paused) {
        paused = true;
        setIsRealtimePaused(true);
        cdbg("[Change][idle] pause (no activity)", { pauseOnIdleMs });
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("mousemove", markActive);
      window.removeEventListener("keydown", markActive);
      window.removeEventListener("click", markActive);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pauseOnIdleMs]);

  // ── DIAG H: on mount, confirm editor context and critical field shapes ──────────────────────────
  useEffect(() => {
    const status = (norm?.fields || []).find(
      (f) => f.path === "employmentStatus"
    );
    const type = (norm?.fields || []).find((f) => f.path === "employmentType");
    cdbg("[Change] mount props", {
      entityLabel,
      collectionName,
      defaultSort,
      hasFields: Array.isArray(schema?.fields),
      statusMeta: status,
      typeMeta: type,
    });

    if (!Array.isArray(norm?.fields)) {
      cdbg(
        "[Change] warn: no schema.fields provided — falling back to discovered primitive fields"
      );
    }
  }, [entityLabel, collectionName, norm, sortKey, sortDir]);

  // load when a record is chosen (or deep‑linked via initialDocId)
  useEffect(() => {
    const idToLoad = initialDocId || selectedId; // prefer deep‑link on first load
    if (!idToLoad) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // Use canonical per-tenant path — never mutate the collection id locally
        const fullPath = tenantCollectionPath({
          appId,
          tenantId,
          key: collectionName,
        });
        const snap = await getDoc(doc(db, fullPath, idToLoad));

        if (!cancelled) {
          setForm(snap.exists() ? snap.data() : {});

          // 🔎 Focused diagnostics for deleted fields as they arrive from Firestore                 // debug-only
          if (snap.exists()) {
            const d = snap.data();
            cdbg("[Change][load] delete snapshot", {
              id: idToLoad,
              isDeleted: d?.isDeleted ?? d?.deleted ?? "(missing)",
              deletedAt: d?.deletedAt ?? "(missing)",
              deletedBy: d?.deletedBy ?? "(missing)",
            });
          }

          if (initialDocId) setSelectedId(initialDocId); // reflect in selector
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
    // Respect idle config, but don't depend on any external globals.
    // Only gate when we are actually paused.
    if (pauseOnIdleMs > 0 && isRealtimePaused) {
      cdbg("[Change] picker: paused by idle", { pauseOnIdleMs });
      return;
    }

    let cancelled = false;
    (async () => {
      if (!db) {
        cdbg("[Change] picker: skip (no db)");
        return;
      }
      if (!tenantId) {
        cdbg("[Change] picker: skip (no tenantId)");
        return;
      }
      if (!collectionName) {
        cdbg("[Change] picker: skip (no collectionName)");
        return;
      }

      try {
        const fullPath = tenantCollectionPath({
          appId,
          tenantId,
          key: collectionName,
        }); // centralized

        const constraints = [limit(100)];
        if (sortKey) {
          constraints.unshift(orderBy(sortKey, sortDir));
          cdbg("[Change] picker: using orderBy", { sortKey, sortDir });
        } else {
          cdbg("[Change] picker: unsorted fetch (no schema.defaultSort)", {
            collectionName,
          });
        }

        // STEVE - This builds a picker query for dropdown changes to employees/customers,etc. s

        const q = query(collection(db, fullPath), ...constraints);

        const snap = await getDocs(q);
        if (!cancelled) {
          setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

          // ── DIAG I: picker shape & path so we can verify tenant/app scoping ────────────────────
          cdbg("[Change] picker snapshot", {
            path: fullPath,
            count: snap.size,
            tenantId,
            appId,
          });

          // 🔎 DIAG: show a few labels as they'll render in the dropdown
          const labelsSample = snap.docs
            .slice(0, 5)
            .map((d) => buildPickerLabel(entityLabel, d.data(), d.id));
          cdbg("[Change] picker labels sample", labelsSample);
        }
      } catch (e) {
        if (!cancelled) setMessage(String(e?.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, tenantId, collectionName, sortKey, sortDir, isRealtimePaused]);

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
      const fullPath = tenantCollectionPath({
        appId,
        tenantId,
        key: collectionName,
      });
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
    // write by dot‑path so nested fields (e.g. "billing.city") edit correctly
    setForm((prev) => {
      const next = { ...prev }; // make a shallow copy of state

      // 🔎 Specifically watch the logical-delete toggle changing in the UI                           // debug-only
      if (key === "isDeleted" || key === "deleted") {
        cdbg("[Change][edit] delete toggle", {
          key,
          before: !!prev?.[key],
          after: !!value,
        });

        // ⤵️ Live-preview the delete stamps so the two fields aren't blank before Save.
        //    (They will still be re-stamped on Save with serverTimestamp()/actor.)
        if (value === true) {
          // normalize flag and show preview stamps
          next.isDeleted = true; // keep a single canonical flag in state
          next.deletedAt = new Date(); // preview value for the date input
          next.deletedBy = user?.email || user?.uid || "unknown";
        } else {
          next.isDeleted = false;
          // clear the preview so the inputs appear blank again
          next.deletedAt = ""; // keep as empty string for controlled <input type="date">
          next.deletedBy = "";
        }
      }

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
      const payload = JSON.parse(JSON.stringify(form)); // keeps nested updates like credit.onHold

      // Strip immutables **first** so our audit stamps (below) don't get deleted.
      // Never strip updatedAt/updatedBy even if a schema accidentally marks them immutable.
      for (const k of allImmutable) {
        if (k === "updatedAt" || k === "updatedBy") continue;
        delete payload[k];
      }
      for (const f of fields) {
        const k = f?.path || f?.key || f?.name;
        if (!k) continue;
        if (k === "updatedAt" || k === "updatedBy") continue; // guard stamps
        if (f?.immutable) delete payload[k];
      }

      // 🔎 Before we stamp audits, capture the delete-related values we are about to send.         // debug-only
      cdbg("[Change][save] pre-stamp", {
        id: selectedId,
        isDeleted: payload?.isDeleted ?? payload?.deleted ?? "(missing)",
        deletedAt: payload?.deletedAt ?? "(missing)",
        deletedBy: payload?.deletedBy ?? "(missing)",
      });

      // Now stamp audit using server time & current actor
      payload.updatedAt = serverTimestamp();
      payload.updatedBy = user?.email || user?.uid || "unknown";

      // Soft-delete stamps (and clear on un-delete). We key off either isDeleted or deleted.
      const delFlag = (payload?.isDeleted ?? payload?.deleted) === true;
      if (delFlag) {
        payload.deletedAt = serverTimestamp();
        payload.deletedBy = user?.email || user?.uid || "unknown";
        cdbg("[Change][save] stamp delete → set", {
          isDeleted: true,
          deletedBy: payload.deletedBy,
        });
      } else {
        // Remove fields server-side; renders as blank client-side.
        payload.deletedAt = deleteField();
        payload.deletedBy = deleteField();
        cdbg("[Change][save] stamp delete → clear", { isDeleted: false });
      }

      // Optimistic local UI update so the fields reflect immediately
      setForm((prev) => ({
        ...prev,
        isDeleted: !!delFlag,
        deletedAt: delFlag ? new Date() : null,
        deletedBy: delFlag ? user?.email || user?.uid || "unknown" : "",
      }));

      // Reference the document to update
      const ref = doc(
        db,
        tenantCollectionPath({ appId, tenantId, key: collectionName }),
        selectedId
      );

      // 🔎 Final look just before updateDoc so we know exactly what went out.                        // debug-only
      cdbg("[Change][save] final payload", {
        has_isDeleted: Object.prototype.hasOwnProperty.call(
          payload,
          "isDeleted"
        ),
        has_deleted: Object.prototype.hasOwnProperty.call(payload, "deleted"),
        deletedAt: payload?.deletedAt ?? "(unset)",
        deletedBy: payload?.deletedBy ?? "(unset)",
      });

      // Update the document in Firestore
      await updateDoc(ref, payload);
      cdbg("[Change][save] update ok", { id: selectedId });

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

  // 🚪 Cancel handler — avoid name collision with the `onCancel` prop by using `handleCancel`
  const handleCancel = () => {
    console.log("ChangeEntity: Cancel pressed → navigate back to list");
    if (typeof onCancel === "function") {
      onCancel(); // preferred new prop (e.g., from ListDataView)
    } else if (typeof onSaveAndClose === "function") {
      onSaveAndClose(); // fallback for existing App.js integration
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

    const immutable = allImmutable.has(key) || !!f.immutable;
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
      // ✅ FIX: Support both `enum` **and** `options` (string[] | {value,label}[]) from schema.
      // This was the root cause of blank Employment selects in *Change Employee*.                // important

      let source = selectOptionsFrom(f, norm.fields);
      if (!source.length && key.endsWith(".country")) {
        source = getCountryOptions();
      } else if (!source.length && key === "credit.currency") {
        source = getCurrencyOptions();
      }

      cdbg("[Change] select meta", {
        key,
        count: source.length,
        sample: source.slice(0, 3),
      }); // debug-only

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

    // ✅ FIX: Date inputs — normalize Firestore Timestamp/ISO → 'yyyy-MM-dd' to stop the
    // browser warning flood and actually render the existing value.                               // important
    if (type === "date") {
      const normalized = toYmdString(value); // 'yyyy-MM-dd' or ''
      if (DBG_CHANGE)
        cdbg("[Change] render date", { key, in: value, out: normalized }); // debug-only
      return (
        <div key={key} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
          <input
            type="date"
            className={`w-full rounded-md border border-gray-300 p-2 ${
              immutable ? "readonly-field" : ""
            }`}
            value={normalized}
            onChange={(e) => onChangeField(key, e.target.value || "")}
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
      const n = value ?? ""; // FIX: use the field's current value (val was undefined)
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

    // “State/Region”: when US -> dropdown of states; otherwise keep free-form input.
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
            onChange={(e) => onChangeField(key, e.target.value)} // dot‑path safe writer
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
    // Ensure 'status' carries the enum from schema even if discovered via primitives.
    const stitched = [...(fields || []), ...extra].map((f) => {
      if ((f.path || f.key || f.name) !== "status") return f;
      const enumFromSchema = (norm.fields || []).find(
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
      {isRealtimePaused && pauseOnIdleMs > 0 && (
        <div className="mb-3 rounded-md border border-yellow-300 bg-yellow-50 p-2 text-sm text-yellow-900">
          ⏸ Live updates paused after inactivity. Move the mouse or press a key
          to resume.
        </div>
      )}
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

            {/* STEVE - This is the change dropdown PICKLIST for Employees/Customers, etc */}

            {filtered.map((it) => {
              // Build a user-facing label (Employees → employee id — name, Customers → customer id — name, etc.)
              const label = buildPickerLabel(entityLabel, it, it.id);
              return (
                <option key={it.id} value={it.id}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Form + Audit panel */}
      {selectedId ? (
        (cdbg("[Change] rendering form for selectedId", { selectedId }),
        (
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
        ))
      ) : (
        <p className="text-sm text-gray-600">
          Select a record to edit. Immutable fields are shaded and locked.
        </p>
      )}
    </div>
  );
}
