// frontend/src/pages/admin/Events.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, parseISO, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  ClockIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    upcoming: 'true',
    from: '',
    to: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadEvents();
  }, [filters, pagination.page]);

  useEffect(() => {
    if (showStats) {
      loadStatistics();
    }
  }, [showStats]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.upcoming && { upcoming: filters.upcoming }),
        ...(filters.from && { from: filters.from }),
        ...(filters.to && { to: filters.to })
      });

      const response = await api.get(`/events?${params}`);
      
      setEvents(response.data.events);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Fehler beim Laden der Veranstaltungen:', error);
      toast.error('Veranstaltungen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await api.get('/events/statistics');
      setStats(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = async (eventId, newStatus) => {
    if (!window.confirm(`Status wirklich auf '${newStatus}' ändern?`)) return;

    try {
      await api.patch(`/events/${eventId}/status`, { status: newStatus });
      toast.success('Status erfolgreich geändert');
      loadEvents();
    } catch (error) {
      console.error('Fehler beim Ändern des Status:', error);
      toast.error('Status konnte nicht geändert werden');
    }
  };

  const exportEvents = () => {
    toast.success('Export wird erstellt...');
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const startDate = parseISO(event.start_date);
    const endDate = parseISO(event.end_date);
    
    if (event.status === 'cancelled') {
      return { text: 'Abgesagt', color: 'bg-ios-red text-white', icon: XCircleIcon };
    } else if (event.status === 'draft') {
      return { text: 'Entwurf', color: 'bg-ios-gray-400 text-white', icon: ExclamationCircleIcon };
    } else if (isPast(endDate)) {
      return { text: 'Beendet', color: 'bg-ios-gray-500 text-white', icon: CheckCircleIcon };
    } else if (now >= startDate && now <= endDate) {
      return { text: 'Läuft', color: 'bg-ios-green text-white', icon: ClockIcon };
    } else if (isToday(startDate)) {
      return { text: 'Heute', color: 'bg-ios-orange text-white', icon: CalendarIcon };
    } else if (isTomorrow(startDate)) {
      return { text: 'Morgen', color: 'bg-ios-purple text-white', icon: CalendarIcon };
    } else {
      return { text: 'Geplant', color: 'bg-ios-blue text-white', icon: CalendarDaysIcon };
    }
  };

  const formatEventDate = (start, end) => {
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    
    if (format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
      return format(startDate, 'dd.MM.yyyy');
    } else {
      return `${format(startDate, 'dd.MM.')} - ${format(endDate, 'dd.MM.yyyy')}`;
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
    <div className="ios-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ios-gray-600">{title}</p>
          <p className="mt-1 text-2xl font-bold text-ios-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-ios-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ios-gray-900">Veranstaltungen</h1>
          <p className="text-ios-gray-600">Planen und verwalten Sie Ihre Events</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="ios-button-secondary"
          >
            <CalendarDaysIcon className="h-5 w-5 mr-2" />
            Statistiken
          </button>
          <button
            onClick={exportEvents}
            className="ios-button-secondary"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Exportieren
          </button>
          <Link
            to="/admin/events/new"
            className="ios-button-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Neues Event
          </Link>
        </div>
      </div>

      {/* Statistics Panel */}
      {showStats && stats && (
        <div className="mb-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Events dieses Jahr"
              value={stats.monthlyStats.reduce((sum, m) => sum + m.event_count, 0)}
              subtitle={`${stats.monthlyStats.reduce((sum, m) => sum + m.cancelled, 0)} abgesagt`}
              icon={CalendarIcon}
              color="ios-blue"
            />
            <StatCard
              title="Ø Teilnehmer"
              value={Math.round(stats.avgParticipation?.avg_invited || 0)}
              subtitle="pro Event eingeladen"
              icon={UserGroupIcon}
              color="ios-purple"
            />
            <StatCard
              title="Ø Zusagen"
              value={Math.round(stats.avgParticipation?.avg_accepted || 0)}
              subtitle="pro Event"
              icon={CheckCircleIcon}
              color="ios-green"
            />
            <StatCard
              title="Top Location"
              value={stats.topLocations?.[0]?.location || '-'}
              subtitle={`${stats.topLocations?.[0]?.event_count || 0} Events`}
              icon={MapPinIcon}
              color="ios-orange"
            />
          </div>

          {/* Monthly Chart */}
          {stats.monthlyStats && stats.monthlyStats.length > 0 && (
            <div className="ios-card p-6">
              <h3 className="text-lg font-semibold text-ios-gray-900 mb-4">Events pro Monat</h3>
              <div className="flex items-end space-x-2 h-32">
                {[...Array(12)].map((_, month) => {
                  const monthData = stats.monthlyStats.find(m => m.month === month + 1);
                  const count = monthData?.event_count || 0;
                  const maxCount = Math.max(...stats.monthlyStats.map(m => m.event_count));
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-ios-blue rounded-t transition-all duration-300 hover:bg-blue-600"
                        style={{ height: `${height}%` }}
                        title={`${count} Events`}
                      />
                      <span className="text-xs text-ios-gray-500 mt-1">
                        {format(new Date(2024, month), 'MMM', { locale: de })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters and Search */}
      <div className="ios-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-ios-gray-500" />
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, status: e.target.value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="ios-input py-2"
            >
              <option value="">Alle Status</option>
              <option value="draft">Entwurf</option>
              <option value="published">Veröffentlicht</option>
              <option value="cancelled">Abgesagt</option>
              <option value="completed">Beendet</option>
            </select>
          </div>

          {/* Time Filter */}
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-ios-gray-500" />
            <select
              value={filters.upcoming}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, upcoming: e.target.value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="ios-input py-2"
            >
              <option value="">Alle Events</option>
              <option value="true">Anstehende</option>
              <option value="false">Vergangene</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value }))}
              className="ios-input py-2"
              placeholder="Von"
            />
            <span className="text-ios-gray-500">bis</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value }))}
              className="ios-input py-2"
              placeholder="Bis"
            />
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-ios-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Name oder Ort suchen..."
                className="ios-input pl-10 py-2"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Events List */}
      <div className="ios-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ios-blue mx-auto"></div>
            <p className="mt-4 text-ios-gray-600">Veranstaltungen werden geladen...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
            <p className="text-ios-gray-500">Keine Veranstaltungen gefunden</p>
            <Link
              to="/admin/events/new"
              className="mt-4 inline-flex items-center ios-button-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Erste Veranstaltung erstellen
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-ios-gray-50 border-b border-ios-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Veranstaltung
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Ort
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Aktionen</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-ios-gray-200">
                  {events.map((event) => {
                    const status = getEventStatus(event);
                    return (
                      <tr key={event.id} className="hover:bg-ios-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-ios-gray-900">
                              {event.name}
                            </div>
                            {event.description && (
                              <div className="text-sm text-ios-gray-500 truncate max-w-xs">
                                {event.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-ios-gray-900">
                            {formatEventDate(event.start_date, event.end_date)}
                          </div>
                          <div className="text-sm text-ios-gray-500">
                            {format(parseISO(event.start_date), 'HH:mm')} Uhr
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-ios-gray-900">
                            {event.location}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-ios-gray-900">
                            <span className="font-medium">{event.invited_staff || 0}</span> eingeladen
                          </div>
                          <div className="text-sm text-ios-gray-500">
                            <span className="text-ios-green">{event.accepted_staff || 0}</span> zugesagt
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            <status.icon className="w-3 h-3 mr-1" />
                            {status.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              to={`/admin/events/${event.id}`}
                              className="p-1 rounded-lg text-ios-blue hover:bg-ios-blue/10"
                              title="Details"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </Link>
                            <Link
                              to={`/admin/events/${event.id}/planning`}
                              className="p-1 rounded-lg text-ios-purple hover:bg-ios-purple/10"
                              title="Schichtplanung"
                            >
                              <CalendarDaysIcon className="h-5 w-5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="lg:hidden divide-y divide-ios-gray-200">
              {events.map((event) => {
                const status = getEventStatus(event);
                return (
                  <Link
                    key={event.id}
                    to={`/admin/events/${event.id}`}
                    className="block p-4 hover:bg-ios-gray-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ios-gray-900 truncate">
                          {event.name}
                        </p>
                        <p className="text-xs text-ios-gray-500 mt-1">
                          <MapPinIcon className="inline h-3 w-3 mr-1" />
                          {event.location}
                        </p>
                      </div>
                      <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <status.icon className="w-3 h-3 mr-0.5" />
                        {status.text}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-ios-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>
                          <CalendarIcon className="inline h-3 w-3 mr-1" />
                          {formatEventDate(event.start_date, event.end_date)}
                        </span>
                        <span>
                          <UserGroupIcon className="inline h-3 w-3 mr-1" />
                          {event.accepted_staff || 0}/{event.invited_staff || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-ios-gray-50 px-4 py-3 flex items-center justify-between border-t border-ios-gray-200">
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
                      Veranstaltungen
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

export default Events;



