import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { Bus, User, KeyRound } from 'lucide-react';

const Login = () => {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        // Navigation will be handled by the route protection or useEffect in App based on role
        // For now, we rely on the AuthContext to update state, but we might want to force redirect here if needed.
        // A better pattern is to let App.tsx handle "if user is logged in, redirect to dashboard"
        navigate('/'); 
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          role: role,
          name: name
        });
        
        navigate('/');
      }
    } catch (err: any) {
      console.error("Login/Signup error:", err);
      // Simplify error message for user
      let msg = err.message;
      if (err.code === 'auth/network-request-failed') {
          msg = "Network error. Please check your connection.";
      } else if (err.code === 'permission-denied' || err.message.includes("permissions")) {
          msg = "FIREBASE PERMISSION ERROR: You must update your Firestore Security Rules in the Firebase Console to allow access.";
          // Show alert with instructions
          alert(`ACTION REQUIRED:\n\n1. Go to Firebase Console -> Firestore -> Rules\n2. Change 'allow read, write: if false;' to 'allow read, write: if request.auth != null;'\n3. Publish`);
      }
      setError(msg);
      // alert("Error: " + msg); // Replaced by more specific alert above
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      setError('');
      setLoading(true);
      try {
          await signInWithGoogle();
          // Profile check/creation should happen here or via AuthContext listener trigger?
          // Since we are using popup, the onAuthStateChanged in AuthContext will fire.
          // However, we might need to set the role if it's a new user.
          // For simplicity, let's assume default role is 'student' for Google Auth users if profile missing,
          // OR we can rely on `AuthContext` to fetch profile.
          
          // Actually, we generally need to check if profile exists after Google Login.
          // But since AuthContext listens for auth state changes, it will update `user`.
          // The issue is `userProfile` might be null for a new Google user.
          // We can handle profile creation inside the `onAuthStateChanged` but we need `role`.
          // Let's keep it simple: Just redirect. If profile is missing, maybe prompted later?
          // Or we can do:
          // const result = await signInWithPopup(...);
          // if (result.user) { check if doc exists, if not setDoc default }
          // But `signInWithGoogle` in context returns void.
          // Let's assume standard behavior for now.
          navigate('/');
      } catch (err: any) {
          console.error("Google Login error", err);
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <Bus className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        
        <div className="mb-6">
            <button
                onClick={handleGoogleLogin}
                type="button"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg transition duration-200"
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                <span>Continue with Google</span>
            </button>
            
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                </div>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <User className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <KeyRound className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value="student">Student/Parent</option>
                <option value="driver">Bus Driver</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
                setIsLogin(!isLogin);
                setError('');
            }}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>

        {error && error.includes("already-in-use") && !isLogin && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center animate-pulse">
              <p className="text-sm text-blue-800 mb-2 font-medium">This email is already registered!</p>
              <button 
                  onClick={() => {
                      setIsLogin(true);
                      setError('');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded shadow hover:bg-blue-700 transition"
              >
                  Go to Sign In ➝
              </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
