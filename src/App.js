import React, { useContext, useState } from "react";
import { signOut } from "firebase/auth";
import { FirebaseContext } from "./AppWrapper";
import Sidebar from "./Sidebar";
import DataEntryForm from "./DataEntryForm";
import { List } from "lucide-react";
import { Clipboard } from "lucide-react";
import ListDataView from "./ListDataView";
// REFACTOR: use centralized collection naming to avoid drift across files
import { collectionIdForBranch } from "./collectionNames"; // single source of truth
import { listCollectionKeyFor } from "./navMap"; // NEW: nav data → collection mapping
import ChangeEntity from "./ChangeEntity"; // ensure component is registered in bundle
import { CollectionSchemas } from "./DataSchemas"; // will now resolve via 'customers' OR 'Customers'
import InvoiceTemplateDesigner from "./invoice/TemplateDesigner"; // NEW: template designer UI
import InvoiceEditor from "./invoice/InvoiceEditor"; // NEW: invoice editor (dynamic + PDF)

// This file is the main application component that renders the sidebar, header, and main content area.

const navigation = [
  {
    name: "Business",
    subBranches: [
      // EDIT: add Change <Entity> across branches so the pattern scales to 10–20 tables
      {
        name: "Customers",
        subBranches: ["Add Customer", "Change Customer", "List Customers"],
      },

      {
        name: "Vendors",
        subBranches: ["Add Vendor", "Change Vendor", "List Vendors"],
      },

      {
        name: "Employees",
        subBranches: ["Add Employee", "Change Employee", "List Employees"],
      },

      {
        name: "Expenses",
        subBranches: ["Add Expense", "List Expenses"],
      },

      {
        name: "Assets",
        subBranches: ["Add Asset", "Change Asset", "List Assets"],
      },
      {
        name: "Finances",
        subBranches: [
          "Add Transaction",
          "Change Transaction",
          "List Transactions",
          "Reconcile",
        ],
      },

      {
        name: "Invoices", // NEW: invoice workflow (templates + invoices)
        subBranches: [
          "New Invoice",
          "List Invoices",
          "New Template",
          "List Templates",
        ],
      },
    ],
  },
];

const App = () => {
  // Null-guard so tests (or any code path) without a Provider don't explode
  const ctx = useContext(FirebaseContext) || {};
  const { auth, user, tenantId } = ctx;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("Customers");
  const [selectedSubBranch, setSelectedSubBranch] = useState("Add Customer");
  const [navTick, setNavTick] = useState(0); // increments on every sidebar click (even if same target)

  const handleNavigationClick = (branch, subBranch) => {
    // Trace and tick: we bump navTick even if user re-clicks the same item (e.g., List Customers → List Customers),
    // so children can react (ListDataView clears edit mode & re-subscribes).
    console.debug("[nav] click", { branch, subBranch });
    setSelectedBranch(branch);
    setSelectedSubBranch(subBranch);
    setNavTick((n) => n + 1); // <- the important part
    setSidebarOpen(false);
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
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-white bg-blue-600 rounded-md"
        >
          <List size={24} />
        </button>
      </div>

      {/* Sidebar (fixed on lg+, hidden on mobile) */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onNavigationClick={handleNavigationClick}
        onSignOut={handleSignOut}
        selectedBranch={selectedBranch}
        selectedSubBranch={selectedSubBranch}
        navigation={navigation}
      />

      {/* Content column (reserve space for fixed sidebar on lg+). 
         `min-w-0` prevents this flex child from forcing page-level horizontal scroll. */}
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        {" "}
        {/* Keep header OUTSIDE any horizontal scroller so it never slides left/right */}
        <header className="sticky top-0 z-40 flex items-center justify-between p-4 bg-blue-600 text-white shadow-md">
          {/* sticky header remains visible on vertical scroll; horizontal scroll is moved below */}

          <h1 className="text-2xl font-bold">Ignite App</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Logged in as: {user?.email}</span>
            {/* Display Tenant ID if available */}
            {/* Copy Company Code Button */}
            {tenantId && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tenantId);
                  alert("Company code copied to clipboard!");
                }}
                className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-800 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                <Clipboard size={16} />
                <span>Copy Company Code</span>
              </button>
            )}
            {/* Logout Button */}
            <button
              onClick={handleSignOut}
              className="p-2 bg-red-500 rounded-lg font-semibold hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>
        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto min-w-0">
          {/* min-w-0 keeps inner scroller authoritative */}
          {/* Constrain horizontal scrolling to this inner wrapper (NOT the whole page) */}
          <div className="overflow-x-auto bg-gray-100">
            {/* bg matches page bg while scrolling horizontally */}
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              {selectedBranch} {" > "} {selectedSubBranch}
            </h2>
            <div className="bg-white p-6 rounded-lg shadow-xl">
              {selectedSubBranch.includes("Add") && (
                <DataEntryForm
                  selectedBranch={selectedBranch} // UI label used for headings
                  selectedSubBranch={selectedSubBranch}
                  // Make forms generic across 10–20 tables by passing the collection id explicitly.
                  // ListDataView/ChangeEntity will receive the same id for consistent APIs.
                  collectionName={collectionIdForBranch(selectedBranch)} // ← e.g., "customers"
                  onSave={() => {
                    // You can add a success message or navigate here
                    console.log("Data saved!");
                  }}
                />
              )}
              {/* EDIT: Generic Change (edit) screen across all entities.
                 - Locks immutable fields (e.g., customerNumber) visually & in payload
                 - Shows standardized Audit panel (createdAt/By + updatedAt/By) */}
              {selectedSubBranch.startsWith("Change ") && (
                <ChangeEntity
                  entityLabel={selectedBranch} // UI label "Customers"
                  collectionName={collectionIdForBranch(selectedBranch)} // e.g., "customers"
                  schema={
                    CollectionSchemas?.[collectionIdForBranch(selectedBranch)] // keep schema lookup in sync
                  } // pass per-entity schema
                  onSaveAndClose={() =>
                    handleNavigationClick(
                      selectedBranch,
                      "List " + selectedBranch
                    )
                  }
                />
              )}
              {/* NEW: Invoices — explicit routes for create flows that aren't "Add *" */}
              {selectedSubBranch === "New Invoice" && (
                <InvoiceEditor key={`newInvoice:${navTick}`} /> // dynamic fields + PDF export
              )}
              {selectedSubBranch === "New Template" && (
                <InvoiceTemplateDesigner key={`newTemplate:${navTick}`} /> // per-tenant templates
              )}
              {/* Uniform list routing via nav data:
                  - listCollectionKeyFor(branch, subBranch) resolves the correct collection id
                  - avoids any special-casing (e.g., "List Templates") in this component             */}{" "}
              {selectedSubBranch.includes("List") && (
                <ListDataView
                  key={`${selectedBranch}:${selectedSubBranch}:${navTick}`} // remount on nav
                  branch={selectedBranch} // UI label
                  collectionKey={listCollectionKeyFor(
                    selectedBranch,
                    selectedSubBranch
                  )} // canonical id
                  navTick={navTick}
                />
              )}
              {/* You would add other components here for listing data */}
            </div>
          </div>
          {/* /overflow-x-auto */}
        </main>
      </div>
    </div>
  );
};

export default App;
