import 
React, { useState, useContext } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseContext } from './AppWrapper';
import { LogIn } from 'lucide-react';

import { Link } from 'react-router-dom'; // Steve added for router navigation instead of hardcoded links <a>

const Login = () => {
    // We get the 'auth' object from our AppWrapper context
    const { auth } = useContext(FirebaseContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    // This function handles the form submission
    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null); // Clear previous errors

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // If successful, the onAuthStateChanged listener in AppWrapper will handle the rest.
        } catch (err) {
            console.error("Login error:", err.code, err.message);
            // Display a user-friendly error message
            if (err.code === 'auth/invalid-email' || err.code === 'auth/user-not-found') {
                setError('Invalid email or password. Please try again.');
            } else if (err.code === 'auth/wrong-password') {
                setError('Incorrect password. Please try again.');
            } else {
                setError('Failed to log in. Check your credentials and try again.');
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl space-y-6 transform transition-all duration-300 hover:scale-105">
                
                {/* Logo and Title Section */}
                <div className="flex flex-col items-center space-y-4">
                    {/* Placeholder for "Ignite Version 2" graphic */}
                    <img
                        src="https://placehold.co/150x70/2563eb/ffffff?text=Ignite+v2"
                        alt="Ignite Version 2 Logo"
                        className="rounded-lg shadow-md"
                    />
                    <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
                        Welcome Back!
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Sign in to manage your business data.
                    </p>
                </div>
                
                {/* Form Section */}
                <form onSubmit={handleLogin} className="space-y-4">
                    {/* Email Input */}
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>
                    
                    {/* Password Input */}
                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>
                    
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-100 text-red-600 p-3 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}
                    
                    {/* Login Button */}
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center space-x-2"
                    >
                        <LogIn size={20} />
                        <span>Sign In</span>
                    </button>
                </form>
                
                {/* Footer Link */}
                <div className="text-center text-sm text-gray-500">
                    Don't have an account? <Link to="/Register" className="text-blue-600 hover:underline">Register here.</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
