import React, { useState, useEffect, useContext, useMemo } from "react"; // useMemo used for options + sorting
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { FirebaseContext } from "./AppWrapper";
import { X, Save } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CollectionSchemas } from "./DataSchemas"; // ← central, nested-aware schemas

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

// Flatten schema to uniform list of fields { path, type, label, required, enum, allowBlank, sensitive }
const flattenSchema = (schema) =>
  (schema?.fields ?? []).map((f) => ({
    path: f.path,
    type: f.type,
    label: f.label || f.path.split(".").slice(-1)[0],
    required: !!f.required,
    enum: Array.isArray(f.enum) ? f.enum : undefined,
    allowBlank: !!f.allowBlank,
    sensitive: !!f.sensitive,
    immutable: !!f.immutable,
    editableOnCreate: !!f.editableOnCreate,
    hideOnChange: !!f.hideOnChange, // schema-driven visibility in Change mode
  }));
// ─────────────────────────────────────────────────────────────────────────────@@

const DataEntryForm = ({ selectedBranch, initialData, onSave, onCancel }) => {
  const { db, tenantId, user } = useContext(FirebaseContext); // add user for audit stamping
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const collectionName = selectedBranch
    .replace("Change ", "")
    .replace("Add ", "")
    .toLowerCase();

  const normalized = useMemo(() => {
    const key =
      collectionName.charAt(0).toUpperCase() + collectionName.slice(1);
    return CollectionSchemas[key] || null;
  }, [collectionName]);

  // Only use the unified CollectionSchemas; if none, render no fields.
  const schemaFields = useMemo(
    () => (normalized ? flattenSchema(normalized) : []),
    [normalized]
  );

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
      if (f.type === "date" && v) {
        setByPath(next, f.path, toJsDate(v)); // ✅ Convert Firestore Timestamp to JS Date
      } else if (f.type === "date") {
        setByPath(next, f.path, undefined); // ⚠️ Handle a new form where date is not yet set
      } else {
        setByPath(next, f.path, v);
      }
    });
    setFormData(next);
  }, [initialData, schemaFields]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // basic client-side validation (allow blanks where not required)
      const errors = validate();
      if (errors.length) {
        setMessage(errors.join(", ")); // keep user-friendly for now
        setLoading(false);
        return;
      }
      // normalize shipping if useBilling (if applicable)
      const isEditMode = selectedBranch.includes("Change");
      // Determine app namespace; if __app_id isn't defined, we fall back to "default-app-id"
      // This is IMPORTANT for finding the record in Firestore console.
      // If you don't see your record, check this path first.
      const appId =
        typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const collectionPath = `artifacts/${appId}/tenants/${tenantId}/${collectionName}`; // e.g., artifacts/default-app-id/tenants/<tenantId>/customers
      if (DEBUG_FIRESTORE) {
        console.log("[DataEntryForm] collectionPath:", collectionPath); // <-- helps you locate the document in Firestore
      }

      // Encrypt any sensitive fields before save (stubbed)
      const secured = await encryptIfSensitive(formData);

      // Strip client-provided audit/tenant fields (defense in depth)                           // inline-review
      const clean = { ...secured };
      delete clean.createdAt;
      delete clean.createdBy;
      delete clean.updatedAt;
      delete clean.updatedBy;
      delete clean.tenantId;
      delete clean.appId;

      // Server clock  actor for audit                                                         // inline-review
      const now = serverTimestamp();
      const actor = user?.email || user?.uid || "unknown";

      if (isEditMode) {
        if (initialData && initialData.id) {
          const docRef = doc(db, collectionPath, initialData.id);
          const updatePayload = {
            ...clean,
            tenantId,
            ...(appId ? { appId } : {}),
            updatedAt: now,
            updatedBy: actor,
          };
          await updateDoc(docRef, updatePayload);
          if (DEBUG_FIRESTORE) {
            console.log("[DataEntryForm] updated doc id:", initialData.id);
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
        const docRef = await addDoc(
          collection(db, collectionPath),
          createPayload
        );
        if (DEBUG_FIRESTORE) {
          console.log("[DataEntryForm] created doc id:", docRef.id);
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
      if (f.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        errors.push("Invalid email");
      //                                  ^^^^^^^  FIX: add '+' quantifiers to email regex
      if (f.type === "tel" && v && !/^[+()0-9\-\s]{7,}$/.test(v))
        errors.push("Invalid phone");
      // number/date fields are handled by inputs themselves
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

  return (
    <div className="p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {getFormTitle()}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {schemaFields
          // Hide fields explicitly flagged to be hidden on Change screen (createdAt/updatedAt).     // inline-review
          .filter((f) => !(isEditMode && f.hideOnChange))
          // On Add: show non-immutable OR explicitly marked editableOnCreate. On Change: show all
          // (locks are applied via disabled/readOnly).                                               // inline-review
          .filter((f) =>
            isEditMode ? true : !f.immutable || f.editableOnCreate
          )
          .map((field) => {
            const { path, type, label, enum: options, allowBlank } = field;
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

            // plug dynamic options if schema kept type:select without enum
            let dynamicOptions = options;
            if (!dynamicOptions && isSelect) {
              if (path.endsWith(".country"))
                dynamicOptions = countryOptions.map((o) => o.value);
              if (path === "credit.currency")
                dynamicOptions = currencyOptions.map((o) => o.value);
            } // ← FIX: close conditional before returning JSX (was causing “Unexpected token )”)  // inline-review

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
                      value={getByPath(formData, path) ?? ""}
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
                    {(dynamicOptions || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
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
