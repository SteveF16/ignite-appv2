// Steve, this is the LogoutButton component that allows users to log out of the application.
// It uses Firebase's signOut function to log the user out.
// src/LogoutButton.js  
// This component will be used in the AppWrapper to provide a logout functionality.


import React from 'react';
import { LogOut } from 'lucide-react';

const LogoutButton = ({ onSignOut }) => {
  return (
    <button
      onClick={onSignOut}
      className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-red-400 hover:bg-gray-700 transition-colors"
    >
      <LogOut size={20} className="mr-3" />
      Sign Out
    </button>
  );
};

export default LogoutButton;