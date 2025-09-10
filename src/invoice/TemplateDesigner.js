import React, { useContext, useState } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore"; // add query APIs for uniqueness preflight
import { FirebaseContext } from "../AppWrapper";
import { COLLECTIONS, tenantCollectionPath } from "../collectionNames"; // use shared constants + path helper
import { getAppId } from "../IgniteConfig"; // centralized app id
// Simple field types supported by the dynamic invoice form
const FIELD_TYPES = ["text", "number", "date", "select", "checkbox"];

export default function InvoiceTemplateDesigner() {
  const { db, tenantId } = useContext(FirebaseContext);
  const appId = getAppId(); // avoid hardcoding/globals

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [header, setHeader] = useState({ title: "INVOICE", logoUrl: "" });
  const [footer, setFooter] = useState({
    notes: "Thank you for your business!",
  }); // keep setter; now used

  const [fields, setFields] = useState([
    { key: "poNumber", label: "PO Number", type: "text", required: false },
    { key: "notes", label: "Notes", type: "textarea", required: false },
  ]);

  const [lineItemColumns, setLineItemColumns] = useState([
    { key: "description", label: "Description", type: "text", width: 52 },
    { key: "qty", label: "Qty", type: "number", width: 12 },
    { key: "unitPrice", label: "Unit Price", type: "number", width: 18 },
    {
      key: "lineTotal",
      label: "Line Total",
      type: "number",
      width: 18,
      computed: "qty*unitPrice",
    },
  ]);

  // UX: transient status & errors around save flow
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(""); // holds success message for a few seconds
  const [saveErr, setSaveErr] = useState(""); // user-friendly error string

  const addField = () =>
    setFields((f) => [
      ...f,
      { key: "", label: "", type: "text", required: false },
    ]);
  const removeField = (i) => setFields((f) => f.filter((_, idx) => idx !== i));
  const updateField = (i, patch) =>
    setFields((f) => f.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const addColumn = () =>
    setLineItemColumns((cols) => [
      ...cols,
      { key: "", label: "", type: "text", width: 12 },
    ]);
  const removeColumn = (i) =>
    setLineItemColumns((c) => c.filter((_, idx) => idx !== i));
  const updateColumn = (i, patch) =>
    setLineItemColumns((c) =>
      c.map((x, idx) => (idx === i ? { ...x, ...patch } : x))
    );

  const handleSave = async () => {
    if (saving) {
      // guard against rapid double-clicks
      console.debug("[invoice:template] save ignored — already saving");
      return;
    }
    if (!db || !tenantId) return;
    setSaveErr("");
    setSaveOk("");
    const trimmed = String(name || "").trim();
    if (!trimmed) {
      setSaveErr("Template name is required.");
      return;
    }

    // Extra guard: provide immediate feedback when offline                                              // inline-review
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setSaveErr("You appear to be offline. Please reconnect and try again.");
      return;
    }

    // 🔎 DEBUG (save): log path context + payload summary before writing
    const savePath = tenantCollectionPath({
      appId,
      tenantId,
      key: COLLECTIONS.invoiceTemplates,
    });
    console.groupCollapsed("[invoice:template] save click");
    console.log("path", savePath);
    console.log("actor/tenant/app", { tenantId, appId });
    console.log("payload.summary", {
      name: trimmed,
      currency,
      headerTitle: header?.title,
      footerNotesLen: (footer?.notes || "").length,
      fieldsCount: fields?.length,
      columnsCount: lineItemColumns?.length,
    });
    console.groupEnd();

    const payload = {
      tenantId,
      appId,
      name: trimmed,
      nameLower: trimmed.toLowerCase(), // enable case-insensitive uniqueness per-tenant
      currency,
      header,
      footer,
      fields,
      lineItemColumns,
      createdAt: serverTimestamp(),
      createdBy: "designer",
      updatedAt: serverTimestamp(),
      updatedBy: "designer",
    };

    try {
      setSaving(true);
      const col = collection(db, savePath);

      // 🔍 Uniqueness preflight: prevent duplicates by (tenantId, nameLower)
      const dupQ = query(
        col,
        where("tenantId", "==", tenantId),
        where("nameLower", "==", payload.nameLower)
      );
      const dupSnap = await getDocs(dupQ);
      if (!dupSnap.empty) {
        console.warn("[invoice:template] duplicate name blocked", {
          tenantId,
          nameLower: payload.nameLower,
          count: dupSnap.size,
        });
        setSaveErr(
          `A template named “${trimmed}” already exists. Choose a different name.`
        );
        setSaving(false);
        return;
      }

      // ✅ Create once we know it's unique within the tenant
      const ref = await addDoc(col, payload);
      console.info("[invoice:template] saved", { id: ref.id, path: savePath });
      setSaveOk("Template saved!");
      setTimeout(() => setSaveOk(""), 3000); // auto-clear success message after 3s
    } catch (e) {
      // Robust error mapping with specific guidance                                                     // inline-review
      console.error("[invoice:template] save failed", e);
      let msg =
        "Failed to save template. Please check your network and try again.";
      if (e?.code === "permission-denied") {
        msg =
          "You do not have permission to save templates. Please check your access.";
      } else if (e?.code === "unavailable") {
        msg = "Service temporarily unavailable. Please retry in a moment.";
      } else if (e?.code === "deadline-exceeded") {
        msg = "The request timed out. Please try again.";
      }
      // Append code for support diagnostics without leaking stack traces                                // inline-review
      setSaveErr(e?.code ? `${msg} (error: ${e.code})` : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="space-y-6"
      aria-busy={saving ? "true" : "false"} // accessible loading signal for screen readers
      aria-live="polite" // politely announce status changes
    >
      <h2 className="text-xl font-semibold">Invoice Template Designer</h2>
      {/* Inline status messages (non-blocking, accessible) */}{" "}
      {/* inline-review */}
      {(saveOk || saveErr) && (
        <div role="status" aria-live="polite" className="space-y-2">
          {saveOk && (
            <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-green-800">
              {saveOk}
            </div>
          )}
          {saveErr && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-red-800">
              {saveErr}
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium">Template Name</label>
          <input
            className="w-full p-2 border rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Standard, Pro-Forma, Service"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Default Currency</label>
          <input
            className="w-full p-2 border rounded"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Header Title</label>
          <input
            className="w-full p-2 border rounded"
            value={header.title}
            onChange={(e) => setHeader({ ...header, title: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Logo URL</label>
          <input
            className="w-full p-2 border rounded"
            value={header.logoUrl}
            onChange={(e) => setHeader({ ...header, logoUrl: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium">Footer Notes</label>
          <textarea
            className="w-full p-2 border rounded"
            rows={3}
            value={footer.notes}
            onChange={(e) => setFooter({ ...footer, notes: e.target.value })}
            placeholder="Payment terms, thank-you text, etc."
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Custom Fields</h3>
          <button
            className="px-3 py-1 rounded bg-blue-600 text-white"
            onClick={addField}
          >
            Add Field
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {fields.map((f, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-3">
                <label className="block text-xs">Key</label>
                <input
                  className="w-full p-2 border rounded"
                  value={f.key}
                  onChange={(e) => updateField(i, { key: e.target.value })}
                />
              </div>
              <div className="col-span-4">
                <label className="block text-xs">Label</label>
                <input
                  className="w-full p-2 border rounded"
                  value={f.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs">Type</label>
                <select
                  className="w-full p-2 border rounded"
                  value={f.type}
                  onChange={(e) => updateField(i, { type: e.target.value })}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-xs">Req</label>
                <input
                  type="checkbox"
                  checked={!!f.required}
                  onChange={(e) =>
                    updateField(i, { required: e.target.checked })
                  }
                />
              </div>
              <div className="col-span-1">
                <button
                  className="px-2 py-2 rounded bg-gray-200"
                  onClick={() => removeField(i)}
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Line Item Columns</h3>
          <button
            className="px-3 py-1 rounded bg-blue-600 text-white"
            onClick={addColumn}
          >
            Add Column
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {lineItemColumns.map((c, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-3">
                <label className="block text-xs">Key</label>
                <input
                  className="w-full p-2 border rounded"
                  value={c.key}
                  onChange={(e) => updateColumn(i, { key: e.target.value })}
                />
              </div>
              <div className="col-span-4">
                <label className="block text-xs">Label</label>
                <input
                  className="w-full p-2 border rounded"
                  value={c.label}
                  onChange={(e) => updateColumn(i, { label: e.target.value })}
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs">Type</label>
                <select
                  className="w-full p-2 border rounded"
                  value={c.type}
                  onChange={(e) => updateColumn(i, { type: e.target.value })}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-xs">W%</label>
                <input
                  className="w-full p-2 border rounded"
                  type="number"
                  value={c.width ?? 12}
                  onChange={(e) =>
                    updateColumn(i, { width: Number(e.target.value) })
                  }
                />
              </div>
              <div className="col-span-1">
                <button
                  className="px-2 py-2 rounded bg-gray-200"
                  onClick={() => removeColumn(i)}
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="button" // prevent implicit form submit bubbling
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleSave}
          disabled={saving} // block repeated clicks during async save
          aria-disabled={saving ? "true" : "false"} // extra a11y signal
          title={saving ? "Saving…" : "Save Template"} // helpful hover feedback
        >
          {saving ? "Saving…" : "Save Template"}
        </button>
      </div>
    </div>
  );
}
