import React, { useState, useContext } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth"; // inline-review: drop unused getAuth to satisfy no-unused-vars
import { FirebaseContext } from "./AppWrapper";
import { LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const { auth } = useContext(FirebaseContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // 🔄 Force a clean login session (silent logout)
      await signOut(auth);
      console.error("Forced signoff auth = ", auth);

      // ✅ Proceed with login
      await signInWithEmailAndPassword(auth, email, password);

      // 🚀 Navigate to app on success
      navigate("/app");
    } catch (err) {
      console.error("Login error:", err.code, err.message);
      if (
        err.code === "auth/invalid-email" ||
        err.code === "auth/user-not-found"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else {
        setError("Failed to log in. Check your credentials and try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Sign In to Ignite
          </h1>
          <p className="mt-2 text-gray-500">Welcome back!</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              // STEVE remove this next line to disable autocomplete of password!!!
              // STEVE remove this next line to disable autocomplete of password!!!
              autoComplete="current-password"
              // inline-review: add autoComplete to satisfy jsx-a11y/no-autofocus

              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-100 text-red-600 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center space-x-2"
          >
            <LogIn size={20} />
            <span>Sign In</span>
          </button>
        </form>
        <div className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link to="/Register" className="text-blue-600 hover:underline">
            Register here.
          </Link>
        </div>{" "}
        {/* inline-review: escape apostrophe to satisfy react/no-unescaped-entities */}
      </div>
    </div>
  );
};

export default Login;
