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
  BellIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/overview');
      setStats(response.data.stats);
      setUpcomingEvents(response.data.upcomingEvents);
      setRecentMessages(response.data.recentMessages);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const QuickAction = ({ to, icon: Icon, title, description, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-ios-blue text-white',
      green: 'bg-ios-green text-white',
      orange: 'bg-ios-orange text-white',
      purple: 'bg-ios-purple text-white',
    };

    return (
      <Link
        to={to}
        className="ios-card p-6 hover:shadow-ios-lg transition-shadow duration-200"
      >
        <div className="flex items-start">
          <div className={`rounded-xl p-3 ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-semibold text-ios-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-ios-gray-600">{description}</p>
          </div>
          <ArrowRightIcon className="h-5 w-5 text-ios-gray-400" />
        </div>
      </Link>
    );
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-ios-blue',
      green: 'bg-green-50 text-ios-green',
      orange: 'bg-orange-50 text-ios-orange',
      red: 'bg-red-50 text-ios-red',
    };

    return (
      <div className="ios-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ios-gray-600">{title}</p>
            <p className="mt-1 text-3xl font-semibold text-ios-gray-900">{value}</p>
          </div>
          <div className={`rounded-xl p-3 ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-ios-blue border-t-transparent rounded-full mx-auto" />
          <p className="mt-2 text-ios-gray-600">Wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-ios-blue to-blue-600 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold">
          Willkommen zurück, {user?.firstName}!
        </h1>
        <p className="mt-2 text-blue-100">
          {new Date().toLocaleDateString('de-DE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Admin Stats */}
      {isAdmin && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Aktive Mitarbeiter"
            value={stats.activeStaff}
            icon={UserGroupIcon}
            color="blue"
          />
          <StatCard
            title="Offene Bewerbungen"
            value={stats.pendingApplications}
            icon={ClipboardDocumentListIcon}
            color="orange"
          />
          <StatCard
            title="Kommende Events"
            value={stats.upcomingEvents}
            icon={CalendarIcon}
            color="green"
          />
          <StatCard
            title="Heutige Stempel"
            value={stats.todayStamps}
            icon={ClockIcon}
            color="red"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-ios-gray-900 mb-4">
          Schnellzugriff
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isAdmin ? (
            <>
              <QuickAction
                to="/admin/applications"
                icon={ClipboardDocumentListIcon}
                title="Bewerbungen verwalten"
                description="Neue Bewerbungen prüfen und bearbeiten"
                color="orange"
              />
              <QuickAction
                to="/admin/events/new"
                icon={CalendarIcon}
                title="Event erstellen"
                description="Neue Veranstaltung anlegen"
                color="green"
              />
              <QuickAction
                to="/admin/staff"
                icon={UserGroupIcon}
                title="Mitarbeiter verwalten"
                description="Mitarbeiterdaten einsehen und bearbeiten"
                color="blue"
              />
              <QuickAction
                to="/admin/reports"
                icon={ClipboardDocumentListIcon}
                title="Berichte erstellen"
                description="Daten exportieren und analysieren"
                color="purple"
              />
            </>
          ) : (
            <>
              <QuickAction
                to="/events"
                icon={CalendarIcon}
                title="Veranstaltungen"
                description="Verfügbare Events ansehen"
                color="blue"
              />
              <QuickAction
                to="/schedule"
                icon={ClipboardDocumentListIcon}
                title="Mein Dienstplan"
                description="Schichteinteilungen einsehen"
                color="green"
              />
              <QuickAction
                to="/timestamp"
                icon={ClockIcon}
                title="Stempeluhr"
                description="Ein- und ausstempeln"
                color="orange"
              />
              <QuickAction
                to="/profile"
                icon={UserGroupIcon}
                title="Mein Profil"
                description="Persönliche Daten verwalten"
                color="purple"
              />
            </>
          )}
        </div>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-ios-gray-900">
              Kommende Veranstaltungen
            </h2>
            <Link
              to={isAdmin ? '/admin/events' : '/events'}
              className="text-sm text-ios-blue hover:text-blue-600"
            >
              Alle anzeigen →
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="ios-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-ios-gray-900">
                      {event.name}
                    </h3>
                    <p className="text-sm text-ios-gray-600 mt-1">
                      {event.location}
                    </p>
                    <p className="text-sm text-ios-gray-500 mt-1">
                      {format(new Date(event.start_date), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </p>
                  </div>
                  {event.status === 'confirmed' ? (
                    <CheckCircleIcon className="h-5 w-5 text-ios-green" />
                  ) : (
                    <ExclamationCircleIcon className="h-5 w-5 text-ios-orange" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Messages */}
      {recentMessages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-ios-gray-900">
              Neueste Nachrichten
            </h2>
            <Link
              to="/messages"
              className="text-sm text-ios-blue hover:text-blue-600"
            >
              Alle anzeigen →
            </Link>
          </div>
          <div className="ios-card divide-y divide-ios-gray-200">
            {recentMessages.map((message) => (
              <div key={message.id} className="p-4">
                <div className="flex items-start">
                  <BellIcon className="h-5 w-5 text-ios-gray-400 mt-0.5" />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-ios-gray-900">
                      {message.sender_name}
                    </p>
                    <p className="text-sm text-ios-gray-600 mt-1">
                      {message.content}
                    </p>
                    <p className="text-xs text-ios-gray-500 mt-1">
                      {format(new Date(message.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
