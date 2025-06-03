import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ClockIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

const TimeclockReports = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    staff_id: '',
    event_id: '',
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    search: ''
  });
  const [staff, setStaff] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    total_hours: 0,
    total_entries: 0,
    active_now: 0,
    average_per_day: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadEntries();
  }, [filters, pagination.page]);

  const loadFilterOptions = async () => {
    try {
      const [staffRes, eventsRes] = await Promise.all([
        api.get('/staff?status=active'),
        api.get('/events?limit=100')
      ]);
      
      setStaff(staffRes.data.staff);
      setEvents(eventsRes.data.events);
    } catch (error) {
      console.error('Fehler beim Laden der Filteroptionen:', error);
    }
  };

  const loadEntries = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        from: filters.from,
        to: filters.to,
        ...(filters.staff_id && { staff_id: filters.staff_id }),
        ...(filters.event_id && { event_id: filters.event_id }),
        ...(filters.search && { search: filters.search })
      });

      const response = await api.get(`/timeclock/entries?${params}`);
      
      setEntries(response.data.entries);
      setPagination(response.data.pagination);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Fehler beim Laden der Einträge:', error);
      toast.error('Fehler beim Laden der Zeiteinträge');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format = 'csv') => {
    try {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
        format,
        ...(filters.staff_id && { staff_id: filters.staff_id }),
        ...(filters.event_id && { event_id: filters.event_id })
      });

      const response = await api.get(`/timeclock/export?${params}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stempeluhr_${filters.from}_${filters.to}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Export erfolgreich erstellt');
    } catch (error) {
      console.error('Fehler beim Export:', error);
      toast.error('Fehler beim Erstellen des Exports');
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0:00';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ios-gray-900">Stempeluhr-Berichte</h1>
          <p className="text-ios-gray-600">Übersicht und Export der Arbeitszeiten</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => exportReport('csv')}
            className="ios-button-secondary"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            CSV Export
          </button>
          <button
            onClick={() => exportReport('xlsx')}
            className="ios-button-primary"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Excel Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ios-gray-600">Gesamtstunden</p>
              <p className="text-2xl font-bold text-ios-gray-900">{stats.total_hours}h</p>
            </div>
            <ClockIcon className="h-8 w-8 text-ios-blue" />
          </div>
        </div>
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ios-gray-600">Einträge</p>
              <p className="text-2xl font-bold text-ios-gray-900">{stats.total_entries}</p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-ios-purple" />
          </div>
        </div>
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ios-gray-600">Aktiv jetzt</p>
              <p className="text-2xl font-bold text-ios-green">{stats.active_now}</p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-ios-green" />
          </div>
        </div>
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ios-gray-600">Ø pro Tag</p>
              <p className="text-2xl font-bold text-ios-gray-900">{stats.average_per_day}h</p>
            </div>
            <CalendarIcon className="h-8 w-8 text-ios-orange" />
          </div>
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
            <label className="block text-sm font-medium text-ios-gray-700 mb-1">Mitarbeiter</label>
            <select
              value={filters.staff_id}
              onChange={(e) => setFilters({ ...filters, staff_id: e.target.value })}
              className="ios-input"
            >
              <option value="">Alle Mitarbeiter</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ios-gray-700 mb-1">Veranstaltung</label>
            <select
              value={filters.event_id}
              onChange={(e) => setFilters({ ...filters, event_id: e.target.value })}
              className="ios-input"
            >
              <option value="">Alle Veranstaltungen</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
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
                placeholder="Name oder Code..."
                className="ios-input pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Entries Table */}
      <div className="ios-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ios-blue mx-auto"></div>
            <p className="mt-4 text-ios-gray-600">Einträge werden geladen...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center">
            <ClockIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
            <p className="text-ios-gray-500">Keine Einträge gefunden</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-ios-gray-50 border-b border-ios-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase">
                      Mitarbeiter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase">
                      Ein/Aus
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase">
                      Dauer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-500 uppercase">
                      Veranstaltung
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ios-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-ios-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-ios-gray-900">{entry.staff_name}</p>
                          <p className="text-xs text-ios-gray-500">{entry.personal_code}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-ios-gray-900">
                        {format(parseISO(entry.clock_in), 'dd.MM.yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-ios-gray-900">
                          {format(parseISO(entry.clock_in), 'HH:mm')} - 
                          {entry.clock_out ? format(parseISO(entry.clock_out), 'HH:mm') : 'läuft'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-ios-gray-900">
                        {formatDuration(entry.total_minutes)}h
                      </td>
                      <td className="px-6 py-4 text-sm text-ios-gray-900">
                        {entry.position_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-ios-gray-900">
                        {entry.event_name || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                      Zeige <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> bis{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      von <span className="font-medium">{pagination.total}</span> Einträgen
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="p-2 rounded-lg border border-ios-gray-300 disabled:opacity-50"
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <span className="flex items-center px-4 py-2 text-sm text-ios-gray-700">
                      Seite {pagination.page} von {pagination.pages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.pages}
                      className="p-2 rounded-lg border border-ios-gray-300 disabled:opacity-50"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
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

export default TimeclockReports;






