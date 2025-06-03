// frontend/src/App.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';
import KioskLayout from './components/layouts/KioskLayout';

// Public Pages
import Login from './pages/public/Login';
import Apply from './pages/public/Apply';
import ResetPassword from './pages/public/ResetPassword';
import SetPassword from './pages/public/SetPassword';

// Protected Pages - Dashboard
import AdminDashboard from './pages/admin/Dashboard';
import StaffDashboard from './pages/staff/Dashboard';

// Protected Pages - Admin
import Applications from './pages/admin/Applications';
import ApplicationDetail from './pages/admin/ApplicationDetail';
import StaffManagement from './pages/admin/StaffManagement';
import StaffDetail from './pages/admin/StaffDetail';
import Events from './pages/admin/Events';
import EventCreate from './pages/admin/EventCreate';
import EventDetail from './pages/admin/EventDetail';
import ShiftPlanning from './pages/admin/ShiftPlanning';
import TimeclockReports from './pages/admin/TimeclockReports';
import Messages from './pages/admin/Messages';
import MessageCompose from './pages/admin/MessageCompose';
import Settings from './pages/admin/Settings';
import EmailTemplates from './pages/admin/EmailTemplates';
import ActivityLog from './pages/admin/ActivityLog';

// Protected Pages - Staff
import MySchedule from './pages/staff/MySchedule';
import MyShifts from './pages/staff/MyShifts';
import EventInvitations from './pages/staff/EventInvitations';
import MyTimeclock from './pages/staff/MyTimeclock';
import MyMessages from './pages/staff/MyMessages';
import MyProfile from './pages/staff/MyProfile';

// Kiosk Mode
import KioskMode from './pages/kiosk/KioskMode';

// Components
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingScreen from './components/common/LoadingScreen';
import NotFound from './pages/NotFound';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#1C1C1E',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            borderRadius: '12px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#34C759',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#FF3B30',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes with Auth Layout */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/apply" element={<Apply />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/set-password" element={<SetPassword />} />
        </Route>

        {/* Kiosk Mode (Special Layout) */}
        <Route path="/kiosk" element={
          <KioskLayout>
            <KioskMode />
          </KioskLayout>
        } />

        {/* Protected Routes with Main Layout */}
        <Route element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          {/* Dashboard - Redirect based on role */}
          <Route path="/dashboard" element={<DashboardRouter />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            
            {/* Bewerbungen */}
            <Route path="applications" element={<Applications />} />
            <Route path="applications/:id" element={<ApplicationDetail />} />
            
            {/* Personal */}
            <Route path="staff" element={<StaffManagement />} />
            <Route path="staff/:id" element={<StaffDetail />} />
            
            {/* Veranstaltungen */}
            <Route path="events" element={<Events />} />
            <Route path="events/new" element={<EventCreate />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="events/:id/planning" element={<ShiftPlanning />} />
            
            {/* Stempeluhr */}
            <Route path="timeclock" element={<TimeclockReports />} />
            
            {/* Nachrichten */}
            <Route path="messages" element={<Messages />} />
            <Route path="messages/compose" element={<MessageCompose />} />
            
            {/* Einstellungen */}
            <Route path="settings" element={<Settings />} />
            <Route path="settings/email-templates" element={<EmailTemplates />} />
            <Route path="settings/activity-log" element={<ActivityLog />} />
          </Route>

          {/* Staff Routes */}
          <Route path="/staff" element={<ProtectedRoute />}>
            <Route index element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="dashboard" element={<StaffDashboard />} />
            
            {/* Mein Bereich */}
            <Route path="schedule" element={<MySchedule />} />
            <Route path="shifts" element={<MyShifts />} />
            <Route path="invitations" element={<EventInvitations />} />
            <Route path="timeclock" element={<MyTimeclock />} />
            <Route path="messages" element={<MyMessages />} />
            <Route path="profile" element={<MyProfile />} />
          </Route>
        </Route>

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 Page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

// Dashboard Router Component
function DashboardRouter() {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (user?.role === 'staff') {
    return <Navigate to="/staff/dashboard" replace />;
  }

  // Fallback
  return <Navigate to="/login" replace />;
}

export default App;




