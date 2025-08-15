import React, { useState, useEffect, useContext } from 'react';
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

//const [editItem, setEditItem] = useState(null);
//const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
//const [itemToDelete, setItemToDelete] = useState(null);

const renderValue = (value, key) => {
    if (value && typeof value === 'object') {
        if (typeof value.toDate === 'function') {
            const dateObj = value.toDate();
            if (key && key.toLowerCase().includes('date')) {
                return dateObj.toLocaleDateString();
            }
            return dateObj.toLocaleString();
        }
        return JSON.stringify(value);
    }
    return value;
};

const ListDataView = ({ branch }) => {
    const { db, tenantId } = useContext(FirebaseContext);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editItem, setEditItem] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Download CSV function is added here
const handleDownloadCSV = () => {
        if (data.length === 0) return;

        const headers = Object.keys(data[0]).filter(key => key !== 'id' && key !== 'tenantId');
        const csvRows = data.map(row => {
            return headers.map(header => {
                const value = renderValue(row[header], header);
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',');
        });

        const csvContent = [headers.join(','), ...csvRows].join('\n');
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
                selectedBranch={branch.replace('List ', 'Change ')}
                initialData={editItem}
                onSave={handleEditSave}
                onCancel={() => setEditItem(null)}
            />
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>No data found for {branch.replace('List ', '')}.</p>
                <p>Add new records using the {`Add ${branch.replace('List ', '')}`} option in the sidebar.</p>
            </div>
        );
    }

    // Determine the headers dynamically from the first item
    const headers = data.length > 0 ? Object.keys(data[0]).filter(key => key !== 'id' && key !== 'tenantId') : [];

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
                        {data.map((item) => (
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