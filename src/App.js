/* App.js */
// Ignite business data manager UI using Firebase and React


import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import {
  Download
} from 'lucide-react';

import firebaseConfig from './FirebaseConfig';


// STEVE -  THIS PREVENT RUNTIME ERRORS FOR DATE - TIME VALUEs!!! CONVERTS TO STRING
// Helper function to safely render Firebase values (especially Timestamps)
const renderValue = (value) => {
  if (value && typeof value === 'object') {
    // If it's a Firebase Timestamp object, convert it to a readable string
    if (typeof value.toDate === 'function') {
      return value.toDate().toLocaleString();
    }
    // Otherwise, stringify the object
    return JSON.stringify(value);
  }
  // For primitives like string, number, boolean
  return String(value);
};




const appId = 'ignite-appv2-data';
const initialAuthToken = null;

const ENABLE_LOGGING = true;
const log = (message, ...args) => {
  if (ENABLE_LOGGING) {
    console.log(`[LOG] ${message}`, ...args);
  }
};

const FirebaseContext = createContext(null);
const useFirebase = () => useContext(FirebaseContext);

const FirebaseProvider = ({ children }) => {
  log('FirebaseProvider component is rendering.');
  
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    log('useEffect in FirebaseProvider is running.');
    const initializeFirebase = async () => {
      try {
        log('Initializing Firebase app...');
        const app = initializeApp(firebaseConfig);
        
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);
        
        setAuth(authInstance);
        setDb(dbInstance);
        log('Firebase services (Auth, Firestore) have been set.');

        log('Attempting authentication...');
        if (initialAuthToken) {
          await signInWithCustomToken(authInstance, initialAuthToken);
          log('Signed in with custom token.');
        } else {
          await signInAnonymously(authInstance);
          log('Signed in anonymously.');
        }

        const unsubscribe = onAuthStateChanged(authInstance, (user) => {
          log(`Auth state changed. User: ${user ? user.uid : 'null'}`);
          setCurrentUser(user || null);
          setLoadingAuth(false);
          log('Authentication is complete. loadingAuth set to false.');
        });

        return () => {
          log('FirebaseProvider cleanup: unsubscribing from auth state changes.');
          unsubscribe();
        };
      } catch (error) {
        log('Firebase initialization failed!', error);
        setLoadingAuth(false);
      }
    };
    initializeFirebase();
  }, []);

  const userId = currentUser?.uid || 'anonymous';
  log(`Rendering FirebaseProvider with userId: ${userId}, db_is_ready: ${!!db}, loadingAuth: ${loadingAuth}`);
  
  return (
    <FirebaseContext.Provider value={{ db, auth, currentUser, userId, loadingAuth }}>
      {children}
    </FirebaseContext.Provider>
  );
};

const ListDataView = ({ branch }) => {
  const { db, userId, loadingAuth } = useFirebase();

  log(`ListDataView is rendering for branch: ${branch}. db_ready: ${!!db}, userId_ready: ${!!userId}, loadingAuth: ${loadingAuth}`);
  
  const [data, setData] = useState([]);
  const [sortKey, setSortKey] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    log('useEffect in ListDataView is running.');
    const fetchData = async () => {
      log(`fetchData called. db_ready: ${!!db}, userId: ${userId}, loadingAuth: ${loadingAuth}`);
      
      // ✅ This is the key check to prevent the error
      if (!db || !userId || loadingAuth) {
        log('fetchData aborted: Firebase services not ready.');
        return;
      }
      
      try {
        log(`Fetching data for path: artifacts/${appId}/users/${userId}/${branch}`);
        const q = collection(db, `artifacts/${appId}/users/${userId}/${branch}`);
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setData(items);
        log(`Successfully fetched ${items.length} items.`);
      } catch (error) {
        log('Error fetching data:', error);
      }
    };
    fetchData();
  }, [db, userId, branch, loadingAuth]);
  
  const handleDelete = async (id) => {
    log(`handleDelete called for item ID: ${id}`);
    if (!db) {
      log('handleDelete aborted: db not ready.');
      return;
    }
    
    try {
      log(`Deleting document at path: artifacts/${appId}/users/${userId}/${branch}/${id}`);
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/${branch}/${id}`));
      setData(prev => prev.filter(item => item.id !== id));
      log('Document deleted successfully.');
    } catch (error) {
      log('Error deleting document:', error);
    }
  };

  const handleSaveEdit = async () => {
    log('handleSaveEdit called.');
    if (!db || !editingItem) {
      log('handleSaveEdit aborted: db or editingItem not ready.');
      return;
    }
    
    try {
      const { id, ...updatedFields } = editingItem;
      log(`Saving new document for branch: ${branch} with data:`, updatedFields);
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/${branch}`), updatedFields);
      setEditingItem(null);
      log('Document saved successfully.');
    } catch (error) {
      log('Error saving document:', error);
    }
  };

  const handleExportCSV = () => {
    log('handleExportCSV called.');
    const headers = data.length > 0 ? Object.keys(data[0]) : [];
    const csv = [headers.join(',')].concat(
      data.map(row => headers.map(field => JSON.stringify(row[field] ?? '')).join(','))
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${branch.toLowerCase()}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey]?.toString().toLowerCase() || '';
    const bVal = b[sortKey]?.toString().toLowerCase() || '';
    return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const headers = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'id') : [];

  if (loadingAuth || !db || !userId) {
    log('ListDataView is rendering the loading message.');
    return <div className="p-4 text-center text-gray-500">Loading...</div>;
  }
  
  log('ListDataView is rendering the main table.');
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{branch} Records</h2>
        <button
          onClick={handleExportCSV}
          className="flex items-center bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              {headers.map(header => (
                <th
                  key={header}
                  className="p-2 text-left cursor-pointer"
                  onClick={() => {
                    setSortKey(header);
                    setSortAsc(prev => sortKey === header ? !prev : true);
                  }}
                >
                  {header} {sortKey === header ? (sortAsc ? '▲' : '▼') : ''}
                </th>
              ))}
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map(item => (
              <tr key={item.id} className="border-t">
                {headers.map(key => (
                  <td key={key} className="p-2">
                    {editingItem?.id === item.id ? (
                      <input
                        type="text"
                        value={editingItem[key] || ''}
                        onChange={e => setEditingItem(prev => ({ ...prev, [key]: e.target.value }))}
                        className="border px-1 rounded"
                      />
                    ) : (
                     // item[key]            // STEVE - THIS CAUSES THE ERROR IF item[key] IS NOT A STRING
                      renderValue(item[key]) // STEVE - REPLACED LINE
                    )}
                  </td>
                ))}
                <td className="p-2 space-x-2">
                  {editingItem?.id === item.id ? (
                    <>
                      <button onClick={handleSaveEdit} className="text-green-600 hover:underline">Save</button>
                      <button onClick={() => setEditingItem(null)} className="text-gray-600 hover:underline">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditingItem(item)} className="text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// STEVE - YOU MUST FIRST EXPORT FirebaseProvider for LISTDataView to use it

export { FirebaseProvider };

export default ListDataView;


//This is the main entry point for your application.
//It is designed to be used with the ListDataView component, which will consume the Firebase context.   
// This file is used to wrap the main application component with Firebase context.
// It imports the FirebaseProvider from App.js and uses it to provide Firebase context to the ListDataView component.
// It allows you to use Firebase services in your application without directly importing FirebaseConfig.    