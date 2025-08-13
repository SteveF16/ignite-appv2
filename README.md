# Getting Started with Create React App

# Ignite - Business Management Tool

Ignite is an open-source business management tool designed to help users with data entry, listings management, and AI-powered data analysis for customers, vendors, and inventory.

## Features

* **Data Management:** Easily manage and track data for customers, vendors, and inventory.
* **Intuitive Navigation:** A sidebar with a a TreeView navigation menu provides quick access to different sections.
* **AI-Powered Analysis:** A dedicated feature for AI-driven data analysis to provide valuable business insights.
* **Responsive Design:** A mobile-only header ensures a seamless and user-friendly experience on all devices.

## Technologies

* **React:** The main front-end library for building the user interface.
* **Firebase:** Provides backend services, including a context provider for state management.
* **Create React App:** Used to bootstrap the project.
* **...** (Add any other libraries you use, e.g., Material-UI, React Router, etc.)

## Project Structure

This project was bootstrapped with Create React App.

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


* **`FirebaseProvider`**: The main context provider that handles all Firebase-related logic and state management, making it accessible throughout the app.
* **`App`**: The main component that manages the overall layout and state of the application.
* **`Sidebar`**: Contains the main navigation for the application, including the `Navigation Tree` and user information.
* **`Main Content Area`**: The dynamic section of the app where different views (`home`, `dataEntry`, `listings`, `aiAnalysis`) are rendered based on user interaction.
* **`DataEntryForm`**: A reusable component for adding and updating data for different branches (Customers, Vendors, etc.).

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

* Node.js (LTS version recommended)
* npm or yarn

### Installation

1.  Clone the repository:
    ```sh
    git clone [your-repo-url]
    ```
2.  Navigate to the project directory:
    ```sh
    cd ignite-app
    ```
3.  Install NPM packages:
    ```sh
    npm install
    ```

### Environment Variables

Firebase environment variables can be found in FirebaseConfig.js file.


### Running the App

1.  Start the development server:
    ```sh
    npm start
    ```
2.  Open your browser and navigate to `http://localhost:3000` to view the app.

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.

## Contributing

We welcome contributions! Please feel free to fork the repository and submit a pull request.

