import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ArrowLeftIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  BellIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const ActivityLog = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    user_id: '',
    search: '',
    from: '',
    to: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadActivities();
  }, [filters, pagination.page]);

  const loadUsers = async () => {
    try {
      const response = await api.get('/staff');
      setUsers(response.data.staff);
    } catch (error) {
      console.error('Fehler beim Laden der Benutzer:', error);
    }
  };

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.action && { action: filters.action }),
        ...(filters.user_id && { user_id: filters.user_id }),
        ...(filters.search && { search: filters.search }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to })
      });

      const response = await api.get(`/admin/activity-log?${params}`);
      
      setActivities(response.data.activities);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Fehler beim Laden der Aktivitäten:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      'login': UserIcon,
      'logout': UserIcon,
      'application_submitted': DocumentTextIcon,
      'application_accepted': CheckCircleIcon,
      'application_rejected': XCircleIcon,
      'event_created': CalendarDaysIcon,
      'event_updated': CalendarDaysIcon,
      'event_cancelled': XCircleIcon,
      'invitation_sent': BellIcon,
      'invitation_accepted': CheckCircleIcon,
      'invitation_declined': XCircleIcon,
      'shift_assigned': ClockIcon,
      'shift_confirmed': CheckCircleIcon,
      'clock_in': ClockIcon,
      'clock_out': ClockIcon,
      'message_sent': BellIcon,
      'settings_updated': DocumentTextIcon
    };
    
    return icons[action] || DocumentTextIcon;
  };

  const getActionColor = (action) => {
    if (action.includes('accepted') || action.includes('confirmed') || action === 'clock_in') {
      return 'text-ios-green';
    } else if (action.includes('rejected') || action.includes('declined') || action === 'logout') {
      return 'text-ios-red';
    } else if (action.includes('created') || action.includes('sent')) {
      return 'text-ios-blue';
    } else if (action.includes('updated')) {
      return 'text-ios-orange';
    }
    return 'text-ios-gray-600';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate('/admin/settings')}
          className="p-2 rounded-lg hover:bg-ios-gray-100"
        >
          <ArrowLeftIcon className="h-5 w-5 text-ios-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-ios-gray-900">Aktivitätsprotokoll</h1>
          <p className="text-ios-gray-600">Übersicht aller Systemaktivitäten</p>
        </div>
      </div>

      {/* Filters */}
      <div className="ios-card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-ios-gray-700 mb-1">Von</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="ios-input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ios-gray-700 mb-1">Bis</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="ios-input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ios-gray-700 mb-1">Aktion</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="ios-input"
            >
              <option value="">Alle Aktionen</option>
              <option value="login">Anmeldungen</option>
              <option value="application">Bewerbungen</option>
              <option value="event">Veranstaltungen</option>
              <option value="invitation">Einladungen</option>
              <option value="shift">Schichten</option>
              <option value="clock">Stempeluhr</option>
              <option value="message">Nachrichten</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ios-gray-700 mb-1">Benutzer</label>
            <select
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              className="ios-input"
            >
              <option value="">Alle Benutzer</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-ios-gray-700 mb-1">Suche</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-ios-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Durchsuchen..."
                className="ios-input pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activities List */}
      <div className="ios-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ios-blue mx-auto"></div>
            <p className="mt-4 text-ios-gray-600">Aktivitäten werden geladen...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center">
            <ClockIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
            <p className="text-ios-gray-500">Keine Aktivitäten gefunden</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-ios-gray-200">
              {activities.map((activity) => {
                const Icon = getActionIcon(activity.action);
                const color = getActionColor(activity.action);
                
                return (
                  <div key={activity.id} className="p-4 hover:bg-ios-gray-50">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg bg-ios-gray-100 ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-ios-gray-900">
                          <span className="font-medium">{activity.user_name || 'System'}</span>
                          {' '}
                          {activity.description}
                        </p>
                        <p className="text-xs text-ios-gray-500 mt-1">
                          {format(parseISO(activity.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
                        </p>
                        {activity.metadata && (
                          <div className="mt-2 text-xs text-ios-gray-600 bg-ios-gray-50 rounded p-2 font-mono">
                            {JSON.stringify(activity.metadata, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-ios-gray-50 px-4 py-3 flex items-center justify-between border-t">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="ios-button-secondary"
                  >
                    Zurück
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="ios-button-secondary"
                  >
                    Weiter
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-ios-gray-700">
                      Zeige{' '}
                      <span className="font-medium">
                        {(pagination.page - 1) * pagination.limit + 1}
                      </span>{' '}
                      bis{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      von{' '}
                      <span className="font-medium">{pagination.total}</span>{' '}
                      Einträgen
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-ios-gray-300 bg-white text-sm font-medium text-ios-gray-500 hover:bg-ios-gray-50 disabled:opacity-50"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-ios-gray-300 bg-white text-sm font-medium text-ios-gray-700">
                        Seite {pagination.page} von {pagination.pages}
                      </span>
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-ios-gray-300 bg-white text-sm font-medium text-ios-gray-500 hover:bg-ios-gray-50 disabled:opacity-50"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;


