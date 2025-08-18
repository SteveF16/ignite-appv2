import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    collection,
    onSnapshot,
    query,
    where, // Add this import
    deleteDoc,
    doc
} from 'firebase/firestore';
import { FirebaseContext } from './AppWrapper';
import { Edit, Trash2, Download } from 'lucide-react';
import DataEntryForm from './DataEntryForm';
import { CollectionSchemas } from './DataSchemas';


// ---------------------------------------------------------------------------
// Render helpers
//  - Pretty prints Firestore Timestamps
//  - Truncates long cells with a tooltip (title attr)
//  - Formats known nested shapes (e.g., Customers.contacts.primary)
// ---------------------------------------------------------------------------
const renderValue = (value, key) => {
  if (value && typeof value === 'object') {
    // Firestore Timestamp -> Date string
    if (typeof value.toDate === 'function') {
      const dateObj = value.toDate();
      return dateObj.toLocaleString();
    }
    // Known nested: Customers.contacts.primary -> "First Last (email, phone)"
    if (key === 'primaryContact' && value) {
      const first = value.firstName || '';
      const last = value.lastName || '';
      const email = value.email || '';
      const phone = value.phone || '';
      return `${[first, last].filter(Boolean).join(' ')}${email || phone ? ' (' : ''}${[email, phone].filter(Boolean).join(', ')}${email || phone ? ')' : ''}`;
    }
    // Generic nested object → compact JSON
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return value !== undefined && value !== null ? String(value) : '';
};


const ListDataView = ({ branch }) => {
const { db, tenantId } = useContext(FirebaseContext);
const [data, setData] = useState([]);          // raw firestore rows
const [viewData, setViewData] = useState([]);  // shaped rows for table/CSV
const [loading, setLoading] = useState(true);
const [editItem, setEditItem] = useState(null);
const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
const [itemToDelete, setItemToDelete] = useState(null);

// Download CSV function is added here
// ── Column visibility & order (simple UX for step 1; drag/drop can come later)
const [columns, setColumns] = useState([]); // [{ key, visible }]
//const [expandedRowId, setExpandedRowId] = useState(null); // detail expander per row
 
    // Flatten/derive row values for list readability.
    // NOTE: We purposely avoid leaking sensitive fields here (see schema.excludes).
    const shapeForList = useCallback((rawRows) => {
    const collectionName = branch.replace('List ', '');
    const colSchema = CollectionSchemas?.[collectionName];
    const exclude = new Set(colSchema?.list?.exclude || []);
    if (!rawRows?.length) return [];

    // Customers: derive readable fields from nested objects
    if (collectionName === 'Customers') {
    return rawRows.map((row) => {
        const shaped = {
        id: row.id,
        customerNbr: row.customerNbr,
        name1: row.name1,
        name2: row.name2,
        name3: row.name3,
        status: row.status,
        // Primary contact rendered separately via renderValue("primaryContact")
        primaryContact: row.contacts?.primary || null,
        // Billing address (1-liner)
        billingAddress: [
            row.billing?.address?.line1,
            row.billing?.address?.line2,
            row.billing?.address?.city,
            row.billing?.address?.state,
            row.billing?.address?.postalCode,
            row.billing?.address?.country
        ].filter(Boolean).join(', '),
        // Credit controls
        creditLimit: row.billing?.creditLimit ?? '',
        onCreditHold: row.billing?.onCreditHold ? 'Yes' : 'No',
        paymentTerms: row.billing?.paymentTerms ?? '',
        // Timestamps
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        };
        // Remove excluded keys defensively
        for (const k of exclude) delete shaped[k];
        return shaped;
    });
    }
    // Default: shallow copy and drop excluded keys
    return rawRows.map((row) => {
    const shaped = { ...row };
    for (const k of exclude) delete shaped[k];
    return shaped;
    });
}, [branch]);


const deriveColumns = (rows) => {
    if (!rows.length) return [];
    // Hide metadata; the shaper already removed sensitive/audit fields
    const keys = Object.keys(rows[0]).filter(k => k !== 'id' && k !== 'tenantId');
    return keys.map((k) => ({ key: k, visible: true }));
};


useEffect(() => {
        // Whenever data changes, shape rows for display and recompute columns
        const shaped = shapeForList(data);
        setViewData(shaped); // keep raw data separate to avoid loops
        setColumns((prev) => {
          const next = deriveColumns(shaped);
          if (!prev.length) return next;
          const asMap = new Map(prev.map(c => [c.key, c]));
          return next.map(c => asMap.get(c.key) || c);
        });
}, [data, shapeForList]);

// Download CSV respects current column visibility
const handleDownloadCSV = () => {
    if (viewData.length === 0) return;


    const collectionName = branch.replace('List ', '');
    const colSchema = CollectionSchemas?.[collectionName];
    const excludeCsv = new Set(colSchema?.csv?.exclude || []);
    const headers = columns
        .filter(c => c.visible && !excludeCsv.has(c.key))
        .map(c => c.key);

    const csvRows = viewData.map(row => {
        return headers.map(header => {
            const value = renderValue(row[header], header);
            return `"${String(value).replace(/"/g, '""')}"`;   // Escape quotes
        }).join(',');
    });

    
    // Prepend headers
    const csvContent = [headers.join(','), ...csvRows].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${branch.replace('List ', '')}_data.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
// --- END OF Download CSV function

    

    useEffect(() => {
        if (!db || !tenantId || !branch) {
            setLoading(false);
            return;
        }

        // Construct the full path according to your security rules
        const collectionPath = `artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'            
        }/tenants/${tenantId}/${branch.replace('List ', '').toLowerCase()}`;
        const q = query(collection(db, collectionPath), where("tenantId", "==", tenantId));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setData(fetchedData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching data: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, tenantId, branch]);



const handleEdit = (item) => {
        setEditItem(item);
    };

    const handleDelete = (item) => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete || !db || !tenantId) return;
        try {
            const collectionName = branch.replace('List ', '').toLowerCase();
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const docRef = doc(db, `artifacts/${appId}/tenants/${tenantId}/${collectionName}`, itemToDelete.id);
            await deleteDoc(docRef);
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        } catch (error) {
            console.error('Error removing document: ', error);
        }
    };

    const cancelDelete = () => {
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
    };

    const handleEditSave = () => {
        setEditItem(null);
    };    
    

if (loading) {
        return <div className="text-center py-8">Loading...</div>;
    }

    if (editItem) {
        return (
            <DataEntryForm
                selectedBranch={`Change ${branch}`}
                initialData={editItem}
                onSave={handleEditSave}
                onCancel={() => setEditItem(null)}
            />
        );
    }

    if (viewData.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>No data found for {branch.replace('List ', '')}.</p>
                <p>Add new records using the {`Add ${branch.replace('List ', '')}`} option in the sidebar.</p>
            </div>
        );
    }

    // Determine the headers dynamically from the first item
    const headers = viewData.length > 0 ? Object.keys(viewData[0]).filter(key => key !== 'id' && key !== 'tenantId') : [];

    return (
        <div className="p-6 bg-white rounded-lg shadow-xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{branch.replace('List ', '')} Records</h2>
                <button
                    onClick={handleDownloadCSV}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors shadow-md"
                >
                    <Download size={20} />
                    <span>Download CSV</span>
                </button>
            </div>
            <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {headers.map(header => (
                                <th
                                    key={header}
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                    {header.replace(/([A-Z])/g, ' $1').trim()}
                                </th>
                            ))}
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {viewData.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-100 transition-colors">
                                {headers.map((header) => (
                                    <td
                                        key={header}
                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-800"
                                    >
                                        {renderValue(item[header], header)}
                                    </td>
                                ))}
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-center space-x-2">
                                        <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-900 transition-colors">
                                            <Edit size={20} />
                                        </button>
                                        <button onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-900 transition-colors">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* This delete confirmation modal is new */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative p-8 bg-white w-96 rounded-lg shadow-xl">
                        <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
                        <p className="mb-6">Are you sure you want to delete this item? This action cannot be undone.</p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListDataView;