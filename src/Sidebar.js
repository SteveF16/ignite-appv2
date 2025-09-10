import React, { useState } from "react";
// Import only the icons actually used in this file to satisfy eslint(no-unused-vars)
import {
  ChevronDown,
  ChevronRight,
  Home,
  Briefcase,
  Users,
  Warehouse,
  Banknote,
  X,
  User,
} from "lucide-react";
import LogoutButton from "./LogoutButton";

const iconMap = {
  Business: Briefcase,
  Customers: User,
  Employees: Users,
  Assets: Warehouse,
  Finances: Banknote,
  Invoices: Banknote, // NEW: icon for the Invoices branch
  Vendors: User, // ← uncomment when you add the Vendors branch (reuses person icon)
};

const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  onNavigationClick,
  onSignOut,
  selectedBranch,
  selectedSubBranch,
  navigation,
}) => {
  const [expandedBranches, setExpandedBranches] = useState([
    "Business",
    "Customers",
  ]);

  const toggleBranch = (branchName) => {
    setExpandedBranches((prev) =>
      prev.includes(branchName)
        ? prev.filter((name) => name !== branchName)
        : [...prev, branchName]
    );
  };

  const isBranchExpanded = (branchName) =>
    expandedBranches.includes(branchName);

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 text-white p-4 
            overflow-y-auto transition-transform duration-300 ease-in-out lg:translate-x-0 
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} shadow-lg`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="text-2xl font-bold flex items-center space-x-2">
          <img
            src="https://placehold.co/32x32/1d4ed8/FFFFFF?text=I"
            alt="Ignite logo"
            className="rounded"
          />
          <span>Ignite</span>
        </div>
        <button
          type="button" // avoid implicit "submit" in case the sidebar ever sits inside a <form>
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-2 rounded-md hover:bg-gray-700 transition-colors"
        >
          <X size={24} />
        </button>
      </div>
      <nav className="flex-1">
        {navigation.map((branch) => {
          const BranchIcon = iconMap[branch.name] || Home;
          return (
            <div key={branch.name} className="mb-2">
              <button
                type="button" // ensure this never submits the central form after a Save
                onClick={() => toggleBranch(branch.name)}
                className="flex items-center justify-between w-full px-3 py-2 text-base font-semibold rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <BranchIcon size={20} />
                  <span>{branch.name}</span>
                </div>
                {isBranchExpanded(branch.name) ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
              {isBranchExpanded(branch.name) && (
                <ul className="ml-4 space-y-1 mt-1">
                  {branch.subBranches.map((subBranch) => {
                    const SubBranchIcon = iconMap[subBranch.name] || Home;
                    const isActive = selectedBranch === subBranch.name;
                    return (
                      <li key={subBranch.name}>
                        <button
                          onClick={() => toggleBranch(subBranch.name)}
                          className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            isActive
                              ? "bg-blue-600 text-white"
                              : "hover:bg-gray-700"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <SubBranchIcon size={18} />
                            <span>{subBranch.name}</span>
                          </div>
                          {subBranch.subBranches &&
                            (isBranchExpanded(subBranch.name) ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            ))}
                        </button>
                        {isBranchExpanded(subBranch.name) &&
                          subBranch.subBranches && (
                            <ul className="ml-6 space-y-1 mt-1">
                              {subBranch.subBranches.map((item) => (
                                <li key={item}>
                                  <button
                                    type="button" // critical: make this a benign button, not a submit
                                    onClick={() =>
                                      onNavigationClick(subBranch.name, item)
                                    }
                                    className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                      selectedSubBranch === item
                                        ? "bg-blue-600 text-white"
                                        : "hover:bg-gray-700"
                                    }`}
                                  >
                                    {item}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-700">
        <LogoutButton onSignOut={onSignOut} />
      </div>
    </div>
  );
};

export default Sidebar;
