import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';


const StatCard = ({ title, value, subtitle, color, icon }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`${colorClasses[color]} p-3 rounded-xl text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const QuickAction = ({ title, description, href, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 hover:bg-green-100',
    purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
    orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
  };

  return (
    <Link
      to={href}
      className={`block p-6 rounded-2xl transition-all duration-200 ${colorClasses[color]}`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{icon}</div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm opacity-80">{description}</p>
        </div>
      </div>
    </Link>
  );
};

const Dashboard = () => {
  const { user, isAdmin } = useAuth();

  const stats = [
    {
      title: 'Kommende Events',
      value: '3',
      subtitle: 'Diese Woche',
      color: 'blue',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Offene Bewerbungen',
      value: '12',
      subtitle: '+3 heute',
      color: 'green',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      title: 'Aktive Mitarbeiter',
      value: '48',
      subtitle: '5 online',
      color: 'purple',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      title: 'Stunden diese Woche',
      value: '156',
      subtitle: '32 Mitarbeiter',
      color: 'orange',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const quickActions = [
    {
      title: 'Neue Veranstaltung',
      description: 'Event erstellen und Mitarbeiter einladen',
      href: '/admin/events/new',
      color: 'blue',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
    },
    {
      title: 'Bewerbungen prüfen',
      description: '12 neue Bewerbungen warten',
      href: '/admin/applications',
      color: 'green',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
  ];

  const recentActivity = [
    { id: 1, type: 'application', text: 'Neue Bewerbung von Max Mustermann', time: 'vor 5 Minuten' },
    { id: 2, type: 'event', text: 'Veranstaltung "Sommerfest 2024" wurde erstellt', time: 'vor 2 Stunden' },
    { id: 3, type: 'staff', text: 'Anna Schmidt hat sich für eine Schicht angemeldet', time: 'vor 3 Stunden' },
    { id: 4, type: 'message', text: 'Neue Nachricht im Team-Chat', time: 'vor 5 Stunden' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-8 text-white">
        <h1 className="text-3xl font-bold">
          Willkommen zurück, {user?.firstName || 'Admin'}!
        </h1>
        <p className="mt-2 text-blue-100">
          {new Date().toLocaleDateString('de-DE', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Stats Grid - Only for Admin */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
      )}

      {/* Quick Actions - Only for Admin */}
      {isAdmin && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Schnellaktionen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <QuickAction key={index} {...action} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Letzte Aktivitäten</h2>
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div className="ml-4 flex-1">
                <p className="text-sm text-gray-900">{activity.text}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Dashboard */}
      {!isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Meine nächsten Schichten</h2>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="font-semibold text-gray-900">Stadtfest 2024</p>
                <p className="text-sm text-gray-600">Sa, 15.06.2024 - 14:00 bis 22:00 Uhr</p>
                <p className="text-sm text-blue-600 mt-1">Bar-Service</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="font-semibold text-gray-900">Konzert im Park</p>
                <p className="text-sm text-gray-600">So, 16.06.2024 - 16:00 bis 23:00 Uhr</p>
                <p className="text-sm text-blue-600 mt-1">Einlasskontrolle</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Statistiken</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Stunden diesen Monat</span>
                <span className="font-semibold">32h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Abgeschlossene Events</span>
                <span className="font-semibold">8</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Bewertung</span>
                <span className="font-semibold">⭐ 4.8</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
