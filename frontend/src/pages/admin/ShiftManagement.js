import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ShiftModal from '../../components/ShiftModal';
import ShiftAssignmentModal from '../../components/ShiftAssignmentModal';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const ShiftManagement = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentShift, setAssignmentShift] = useState(null);

  useEffect(() => {
    fetchEventAndShifts();
  }, [eventId]);

  const fetchEventAndShifts = async () => {
    try {
      setLoading(true);
      
      // Hole Event-Details
      const eventResponse = await api.get(`/events/${eventId}`);
      setEvent(eventResponse.data);
      
      // Hole Schichten
      const shiftsResponse = await api.get(`/events/${eventId}/shifts`);
      setShifts(shiftsResponse.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Fehler beim Laden der Daten');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = () => {
    setSelectedShift(null);
    setShowCreateModal(true);
  };

  const handleEditShift = (shift) => {
    setSelectedShift(shift);
    setShowCreateModal(true);
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm('Möchten Sie diese Schicht wirklich löschen?')) return;
    
    try {
      await api.delete(`/events/${eventId}/shifts/${shiftId}`);
      toast.success('Schicht erfolgreich gelöscht');
      fetchEventAndShifts();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Fehler beim Löschen der Schicht';
      toast.error(errorMessage);
    }
  };

  const handleModalSave = () => {
    fetchEventAndShifts();
  };

  const handleAssignStaff = (shift) => {
    setAssignmentShift(shift);
    setShowAssignmentModal(true);
  };

  const handleAssignmentUpdate = () => {
    fetchEventAndShifts();
  };

  // Icons
  const PlusIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );

  const PencilIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );

  const TrashIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  const ChevronLeftIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );

  const ClockIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const UserGroupIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const UserPlusIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
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
      {/* Header mit Event-Info */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => navigate(`/events/${eventId}`)}
              className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors mt-1"
            >
              <ChevronLeftIcon />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Schichtverwaltung</h1>
              {event && (
                <div className="mt-2 space-y-1">
                  <p className="text-lg text-gray-700">{event.name}</p>
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon />
                    <span className="ml-1">
                      {format(new Date(event.start_date), 'dd.MM.yyyy', { locale: de })} - 
                      {format(new Date(event.end_date), 'dd.MM.yyyy', { locale: de })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleCreateShift}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <PlusIcon />
            <span>Neue Schicht</span>
          </button>
        </div>
      </div>

      {/* Schichten Liste */}
      {shifts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Keine Schichten vorhanden</h2>
          <p className="text-gray-600 mb-6">Erstellen Sie die erste Schicht für diese Veranstaltung.</p>
          <button
            onClick={handleCreateShift}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
          >
            <PlusIcon className="mr-2" />
            Erste Schicht erstellen
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{shift.name}</h3>
                  
                  <div className="mt-2 flex items-center text-gray-600">
                    <ClockIcon />
                    <span className="ml-2">
                      {format(new Date(shift.start_time), 'dd.MM.yyyy HH:mm', { locale: de })} - 
                      {format(new Date(shift.end_time), 'HH:mm', { locale: de })} Uhr
                    </span>
                  </div>
                  
                  <div className="mt-2 flex items-center text-gray-600">
                    <UserGroupIcon />
                    <span className="ml-2">
                      {shift.registered_count || 0} / {shift.required_staff} Mitarbeiter
                      {shift.confirmed_count > 0 && (
                        <span className="text-green-600 ml-2">
                          ({shift.confirmed_count} bestätigt)
                        </span>
                      )}
                    </span>
                  </div>
                  
                  {shift.notes && (
                    <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      {shift.notes}
                    </p>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleAssignStaff(shift)}
                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                    title="Mitarbeiter zuweisen"
                  >
                    <UserPlusIcon />
                  </button>
                  <button
                    onClick={() => handleEditShift(shift)}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                    title="Bearbeiten"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => handleDeleteShift(shift.id)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="Löschen"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
              
              {/* Progress Bar für Anmeldungen */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((shift.registered_count / shift.required_staff) * 100, 100)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {Math.round((shift.registered_count / shift.required_staff) * 100)}% belegt
                </p>
              </div>

              {/* Schicht Einteilung Button - Prominent platziert */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleAssignStaff(shift)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <UserPlusIcon />
                  <span>Mitarbeiter einteilen</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shift Modal */}
      <ShiftModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedShift(null);
        }}
        onSave={handleModalSave}
        eventId={eventId}
        shift={selectedShift}
      />

      {/* Assignment Modal */}
      <ShiftAssignmentModal
        isOpen={showAssignmentModal}
        onClose={() => {
          setShowAssignmentModal(false);
          setAssignmentShift(null);
        }}
        shift={assignmentShift}
        eventId={eventId}
        onUpdate={handleAssignmentUpdate}
      />
    </div>
  );
};

export default ShiftManagement;
