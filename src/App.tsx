import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import RoleSelection from './pages/RoleSelection';
import Unauthorized from './pages/Unauthorized';
import AdminDashboard from './pages/AdminDashboard';
import DriverDashboard from './pages/DriverDashboard';
import StudentDashboard from './pages/StudentDashboard';
import RouteManager from './components/Admin/RouteManager';
import StudentManager from './components/Admin/StudentManager';
import DriverManager from './components/Admin/DriverManager';
import VanManager from './components/Admin/VanManager';
import LiveTracking from './components/Admin/LiveTracking';
const HomeRedirect = () => {
  const { user, userProfile, loading } = useAuth();
  
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  
  if (!user) return <Navigate to="/login" replace />;
  if (!userProfile) return <Navigate to="/role-selection" replace />;
  
  switch (userProfile.role) {
    case 'admin': return <Navigate to="/admin" replace />;
    case 'driver': return <Navigate to="/driver" replace />;
    case 'student': return <Navigate to="/student" replace />;
    default: return <Navigate to="/role-selection" replace />;
  }
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/role-selection" element={<RoleSelection />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          <Route path="/" element={<HomeRedirect />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          >
             <Route index element={<Navigate to="routes" replace />} />
             <Route path="routes" element={<RouteManager />} />
             <Route path="students" element={<StudentManager />} />
             <Route path="drivers" element={<DriverManager />} />
             <Route path="vans" element={<VanManager />} />
             <Route path="tracking" element={<LiveTracking />} />
          </Route>
          
          <Route
            path="/driver/*"
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/student/*"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
