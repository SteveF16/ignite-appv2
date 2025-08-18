import React, { useState, useEffect, useContext, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { FirebaseContext } from './AppWrapper';
import { X, Save } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CollectionSchemas } from './DataSchemas'; // ← central, nested-aware schemas
// ^ keep this import; we'll reference CollectionSchemas.Customers for nested fields

// -----------------------------------------------------------------------------
// Debug flag: when true, we log the exact Firestore collection path and doc id.
// Toggle to `false` for production if you don't want console noise.
// -----------------------------------------------------------------------------
const DEBUG_FIRESTORE = true; // <-- set to false after verifying paths

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: dot-path getters/setters for nested objects
// NOTE: We keep these tiny and dependency-free to avoid pulling lodash.
const getByPath = (obj, path) =>
  path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

const setByPath = (obj, path, value) => {
  const parts = path.split('.');
  const last = parts.pop();
  // create nested containers as needed (safe for React state clones)
  let cursor = obj;
  for (const k of parts) {
    if (cursor[k] == null || typeof cursor[k] !== 'object') cursor[k] = {};
    cursor = cursor[k];
  }
  cursor[last] = value;
  return obj;
};

// Flatten schema to uniform list of fields { path, type, label, required, enum, allowBlank, sensitive }
const flattenSchema = (schema) => (schema?.fields ?? []).map(f => ({
  path: f.path,
  type: f.type,
  label: f.label || f.path.split('.').slice(-1)[0],
  required: !!f.required,
  enum: Array.isArray(f.enum) ? f.enum : undefined,
  allowBlank: !!f.allowBlank,
  sensitive: !!f.sensitive,
}));
// ─────────────────────────────────────────────────────────────────────────────@@

const DataEntryForm = ({ selectedBranch, initialData, onSave, onCancel }) => {
    const { db, tenantId } = useContext(FirebaseContext);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const collectionName = selectedBranch.replace('Change ', '').replace('Add ', '').toLowerCase();
    const normalized = useMemo(() => {
        // Pull nested-aware schema (preferred). If missing, fall back to legacy inline config (kept for other branches).
        const key = collectionName.charAt(0).toUpperCase() + collectionName.slice(1);
       return CollectionSchemas[key] || null;
    }, [collectionName]);
    const schemaFields = useMemo(() => {
        if (normalized) return flattenSchema(normalized); // {path, type, ...}
        // Fallback path (legacy). This keeps other branches working as-is.
        const legacy = {}; // intentionally empty to reduce duplication with DataSchemas.js
        return Object.keys(legacy).map(name => ({ path: name, type: legacy[name], label: name }));
    }, [normalized]);

    useEffect(() => {
        // initialize form state from initialData (edit) OR empty defaults (add)
        const next = {};
        schemaFields.forEach(f => {
            const v = initialData ? getByPath(initialData, f.path) : undefined;
            if (f.type === 'date') {
                // Firestore Timestamp -> JS Date for DatePicker, tolerate blanks
                setByPath(next, f.path, v && typeof v.toDate === 'function' ? v.toDate() : (v || null));
            } else if (f.type === 'checkbox') {
                setByPath(next, f.path, v === true); // default false
            } else {
                setByPath(next, f.path, v ?? '');    // keep blanks as empty string
            }
        });
        setFormData(next);
    }, [initialData, schemaFields]);




    // const handleChange = (name, value) => {
    //     setFormData(prev => ({ ...prev, [name]: value }));
    // };

    // const handleCheckboxChange = (name) => {
    //     setFormData(prev => ({ ...prev, [name]: !prev[name] }));
    // };


        const handleChange = (path, value) => {
        // generic setter for any input (supports nested)
        setFormData(prev => {
            const clone = structuredClone ? structuredClone(prev) : JSON.parse(JSON.stringify(prev)); // safe deep copy
            setByPath(clone, path, value);
            return clone;
        });
    };

    const handleCheckboxChange = (path) => {
        setFormData(prev => {
            const clone = structuredClone ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
            const current = !!getByPath(clone, path);
            setByPath(clone, path, !current);
            return clone;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {

            // basic client-side validation (allow blanks where not required)
            const errors = validate();
            if (errors.length) {
                setMessage(errors.join(', ')); // keep user-friendly for now
                setLoading(false);
                return;
            }
            // normalize shipping if useBilling (if applicable)            
            const isEditMode = selectedBranch.includes('Change');
            // Determine app namespace; if __app_id isn't defined, we fall back to "default-app-id"
            // This is IMPORTANT for finding the record in Firestore console.
            // If you don't see your record, check this path first.
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const collectionPath = `artifacts/${appId}/tenants/${tenantId}/${collectionName}`; // e.g., artifacts/default-app-id/tenants/<tenantId>/customers
            if (DEBUG_FIRESTORE) {
              console.log('[DataEntryForm] collectionPath:', collectionPath); // <-- helps you locate the document in Firestore
            }            
            // Encrypt any sensitive fields before save (stubbed)
            const secured = await encryptIfSensitive(formData);
            const dataToSave = {
                ...secured,
                tenantId,
                updatedAt: new Date(),
            };

            if (isEditMode) {
                if (initialData && initialData.id) {
                    const docRef = doc(db, collectionPath, initialData.id);
                    await updateDoc(docRef, dataToSave);
                    if (DEBUG_FIRESTORE) {
                        console.log('[DataEntryForm] updated doc id:', initialData.id);
                    }
                    setMessage(`${selectedBranch.replace('Change ', '')} updated successfully! (id: ${initialData.id})`);
                }
            } else {
                    const docRef = await addDoc(collection(db, collectionPath), dataToSave);
                    if (DEBUG_FIRESTORE) {
                        console.log('[DataEntryForm] created doc id:', docRef.id);
                    }
                    setFormData({});
                    setMessage(`${selectedBranch.replace('Add ', '')} added successfully! (id: ${docRef.id})\nPath: ${collectionPath}`);
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

    // const getFormTitle = () => {
    //     return selectedBranch;
    // };

    const getFormTitle = () => selectedBranch;

    // Minimal client-side validation (email/phone/required). We keep it gentle and allow blanks when specified.
    const validate = () => {
        const errors = [];
        for (const f of schemaFields) {
            const v = getByPath(formData, f.path);
            if (f.required && (v === '' || v == null)) errors.push(`${f.label} is required`);
            if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors.push('Invalid email');
            //                                  ^^^^^^^  FIX: add '+' quantifiers to email regex
           if (f.type === 'tel' && v && !/^[+()0-9\-\s]{7,}$/.test(v)) errors.push('Invalid phone');
            // number/date fields are handled by inputs themselves
        }
        return errors;
    };

    // Hook for field-level encryption for fields marked {sensitive:true}.
    // IMPORTANT: This is a stub – use server-provided keys in production (do NOT hardcode secrets in client).
    const encryptIfSensitive = async (dataObj) => {
        const clone = structuredClone ? structuredClone(dataObj) : JSON.parse(JSON.stringify(dataObj));
        for (const f of schemaFields) {
            if (!f.sensitive) continue;
            const current = getByPath(clone, f.path);
            if (!current) continue;
            // TODO: replace with real crypto; for now, mark with prefix to make migration explicit later.
            const ciphertext = `enc::${current}`; // placeholder; swap with WebCrypto + tenant-scoped key later
            setByPath(clone, f.path, ciphertext);
        }
        return clone;
    };


    return (
        <div className="p-6 bg-white rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{getFormTitle()}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {schemaFields.map(field => {
                    const { path, type, label, enum: options, allowBlank } = field;
                    const placeholder = label || path.split('.').slice(-1)[0].replace(/([A-Z])/g, ' $1').trim();
                    const isSelect = type === 'select';
                    const isCheckbox = type === 'checkbox';

                    return (
                        <div key={path}>
                            <label htmlFor={path} className="block text-sm font-medium text-gray-700 mb-1">
                                {placeholder}
                            </label>
                            {isSelect ? (
                                <select
                                    id={path}
                                    name={path}
                                    value={getByPath(formData, path) ?? ''}
                                    onChange={(e) => handleChange(path, e.target.value || '')}
                                    className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                    {allowBlank && <option value="">{'' /* allow blank by default */}</option>}
                                    {(options || []).map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            ) : isCheckbox ? (
                                <input
                                    id={path}
                                    name={path}
                                    type="checkbox"
                                    checked={!!getByPath(formData, path)}
                                    onChange={() => handleCheckboxChange(path)}
                                    className="h-4 w-4"
                                />
                            ) : type === 'date' ? (
                                <DatePicker
                                    id={path}
                                    selected={getByPath(formData, path) || null}
                                    onChange={(date) => handleChange(path, date)}
                                    className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            ) : type === 'textarea' ? (
                                <textarea
                                    id={path}
                                    name={path}
                                    value={getByPath(formData, path) ?? ''}
                                    onChange={(e) => handleChange(path, e.target.value)}
                                    className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    rows={4}
                                />
                            ) : (
                                <input
                                    id={path}
                                    name={path}
                                    type={type}
                                    value={getByPath(formData, path) ?? ''}
                                    onChange={(e) => handleChange(path, e.target.value)}
                                    required={false /* we validate manually to allow blank selects */}
                                    className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            )}
                        </div>
                    );



                })}
                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={onCancel}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} />
                        <span>Cancel</span>
                    </button>
                    <button
                        type="submit"
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
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


// ─────────────────────────────────────────────────────────────────────────────
// NOTE: handleSubmit lives above (elided in this diff view). It should:
//  1) run `validate()`; 
//  2) normalize shipping if useBilling; 
//  3) await encryptIfSensitive(formData);
//  4) write to: artifacts/{__app_id}/tenants/{tenantId}/{collectionName}; 
//  5) include { tenantId, updatedAt }.
// This preserves tenant isolation and allows future RBAC/ABAC at the rules layer.
// ─────────────────────────────────────────────────────────────────────────────

