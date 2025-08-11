// AppWrapper.js
// Steve this is a wrapper component for the FirebaseProvider.
// It allows you to use Firebase services in your application without directly importing FirebaseConfig.    
// This file is used to wrap the main application component with Firebase context.
// It imports the FirebaseProvider from App.js and uses it to provide Firebase context to the ListDataView component.
// This is the main entry point for your application.
// It is designed to be used with the ListDataView component, which will consume the Firebase context.


//  MAINLINE PROGRAM!!
//  MAINLINE PROGRAM!!

import React from 'react';
import { FirebaseProvider } from './App'; // export it from App.js
import ListDataView from './App';

const AppWrapper = () => (
  <FirebaseProvider>
    <ListDataView branch="Customers" />
  </FirebaseProvider>
);

export default AppWrapper;


 //           await signInAnonymously(authInstance);
    //         log('Signed in anonymously.');
    //         }
    //     } catch (error) {
    //         console.error('Error initializing Firebase:', error);
    //     } finally {
    //         setLoadingAuth(false);
    //     }
    //     };
    
    //     initializeFirebase();
    // }, []);
    
    // useEffect(() => {
    //     log('Setting up auth state listener...');
    //     const unsubscribe = onAuthStateChanged(auth, user => {
    //     setCurrentUser(user);
    //     log('Auth state changed:', user ? 'User signed in' : 'No user signed in');
    //     });
    
    //     return () => {
    //     log('Cleaning up auth state listener...');
    //     unsubscribe();
    //     };
    // }, [auth]);
    
    // return (
    //     <FirebaseContext.Provider value={{ db, auth, currentUser, loadingAuth }}>
    //     {children}
    //     </FirebaseContext.Provider>
    // );
    // };