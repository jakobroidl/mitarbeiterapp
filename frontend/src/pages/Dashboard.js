import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
  ChartBarIcon,
  BellIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/overview');
      setStats(response.data.stats);
      setUpcomingEvents(response.data.upcomingEvents || []);
      setRecentApplications(response.data.recentApplications || []);
      
      // Fetch recent activity
      const activityResponse = await api.get('/dashboard/activity');
      setRecentActivity(activityResponse.data.activities || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const QuickActionCard = ({ to, icon: Icon, title, count, color = 'blue', trend }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      orange: 'bg-orange-500',
      purple: 'bg-purple-500',
      red: 'bg-red-500',
    };

    const bgColorClasses = {
      blue: 'bg-blue-50 hover:bg-blue-100',
      green: 'bg-green-50 hover:bg-green-100',
      orange: 'bg-orange-50 hover:bg-orange-100',
      purple: 'bg-purple-50 hover:bg-purple-100',
      red: 'bg-red-50 hover:bg-red-100',
    };

    return (
      <Link
        to={to}
        className={`block p-6 rounded-xl ${bgColorClasses[color]} transition-all duration-200 hover:shadow-md relative overflow-hidden group`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className={`inline-flex p-2 rounded-lg ${colorClasses[color]} bg-opacity-10 mb-4`}>
              <Icon className={`h-6 w-6 text-${color}-600`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <div className="mt-2 flex items-baseline">
              <p className="text-3xl font-bold text-gray-900">{count}</p>
              {trend !== undefined && (
                <span className={`ml-2 text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              )}
            </div>
          </div>
          <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>
    );
  };

  const EventCard = ({ event }) => {
    const isToday = new Date(event.start_date).toDateString() === new Date().toDateString();
    const isSoon = new Date(event.start_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    return (
      <Link
        to={`/events/${event.id}`}
        className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all duration-200"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 line-clamp-1">{event.name}</h4>
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{event.location}</p>
          </div>
          {isToday && (
            <span className="ml-2 px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
              Heute
            </span>
          )}
          {!isToday && isSoon && (
            <span className="ml-2 px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded-full">
              Bald
            </span>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            {format(new Date(event.start_date), 'dd.MM.yyyy', { locale: de })}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            {format(new Date(event.start_date), 'HH:mm', { locale: de })} - 
            {format(new Date(event.end_date), 'HH:mm', { locale: de })} Uhr
          </div>
          
          {isAdmin && (
            <div className="pt-2 mt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  <UserGroupIcon className="h-4 w-4 inline mr-1" />
                  {event.accepted_count || 0}/{event.invitation_count || 0}
                </span>
                <span className="text-gray-600">
                  {event.shift_count || 0} Schichten
                </span>
              </div>
            </div>
          )}
        </div>
      </Link>
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

  // Admin Dashboard
  if (isAdmin) {
    return (
      <div className="space-y-6">
        {/* Kompakter Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Guten Tag, {user?.firstName}!</h1>
              <p className="text-blue-100 mt-1">
                {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <Link
              to="/admin/events/new"
              className="bg-white bg-opacity-20 backdrop-blur hover:bg-opacity-30 px-4 py-2 rounded-lg flex items-center space-x-2 transition-all"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Neues Event</span>
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionCard
              to="/admin/applications"
              icon={ClipboardDocumentListIcon}
              title="Offene Bewerbungen"
              count={stats.pendingApplications}
              color="orange"
              trend={12}
            />
            <QuickActionCard
              to="/events"
              icon={CalendarIcon}
              title="Aktive Events"
              count={stats.upcomingEvents}
              color="green"
              trend={8}
            />
            <QuickActionCard
              to="/admin/staff"
              icon={UserGroupIcon}
              title="Mitarbeiter"
              count={stats.activeStaff}
              color="blue"
            />
            <QuickActionCard
              to="/admin/reports"
              icon={ChartBarIcon}
              title="Stunden heute"
              count={stats.todayStamps}
              color="purple"
              trend={-3}
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Events Section - 2 Spalten */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Kommende Veranstaltungen</h2>
              <Link to="/events" className="text-sm text-blue-600 hover:text-blue-700">
                Alle anzeigen →
              </Link>
            </div>
            
            {upcomingEvents.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {upcomingEvents.slice(0, 4).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Keine kommenden Veranstaltungen</p>
                <Link
                  to="/admin/events/new"
                  className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Event erstellen
                </Link>
              </div>
            )}
          </div>

          {/* Activity Feed - 1 Spalte */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Letzte Aktivitäten</h2>
              <Link to="/admin/activity" className="text-sm text-blue-600 hover:text-blue-700">
                Alle →
              </Link>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {activity.type === 'application' && (
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <ClipboardDocumentListIcon className="h-4 w-4 text-orange-600" />
                        </div>
                      )}
                      {activity.type === 'event' && (
                        <div className="p-2 bg-green-100 rounded-lg">
                          <CalendarIcon className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                      {activity.type === 'shift_assignment' && (
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <ClockIcon className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(activity.created_at), 'HH:mm', { locale: de })} Uhr
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {recentActivity.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <BellIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Keine neuen Aktivitäten</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            to="/admin/applications"
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all text-center"
          >
            <ClipboardDocumentListIcon className="h-8 w-8 mx-auto text-orange-500 mb-2" />
            <span className="text-sm font-medium text-gray-900">Bewerbungen</span>
          </Link>
          <Link
            to="/admin/staff"
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all text-center"
          >
            <UserGroupIcon className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <span className="text-sm font-medium text-gray-900">Mitarbeiter</span>
          </Link>
          <Link
            to="/admin/reports"
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all text-center"
          >
            <ChartBarIcon className="h-8 w-8 mx-auto text-purple-500 mb-2" />
            <span className="text-sm font-medium text-gray-900">Berichte</span>
          </Link>
          <Link
            to="/admin/settings"
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all text-center"
          >
            <CogIcon className="h-8 w-8 mx-auto text-gray-500 mb-2" />
            <span className="text-sm font-medium text-gray-900">Einstellungen</span>
          </Link>
        </div>
      </div>
    );
  }

  // Staff Dashboard (Standard)
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">
          Willkommen zurück, {user?.firstName}!
        </h1>
        <p className="mt-1 text-blue-100">
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Staff Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* My Upcoming Events */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Meine nächsten Einsätze</h2>
          <div className="space-y-3">
            {upcomingEvents.filter(e => e.my_status === 'confirmed').slice(0, 3).map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <p className="font-medium text-gray-900">{event.name}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {format(new Date(event.start_date), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
                </p>
              </Link>
            ))}
            
            {upcomingEvents.filter(e => e.my_status === 'confirmed').length === 0 && (
              <p className="text-gray-500 text-center py-4">Keine bestätigten Einsätze</p>
            )}
          </div>
        </div>

        {/* Statistics */}
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

// Icon Component for Cog
const CogIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default Dashboard;
