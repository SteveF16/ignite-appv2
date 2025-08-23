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
  'Add Vendor': [
    { name: 'vendorName', type: 'text', placeholder: 'Vendor Name' },
    { name: 'contactPerson', type: 'text', placeholder: 'Contact Person' },
    { name: 'email', type: 'email', placeholder: 'Email' },
    { name: 'phone', type: 'tel', placeholder: 'Phone' },
  ],
  'Change Vendor': [
    { name: 'vendorId', type: 'text', placeholder: 'Vendor ID' },
    { name: 'vendorName', type: 'text', placeholder: 'Vendor Name' },
    { name: 'contactPerson', type: 'text', placeholder: 'Contact Person' },
    { name: 'email', type: 'email', placeholder: 'Email' },
    { name: 'phone', type: 'tel', placeholder: 'Phone' },
  ],
  'Delete Vendor': [
    { name: 'vendorId', type: 'text', placeholder: 'Vendor ID' },
  ],

  // --- Inventory ---
  'Add Inventory': [
    { name: 'itemName', type: 'text', placeholder: 'Item Name' },
    { name: 'quantity', type: 'number', placeholder: 'Quantity' },
    { name: 'cost', type: 'number', placeholder: 'Cost' },
    { name: 'supplier', type: 'text', placeholder: 'Supplier' },
  ],
  'Change Inventory': [
    { name: 'itemId', type: 'text', placeholder: 'Item ID' },
    { name: 'itemName', type: 'text', placeholder: 'Item Name' },
    { name: 'quantity', type: 'number', placeholder: 'Quantity' },
    { name: 'cost', type: 'number', placeholder: 'Cost' },
    { name: 'supplier', type: 'text', placeholder: 'Supplier' },
  ],
  'Delete Inventory': [
    { name: 'itemId', type: 'text', placeholder: 'Item ID' },
  ],

  // --- Banking ---
  'Add Transaction': [
    { name: 'description', type: 'text', placeholder: 'Description' },
    { name: 'amount', type: 'number', placeholder: 'Amount' },
    { name: 'date', type: 'date', placeholder: 'Transaction Date' },
    { name: 'type', type: 'text', placeholder: 'Type' },
  ],
  'Change Transaction': [
    { name: 'transactionId', type: 'text', placeholder: 'Transaction ID' },
    { name: 'description', type: 'text', placeholder: 'Description' },
    { name: 'amount', type: 'number', placeholder: 'Amount' },
    { name: 'date', type: 'date', placeholder: 'Transaction Date' },
    { name: 'type', type: 'text', placeholder: 'Type' },
  ],
  'Delete Transaction': [
    { name: 'transactionId', type: 'text', placeholder: 'Transaction ID' },
  ],

  // --- Company ---
  'Add Company Info': [
    { name: 'companyName', type: 'text', placeholder: 'Company Name' },
    { name: 'address', type: 'text', placeholder: 'Address' },
    { name: 'taxId', type: 'text', placeholder: 'Tax ID' },
  ],
  'Change Company Info': [
    { name: 'companyId', type: 'text', placeholder: 'Company ID' },
    { name: 'companyName', type: 'text', placeholder: 'Company Name' },
    { name: 'address', type: 'text', placeholder: 'Address' },
    { name: 'taxId', type: 'text', placeholder: 'Tax ID' },
  ],
  'Delete Company Info': [
    { name: 'companyId', type: 'text', placeholder: 'Company ID' },
  ],

  // --- Employees ---
  'Add Employee': [
    { name: 'name', type: 'text', placeholder: 'Employee Name' },
    { name: 'position', type: 'text', placeholder: 'Position' },
    { name: 'department', type: 'text', placeholder: 'Department' },
    { name: 'hireDate', type: 'date', placeholder: 'Hire Date' },
    { name: 'salary', type: 'number', placeholder: 'Salary' },
    { name: 'active', type: 'checkbox', placeholder: 'Is Active' },
  ],
  'Change Employee': [
    { name: 'employeeId', type: 'text', placeholder: 'Employee ID' },
    { name: 'name', type: 'text', placeholder: 'Employee Name' },
    { name: 'position', type: 'text', placeholder: 'Position' },
    { name: 'department', type: 'text', placeholder: 'Department' },
    { name: 'hireDate', type: 'date', placeholder: 'Hire Date' },
    { name: 'salary', type: 'number', placeholder: 'Salary' },
    { name: 'active', type: 'checkbox', placeholder: 'Is Active' },
  ],
  'Delete Employee': [
    { name: 'employeeId', type: 'text', placeholder: 'Employee ID' },
  ],

  // --- Assets ---
  'Add Assets': [
    { name: 'name', type: 'text', placeholder: 'Asset Name' },
    { name: 'type', type: 'text', placeholder: 'Type' },
    { name: 'serialNumber', type: 'text', placeholder: 'Serial Number' },
    { name: 'purchaseDate', type: 'date', placeholder: 'Purchase Date' },
    { name: 'value', type: 'number', placeholder: 'Value' },
    { name: 'location', type: 'text', placeholder: 'Location' },
  ],
  'Change Assets': [
    { name: 'assetId', type: 'text', placeholder: 'Asset ID' },
    { name: 'name', type: 'text', placeholder: 'Asset Name' },
    { name: 'type', type: 'text', placeholder: 'Type' },
    { name: 'serialNumber', type: 'text', placeholder: 'Serial Number' },
    { name: 'purchaseDate', type: 'date', placeholder: 'Purchase Date' },
    { name: 'value', type: 'number', placeholder: 'Value' },
    { name: 'location', type: 'text', placeholder: 'Location' },
  ],
  'Delete Assets': [
    { name: 'assetId', type: 'text', placeholder: 'Asset ID' },
  ],

  // --- Finances ---
  'Add Finances': [
    { name: 'type', type: 'select', placeholder: 'Type' },
    { name: 'description', type: 'text', placeholder: 'Description' },
    { name: 'amount', type: 'number', placeholder: 'Amount' },
    { name: 'date', type: 'date', placeholder: 'Transaction Date' },
    { name: 'category', type: 'text', placeholder: 'Category' },
  ],
  'Change Finances': [
    { name: 'financeId', type: 'text', placeholder: 'Transaction ID' },
    { name: 'type', type: 'select', placeholder: 'Type' },
    { name: 'description', type: 'text', placeholder: 'Description' },
    { name: 'amount', type: 'number', placeholder: 'Amount' },
    { name: 'date', type: 'date', placeholder: 'Transaction Date' },
    { name: 'category', type: 'text', placeholder: 'Category' },
  ],
  'Delete Finances': [
    { name: 'financeId', type: 'text', placeholder: 'Transaction ID' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 1) Export the legacy action-oriented schemas as a single object. 

// 2) Export the new collection-centric schemas AFTER the DataSchemas object.
//    This prevents the "Unexpected keyword 'export'" parser error.
// NOTE: App.js calls `getCollectionFromBranch("Customers")` which returns "customers".
//       To avoid schema-miss issues (blank edit pane), we alias BOTH keys here.  // inline-review: schema alias
// --- NEW: Collection-centric schemas consumed by DataEntryForm/ListDataView ---
export default DataSchemas; // keep legacy default export

// Customers collection schema used by List/Change screens
const CustomersSchema = {
  meta: { immutable: ["customerNbr", "createdAt", "createdBy", "tenantId", "appId"] },
  search: { keys: ["customerNbr", "name1", "name2", "contacts.primary.email", "billing.address.city", "billing.address.state", "billing.address.country"] },
  list: {
    defaultSort: { key: "customerNbr", dir: "asc" },
    exclude: ["tax.ssn", "tax.ein", "tax.taxId", "billing.tax.taxId", "createdBy", "updatedBy", "deletedAt", "deletedBy"],
  },
  csv: { exclude: ["tax.ssn", "tax.ein", "tax.taxId", "billing.tax.taxId"] },
  fields: [
    { path: "customerNbr", type: "text", label: "Customer #", required: true, immutable: true },
    { path: "name1", type: "text", label: "Name 1", required: true },
    { path: "name2", type: "text", label: "Name 2" },
    { path: "name3", type: "text", label: "Name 3" },
    { path: "status", type: "select", label: "Status", enum: ["Lead", "Prospect", "Active", "Inactive"], allowBlank: true },
    { path: "contacts.primary.firstName", type: "text", label: "Primary First Name" },
    { path: "contacts.primary.lastName", type: "text", label: "Primary Last Name" },
    { path: "contacts.primary.email", type: "email", label: "Primary Email" },
    { path: "contacts.primary.phone", type: "tel", label: "Primary Phone" },
    { path: "billing.address.line1", type: "text", label: "Billing Address 1" },
    { path: "billing.address.line2", type: "text", label: "Billing Address 2" },
    { path: "billing.address.city", type: "text", label: "Billing City" },
    { path: "billing.address.state", type: "text", label: "Billing State/Region" },
    { path: "billing.address.postalCode", type: "text", label: "Billing Postal Code" },
    { path: "billing.address.country", type: "text", label: "Billing Country" },
    { path: "credit.limit", type: "number", label: "Credit Limit" },
    { path: "credit.onHold", type: "checkbox", label: "On Credit Hold" },
    { path: "billing.paymentTerms", type: "select", label: "Payment Terms", enum: ["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60"], allowBlank: true },
    { path: "createdAt", type: "text", label: "Created At", immutable: true },
    { path: "createdBy", type: "text", label: "Created By", immutable: true },
  ],
};

export const CollectionSchemas = {
  customers: CustomersSchema, // lower-case alias used by code paths
  Customers: CustomersSchema, // Title-case alias for compatibility
};

// 3) Default export for legacy consumers.
