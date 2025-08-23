// removed stray global directive that collides with eslint's built-ins   

import React, { useState, useEffect, createContext } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signOut // ✅ already imported
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import firebaseConfig from './firebaseConfig';
import App from './App';
import Login from './Login';
import Register from './Register';

export const FirebaseContext = createContext(null);

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const AppWrapper = () => {
  const [user, setUser] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Minimal addition: force logout once at app startup
  useEffect(() => {
   //        signOut(auth).catch(() => {        
      // Silently ignore any signOut errors     STEVE - Commented out causes errors when not logged in!!
   //        });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // ✅ Minimal addition: disallow anonymous users
        if (currentUser.isAnonymous) {
          await signOut(auth);
          setUser(null);
          setTenantId(null);
          setLoading(false);
          return;
        }

        setUser(currentUser);

        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setTenantId(userDocSnap.data().tenantId);
        } else {
          const newTenantId = uuidv4();
          await setDoc(userDocRef, { tenantId: newTenantId, email: currentUser.email });
          setTenantId(newTenantId);
        }
      } else {
        setUser(null);
        setTenantId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <FirebaseContext.Provider value={{ user, tenantId, auth, db }}>
        <BrowserRouter>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Login />} />
            
            {/* ✅ Protected route: redirect to login if no user */}
            <Route
              path="/app"
              element={user ? <App /> : <Navigate to="/" replace />}
            />

            {/* Catch-all: redirect to login */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>  
    </FirebaseContext.Provider>
  );
};

export default AppWrapper;
