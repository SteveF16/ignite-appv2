const DataSchemas = {
  // --- Customers ---
  'Add Customer': [
    { name: 'customerName', type: 'text', placeholder: 'Customer Name' },
    { name: 'contactPerson', type: 'text', placeholder: 'Contact Person' },
    { name: 'email', type: 'email', placeholder: 'Email' },
    { name: 'phone', type: 'tel', placeholder: 'Phone' },
  ],
  'Change Customer': [
    { name: 'customerId', type: 'text', placeholder: 'Customer ID' },
    { name: 'customerName', type: 'text', placeholder: 'Customer Name' },
    { name: 'contactPerson', type: 'text', placeholder: 'Contact Person' },
    { name: 'email', type: 'email', placeholder: 'Email' },
    { name: 'phone', type: 'tel', placeholder: 'Phone' },
  ],
  'Delete Customer': [
    { name: 'customerId', type: 'text', placeholder: 'Customer ID' },
  ],

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

export default DataSchemas;