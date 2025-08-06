/* global __firebase_config, __app_id, __initial_auth_token */
import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc /*, query, onSnapshot */ } from 'firebase/firestore'; // Removed unused imports for 'query', 'onSnapshot' to clear warnings

// Ensure Tailwind CSS is loaded for styling
// This script tag is typically in public/index.html, but included here for completeness
// <script src="https://cdn.tailwindcss.com"></script>

// --- Firebase Configuration and Context ---
// Global variables provided by the Canvas environment for Firebase setup.
// For local development, these will be undefined, so we provide default fallbacks.
// YOU MUST REPLACE firebaseConfig AND apiKey WITH YOUR ACTUAL CREDENTIALS FOR FULL LOCAL FUNCTIONALITY.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; // 'default-app-id' for local testing
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Create a context for Firebase services and user data
const FirebaseContext = createContext(null);

// Firebase Provider component to initialize Firebase and manage authentication state
const FirebaseProvider = ({ children }) => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                // Initialize Firebase app only if firebaseConfig is not empty
                if (Object.keys(firebaseConfig).length === 0) {
                    console.warn("Firebase config is empty. Data saving and authentication will not work locally until you provide your Firebase credentials in src/App.js.");
                    setLoadingAuth(false);
                    return;
                }

                const app = initializeApp(firebaseConfig);
                const authInstance = getAuth(app);
                const dbInstance = getFirestore(app);

                setAuth(authInstance);
                setDb(dbInstance);

                // Sign in with custom token if available, otherwise anonymously
                if (initialAuthToken) {
                    await signInWithCustomToken(authInstance, initialAuthToken);
                } else {
                    await signInAnonymously(authInstance);
                }

                // Listen for authentication state changes
                const unsubscribe = onAuthStateChanged(authInstance, (user) => {
                    setCurrentUser(user);
                    setLoadingAuth(false); // Authentication state is ready
                });

                // Cleanup subscription on component unmount
                return () => unsubscribe();
            } catch (error) {
                console.error("Error initializing Firebase:", error);
                setLoadingAuth(false); // Stop loading even if there's an error
            }
        };

        initializeFirebase();
    }, []); // Empty dependency array ensures this runs once on mount

    // Provide Firebase instances and user data to children components
    const value = { db, auth, currentUser, loadingAuth };

    return (
        <FirebaseContext.Provider value={value}>
            {children}
        </FirebaseContext.Provider>
    );
};

// Custom hook to easily access Firebase context
const useFirebase = () => useContext(FirebaseContext);

// --- Treeview Data Structure ---
// Defines the structure of the navigation tree with main branches and their sub-branches.
const treeData = {
    Customers: ['Add Customer', 'View Customers', 'Change Customer', 'Delete Customer'],
    Vendors: ['Add Vendor', 'View Vendors', 'Change Vendor', 'Delete Vendor'],
    Inventory: ['Add Item', 'View Items', 'Change Item', 'Delete Item'],
    Banking: ['Add Transaction', 'View Transactions', 'Reconcile'],
    Company: ['Company Info', 'Departments', 'Locations'],
    Employees: ['Add Employee', 'View Employees', 'Change Employee', 'Delete Employee'],
};

// --- Reusable Components ---

// Loading Spinner component for visual feedback during async operations
const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
);

// MessageBox component for displaying success or error messages
const MessageBox = ({ message, type, onClose }) => {
    // Determine background and border colors based on message type
    const bgColor = type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700';
    const borderColor = type === 'error' ? 'border-red-500' : 'border-green-500';

    if (!message) return null; // Don't render if there's no message

    return (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 p-4 rounded-md shadow-lg z-50 ${bgColor} border-l-4 ${borderColor} flex items-center justify-between`}>
            <p className="font-semibold">{message}</p>
            <button
                onClick={onClose}
                className="ml-4 px-3 py-1 bg-white rounded-full text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
                &times; {/* Close button */}
            </button>
        </div>
    );
};


// TreeView Component for the left-side navigation panel
const TreeView = ({ onSelectBranch }) => {
    const [openBranches, setOpenBranches] = useState({}); // State to manage open/closed branches

    // Toggles the open/closed state of a branch
    const toggleBranch = (branchName) => {
        setOpenBranches(prev => ({
            ...prev,
            [branchName]: !prev[branchName]
        }));
    };

    return (
        <div className="w-full h-full p-4 bg-gray-50 rounded-lg shadow-inner overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Navigation</h2>
            {Object.entries(treeData).map(([branch, subBranches]) => (
                <div key={branch} className="mb-2">
                    <button
                        onClick={() => toggleBranch(branch)}
                        className="flex items-center justify-between w-full py-2 px-3 text-left text-lg font-medium text-blue-700 hover:bg-blue-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                        {branch}
                        <svg
                            className={`w-5 h-5 transition-transform duration-200 ${openBranches[branch] ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                    {openBranches[branch] && (
                        <div className="ml-4 border-l border-gray-200 pl-3 mt-1">
                            {subBranches.map(subBranch => (
                                <button
                                    key={subBranch}
                                    onClick={() => onSelectBranch(branch, subBranch)}
                                    className="block w-full py-1.5 px-2 text-left text-gray-600 hover:bg-gray-200 rounded-md transition-colors duration-200 text-base focus:outline-none focus:ring-2 focus:ring-gray-300"
                                >
                                    {subBranch}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

// Data Entry Form component for inputting and saving data to Firestore
const DataEntryForm = ({ selectedBranch, selectedSubBranch }) => {
    const { db, currentUser } = useFirebase();
    const [formData, setFormData] = useState({}); // State to hold form input data
    const [message, setMessage] = useState(''); // State for message box message
    const [messageType, setMessageType] = useState(''); // State for message box type (success/error)
    const [loading, setLoading] = useState(false); // State for loading indicator

    // Reset form data and messages when the selected branch/sub-branch changes
    useEffect(() => {
        setFormData({});
        setMessage('');
    }, [selectedBranch, selectedSubBranch]);

    // Handles changes in form input fields
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handles form submission, saves data to Firestore
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission behavior

        // Check if user is authenticated and Firestore is available
        if (!currentUser || !db) {
            setMessage('Authentication required to save data. Please ensure Firebase is configured.');
            setMessageType('error');
            return;
        }

        setLoading(true); // Show loading spinner
        setMessage(''); // Clear previous messages

        try {
            // Determine the Firestore collection name based on the main branch
            const collectionName = selectedBranch.toLowerCase();
            // Construct the path for the user's private data collection
            const userDocRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/${collectionName}`);

            // Add the form data to Firestore
            await addDoc(userDocRef, {
                ...formData,
                timestamp: new Date(), // Add a timestamp
                userId: currentUser.uid, // Store the user ID
                branch: selectedBranch,
                subBranch: selectedSubBranch,
            });

            setMessage(`Data for ${selectedSubBranch} saved successfully!`);
            setMessageType('success');
            setFormData({}); // Clear form after successful submission
        } catch (error) {
            console.error("Error saving data:", error);
            setMessage(`Error saving data: ${error.message}`);
            setMessageType('error');
        } finally {
            setLoading(false); // Hide loading spinner
        }
    };

    // Display a prompt if no branch/sub-branch is selected
    if (!selectedBranch || !selectedSubBranch) {
        return (
            <div className="p-6 text-center text-gray-600">
                Select an option from the navigation tree to get started.
            </div>
        );
    }

    // Dynamically renders form fields based on the selected sub-branch
    const renderFormFields = () => {
        switch (selectedSubBranch) {
            case 'Add Customer':
                return (
                    <>
                        <input type="text" name="customerName" placeholder="Customer Name" value={formData.customerName || ''} onChange={handleChange} className="input-field" required />
                        <input type="text" name="contactPerson" placeholder="Contact Person" value={formData.contactPerson || ''} onChange={handleChange} className="input-field" />
                        <input type="email" name="customerEmail" placeholder="Email" value={formData.customerEmail || ''} onChange={handleChange} className="input-field" />
                        <input type="tel" name="customerPhone" placeholder="Phone" value={formData.customerPhone || ''} onChange={handleChange} className="input-field" />
                    </>
                );
            case 'Add Vendor':
                return (
                    <>
                        <input type="text" name="vendorName" placeholder="Vendor Name" value={formData.vendorName || ''} onChange={handleChange} className="input-field" required />
                        <input type="text" name="service" placeholder="Service/Product" value={formData.service || ''} onChange={handleChange} className="input-field" />
                        <input type="email" name="vendorEmail" placeholder="Email" value={formData.vendorEmail || ''} onChange={handleChange} className="input-field" />
                    </>
                );
            case 'Add Item':
                return (
                    <>
                        <input type="text" name="itemName" placeholder="Item Name" value={formData.itemName || ''} onChange={handleChange} className="input-field" required />
                        <input type="number" name="quantity" placeholder="Quantity" value={formData.quantity || ''} onChange={handleChange} className="input-field" />
                        <input type="text" name="unit" placeholder="Unit (e.g., pcs, kg)" value={formData.unit || ''} onChange={handleChange} className="input-field" />
                    </>
                );
            case 'Add Transaction':
                return (
                    <>
                        <input type="text" name="transactionType" placeholder="Transaction Type (e.g., Deposit, Withdrawal)" value={formData.transactionType || ''} onChange={handleChange} className="input-field" required />
                        <input type="number" name="amount" placeholder="Amount" value={formData.amount || ''} onChange={handleChange} className="input-field" />
                        <input type="date" name="date" placeholder="Date" value={formData.date || ''} onChange={handleChange} className="input-field" />
                    </>
                );
            case 'Add Employee':
                return (
                    <>
                        <input type="text" name="employeeName" placeholder="Employee Name" value={formData.employeeName || ''} onChange={handleChange} className="input-field" required />
                        <input type="email" name="employeeEmail" placeholder="Email" value={formData.employeeEmail || ''} onChange={handleChange} className="input-field" />
                        <input type="tel" name="employeePhone" placeholder="Phone" value={formData.employeePhone || ''} onChange={handleChange} className="input-field" />
                    </>
                );
            // For "View", "Change", "Delete", "Company Info", "Departments", "Locations" - display a message
            case 'Company Info':
            case 'Departments':
            case 'Locations':
            case 'View Customers':
            case 'Change Customer':
            case 'Delete Customer':
            case 'View Vendors':
            case 'Change Vendor':
            case 'Delete Vendor':
            case 'View Items':
            case 'Change Item':
            case 'Delete Item':
            case 'View Transactions':
            case 'Reconcile':
            case 'View Employees':
            case 'Change Employee':
            case 'Delete Employee':
                return (
                    <div className="p-6 text-center text-gray-600">
                        <p>Functionality for "{selectedSubBranch}" will be developed in future iterations.</p>
                        {selectedSubBranch.startsWith('View') && <p>Displaying data for {selectedBranch} would go here.</p>}
                    </div>
                );
            default:
                return (
                    <div className="p-6 text-center text-gray-600">
                        No specific form for "{selectedSubBranch}".
                    </div>
                );
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                {selectedBranch} &gt; {selectedSubBranch}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                {renderFormFields()}
                {/* Only show save button for 'Add' operations */}
                {['Add Customer', 'Add Vendor', 'Add Item', 'Add Transaction', 'Add Employee'].includes(selectedSubBranch) && (
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 text-lg font-bold shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        disabled={loading} // Disable button while loading
                    >
                        {loading ? <LoadingSpinner /> : `Save ${selectedBranch.slice(0, -1)}`}
                    </button>
                )}
            </form>
            {/* Display messages using the MessageBox component */}
            <MessageBox message={message} type={messageType} onClose={() => setMessage('')} />
        </div>
    );
};

// AI/ML Data Analysis Component for interacting with the Gemini API
const AIDataAnalysis = () => {
    const [inputText, setInputText] = useState(''); // State for user input text
    const [analysisResult, setAnalysisResult] = useState(''); // State for AI analysis result
    const [loading, setLoading] = useState(false); // State for loading indicator
    const [message, setMessage] = useState(''); // State for message box message
    const [messageType, setMessageType] = useState(''); // State for message box type

    // Handles the AI analysis request
    const handleAnalyze = async () => {
        if (!inputText.trim()) {
            setMessage('Please enter some text to analyze.');
            setMessageType('error');
            return;
        }

        setLoading(true); // Show loading spinner
        setAnalysisResult(''); // Clear previous results
        setMessage(''); // Clear previous messages

        try {
            let chatHistory = [];
            // Prepare the prompt for the AI model
            chatHistory.push({ role: "user", parts: [{ text: `Analyze the following data/text and provide a concise summary or key insights:\n\n"${inputText}"` }] });
            const payload = { contents: chatHistory };
            // For local development, replace "" with your actual Gemini API key
            const apiKey = ""; // Canvas will provide this at runtime, but locally you need to set it.
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

            // Implement exponential backoff for retries to handle rate limits or transient errors
            const maxRetries = 3;
            let retries = 0;
            let response;

            while (retries < maxRetries) {
                try {
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        break; // Success, exit loop
                    } else if (response.status === 429) { // Too Many Requests (Rate Limit)
                        const delay = Math.pow(2, retries) * 1000; // Exponential backoff delay
                        console.warn(`Rate limit hit. Retrying in ${delay / 1000}s...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        retries++;
                    } else {
                        // Other HTTP errors, throw to catch block
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                } catch (fetchError) {
                    console.error("Fetch attempt failed:", fetchError);
                    if (retries === maxRetries - 1) throw fetchError; // Re-throw on last retry
                    const delay = Math.pow(2, retries) * 1000;
                    console.warn(`Error during fetch. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retries++;
                }
            }

            // If no successful response after retries, throw an error
            if (!response || !response.ok) {
                throw new Error("Failed to get a successful response after retries.");
            }

            const result = await response.json(); // Parse the JSON response

            // Extract the text from the API response
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                setAnalysisResult(text);
                setMessage('Analysis complete!');
                setMessageType('success');
            } else {
                setMessage('Analysis failed: No content in response.');
                setMessageType('error');
                console.error("Unexpected API response structure:", result);
            }
        } catch (error) {
            console.error("Error analyzing data:", error);
            setMessage(`Analysis failed: ${error.message}`);
            setMessageType('error');
        } finally {
            setLoading(false); // Hide loading spinner
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                AI/ML Data Analysis
            </h2>
            <div className="mb-4">
                <label htmlFor="analysisInput" className="block text-gray-700 text-sm font-bold mb-2">
                    Enter text for AI analysis:
                </label>
                <textarea
                    id="analysisInput"
                    className="input-field min-h-[120px]"
                    placeholder="e.g., 'Customer feedback indicates a preference for faster delivery times and more color options for product X.'"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                ></textarea>
            </div>
            <button
                onClick={handleAnalyze}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors duration-200 text-lg font-bold shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                disabled={loading} // Disable button while loading
            >
                {loading ? <LoadingSpinner /> : 'Analyze Data'}
            </button>
            {analysisResult && (
                <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Analysis Result:</h3>
                    <p className="text-gray-800 whitespace-pre-wrap">{analysisResult}</p>
                </div>
            )}
            {/* Display messages using the MessageBox component */}
            <MessageBox message={message} type={messageType} onClose={() => setMessage('')} />
        </div>
    );
};


// --- Main App Component ---
const App = () => {
    const [selectedBranch, setSelectedBranch] = useState(null); // State for the currently selected main branch
    const [selectedSubBranch, setSelectedSubBranch] = useState(null); // State for the currently selected sub-branch
    const { auth, currentUser, loadingAuth } = useFirebase(); // Get Firebase auth and user data from context
    const [currentView, setCurrentView] = useState('home'); // Controls which content is displayed in the right panel ('home', 'dataEntry', 'aiAnalysis')

    // Callback function for TreeView to update selected branch/sub-branch and switch view
    const handleSelectBranch = (branch, subBranch) => {
        setSelectedBranch(branch);
        setSelectedSubBranch(subBranch);
        setCurrentView('dataEntry'); // Switch to data entry view
    };

    // Handles user logout
    const handleLogout = async () => {
        if (auth) {
            try {
                await signOut(auth); // Sign out the current user
                console.log("User signed out.");
            } catch (error) {
                console.error("Error signing out:", error);
            }
        }
    };

    // Show a loading screen while authentication is in progress
    if (loadingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <LoadingSpinner />
                <p className="ml-2 text-gray-700">Loading authentication...</p>
            </div>
        );
    }

    return (
        // Main container with Inter font and responsive design
        <div className="min-h-screen bg-gray-100 font-inter antialiased flex flex-col">
            {/* Header Section */}
            <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 shadow-lg flex justify-between items-center rounded-b-lg">
                <h1 className="text-3xl font-extrabold tracking-tight">Ignite App</h1>
                <div className="flex items-center space-x-4">
                    {/* Display User ID if authenticated */}
                    {currentUser && (
                        <span className="text-sm bg-blue-700 px-3 py-1 rounded-full">
                            User ID: {currentUser.uid}
                        </span>
                    )}
                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="bg-white text-blue-800 px-4 py-2 rounded-md font-semibold hover:bg-blue-100 transition-colors duration-200 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content Area - Flexible layout for left and right panels */}
            <div className="flex flex-1 p-6 space-x-6 flex-col md:flex-row"> {/* Responsive layout: column on small screens, row on medium+ */}
                {/* Left Panel - Treeview and AI/ML Button */}
                <div className="w-full md:w-1/4 min-w-[250px] bg-white rounded-xl shadow-lg p-4 flex flex-col mb-6 md:mb-0"> {/* Responsive width and margin */}
                    <TreeView onSelectBranch={handleSelectBranch} />
                    <div className="mt-auto pt-4 border-t border-gray-200">
                        <button
                            onClick={() => setCurrentView('aiAnalysis')} // Switch to AI/ML analysis view
                            className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-md hover:bg-purple-700 transition-colors duration-200 text-lg font-bold shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                        >
                            AI/ML Analysis
                        </button>
                    </div>
                </div>

                {/* Right Panel - Content Display Area */}
                <div className="flex-1 bg-white rounded-xl shadow-lg p-6 overflow-y-auto">
                    {/* Conditional rendering based on currentView state */}
                    {currentView === 'home' && (
                        <div className="text-center p-10 text-gray-700">
                            <h2 className="text-3xl font-bold mb-4">Welcome to Ignite!</h2>
                            <p className="text-lg">Use the navigation tree on the left to manage your business data.</p>
                            <p className="mt-2 text-md">Click "AI/ML Analysis" to explore data insights.</p>
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
                </div>
            </div>
        </div>
    );
};

// Wrap the main App component with FirebaseProvider to ensure Firebase is initialized
// and available throughout the application.
const WrappedApp = () => (
    <FirebaseProvider>
        <App />
    </FirebaseProvider>
);

export default WrappedApp; // Export the wrapped app as the default
// 
// This ensures Firebase is initialized and available throughout the app.

