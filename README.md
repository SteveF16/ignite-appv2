# Ignite App v2

Ignite App v2 is a secure, multi-tenant React + Firebase application with Firestore as its backend.  
The app supports authentication, structured data schemas, role-based access, CSV export, and responsive UI with a persistent sidebar.

---

## 🚀 Features

- **Authentication**
  - Firebase Authentication
  - Register, Login, and Logout flows
  - Multi-tenant security patterns

- **Data Management**
  - Firestore collections defined in `DataSchemas.js`
  - Dynamic Data Entry form (`DataEntryForm.js`)
  - List view with expandable rows and CSV export (`ListDataView.js`)

- **UI/UX**
  - Responsive sidebar navigation (`Sidebar.js`)
  - Sticky sidebar and table headers (best practice for large datasets)
  - Improved data formatting and readability
  - Tailwind CSS styling
  - Custom CSS overrides (`App.css`, `Sidebar.css`, `index.css`)

- **Developer Tools**
  - Patch verification with `scripts/patch-verify.js`
  - Testing with Jest (`setupTests.js`)
  - Performance metrics via `reportWebVitals.js`

---

## 📂 Project Structure

ignite-appv2/
├── scripts/
│ └── patch-verify.js # Script to verify applied patches
├── src/
│ ├── App.js # Main app container
│ ├── App.css # Global styles
│ ├── AppWrapper.js # Provides context wrappers
│ ├── DataSchemas.js # Firestore schemas (Customers + future tables)
│ ├── DataEntryForm.js # Dynamic form for adding/editing records
│ ├── ListDataView.js # List view with expandable rows + CSV export
│ ├── Sidebar.js # Sidebar navigation
│ ├── Sidebar.css # Sidebar styling
│ ├── index.js # React entry point
│ ├── index.css # Base global styles
│ ├── firebaseConfig.js # Firebase project configuration
│ ├── Register.js # User registration form
│ ├── Login.js # User login form
│ ├── LogoutButton.js # Logout button component
│ ├── reportWebVitals.js # Performance metrics setup
│ ├── setupTests.js # Jest testing setup
│ └── ...
├── public/
│ ├── index.html # Root HTML file
│ └── ...
├── package.json
├── README.md



---

## 🔑 Firebase Configuration

The app uses Firebase for Authentication and Firestore for storage.  
Configuration is located in:

src/firebaseConfig.js


This file initializes the Firebase app and provides services for authentication and Firestore.

⚠️ **Best practice**: Do not commit real API keys to public repos. Use `.env` files for sensitive values.

---

## 🛠️ Development

### Install dependencies
```bash
npm install

npm start

#Run tests
npm test

#Build for production
npm run build

📊 Data Management

Schemas: defined in DataSchemas.js

Forms: handled via DataEntryForm.js

Listings: handled via ListDataView.js

Exports: CSV export supported via table header actions

Best practices followed:

Sticky headers for large datasets

Consistent JSON-to-table formatting

Multi-tenant data separation

🧪 Testing & Metrics

Testing: Jest + React Testing Library
Setup in setupTests.js

Performance Metrics:
Provided via reportWebVitals.js using web-vitals

🔒 Security Notes

Multi-tenant separation using Firebase Auth UID + Firestore rules

Always validate user permissions server-side

Use environment variables for API keys

✅ Patch Verification

You can verify changes using the patch verification script:

node scripts/patch-verify.js src/ListDataView.js <sha256-checksum>


This ensures applied patches match expected file integrity.

📌 Next Steps

Add more Firestore collections (Orders, Invoices, etc.)

Extend form generation from schema definitions

Improve UI consistency across large datasets

Expand automated testing coverage





