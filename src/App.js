/* App.js */
// Ignite business data manager UI using Firebase and React


import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    onSnapshot,
    query
} from 'firebase/firestore';
import {
    Download,
    ChevronDown, ChevronRight, Home, Plus, Edit, Trash2, Briefcase, Users, Warehouse, Banknote, Brain, X, Menu, List
} from 'lucide-react';

import firebaseConfig from './FirebaseConfig';                     // ✅ This imports your config safely
import { serverTimestamp, Timestamp } from 'firebase/firestore';   // ✅ Import serverTimestamp for automatic timestamps


// Helper function to safely render Firebase values (especially Timestamps)
const renderValue = (value, key) => {
    if (value && typeof value === 'object') {
        if (typeof value.toDate === 'function') {
            // ✅ Format differently for hireDate vs other timestamps
            const dateObj = value.toDate();
            if (key && key.toLowerCase().includes('hiredate')) {
                return dateObj.toLocaleDateString(); // only date
            }
            return dateObj.toLocaleString(); // date + time
        }
        return JSON.stringify(value);
    }
    // For primitives like string, number, boolean
    return String(value);
};


const appId = 'ignite-appv2-data';
const initialAuthToken = null;

// Sidebar text color (default is too dark for you)
// Example: '#ffffff' for white, '#f0f0f0' for light gray
const SIDEBAR_TEXT_COLOR = '#ffffff';

// ✅ Set to true to enable logs globally
const ENABLE_LOGGING = true;

// ✅ Only log from these components (leave array empty [] to log all)
const LOG_COMPONENTS = ['ListDataView', 'DataEntryForm', 'FirebaseProvider'];

const log = (component, message, ...args) => {
    if (ENABLE_LOGGING && (LOG_COMPONENTS.length === 0 || LOG_COMPONENTS.includes(component))) {
        console.log(`[${component}] ${message}`, ...args);
    }
};

const FirebaseContext = createContext(null);
const useFirebase = () => useContext(FirebaseContext);

const FirebaseProvider = ({ children }) => {
    log('FirebaseProvider`, `component is rendering.');

    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        log('FirebaseProvider`, `useEffect in FirebaseProvider is running.');
        const initializeFirebase = async () => {
            try {
                log('FirebaseProvider`, `Initializing Firebase app...');
                const app = initializeApp(firebaseConfig);

                const authInstance = getAuth(app);
                const dbInstance = getFirestore(app);

                setAuth(authInstance);
                setDb(dbInstance);
                log('FirebaseProvider`, `Firebase services (Auth, Firestore) have been set.');

                log('FirebaseProvider`, `Attempting authentication...');
                if (initialAuthToken) {
                    await signInWithCustomToken(authInstance, initialAuthToken);
                    log('FirebaseProvider`, `Signed in with custom token.');
                } else {
                    await signInAnonymously(authInstance);
                    log('FirebaseProvider`, `Signed in anonymously.');
                }

                const unsubscribe = onAuthStateChanged(authInstance, (user) => {
                    log(`FirebaseProvider`, `Auth state changed. User: ${user ? user.uid : 'null'}`);
                    setCurrentUser(user || null);
                    setLoadingAuth(false);
                    log('FirebaseProvider`, `Authentication is complete. loadingAuth set to false.');
                });

                return () => {
                    log('FirebaseProvider cleanup: unsubscribing from auth state changes.');
                    unsubscribe();
                };
            } catch (error) {
                log('Firebase initialization failed!', error);
                setLoadingAuth(false);
            }
        };
        initializeFirebase();
    }, []);

    const userId = currentUser?.uid || 'anonymous';
    log(`Rendering FirebaseProvider with userId: ${userId}, db_is_ready: ${!!db}, loadingAuth: ${loadingAuth}`);

    return (
        <FirebaseContext.Provider value={{ db, auth, currentUser, userId, loadingAuth }}>
            {children}
        </FirebaseContext.Provider>
    );
};

const ListDataView = ({ branch }) => {
    const { db, userId, loadingAuth } = useFirebase();

    log(`ListDataView is rendering for branch: ${branch}. db_ready: ${!!db}, userId_ready: ${!!userId}, loadingAuth: ${loadingAuth}`);

    const [data, setData] = useState([]);
    const [sortKey, setSortKey] = useState('');
    const [sortAsc, setSortAsc] = useState(true);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        log('useEffect in ListDataView is running.');
        const fetchData = async () => {
            log(`fetchData called. db_ready: ${!!db}, userId: ${userId}, loadingAuth: ${loadingAuth}`);

            // This is the key check to prevent the error
            if (!db || !userId || loadingAuth) {
                log('fetchData aborted: Firebase services not ready.');
                return;
            }

            try {
                log(`Fetching data for path: artifacts/${appId}/users/${userId}/${branch}`);
                const q = query(collection(db, `artifacts/${appId}/users/${userId}/${branch}`));
                
                // Use onSnapshot for real-time updates
                const unsubscribe = onSnapshot(q, (querySnapshot) => {
                    const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setData(items);
                    log(`Successfully fetched ${items.length} items with onSnapshot.`);
                }, (error) => {
                    log('Error fetching data:', error);
                });

                // Return the unsubscribe function for cleanup
                return unsubscribe;
            } catch (error) {
                log('Error setting up onSnapshot listener:', error);
            }
        };
        fetchData();
    }, [db, userId, branch, loadingAuth]);

    const handleDelete = async (id) => {
        log(`handleDelete called for item ID: ${id}`);
        if (!db) {
            log('handleDelete aborted: db not ready.');
            return;
        }

        try {
            log(`Deleting document at path: artifacts/${appId}/users/${userId}/${branch}/${id}`);
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/${branch}/${id}`));
            // The onSnapshot listener will automatically update the state, no need to manually filter
            log('Document deleted successfully.');
        } catch (error) {
            log('Error deleting document:', error);
        }
    };

    const handleSaveEdit = async () => {
        log('handleSaveEdit called.');
        if (!db || !editingItem) {
            log('handleSaveEdit aborted: db or editingItem not ready.');
            return;
        }

        try {
            const { id, ...updatedFields } = editingItem;
            log(`Saving new document for branch: ${branch} with data:`, updatedFields);
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/${branch}`), updatedFields);
            setEditingItem(null);
            log('Document saved successfully.');
        } catch (error) {
            log('Error saving document:', error);
        }
    };

    const handleExportCSV = () => {
        log('handleExportCSV called.');
        const headers = data.length > 0 ? Object.keys(data[0]) : [];
        const csv = [headers.join(',')].concat(
            data.map(row => headers.map(field => JSON.stringify(row[field] ?? '')).join(','))
        ).join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${branch.toLowerCase()}_data.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const sortedData = [...data].sort((a, b) => {
        if (!sortKey) return 0;
        const aVal = a[sortKey]?.toString().toLowerCase() || '';
        const bVal = b[sortKey]?.toString().toLowerCase() || '';
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    const headers = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'id') : [];

    if (loadingAuth || !db || !userId) {
     //   log('ListDataView', `is rendering the loading message for: ${branch}...');
        return <div className="p-4 text-center text-gray-500">Loading...</div>;
    }

   // log('ListDataView is rendering the main table.');
    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{branch} Records</h2>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            {headers.map(header => (
                                <th
                                    key={header}
                                    className="p-2 text-left cursor-pointer"
                                    onClick={() => {
                                        setSortKey(header);
                                        setSortAsc(prev => sortKey === header ? !prev : true);
                                    }}
                                >
                                    {header} {sortKey === header ? (sortAsc ? '▲' : '▼') : ''}
                                </th>
                            ))}
                            <th className="p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.map(item => (
                            <tr key={item.id} className="border-t">
                                {headers.map(key => (
                                    <td key={key} className="p-2">
                                        {editingItem?.id === item.id ? (
                                            <input
                                                type="text"
                                                value={editingItem[key] || ''}
                                                onChange={e => setEditingItem(prev => ({ ...prev, [key]: e.target.value }))}
                                                className="border px-1 rounded"
                                            />
                                        ) : (
                                            renderValue(item[key], key)
                                        )}
                                    </td>
                                ))}
                                <td className="p-2 space-x-2">
                                    {editingItem?.id === item.id ? (
                                        <>
                                            <button onClick={handleSaveEdit} className="text-green-600 hover:underline">Save</button>
                                            <button onClick={() => setEditingItem(null)} className="text-gray-600 hover:underline">Cancel</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => setEditingItem(item)} className="text-blue-600 hover:underline">Edit</button>
                                            <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline">Delete</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Data Entry Form Component
const DataEntryForm = ({ selectedBranch, selectedSubBranch }) => {
    const { db, userId, loadingAuth } = useFirebase();
    const [formData, setFormData] = useState({});
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    // Clear form data when branch/sub-branch changes
    useEffect(() => {
        setFormData({});
        setMessage('');
    }, [selectedBranch, selectedSubBranch]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const getFormFields = () => {
        // Define fields based on the selected branch and sub-branch
        const fields = {
            'Customers': {
                'Add Customer': ['customerName', 'contactPerson', 'email', 'phone'],
                'Change Customer': ['customerId', 'customerName', 'contactPerson', 'email', 'phone'],
                'Delete Customer': ['customerId'],
            },
            'Vendors': {
                'Add Vendor': ['vendorName', 'contactPerson', 'email', 'phone'],
                'Change Vendor': ['vendorId', 'vendorName', 'contactPerson', 'email', 'phone'],
                'Delete Vendor': ['vendorId'],
            },
            'Inventory': {
                'Add Inventory': ['itemName', 'quantity', 'cost', 'supplier'],
                'Change Inventory': ['itemId', 'itemName', 'quantity', 'cost', 'supplier'],
                'Delete Inventory': ['itemId'],
            },
            'Banking': {
                'Add Transaction': ['description', 'amount', 'date', 'type'],
                'Change Transaction': ['transactionId', 'description', 'amount', 'date', 'type'],
                'Delete Transaction': ['transactionId'],
            },
            'Company': {
                'Add Company Info': ['companyName', 'address', 'taxId'],
                'Change Company Info': ['companyId', 'companyName', 'address', 'taxId'],
                'Delete Company Info': ['companyId'],
            },
            'Employees': {
                'Add Employee': ['employeeName', 'position', 'hireDate', 'salary'],
                'Change Employee': ['employeeId', 'employeeName', 'position', 'hireDate', 'salary'],
                'Delete Employee': ['employeeId'],
            },
        };

        return fields[selectedBranch]?.[selectedSubBranch] || [];
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loadingAuth || !db) {
            setMessage({ text: 'Authentication not ready. Please wait.', type: 'error' });
            return;
        }

        try {
            // Determine the collection path based on whether it's public or private data
            const collectionPath = `/artifacts/${appId}/users/${userId}/${selectedBranch}`;

            const docData = {
                ...formData,
                subBranch: selectedSubBranch,
                createdAt: serverTimestamp(), // ✅ automatic server date/time

                
            };

        // If hireDate is a date string (from the date picker), convert it to Firestore Timestamp
            if (formData.hireDate) {
                docData.hireDate = Timestamp.fromDate(new Date(formData.hireDate));
            }

            // Add the document to the Firestore collection
          // log('Adding document to collection: ${collectionPath}`, docData);

            await addDoc(collection(db, collectionPath), docData);

            setMessage({ text: `Successfully saved ${selectedSubBranch} data!`, type: 'success' });
            setFormData({}); // Reset the form after successful submission

        } catch (error) {
            console.error("Error adding document: ", error);
            setMessage({ text: `Error saving data: ${error.message}`, type: 'error' });
        }
    };

    const formFields = getFormFields();
    if (formFields.length === 0) {
        return (
            <div className="text-center p-10 text-gray-700">
                <h2 className="text-2xl font-bold mb-4">Select an action</h2>
                <p>Please select an option from the tree on the left to begin data entry.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Data Entry: {selectedSubBranch}</h2>
            {message && (
                <div className={`p-4 rounded-lg text-white ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {message.text}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                {formFields.map(field => (
                    <div key={field} className="flex flex-col">
                        <label htmlFor={field} className="text-sm font-medium text-gray-700 capitalize">
                            {field.replace(/([A-Z])/g, ' $1').trim()}:
                        </label>
                        <input
                            type={field.toLowerCase().includes('date') ? 'date' : 'text'}  // ✅ date picker for date fields
                            id={field}
                            name={field}
                            value={
                                 formData[field] ||
                                  (field.toLowerCase().includes('date') ? new Date().toISOString().split('T')[0] : '')
                            }
                            onChange={handleInputChange}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                        />
                    </div>
                ))}
                <button
                    type="submit"
                    className="w-full px-4 py-2 mt-4 text-lg font-semibold text-white bg-purple-600 rounded-md shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200"
                >
                    Save
                </button>
            </form>
        </div>
    );
};


// AI Data Analysis Component
const AIDataAnalysis = () => {
    const { db, userId, loadingAuth } = useFirebase();
    const [analysisResult, setAnalysisResult] = useState('');
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [message, setMessage] = useState('');

    const runAnalysis = async () => {
        if (loadingAuth || !db) {
            setMessage('Authentication not ready. Please wait.');
            return;
        }

        setLoadingAnalysis(true);
        setAnalysisResult('');
        setMessage('');

        try {
            // Fetch all data from all collections for the current user
            const collectionsToAnalyze = ['Customers', 'Vendors', 'Inventory', 'Banking', 'Company', 'Employees'];
            let allData = {};

            for (const collectionName of collectionsToAnalyze) {
                const q = query(collection(db, `/artifacts/${appId}/users/${userId}/${collectionName}`));
                const snapshot = await new Promise((resolve) => {
                    const unsubscribe = onSnapshot(q, (snapshot) => {
                        unsubscribe(); // Unsubscribe after the first fetch
                        resolve(snapshot);
                    }, (error) => {
                        console.error("Error fetching data for AI analysis:", error);
                        setMessage(`Error fetching data for AI analysis: ${error.message}`);
                        resolve(null); // Resolve with null on error to avoid hanging
                    });
                });

                if (snapshot) {
                    allData[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                }
            }

            const dataToAnalyze = JSON.stringify(allData, null, 2);

            if (dataToAnalyze.length < 50) {
                setAnalysisResult('No significant data to analyze. Please add some business data first.');
                setLoadingAnalysis(false);
                return;
            }

            const prompt = `Analyze the following JSON business data for key trends, anomalies, and insights. Provide a concise, professional summary.

            Business Data:
            ${dataToAnalyze}`;

            const chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: prompt }] });
            const payload = { contents: chatHistory };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                setAnalysisResult(text);
            } else {
                setAnalysisResult('An error occurred during AI analysis. Please try again.');
            }

        } catch (error) {
            console.error("Error during AI analysis:", error);
            setAnalysisResult(`An error occurred: ${error.message}`);
        } finally {
            setLoadingAnalysis(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">AI/ML Data Analysis</h2>
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                <button
                    onClick={runAnalysis}
                    disabled={loadingAnalysis || loadingAuth}
                    className="w-full md:w-auto px-6 py-3 text-lg font-semibold text-white bg-purple-600 rounded-md shadow-md hover:bg-purple-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200"
                >
                    {loadingAnalysis ? 'Analyzing...' : 'Run AI Analysis'}
                </button>
            </div>
            {message && (
                <div className="p-4 rounded-lg text-white bg-red-500">{message}</div>
            )}
            <div className="mt-6 p-6 bg-gray-50 rounded-lg shadow-inner min-h-[200px] whitespace-pre-wrap font-mono text-sm text-gray-800">
                {analysisResult || "Click 'Run AI Analysis' to get insights on your business data."}
            </div>
        </div>
    );
};


const App = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [openBranches, setOpenBranches] = useState({ Customers: true });
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [selectedSubBranch, setSelectedSubBranch] = useState(null);
    const [currentView, setCurrentView] = useState('home');

    const { userId, loadingAuth } = useFirebase();

    const treeData = [
        {
            name: 'Customers', icon: Users, subBranches: [
                { name: 'List Customers', icon: List, type: 'list' },
                { name: 'Add Customer', icon: Plus, type: 'dataEntry' },
                { name: 'Change Customer', icon: Edit, type: 'dataEntry' },
                { name: 'Delete Customer', icon: Trash2, type: 'dataEntry' },
            ]
        },
        {
            name: 'Vendors', icon: Briefcase, subBranches: [
                { name: 'List Vendors', icon: List, type: 'list' },
                { name: 'Add Vendor', icon: Plus, type: 'dataEntry' },
                { name: 'Change Vendor', icon: Edit, type: 'dataEntry' },
                { name: 'Delete Vendor', icon: Trash2, type: 'dataEntry' },
            ]
        },
        {
            name: 'Inventory', icon: Warehouse, subBranches: [
                { name: 'List Inventory', icon: List, type: 'list' },
                { name: 'Add Inventory', icon: Plus, type: 'dataEntry' },
                { name: 'Change Inventory', icon: Edit, type: 'dataEntry' },
                { name: 'Delete Inventory', icon: Trash2, type: 'dataEntry' },
            ]
        },
        {
            name: 'Banking', icon: Banknote, subBranches: [
                { name: 'List Transactions', icon: List, type: 'list' },
                { name: 'Add Transaction', icon: Plus, type: 'dataEntry' },
                { name: 'Change Transaction', icon: Edit, type: 'dataEntry' },
                { name: 'Delete Transaction', icon: Trash2, type: 'dataEntry' },
            ]
        },
        {
            name: 'Company', icon: Briefcase, subBranches: [
                { name: 'List Company Info', icon: List, type: 'list' },
                { name: 'Add Company Info', icon: Plus, type: 'dataEntry' },
                { name: 'Change Company Info', icon: Edit, type: 'dataEntry' },
                { name: 'Delete Company Info', icon: Trash2, type: 'dataEntry' },
            ]
        },
        {
            name: 'Employees', icon: Users, subBranches: [
                { name: 'List Employees', icon: List, type: 'list' },
                { name: 'Add Employee', icon: Plus, type: 'dataEntry' },
                { name: 'Change Employee', icon: Edit, type: 'dataEntry' },
                { name: 'Delete Employee', icon: Trash2, type: 'dataEntry' },
            ]
        },
    ];

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const toggleBranch = (branchName) => {
        setOpenBranches(prev => ({ ...prev, [branchName]: !prev[branchName] }));
    };

    const handleSubBranchClick = (branchName, subBranch) => {
        setSelectedBranch(branchName);
        setSelectedSubBranch(subBranch.name);
        if (subBranch.type === 'list') {
            setCurrentView('listings');
        } else {
            setCurrentView('dataEntry');
        }
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };


    const renderTreeView = () => {
        return (
            <nav className="space-y-2">
                <button
                    onClick={() => { setCurrentView('home'); setSelectedBranch(null); setSelectedSubBranch(null); }}
                    className="flex items-center w-full px-4 py-2 text-sm font-medium text-purple-800 bg-purple-100 rounded-lg hover:bg-purple-200 transition duration-150"
                >
                    <Home size={18} className="mr-3" />
                    Home
                </button>
                {treeData.map(branch => (
                    <div key={branch.name}>
                        <button
                            onClick={() => toggleBranch(branch.name)}
                            style={{ color: SIDEBAR_TEXT_COLOR }}
                            className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 transition duration-150"
                        >
                            <div className="flex items-center">
                                {React.createElement(branch.icon, { size: 18, className: "mr-3" })}
                                {branch.name}
                            </div>
                            {openBranches[branch.name] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        {openBranches[branch.name] && (
                            <ul className="pl-8 mt-1 space-y-1">
                                {branch.subBranches.map(subBranch => (
                                    <li key={subBranch.name}>
                                        <button
                                            onClick={() => handleSubBranchClick(branch.name, subBranch)}
                                            className={`flex items-center w-full p-2 text-sm text-gray-600 rounded-lg hover:bg-gray-200 transition duration-150
                                            ${selectedBranch === branch.name && selectedSubBranch === subBranch.name ? 'bg-gray-200 font-semibold' : ''}`}
                                        >
                                            {React.createElement(subBranch.icon, { size: 16, className: "mr-2" })}
                                            {subBranch.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </nav>
        );
    };

    return (
        <div className="font-sans antialiased text-gray-900 bg-gray-50 min-h-screen flex flex-col">
            <style>
                {`
                    @import url('https://rsms.me/inter/inter.css');
                    body { font-family: 'Inter', sans-serif; }
                `}
            </style>

            <header className="flex items-center justify-between p-4 bg-white shadow-md z-10 md:hidden">
                <div className="flex items-center space-x-2">
                    <img src="https://placehold.co/40x40/6b46c1/ffffff?text=I" alt="Ignite Logo" className="rounded-full" />
                    <h1 className="text-xl font-bold text-purple-600">Ignite</h1>
                </div>
                <button onClick={toggleSidebar} className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            <div className="flex flex-1">
                {/* Left Panel - Sidebar */}
                <aside className={`fixed inset-y-0 left-0 z-20 w-64 bg-gray-800 text-gray-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="p-6 h-full flex flex-col">
                        <div className="flex items-center space-x-3 mb-8">
                            <img src="https://placehold.co/40x40/6b46c1/ffffff?text=I" alt="Ignite Logo" className="rounded-full" />
                            <h1 className="text-2xl font-bold text-purple-300">Ignite</h1>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2">
                            {renderTreeView()}
                        </div>
                        <div className="mt-8 pt-4 border-t border-gray-700 space-y-4">
                            <div className="p-2 text-sm text-gray-400 border-l-4 border-purple-500 bg-gray-700 rounded-r-md">
                                <p>User ID:</p>
                                <p className="font-mono text-xs break-all mt-1">{userId}</p>
                            </div>
                            <button
                                onClick={() => { setCurrentView('aiAnalysis'); setIsSidebarOpen(false); }}
                                className="flex items-center justify-center w-full px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg shadow-md hover:bg-purple-700 transition duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                            >
                                <Brain size={18} className="mr-2" />
                                AI/ML Analysis
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Right Panel - Main Content */}
                <main className="flex-1 p-4 md:p-8 overflow-auto">
                    <div className="bg-white rounded-xl shadow-lg h-full p-6">
                        {loadingAuth ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="ml-4 text-xl">Loading Ignite...</span>
                            </div>
                        ) : (
                            <>
                                {currentView === 'home' && (
                                    <div className="text-center p-10 text-gray-700">
                                        <h2 className="text-3xl font-bold mb-4">Welcome to Ignite!</h2>
                                        <p className="text-lg">Use the navigation tree on the left to manage your business data.</p>
                                        <p className="mt-2 text-md">Click <span className="font-semibold">"AI/ML Analysis"</span> to explore data insights.</p>
                                    </div>
                                )}
                                {currentView === 'dataEntry' && (
                                    <DataEntryForm
                                        selectedBranch={selectedBranch}
                                        selectedSubBranch={selectedSubBranch}
                                    />
                                )}
                                {currentView === 'aiAnalysis' && (
                                    <AIDataAnalysis />
                                )}
                                {currentView === 'listings' && (
                                    <ListDataView branch={selectedBranch} />
                                )}
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

// Wrap the App with FirebaseProvider
const WrappedApp = () => (
    <FirebaseProvider>
        <App />
    </FirebaseProvider>
);


export default WrappedApp;

export { FirebaseProvider, ListDataView };
// AppWrapper.js
// Steve this is a wrapper component for the FirebaseProvider.  