

// frontend/src/pages/Events.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const Events = () => {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [searchTerm, statusFilter]);

  const fetchEvents = async (page = 1) => {
    try {
      setLoading(true);
      
      const params = {
        page,
        limit: 20,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
      };

      const response = await api.get('/events', { params });
      
      setEvents(response.data.events || []);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Fehler beim Laden der Veranstaltungen');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Möchten Sie diese Veranstaltung wirklich löschen?')) return;
    
    try {
      await api.delete(`/events/${id}`);
      toast.success('Veranstaltung gelöscht');
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen');
    }
  };

  const handleRespondToInvitation = async (eventId, response) => {
    try {
      await api.post(`/events/${eventId}/respond`, { response });
      toast.success(response === 'accept' ? 'Einladung angenommen' : 'Einladung abgelehnt');
      fetchEvents();
    } catch (error) {
      toast.error('Fehler beim Beantworten der Einladung');
    }
  };

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Entwurf' },
      published: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Veröffentlicht' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Abgeschlossen' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Abgesagt' },
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const InvitationBadge = ({ status }) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Eingeladen' },
      accepted: { bg: 'bg-green-100', text: 'text-green-800', label: 'Zugesagt' },
      declined: { bg: 'bg-red-100', text: 'text-red-800', label: 'Abgesagt' },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // Icons
  const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const LocationIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  const UsersIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  const ClockIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Veranstaltungen</h1>
        {isAdmin && (
          <Link
            to="/admin/events/new"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neue Veranstaltung
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Suche nach Name oder Ort..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Alle Status</option>
            {isAdmin && <option value="draft">Entwurf</option>}
            <option value="published">Veröffentlicht</option>
            <option value="completed">Abgeschlossen</option>
            <option value="cancelled">Abgesagt</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade Veranstaltungen...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <CalendarIcon />
          <p className="mt-2 text-gray-600">Keine Veranstaltungen gefunden</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
            >
              {/* Event Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold">{event.name}</h3>
                  <StatusBadge status={event.status} />
                </div>
              </div>

              {/* Event Body */}
              <div className="p-4 space-y-3">
                {/* Date & Time */}
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarIcon />
                  <span className="ml-2">
                    {format(new Date(event.start_date), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center text-sm text-gray-600">
                  <LocationIcon />
                  <span className="ml-2 truncate">{event.location}</span>
                </div>

                {/* Admin Info */}
                {isAdmin && (
                  <>
                    <div className="flex items-center text-sm text-gray-600">
                      <UsersIcon />
                      <span className="ml-2">
                        {event.accepted_count || 0} / {event.invitation_count || 0} Zusagen
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <ClockIcon />
                      <span className="ml-2">{event.shift_count || 0} Schichten</span>
                    </div>
                  </>
                )}

                {/* Staff Info */}
                {!isAdmin && event.invitation_status && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <InvitationBadge status={event.invitation_status} />
                      {event.my_shift_count > 0 && (
                        <span className="text-sm text-gray-600">
                          {event.my_shift_count} Schicht(en)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 flex gap-2">
                  <Link
                    to={`/events/${event.id}`}
                    className="flex-1 text-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Details
                  </Link>
                  
                  {isAdmin ? (
                    <>
                      <Link
                        to={`/events/${event.id}/edit`}
                        className="flex-1 text-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Bearbeiten
                      </Link>
                      {event.status === 'draft' && (
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </>
                  ) : (
                    event.invitation_status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleRespondToInvitation(event.id, 'accept')}
                          className="px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Zusagen
                        </button>
                        <button
                          onClick={() => handleRespondToInvitation(event.id, 'decline')}
                          className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Absagen
                        </button>
                      </>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <button
            onClick={() => fetchEvents(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Zurück
          </button>
          <span className="px-4 py-2 text-sm text-gray-700">
            Seite {pagination.page} von {pagination.pages}
          </span>
          <button
            onClick={() => fetchEvents(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
};

export default Events;
