// frontend/src/components/layouts/MainLayout.js
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon,
  UsersIcon,
  CalendarIcon,
  ClockIcon,
  EnvelopeIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
  DocumentTextIcon,
  MapPinIcon,
  BellIcon,
  ChartBarIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const MainLayout = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const adminNavigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
    { name: 'Bewerbungen', href: '/admin/applications', icon: DocumentTextIcon },
    { name: 'Personal', href: '/admin/staff', icon: UsersIcon },
    { name: 'Veranstaltungen', href: '/admin/events', icon: CalendarIcon },
    { name: 'Stempeluhr', href: '/admin/timeclock', icon: ClockIcon },
    { name: 'Nachrichten', href: '/admin/messages', icon: EnvelopeIcon },
    { name: 'Einstellungen', href: '/admin/settings', icon: Cog6ToothIcon },
  ];

  const staffNavigation = [
    { name: 'Dashboard', href: '/staff/dashboard', icon: HomeIcon },
    { name: 'Mein Kalender', href: '/staff/schedule', icon: CalendarIcon },
    { name: 'Meine Schichten', href: '/staff/shifts', icon: ClockIcon },
    { name: 'Einladungen', href: '/staff/invitations', icon: BellIcon },
    { name: 'Stempeluhr', href: '/staff/timeclock', icon: ChartBarIcon },
    { name: 'Nachrichten', href: '/staff/messages', icon: EnvelopeIcon },
    { name: 'Mein Profil', href: '/staff/profile', icon: UserCircleIcon },
  ];


  const navigation = isAdmin() ? adminNavigation : staffNavigation;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleKioskMode = () => {
    window.open('/kiosk', '_blank');
  };

  return (
    <div className="min-h-screen bg-ios-gray-100">
      {/* Mobile menu */}
      <div className={`fixed inset-0 z-50 lg:hidden ${mobileMenuOpen ? '' : 'pointer-events-none'}`}>
        <div 
          className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />
        <div className={`fixed inset-y-0 left-0 w-64 bg-white transform transition-transform ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex items-center justify-between p-4 border-b border-ios-gray-200">
            <h2 className="text-xl font-semibold text-ios-gray-900">Menu</h2>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-ios-gray-100"
            >
              <XMarkIcon className="h-6 w-6 text-ios-gray-600" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-ios-blue text-white'
                      : 'text-ios-gray-700 hover:bg-ios-gray-100'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            ))}
            
            {isAdmin() && (
              <>
                <div className="pt-4 mt-4 border-t border-ios-gray-200">
                  <button
                    onClick={handleKioskMode}
                    className="flex items-center space-x-3 px-3 py-2 w-full rounded-xl text-ios-gray-700 hover:bg-ios-gray-100"
                  >
                    <MapPinIcon className="h-5 w-5" />
                    <span className="font-medium">Kiosk Modus</span>
                  </button>
                </div>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white border-r border-ios-gray-200">
          {/* Logo/Header */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-ios-gray-200">
            <h1 className="text-xl font-bold text-ios-gray-900">Event Staff App</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-ios-blue text-white'
                      : 'text-ios-gray-700 hover:bg-ios-gray-100'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Admin Actions */}
          {isAdmin() && (
            <div className="p-4 border-t border-ios-gray-200">
              <button
                onClick={handleKioskMode}
                className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-ios-gray-100 rounded-xl hover:bg-ios-gray-200 transition-colors"
              >
                <MapPinIcon className="h-5 w-5 text-ios-gray-600" />
                <span className="font-medium text-ios-gray-700">Kiosk Modus</span>
              </button>
            </div>
          )}

          {/* User Profile */}
          <div className="p-4 border-t border-ios-gray-200">
            <div className="flex items-center space-x-3">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-ios-gray-300 flex items-center justify-center">
                  <UserCircleIcon className="h-6 w-6 text-ios-gray-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ios-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-ios-gray-500 truncate">
                  {user?.personalCode || user?.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-ios-gray-100"
                title="Abmelden"
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5 text-ios-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden">
        <div className="ios-nav-blur sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 h-16">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-ios-gray-100"
            >
              <Bars3Icon className="h-6 w-6 text-ios-gray-700" />
            </button>
            
            <h1 className="text-lg font-semibold text-ios-gray-900">Event Staff</h1>
            
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="p-2 rounded-lg hover:bg-ios-gray-100"
              >
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="h-6 w-6 text-ios-gray-700" />
                )}
              </button>
              
              {profileMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-ios z-20">
                    <div className="p-3 border-b border-ios-gray-200">
                      <p className="text-sm font-medium text-ios-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-ios-gray-500">
                        {user?.personalCode}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-3 py-2 text-left text-sm text-ios-gray-700 hover:bg-ios-gray-100"
                    >
                      <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                      <span>Abmelden</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;


