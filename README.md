# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

structure as of 8/11/2025

App (Ignite - Business Management Tool)
└─── FirebaseProvider (React Context for Firebase)
     ├─── App (Main Component)
     │    ├─── Header (Mobile Only)
     │    ├─── Sidebar
     │    │    ├─── Navigation Tree (TreeView)
     │    │    │    ├─── Home Link
     │    │    │    └─── Data Entry Branches (Customers, Vendors, Inventory, etc.)
     │    │    │         ├─── List Items Link (NEW)
     │    │    │         └─── Add/Change/Delete Item Links
     │    │    └─── User Info & AI Analysis Button
     │    │
     │    └─── Main Content Area
     │         ├─── Conditional Rendering
     │         │    ├─── IF view is 'home' THEN Welcome Message
     │         │    ├─── IF view is 'dataEntry' THEN DataEntryForm
     │         │    ├─── IF view is 'listings' THEN ListingsView (NEW)
     │         │    └─── IF view is 'aiAnalysis' THEN AIDataAnalysis
     │         │
     │         ├─── DataEntryForm Component
     │         ├─── ListingsView Component (NEW)
     │         └─── AIDataAnalysis Component
     │
     └─── FirebaseContext.Provider


