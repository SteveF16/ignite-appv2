import React, { useState, useContext } from 'react';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { FirebaseContext } from './AppWrapper';
import { UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const Register = () => {
    const { auth, db } = useContext(FirebaseContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [inviteCode, setInviteCode] = useState(''); // NEW (optional)
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            // ✅ Optional: silently clear any stale session
            await signOut(auth);

            // ✅ Create a new user account
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const user = cred.user;

             // ✅ Join existing tenant if inviteCode provided; otherwise create a new tenant
             const tenantId = inviteCode.trim() ? inviteCode.trim() : uuidv4();
             await setDoc(doc(db, 'users', user.uid), {
               tenantId,
               email: user.email || email,
               createdAt: new Date(),
             });

             setSuccess('Account created successfully!');
             // Already signed in; go straight to the app
             navigate('/app');
            

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
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-800">Create an Account</h1>
                    <p className="mt-2 text-gray-500">Join Ignite today.</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Invite Code (optional)</label>
                        <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="Enter company code to join an existing tenant"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave blank to create a new company.</p>
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

                <div className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link to="/" className="text-blue-600 hover:underline">Log in here.</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;