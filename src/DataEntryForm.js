import React, { useState, useEffect, useContext, useMemo } from "react"; // useMemo used for options + sorting
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { FirebaseContext } from "./AppWrapper";
import { X, Save } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CollectionSchemas } from "./DataSchemas"; // ← central, nested-aware schemas
import { dbg } from "./debug"; // 🔎 gated logger (no behavior change)

// ✅ Centralize collection ids + tenant path building to avoid casing drift across the app           // inline-review
import { collectionIdForBranch, tenantCollectionPath } from "./collectionNames";
import { getAppId } from "./IgniteConfig"; // single source of truth for app id                        // inline-review

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

// -----------------------------------------------------------------------------
// Debug flag: when true, we log the exact Firestore collection path and doc id.
// Toggle to `false` for production if you don't want console noise.
// -----------------------------------------------------------------------------
const DEBUG_FIRESTORE = true; // <-- set to false after verifying paths

// ─────────────────────────────────────────────────────────────────────────────
// ✅ Canonical date utilities (define ONCE)
//    If you previously added another copy lower in this file, this patch removes it.   // inline-review
const DATE_DISPLAY = "yyyy-MM-dd"; // single source of truth for pickers       // inline-review
const toJsDate = (v) => {
  if (!v) return null; // normalize falsy                   // inline-review
  if (v instanceof Date) return v; // already a Date                   // inline-review
  if (typeof v?.toDate === "function") return v.toDate(); // Firestore TS      // inline-review
  return null; // unified: reject legacy strings/nums
};
const formatDate = (d) => {
  if (!d) return ""; // display empty string for nulls   // inline-review
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
// ─────────────────────────────────────────────────────────────────────────────

// Confirm a vendor exists by id (preferred) or by common number fields (back-compat).                 // inline-review
const vendorExists = async ({ db, appId, tenantId, vendorId, vendorNbr }) => {
  const path = tenantCollectionPath({ appId, tenantId, key: "vendors" });
  // 1) Fast path: check by document id (strong referential integrity)
  if (vendorId) {
    try {
      const ref = doc(collection(db, path), String(vendorId));
      const snap = await getDoc(ref);
      if (snap.exists()) return true;
    } catch (_) {
      /* ignore */
    }
  }
  // 2) Compat path: search by business key across common field names
  const key = String(vendorNbr || "");
  if (!key) return false;
  const fields = [
    "vendorNbr",
    "vendorNumber",
    "vendor_no",
    "vendorNo",
    "number",
    "code",
    "vendorCode",
  ];
  for (const f of fields) {
    const qy = query(collection(db, path), where(f, "==", key));
    const snap = await getDocs(qy);
    if (!snap.empty) return true;
  }
  return false;
};
// ─────────────────────────────────────────────────────────────────────────────
// Helpers: dot-path getters/setters for nested objects
// NOTE: We keep these tiny and dependency-free to avoid pulling lodash.
const getByPath = (obj, path) =>
  path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

const setByPath = (obj, path, value) => {
  const parts = path.split(".");
  const last = parts.pop();
  // create nested containers as needed (safe for React state clones)
  let cursor = obj;
  for (const k of parts) {
    if (cursor[k] == null || typeof cursor[k] !== "object") cursor[k] = {};
    cursor = cursor[k];
  }
  cursor[last] = value;
  return obj;
};

// ─────────────────────────────────────────────────────────────────────────────
// Targeted, quieter diagnostics for the form (toggle at runtime):
//   in DevTools console, run:  window.__igniteDebugForm = true
// This does NOT affect global dbg() noise elsewhere.                                // inline-review
const DBG_FORM =
  (typeof window !== "undefined" && window.__igniteDebugForm) === true;
const fdbg = (label, payload) => {
  if (DBG_FORM) dbg(label, payload);
};

// NEW: change-mode focused diagnostics (very low noise)
//   in DevTools: window.__igniteDebugChange = true
const DBG_CHANGE =
  (typeof window !== "undefined" && window.__igniteDebugChange) === true;
const cdbg = (label, payload) => {
  if (DBG_CHANGE) dbg(label, payload);
};
// Normalize a select field's option values whether schema uses:
//   - legacy `enum: string[]`, or
//   - modern `options: (string | { value, label })[]`
// Used for seeding defaults in Add-mode only.                                        // inline-review
const valuesFromSelectField = (field) => {
  if (!field) return [];
  if (Array.isArray(field.options)) {
    return field.options.map((o) =>
      typeof o === "string" ? o : String(o?.value ?? "")
    );
  }
  if (Array.isArray(field.enum)) return field.enum.map((v) => String(v));
  return [];
};

// Format a JS Date → 'yyyy-mm-dd' (HTML date input expects a string, not Date)       // inline-review
const fmtYmd = (d) => {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ──────────────────────────────────────────────────────────────────────────────
// 🧹 Firestore-safe payload helpers (NO behavior change to UI; write-only)
// Firestore rejects `undefined`. We prune it, and we serialize Date → 'yyyy-mm-dd'
// because this app’s domain model stores dates as strings (audit fields use Timestamps).
// These helpers are tiny, local, and only used just before add/update.               // inline-review
const deleteByPath = (obj, path) => {
  const parts = path.split(".");
  const last = parts.pop();
  let cursor = obj;
  for (const k of parts) {
    if (!cursor || typeof cursor !== "object") return;
    cursor = cursor[k];
  }
  if (cursor && Object.prototype.hasOwnProperty.call(cursor, last))
    delete cursor[last];
};
const isPlainObject = (v) => v && typeof v === "object" && !Array.isArray(v);
const pruneUndefinedDeep = (obj) => {
  if (!isPlainObject(obj)) return obj;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined) {
      delete obj[k];
    } else if (Array.isArray(v)) {
      for (let i = v.length - 1; i >= 0; i--) {
        if (v[i] === undefined) v.splice(i, 1);
        else if (isPlainObject(v[i])) pruneUndefinedDeep(v[i]);
      }
    } else if (isPlainObject(v)) {
      pruneUndefinedDeep(v);
      if (Object.keys(v).length === 0) delete obj[k];
    }
  }
  return obj;
};

const sanitizeForWrite = (dataObj, schemaFields) => {
  // create a safe, shallow JSON clone (we only set/delete with dot-paths)
  const out = JSON.parse(JSON.stringify(dataObj ?? {}));

  // Walk schema so we only touch declared fields (least surprise).                            // inline-review
  (schemaFields || []).forEach((f) => {
    const v = getByPath(out, f.path);
    if (f.type === "date") {
      // UI may carry Date | '' | undefined. Store string or drop field entirely.
      if (v instanceof Date) {
        setByPath(out, f.path, fmtYmd(v));
      } else if (v === "" || v === undefined || v === null) {
        deleteByPath(out, f.path); // ← avoid Firestore "Unsupported field value: undefined"
      }
    } else {
      if (v === undefined) deleteByPath(out, f.path);
    }
  });

  pruneUndefinedDeep(out);
  return out;
};
// ─────────

// Flatten schema to uniform list of fields { path, type, label, required, enum, allowBlank, sensitive }
const flattenSchema = (schema) =>
  // ⚠️ Restore correct `map(() => { ... return {...}; })` form; previous edit left stray tokens.     // inline-review
  (schema?.fields ?? schema?.form ?? []).map((f) => {
    const out = {
      path: f.path,
      type: f.type,
      label: f.label || f.path.split(".").slice(-1)[0],
      required: !!f.required,
      enum: Array.isArray(f.enum) ? f.enum : undefined, // renderer (legacy) may consume strings via `enum`
      options: Array.isArray(f.options) ? f.options : undefined, // 🔎 pass through modern {value,label} or string[]
      allowBlank: !!f.allowBlank,
      sensitive: !!f.sensitive,
      immutable: !!f.immutable,
      editableOnCreate: !!f.editableOnCreate,
      hideOnChange: !!f.hideOnChange, // schema-driven visibility in Change mode
    };

    // ── DIAG A: log how the two selects are defined in schema (no behavior change) ────────────────
    if (f.path === "employmentStatus" || f.path === "employmentType") {
      const normalizedPreview = Array.isArray(f.enum)
        ? f.enum.slice(0, 3)
        : Array.isArray(f.options)
        ? (f.options || []).slice(0, 3)
        : [];
      dbg("[Add] normalize(select)", {
        path: f.path,
        from: Array.isArray(f.enum)
          ? "enum"
          : Array.isArray(f.options)
          ? "options"
          : "none",
        enumLen: Array.isArray(out.enum) ? out.enum.length : 0,
        optionsLen: Array.isArray(out.options) ? out.options.length : 0,
        sample: normalizedPreview,
      });
    }

    return out;
  });

// ─────────────────────────────────────────────────────────────────────────────@@

const DataEntryForm = ({ selectedBranch, initialData, onSave, onCancel }) => {
  const { db, tenantId, user } = useContext(FirebaseContext); // add user for audit stamping
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [vendorOptions, setVendorOptions] = useState([]); // populated when Expenses has vendor picker  // inline-review
  const [vendorLoading, setVendorLoading] = useState(true); // show "Loading…" only while fetching       // inline-review

  // Use the same resolver the rest of the app uses; do NOT lowercase ad-hoc.                        // inline-review
  const collectionName = collectionIdForBranch(selectedBranch);

  const normalized = useMemo(() => {
    const key =
      collectionName.charAt(0).toUpperCase() + collectionName.slice(1);
    const schema = CollectionSchemas[key] || null; // schema key still uses LeadingCaps (e.g., "Customers")  // inline-review
    // ── DIAG A: confirm which schema we resolved for this branch/collection ───────────────────────
    dbg("[Add] schema lookup", {
      selectedBranch,
      collectionName, // e.g., "employees"
      resolvedKey: key,
      hasSchema: !!schema,
      hasFields: Array.isArray(schema?.fields),
      fieldsCount: (schema?.fields || []).length,
      // glance at the two fields we’re chasing; safe, non-PII
      statusField: (schema?.fields || []).find(
        (f) => f.path === "employmentStatus"
      ),
      typeField: (schema?.fields || []).find(
        (f) => f.path === "employmentType"
      ),
    });
    return schema;
  }, [collectionName]);

  // Only use the unified CollectionSchemas; if none, render no fields.
  const schemaFields = useMemo(
    () => (normalized ? flattenSchema(normalized) : []),
    [normalized]
  );

  // Load Vendors for picker dropdown in Expenses Add form
  useEffect(() => {
    const hasVendorPicker = (schemaFields || []).some(
      (f) =>
        f.path === "vendorNbr" && (f.type === "picker" || f.type === "select")
    );
    if (!hasVendorPicker) return;

    let cancelled = false;
    (async () => {
      try {
        const appId = getAppId();
        const fullPath = tenantCollectionPath({
          appId,
          tenantId,
          key: "vendors",
        });
        const q = query(collection(db, fullPath));
        const snap = await getDocs(q);

        // ── DIAG: show raw vendor count + first doc for troubleshooting ────────────────────────────
        dbg("[Vendors] snapshot", {
          count: snap.size,
          firstId: snap.docs[0]?.id,
          firstData: snap.docs[0]?.data?.(),
        });

        // Be resilient to field naming drift: accept vendorNbr | vendorNumber | number | code | id
        const opts = snap.docs
          .map((d) => {
            const r = { id: d.id, ...(d.data?.() ?? d.data()) }; // compat for older Firestore SDK typings
            const vNbr =
              r.vendorNbr ??
              r.vendorNumber ??
              r.vendor_no ??
              r.vendorNo ??
              r.number ??
              r.code ??
              r.vendorCode ??
              r.id; // final fallback
            const vName = r.vendorName ?? r.name ?? r.displayName ?? "";
            // Label: "123 — Acme" (falls back gracefully)
            const label = vName ? `${String(vNbr)} — ${vName}` : String(vNbr);
            return {
              id: r.id,
              value: String(d.id), // ← FIX: picker value is ALWAYS the vendor document id
              label,
              meta: { vendorNbr: String(vNbr ?? ""), vendorName: vName },
            };
          })
          // Drop badly shaped docs only if they have no usable key at all
          .filter((o) => o.value);

        dbg("[Vendors] derived options", {
          count: opts.length,
          sample: opts[0],
        });

        /* Minimal, targeted console view (no behavior changes) */ // debug-inline
        if (opts.length) {
          // Show the exact values the picker will render and bind to                                     // debug-inline
          // Helps confirm whether value is a doc id vs. a vendor number                                  // debug-inline
          // (We limit fields to keep logs clean.)                                                         // debug-inline
          // eslint-disable-next-line no-console
          console.table(
            opts.map((o) => ({ id: o.id, value: o.value, label: o.label }))
          );
        }

        if (!cancelled) {
          setVendorOptions(opts);
          setVendorLoading(false);
        } // ← FIX: remove duplicate sets   // inline-review
      } catch (e) {
        console.error("Failed loading vendors for picker", e);
        if (!cancelled) setVendorOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, tenantId, schemaFields]);

  // ── DIAG B: show the flattened view the renderer will use (first few only) ──────────────────────
  useEffect(() => {
    const brief = (f) => ({
      path: f.path,
      type: f.type,
      required: !!f.required,
      enumLen: Array.isArray(f.enum) ? f.enum.length : 0,
    });
    dbg(
      "[Add] flatten result (first 8)",
      (schemaFields || []).slice(0, 8).map(brief)
    );
    dbg("[Add] select metas", {
      employmentStatus: (schemaFields || []).find(
        (f) => f.path === "employmentStatus"
      ),
      employmentType: (schemaFields || []).find(
        (f) => f.path === "employmentType"
      ),
    });
  }, [schemaFields]);

  // Determine mode once for render logic below
  const isEditMode = selectedBranch.includes("Change");

  // -------- Dynamic options (countries/currencies) via Intl with safe fallbacks --------
  const countryOptions = useMemo(() => {
    try {
      const codes =
        typeof Intl.supportedValuesOf === "function"
          ? Intl.supportedValuesOf("region")
          : ["US", "CA", "GB", "DE", "FR", "AU", "JP", "CN", "IN", "BR", "MX"]; // small fallback
      const dn = new Intl.DisplayNames([navigator.language || "en"], {
        type: "region",
      });
      return codes.map((c) => ({ value: c, label: `${c} — ${dn.of(c) || c}` }));
    } catch {
      return [
        { value: "US", label: "US — United States" },
        { value: "CA", label: "CA — Canada" },
      ];
    }
  }, []);

  const currencyOptions = useMemo(() => {
    try {
      const codes =
        typeof Intl.supportedValuesOf === "function"
          ? Intl.supportedValuesOf("currency")
          : ["USD", "EUR", "GBP", "JPY", "AUD", "CAD"];
      const dn = new Intl.DisplayNames([navigator.language || "en"], {
        type: "currency",
      });
      return codes.map((c) => ({ value: c, label: `${c} — ${dn.of(c) || c}` }));
    } catch {
      return [
        { value: "USD", label: "USD — US Dollar" },
        { value: "EUR", label: "EUR — Euro" },
      ];
    }
  }, []);
  // Narrow, no-network “API”: select menu for US states; free-form for everywhere else.            // inline-review
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

  useEffect(() => {
    // initialize form state from initialData (edit) OR empty defaults (add)
    const next = {};

    schemaFields.forEach((f) => {
      const v = initialData ? getByPath(initialData, f.path) : undefined;

      // Dates in *domain fields* (e.g., hireDate) are stored as 'yyyy-mm-dd' strings.
      // Audit fields (createdAt/updatedAt/deletedAt) may be Firestore Timestamps.
      // HTML <input type="date"> requires a string 'yyyy-mm-dd', not a Date object.               // inline-review
      if (f.type === "date") {
        if (v == null || v === "") {
          setByPath(next, f.path, ""); // keep controlled input happy
        } else if (typeof v === "string") {
          setByPath(next, f.path, v); // already normalized
        } else if (v && typeof v.toDate === "function") {
          setByPath(next, f.path, fmtYmd(v.toDate())); // Firestore Timestamp → string
        } else if (v instanceof Date) {
          setByPath(next, f.path, fmtYmd(v)); // safety
        } else {
          setByPath(next, f.path, ""); // unknown shape → blank
        }
      } else {
        setByPath(next, f.path, v);
      }
    });

    // 🧩 Seed required selects in **Add** mode when no value is bound yet (do not override in Change)
    if (!isEditMode) {
      (schemaFields || [])
        .filter((f) => f.type === "select" && f.required && !f.allowBlank)
        .forEach((f) => {
          const current = getByPath(next, f.path);
          if (current === undefined || current === "") {
            const candidates = valuesFromSelectField(f);
            const first = candidates.length > 0 ? candidates[0] : undefined;
            if (first !== undefined) {
              setByPath(next, f.path, first);
              if (
                f.path === "employmentStatus" ||
                f.path === "employmentType"
              ) {
                fdbg("[seed] select default", {
                  path: f.path,
                  chosen: first,
                  source: Array.isArray(f.options)
                    ? "options"
                    : Array.isArray(f.enum)
                    ? "enum"
                    : "none",
                });
              }
            }
          }
        });
    } else {
      // Targeted, quiet diagnostics for Change-mode casing/missing field issues
      const snapshot = {
        employmentStatus: getByPath(initialData || {}, "employmentStatus"),
        employmentType: getByPath(initialData || {}, "employmentType"),
        hireDate: getByPath(initialData || {}, "hireDate"),
        deleted: getByPath(initialData || {}, "deleted"),
        deletedAt: getByPath(initialData || {}, "deletedAt"),
        deletedBy: getByPath(initialData || {}, "deletedBy"),
      };
      fdbg("[change:init] incoming initialData picks", snapshot);
      cdbg("[change:init] incoming initialData picks", snapshot);
    }
    // Avoid re-trigger loops: only set state when something actually changed                             // guard
    const prevJson = JSON.stringify(formData || {});
    const nextJson = JSON.stringify(next);
    if (prevJson !== nextJson) {
      setFormData(next);
    } else {
      fdbg("[change:init] no-op setFormData (unchanged snapshot)", {
        size: nextJson.length,
      });
    }
  }, [initialData, schemaFields]);

  // ── DIAG C: whenever the two selects change, show the bound values (controlled state) ───────────
  useEffect(() => {
    fdbg("[Add] binding snapshot", {
      statusValue: formData?.employmentStatus ?? "(undefined)",
      typeValue: formData?.employmentType ?? "(undefined)",
    });
  }, [formData?.employmentStatus, formData?.employmentType]);

  const handleChange = (path, value) => {
    // generic setter for any input (supports nested)
    setFormData((prev) => {
      const clone = structuredClone
        ? structuredClone(prev)
        : JSON.parse(JSON.stringify(prev)); // safe deep copy
      const schemaField = schemaFields.find((f) => f.path === path);
      if (schemaField?.type === "date") {
        setByPath(clone, path, toJsDate(value));
      } else {
        setByPath(clone, path, value);
      }

      // ── DIAG D: capture select changes for the two target fields ────────────────────────────────
      if (path === "employmentStatus" || path === "employmentType") {
        fdbg("[Add] select change", { path, value });
      }

      // ── DIAG B: capture select changes for Employment fields only (no PII) ───────────────────────
      if (path === "employmentStatus" || path === "employmentType") {
        fdbg("[Add] select change", { path, value });
      }

      return clone;
    });
  };

  const handleCheckboxChange = (path) => {
    setFormData((prev) => {
      const clone = structuredClone
        ? structuredClone(prev)
        : JSON.parse(JSON.stringify(prev));
      const current = !!getByPath(clone, path);
      setByPath(clone, path, !current);
      return clone;
    });
  };

  // [diag] observe controlled values for the two selects during typing/selecting                    // inline-review
  useEffect(() => {
    fdbg("[Add] binding snapshot", {
      statusValue: formData?.employmentStatus ?? "(undefined)",
      typeValue: formData?.employmentType ?? "(undefined)",
    });
  }, [formData?.employmentStatus, formData?.employmentType]);

  // ── DIAG C: whenever bound values for the two selects change, show controlled-state snapshot ────
  useEffect(() => {
    fdbg("[Add] binding snapshot", {
      statusValue: formData?.employmentStatus ?? "(undefined)",
      typeValue: formData?.employmentType ?? "(undefined)",
    });
  }, [formData?.employmentStatus, formData?.employmentType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // ── DIAG E: snapshot just before validation/payload build (sanitized to target fields only) ─
      const statusMeta = (schemaFields || []).find(
        (f) => f.path === "employmentStatus"
      );
      const typeMeta = (schemaFields || []).find(
        (f) => f.path === "employmentType"
      );
      dbg("[Add] pre-validate snapshot", {
        status: formData?.employmentStatus ?? "(undefined)",
        type: formData?.employmentType ?? "(undefined)",
        statusRequired: !!statusMeta?.required,
        typeRequired: !!typeMeta?.required,
        // Count from whichever list the schema provided: options (objects/strings) or enum (strings)
        statusChoicesLen: Array.isArray(statusMeta?.options)
          ? statusMeta.options.length
          : Array.isArray(statusMeta?.enum)
          ? statusMeta.enum.length
          : 0,
        typeChoicesLen: Array.isArray(typeMeta?.options)
          ? typeMeta.options.length
          : Array.isArray(typeMeta?.enum)
          ? typeMeta.enum.length
          : 0,
      });

      // basic client-side validation (allow blanks where not required)
      const errors = validate();
      if (errors.length) {
        dbg("[Add] validate errors", errors); // 🔎 which fields failed
        dbg("[Add] values on error", {
          employmentStatus: formData?.employmentStatus ?? "(undefined)",
          employmentType: formData?.employmentType ?? "(undefined)",
        });
        setMessage(errors.join(", ")); // keep user-friendly for now
        setLoading(false);
        return;
      }

      // 🧹 NEW: deep sanitize just before write (drop undefineds, format dates)                     // inline-review
      const prepared = sanitizeForWrite(formData, schemaFields);
      dbg("[Add] sanitize result", {
        hasDOB: Object.prototype.hasOwnProperty.call(prepared, "dateOfBirth"),
        dateOfBirth: prepared.dateOfBirth ?? "(omitted)",
      });

      // Preserve sensitive-field handling
      const clean = await encryptIfSensitive(prepared);

      // normalize shipping if useBilling (if applicable)
      const isEditMode = selectedBranch.includes("Change");
      // Resolve app namespace from centralized config (no globals/env scatter).                        // inline-review
      const appId = getAppId();

      const collectionPath = tenantCollectionPath({
        appId,
        tenantId,
        key: collectionName,
      }); // canonical path // inline-review
      if (DEBUG_FIRESTORE) {
        console.log("[DataEntryForm] collectionPath:", collectionPath); // <-- helps you locate the document in Firestore
        // ── DIAG F: show the two fields that will be saved (sanitized happens below) ─────────────
        dbg("[Add] path + current values", {
          path: collectionPath,
          tenantId,
          appId,
          employmentStatus: formData?.employmentStatus ?? "(undefined)",
          employmentType: formData?.employmentType ?? "(undefined)",
        });
      }

      // Server clock  actor for audit                                                         // inline-review
      const now = serverTimestamp();
      const actor = user?.email || user?.uid || "unknown";

      // ---- Vendor & Expense validation / custom id logic ----
      if (collectionName === "vendors") {
        const vendorNbr = (clean.vendorNbr || "").trim();
        if (!vendorNbr) {
          alert("Vendor Number is required.");
          return;
        }

        /* ───── Minimal, explicit debug before we change any logic ───── */ // debug-inline
        const candidate = vendorOptions.find(
          (o) => o.value === String(vendorNbr || "")
        );
        // eslint-disable-next-line no-console
        console.info("[Expense] attempting to write using vendor key", {
          tenantId,
          vendorNbr,
          vendorId: clean?.vendorId || null,
          optionsCount: vendorOptions.length,
          matchedOption: candidate
            ? {
                id: candidate.id,
                value: candidate.value,
                label: candidate.label,
              }
            : null,
        });
        const exists = await vendorExists({ db, appId, tenantId, vendorNbr });

        if (exists) {
          // eslint-disable-next-line no-console
          console.warn("[Expense] vendor lookup FAILED", {
            vendorNbr,
            vendorId: clean?.vendorId || null,
          });

          alert(
            `Vendor Number '${vendorNbr}' already exists for this company.`
          );
          return;
        }
        // Use vendorNbr as the doc id to guarantee uniqueness
        await setDoc(doc(collection(db, collectionPath), vendorNbr), {
          ...clean,
          vendorNbr,
          tenantId,
          appId,
          createdAt: serverTimestamp(),
          createdBy: user?.email || "system",
          updatedAt: serverTimestamp(),
          updatedBy: user?.email || "system",
        });
        onSave?.();
        return;
      }

      if (collectionName === "expenses") {
        const vendorId = (clean.vendorId || "").trim(); // read the strong key (doc id)
        if (!vendorId) {
          alert("Expense must be linked to a vendor. Please select a vendor.");

          return;
        }

        /* ───── Minimal, explicit debug before we change any logic ───── */ // debug-inline
        const candidate = vendorOptions.find(
          (o) => o.value === String(vendorId || "")
        );
        // eslint-disable-next-line no-console
        console.info("[Expense] attempting to write using vendor key", {
          tenantId,
          vendorId: clean?.vendorId || null,
          vendorNbr: clean?.vendorNbr || "(to-derive)",
          optionsCount: vendorOptions.length,
          matchedOption: candidate
            ? {
                id: candidate.id,
                value: candidate.value,
                label: candidate.label,
              }
            : null,
        });

        // If vendorNbr missing (legacy), derive it from vendor doc before we write                   // inline-review
        if (!clean.vendorNbr) {
          try {
            const vPath = tenantCollectionPath({
              appId: getAppId(),
              tenantId,
              key: "vendors",
            });
            const vSnap = await getDoc(doc(collection(db, vPath), vendorId));
            const vData = vSnap.exists() ? vSnap.data() : null;
            clean.vendorNbr =
              vData?.vendorNbr ??
              vData?.vendorNumber ??
              vData?.vendor_no ??
              vData?.vendorNo ??
              vData?.number ??
              vData?.code ??
              vData?.vendorCode ??
              vendorId; // last-resort fallback (doc id)

            // NEW: persist friendly name alongside number for list views (denormalized for speed)
            if (!clean.vendorName) {
              clean.vendorName =
                vData?.vendorName ?? vData?.name ?? vData?.displayName ?? ""; // inline-review
            }
          } catch (_) {
            clean.vendorNbr = ""; // leave empty rather than exposing doc id
            if (!clean.vendorName) clean.vendorName = "";
          }
        } else if (!clean.vendorName) {
          // If number was already set but name wasn't, try to backfill name quickly
          try {
            const vPath = tenantCollectionPath({
              appId: getAppId(),
              tenantId,
              key: "vendors",
            });
            const vSnap = await getDoc(doc(collection(db, vPath), vendorId));
            const vData = vSnap.exists() ? vSnap.data() : null;
            clean.vendorName =
              vData?.vendorName ?? vData?.name ?? vData?.displayName ?? "";
          } catch {
            /* ignore; keep empty string */
          }
        }

        const exists = await vendorExists({
          db,
          appId,
          tenantId,
          vendorId,
          vendorNbr: clean.vendorNbr,
        });

        if (!exists) {
          // eslint-disable-next-line no-console
          console.warn("[Expense] vendor lookup FAILED", {
            vendorId: clean?.vendorId || null,
            vendorNbr: clean?.vendorNbr || "(unset)",
          });

          alert(
            `Vendor was not found. Please re-select a vendor from the list and retry.`
          );
          return;
        }
      }

      if (isEditMode) {
        if (initialData && initialData.id) {
          const docRef = doc(db, collectionPath, initialData.id);
          // DIAG: show delete flags just before we compose update payload
          const prevDeleted = !!getByPath(initialData || {}, "deleted");
          const nextDeleted = !!getByPath(formData || {}, "deleted");
          cdbg("[change] delete reconcile (pre-update)", {
            prevDeleted,
            nextDeleted,
            existingDeletedAt:
              getByPath(initialData || {}, "deletedAt") ?? null,
            existingDeletedBy:
              getByPath(initialData || {}, "deletedBy") ?? null,
          });

          const updatePayload = {
            ...clean,
            tenantId,
            ...(appId ? { appId } : {}),
            updatedAt: now,
            updatedBy: actor,
          };

          if (collectionName === "invoices" && clean.paid && !clean.paidAt)
            updatePayload.paidAt = now;

          await updateDoc(docRef, updatePayload);

          // ──────────────────────────────────────────────────────────
          // Auto-transactions: INVOICE paid (Change mode → income txn)
          // ──────────────────────────────────────────────────────────
          if (collectionName === "invoices") {
            const prevPaid = !!getByPath(initialData || {}, "paid");
            const nextPaid = !!getByPath(formData || {}, "paid");
            if (!prevPaid && nextPaid) {
              try {
                const txnPath = tenantCollectionPath({
                  appId,
                  tenantId,
                  key: "transactions",
                });
                const incomeTxn = {
                  txnDate: getByPath(formData, "paidAt") || serverTimestamp(),
                  type: "income",
                  source: `invoice:${initialData.id}`,
                  category: "receivable",
                  amount: Number(
                    getByPath(formData, "total") ||
                      getByPath(formData, "grandTotal") ||
                      0
                  ),
                  tenantId,
                  ...(appId ? { appId } : {}),
                  reconciled: false,
                  createdAt: now,
                  createdBy: actor,
                  updatedAt: now,
                  updatedBy: actor,
                };
                await addDoc(collection(db, txnPath), incomeTxn);
              } catch (e) {
                console.warn(
                  "Auto-transaction (invoice paid) failed (non-fatal):",
                  e
                );
              }
            }
          }

          if (DEBUG_FIRESTORE) {
            console.log("[DataEntryForm] updated doc id:", initialData.id);

            cdbg("[change] update ok", { id: initialData.id });

            dbg("[Add] update payload (employment fields only)", {
              employmentStatus:
                updatePayload?.employmentStatus ?? "(undefined)",
              employmentType: updatePayload?.employmentType ?? "(undefined)",
            });
          }
          setMessage(
            `${selectedBranch.replace(
              "Change ",
              ""
            )} updated successfully! (id: ${initialData.id})`
          );
        }
      } else {
        const createPayload = {
          ...clean,
          tenantId,
          ...(appId ? { appId } : {}),
          createdAt: now,
          createdBy: actor,
          updatedAt: now,
          updatedBy: actor,
        };

        if (
          collectionName === "invoices" &&
          createPayload.paid &&
          !createPayload.paidAt
        ) {
          createPayload.paidAt = now;
        }

        const docRef = await addDoc(
          collection(db, collectionPath),
          createPayload
        );

        // ──────────────────────────────────────────────────────────
        // Auto-transactions (Create mode) — single, tidy block (removed duplicate nested try)         // inline-review
        // ──────────────────────────────────────────────────────────
        try {
          const txnPath = tenantCollectionPath({
            appId,
            tenantId,
            key: "transactions",
          });
          if (collectionName === "expenses") {
            await addDoc(collection(db, txnPath), {
              txnDate: createPayload.expenseDate || serverTimestamp(),
              type: "expense",
              source: `expense:${docRef.id}`,
              category: createPayload.category || "other",
              amount: Number(createPayload.amount || 0),
              tenantId,
              ...(appId ? { appId } : {}),
              reconciled: false,
              createdAt: now,
              createdBy: actor,
              updatedAt: now,
              updatedBy: actor,
            });
          } else if (collectionName === "invoices" && !!createPayload.paid) {
            await addDoc(collection(db, txnPath), {
              txnDate: createPayload.paidAt || serverTimestamp(),
              type: "income",
              source: `invoice:${docRef.id}`,
              category: "receivable",
              amount: Number(
                createPayload.total || createPayload.grandTotal || 0
              ),
              tenantId,
              ...(appId ? { appId } : {}),
              reconciled: false,
              createdAt: now,
              createdBy: actor,
              updatedAt: now,
              updatedBy: actor,
            });
          }
        } catch (e) {
          console.warn("Auto-transaction (create) failed (non-fatal):", e);
        }

        if (DEBUG_FIRESTORE) {
          console.log("[DataEntryForm] created doc id:", docRef.id);

          dbg("[Add] create payload (employment fields only)", {
            employmentStatus: createPayload?.employmentStatus ?? "(undefined)",
            employmentType: createPayload?.employmentType ?? "(undefined)",
          });
        }
        setFormData({});
        setMessage(
          `${selectedBranch.replace("Add ", "")} added successfully! (id: ${
            docRef.id
          })\nPath: ${collectionPath}`
        );
      }

      if (isEditMode && onSave) {
        setTimeout(() => onSave(), 0);
      }
    } catch (error) {
      console.error("Error saving data:", error);
      setMessage("Failed to save data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // const getFormTitle = () => {
  //     return selectedBranch;
  // };

  const getFormTitle = () => selectedBranch;

  // Minimal client-side validation (email/phone/required). We keep it gentle and allow blanks when specified.
  const validate = () => {
    const errors = [];
    for (const f of schemaFields) {
      const v = getByPath(formData, f.path);
      if (f.required && (v === "" || v == null))
        errors.push(`${f.label} is required`);

      // ── DIAG G: focus on the two selects when they fail validation ─────────────────────────────
      if (
        f.required &&
        (f.path === "employmentStatus" || f.path === "employmentType")
      ) {
        dbg("[validate] employment required check", {
          path: f.path,
          value: v,
          isEmpty: v === "" || v == null,
        });
      }

      if (f.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        errors.push("Invalid email");
      //                                  ^^^^^^^  FIX: add '+' quantifiers to email regex
      if (f.type === "tel" && v && !/^[+()0-9\-\s]{7,}$/.test(v))
        errors.push("Invalid phone");
      // number/date fields are handled by inputs themselves
    }

    // Enforce that Expenses.vendorNbr matches a valid vendor option
    if (collectionName === "expenses") {
      const vId = getByPath(formData, "vendorId");
      if (!vId) {
        errors.push("Select a vendor from the list (vendor is required)."); // stricter + clearer
      } else if (!vendorOptions.some((o) => o.value === String(vId))) {
        errors.push("Selected vendor is not in the list. Please re-select."); // avoids stale values
      }
    }

    return errors;
  };

  // Hook for field-level encryption for fields marked {sensitive:true}.
  // IMPORTANT: This is a stub – use server-provided keys in production (do NOT hardcode secrets in client).
  const encryptIfSensitive = async (dataObj) => {
    const clone = structuredClone
      ? structuredClone(dataObj)
      : JSON.parse(JSON.stringify(dataObj));
    for (const f of schemaFields) {
      if (!f.sensitive) continue;
      const current = getByPath(clone, f.path);
      if (!current) continue;
      // TODO: replace with real crypto; for now, mark with prefix to make migration explicit later.
      const ciphertext = `enc::${current}`; // placeholder; swap with WebCrypto + tenant-scoped key later
      setByPath(clone, f.path, ciphertext);
    }
    return clone;
  };

  // BIG FORM RENDERER. This could be broken down further but we want all the logic in one place for now.
  // We rely on native HTML5 input types and validation as much as possible to minimize complexity.
  // We do NOT use Formik or similar to keep control tight and avoid extra dependencies.
  // We do NOT use a JSON Schema form generator because we want full control over the UX and DOM.

  return (
    <div className="p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {getFormTitle()}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {schemaFields

          // Hide fields explicitly flagged to be hidden on Change screen (createdAt/updatedAt).     // inline-review
          //    .filter((f) => !(isEditMode && f.hideOnChange))  STEVE- commented out for testing!!
          .filter((f) => !(isEditMode && f.hideOnAdd))
          //

          //
          // On Add: show non-immutable OR explicitly marked editableOnCreate. On Change: show all
          // (locks are applied via disabled/readOnly).                                               // inline-review
          .filter((f) =>
            isEditMode ? true : !f.immutable || f.editableOnCreate
          )
          .map((field) => {
            // Prefer modern `options` (objects or strings), fall back to legacy `enum` (strings)
            const {
              path,
              type,
              label,
              options,
              enum: enumList,
              allowBlank,
              required, // ← bring required into scope for vendor picker/use of native required          // inline-review
              help, // ← bring help into scope so JSX `{help && …}` is defined                         // inline-review
            } = field;
            const placeholder =
              label ||
              path
                .split(".")
                .slice(-1)[0]
                .replace(/([A-Z])/g, " $1")
                .trim();

            const isSelect = type === "select";
            const isCheckbox = type === "checkbox";
            // Lock when in Change-mode AND field is immutable by field flag or meta list.               // inline-review
            const isImmutable =
              !!field.immutable ||
              !!(normalized?.meta?.immutable ?? []).includes(path);
            const locked = isEditMode && isImmutable; // compute ONCE per field                          // inline-review

            // Normalize which list the <select> should render
            // precedence: schema.options → schema.enum  (both may be string[]; options may also be [{value,label}])
            let dynamicOptions = options ?? enumList;
            if (!dynamicOptions && isSelect) {
              if (path.endsWith(".country"))
                dynamicOptions = countryOptions.map((o) => o.value);
              if (path === "credit.currency")
                dynamicOptions = currencyOptions.map((o) => o.value);
            } // ← FIX: close conditional before returning JSX (was causing “Unexpected token )”)  // inline-review

            // ── DIAG D: at render time, confirm the options and current binding for Employment* ────
            if (
              isSelect &&
              (path === "employmentStatus" || path === "employmentType")
            ) {
              dbg("[Add] render select", {
                path,
                optionsCount: Array.isArray(dynamicOptions)
                  ? dynamicOptions.length
                  : 0, // use the actual list we render
                first: (dynamicOptions || [])[0],
                valueBound: getByPath(formData, path) ?? "(undefined)",
              });
            }

            // Special-case: Vendor picker (Expenses) — force dropdown tied to Vendors collection
            if (
              path === "vendorNbr" &&
              (type === "picker" || type === "select")
            ) {
              return (
                <div key={path}>
                  <label
                    htmlFor={path}
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    {label}{" "}
                    {required && <span className="text-red-500">*</span>}{" "}
                    {/* native a11y hint */}
                  </label>
                  <select
                    id="vendorId" /* bind select to vendorId even though field is vendorNbr */
                    name="vendorId"
                    required={required}
                    disabled={locked}
                    value={getByPath(formData, "vendorId") ?? ""} // control by vendorId (doc id)           // inline-review
                    onChange={(e) => {
                      const v = e.target.value; // doc id
                      const match = vendorOptions.find((o) => o.value === v);
                      setFormData((prev) => {
                        const clone = structuredClone
                          ? structuredClone(prev)
                          : JSON.parse(JSON.stringify(prev));
                        setByPath(clone, "vendorId", v); // strong FK
                        setByPath(
                          clone,
                          "vendorNbr",
                          match?.meta?.vendorNbr || v
                        ); // human key fallback
                        setByPath(
                          clone,
                          "vendorName",
                          match?.meta?.vendorName || ""
                        ); // denormalized name
                        return clone;
                      });
                    }}
                    className={`w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      locked ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                  >
                    <option value="" disabled>
                      {vendorLoading
                        ? "Loading…"
                        : vendorOptions.length
                        ? "Select a vendor…"
                        : "No vendors found"}
                    </option>
                    {vendorOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
                </div>
              );
            }

            // Special-case: State/Region — if US, show a dropdown of states, otherwise freeform.  // inline-review
            if (path.endsWith(".state")) {
              const selectedCountry = getByPath(
                formData,
                "billing.address.country"
              );
              if (selectedCountry === "US") {
                return (
                  <div key={path}>
                    <label
                      htmlFor={path}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      {placeholder}
                    </label>
                    <select
                      id={path}
                      name={path}
                      value={getByPath(formData, path) ?? ""} // controlled; seeded in Add-mode if required+no-blank
                      onChange={(e) => handleChange(path, e.target.value || "")}
                      disabled={locked}
                      className={`w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        locked ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                    >
                      <option value="">{""}</option>
                      {US_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              // Non-US: fall through to free-form input below (text).                           // inline-review
            }

            return (
              <div key={path}>
                <label
                  htmlFor={path}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {placeholder}
                </label>

                {isSelect ? (
                  <select
                    id={path}
                    name={path}
                    value={getByPath(formData, path) ?? ""}
                    onChange={(e) => handleChange(path, e.target.value || "")}
                    className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    {allowBlank && <option value="">{""}</option>}
                    {(dynamicOptions || []).map((opt) => {
                      // Support BOTH shapes without changing semantics:
                      //  - string: "Active"
                      //  - object: { value: "Active", label: "Active" }
                      const v = typeof opt === "string" ? opt : opt?.value;
                      const l =
                        typeof opt === "string"
                          ? opt
                          : opt?.label ?? opt?.value;
                      return (
                        <option key={String(v)} value={String(v)}>
                          {String(l ?? "")}
                        </option>
                      );
                    })}
                  </select>
                ) : isCheckbox ? (
                  <input
                    id={path}
                    name={path}
                    type="checkbox"
                    checked={!!getByPath(formData, path)}
                    onChange={() => handleCheckboxChange(path)}
                    className="h-4 w-4"
                  />
                ) : type === "date" ? (
                  (() => {
                    const selected = toJsDate(getByPath(formData, path)); // always Date|null            // inline-review
                    const isAudit =
                      path === "createdAt" || path === "updatedAt"; // system fields       // inline-review
                    if (locked || isAudit) {
                      // Always render read-only TEXT for locked/audit dates (no native date input).     // inline-review
                      return (
                        <input
                          id={path}
                          type="text"
                          value={formatDate(selected)}
                          readOnly
                          className="w-full p-2 border rounded-md bg-gray-100 cursor-not-allowed"
                          aria-readonly="true"
                        />
                      );
                    }
                    // Editable path: use react-datepicker with a real Date (or null)                    // inline-review
                    return (
                      <DatePicker
                        id={path}
                        selected={selected}
                        onChange={(date) => handleChange(path, date)}
                        dateFormat={DATE_DISPLAY}
                        className="w-full p-2 border rounded-md"
                      />
                    );
                  })()
                ) : type === "textarea" ? (
                  <textarea
                    id={path}
                    name={path}
                    value={getByPath(formData, path) ?? ""}
                    onChange={(e) => handleChange(path, e.target.value)}
                    readOnly={locked}
                    className={`w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      locked ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                    rows={4}
                  />
                ) : type === "file" ? (
                  <div className="space-y-2">
                    <input
                      id={path}
                      name={path}
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={locked}
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) {
                          handleChange(path, null);
                          return;
                        }
                        const dataUrl = await fileToDataUrl(f);
                        // Store compact receipt object: name/size/type + dataUrl
                        handleChange(path, {
                          name: f.name,
                          size: f.size,
                          type: f.type,
                          dataUrl,
                        });
                      }}
                      className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    {/* Tiny preview if it's an image */}
                    {(() => {
                      const val = getByPath(formData, path);
                      const isImg = val?.type?.startsWith("image/");
                      if (!val) return null;
                      return (
                        <div className="flex items-center gap-3">
                          {isImg && (
                            <img
                              src={val.dataUrl}
                              alt={val.name || "receipt"}
                              className="h-14 w-14 object-cover rounded border"
                            />
                          )}
                          <button
                            type="button"
                            className="text-xs px-2 py-1 rounded border"
                            onClick={() => handleChange(path, null)}
                          >
                            Remove file
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <input
                    id={path}
                    name={path}
                    type={type}
                    value={getByPath(formData, path) ?? ""}
                    onChange={(e) => handleChange(path, e.target.value)}
                    required={
                      false /* we validate manually to allow blank selects */
                    }
                    className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                )}
              </div>
            );
          })}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
            <span>Cancel</span>
          </button>
          <button
            type="submit"
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
            disabled={loading}
          >
            <Save size={20} />
            <span>{loading ? "Saving..." : "Save"}</span>
          </button>
        </div>
      </form>
      {message && <p className="mt-4 text-center text-green-600">{message}</p>}
    </div>
  );
};
export default DataEntryForm;

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: handleSubmit lives above (elided in this diff view). It should:
//  1) run `validate()`;
//  2) normalize shipping if useBilling;
//  3) await encryptIfSensitive(formData);
//  4) write to: artifacts/{__app_id}/tenants/{tenantId}/{collectionName};
//  5) include { tenantId, updatedAt }.
// This preserves tenant isolation and allows future RBAC/ABAC at the rules layer.
// ─────────────────────────────────────────────────────────────────────────────
