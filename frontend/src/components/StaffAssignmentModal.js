// frontend/src/components/StaffAssignmentModal.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const StaffAssignmentModal = ({ isOpen, onClose, shift, eventId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invitedStaff, setInvitedStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [assignmentType, setAssignmentType] = useState('preliminary');
  const [filter, setFilter] = useState('all'); // all, interested, qualified

  useEffect(() => {
    if (isOpen && shift) {
      fetchInvitedStaff();
      loadCurrentAssignments();
    }
  }, [isOpen, shift]);

  const fetchInvitedStaff = async () => {
    try {
      setLoading(true);
      
      // Get event details with invitations
      const eventResponse = await api.get(`/events/${eventId}`);
      const event = eventResponse.data;
      
      // Get all active staff
      const staffResponse = await api.get('/users');
      const allStaff = staffResponse.data;
      
      // Merge invitation status with staff data
      const staffWithStatus = allStaff.map(staff => {
        const invitation = event.invitations?.find(inv => inv.staff_id === staff.id);
        const registration = shift.registrations?.find(reg => reg.staff_id === staff.id);
        
        return {
          ...staff,
          invitation_status: invitation?.status || 'not_invited',
          registration_status: registration?.status,
          assignment_type: registration?.assignment_type,
          is_interested: registration?.status === 'interested',
          is_assigned: registration?.status === 'assigned',
          is_confirmed: registration?.status === 'confirmed'
        };
      });
      
      setInvitedStaff(staffWithStatus);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Fehler beim Laden der Mitarbeiter');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentAssignments = () => {
    // Lade aktuelle Zuteilungen
    const assigned = shift.registrations
      ?.filter(reg => reg.status === 'assigned')
      .map(reg => reg.staff_id) || [];
    setSelectedStaff(assigned);
  };

  const handleAssign = async () => {
    if (selectedStaff.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Mitarbeiter aus');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/shifts/${shift.id}/assign`, {
        staff_ids: selectedStaff,
        assignment_type: assignmentType
      });

      toast.success(`${selectedStaff.length} Mitarbeiter ${assignmentType === 'final' ? 'endgültig' : 'vorläufig'} zugeteilt`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Fehler bei der Zuteilung');
    } finally {
      setSaving(false);
    }
  };

  const toggleStaffSelection = (staffId) => {
    setSelectedStaff(prev => 
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const selectAll = () => {
    const eligibleStaff = getFilteredStaff().map(s => s.id);
    setSelectedStaff(eligibleStaff);
  };

  const deselectAll = () => {
    setSelectedStaff([]);
  };

  const getFilteredStaff = () => {
    return invitedStaff.filter(staff => {
      // Nur aktive Mitarbeiter die zur Veranstaltung zugesagt haben
      if (!staff.is_active || staff.invitation_status !== 'accepted') {
        return false;
      }

      // Filter anwenden
      if (filter === 'interested' && !staff.is_interested) {
        return false;
      }

      if (filter === 'qualified' && shift.required_qualifications) {
        const requiredQuals = JSON.parse(shift.required_qualifications);
        const staffQuals = staff.qualifications?.map(q => q.id) || [];
        const hasAllQuals = requiredQuals.every(reqId => staffQuals.includes(reqId));
        if (!hasAllQuals) return false;
      }

      return true;
    });
  };

  if (!isOpen || !shift) return null;

  const filteredStaff = getFilteredStaff();

  // Icons
  const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );

  const UserIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Mitarbeiter zuteilen
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {shift.name} • {shift.registered_count || 0} / {shift.required_staff} Mitarbeiter
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Assignment Type Selection */}
          <div className="p-6 border-b bg-gray-50">
            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="preliminary"
                  checked={assignmentType === 'preliminary'}
                  onChange={(e) => setAssignmentType(e.target.value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Vorläufige Einteilung
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="final"
                  checked={assignmentType === 'final'}
                  onChange={(e) => setAssignmentType(e.target.value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Endgültige Einteilung
                </span>
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {assignmentType === 'final' 
                ? 'Mitarbeiter werden per E-Mail benachrichtigt und müssen ihre Einteilung bestätigen'
                : 'Vorläufige Planung - Mitarbeiter werden noch nicht benachrichtigt'
              }
            </p>
          </div>

          {/* Filters */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    filter === 'all' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Alle ({invitedStaff.filter(s => s.invitation_status === 'accepted').length})
                </button>
                <button
                  onClick={() => setFilter('interested')}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    filter === 'interested' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Interessiert ({invitedStaff.filter(s => s.is_interested).length})
                </button>
                {shift.required_qualifications && (
                  <button
                    onClick={() => setFilter('qualified')}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      filter === 'qualified' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Qualifiziert
                  </button>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Alle auswählen
                </button>
                <button
                  onClick={deselectAll}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  Auswahl aufheben
                </button>
              </div>
            </div>
          </div>

          {/* Staff List */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 400px)' }}>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                <p className="mt-2 text-gray-600">Lade Mitarbeiter...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-center py-8">
                <UserIcon />
                <p className="mt-2 text-gray-600">
                  Keine passenden Mitarbeiter gefunden
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStaff.map((staff) => (
                  <label
                    key={staff.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      staff.is_confirmed 
                        ? 'bg-green-50 border-green-200 cursor-not-allowed' 
                        : selectedStaff.includes(staff.id)
                        ? 'bg-blue-50 border-blue-300'
                        : 'hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStaff.includes(staff.id) || staff.is_confirmed}
                      onChange={() => !staff.is_confirmed && toggleStaffSelection(staff.id)}
                      disabled={staff.is_confirmed}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center">
                        <span className="font-medium text-gray-900">
                          {staff.first_name} {staff.last_name}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          ({staff.personal_code})
                        </span>
                      </div>
                      <div className="flex items-center mt-1 space-x-3 text-xs">
                        {staff.is_interested && (
                          <span className="text-green-600">
                            <CheckIcon className="inline w-3 h-3 mr-1" />
                            Interessiert
                          </span>
                        )}
                        {staff.is_assigned && (
                          <span className="text-blue-600">
                            Zugeteilt ({staff.assignment_type === 'final' ? 'Endgültig' : 'Vorläufig'})
                          </span>
                        )}
                        {staff.is_confirmed && (
                          <span className="text-green-700 font-medium">
                            ✓ Bestätigt
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 text-sm text-gray-500">
                      {staff.qualifications?.length > 0 && (
                        <div className="flex gap-1">
                          {staff.qualifications.slice(0, 3).map(qual => (
                            <span
                              key={qual.id}
                              className="inline-block w-3 h-3 rounded-full"
                              style={{ backgroundColor: qual.color }}
                              title={qual.name}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedStaff.length} von {shift.required_staff} Mitarbeitern ausgewählt
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAssign}
                  disabled={saving || selectedStaff.length === 0}
                  className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Speichere...' : `${selectedStaff.length} Mitarbeiter zuteilen`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StaffAssignmentModal;
