// frontend/src/pages/admin/ShiftManagement.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { de } from 'date-fns/locale';
import ShiftModal from '../../components/ShiftModal';

const ShiftManagement = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchEventAndShifts();
  }, [eventId]);

  const fetchEventAndShifts = async () => {
    try {
      setLoading(true);
      
      // Fetch event details
      const eventResponse = await api.get(`/events/${eventId}`);
      setEvent(eventResponse.data);
      
      // Fetch shifts with registrations
      const shiftsResponse = await api.get(`/events/${eventId}/shifts`);
      setShifts(shiftsResponse.data.shifts || []);
    } catch (error) {
      toast.error('Fehler beim Laden der Daten');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = () => {
    setSelectedShift(null);
    setShowShiftModal(true);
  };

  const handleEditShift = (shift) => {
    setSelectedShift(shift);
    setShowShiftModal(true);
  };

  const handleDeleteShift = async (shiftId) => {
    try {
      await api.delete(`/shifts/${shiftId}`);
      toast.success('Schicht gelöscht');
      fetchEventAndShifts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen der Schicht');
    }
    setShowDeleteConfirm(null);
  };

  const formatDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = differenceInHours(end, start);
    const minutes = differenceInMinutes(end, start) % 60;
    
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const getShiftStatus = (shift) => {
    const registeredCount = shift.total_registrations || 0;
    const requiredCount = shift.required_staff;
    const confirmedCount = shift.confirmed_count || 0;
    
    if (confirmedCount === requiredCount) {
      return { status: 'complete', label: 'Vollständig', color: 'bg-green-100 text-green-800' };
    } else if (registeredCount >= requiredCount) {
      return { status: 'filled', label: 'Besetzt', color: 'bg-blue-100 text-blue-800' };
    } else if (registeredCount > 0) {
      return { status: 'partial', label: 'Teilweise', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { status: 'empty', label: 'Offen', color: 'bg-gray-100 text-gray-800' };
    }
  };

  // Icons
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

  const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );

  const ChevronLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );

  const EditIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );

  const TrashIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  const AssignIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-2 text-gray-600">Lade Schichten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/events/${eventId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeftIcon />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Schichtverwaltung
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {event?.name} • {event?.location}
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateShift}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center space-x-2"
          >
            <PlusIcon />
            <span>Neue Schicht</span>
          </button>
        </div>
      </div>

      {/* Event Info Bar */}
      <div className="bg-blue-50 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm">
              <ClockIcon />
              <span className="text-gray-700">
                {format(new Date(event?.start_date), 'dd.MM.yyyy HH:mm', { locale: de })} - 
                {format(new Date(event?.end_date), 'dd.MM.yyyy HH:mm', { locale: de })}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <UsersIcon />
              <span className="text-gray-700">
                {event?.accepted_count || 0} Mitarbeiter zugesagt
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shifts Overview */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Schichten ({shifts.length})
          </h2>
          <div className="text-sm text-gray-500">
            {shifts.reduce((sum, shift) => sum + (shift.total_registrations || 0), 0)} Anmeldungen gesamt
          </div>
        </div>
        
        {shifts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClockIcon />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Noch keine Schichten erstellt
            </h3>
            <p className="text-gray-600 mb-6">
              Erstellen Sie Schichten für diese Veranstaltung, damit sich Mitarbeiter anmelden können.
            </p>
            <button
              onClick={handleCreateShift}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Erste Schicht erstellen
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => {
              const status = getShiftStatus(shift);
              return (
                <div
                  key={shift.id}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Schicht Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {shift.name}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <ClockIcon className="w-4 h-4" />
                              <span>
                                {format(new Date(shift.start_time), 'dd.MM. HH:mm', { locale: de })} - 
                                {format(new Date(shift.end_time), 'HH:mm', { locale: de })} Uhr
                              </span>
                              <span className="text-gray-400">
                                ({formatDuration(shift.start_time, shift.end_time)})
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Schicht Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Benötigt</span>
                            <span className="text-lg font-semibold text-gray-900">
                              {shift.required_staff}
                            </span>
                          </div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Angemeldet</span>
                            <span className="text-lg font-semibold text-blue-900">
                              {shift.interested_count || 0}
                            </span>
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Bestätigt</span>
                            <span className="text-lg font-semibold text-green-900">
                              {shift.confirmed_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Qualifikationen */}
                      {shift.required_qualifications && (
                        <div className="mb-4">
                          <span className="text-sm font-medium text-gray-700 mb-2 block">
                            Erforderliche Qualifikationen:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {JSON.parse(shift.required_qualifications).map((qualId) => (
                              <span
                                key={qualId}
                                className="inline-flex px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full"
                              >
                                Qualifikation {qualId}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notizen */}
                      {shift.notes && (
                        <div className="mb-4">
                          <span className="text-sm font-medium text-gray-700 mb-1 block">Notizen:</span>
                          <p className="text-sm text-gray-600">{shift.notes}</p>
                        </div>
                      )}

                      {/* Angemeldete Mitarbeiter Preview */}
                      {shift.registrations && shift.registrations.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700 mb-2 block">
                            Angemeldete Mitarbeiter:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {shift.registrations.slice(0, 5).map((registration) => (
                              <span
                                key={registration.id}
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  registration.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                  registration.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {registration.first_name} {registration.last_name}
                              </span>
                            ))}
                            {shift.registrations.length > 5 && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                +{shift.registrations.length - 5} weitere
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => {/* TODO: Assignment Modal */}}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Mitarbeiter einteilen"
                      >
                        <AssignIcon />
                      </button>
                      <button
                        onClick={() => handleEditShift(shift)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Bearbeiten"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(shift.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Löschen"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shift Modal */}
      <ShiftModal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        onSuccess={fetchEventAndShifts}
        eventId={eventId}
        shift={selectedShift}
        eventStartDate={event?.start_date}
        eventEndDate={event?.end_date}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowDeleteConfirm(null)} />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Schicht löschen
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Möchten Sie diese Schicht wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => handleDeleteShift(showDeleteConfirm)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700"
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShiftManagement;
