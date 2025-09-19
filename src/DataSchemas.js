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

  // ──────────────────────────────────────────────────────────────────────────
  // Invoices (data instances) — values are mostly driven by a chosen template
  // Audit fields stay immutable; business fields are dynamic via template.
  Invoices: {
    label: "Invoices",
    collection: "invoices",
    list: { defaultSort: { key: "createdAt", dir: "desc" } },
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
      {
        path: "customer.name",
        label: "Bill To: Name",
        type: "text",
        required: true,
      },
      { path: "customer.email", label: "Bill To: Email", type: "text" },
      { path: "issueDate", label: "Issue Date", type: "date", required: true },
      { path: "dueDate", label: "Due Date", type: "date", required: true },
      // Dynamic payload slots written by the editor (do not render in generic form)
      {
        path: "fields",
        label: "Dynamic Fields",
        type: "object",
        hideOnChange: true,
        immutable: false,
      },
      {
        path: "lineItems",
        label: "Line Items",
        type: "object",
        hideOnChange: true,
        immutable: false,
      },
      { path: "currency", label: "Currency", type: "text", required: true },
      { path: "subTotal", label: "Subtotal", type: "number" },
      { path: "taxTotal", label: "Tax", type: "number" },
      { path: "grandTotal", label: "Total", type: "number" },
      {
        path: "pdfUrl",
        label: "PDF URL",
        type: "text",
        immutable: true,
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
    collectionName: "employees",
    addTitle: "Add Employee",
    changeTitle: "Change Employee",
    listTitle: "List Employees",
    fields: [
      {
        path: "employeeId",
        label: "Employee ID",
        type: "text",
        required: true,
        hideOnChange: true,
      },
      { path: "firstName", label: "First Name", type: "text", required: true },
      { path: "lastName", label: "Last Name", type: "text", required: true },
      { path: "email", label: "Email", type: "email" },
      { path: "phoneNumber", label: "Phone", type: "text" },
      {
        path: "dateOfBirth",
        label: "Date of Birth",
        type: "date",
        immutable: true,
      }, // PII display-only later
      { path: "address.street", label: "Street", type: "text", required: true },
      { path: "address.city", label: "City", type: "text", required: true },
      { path: "address.state", label: "State", type: "text", required: true },
      { path: "address.zipCode", label: "ZIP", type: "text", required: true },
      { path: "hireDate", label: "Hire Date", type: "date", required: true },

      // Employment Status (required)
      {
        path: "employmentStatus", // if you used nested paths, replace with "employment.status"
        label: "Employment Status",
        type: "select",
        required: true,
        options: EMPLOYMENT_STATUS_OPTIONS,
        placeholder: "Select Employment status",
        //        defaultValue: "Active",       <-- this hides the hint "select status"
      },

      // Employment Type
      {
        path: "employmentType", // if you used nested paths, replace with "employment.type"
        label: "Employment Type",
        type: "select",
        options: EMPLOYMENT_TYPE_OPTIONS,
        allowBlank: true, // Adding this allows hint 'select value' to show
        placeholder: "Select Employment type",
      },

      { path: "department", label: "Department", type: "text" }, // will become lookup later
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
    list: [
      { path: "employeeId", label: "ID" },
      { path: "lastName", label: "Last" },
      { path: "firstName", label: "First" },
      { path: "email", label: "Email" },
      { path: "employmentStatus", label: "Status" },
      { path: "department", label: "Dept" },
      { path: "title", label: "Title" },
      { path: "updatedAt", label: "Updated" },
    ],
    defaultSort: { path: "lastName", dir: "asc" },
    csv: [
      "employeeId",
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
