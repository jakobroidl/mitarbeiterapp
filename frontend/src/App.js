import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoadingScreen from './components/common/LoadingScreen';
import { Toaster } from 'react-hot-toast';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Applications from './pages//admin/Applications';
import Events from './pages/Events';
import Staff from './pages/Staff';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Knowledge from './pages/Knowledge';
import Settings from './pages/Settings';
import Apply from './pages/public/Apply';
import StaffManagement from './pages/admin/StaffManagement';

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, isAdmin } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  const { loading, user } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#34C759',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#FF3B30',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/apply" element={<Apply />} />
        </Route>

        {/* Protected Routes with Layout */}
        <Route element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/knowledge" element={<Knowledge />} />
          
          {/* Admin Routes */}
          <Route path="/admin/applications" element={
            <ProtectedRoute requireAdmin>
              <Applications />
            </ProtectedRoute>
          } />
          <Route path="/admin/staff" element={
            <ProtectedRoute requireAdmin>
              <StaffManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute requireAdmin>
              <Settings />
            </ProtectedRoute>
          } />
        </Route>

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 404 */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gray-300">404</h1>
              <p className="mt-2 text-lg text-gray-600">Seite nicht gefunden</p>
              <a href="/" className="mt-4 inline-block bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors">
                Zur Startseite
              </a>
            </div>
          </div>
        } />
      </Routes>
    </>
  );
}

export default App;
