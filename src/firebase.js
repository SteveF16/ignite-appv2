// src/firebase.js
// Minimal context so tests (and App) can import the same symbol.

// Note: this file is only used in tests. The real firebase.js is in src/firebase/index.js
// This avoids circular dependencies and keeps the test setup simpler.
// If you add more exports to the real firebase.js, you may need to add them here too.
// For example, if you add a FirebaseProvider component, add it here as well.

import React from "react";
export const FirebaseContext = React.createContext(null);
export default { FirebaseContext };
