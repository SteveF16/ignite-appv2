import React, { useState, useContext } from 'react';

// eslint-disable-next-line no-unused-vars
import { getAuth, signOut } from 'firebase/auth';

import { FirebaseContext } from './AppWrapper';
import Sidebar from './Sidebar';
import DataEntryForm from './DataEntryForm';
import { List } from 'lucide-react';
import { Clipboard } from 'lucide-react';
import ListDataView from './ListDataView';

const navigation = [
    {
        name: 'Business',
        subBranches: [
            { name: 'Customers', subBranches: ['Add Customer', 'List Customers'] },
            { name: 'Employees', subBranches: ['Add Employee', 'List Employees'] },
            { name: 'Assets', subBranches: ['Add Asset', 'List Assets'] },
            { name: 'Finances', subBranches: ['Add Transaction', 'List Transactions'] },
        ],
    },
];

const App = () => {
    const { auth, user, tenantId } = useContext(FirebaseContext);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('Customers');
    const [selectedSubBranch, setSelectedSubBranch] = useState('Add Customer');

    const handleNavigationClick = (branch, subBranch) => {
        setSelectedBranch(branch);
        setSelectedSubBranch(subBranch);
        setSidebarOpen(false); // Close sidebar on mobile
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-100 font-sans">
            {/* Mobile Sidebar Toggle */}
            <div className="lg:hidden fixed top-0 left-0 p-4 z-50">
                <button onClick={() => setSidebarOpen(true)} className="p-2 text-white bg-blue-600 rounded-md">
                    <List size={24} />
                </button>
            </div>

            {/* Sidebar */}
            <Sidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                onNavigationClick={handleNavigationClick}
                onSignOut={handleSignOut}
                selectedBranch={selectedBranch}
                selectedSubBranch={selectedSubBranch}
                navigation={navigation}
            />

            <div className="flex-1 flex flex-col lg:ml-64">
                {/* Header (Top Bar) */}
                <header className="flex items-center justify-between p-4 bg-blue-600 text-white shadow-md z-40">
                    <h1 className="text-2xl font-bold">Ignite App</h1>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm">Logged in as: {user?.email}</span>
                        {/* Display Tenant ID if available */}
                        {/* Copy Company Code Button */}
                        {tenantId && (
                        <button
                            onClick={() => {
                            navigator.clipboard.writeText(tenantId);
                            alert('Company code copied to clipboard!');
                            }}
                            className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            <Clipboard size={16} />
                            <span>Copy Company Code</span>
                        </button>
                        )}
                        {/* Logout Button */}   
                        <button onClick={handleSignOut} className="p-2 bg-red-500 rounded-lg font-semibold hover:bg-red-600 transition-colors">
                            Logout
                        </button>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 p-6 overflow-y-auto">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">
                        {selectedBranch} {' > '} {selectedSubBranch}
                    </h2>
                    <div className="bg-white p-6 rounded-lg shadow-xl">
                        {selectedSubBranch.includes('Add') && (
                            <DataEntryForm
                                selectedBranch={selectedBranch}
                                selectedSubBranch={selectedSubBranch}
                                onSave={() => {
                                    // You can add a success message or navigate here
                                    console.log('Data saved!');
                                }}
                            />
                        )}
                        {/* ✅ NEW: Code to show the list view */}
                        {selectedSubBranch.includes('List') && (
                            <ListDataView branch={selectedBranch} />
                        )}


                        {/* You would add other components here for listing data */}

                        
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;

