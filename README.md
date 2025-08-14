# Getting Started with Create React App

# Ignite - Business Management Tool

Ignite is an open-source business management tool designed to help users with data entry, listings management, and AI-powered data analysis for customers, vendors, and inventory.

## Features

src/
├── App.js
├── AppWrapper.js
├── DataEntryForm.js
├── LogoutButton.js
├── Login.js
├── Register.js
├── Sidebar.js
├── firebaseConfig.js
└── index.js
Component Hierarchy
This shows how your components are nested and what they are responsible for.

index.js

AppWrapper.js(The main entry point that sets up Firebase and authentication)

Login.js(User login page)

Register.js(New user registration page)

App.js(The main application after a user logs in)

Sidebar.js(The main navigation menu)

LogoutButton.js(A reusable button for logging out)

DataEntryForm.js(The form for adding and editing data)

File Descriptions
index.js: The root of your React application. It renders the AppWrapper component.

AppWrapper.js: A high-level component that handles Firebase initialization, user authentication state, and routing. It acts as a wrapper to provide the Firebase context to the rest of your app.

App.js: The core component that displays the main application interface, including the header, sidebar, and the dynamic content area where forms are rendered.

Sidebar.js: The navigation component that shows the different data branches (e.g., Customers, Employees) and sub-branches.

DataEntryForm.js: A reusable form component that dynamically generates input fields based on the selected data branch and handles saving data to Firestore.

Login.js: The component for the user sign-in page.

Register.js: The component for the new user registration page.

LogoutButton.js: A simple, dedicated component for the logout action.



