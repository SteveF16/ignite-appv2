/* global __app_id */ 
// DataEntryForm.js
import React, { useState, useEffect, useContext } from 'react';
import {
    collection,
    addDoc,
    doc,
    setDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { FirebaseContext } from './AppWrapper';

const DataEntryForm = ({ selectedBranch, selectedSubBranch, editingDoc, onSave, onCancel }) => {
    const { db, user, tenantId } = useContext(FirebaseContext);
    const [formData, setFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    // Dynamic field generation based on the selected branch
    const getFields = () => {
        if (!selectedSubBranch) return [];
        switch (selectedSubBranch) {
            case 'employees':
                return [
                    { name: 'name', type: 'text', placeholder: 'Employee Name' },
                    { name: 'position', type: 'text', placeholder: 'Position' },
                    { name: 'hireDate', type: 'date', placeholder: 'Hire Date' }, // ✅ Using a date input
                    { name: 'salary', type: 'number', placeholder: 'Salary' }
                ];
            case 'products':
                return [
                    { name: 'productName', type: 'text', placeholder: 'Product Name' },
                    { name: 'price', type: 'number', placeholder: 'Price' },
                    { name: 'stock', type: 'number', placeholder: 'Stock Quantity' }
                ];
            case 'suppliers':
                return [
                    { name: 'supplierName', type: 'text', placeholder: 'Supplier Name' },
                    { name: 'contactPerson', type: 'text', placeholder: 'Contact Person' },
                    { name: 'phone', type: 'tel', placeholder: 'Phone Number' }
                ];
            case 'sales':
                return [
                    { name: 'customerName', type: 'text', placeholder: 'Customer Name' },
                    { name: 'amount', type: 'number', placeholder: 'Sale Amount' },
                    { name: 'date', type: 'date', placeholder: 'Sale Date' }
                ];
            default:
                return [];
        }
    };

    useEffect(() => {
        if (editingDoc) {
            // Set form data from the document, converting Firebase Timestamp to a date string
            const initialData = {};
            for (const key in editingDoc) {
                if (editingDoc[key] && typeof editingDoc[key].toDate === 'function') {
                    // Format date for the date input
                    initialData[key] = editingDoc[key].toDate().toISOString().split('T')[0];
                } else {
                    initialData[key] = editingDoc[key];
                }
            }
            setFormData(initialData);
        } else {
            // Reset form for new entry
            setFormData({});
        }
    }, [editingDoc]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        // Ensure a user is authenticated
        if (!user || !tenantId) {
            setError("User not authenticated or tenant ID not found.");
            setIsSaving(false);
            return;
        }

        try {
            // Construct the Firestore path for the public data
            const collectionPath = `artifacts/${__app_id}/public/data/${selectedSubBranch}`;
            const collectionRef = collection(db, collectionPath);

            const dataToSave = {
                ...formData,
                timestamp: serverTimestamp(), // Use Firestore server timestamp
            };
            
            // Convert date string back to Firestore Timestamp for hireDate and date fields
            if (dataToSave.hireDate) {
                dataToSave.hireDate = Timestamp.fromDate(new Date(dataToSave.hireDate));
            }
            if (dataToSave.date) {
                dataToSave.date = Timestamp.fromDate(new Date(dataToSave.date));
            }
            
            if (editingDoc) {
                // Update existing document
                const docRef = doc(db, collectionPath, editingDoc.id);
                await setDoc(docRef, dataToSave, { merge: true });
            } else {
                // Add new document
                await addDoc(collectionRef, dataToSave);
            }

            setFormData({});
            if (onSave) onSave();

        } catch (err) {
            console.error("Failed to save data:", err);
            setError("Failed to save data. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };
    
    // UI for the Data Entry Form
    // This is the core of your form, using dynamic fields
    const fields = getFields();
    if (fields.length === 0) {
        return <div className="text-gray-500">Select a sub-branch to start data entry.</div>;
    }

    return (
        <form onSubmit={handleSave} className="space-y-4 p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-800">
                {editingDoc ? 'Edit' : 'New'} {selectedSubBranch.slice(0, -1)}
            </h3>
            {error && (
                <div className="bg-red-100 text-red-600 p-3 rounded-lg text-sm text-center">
                    {error}
                </div>
            )}
            {fields.map(field => (
                <div key={field.name} className="flex flex-col">
                    <label htmlFor={field.name} className="mb-1 text-sm font-medium text-gray-700 capitalize">
                        {field.name.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <input
                        id={field.name}
                        name={field.name}
                        type={field.type}
                        value={formData[field.name] || ''}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                </div>
            ))}
            <div className="flex space-x-2">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-green-600 text-white p-2 rounded-md font-semibold hover:bg-green-700 transition-colors disabled:bg-green-400"
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
                {editingDoc && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                        className="flex-1 bg-gray-300 text-gray-800 p-2 rounded-md font-semibold hover:bg-gray-400 transition-colors"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
};

export default DataEntryForm;
