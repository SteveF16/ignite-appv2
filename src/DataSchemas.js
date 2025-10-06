// NOTE: Legacy action-oriented schemas remain for other branches (Vendors, Inventory, etc.).
//       The old Customers section has been removed in favor of CollectionSchemas.Customers
//       (see export below). This avoids confusion and keeps a single source of truth.
//
// ─────────────────────────────────────────────────────────────────────────────
// --- Vendors ---
// 1) Define legacy action-oriented schemas FIRST and CLOSE the object.
//    (We removed the old Customers block; other branches remain.)
const DataSchemas = {
  // --- Vendors ---
  "Add Vendor": [
    { name: "vendorNbr", type: "text", placeholder: "Vendor Number (unique)" },
    { name: "vendorName", type: "text", placeholder: "Vendor Name" },
    { name: "contactPerson", type: "text", placeholder: "Contact Person" },
    { name: "email", type: "email", placeholder: "Email" },
    { name: "phone", type: "tel", placeholder: "Phone" },
  ],
  "Change Vendor": [
    { name: "vendorId", type: "text", placeholder: "Vendor ID" },
    { name: "vendorName", type: "text", placeholder: "Vendor Name" },
    { name: "contactPerson", type: "text", placeholder: "Contact Person" },
    { name: "email", type: "email", placeholder: "Email" },
    { name: "phone", type: "tel", placeholder: "Phone" },
  ],
  "Delete Vendor": [
    { name: "vendorId", type: "text", placeholder: "Vendor ID" },
  ],

  // --- Inventory ---
  "Add Inventory": [
    { name: "itemName", type: "text", placeholder: "Item Name" },
    { name: "quantity", type: "number", placeholder: "Quantity" },
    { name: "cost", type: "number", placeholder: "Cost" },
    { name: "supplier", type: "text", placeholder: "Supplier" },
  ],
  "Change Inventory": [
    { name: "itemId", type: "text", placeholder: "Item ID" },
    { name: "itemName", type: "text", placeholder: "Item Name" },
    { name: "quantity", type: "number", placeholder: "Quantity" },
    { name: "cost", type: "number", placeholder: "Cost" },
    { name: "supplier", type: "text", placeholder: "Supplier" },
  ],
  "Delete Inventory": [
    { name: "itemId", type: "text", placeholder: "Item ID" },
  ],

  // --- Banking ---
  "Add Transaction": [
    { name: "description", type: "text", placeholder: "Description" },
    { name: "amount", type: "number", placeholder: "Amount" },
    { name: "date", type: "date", placeholder: "Transaction Date" },
    { name: "type", type: "text", placeholder: "Type" },
  ],
  "Change Transaction": [
    { name: "transactionId", type: "text", placeholder: "Transaction ID" },
    { name: "description", type: "text", placeholder: "Description" },
    { name: "amount", type: "number", placeholder: "Amount" },
    { name: "date", type: "date", placeholder: "Transaction Date" },
    { name: "type", type: "text", placeholder: "Type" },
  ],
  "Delete Transaction": [
    { name: "transactionId", type: "text", placeholder: "Transaction ID" },
  ],

  // --- Company ---
  "Add Company Info": [
    { name: "companyName", type: "text", placeholder: "Company Name" },
    { name: "address", type: "text", placeholder: "Address" },
    { name: "taxId", type: "text", placeholder: "Tax ID" },
  ],
  "Change Company Info": [
    { name: "companyId", type: "text", placeholder: "Company ID" },
    { name: "companyName", type: "text", placeholder: "Company Name" },
    { name: "address", type: "text", placeholder: "Address" },
    { name: "taxId", type: "text", placeholder: "Tax ID" },
  ],
  "Delete Company Info": [
    { name: "companyId", type: "text", placeholder: "Company ID" },
  ],

  // --- Employees ---
  "Add Employee": [
    { name: "name", type: "text", placeholder: "Employee Name" },
    { name: "position", type: "text", placeholder: "Position" },
    { name: "department", type: "text", placeholder: "Department" },
    { name: "hireDate", type: "date", placeholder: "Hire Date" },
    { name: "salary", type: "number", placeholder: "Salary" },
    { name: "active", type: "checkbox", placeholder: "Is Active" },
  ],
  "Change Employee": [
    { name: "employeeId", type: "text", placeholder: "Employee ID" },
    { name: "name", type: "text", placeholder: "Employee Name" },
    { name: "position", type: "text", placeholder: "Position" },
    { name: "department", type: "text", placeholder: "Department" },
    { name: "hireDate", type: "date", placeholder: "Hire Date" },
    { name: "salary", type: "number", placeholder: "Salary" },
    { name: "active", type: "checkbox", placeholder: "Is Active" },
  ],
  "Delete Employee": [
    { name: "employeeId", type: "text", placeholder: "Employee ID" },
  ],

  // --- Assets ---
  "Add Assets": [
    { name: "name", type: "text", placeholder: "Asset Name" },
    { name: "type", type: "text", placeholder: "Type" },
    { name: "serialNumber", type: "text", placeholder: "Serial Number" },
    { name: "purchaseDate", type: "date", placeholder: "Purchase Date" },
    { name: "value", type: "number", placeholder: "Value" },
    { name: "location", type: "text", placeholder: "Location" },
  ],
  "Change Assets": [
    { name: "assetId", type: "text", placeholder: "Asset ID" },
    { name: "name", type: "text", placeholder: "Asset Name" },
    { name: "type", type: "text", placeholder: "Type" },
    { name: "serialNumber", type: "text", placeholder: "Serial Number" },
    { name: "purchaseDate", type: "date", placeholder: "Purchase Date" },
    { name: "value", type: "number", placeholder: "Value" },
    { name: "location", type: "text", placeholder: "Location" },
  ],
  "Delete Assets": [{ name: "assetId", type: "text", placeholder: "Asset ID" }],

  // --- Finances ---
  "Add Finances": [
    { name: "type", type: "select", placeholder: "Type" },
    { name: "description", type: "text", placeholder: "Description" },
    { name: "amount", type: "number", placeholder: "Amount" },
    { name: "date", type: "date", placeholder: "Transaction Date" },
    { name: "category", type: "text", placeholder: "Category" },
  ],
  "Change Finances": [
    { name: "financeId", type: "text", placeholder: "Transaction ID" },
    { name: "type", type: "select", placeholder: "Type" },
    { name: "description", type: "text", placeholder: "Description" },
    { name: "amount", type: "number", placeholder: "Amount" },
    { name: "date", type: "date", placeholder: "Transaction Date" },
    { name: "category", type: "text", placeholder: "Category" },
  ],
  "Delete Finances": [
    { name: "financeId", type: "text", placeholder: "Transaction ID" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 1) Export the legacy action-oriented schemas as a single object.

// 2) Export the new collection-centric schemas AFTER the DataSchemas object.
//    This prevents the "Unexpected keyword 'export'" parser error.
// NOTE: App.js calls `getCollectionFromBranch("Customers")` which returns "customers".
//       To avoid schema-miss issues (blank edit pane), we alias BOTH keys here.  : schema alias
// --- NEW: Collection-centric schemas consumed by DataEntryForm/ListDataView ---
export default DataSchemas; // keep legacy default export

// Customers collection schema used by List/Change screens
// ✅ Single truth for audit immutability and date typing
const CustomersSchema = {
  meta: {
    immutable: [
      "customerNbr",
      "createdAt",
      "createdBy",
      "updatedAt",
      "updatedBy",
      "tenantId",
      "appId",
    ],
  },

  search: {
    keys: [
      "customerNbr",
      "name1",
      "name2",
      "contacts.primary.email",
      "billing.address.city",
      "billing.address.state",
      "billing.address.country",
    ],
  },

  // top-level defaultSort for tests and shared helpers (kept in addition to list.defaultSort)
  defaultSort: { key: "customerNbr", dir: "asc" },
  // picker label config drives dropdown text + unit tests
  picker: { labelFields: ["customerNbr", "name1"] },

  list: {
    defaultSort: { key: "customerNbr", dir: "asc" },
    /**
     * Make every visible column clickable for sorting by default.
     * You can restrict later by providing an explicit whitelist:
     *   sortableKeys: ["customerNbr","name1","status",...]
     */
    sortable: true,
    // optional whitelist (leave commented unless you want to limit):
    // sortableKeys: ["customerNbr","name1","name2","name3","status","billing.address.city","billing.address.state","billing.address.country","credit.limit","credit.onHold","billing.paymentTerms"],
    exclude: [
      "tax.ssn",
      "tax.ein",
      "tax.taxId",
      "billing.tax.taxId",
      "createdBy",
      "updatedBy",
      "deletedAt",
      "deletedBy",
    ],
  },
  csv: { exclude: ["tax.ssn", "tax.ein", "tax.taxId", "billing.tax.taxId"] },
  fields: [
    // Keep immutable in general, but explicitly allow editing on create:
    {
      path: "customerNbr",
      type: "text",
      label: "Customer #",
      immutable: true,
      editableOnCreate: true,
    }, // visible on Add

    { path: "name1", type: "text", label: "Name 1", required: true },
    { path: "name2", type: "text", label: "Name 2" },
    { path: "name3", type: "text", label: "Name 3" },
    {
      path: "status",
      type: "select",
      label: "Status",
      enum: ["Lead", "Prospect", "Active", "Inactive"],
      allowBlank: true,
    },
    {
      path: "contacts.primary.firstName",
      type: "text",
      label: "Primary First Name",
    },
    {
      path: "contacts.primary.lastName",
      type: "text",
      label: "Primary Last Name",
    },
    { path: "contacts.primary.email", type: "email", label: "Primary Email" },
    { path: "contacts.primary.phone", type: "tel", label: "Primary Phone" },
    { path: "billing.address.line1", type: "text", label: "Billing Address 1" },
    { path: "billing.address.line2", type: "text", label: "Billing Address 2" },
    { path: "billing.address.city", type: "text", label: "Billing City" },
    {
      path: "billing.address.state",
      type: "text",
      label: "Billing State/Region",
    },
    {
      path: "billing.address.postalCode",
      type: "text",
      label: "Billing Postal Code",
    },
    {
      path: "billing.address.country",
      type: "select",
      label: "Billing Country",
      allowBlank: true,
    },
    { path: "credit.limit", type: "number", label: "Credit Limit" },
    {
      path: "credit.currency",
      type: "select",
      label: "Currency",
      allowBlank: true,
    },
    { path: "credit.onHold", type: "checkbox", label: "On Credit Hold" },
    {
      path: "billing.paymentTerms",
      type: "select",
      label: "Payment Terms",
      enum: ["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60"],
      allowBlank: true,
    },
    { path: "user.user1", type: "text", label: "User Field 1" },
    { path: "user.user2", type: "text", label: "User Field 2" },
    { path: "user.user3", type: "text", label: "User Field 3" },
    { path: "user.user4", type: "text", label: "User Field 4" },
    { path: "user.user5", type: "text", label: "User Field 5" },
    //Audit fields are dates and immutable; hide on Change screen to avoid duplication with audit box.
    {
      path: "createdAt",
      type: "date",
      label: "Created At",
      immutable: true,
      hideOnChange: true,
    },
    { path: "createdBy", type: "text", label: "Created By", immutable: true },
    {
      path: "updatedAt",
      type: "date",
      label: "Updated At",
      immutable: true,
      hideOnChange: true,
    },
    { path: "updatedBy", type: "text", label: "Updated By", immutable: true },
  ],
};

// ---------------------------------------------
// Employees: dropdown option catalogs
// ---------------------------------------------
const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "On Leave", label: "On Leave" },
  { value: "Suspended", label: "Suspended" },
  { value: "Terminated", label: "Terminated" },
  { value: "Retired", label: "Retired" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "Full-time", label: "Full-time" },
  { value: "Part-time", label: "Part-time" },
  { value: "Contract", label: "Contract" },
  { value: "Intern", label: "Intern" },
  { value: "Temporary", label: "Temporary" },
  { value: "Seasonal", label: "Seasonal" },
  { value: "Contingent", label: "Contingent" },
];

export const CollectionSchemas = {
  customers: CustomersSchema, // lower-case alias used by code paths
  Customers: CustomersSchema, // Title-case alias for compatibility

  Vendors: {
    label: "Vendors",
    collection: "vendors",

    // Show "<vendorNbr> - <vendorName>" in pickers (mirrors Customers picker)
    picker: { labelFields: ["vendorNbr", "vendorName"] },

    list: {
      defaultSort: { key: "vendorNbr", dir: "asc" },
      columns: [
        { path: "vendorNbr", label: "Vendor #" },
        { path: "vendorName", label: "Vendor" },
        { path: "contactPerson", label: "Contact" },
        { path: "email", label: "Email" },
        { path: "phone", label: "Phone" },
        { path: "updatedAt", label: "Updated" },
      ],
    },
    fields: [
      {
        path: "vendorNbr",
        label: "Vendor Number",
        type: "text",
        required: true,
        help: "Alphanumeric; must be unique within your company.",
      },

      // ── Restored & normalized fields for Vendor master ────────────────────────────────────────────
      {
        path: "vendorName",
        label: "Vendor Name",
        type: "text",
        required: true,
      }, // human-friendly name
      { path: "contactPerson", label: "Contact Person", type: "text" },
      { path: "email", label: "Email", type: "email" },
      { path: "phone", label: "Phone", type: "tel" },
      // Address (flat keeps renderer simple and matches your generic form)                             // inline-review
      { path: "address1", label: "Address 1", type: "text" },
      { path: "address2", label: "Address 2", type: "text" },
      { path: "city", label: "City", type: "text" },
      { path: "state", label: "State/Region", type: "text" },
      { path: "postalCode", label: "Postal Code", type: "text" },
      { path: "country", label: "Country", type: "text" },
      // Optional business attributes                                                                  // inline-review
      {
        path: "paymentTerms",
        label: "Payment Terms",
        type: "text",
        help: "e.g., Due on Receipt, Net 15/30/45",
      },
      { path: "taxId", label: "Tax Id", type: "text" }, // consider masking on list
      { path: "website", label: "Website", type: "text" },
      { path: "notes", label: "Notes", type: "textarea" },
      // Tenant-customizable freeform fields                                                           // inline-review
      {
        path: "vendorUser1",
        label: "Custom 1",
        type: "text",
        help: "Tenant-defined freeform.",
      },
      {
        path: "vendorUser2",
        label: "Custom 2",
        type: "text",
        help: "Tenant-defined freeform.",
      },
      {
        path: "vendorUser3",
        label: "Custom 3",
        type: "text",
        help: "Tenant-defined freeform.",
      },
      {
        path: "vendorUser4",
        label: "Custom 4",
        type: "text",
        help: "Tenant-defined freeform.",
      },
      {
        path: "vendorUser5",
        label: "Custom 5",
        type: "text",
        help: "Tenant-defined freeform.",
      },
    ],
  },

  Expenses: {
    label: "Expenses",
    collection: "expenses",
    list: {
      defaultSort: { key: "expenseDate", dir: "desc" },
      columns: [
        { path: "expenseDate", label: "Date" },

        { path: "vendorNbr", label: "Vendor #" }, // business key on expense                          // inline-review
        { path: "vendorName", label: "Vendor" }, // denormalized at write for fast list               // inline-review

        { path: "category", label: "Category" },
        { path: "amount", label: "Amount" },
        { path: "paymentMethod", label: "Method" },
        { path: "updatedAt", label: "Updated" },
      ],
    },
    fields: [
      { path: "expenseDate", label: "Date", type: "date", required: true },
      {
        path: "vendorNbr",
        label: "Vendor Number",
        type: "picker", // dropdown tied to Vendors collection                                 // inline-review
        required: true,
        picker: {
          collection: "vendors",
          valueKey: "vendorNbr",
          labelFields: ["vendorNbr", "vendorName"],
        }, // ensures only valid vendors can be selected                                         // inline-review
        help: "Choose an existing Vendor from the dropdown (required).",
      },

      // Display-only, persisted fields used for referential integrity and fast lists.                 // inline-review
      // The form renderer disables editing for these (Add & Change).                                  // inline-review
      { path: "vendorId", label: "Vendor Id", type: "text", immutable: true },
      {
        path: "vendorName",
        label: "Vendor Name",
        type: "text",
        immutable: true,
      },

      {
        path: "category",
        label: "Category",
        type: "select",
        options: [
          "supplies",
          "payroll",
          "utilities",
          "rent",
          "marketing",
          "taxes",
          "other",
        ],
        required: true,
      },
      { path: "amount", label: "Amount", type: "number", required: true },
      {
        path: "paymentMethod",
        label: "Payment Method",
        type: "select",
        options: ["cash", "check", "credit", "debit", "ach", "other"],
      },
      { path: "notes", label: "Notes", type: "textarea" },
      // MVP receipt (stored inline as Data URL object {receiptName, receiptSize, receiptType, receiptDataUrl})
      { path: "receipt", label: "Receipt Image", type: "file" },
    ],
  },

  Finances: {
    label: "Transactions",
    collection: "transactions",
    list: {
      defaultSort: { key: "txnDate", dir: "desc" },
      columns: [
        { path: "txnDate", label: "Date" },
        { path: "type", label: "Type" }, // "income" | "expense"
        { path: "source", label: "Source" }, // "invoice:<id>" or "expense:<id>" or "manual"
        { path: "category", label: "Category" }, // mirrors expense categories
        { path: "amount", label: "Amount" },
        { path: "reconciled", label: "Reconciled" },
      ],
    },
    fields: [
      { path: "txnDate", label: "Date", type: "date", required: true },
      {
        path: "type",
        label: "Type",
        type: "select",
        options: ["income", "expense"],
        required: true,
      },
      { path: "source", label: "Source", type: "text" },
      { path: "category", label: "Category", type: "text" },
      { path: "amount", label: "Amount", type: "number", required: true },
      { path: "notes", label: "Notes", type: "textarea" },
      { path: "reconciled", label: "Reconciled", type: "checkbox" },
      {
        path: "reconciledAt",
        label: "Reconciled At",
        type: "date",
        hideOnAdd: true,
      },
      {
        path: "reconciledBy",
        label: "Reconciled By",
        type: "text",
        hideOnAdd: true,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────

  Invoices: {
    label: "Invoices",
    collection: "invoices",
    list: {
      defaultSort: { key: "updatedAt", dir: "desc" },
      columns: [
        { path: "invoiceNumber", label: "Invoice #" },
        { path: "customerName", label: "Customer" },
        { path: "total", label: "Total" },
        { path: "paid", label: "Paid?" },
        { path: "updatedAt", label: "Updated" },
      ],
    },
    meta: { immutable: ["tenantId", "appId", "createdAt", "createdBy"] },
    fields: [
      {
        path: "templateId",
        label: "Template",
        type: "text",
        required: true,
        immutable: true,
      },
      {
        path: "invoiceNumber",
        label: "Invoice #",
        type: "text",
        required: true,
      },
      { path: "customerId", label: "Customer Id", type: "text" },
      { path: "customerName", label: "Customer Name", type: "text" },
      { path: "issueDate", label: "Issue Date", type: "date", required: true },
      { path: "dueDate", label: "Due Date", type: "date", required: true },
      { path: "currency", label: "Currency", type: "text", required: true },
      { path: "subTotal", label: "Subtotal", type: "number" },
      { path: "taxTotal", label: "Tax", type: "number" },
      { path: "total", label: "Total", type: "number" }, // a.k.a. grandTotal
      { path: "paid", label: "Paid?", type: "checkbox" },
      { path: "paidAt", label: "Paid At", type: "date", hideOnAdd: true },
      // editor-only dynamic areas
      {
        path: "fields",
        label: "Dynamic Fields",
        type: "object",
        hideOnChange: true,
      },
      {
        path: "lineItems",
        label: "Line Items",
        type: "object",
        hideOnChange: true,
      },
      {
        path: "pdfUrl",
        label: "PDF URL",
        type: "text",
        hideOnChange: true,
        immutable: true,
      },
      // audit
      {
        path: "createdAt",
        label: "Created At",
        type: "date",
        immutable: true,
        hideOnChange: true,
      },
      {
        path: "createdBy",
        label: "Created By",
        type: "text",
        immutable: true,
        hideOnChange: true,
      },
      {
        path: "updatedAt",
        label: "Updated At",
        type: "date",
        immutable: true,
        hideOnChange: true,
      },
      {
        path: "updatedBy",
        label: "Updated By",
        type: "text",
        immutable: true,
        hideOnChange: true,
      },
    ],
  },

  // InvoiceTemplates (designer) — defines dynamic fields, line item columns, header/footer, etc.
  InvoiceTemplates: {
    label: "Invoice Templates",
    collection: "invoiceTemplates",
    list: { defaultSort: { key: "name", dir: "asc" } },
    meta: { immutable: ["tenantId", "appId", "createdAt", "createdBy"] },
    fields: [
      { path: "name", label: "Template Name", type: "text", required: true },
      {
        path: "currency",
        label: "Default Currency",
        type: "text",
        required: true,
      },
      { path: "header.title", label: "Header Title", type: "text" },
      { path: "header.logoUrl", label: "Logo URL", type: "text" },
      { path: "footer.notes", label: "Footer Notes", type: "textarea" },
      // JSON arrays edited by the designer (rendered by custom UI, not generic form)
      {
        path: "fields",
        label: "Custom Fields[]",
        type: "object",
        hideOnChange: true,
      },
      {
        path: "lineItemColumns",
        label: "Line Item Columns[]",
        type: "object",
        hideOnChange: true,
      },
      // audit
      {
        path: "createdAt",
        type: "date",
        label: "Created At",
        immutable: true,
        hideOnChange: true,
      },
      {
        path: "createdBy",
        type: "text",
        label: "Created By",
        immutable: true,
        hideOnChange: true,
      },
      {
        path: "updatedAt",
        type: "date",
        label: "Updated At",
        immutable: true,
        hideOnChange: true,
      },
      {
        path: "updatedBy",
        type: "text",
        label: "Updated By",
        immutable: true,
        hideOnChange: true,
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────────
  // Employees (core profile). Sensitive fields (SSN, compensation) will live in a
  // protected subcollection and are *not* part of this schema.
  Employees: {
    label: "Employees",
    collection: "employees",
    addTitle: "Add Employee",
    changeTitle: "Change Employee",
    listTitle: "List Employees",

    // Used by generic pickers and search bars
    search: {
      keys: [
        "name1",
        "lastName",
        "firstName",
        "empId",
        "employeeId",
        "email",
        "department",
        "title",
      ],
    },

    // top-level defaultSort for tests and shared helpers
    defaultSort: { key: "empId", dir: "asc" },
    // picker label config drives dropdown text  unit tests
    picker: { labelFields: ["empId", "name1"] },

    list: {
      defaultSort: { key: "lastName", dir: "asc" },
    },

    // Collection-level immutables used by ChangeEntity via allImmutable
    meta: {
      immutable: [
        "tenantId",
        "appId",
        "createdAt",
        "createdBy",
        "updatedAt",
        "updatedBy",
      ],
    },

    fields: [
      {
        path: "empId",
        label: "Employee #",
        type: "text",
        required: true,
        immutable: true,
        editableOnCreate: true,
      },
      { path: "name1", label: "Name", type: "text" },
      { path: "firstName", label: "First Name", type: "text" },
      { path: "lastName", label: "Last Name", type: "text" },
      { path: "email", label: "Email", type: "email" },
      { path: "phoneNumber", label: "Phone", type: "text" },
      {
        path: "dateOfBirth",
        label: "Date of Birth",
        type: "date",
        immutable: true,
      },
      { path: "address.street", label: "Street", type: "text" },
      { path: "address.city", label: "City", type: "text" },
      { path: "address.state", label: "State", type: "text" },
      { path: "address.zipCode", label: "ZIP", type: "text" },
      { path: "hireDate", label: "Hire Date", type: "date" },

      // Employment Status (required)
      {
        path: "employmentStatus",
        label: "Employment Status",
        type: "select",
        required: true,
        options: EMPLOYMENT_STATUS_OPTIONS,
        placeholder: "Select Employment status",
      },

      // Employment Type
      {
        path: "employmentType",
        label: "Employment Type",
        type: "select",
        options: EMPLOYMENT_TYPE_OPTIONS,
        allowBlank: true,
        placeholder: "Select Employment type",
      },

      { path: "department", label: "Department", type: "text" },
      { path: "title", label: "Title", type: "text" },
      { path: "managerId", label: "Manager Employee ID", type: "text" },

      { path: "location", label: "Location", type: "text" },
      { path: "costCenter", label: "Cost Center", type: "text" },

      // Logical delete flags (no physical deletes)
      {
        path: "isDeleted",
        label: "Deleted?",
        type: "checkbox",
        hideOnAdd: true,
      },
      {
        path: "deletedAt",
        label: "Deleted At",
        type: "date",
        hideOnAdd: true,
        immutable: true,
      },
      {
        path: "deletedBy",
        label: "Deleted By",
        type: "text",
        hideOnAdd: true,
        immutable: true,
      },
    ],

    // Fields to include in CSV export (defaults to all non-object fields)
    csv: [
      "empId",
      "lastName",
      "firstName",
      "email",
      "employmentStatus",
      "department",
      "title",
      "updatedAt",
    ],
  },
};

// 3) Default export for legacy consumers.
