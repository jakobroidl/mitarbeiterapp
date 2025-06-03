import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ShiftAssignmentModal = ({ isOpen, onClose, shift, eventId, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [assignmentType, setAssignmentType] = useState('preliminary');
  const [selectedStaff, setSelectedStaff] = useState([]);

  useEffect(() => {
    if (isOpen && shift) {
      fetchShiftData();
    }
  }, [isOpen, shift]);

  const fetchShiftData = async () => {
    try {
      setLoading(true);
      
      // Hole aktuelle Anmeldungen
      const registrationsRes = await api.get(`/shifts/${shift.id}/registrations`);
      setRegistrations(registrationsRes.data || []);
      
      // Hole verfügbare Mitarbeiter
      const invitationsRes = await api.get(`/events/${eventId}/invitations`);
      const invitationsData = invitationsRes.data || [];
      
      const acceptedStaff = invitationsData
        .filter(inv => inv.status === 'accepted')
        .filter(staff => !registrationsRes.data.some(reg => reg.staff_id === staff.staff_id));
      
      setAvailableStaff(acceptedStaff);
    } catch (error) {
      console.error('Error fetching shift data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStaff = async (staffId, action = 'assign') => {
    try {
      await api.post(`/shifts/${shift.id}/assign`, {
        staff_id: staffId,
        action: action,
        assignment_type: assignmentType
      });

      toast.success(
        action === 'assign' 
          ? 'Mitarbeiter erfolgreich zugeteilt' 
          : 'Zuteilung entfernt'
      );
      
      fetchShiftData();
    } catch (error) {
      toast.error('Fehler bei der Zuteilung');
    }
  };

  const handleBulkAssignment = async () => {
    if (selectedStaff.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Mitarbeiter aus');
      return;
    }

    try {
      setLoading(true);
      
      await api.post(`/shifts/${shift.id}/bulk-assign`, {
        staff_ids: selectedStaff,
        assignment_type: assignmentType
      });

      toast.success(`${selectedStaff.length} Mitarbeiter erfolgreich zugeteilt`);
      setSelectedStaff([]);
      fetchShiftData();
    } catch (error) {
      toast.error('Fehler bei der Massenzuteilung');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAssignment = async (registrationId) => {
    try {
      await api.post(`/shifts/registrations/${registrationId}/confirm`);
      toast.success('Zuteilung als endgültig markiert');
      fetchShiftData();
    } catch (error) {
      toast.error('Fehler beim Bestätigen');
    }
  };

  const getStatusBadge = (status, assignmentType) => {
    const configs = {
      interested: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Interessiert' },
      assigned: { 
        bg: assignmentType === 'final' ? 'bg-green-100' : 'bg-blue-100', 
        text: assignmentType === 'final' ? 'text-green-800' : 'text-blue-800', 
        label: assignmentType === 'final' ? 'Endgültig' : 'Vorläufig'
      },
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Bestätigt' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Abgesagt' }
    };
    
    const config = configs[status] || configs.interested;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (!isOpen || !shift) return null;

  // Icons als SVG Components
  const XMarkIcon = () => (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  const UserIcon = () => (
    <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  const ClockIcon = () => (
    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const CheckCircleIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Schichteinteilung</h2>
                <p className="mt-1 text-blue-100">{shift.name}</p>
                <div className="flex items-center mt-2 text-sm text-blue-100">
                  <ClockIcon />
                  <span>
                    {new Date(shift.start_time).toLocaleString('de-DE')} - 
                    {new Date(shift.end_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <XMarkIcon />
              </button>
            </div>
          </div>

          {/* Zuteilungstyp */}
          <div className="p-6 border-b bg-gray-50">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Zuteilungstyp:</span>
              <div className="flex rounded-lg bg-white border border-gray-300 p-1">
                <button
                  onClick={() => setAssignmentType('preliminary')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    assignmentType === 'preliminary'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Vorläufig
                </button>
                <button
                  onClick={() => setAssignmentType('final')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    assignmentType === 'final'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Endgültig
                </button>
              </div>
              <div className="flex-1 text-sm text-gray-600">
                {assignmentType === 'preliminary' 
                  ? 'Vorläufige Einteilung kann später geändert werden'
                  : 'Endgültige Einteilung - Mitarbeiter werden per E-Mail informiert'
                }
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 320px)' }}>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Aktuelle Zuteilungen */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Aktuelle Zuteilungen ({registrations.length}/{shift.required_staff})
                  </h3>
                  
                  <div className="space-y-2">
                    {registrations.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Noch keine Zuteilungen</p>
                    ) : (
                      registrations.map((reg) => (
                        <div
                          key={reg.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {reg.first_name} {reg.last_name}
                              </p>
                              <p className="text-sm text-gray-500">{reg.personal_code}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(reg.status, reg.assignment_type)}
                            
                            {reg.status === 'assigned' && reg.assignment_type === 'final' && reg.status !== 'confirmed' && (
                              <button
                                onClick={() => handleConfirmAssignment(reg.id)}
                                className="text-sm text-green-600 hover:text-green-700"
                                title="Als bestätigt markieren"
                              >
                                <CheckCircleIcon />
                              </button>
                            )}
                            
                            {reg.status !== 'confirmed' && (
                              <button
                                onClick={() => handleAssignStaff(reg.staff_id, 'unassign')}
                                className="text-sm text-red-600 hover:text-red-700"
                                title="Zuteilung entfernen"
                              >
                                <XMarkIcon />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          registrations.length >= shift.required_staff
                            ? 'bg-green-600'
                            : 'bg-blue-600'
                        }`}
                        style={{
                          width: `${Math.min((registrations.length / shift.required_staff) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      {registrations.length >= shift.required_staff
                        ? 'Schicht vollständig besetzt'
                        : `Noch ${shift.required_staff - registrations.length} Mitarbeiter benötigt`
                      }
                    </p>
                  </div>
                </div>

                {/* Verfügbare Mitarbeiter */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Verfügbare Mitarbeiter ({availableStaff.length})
                  </h3>
                  
                  <div className="space-y-2">
                    {availableStaff.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        Keine weiteren Mitarbeiter verfügbar
                      </p>
                    ) : (
                      availableStaff.map((staff) => (
                        <div
                          key={staff.staff_id}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                        >
                          <label className="flex items-center space-x-3 flex-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedStaff.includes(staff.staff_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStaff([...selectedStaff, staff.staff_id]);
                                } else {
                                  setSelectedStaff(selectedStaff.filter(id => id !== staff.staff_id));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            />
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {staff.staff_name}
                              </p>
                              <p className="text-sm text-gray-500">{staff.personal_code}</p>
                            </div>
                          </label>
                          
                          <button
                            onClick={() => handleAssignStaff(staff.staff_id, 'assign')}
                            className="ml-2 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            Zuteilen
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedStaff.length > 0 && (
                  <span>{selectedStaff.length} Mitarbeiter ausgewählt</span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Schließen
                </button>
                {selectedStaff.length > 0 && (
                  <button
                    onClick={handleBulkAssignment}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {selectedStaff.length} Mitarbeiter zuteilen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShiftAssignmentModal;
