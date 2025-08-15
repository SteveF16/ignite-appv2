
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
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

const DataEntryForm = ({ selectedBranch, initialData, onSave, onCancel }) => {
    const { db, tenantId } = useContext(FirebaseContext);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const collectionName = selectedBranch.replace('Change ', '').replace('Add ', '').toLowerCase();
    const schema = useMemo(
            () => dataSchemas[collectionName.charAt(0).toUpperCase() + collectionName.slice(1)] || {},
            [collectionName]
            );
    const schemaFields = useMemo(
            () => Object.keys(schema).map(key => ({ name: key, type: schema[key] })),
            [schema]
            );
    useEffect(() => {
        if (initialData) {
            const initialFormState = {};
            schemaFields.forEach(field => {
                if (field.type === 'date' && initialData[field.name]) {
                    initialFormState[field.name] = initialData[field.name].toDate();
                } else if (field.type === 'checkbox') {
                    initialFormState[field.name] = initialData[field.name] || false;
                } else {
                    initialFormState[field.name] = initialData[field.name] || '';
                }
            });
            setFormData(initialFormState);
        } else {
            const initialFormState = {};
            schemaFields.forEach(field => {
                initialFormState[field.name] = field.type === 'checkbox' ? false : '';
            });
            setFormData(initialFormState);
        }
    }, [initialData, schemaFields]); // now stable due to useMemo

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (name) => {
        setFormData(prev => ({ ...prev, [name]: !prev[name] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const isEditMode = selectedBranch.includes('Change');
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const collectionPath = `artifacts/${appId}/tenants/${tenantId}/${collectionName}`;
            const dataToSave = {
            ...formData,
            tenantId,
            updatedAt: new Date(),
    };

            if (isEditMode) {
                if (initialData && initialData.id) {
                    const docRef = doc(db, collectionPath, initialData.id);
                    await updateDoc(docRef, dataToSave);
                    setMessage(`${selectedBranch.replace('Change ', '')} updated successfully!`);
                }
            } else {
                await addDoc(collection(db, collectionPath), dataToSave);
                setFormData({});
                setMessage(`${selectedBranch.replace('Add ', '')} added successfully!`);
            }

            if (isEditMode && onSave) {
                setTimeout(() => onSave(), 0);
            }

        } catch (error) {
            console.error('Error saving data:', error);
            setMessage('Failed to save data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getFormTitle = () => {
        return selectedBranch;
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{getFormTitle()}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {schemaFields.map(field => {
                    const { name, type } = field;
                    const placeholder = name.replace(/([A-Z])/g, ' $1').trim();
                    const isSelect = type === 'select';
                    const isCheckbox = type === 'checkbox';

                    return (
                        <div key={name}>
                            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
                                {placeholder}
                            </label>
                            {isSelect ? (
                                <select
                                    id={name}
                                    name={name}
                                    value={formData[name] || ''}
                                    onChange={(e) => handleChange(name, e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                    <option value="" disabled>Select {placeholder}</option>
                                    {/* Options are hardcoded here but can be dynamic */}
                                    {['Income', 'Expense'].map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            ) : isCheckbox ? (
                                <input
                                    type="checkbox"
                                    id={name}
                                    name={name}
                                    checked={formData[name] || false}
                                    onChange={() => handleCheckboxChange(name)}
                                    className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                            ) : type === 'date' ? (
                                <DatePicker
                                    selected={formData[name] || null}
                                    onChange={(date) => handleChange(name, date)}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    dateFormat="MM/dd/yyyy"
                                />
                            ) : (
                                <input
                                    type={type}
                                    id={name}
                                    name={name}
                                    value={formData[name] || ''}
                                    onChange={(e) => handleChange(name, e.target.value)}
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