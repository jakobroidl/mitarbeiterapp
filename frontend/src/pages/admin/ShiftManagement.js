// frontend/src/pages/admin/ShiftManagement.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import ShiftFormModal from '../../components/ShiftFormModal';
import StaffAssignmentModal from '../../components/StaffAssignmentModal';

const ShiftManagement = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [activeShiftForAssignment, setActiveShiftForAssignment] = useState(null);

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
    if (!window.confirm('Möchten Sie diese Schicht wirklich löschen?')) return;

    try {
      await api.delete(`/shifts/${shiftId}`);
      toast.success('Schicht gelöscht');
      fetchEventAndShifts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen');
    }
  };

  const handleAssignStaff = (shift) => {
    setActiveShiftForAssignment(shift);
    setShowAssignModal(true);
  };

  const handleRemoveStaffFromShift = async (shiftId, staffId) => {
    if (!window.confirm('Möchten Sie diesen Mitarbeiter wirklich von der Schicht entfernen?')) return;

    try {
      await api.delete(`/shifts/${shiftId}/staff/${staffId}`);
      toast.success('Mitarbeiter entfernt');
      fetchEventAndShifts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Entfernen');
    }
  };

  const getStatusBadge = (registration) => {
    const statusConfig = {
      interested: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Interessiert' },
      assigned: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Zugeteilt' },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Bestätigt' },
    };

    const config = statusConfig[registration.status] || statusConfig.interested;
    const typeLabel = registration.assignment_type === 'final' ? ' (Endgültig)' : ' (Vorläufig)';

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}{registration.status === 'assigned' ? typeLabel : ''}
      </span>
    );
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

  const XIcon = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

      {/* Shifts */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Schichten ({shifts.length})
        </h2>
        
        {shifts.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon />
            <p className="mt-2 text-gray-600">
              Noch keine Schichten erstellt
            </p>
            <button
              onClick={handleCreateShift}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Erste Schicht erstellen
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => (
              <div key={shift.id} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Shift Header */}
                <div className="bg-gray-50 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{shift.name}</h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          {format(new Date(shift.start_time), 'HH:mm')} - 
                          {format(new Date(shift.end_time), 'HH:mm')} Uhr
                        </span>
                        <span className="flex items-center">
                          <UsersIcon className="w-4 h-4 mr-1" />
                          {shift.confirmed_count || 0} / {shift.required_staff} bestätigt
                        </span>
                      </div>
                      {shift.notes && (
                        <p className="mt-2 text-sm text-gray-600">{shift.notes}</p>
                      )}
                    </div>
                    <div className="flex items-start space-x-2">
                      <button
                        onClick={() => handleEditShift(shift)}
                        className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Bearbeiten"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDeleteShift(shift.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Löschen"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="flex space-x-6 mt-3 pt-3 border-t border-gray-200">
                    <div className="text-sm">
                      <span className="text-gray-500">Interessiert:</span>
                      <span className="ml-1 font-medium text-yellow-600">
                        {shift.interested_count || 0}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Zugeteilt:</span>
                      <span className="ml-1 font-medium text-blue-600">
                        {shift.assigned_count || 0}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Bestätigt:</span>
                      <span className="ml-1 font-medium text-green-600">
                        {shift.confirmed_count || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Registrations */}
                {shift.registrations && shift.registrations.length > 0 && (
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Zugeteilte Mitarbeiter
                    </h4>
                    <div className="space-y-2">
                      {shift.registrations.map((reg) => (
                        <div key={reg.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium text-sm">
                              {reg.first_name} {reg.last_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({reg.personal_code})
                            </span>
                            {getStatusBadge(reg)}
                          </div>
                          {reg.status !== 'confirmed' && (
                            <button
                              onClick={() => handleRemoveStaffFromShift(shift.id, reg.staff_id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Entfernen"
                            >
                              <XIcon />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-4 bg-gray-50 border-t">
                  <button
                    onClick={() => handleAssignStaff(shift)}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Mitarbeiter zuteilen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ShiftFormModal
        isOpen={showShiftModal}
        onClose={() => {
          setShowShiftModal(false);
          setSelectedShift(null);
        }}
        eventId={eventId}
        eventDate={event?.start_date}
        shift={selectedShift}
        onSuccess={fetchEventAndShifts}
      />

      <StaffAssignmentModal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setActiveShiftForAssignment(null);
        }}
        shift={activeShiftForAssignment}
        eventId={eventId}
        onSuccess={fetchEventAndShifts}
      />
    </div>
  );
};

export default ShiftManagement;
