// Lightweight client PDF generator (static imports for CRA/Webpack)                             // inline-review
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function makeInvoicePdf(invoice, template) {
  const doc = new jsPDF();
  const mm = 1; // helper

  // Header
  doc.setFontSize(18);
  doc.text(template?.header?.title || "INVOICE", 20 * mm, 20 * mm);
  if (template?.header?.logoUrl) {
    try {
      const img = await fetch(template.header.logoUrl).then((r) => r.blob());
      const dataUrl = await blobToDataURL(img);
      doc.addImage(dataUrl, "PNG", 160, 10, 30, 20);
    } catch {
      /* ignore logo errors */
    }
  }

  doc.setFontSize(11);
  doc.text(`Invoice #: ${invoice.invoiceNumber || "-"}`, 20 * mm, 30 * mm);
  doc.text(
    `Issue: ${fmtDate(invoice.issueDate)}   Due: ${fmtDate(invoice.dueDate)}`,
    20 * mm,
    36 * mm
  );
  doc.text(`Bill To: ${invoice.customer?.name || "-"}`, 20 * mm, 42 * mm);
  if (invoice.customer?.email)
    doc.text(`Email: ${invoice.customer.email}`, 20 * mm, 48 * mm);

  // Custom fields
  let y = 56 * mm;
  Object.entries(invoice.fields || {}).forEach(([k, v]) => {
    doc.text(`${k}: ${String(v ?? "")}`, 20 * mm, y);
    y += 6; // ← increment; previous code incorrectly overwrote y with 6
  });

  // Line items
  const cols = (template.lineItemColumns || []).map((c) => ({
    header: c.label,
    dataKey: c.key,
  }));
  const rows = (invoice.lineItems || []).map((r) => ({
    ...r,
    lineTotal: Number(r.qty || 0) * Number(r.unitPrice || 0),
  }));
  autoTable(doc, {
    head: [cols.map((c) => c.header)],
    body: rows.map((r) => cols.map((c) => r[c.dataKey] ?? "")),
    startY: y,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [30, 64, 175] },
  });

  // Totals
  const afterTableY = doc.lastAutoTable?.finalY || y + 50;
  const currency = invoice.currency ?? template?.currency ?? ""; // prevent 'undefined' in totals     // inline-review
  doc.setFontSize(12);
  doc.text(
    `Subtotal: ${invoice.subTotal.toFixed(2)} ${currency}`,
    150,
    afterTableY + 10,
    { align: "right" }
  ); // inline-review
  doc.text(
    `Tax: ${invoice.taxTotal.toFixed(2)} ${currency}`,
    150,
    afterTableY + 16,
    { align: "right" }
  ); // inline-review
  doc.text(
    `Total: ${invoice.grandTotal.toFixed(2)} ${invoice.currency}`,
    150,
    afterTableY + 22,
    { align: "right" }
  ); // inline-review

  // Footer
  if (template?.footer?.notes) {
    doc.setFontSize(10);
    doc.text(template.footer.notes, 20, 285);
  }

  doc.save(`invoice-${invoice.invoiceNumber || "draft"}.pdf`);
}

function fmtDate(d) {
  try {
    const dt = d?.toDate ? d.toDate() : d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString();
  } catch {
    return "";
  }
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
