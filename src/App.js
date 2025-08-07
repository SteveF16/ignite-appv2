/* App.js */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import {
  ChevronDown, ChevronRight, Home, Plus, Edit, Trash2, Briefcase, Users, Warehouse, Banknote, Brain, X, Menu
} from 'lucide-react';

import firebaseConfig from './FirebaseConfig'; // ✅ This imports your config safely

// You can hardcode or later replace these with env variables
const appId = 'ignite-appv2-data'; // 👈 Match your Firebase project ID or app-specific ID
const initialAuthToken = null;     // 👈 Or pull from env/config if needed

const FirebaseContext = createContext(null);


// Firebase Provider component to handle authentication and initialization
const FirebaseProvider = ({ children }) => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                const app = initializeApp(firebaseConfig);
                const authInstance = getAuth(app);
                const dbInstance = getFirestore(app);

                setAuth(authInstance);
                setDb(dbInstance);

                // Check for the initialAuthToken provided by the Canvas environment
                if (initialAuthToken) {
                    await signInWithCustomToken(authInstance, initialAuthToken);
                } else {
                    await signInAnonymously(authInstance);
                }

                // Listen for auth state changes
                const unsubscribe = onAuthStateChanged(authInstance, (user) => {
                    if (user) {
                        setCurrentUser(user);
                    } else {
                        setCurrentUser(null);
                    }
                    setLoadingAuth(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Firebase initialization or authentication failed:", error);
                setLoadingAuth(false);
            }
        };
        initializeFirebase();
    }, []);

    const userId = currentUser?.uid || 'anonymous';

    // The value provided by the context
    const value = { db, auth, currentUser, userId, loadingAuth };

    return (
        <FirebaseContext.Provider value={value}>
            {children}
        </FirebaseContext.Provider>
    );
};

// Custom hook to use the Firebase context
const useFirebase = () => useContext(FirebaseContext);


// --- Components for different views ---

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
                timestamp: serverTimestamp(),
            };

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
                            type="text"
                            id={field}
                            name={field}
                            value={formData[field] || ''}
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

// Main App Component
const App = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [openBranches, setOpenBranches] = useState({ Customers: true });
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [selectedSubBranch, setSelectedSubBranch] = useState(null);
    const [currentView, setCurrentView] = useState('home');

    const { userId, loadingAuth } = useFirebase();

    // Data for the treeview
    const treeData = [
        {
            name: 'Customers', icon: Users, subBranches: [
                { name: 'Add Customer', icon: Plus },
                { name: 'Change Customer', icon: Edit },
                { name: 'Delete Customer', icon: Trash2 },
            ]
        },
        {
            name: 'Vendors', icon: Briefcase, subBranches: [
                { name: 'Add Vendor', icon: Plus },
                { name: 'Change Vendor', icon: Edit },
                { name: 'Delete Vendor', icon: Trash2 },
            ]
        },
        {
            name: 'Inventory', icon: Warehouse, subBranches: [
                { name: 'Add Inventory', icon: Plus },
                { name: 'Change Inventory', icon: Edit },
                { name: 'Delete Inventory', icon: Trash2 },
            ]
        },
        {
            name: 'Banking', icon: Banknote, subBranches: [
                { name: 'Add Transaction', icon: Plus },
                { name: 'Change Transaction', icon: Edit },
                { name: 'Delete Transaction', icon: Trash2 },
            ]
        },
        {
            name: 'Company', icon: Briefcase, subBranches: [
                { name: 'Add Company Info', icon: Plus },
                { name: 'Change Company Info', icon: Edit },
                { name: 'Delete Company Info', icon: Trash2 },
            ]
        },
        {
            name: 'Employees', icon: Users, subBranches: [
                { name: 'Add Employee', icon: Plus },
                { name: 'Change Employee', icon: Edit },
                { name: 'Delete Employee', icon: Trash2 },
            ]
        },
    ];

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const toggleBranch = (branchName) => {
        setOpenBranches(prev => ({ ...prev, [branchName]: !prev[branchName] }));
    };

    const handleSubBranchClick = (branchName, subBranchName) => {
        setSelectedBranch(branchName);
        setSelectedSubBranch(subBranchName);
        setCurrentView('dataEntry');
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
                            className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition duration-150"
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
                                            onClick={() => handleSubBranchClick(branch.name, subBranch.name)}
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
    <FirebaseContext.Provider value={{
        db: null, // Placeholder, will be set in FirebaseProvider
        auth: null, // Placeholder, will be set in FirebaseProvider
        currentUser: null, // Placeholder, will be set in FirebaseProvider
        userId: 'anonymous', // Placeholder, will be updated
        loadingAuth: true
    }}>
        <FirebaseProvider>
            <App />
        </FirebaseProvider>
    </FirebaseContext.Provider>
);

export default WrappedApp;
