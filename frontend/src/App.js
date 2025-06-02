import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Events from './pages/Events';
import Messages from './pages/Messages';
import Knowledge from './pages/Knowledge';
import TimeStamps from './pages/TimeStamps'; // Korrigierter Import
import KioskMode from './pages/KioskMode';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminEvents from './pages/admin/AdminEvents';
import AdminMessages from './pages/admin/AdminMessages';
import AdminKnowledge from './pages/admin/AdminKnowledge';
import AdminTimeStamps from './pages/admin/AdminTimeStamps';
import AdminSettings from './pages/admin/AdminSettings';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            
            {/* Kiosk Mode - Public */}
            <Route path="/kiosk" element={<KioskMode />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="events" element={<Events />} />
              <Route path="messages" element={<Messages />} />
              <Route path="knowledge" element={<Knowledge />} />
              <Route path="timestamps" element={<TimeStamps />} />
              
              {/* Admin Routes */}
              <Route path="admin" element={
                <ProtectedRoute adminOnly={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="admin/users" element={
                <ProtectedRoute adminOnly={true}>
                  <AdminUsers />
                </ProtectedRoute>
              } />
              <Route path="admin/events" element={
                <ProtectedRoute adminOnly={true}>
                  <AdminEvents />
                </ProtectedRoute>
              } />
              <Route path="admin/messages" element={
                <ProtectedRoute adminOnly={true}>
                  <AdminMessages />
                </ProtectedRoute>
              } />
              <Route path="admin/knowledge" element={
                <ProtectedRoute adminOnly={true}>
                  <AdminKnowledge />
                </ProtectedRoute>
              } />
              <Route path="admin/timestamps" element={
                <ProtectedRoute adminOnly={true}>
                  <AdminTimeStamps />
                </ProtectedRoute>
              } />
              <Route path="admin/settings" element={
                <ProtectedRoute adminOnly={true}>
                  <AdminSettings />
                </ProtectedRoute>
              } />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
