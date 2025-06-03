import React, { useState, useEffect } from 'react';
import {useNavigate} from 'react-router-dom';

const navigate =useNavigate();

// Mock Auth Hook
const useAuth = () => ({
  user: { firstName: 'Admin' },
  isAdmin: true
});

// Mock API
const api = {
  get: async (url) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (url.includes('/dashboard/overview')) {
      return {
        data: {
          stats: {
            pendingApplications: 12,
            upcomingEvents: 8,
            activeStaff: 45,
            todayStamps: 32
          },
          upcomingEvents: [
            { id: 1, name: 'Sommerfest 2024', location: 'Stadtpark München', start_date: new Date().toISOString(), accepted_count: 15, invitation_count: 20 },
            { id: 2, name: 'Konzert Open Air', location: 'Olympiastadion', start_date: new Date(Date.now() + 86400000).toISOString(), accepted_count: 25, invitation_count: 30 },
            { id: 3, name: 'Food Festival', location: 'Marienplatz', start_date: new Date(Date.now() + 172800000).toISOString(), accepted_count: 10, invitation_count: 15 }
          ],
          recentApplications: [
            { id: 1, first_name: 'Max', last_name: 'Mustermann', created_at: new Date().toISOString() },
            { id: 2, first_name: 'Anna', last_name: 'Schmidt', created_at: new Date(Date.now() - 3600000).toISOString() },
            { id: 3, first_name: 'Tom', last_name: 'Weber', created_at: new Date(Date.now() - 7200000).toISOString() }
          ]
        }
      };
    }
    
    if (url.includes('/dashboard/activity')) {
      return {
        data: {
          activities: [
            { type: 'application', title: 'Neue Bewerbung von Max Mustermann', created_at: new Date().toISOString() },
            { type: 'event', title: 'Event "Sommerfest 2024" erstellt', created_at: new Date(Date.now() - 1800000).toISOString() },
            { type: 'shift_assignment', title: 'Schichtzuteilung für Konzert', created_at: new Date(Date.now() - 3600000).toISOString() }
          ]
        }
      };
    }
  }
};

// Format date function
const formatDate = (dateString, format = 'date') => {
  const date = new Date(dateString);
  if (format === 'time') {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  if (format === 'datetime') {
    return date.toLocaleString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return date.toLocaleDateString('de-DE');
};

// Icon Components
const CalendarIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ClockIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserGroupIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ClipboardIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const PlusIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ChartBarIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const BellIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const CogIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const DocumentIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CurrencyIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const InboxIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
  </svg>
);

const ArrowUpIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const ArrowDownIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/overview');
      setStats(response.data.stats);
      setUpcomingEvents(response.data.upcomingEvents || []);
      setRecentApplications(response.data.recentApplications || []);
      
      const activityResponse = await api.get('/dashboard/activity');
      setRecentActivity(activityResponse.data.activities || []);
      
      setNotifications([
        { id: 1, type: 'application', message: '3 neue Bewerbungen', urgent: true },
        { id: 2, type: 'event', message: 'Event morgen: Sommerfest', urgent: false },
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, change, color }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      orange: 'from-orange-500 to-orange-600',
      purple: 'from-purple-500 to-purple-600',
    };

    return (
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group cursor-pointer">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`bg-gradient-to-br ${colorClasses[color]} p-3 rounded-lg`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            {change !== undefined && (
              <div className="flex items-center space-x-1">
                {change > 0 ? (
                  <ArrowUpIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
              </div>
            )}
          </div>
          <h3 className="text-sm text-gray-600">{title}</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="px-6 py-3 bg-gray-50 group-hover:bg-gray-100 transition-colors">
          <span className="text-xs text-gray-600">Details ansehen →</span>
        </div>
      </div>
    );
  };

  const QuickAction = ({ icon: Icon, label, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      green: 'bg-green-50 text-green-600 hover:bg-green-100',
      orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
      purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
    };

    return (
      <button className={`flex flex-col items-center p-4 rounded-lg ${colorClasses[color]} transition-colors cursor-pointer`}>
        <Icon className="h-8 w-8 mb-2" />
        <span className="text-xs font-medium text-center">{label}</span>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-2 text-gray-600">Dashboard wird geladen...</p>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="space-y-6">
        {/* Kompakter Header mit wichtigen Infos */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Guten Tag, {user?.firstName}!</h1>
              <p className="text-blue-100 text-sm">
                {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {notifications.map(notif => (
                <div key={notif.id} className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
                  notif.urgent ? 'bg-red-500' : 'bg-white/20'
                }`}>
                  <BellIcon className="h-4 w-4" />
                  <span className="text-sm">{notif.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions - Kompakt oben */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <QuickAction icon={PlusIcon} label="Neues Event" color="green" />
          <QuickAction icon={UserGroupIcon} label="Mitarbeiter" color="blue" />
          <QuickAction icon={ClipboardIcon} label="Bewerbungen" color="orange" />
          <QuickAction icon={CalendarIcon} label="Events" color="purple" />
          <QuickAction icon={ClockIcon} label="Stempeluhr" color="blue" />
          <QuickAction icon={ChartBarIcon} label="Berichte" color="green" />
          <QuickAction icon={DocumentIcon} label="Vorlagen" color="orange" />
          <QuickAction icon={CogIcon} label="Einstellungen" color="purple" />
        </div>

        {/* Stats Grid - Kompakt */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={ClipboardIcon}
              title="Offene Bewerbungen"
              value={stats.pendingApplications}
              change={12}
              color="orange"
            />
            <StatCard
              icon={CalendarIcon}
              title="Kommende Events"
              value={stats.upcomingEvents}
              change={8}
              color="green"
            />
            <StatCard
              icon={UserGroupIcon}
              title="Aktive Mitarbeiter"
              value={stats.activeStaff}
              change={3}
              color="blue"
            />
            <StatCard
              icon={ClockIcon}
              title="Stunden heute"
              value={`${stats.todayStamps}h`}
              change={-5}
              color="purple"
            />
          </div>
        )}

        {/* Main Content - 2 Spalten Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Linke Spalte - Events & Bewerbungen */}
          <div className="lg:col-span-2 space-y-6">
            {/* Kommende Events */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Kommende Veranstaltungen</h2>
                  <button className="text-sm text-blue-600 hover:text-blue-700">
                    Alle anzeigen →
                  </button>
                </div>
              </div>
              <div className="p-4">
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className="block p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{event.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{event.location}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center">
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                {formatDate(event.start_date)}
                              </span>
                              <span className="flex items-center">
                                <UserGroupIcon className="h-3 w-3 mr-1" />
                                {event.accepted_count || 0}/{event.invitation_count || 0}
                              </span>
                            </div>
                          </div>
                          {new Date(event.start_date).toDateString() === new Date().toDateString() && (
                            <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
                              Heute
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600">Keine kommenden Veranstaltungen</p>
                    <button className="mt-3 inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Event erstellen
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Neueste Bewerbungen */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Neueste Bewerbungen</h2>
                  <button className="text-sm text-blue-600 hover:text-blue-700">
                    Alle anzeigen →
                  </button>
                </div>
              </div>
              <div className="p-4">
                {recentApplications && recentApplications.length > 0 ? (
                  <div className="space-y-3">
                    {recentApplications.slice(0, 5).map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold">
                            {app.first_name?.[0]}{app.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {app.first_name} {app.last_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(app.created_at, 'datetime')}
                            </p>
                          </div>
                        </div>
                        <button className="px-3 py-1 text-sm font-medium text-orange-600 bg-orange-100 rounded-lg hover:bg-orange-200">
                          Prüfen
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">Keine neuen Bewerbungen</p>
                )}
              </div>
            </div>
          </div>

          {/* Rechte Spalte - Aktivitäten & Quick Stats */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Heute</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Neue Bewerbungen</span>
                  <span className="font-semibold text-gray-900">3</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Angemeldete Mitarbeiter</span>
                  <span className="font-semibold text-gray-900">24</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Geleistete Stunden</span>
                  <span className="font-semibold text-gray-900">186h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Offene Anfragen</span>
                  <span className="font-semibold text-orange-600">7</span>
                </div>
              </div>
            </div>

            {/* Letzte Aktivitäten */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Letzte Aktivitäten</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {recentActivity.slice(0, 8).map((activity, index) => (
                  <div key={index} className="px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {activity.type === 'application' && (
                          <div className="p-1.5 bg-orange-100 rounded">
                            <ClipboardIcon className="h-3 w-3 text-orange-600" />
                          </div>
                        )}
                        {activity.type === 'event' && (
                          <div className="p-1.5 bg-green-100 rounded">
                            <CalendarIcon className="h-3 w-3 text-green-600" />
                          </div>
                        )}
                        {activity.type === 'shift_assignment' && (
                          <div className="p-1.5 bg-blue-100 rounded">
                            <ClockIcon className="h-3 w-3 text-blue-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(activity.created_at, 'time')} Uhr
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Staff Dashboard
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">
          Willkommen zurück, {user?.firstName}!
        </h1>
        <p className="mt-1 text-blue-100">
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Meine nächsten Einsätze</h2>
          <div className="space-y-3">
            <p className="text-gray-500 text-center py-4">Keine bestätigten Einsätze</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Meine Statistiken</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Stunden diesen Monat</span>
              <span className="font-semibold text-gray-900">32h</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Abgeschlossene Events</span>
              <span className="font-semibold text-gray-900">8</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Offene Einladungen</span>
              <span className="font-semibold text-gray-900">2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
