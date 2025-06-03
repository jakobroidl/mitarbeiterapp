// frontend/src/pages/admin/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  UsersIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  ChartBarIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { format, startOfWeek, endOfWeek, isToday, isTomorrow, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    applications: { pending: 0, total: 0 },
    staff: { active: 0, total: 0 },
    events: { upcoming: 0, today: 0 },
    timeclock: { active: 0, today: 0 }
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [activeTimeclocks, setActiveTimeclocks] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Lade alle Daten parallel
      const [
        statsRes,
        applicationsRes,
        eventsRes,
        timeclockRes,
        activityRes
      ] = await Promise.all([
        api.get('/admin/dashboard/stats'),
        api.get('/applications?status=pending&limit=5'),
        api.get('/events?status=published&upcoming=true&limit=5'),
        api.get('/timeclock/active'),
        api.get('/admin/activity?limit=10')
      ]);

      setStats(statsRes.data);
      setRecentApplications(applicationsRes.data.applications);
      setUpcomingEvents(eventsRes.data.events);
      setActiveTimeclocks(timeclockRes.data.entries);
      setRecentActivity(activityRes.data.activities);
      
    } catch (error) {
      console.error('Fehler beim Laden der Dashboard-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subValue, icon: Icon, color, link }) => (
    <Link to={link} className="ios-card p-6 hover:shadow-ios-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ios-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-ios-gray-900">{value}</p>
          {subValue && (
            <p className="mt-1 text-sm text-ios-gray-500">{subValue}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </Link>
  );

  const getActivityIcon = (action) => {
    switch (action) {
      case 'application_submitted':
        return <DocumentTextIcon className="h-4 w-4 text-ios-blue" />;
      case 'application_accepted':
        return <CheckCircleIcon className="h-4 w-4 text-ios-green" />;
      case 'application_rejected':
        return <XCircleIcon className="h-4 w-4 text-ios-red" />;
      case 'event_created':
        return <CalendarIcon className="h-4 w-4 text-ios-purple" />;
      case 'clock_in':
        return <ClockIcon className="h-4 w-4 text-ios-teal" />;
      default:
        return <BellIcon className="h-4 w-4 text-ios-gray-400" />;
    }
  };

  const formatEventDate = (date) => {
    const eventDate = parseISO(date);
    if (isToday(eventDate)) return 'Heute';
    if (isTomorrow(eventDate)) return 'Morgen';
    return format(eventDate, 'dd.MM.yyyy');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-ios-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ios-gray-900">
            Guten {new Date().getHours() < 12 ? 'Morgen' : new Date().getHours() < 18 ? 'Tag' : 'Abend'}, {user.firstName}!
          </h1>
          <p className="text-ios-gray-600">
            {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Offene Bewerbungen"
          value={stats.applications.pending}
          subValue={`von ${stats.applications.total} gesamt`}
          icon={DocumentTextIcon}
          color="ios-orange"
          link="/admin/applications?status=pending"
        />
        <StatCard
          title="Aktive Mitarbeiter"
          value={stats.staff.active}
          subValue={`von ${stats.staff.total} gesamt`}
          icon={UsersIcon}
          color="ios-blue"
          link="/admin/staff"
        />
        <StatCard
          title="Heutige Events"
          value={stats.events.today}
          subValue={`${stats.events.upcoming} anstehend`}
          icon={CalendarIcon}
          color="ios-purple"
          link="/admin/events"
        />
        <StatCard
          title="Eingestempelt"
          value={stats.timeclock.active}
          subValue={`${stats.timeclock.today} heute gesamt`}
          icon={ClockIcon}
          color="ios-green"
          link="/admin/timeclock"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <div className="ios-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ios-gray-900">Neue Bewerbungen</h2>
            <Link to="/admin/applications" className="text-sm text-ios-blue hover:text-blue-600">
              Alle anzeigen
              <ArrowRightIcon className="inline h-4 w-4 ml-1" />
            </Link>
          </div>
          
          {recentApplications.length > 0 ? (
            <div className="space-y-3">
              {recentApplications.map((app) => (
                <Link
                  key={app.id}
                  to={`/admin/applications/${app.id}`}
                  className="block p-3 rounded-xl hover:bg-ios-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {app.profile_image_url ? (
                      <img
                        src={app.profile_image_url}
                        alt={`${app.first_name} ${app.last_name}`}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-ios-gray-200 flex items-center justify-center">
                        <UsersIcon className="h-5 w-5 text-ios-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ios-gray-900 truncate">
                        {app.first_name} {app.last_name}
                      </p>
                      <p className="text-xs text-ios-gray-500">
                        {format(parseISO(app.created_at), 'dd.MM.yyyy HH:mm')}
                      </p>
                    </div>
                    <ExclamationCircleIcon className="h-5 w-5 text-ios-orange" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ios-gray-500 text-center py-8">
              Keine offenen Bewerbungen
            </p>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="ios-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ios-gray-900">Anstehende Events</h2>
            <Link to="/admin/events" className="text-sm text-ios-blue hover:text-blue-600">
              Alle anzeigen
              <ArrowRightIcon className="inline h-4 w-4 ml-1" />
            </Link>
          </div>
          
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/admin/events/${event.id}`}
                  className="block p-3 rounded-xl hover:bg-ios-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ios-gray-900 truncate">
                        {event.name}
                      </p>
                      <p className="text-xs text-ios-gray-500 mt-1">
                        {formatEventDate(event.start_date)} • {event.location}
                      </p>
                    </div>
                    <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      isToday(parseISO(event.start_date))
                        ? 'bg-ios-red text-white'
                        : 'bg-ios-gray-100 text-ios-gray-700'
                    }`}>
                      {formatEventDate(event.start_date)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ios-gray-500 text-center py-8">
              Keine anstehenden Events
            </p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="ios-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ios-gray-900">Letzte Aktivitäten</h2>
            <Link to="/admin/settings/activity-log" className="text-sm text-ios-blue hover:text-blue-600">
              Alle anzeigen
              <ArrowRightIcon className="inline h-4 w-4 ml-1" />
            </Link>
          </div>
          
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ios-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-ios-gray-500 mt-0.5">
                      {format(parseISO(activity.created_at), 'dd.MM. HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ios-gray-500 text-center py-8">
              Keine Aktivitäten
            </p>
          )}
        </div>
      </div>

      {/* Currently Clocked In */}
      {activeTimeclocks.length > 0 && (
        <div className="ios-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ios-gray-900">
              Aktuell eingestempelt ({activeTimeclocks.length})
            </h2>
            <Link to="/admin/timeclock" className="text-sm text-ios-blue hover:text-blue-600">
              Stempeluhr öffnen
              <ArrowRightIcon className="inline h-4 w-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTimeclocks.map((entry) => (
              <div key={entry.id} className="flex items-center space-x-3 p-3 bg-ios-gray-50 rounded-xl">
                {entry.profile_image ? (
                  <img
                    src={`/uploads/profiles/${entry.profile_image}`}
                    alt={entry.staff_name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-ios-gray-300 flex items-center justify-center">
                    <UsersIcon className="h-5 w-5 text-ios-gray-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ios-gray-900 truncate">
                    {entry.staff_name}
                  </p>
                  <p className="text-xs text-ios-gray-500">
                    Seit {format(parseISO(entry.clock_in), 'HH:mm')} Uhr • {entry.position_name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
