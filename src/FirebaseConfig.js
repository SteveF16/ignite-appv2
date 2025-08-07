// This file contains your specific Firebase configuration settings.
// It is kept separate from the main application logic to prevent it from being overwritten.
// 
// Steve this file contains the Firebase configuration for your project. 
// the URL to review these settings is https://console.firebase.google.com/project/ignite-appv2-data/settings/general/web:6bbbf0a28d05c3e8997493
// Make sure to keep this file secure and do not expose it in public repositories.
// If you need to update the configuration, do so here and ensure it matches your Firebase project settings.
// This file is not meant to be edited frequently, only when there are changes in Firebase settings 
// or when you set up a new Firebase project.

// Steve Commented on 08/07/2025 @ 5:00 PM


const firebaseConfig = {
  apiKey: "AIzaSyDDQS12zpURkUfZFaQunaJbpVkX5RX2Tow",        // 🔑 API Key used to connect to Firebase services
  authDomain: "ignite-appv2-data.firebaseapp.com",          // 🔐 Auth domain for your Firebase Auth UI
  projectId: "ignite-appv2-data",                           // 🏷️ Your Firebase project ID
  storageBucket: "ignite-appv2-data.firebasestorage.app",   // 📦 Where files are stored in Firebase
  messagingSenderId: "128198174698",                        // 📬 Sender ID for Firebase Cloud Messaging
  appId: "1:128198174698:web:6bbbf0a28d05c3e8997493",       // 📱 App ID for your Firebase application
  measurementId: "G-X55XM7WRM0"                             // 📊 Measurement ID for Google Analytics
};

export default firebaseConfig;
