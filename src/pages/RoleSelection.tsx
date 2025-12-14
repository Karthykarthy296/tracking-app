import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { Bus, UserCheck } from 'lucide-react';

const RoleSelection = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (userProfile?.role) {
        navigate('/', { replace: true });
    }
  }, [userProfile, navigate]);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleRoleSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName || 'User',
        role: role,
        photoURL: user.photoURL,
        createdAt: new Date().toISOString()
      });
      navigate('/');
    } catch (err: any) {
      console.error("Error saving role:", err);
      setError("Failed to save role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <UserCheck className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Complete Your Profile
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Please select your role to continue
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRoleSelection} className="space-y-6">
          <div className="space-y-4">
            <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${role === 'student' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                onClick={() => setRole('student')}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full shadow-sm">
                        <UserCheck className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Student / Parent</h3>
                        <p className="text-sm text-gray-500">I want to track school buses.</p>
                    </div>
                </div>
            </div>

            <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${role === 'driver' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                onClick={() => setRole('driver')}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full shadow-sm">
                        <Bus className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Bus Driver</h3>
                        <p className="text-sm text-gray-500">I drive the school bus.</p>
                    </div>
                </div>
            </div>
            
             <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${role === 'admin' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                onClick={() => setRole('admin')}
            >
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full shadow-sm">
                        <UserCheck className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Administrator</h3>
                        <p className="text-sm text-gray-500">Manage routes and users.</p>
                    </div>
                </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RoleSelection;
