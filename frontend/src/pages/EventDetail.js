// frontend/src/pages/EventDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    fetchEvent();
    if (isAdmin) {
      fetchStaffList();
    }
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/${id}`);
      setEvent(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Veranstaltung');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffList = async () => {
    try {
      const response = await api.get('/users');
      setStaffList(response.data.filter(user => user.is_active));
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleInviteStaff = async () => {
    if (selectedStaff.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Mitarbeiter aus');
      return;
    }

    try {
      await api.post(`/events/${id}/invite`, {
        staff_ids: selectedStaff,
        send_email: true
      });
      toast.success(`${selectedStaff.length} Mitarbeiter eingeladen`);
      setShowInviteModal(false);
      setSelectedStaff([]);
      fetchEvent();
    } catch (error) {
      toast.error('Fehler beim Einladen der Mitarbeiter');
    }
  };

  const handleRespondToInvitation = async (response) => {
    try {
      await api.post(`/events/${id}/respond`, { response });
      toast.success(response === 'accept' ? 'Einladung angenommen' : 'Einladung abgelehnt');
      fetchEvent();
    } catch (error) {
      toast.error('Fehler beim Beantworten der Einladung');
    }
  };

  const handleRegisterForShift = async (shiftId, action = 'register') => {
    try {
      await api.post(`/events/${id}/shifts/${shiftId}/register`, { action });
      toast.success(action === 'register' ? 'Für Schicht angemeldet' : 'Von Schicht abgemeldet');
      fetchEvent();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler bei der Schichtanmeldung');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-2 text-gray-600">Lade Veranstaltung...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Entwurf' },
      published: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Veröffentlicht' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Abgeschlossen' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Abgesagt' },
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${config.bg} ${config.text}`}>
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
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const UsersIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{event.name}</h1>
              <p className="mt-2 text-blue-100">
                Erstellt von {event.creator_name}
              </p>
            </div>
            <StatusBadge status={event.status} />
          </div>
        </div>

        <div className="p-6">
          {/* Event Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex items-start space-x-3">
              <CalendarIcon />
              <div>
                <p className="font-semibold text-gray-900">Datum & Zeit</p>
                <p className="text-gray-600">
                  {format(new Date(event.start_date), 'dd.MM.yyyy HH:mm', { locale: de })} - 
                  {format(new Date(event.end_date), 'dd.MM.yyyy HH:mm', { locale: de })}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <LocationIcon />
              <div>
                <p className="font-semibold text-gray-900">Veranstaltungsort</p>
                <p className="text-gray-600">{event.location}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Beschreibung</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Staff Invitation Status */}
          {!isAdmin && event.my_invitation && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Ihre Einladung</p>
                  <p className="text-sm text-gray-600">
                    Status: {
                      event.my_invitation.status === 'pending' ? 'Ausstehend' :
                      event.my_invitation.status === 'accepted' ? 'Angenommen' : 'Abgelehnt'
                    }
                  </p>
                </div>
                {event.my_invitation.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleRespondToInvitation('accept')}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      Annehmen
                    </button>
                    <button
                      onClick={() => handleRespondToInvitation('decline')}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      Ablehnen
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <>
                <Link
                  to={`/events/${id}/edit`}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Bearbeiten
                </Link>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  <UsersIcon className="inline w-4 h-4 mr-2" />
                  Mitarbeiter einladen
                </button>
                <Link
                  to={`/events/${id}/shifts`}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Schichten verwalten
                </Link>
              </>
            )}
            <Link
              to="/events"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Zurück zur Übersicht
            </Link>
          </div>
        </div>
      </div>

      {/* Shifts */}
      {event.shifts && event.shifts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Schichten</h2>
          <div className="space-y-3">
            {event.shifts.map((shift) => (
              <div key={shift.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{shift.name}</h4>
                    <p className="text-sm text-gray-600">
                      <ClockIcon className="inline w-4 h-4 mr-1" />
                      {format(new Date(shift.start_time), 'HH:mm')} - 
                      {format(new Date(shift.end_time), 'HH:mm')} Uhr
                    </p>
                    <p className="text-sm text-gray-600">
                      {shift.registered_count || 0} / {shift.required_staff} Mitarbeiter
                    </p>
                  </div>
                  {!isAdmin && event.my_invitation?.status === 'accepted' && (
                    <button
                      onClick={() => handleRegisterForShift(
                        shift.id, 
                        shift.my_status === 'interested' ? 'unregister' : 'register'
                      )}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        shift.my_status === 'interested'
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                      }`}
                    >
                      {shift.my_status === 'interested' ? 'Abmelden' : 'Anmelden'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invitations (Admin only) */}
      {isAdmin && event.invitations && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Eingeladene Mitarbeiter</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Antwort am</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {event.invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-4 py-3 text-sm">
                      {invitation.staff_name} ({invitation.personal_code})
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        invitation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        invitation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {invitation.status === 'pending' ? 'Ausstehend' :
                         invitation.status === 'accepted' ? 'Zugesagt' : 'Abgesagt'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {invitation.responded_at 
                        ? format(new Date(invitation.responded_at), 'dd.MM.yyyy HH:mm', { locale: de })
                        : '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowInviteModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-xl font-semibold">Mitarbeiter einladen</h3>
              </div>
              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 200px)' }}>
                <div className="space-y-2">
                  {staffList.map((staff) => {
                    const isAlreadyInvited = event.invitations?.some(inv => inv.staff_id === staff.id);
                    return (
                      <label
                        key={staff.id}
                        className={`flex items-center p-3 rounded-lg cursor-pointer ${
                          isAlreadyInvited ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStaff.includes(staff.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStaff([...selectedStaff, staff.id]);
                            } else {
                              setSelectedStaff(selectedStaff.filter(id => id !== staff.id));
                            }
                          }}
                          disabled={isAlreadyInvited}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="ml-3">
                          {staff.first_name} {staff.last_name} ({staff.personal_code})
                          {isAlreadyInvited && <span className="text-sm text-gray-500 ml-2">Bereits eingeladen</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="p-6 border-t flex justify-end space-x-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleInviteStaff}
                  disabled={selectedStaff.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {selectedStaff.length} Mitarbeiter einladen
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EventDetail;
