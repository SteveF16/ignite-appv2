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

// --- NEW: Collection-centric schemas consumed by DataEntryForm/ListDataView ---
// We keep the old default export intact (action-oriented) for backward compat,
// but introduce a normalized, collection-first shape that supports:
//  - Nested fields via dot-paths (e.g., billing.address.city)
//  - Per-field metadata (label, required, enum, sensitive)
//  - Industry-default selects with optional blank choice

// export const CollectionSchemas = {
//   Customers: {
//     fields: [
//       // identity/contact
//       { path: 'name', type: 'text', label: 'Name', required: true },           // required to help search & list
//       { path: 'company', type: 'text', label: 'Company' },
//       { path: 'contacts.email', type: 'email', label: 'Email' },
//       { path: 'contacts.phone', type: 'tel', label: 'Phone' },

//       // status  source (industry defaults; blanks allowed)
//       { path: 'status', type: 'select', label: 'Status', enum: ['Lead','Prospect','Active','Inactive'], allowBlank: true },
//       { path: 'leadSource', type: 'select', label: 'Lead Source', enum: ['Referral','Website','Ads','Event','Cold Outreach','Partner'], allowBlank: true },
//       { path: 'firstContactDate', type: 'date', label: 'First Contact' },

//       // billing (nested)
//       { path: 'billing.address.line1', type: 'text', label: 'Billing Address 1' },
//       { path: 'billing.address.line2', type: 'text', label: 'Billing Address 2' },
//       { path: 'billing.address.city', type: 'text', label: 'Billing City' },
//       { path: 'billing.address.state', type: 'text', label: 'Billing State/Region' },
//       { path: 'billing.address.postalCode', type: 'text', label: 'Billing Postal Code' },
//       { path: 'billing.address.country', type: 'text', label: 'Billing Country' },
//       { path: 'billing.paymentTerms', type: 'select', label: 'Payment Terms', enum: ['Due on Receipt','Net 15','Net 30','Net 45','Net 60'], allowBlank: true },
//       { path: 'billing.tax.taxExempt', type: 'checkbox', label: 'Tax Exempt' },
//       { path: 'billing.tax.taxId', type: 'text', label: 'Tax ID', sensitive: true }, // sensitive -> candidate for field-level encryption

//       // shipping (nested)
//       { path: 'shipping.useBilling', type: 'checkbox', label: 'Shipping same as Billing' },
//       { path: 'shipping.address.line1', type: 'text', label: 'Shipping Address 1' },
//       { path: 'shipping.address.line2', type: 'text', label: 'Shipping Address 2' },
//       { path: 'shipping.address.city', type: 'text', label: 'Shipping City' },
//       { path: 'shipping.address.state', type: 'text', label: 'Shipping State/Region' },
//       { path: 'shipping.address.postalCode', type: 'text', label: 'Shipping Postal Code' },
//       { path: 'shipping.address.country', type: 'text', label: 'Shipping Country' },

//       // notes
//       { path: 'notes', type: 'textarea', label: 'Notes' },
//     ],
//   },
// }; // ← END DataSchemas (legacy sections)

// 2) Export the new collection-centric schemas AFTER the DataSchemas object.
//    This prevents the "Unexpected keyword 'export'" parser error.
export const CollectionSchemas = {
  Customers: {
    fields: [
      // ── Identity / keys
      { path: 'customerNbr', type: 'text', label: 'Customer #', required: true },       // unique per tenantId
      { path: 'name1',       type: 'text', label: 'Name 1',     required: true },       // primary/display
      { path: 'name2',       type: 'text', label: 'Name 2' },                            // DBA/legal/alt
      { path: 'name3',       type: 'text', label: 'Name 3' },                            // legacy/alt2

      // ── Contacts (primary) – extra contacts live in a subcollection
      { path: 'contacts.primary.firstName', type: 'text',  label: 'Primary Contact First' },
      { path: 'contacts.primary.lastName',  type: 'text',  label: 'Primary Contact Last' },
      { path: 'contacts.primary.email',     type: 'email', label: 'Primary Contact Email' },
      { path: 'contacts.primary.phone',     type: 'tel',   label: 'Primary Contact Phone' },

      // ── Status & lifecycle
      { path: 'status',             type: 'select',  label: 'Status', enum: ['Lead','Prospect','Active','Inactive'], allowBlank: true },
      { path: 'leadSource',         type: 'select',  label: 'Lead Source', enum: ['Referral','Website','Ads','Event','Cold Outreach','Partner'], allowBlank: true },
      { path: 'activatedAt',        type: 'date',    label: 'Activated At' },
      { path: 'deactivatedAt',      type: 'date',    label: 'Deactivated At' },
      { path: 'deactivationReason', type: 'text',    label: 'Deactivation Reason' },
      { path: 'isActive',           type: 'checkbox',label: 'Active' },

      // ── Billing (standardized, nested; ISO-3166-1/2, ZIP4 allowed)
      { path: 'billing.address.line1',      type: 'text',  label: 'Billing Address 1', required: true },
      { path: 'billing.address.line2',      type: 'text',  label: 'Billing Address 2' },
      { path: 'billing.address.line3',      type: 'text',  label: 'Billing Address 3' },
      { path: 'billing.address.city',       type: 'text',  label: 'Billing City',      required: true },
      { path: 'billing.address.state',      type: 'text',  label: 'Billing State (ISO-3166-2)', required: true }, // e.g., US-CA
      { path: 'billing.address.postalCode', type: 'text',  label: 'Billing Postal Code', required: true },        // 12345 or 12345-6789
      { path: 'billing.address.country',    type: 'text',  label: 'Billing Country (ISO-3166-1)', required: true }, // e.g., US
      { path: 'billing.paymentTerms',       type: 'select',label: 'Payment Terms', enum: ['Due on Receipt','Net 15','Net 30','Net 45','Net 60'], allowBlank: true },
      { path: 'billing.creditLimit',        type: 'number',label: 'Credit Limit' },
      { path: 'billing.onCreditHold',       type: 'checkbox', label: 'On Credit Hold' },
      { path: 'billing.currency',           type: 'text',  label: 'Billing Currency (ISO-4217)' },
      { path: 'billing.billingCycle',       type: 'select',label: 'Billing Cycle', enum: ['One-time','Monthly','Quarterly','Annual'], allowBlank: true },
      { path: 'billing.tax.taxExempt',      type: 'checkbox', label: 'Tax Exempt' },
      { path: 'billing.tax.exemptionCertificateId', type: 'text', label: 'Exemption Certificate ID' },
      { path: 'billing.tax.taxId',          type: 'text',  label: 'Billing Tax/VAT ID', sensitive: true }, // encrypted & masked

      // ── Shipping (compute-on-read when useBilling=true; no duplication)
      { path: 'shipping.useBilling',        type: 'checkbox', label: 'Shipping same as Billing' },
      { path: 'shipping.address.line1',     type: 'text',  label: 'Shipping Address 1' },
      { path: 'shipping.address.line2',     type: 'text',  label: 'Shipping Address 2' },
      { path: 'shipping.address.line3',     type: 'text',  label: 'Shipping Address 3' },
      { path: 'shipping.address.city',      type: 'text',  label: 'Shipping City' },
      { path: 'shipping.address.state',     type: 'text',  label: 'Shipping State (ISO-3166-2)' },
      { path: 'shipping.address.postalCode',type: 'text',  label: 'Shipping Postal Code' },
      { path: 'shipping.address.country',   type: 'text',  label: 'Shipping Country (ISO-3166-1)' },

      // ── Tax & compliance (sensitive)
      { path: 'tax.ssn',                    type: 'text',  label: 'SSN', sensitive: true },
      { path: 'tax.ein',                    type: 'text',  label: 'EIN', sensitive: true },
      { path: 'tax.taxId',                  type: 'text',  label: 'Tax/VAT ID', sensitive: true },

      // ── Locale
      { path: 'preferredLanguage',          type: 'text',  label: 'Preferred Language (BCP-47)' },
      { path: 'timezone',                   type: 'text',  label: 'Timezone (IANA)' },

      // ── Notes (summary only; full notes live in a subcollection)
      { path: 'notesSummary',               type: 'textarea', label: 'Notes (Summary)' },
    ],
    // Default list/CSV policy (can be refined per tenant later)
    list: {
      exclude: ['tax.ssn','tax.ein','tax.taxId','billing.tax.taxId','createdBy','updatedBy','deletedAt','deletedBy'],
    },
    csv: {
      exclude: ['tax.ssn','tax.ein','tax.taxId','billing.tax.taxId','createdBy','updatedBy','deletedAt','deletedBy'],
    },
  },
};

// 3) Default export for legacy consumers.
export default DataSchemas;