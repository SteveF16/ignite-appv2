// Register.js
import React, { useState, useContext } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { FirebaseContext } from './AppWrapper';
import { UserPlus } from 'lucide-react';

import { Link } from 'react-router-dom'; // Steve added for router navigation instead of hardcoded links <a>


const Register = () => {
    const { auth } = useContext(FirebaseContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            setSuccess('Account created successfully! You can now log in.');
        } catch (err) {
            console.error("Registration error:", err.code, err.message);
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Please log in.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email format.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password should be at least 6 characters.');
            } else {
                setError('Failed to register. Please try again.');
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl space-y-6 transform transition-all duration-300 hover:scale-105">

                {/* Logo and Title Section */}
                <div className="flex flex-col items-center space-y-4">
                    <img
                        src="https://placehold.co/150x70/2563eb/ffffff?text=Ignite+v2"
                        alt="Ignite Version 2 Logo"
                        className="rounded-lg shadow-md"
                    />
                    <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
                        Create Your Account
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Sign up to start managing your business data.
                    </p>
                </div>

                {/* Form Section */}
                <form onSubmit={handleRegister} className="space-y-4">
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

                    <div>
                        <label className="text-sm font-medium text-gray-600 block mb-1">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-100 text-red-600 p-3 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-100 text-green-600 p-3 rounded-lg text-sm text-center">
                            {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center space-x-2"
                    >
                        <UserPlus size={20} />
                        <span>Register</span>
                    </button>
                </form>

                {/* Footer Link */}
                <div className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link to="/Login" className="text-blue-600 hover:underline">Log in here.</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
