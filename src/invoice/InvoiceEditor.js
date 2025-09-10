import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { FirebaseContext } from "../AppWrapper";
import { makeInvoicePdf } from "./pdf/makeInvoicePdf"; // now that helper lives under /pdf
// NEW: centralized collection ids + path helper
import { COLLECTIONS, tenantCollectionPath } from "../collectionNames";
import { getAppId } from "../IgniteConfig"; // single source of truth for app id
export default function InvoiceEditor() {
  const { db, tenantId } = useContext(FirebaseContext);

  // Resolve from centralized config; no direct global/env reads in component.                          // inline-review
  const appId = getAppId();

  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [tpl, setTpl] = useState(null);

  // fixed fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate] = useState(() => new Date());
  const [dueDate] = useState(() => new Date());
  const [customer, setCustomer] = useState({ name: "", email: "" });

  // dynamic payload
  const [fields, setFields] = useState({});
  const [lineItems, setLineItems] = useState([
    { description: "", qty: 1, unitPrice: 0 },
  ]);

  // 💵 Single source of truth for totals — avoids duplicate consts & TS "Cannot redeclare" errors.
  const { subTotal, taxTotal, grandTotal } = useMemo(() => {
    const sub = lineItems.reduce(
      (sum, r) => sum + Number(r?.qty ?? 0) * Number(r?.unitPrice ?? 0), // strict numeric coercion
      0
    );
    const tax = 0; // TODO: plug tenant-configured tax rules or per-invoice overrides
    return { subTotal: sub, taxTotal: tax, grandTotal: sub + tax };
  }, [lineItems]);

  useEffect(() => {
    if (!db || !tenantId) return;
    (async () => {
      // Read templates from the canonical collection name
      const q1 = query(
        collection(
          db,
          tenantCollectionPath({
            appId,
            tenantId,
            key: COLLECTIONS.invoiceTemplates,
          })
        ),
        where("tenantId", "==", tenantId)
      ); // filter stays the same
      const snap = await getDocs(q1);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTemplates(rows);
      if (!templateId && rows.length) setTemplateId(rows[0].id);
    })();
  }, [db, tenantId, appId]); // include appId for completeness

  useEffect(() => {
    if (!db || !tenantId || !templateId) return;
    (async () => {
      const ref = doc(
        db,
        tenantCollectionPath({
          appId,
          tenantId,
          key: COLLECTIONS.invoiceTemplates,
        }),
        templateId
      ); // avoid retyping the path & casing
      const d = await getDoc(ref);
      setTpl({ id: d.id, ...d.data() });
    })();
  }, [db, tenantId, appId, templateId]); // keep dependencies aligned with path args

  const updateField = (key, val) => setFields((f) => ({ ...f, [key]: val }));
  const updateRow = (i, patch) =>
    setLineItems((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
    );
  const addRow = () =>
    setLineItems((rows) => [
      ...rows,
      { description: "", qty: 1, unitPrice: 0 },
    ]);
  const delRow = (i) =>
    setLineItems((rows) => rows.filter((_, idx) => idx !== i));

  const handleSaveInvoice = async () => {
    if (!db || !tenantId || !tpl) return;
    const payload = {
      tenantId,
      appId,
      templateId,
      invoiceNumber,
      issueDate,
      dueDate,
      customer,
      fields,
      lineItems,
      currency: tpl.currency,
      subTotal,
      taxTotal,
      grandTotal,
      createdAt: serverTimestamp(),
      createdBy: "invoicer",
      updatedAt: serverTimestamp(),
      updatedBy: "invoicer",
    };
    await addDoc(
      collection(
        db,
        tenantCollectionPath({ appId, tenantId, key: COLLECTIONS.invoices })
      ), // centralized
      payload
    );
    alert("Invoice saved.");
  };

  const handlePdf = async () => {
    if (!tpl) return;
    await makeInvoicePdf(
      {
        invoiceNumber,
        issueDate,
        dueDate,
        customer,
        fields,
        lineItems,
        subTotal,
        taxTotal,
        grandTotal,
        currency: tpl.currency,
      },
      tpl
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">New Invoice</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm">Template</label>
          <select
            className="w-full p-2 border rounded"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Invoice #</label>
          <input
            className="w-full p-2 border rounded"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm">Currency</label>
          <input
            className="w-full p-2 border rounded"
            value={tpl?.currency || ""}
            readOnly
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm">Bill To: Name</label>
          <input
            className="w-full p-2 border rounded"
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm">Bill To: Email</label>
          <input
            className="w-full p-2 border rounded"
            value={customer.email}
            onChange={(e) =>
              setCustomer({ ...customer, email: e.target.value })
            }
          />
        </div>
      </div>

      {tpl && (
        <div className="space-y-4">
          <h3 className="font-semibold">Custom Fields</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(tpl.fields || []).map((f) => (
              <div key={f.key}>
                <label className="block text-xs">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea
                    className="w-full p-2 border rounded"
                    value={fields[f.key] || ""}
                    onChange={(e) => updateField(f.key, e.target.value)}
                    rows={3}
                  />
                ) : f.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={!!fields[f.key]}
                    onChange={(e) => updateField(f.key, e.target.checked)}
                  />
                ) : (
                  <input
                    className="w-full p-2 border rounded"
                    value={fields[f.key] || ""}
                    onChange={(e) => updateField(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          <h3 className="font-semibold mt-6">Line Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  {(tpl.lineItemColumns || []).map((c) => (
                    <th key={c.key} className="text-left p-2 border-b">
                      {c.label}
                    </th>
                  ))}
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((row, i) => (
                  <tr key={i} className="border-b">
                    {(tpl.lineItemColumns || []).map((c) => (
                      <td key={c.key} className="p-2">
                        {c.computed ? (
                          <span>
                            {Number(row.qty || 0) * Number(row.unitPrice || 0)}
                          </span>
                        ) : c.type === "number" ? (
                          <input
                            className="w-full p-2 border rounded"
                            type="number"
                            value={row[c.key] ?? ""}
                            onChange={(e) =>
                              updateRow(i, { [c.key]: Number(e.target.value) })
                            }
                          />
                        ) : (
                          <input
                            className="w-full p-2 border rounded"
                            value={row[c.key] ?? ""}
                            onChange={(e) =>
                              updateRow(i, { [c.key]: e.target.value })
                            }
                          />
                        )}
                      </td>
                    ))}
                    <td className="p-2">
                      <button
                        className="px-2 py-1 bg-gray-200 rounded"
                        onClick={() => delRow(i)}
                      >
                        Del
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="mt-2 px-3 py-1 rounded bg-gray-100"
            onClick={addRow}
          >
            Add Row
          </button>
        </div>
      )}

      <div className="flex justify-end gap-6 text-right">
        <div className="space-y-1">
          <div>
            Subtotal:{" "}
            <strong>
              {subTotal.toFixed(2)} {tpl?.currency}
            </strong>
          </div>
          <div>
            Tax:{" "}
            <strong>
              {taxTotal.toFixed(2)} {tpl?.currency}
            </strong>
          </div>
          <div>
            Total:{" "}
            <strong>
              {grandTotal.toFixed(2)} {tpl?.currency}
            </strong>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          className="px-4 py-2 rounded bg-blue-600 text-white"
          onClick={handleSaveInvoice}
        >
          Save Invoice
        </button>
        <button className="px-4 py-2 rounded bg-gray-200" onClick={handlePdf}>
          Preview / Download PDF
        </button>
      </div>
    </div>
  );
}
