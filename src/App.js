/* App.js */
// Ignite business data manager UI using Firebase and React


import React, { useState, useEffect, useContext } from 'react';
import { signOut } from "firebase/auth"; // <<-- INSERT THIS LINE
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    setDoc, // ✅ Correctly import setDoc
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import {
    Download,
    ChevronDown, ChevronRight, Home, Plus, Edit, Trash2, Briefcase, Users, Warehouse, Banknote, Brain, X, Menu, List
} from 'lucide-react';
import LogoutButton from './LogoutButton';
import { FirebaseContext } from './AppWrapper';


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
        return JSON.stringify(value); // Fallback for other objects
    }
    return value;
};


// -----------------------------------------------------------------------------
// Component for adding/editing data
// -----------------------------------------------------------------------------
const DataEntryForm = ({ selectedBranch, selectedSubBranch, editingItem, setEditingItem }) => {
    const { tenantId, db } = useContext(FirebaseContext);
    const [formData, setFormData] = useState({});

    // Reset form when branch or sub-branch changes
    useEffect(() => {
        setFormData({});
    }, [selectedBranch, selectedSubBranch]);

    // Populate form if an item is being edited
    useEffect(() => {
        if (editingItem) {
            const initialData = {};
            // Flatten the editing item's data into the form state
            Object.keys(editingItem).forEach(key => {
                const value = editingItem[key];
                if (value && typeof value === 'object' && typeof value.toDate === 'function') {
                    // Format Firestore Timestamps to YYYY-MM-DD for date inputs
                    initialData[key] = value.toDate().toISOString().substring(0, 10);
                } else {
                    initialData[key] = value;
                }
            });
            setFormData(initialData);
        } else {
            setFormData({});
        }
    }, [editingItem]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBranch || !selectedSubBranch) {
            console.error("No branch or sub-branch selected for data entry.");
            return;
        }

        const dataToSave = { ...formData, timestamp: serverTimestamp() };
        const path = `artifacts/ignite/tenants/${tenantId}/${selectedBranch}`;

        try {
            if (editingItem) {
                // Update existing document
                const itemRef = doc(db, path, editingItem.id);
                await setDoc(itemRef, dataToSave, { merge: true }); // merge: true to avoid overwriting all fields
                alert('Document updated successfully!');
            } else {
                // Add new document
                await addDoc(collection(db, path), dataToSave);
                alert('Document added successfully!');
            }
            // Clear the form and stop editing
            setFormData({});
            setEditingItem(null);
        } catch (e) {
            console.error("Error adding/updating document: ", e);
            alert(`Error adding/updating document: ${e.message}`);
        }
    };

    const getFormFields = () => {
        const fields = {
            Customers: ['name', 'email', 'phone', 'address'],
            Vendors: ['name', 'contactName', 'email', 'phone', 'address'],
            Inventory: ['productName', 'sku', 'quantity', 'price'],
            Employees: ['firstName', 'lastName', 'hireDate', 'position', 'salary']
        };
        // Fallback to a single generic field if the branch is unknown
        return fields[selectedSubBranch] || ['genericField'];
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-blue-600">{editingItem ? 'Edit Item' : `Add a New ${selectedSubBranch}`}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                {getFormFields().map((field) => (
                    <div key={field}>
                        <label htmlFor={field} className="block text-gray-700 capitalize mb-1">
                            {field.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <input
                            type={field.toLowerCase().includes('date') ? 'date' : 'text'}
                            id={field}
                            name={field}
                            value={formData[field] || ''}
                            onChange={handleChange}
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                ))}
                <div className="flex items-center space-x-4">
                    <button
                        type="submit"
                        className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                    >
                        {editingItem ? 'Update Item' : 'Add Item'}
                    </button>
                    {editingItem && (
                        <button
                            type="button"
                            onClick={() => setEditingItem(null)}
                            className="bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg hover:bg-gray-400 transition-colors"
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};


// -----------------------------------------------------------------------------
// Component for listing and viewing data
// -----------------------------------------------------------------------------
const ListDataView = ({ branch }) => {
    const { tenantId, db } = useContext(FirebaseContext);
    const [data, setData] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
    const [sortKey, setSortKey] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    const path = `artifacts/ignite/tenants/${tenantId}/${branch}`;

    useEffect(() => {
        if (!tenantId || !branch || !db) return;

        // Use onSnapshot for real-time updates
        const q = query(collection(db, path));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const items = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            setData(items);
        }, (error) => {
            console.error("Error fetching data: ", error);
        });

        // Cleanup function for the listener
        return () => unsubscribe();
    }, [tenantId, branch, db, path]);

    const handleEdit = (item) => {
        setEditingItem(item);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this item?")) {
            try {
                await deleteDoc(doc(db, path, id));
                alert('Document successfully deleted!');
            } catch (e) {
                console.error("Error deleting document: ", e);
                alert(`Error deleting document: ${e.message}`);
            }
        }
    };

    const getTableHeaders = (items) => {
        if (items.length === 0) return [];
        // Get all unique keys from all items and remove the 'id' field
        const allKeys = new Set();
        items.forEach(item => {
            Object.keys(item).forEach(key => {
                if (key !== 'id') {
                    allKeys.add(key);
                }
            });
        });
        return Array.from(allKeys).sort();
    };

    const headers = getTableHeaders(data);

    const sortedData = React.useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const aValue = a[sortKey];
            const bValue = b[sortKey];

            if (aValue === undefined || bValue === undefined) {
                return 0; // Don't sort if a value is missing
            }

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            }

            if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
                return sortDirection === 'asc' ? aValue.toMillis() - bValue.toMillis() : bValue.toMillis() - aValue.toMillis();
            }

            return 0; // Fallback for other types
        });
    }, [data, sortKey, sortDirection]);

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };


    return (
        <div className="p-6 bg-white rounded-lg shadow-lg overflow-x-auto">
            {editingItem && (
                <div className="mb-6">
                    <DataEntryForm
                        selectedBranch={branch}
                        selectedSubBranch={branch}
                        editingItem={editingItem}
                        setEditingItem={setEditingItem}
                    />
                </div>
            )}
            <h2 className="text-2xl font-bold mb-4 text-blue-600">All {branch} Data</h2>
            {data.length === 0 ? (
                <p className="text-gray-500">No data found in this collection.</p>
            ) : (
                <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                        <tr>
                            {headers.map((header) => (
                                <th
                                    key={header}
                                    onClick={() => handleSort(header)}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center">
                                        {header.replace(/([A-Z])/g, ' $1').trim()}
                                        {sortKey === header && (
                                            <span className="ml-2">
                                                {sortDirection === 'asc' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedData.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                {headers.map((header) => (
                                    <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {renderValue(item[header], header)}
                                    </td>
                                ))}
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="text-blue-600 hover:text-blue-900 transition-colors"
                                            title="Edit"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-red-600 hover:text-red-900 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};


// -----------------------------------------------------------------------------
// Component for AI/ML analysis
// -----------------------------------------------------------------------------
const AIDataAnalysis = () => {
    const { tenantId } = useContext(FirebaseContext); // db is not used here, so we don't destructure it
    const [analysisPrompt, setAnalysisPrompt] = useState('');
    const [analysisResult, setAnalysisResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    const handleAnalysisRequest = async () => {
        setLoading(true);
        setErrorMessage(null);
        setAnalysisResult('');
        try {
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            const chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: `Analyze the user's data and respond to this query: ${analysisPrompt}` }] });
            const payload = { contents: chatHistory };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis result found.";

            setAnalysisResult(text);
        } catch (error) {
            console.error("AI Analysis failed:", error);
            setErrorMessage(`Failed to perform analysis: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg space-y-4">
            <h2 className="text-2xl font-bold text-green-600">AI/ML Analysis</h2>
            <p className="text-gray-700">
                Enter your query below to get insights from your business data.
            </p>
            <textarea
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                rows="4"
                placeholder="e.g., 'Summarize sales trends for the last quarter' or 'Identify the top 5 best-selling products.'"
                value={analysisPrompt}
                onChange={(e) => setAnalysisPrompt(e.target.value)}
            ></textarea>
            <button
                onClick={handleAnalysisRequest}
                disabled={loading}
                className="bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors shadow-md disabled:bg-green-400"
            >
                {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
            {errorMessage && (
                <div className="bg-red-100 text-red-600 p-3 rounded-lg">
                    <p>{errorMessage}</p>
                </div>
            )}
            {analysisResult && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Analysis Result:</h3>
                    <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-gray-700 whitespace-pre-wrap">
                        {analysisResult}
                    </pre>
                </div>
            )}
        </div>
    );
};


// -----------------------------------------------------------------------------
// The main App component
// -----------------------------------------------------------------------------
const App = () => {
    const { user, loading, auth } = useContext(FirebaseContext);        

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentView, setCurrentView] = useState('home');
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [selectedSubBranch, setSelectedSubBranch] = useState(null);
    const [expandedBranches, setExpandedBranches] = useState({});

    // The main navigation data structure
    const navigationTree = {
        'Data Entry': [
            'Customers',
            'Vendors',
            'Inventory',
            'Employees'
        ],
        // You can add more top-level branches here if needed
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const handleNavigationClick = (view, subBranch = null) => {
        setCurrentView(view);
        setSelectedSubBranch(subBranch);

        if (subBranch) {
            // If a sub-branch is selected, go to the appropriate view
            if (subBranch.includes('Add')) {
                setCurrentView('dataEntry');
            } else if (subBranch.includes('List')) {
                setCurrentView('listings');
            } else {
                setCurrentView('home'); // Fallback
            }
        } else {
            // For top-level branch clicks, just set the branch and expand/collapse
            setExpandedBranches(prev => ({
                ...prev,
            //    [branch]: !prev[branch]
            }));
            setCurrentView('home');
        }
        setSidebarOpen(false);
    };

    const getBranchIcon = (branch) => {
        const icons = {
            'Data Entry': <Briefcase size={20} />,
            'Customers': <Users size={20} />,
            'Vendors': <Banknote size={20} />,
            'Inventory': <Warehouse size={20} />,
            'Employees': <Users size={20} />,
            'AI/ML Analysis': <Brain size={20} />
        };
        return icons[branch] || <List size={20} />;
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-100"><div className="text-lg font-semibold">Loading...</div></div>;
    }

    // Check if the user is logged in
    if (!user) {
        // Render a login component here if needed, but AppWrapper already handles this
        // This is a failsafe in case the user state is not propagated yet
        return <div className="flex items-center justify-center min-h-screen">Authentication required.</div>;
    }

    return (
        <div className="flex min-h-screen bg-gray-100 text-gray-800 font-sans">
            {/* Mobile Header (visible on small screens) */}
            <header className="lg:hidden fixed top-0 left-0 w-full bg-white shadow p-4 z-50 flex justify-between items-center">
                <button onClick={() => setSidebarOpen(true)} className="text-blue-600">
                    <Menu size={24} />
                </button>
                <h1 className="text-xl font-bold text-blue-600">Ignite</h1>
                <LogoutButton />
            </header>

            {/* Sidebar (desktop and mobile) */}
            <div
                className={`fixed top-0 left-0 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 lg:relative lg:translate-x-0 w-64 p-4 flex flex-col ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Close button for mobile */}
                <div className="lg:hidden flex justify-end mb-4">
                    <button onClick={() => setSidebarOpen(false)} className="text-gray-500">
                        <X size={24} />
                    </button>
                </div>

                {/* Sidebar header/logo */}
                <div className="flex items-center mb-6">
                    <img
                        src="https://placehold.co/50x50/2563eb/ffffff?text=I"
                        alt="Ignite Logo"
                        className="rounded-lg mr-3"
                    />
                    <h2 className="text-3xl font-extrabold text-blue-600">Ignite</h2>
                </div>

                {/* Sidebar Navigation */}
                <nav className="flex-grow space-y-2">
                    {/* Home Link */}
                    <button
                        onClick={() => setCurrentView('home')}
                        className="flex items-center w-full text-left p-3 rounded-lg hover:bg-gray-200 transition-colors space-x-3"
                    >
                        <Home size={20} className="text-gray-500" />
                        <span className="font-medium">Home</span>
                    </button>

                    {/* Navigation Tree */}
                    {Object.keys(navigationTree).map(branch => (
                        <div key={branch}>
                            <button
                                onClick={() => handleNavigationClick(branch)}
                                className="flex items-center w-full text-left p-3 rounded-lg hover:bg-gray-200 transition-colors space-x-3"
                            >
                                {expandedBranches[branch] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                {getBranchIcon(branch)}
                                <span className="font-medium">{branch}</span>
                            </button>
                            {expandedBranches[branch] && (
                                <ul className="pl-8 mt-2 space-y-1 border-l border-gray-300">
                                    {navigationTree[branch].map(subBranch => (
                                        <li key={subBranch}>
                                            <button
                                                onClick={() => {
                                                    handleNavigationClick(branch, `List ${subBranch}`);
                                                }}
                                                className="flex items-center w-full text-left p-2 rounded-lg hover:bg-gray-200 transition-colors text-sm space-x-2"
                                            >
                                                <List size={18} className="text-gray-500" />
                                                <span>List {subBranch}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleNavigationClick(branch, `Add ${subBranch}`);
                                                }}
                                                className="flex items-center w-full text-left p-2 rounded-lg hover:bg-gray-200 transition-colors text-sm space-x-2"
                                            >
                                                <Plus size={18} className="text-green-500" />
                                                <span>Add {subBranch}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}

                    {/* AI/ML Analysis Link */}
                    <button
                        onClick={() => setCurrentView('aiAnalysis')}
                        className="flex items-center w-full text-left p-3 rounded-lg hover:bg-gray-200 transition-colors space-x-3"
                    >
                        <Brain size={20} className="text-green-500" />
                        <span className="font-medium">AI/ML Analysis</span>
                    </button>

                </nav>

                {/* User Info & Logout Button */}
                <div className="mt-auto pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500 mb-2">
                        <span>User: {user.email}</span>
                    </div>
                    <LogoutButton />
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-grow p-4 lg:ml-64 mt-16 lg:mt-0">
                <div className="container mx-auto p-4">
                    {/* The main content is rendered conditionally based on the current view */}
                    {loading ? (
                        <div className="text-center text-lg text-gray-500">Loading content...</div>
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
                                <ListDataView branch={selectedSubBranch} />
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};


// -----------------------------------------------------------------------------
// The root component exported by this file
// -----------------------------------------------------------------------------
export default App;

export { ListDataView };
