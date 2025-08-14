/* global __app_id */

import React, { useState, useEffect, useContext } from 'react';
import { collection, addDoc, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FirebaseContext } from './AppWrapper';
import { X, Save } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Define the schema for different data branches
const dataSchemas = {
    'Customers': {
        name: 'text',
        company: 'text',
        email: 'email',
        phone: 'tel',
    },
    'Employees': {
        name: 'text',
        position: 'text',
        department: 'text',
        hireDate: 'date',
        salary: 'number',
        active: 'checkbox',
    },
    'Assets': {
        name: 'text',
        type: 'text',
        serialNumber: 'text',
        purchaseDate: 'date',
        value: 'number',
        location: 'text',
    },
    'Finances': {
        type: 'select',
        description: 'text',
        amount: 'number',
        date: 'date',
        category: 'text',
    },
};

const DataEntryForm = ({ selectedBranch, selectedSubBranch, initialData, onSave, onCancel }) => {
    const { db, tenantId } = useContext(FirebaseContext);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Set initial data for editing
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({});
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleDateChange = (date, name) => {
        setFormData((prev) => ({
            ...prev,
            [name]: date,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const isEditMode = !!initialData;
        const dataToSave = {
            ...formData,
            timestamp: serverTimestamp(),
            // Ensure date fields are stored as Firebase Timestamps
            ...Object.keys(dataSchemas[selectedBranch] || {}).reduce((acc, key) => {
                if (dataSchemas[selectedBranch][key] === 'date' && formData[key]) {
                    acc[key] = new Date(formData[key]);
                }
                return acc;
            }, {}),
        };

        const collectionName = selectedBranch.toLowerCase();
        // Define your app ID here or import it from a config file
        const appId = 'Ignite'; // <-- Replace with your actual app ID
        const fullPath = `artifacts/${appId}/tenants/${tenantId}/${collectionName}`;

        try {
            if (isEditMode) {
                const docRef = doc(db, fullPath, initialData.id);
                await updateDoc(docRef, dataToSave);
                setMessage('Document updated successfully!');
            } else {
                const colRef = collection(db, fullPath);
                await addDoc(colRef, dataToSave);
                setMessage('Document added successfully!');
                setFormData({});
            }
        } catch (error) {
            console.error('Error writing document: ', error);
            setMessage('Error saving document.');
        } finally {
            setLoading(false);
            if (onSave) onSave();
        }
    };

    const fields = dataSchemas[selectedBranch] || {};

    return (
        <div className="max-w-2xl mx-auto p-6 bg-gray-50 rounded-xl shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
                {Object.keys(fields).map((key) => {
                    const type = fields[key];
                    const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim();
                    const placeholder = `Enter ${label}`;

                    return (
                        <div key={key} className="flex flex-col space-y-1">
                            <label htmlFor={key} className="text-sm font-semibold text-gray-700">{label}</label>
                            {type === 'date' ? (
                                <DatePicker
                                    selected={formData[key] ? new Date(formData[key]) : null}
                                    onChange={(date) => handleDateChange(date, key)}
                                    placeholderText={placeholder}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            ) : type === 'select' ? (
                                <select
                                    id={key}
                                    name={key}
                                    value={formData[key] || ''}
                                    onChange={handleChange}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                    <option value="">Select a Type</option>
                                    <option value="income">Income</option>
                                    <option value="expense">Expense</option>
                                </select>
                            ) : type === 'checkbox' ? (
                                <input
                                    id={key}
                                    name={key}
                                    type="checkbox"
                                    checked={!!formData[key]}
                                    onChange={handleChange}
                                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                />
                            ) : (
                                <input
                                    id={key}
                                    name={key}
                                    type={type}
                                    value={formData[key] || ''}
                                    onChange={handleChange}
                                    placeholder={placeholder}
                                    required={type !== 'checkbox'}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            )}
                        </div>
                    );
                })}
                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} />
                        <span>Cancel</span>
                    </button>
                    <button
                        type="submit"
                        className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                        disabled={loading}
                    >
                        <Save size={20} />
                        <span>{loading ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>
            </form>
            {message && <p className="mt-4 text-center text-green-600">{message}</p>}
        </div>
    );
};

export default DataEntryForm;
