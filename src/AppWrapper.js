/* global __initial_auth_token */

// AppWrapper.js
// This file is used to wrap the main application component with Firebase context.
// It handles user authentication, session management, and fetches the user's tenantId
// from Firestore, creating a new user document if one does not exist.

import React, { useState, useEffect, createContext } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from './firebaseConfig';
import App from './App'; // The main App component
import Login from './Login'; // The Login component
import Register from './Register'; // <<-- ADD THIS IMPORT
import { v4 as uuidv4 } from 'uuid'; // Import uuid to generate unique tenantId
import { BrowserRouter, Routes, Route } from 'react-router-dom'; // <<-- ADD THIS IMPORT


// Firebase Context
export const FirebaseContext = createContext(null);



// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const AppWrapper = () => {
  const [user, setUser] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        // User is signed in.
        setUser(firebaseUser);

        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            // If user document exists, get their tenantId
            setTenantId(userDoc.data().tenantId);
          } else {
            // New user! Create a user document with a new tenantId.
            console.log('No user document found. Creating a new one...');
            const newTenantId = uuidv4();
            await setDoc(userRef, {
              tenantId: newTenantId,
              email: firebaseUser.email,
              createdAt: new Date(),
            });
            setTenantId(newTenantId);
          }
        } catch (error) {
          console.error('Error loading or creating user document:', error);
          // In case of an error, sign the user out to prevent them from accessing the app without a tenantId
          signOut(auth);
          setUser(null);
          setTenantId(null);
        }
      } else {
        // User is signed out.
        setUser(null);
        setTenantId(null);
        

       // <<<--- STEVE ADDED to PREVENT Unauthorized login REMOVE OR COMMENT OUT THIS ENTIRE SECTION --- >>>
        /*


        let initialAuthToken = undefined;
        // The try/catch block safely attempts to get the global variable
        try {
            initialAuthToken = __initial_auth_token;
        } catch (e) {
            console.warn("Custom auth token not found, falling back to anonymous login.");
        }

        // Attempt to sign in with a custom token if available, otherwise sign in anonymously
        if (initialAuthToken) {
          try {
            await signInWithCustomToken(auth, initialAuthToken);
          } catch (e) {
            console.error("Error with custom auth token:", e);
            // Fallback to anonymous sign-in if the custom token fails
            try {
              await signInAnonymously(auth);
            } catch (e) {
              console.error("Anonymous sign-in failed:", e);
            }
          }
        } else {
          // If no custom token, sign in anonymously
          try {
            await signInAnonymously(auth);
          } catch (e) {
            console.error("Anonymous sign-in failed:", e);
          }
        }

        */ 
       // <<<--- END STEVE ADDED to PREVENT Unauthorized login REMOVE OR COMMENT OUT THIS ENTIRE SECTION --- >>>
       
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // If the user is authenticated, show the main app. Otherwise, show the login screen.
  return (
    <FirebaseContext.Provider value={{ user, tenantId, auth, db }}>
        <BrowserRouter>
            {user ? (
                <App />
            ) : (
                // Use Routes to manage navigation for unauthenticated users
                <Routes>
                    <Route path="/Register" element={<Register />} />
                    {/* The default path should be the Login page */}
                    <Route path="/" element={<Login />} />
                    <Route path="*" element={<Login />} />
                </Routes>
            )}
        </BrowserRouter>
    </FirebaseContext.Provider>
  );
};

export default AppWrapper;