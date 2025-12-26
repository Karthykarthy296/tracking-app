import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { UserRole, UserProfile } from '../types';
import { Bus, User, Lock, Mail, ArrowRight } from 'lucide-react';
import bgImage from '../assets/background.png';

const Login = () => {
  useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(''); // This will hold either Email or ID
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Map ID to internal email format
  const getInternalEmail = (input: string, targetRole: UserRole) => {
    if (targetRole === 'admin') return input;
    // Map IDs to specific domains to prevent collisions and satisfy Firebase email requirement
    return `${input.trim().toLowerCase()}@${targetRole}.system`;
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check existing profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (userDoc.exists()) {
        const profile = userDoc.data() as UserProfile;
        // Verify they are indeed an admin
        if (profile.role !== 'admin') {
          await auth.signOut();
          throw new Error(`This Google account is registered as a ${profile.role}, not an Administrator.`);
        }
      } else {
        // New user signing in with Google from Admin tab - auto-assign Admin role
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          role: 'admin',
          name: user.displayName || 'Admin User',
          createdAt: new Date().toISOString()
        });
      }
      navigate('/');
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const internalEmail = getInternalEmail(email, role);

      // Validation
      if (role === 'admin') {
        if (!email.includes('@')) {
          throw new Error("Administrators must log in with their email address.");
        }
      } else {
        if (email.includes('@')) {
          throw new Error(`Please use your ${role === 'driver' ? 'Driver ID' : 'User ID'} instead of an email.`);
        }
      }

      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, internalEmail, password);
        const user = userCredential.user;

        // Prevent cross-role access: Check actual role in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          if (profile.role !== role) {
            await auth.signOut();
            throw new Error(`This account is registered as a ${profile.role}, not a ${role}. Access denied.`);
          }
        }
        navigate('/');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, internalEmail, password);
        const user = userCredential.user;

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: internalEmail,
          role: role,
          name: name,
          createdAt: new Date().toISOString()
        });

        navigate('/');
      }
    } catch (err: any) {
      console.error("Login/Signup error:", err);
      let msg = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = "Invalid credentials for the selected role.";
      } else if (err.code === 'auth/network-request-failed') {
        msg = "Network error. Please check your connection.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${bgImage})` }}>
      {/* Background Overlay */}
      <div className="absolute inset-0 z-0 bg-slate-900/75 backdrop-blur-sm"></div>

      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8 relative z-10 animate-fade-in-up">
        <div className="flex justify-center mb-8">
          <div className="bg-gradient-to-tr from-blue-600 to-violet-600 p-4 rounded-2xl shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
            <Bus className="w-10 h-10 text-white" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-tight">
          {isLogin ? 'Welcome Back' : 'Get Started'}
        </h2>
        <p className="text-center text-slate-300 mb-8 text-sm">
          {isLogin ? 'Sign in to access your dashboard' : 'Create a new account to start tracking'}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            {error}
          </div>
        )}


        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role Selection - Now always visible */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wide">I am a...</label>
            <div className="grid grid-cols-2 gap-2">
              {/* Only show Student and Driver during registration; show all 3 during login */}
              {(isLogin ? ['student', 'driver', 'admin'] : ['student', 'driver']).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r as UserRole);
                    setError('');
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all border ${role === r
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/50'
                    }`}
                >
                  {r === 'student' ? 'Student' : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wide">Full Name</label>
              <div className="relative group">
                <User className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 transition-colors group-focus-within:text-blue-400" />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wide">
              {role === 'admin' ? 'Email Address' : role === 'driver' ? 'Driver ID' : 'Student/Parent ID'}
            </label>
            <div className="relative group">
              {role === 'admin' ? (
                <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 transition-colors group-focus-within:text-blue-400" />
              ) : (
                <User className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 transition-colors group-focus-within:text-blue-400" />
              )}
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500"
                placeholder={role === 'admin' ? "admin@email.com" : "Enter your ID"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wide">Password</label>
            <div className="relative group">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-3.5 transition-colors group-focus-within:text-blue-400" />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300 shadow-lg shadow-blue-900/20 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? 'Processing...' : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {role === 'admin' && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/50"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#1e293b] px-2 text-slate-500 font-bold tracking-widest">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
            </>
          )}
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              if (role === 'admin') setRole('student');
              setError('');
            }}
            className="text-white hover:text-blue-400 font-bold transition-colors ml-1"
          >
            {isLogin ? 'Sign up now' : 'Sign in'}
          </button>
        </div>

        {error && error.includes("already-in-use") && !isLogin && (
          <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl text-center backdrop-blur-sm animate-pulse">
            <p className="text-sm text-blue-200 mb-3 font-medium">This ID is already registered!</p>
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow transition-colors"
            >
              Go to Sign In &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
