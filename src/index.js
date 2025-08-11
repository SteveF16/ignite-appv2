import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// STEVE - commented the App startup to wrap it in FirebaseProvider
import AppWrapper from './AppWrapper';  // Use AppWrapper to provide Firebase context
//import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>


    <AppWrapper />  {/* STEVE - Use AppWrapper to provide Firebase context */}
    {/* <App /> */}  {/* STEVE - Uncomment this line if you want to use the App directly without Firebase context */}
    


  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
