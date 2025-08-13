// Steve, this is the LogoutButton component that allows users to log out of the application.
// It uses Firebase's signOut function to log the user out.
// src/LogoutButton.js  
// This component will be used in the AppWrapper to provide a logout functionality.


import React, { useContext } from 'react';
import { FirebaseContext } from './AppWrapper';

export default function LogoutButton() {
  const { auth } = useContext(FirebaseContext);

  return <button onClick={() => auth.signOut()}>Logout</button>;
}
