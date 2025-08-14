import React, { useState, useEffect, useContext } from 'react';
import {
    collection,
    onSnapshot,
    query,
    where,
    deleteDoc,
    doc
} from 'firebase/firestore';
import { FirebaseContext } from './AppWrapper';
import { Edit, Trash2, Download } from 'lucide-react';
import DataEntryForm from './DataEntryForm';

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

    // --- PASTE THIS NEW CODE HERE ---
    const handleDownloadCSV = () => {
        if (data.length === 0) return;

        const headers = Object.keys(data[0]).filter(key => key !== 'id');
        const csvRows = [
            headers.join(','),
            ...data.map(item =>
                headers.map(header => {
                    const value = renderValue(item[header]);
                    const escapedValue = ('' + value).replace(/"/g, '""');
                    return `"${escapedValue}"`;
                }).join(',')
            ),
        ];
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${branch.toLowerCase()}-data.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    // --- END OF NEW CODE ---

    

    useEffect(() => {
        if (!db || !tenantId || !branch) {
            setLoading(false);
            return;
        }

        const collectionPath = branch.replace('List ', '').toLowerCase();
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

    const handleDelete = async (item) => {
        setIsDeleteModalOpen(true);
        setItemToDelete(item);
    };

    const confirmDelete = async () => {
        if (itemToDelete) {
            try {
                const collectionPath = branch.replace('List ', '').toLowerCase();
                await deleteDoc(doc(db, collectionPath, itemToDelete.id));
                console.log("Document successfully deleted!");
            } catch (error) {
                console.error("Error removing document: ", error);
            } finally {
                setIsDeleteModalOpen(false);
                setItemToDelete(null);
            }
        }
    };

    const cancelDelete = () => {
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
    };

    const downloadCsv = () => {
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

    if (loading) {
        return <div className="text-center py-10">Loading data...</div>;
    }

    if (editItem) {
        return <DataEntryForm
            selectedBranch={branch}
            selectedSubBranch={branch}
            initialData={editItem}
            onSave={() => setEditItem(null)}
            onCancel={() => setEditItem(null)}
        />
    }

    if (data.length === 0) {
        return <div className="text-center py-10 text-gray-500">No data found.</div>;
    }

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{branch} Records</h2>
                <button
                    onClick={downloadCsv}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors shadow-md"
                >
                    <Download size={20} />
                    <span>Download CSV</span>
                </button>
            </div>
            <div className="overflow-x-auto rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {Object.keys(data[0]).filter(key => key !== 'id' && key !== 'tenantId').map((key) => (
                                <th
                                    key={key}
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                                </th>
                            ))}
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((item, index) => (
                            <tr key={index}>
                                {Object.keys(item).filter(key => key !== 'id' && key !== 'tenantId').map((key) => (
                                    <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {renderValue(item[key], key)}
                                    </td>
                                ))}
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => setEditItem(item)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                                    >
                                        <Edit size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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