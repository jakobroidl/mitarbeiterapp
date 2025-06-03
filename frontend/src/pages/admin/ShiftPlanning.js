// frontend/src/pages/admin/ShiftPlanning.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  EnvelopeIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const ShiftPlanning = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [shiftPlan, setShiftPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [expandedShifts, setExpandedShifts] = useState({});
  const [selectedStaff, setSelectedStaff] = useState({});
  const [filterQualification, setFilterQualification] = useState('');
  const [qualifications, setQualifications] = useState([]);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusAction, setStatusAction] = useState({ type: '', shiftId: null });

  useEffect(() => {
    loadEventAndShiftPlan();
    loadQualifications();
  }, [id]);

  const loadEventAndShiftPlan = async () => {
    try {
      setLoading(true);
      
      const [eventRes, shiftPlanRes] = await Promise.all([
        api.get(`/events/${id}`),
        api.get(`/shifts/event/${id}/plan`)
      ]);
      
      setEvent(eventRes.data);
      setShiftPlan(shiftPlanRes.data);
      
      // Initialize expanded state for all shifts
      const expanded = {};
      shiftPlanRes.data.shifts.forEach(shift => {
        expanded[shift.id] = true;
      });
      setExpandedShifts(expanded);
      
    } catch (error) {
      console.error('Fehler beim Laden der Schichtplanung:', error);
      toast.error('Schichtplanung konnte nicht geladen werden');
      navigate(`/admin/events/${id}`);
    } finally {
      setLoading(false);
    }
  };

  const loadQualifications = async () => {
    try {
      const response = await api.get('/settings/qualifications');
      setQualifications(response.data.qualifications.filter(q => q.is_active));
    } catch (error) {
      console.error('Fehler beim Laden der Qualifikationen:', error);
    }
  };

  const toggleShiftExpanded = (shiftId) => {
    setExpandedShifts(prev => ({
      ...prev,
      [shiftId]: !prev[shiftId]
    }));
  };

  const handleAssignStaff = async (shiftId, staffId, positionId = null) => {
    try {
      await api.post(`/shifts/${shiftId}/assign`, {
        staff_id: staffId,
        position_id: positionId,
        status: 'preliminary'
      });
      
      toast.success('Mitarbeiter erfolgreich eingeteilt');
      loadEventAndShiftPlan();
    } catch (error) {
      console.error('Fehler beim Einteilen:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Einteilen des Mitarbeiters');
    }
  };

  const handleRemoveAssignment = async (shiftId, staffId) => {
    if (!window.confirm('Einteilung wirklich entfernen?')) return;

    try {
      await api.delete(`/shifts/${shiftId}/assign/${staffId}`);
      toast.success('Einteilung entfernt');
      loadEventAndShiftPlan();
    } catch (error) {
      console.error('Fehler beim Entfernen:', error);
      toast.error('Einteilung konnte nicht entfernt werden');
    }
  };

  const handleBulkAssign = async (shiftId) => {
    const staffIds = Object.entries(selectedStaff)
      .filter(([key, value]) => key.startsWith(`${shiftId}-`) && value)
      .map(([key]) => parseInt(key.split('-')[1]));

    if (staffIds.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Mitarbeiter aus');
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/shifts/${shiftId}/bulk-assign`, {
        assignments: staffIds.map(staff_id => ({ staff_id }))
      });
      
      toast.success(`${staffIds.length} Mitarbeiter erfolgreich eingeteilt`);
      setSelectedStaff({});
      loadEventAndShiftPlan();
    } catch (error) {
      console.error('Fehler beim Bulk-Assign:', error);
      toast.error('Fehler beim Einteilen der Mitarbeiter');
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusChange = async (shiftId, newStatus) => {
    setProcessing(true);
    try {
      await api.patch(`/shifts/${shiftId}/status`, { status: newStatus });
      
      toast.success(`Schichtstatus auf '${newStatus === 'final' ? 'Endgültig' : 'Vorläufig'}' geändert`);
      setShowStatusDialog(false);
      setStatusAction({ type: '', shiftId: null });
      loadEventAndShiftPlan();
    } catch (error) {
      console.error('Fehler beim Ändern des Status:', error);
      toast.error('Status konnte nicht geändert werden');
    } finally {
      setProcessing(false);
    }
  };

  const handleAllShiftsStatus = async (newStatus) => {
    if (!window.confirm(`Wirklich alle Schichten auf '${newStatus === 'final' ? 'Endgültig' : 'Vorläufig'}' setzen?`)) return;

    setProcessing(true);
    try {
      // Change status for all shifts
      await Promise.all(
        shiftPlan.shifts.map(shift => 
          api.patch(`/shifts/${shift.id}/status`, { status: newStatus })
        )
      );
      
      toast.success('Status für alle Schichten geändert');
      loadEventAndShiftPlan();
    } catch (error) {
      console.error('Fehler beim Ändern des Status:', error);
      toast.error('Status konnte nicht für alle Schichten geändert werden');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-ios-gray-200 rounded w-1/4 mb-6"></div>
          <div className="ios-card p-6 space-y-4">
            <div className="h-32 bg-ios-gray-200 rounded"></div>
            <div className="h-20 bg-ios-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!event || !shiftPlan) return null;

  const filteredAvailableStaff = shiftPlan.availableStaff.filter(staff => {
    if (!filterQualification) return true;
    return staff.qualifications?.includes(filterQualification);
  });

  const getAssignmentStatusColor = (assignment) => {
    switch (assignment.status) {
      case 'confirmed':
        return 'bg-ios-green/10 border-ios-green text-ios-green';
      case 'final':
        return 'bg-ios-blue/10 border-ios-blue text-ios-blue';
      case 'preliminary':
        return 'bg-ios-orange/10 border-ios-orange text-ios-orange';
      default:
        return 'bg-ios-gray-100 border-ios-gray-300 text-ios-gray-700';
    }
  };

  const getShiftCoverageStatus = (shift) => {
    const percentage = (shift.coverage.assigned / shift.coverage.required) * 100;
    if (percentage >= 100) return { color: 'text-ios-green', bg: 'bg-ios-green' };
    if (percentage >= 50) return { color: 'text-ios-orange', bg: 'bg-ios-orange' };
    return { color: 'text-ios-red', bg: 'bg-ios-red' };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/admin/events/${id}`)}
            className="p-2 rounded-lg hover:bg-ios-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-ios-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-ios-gray-900">Schichtplanung</h1>
            <p className="text-ios-gray-600">{event.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleAllShiftsStatus('preliminary')}
            disabled={processing}
            className="ios-button-secondary"
          >
            Alle vorläufig
          </button>
          <button
            onClick={() => handleAllShiftsStatus('final')}
            disabled={processing}
            className="ios-button-primary"
          >
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            Alle endgültig
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ios-gray-600">Schichten</p>
              <p className="text-2xl font-bold text-ios-gray-900">{shiftPlan.shifts.length}</p>
            </div>
            <CalendarDaysIcon className="h-8 w-8 text-ios-blue" />
          </div>
        </div>
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ios-gray-600">Benötigt</p>
              <p className="text-2xl font-bold text-ios-gray-900">
                {shiftPlan.shifts.reduce((sum, shift) => sum + shift.coverage.required, 0)}
              </p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-ios-purple" />
          </div>
        </div>
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ios-gray-600">Eingeteilt</p>
              <p className="text-2xl font-bold text-ios-gray-900">
                {shiftPlan.shifts.reduce((sum, shift) => sum + shift.coverage.assigned, 0)}
              </p>
            </div>
            <UserIcon className="h-8 w-8 text-ios-orange" />
          </div>
        </div>
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ios-gray-600">Bestätigt</p>
              <p className="text-2xl font-bold text-ios-green">
                {shiftPlan.shifts.reduce((sum, shift) => sum + shift.coverage.confirmed, 0)}
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-ios-green" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shifts Column */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-ios-gray-900">Schichten</h2>
          
          {shiftPlan.shifts.map((shift) => {
            const coverageStatus = getShiftCoverageStatus(shift);
            const isExpanded = expandedShifts[shift.id];
            
            return (
              <div key={shift.id} className="ios-card">
                {/* Shift Header */}
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => toggleShiftExpanded(shift.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-ios-gray-900">{shift.name}</h3>
                        {shift.position_name && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-ios-purple/10 text-ios-purple">
                            {shift.position_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-ios-gray-600">
                        <span>
                          <ClockIcon className="inline h-4 w-4 mr-1" />
                          {format(parseISO(shift.start_time), 'HH:mm')} - {format(parseISO(shift.end_time), 'HH:mm')}
                        </span>
                        <span className={coverageStatus.color}>
                          <UserGroupIcon className="inline h-4 w-4 mr-1" />
                          {shift.coverage.assigned}/{shift.coverage.required} besetzt
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {/* Coverage Bar */}
                      <div className="w-24 h-2 bg-ios-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${coverageStatus.bg} transition-all duration-300`}
                          style={{ width: `${Math.min(100, (shift.coverage.assigned / shift.coverage.required) * 100)}%` }}
                        />
                      </div>
                      {isExpanded ? (
                        <ChevronUpIcon className="h-5 w-5 text-ios-gray-400" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-ios-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Shift Content (Expandable) */}
                {isExpanded && (
                  <div className="border-t border-ios-gray-200">
                    {/* Assigned Staff */}
                    {shift.assignments.length > 0 && (
                      <div className="p-4">
                        <h4 className="text-sm font-medium text-ios-gray-700 mb-3">Eingeteilte Mitarbeiter</h4>
                        <div className="space-y-2">
                          {shift.assignments.map((assignment) => (
                            <div 
                              key={assignment.id}
                              className={`flex items-center justify-between p-3 rounded-xl border ${getAssignmentStatusColor(assignment)}`}
                            >
                              <div className="flex items-center space-x-3">
                                {assignment.profile_image ? (
                                  <img
                                    src={`/uploads/profiles/${assignment.profile_image}`}
                                    alt={assignment.staff_name}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-ios-gray-200 flex items-center justify-center">
                                    <UserIcon className="h-4 w-4 text-ios-gray-500" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-ios-gray-900">{assignment.staff_name}</p>
                                  <p className="text-xs text-ios-gray-500">
                                    {assignment.personal_code} • {assignment.qualifications || 'Keine Qualifikationen'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {assignment.status === 'confirmed' && (
                                  <CheckCircleIcon className="h-5 w-5 text-ios-green" title="Bestätigt" />
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveAssignment(shift.id, assignment.staff_id);
                                  }}
                                  className="text-ios-red hover:text-red-600"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="p-4 bg-ios-gray-50 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {shift.assignments.filter(a => a.status === 'preliminary').length > 0 && (
                          <span className="text-sm text-ios-orange">
                            <ExclamationTriangleIcon className="inline h-4 w-4 mr-1" />
                            {shift.assignments.filter(a => a.status === 'preliminary').length} vorläufig
                          </span>
                        )}
                        {shift.assignments.filter(a => a.status === 'final').length > 0 && (
                          <span className="text-sm text-ios-blue">
                            <EnvelopeIcon className="inline h-4 w-4 mr-1" />
                            {shift.assignments.filter(a => a.status === 'final').length} endgültig
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusAction({ type: 'shift', shiftId: shift.id });
                          setShowStatusDialog(true);
                        }}
                        className="ios-button-secondary text-sm"
                      >
                        Status ändern
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Available Staff Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ios-gray-900">Verfügbare Mitarbeiter</h2>
            <span className="text-sm text-ios-gray-500">{filteredAvailableStaff.length} verfügbar</span>
          </div>

          {/* Qualification Filter */}
          <div>
            <select
              value={filterQualification}
              onChange={(e) => setFilterQualification(e.target.value)}
              className="ios-input w-full"
            >
              <option value="">Alle Qualifikationen</option>
              {qualifications.map(qual => (
                <option key={qual.id} value={qual.name}>{qual.name}</option>
              ))}
            </select>
          </div>

          {/* Staff List */}
          <div className="ios-card p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
            {filteredAvailableStaff.length > 0 ? (
              <div className="space-y-2">
                {filteredAvailableStaff.map((staff) => {
                  // Check if staff is already assigned to any shift
                  const isAssigned = shiftPlan.shifts.some(shift => 
                    shift.assignments.some(a => a.staff_id === staff.id)
                  );
                  
                  return (
                    <div
                      key={staff.id}
                      className={`p-3 rounded-xl border ${
                        isAssigned 
                          ? 'border-ios-gray-200 bg-ios-gray-50 opacity-50' 
                          : 'border-ios-gray-200 hover:border-ios-gray-300'
                      }`}
                      draggable={!isAssigned}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('staffId', staff.id.toString());
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        {staff.profile_image ? (
                          <img
                            src={`/uploads/profiles/${staff.profile_image}`}
                            alt={staff.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-ios-gray-200 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-ios-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ios-gray-900 truncate">{staff.name}</p>
                          <p className="text-xs text-ios-gray-500 truncate">
                            {staff.personal_code} • {staff.qualifications || 'Keine'}
                          </p>
                        </div>
                        {isAssigned && (
                          <CheckCircleIcon className="h-5 w-5 text-ios-green flex-shrink-0" title="Bereits eingeteilt" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-ios-gray-500 py-4">
                Keine verfügbaren Mitarbeiter
              </p>
            )}
          </div>

          {/* Bulk Actions */}
          <div className="ios-card p-4">
            <h3 className="text-sm font-medium text-ios-gray-700 mb-3">Schnellzuweisung</h3>
            <p className="text-xs text-ios-gray-500 mb-3">
              Ziehen Sie Mitarbeiter auf eine Schicht oder nutzen Sie die Mehrfachauswahl
            </p>
            
            {shiftPlan.shifts.map((shift) => (
              <div key={shift.id} className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-ios-gray-700">{shift.name}</span>
                  <span className="text-xs text-ios-gray-500">
                    {Object.entries(selectedStaff).filter(([key, value]) => key.startsWith(`${shift.id}-`) && value).length} ausgewählt
                  </span>
                </div>
                <div 
                  className="p-3 border-2 border-dashed border-ios-gray-300 rounded-xl text-center hover:border-ios-blue transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const staffId = parseInt(e.dataTransfer.getData('staffId'));
                    handleAssignStaff(shift.id, staffId);
                  }}
                >
                  <PlusIcon className="h-5 w-5 mx-auto text-ios-gray-400" />
                  <p className="text-xs text-ios-gray-500 mt-1">Hier ablegen</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Change Dialog */}
      {showStatusDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowStatusDialog(false)} />
            
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-ios-gray-900 mb-4">
                Schichtstatus ändern
              </h3>
              
              <p className="text-sm text-ios-gray-600 mb-6">
                Wählen Sie den neuen Status für {statusAction.type === 'all' ? 'alle Schichten' : 'diese Schicht'}:
              </p>
              
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleStatusChange(statusAction.shiftId, 'preliminary')}
                  className="w-full p-4 rounded-xl border-2 border-ios-orange hover:bg-ios-orange/10 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-ios-orange" />
                    <div>
                      <p className="font-medium text-ios-gray-900">Vorläufig</p>
                      <p className="text-xs text-ios-gray-500">Mitarbeiter können noch nicht bestätigen</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleStatusChange(statusAction.shiftId, 'final')}
                  className="w-full p-4 rounded-xl border-2 border-ios-blue hover:bg-ios-blue/10 transition-colors text-left"
                >
                  <div className="flex items-center space-x-3">
                    <CheckCircleIcon className="h-6 w-6 text-ios-blue" />
                    <div>
                      <p className="font-medium text-ios-gray-900">Endgültig</p>
                      <p className="text-xs text-ios-gray-500">Mitarbeiter werden benachrichtigt und können bestätigen</p>
                    </div>
                  </div>
                </button>
              </div>
              
              <button
                onClick={() => {
                  setShowStatusDialog(false);
                  setStatusAction({ type: '', shiftId: null });
                }}
                className="w-full ios-button-secondary"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftPlanning;



