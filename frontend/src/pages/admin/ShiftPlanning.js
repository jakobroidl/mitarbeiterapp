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
  TrashIcon,
  AcademicCapIcon,
  ShieldExclamationIcon,
  FunnelIcon,
  InformationCircleIcon
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
  const [filterFullyQualified, setFilterFullyQualified] = useState(false);
  const [filterNoConflicts, setFilterNoConflicts] = useState(true);
  const [qualifications, setQualifications] = useState([]);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusAction, setStatusAction] = useState({ type: '', shiftId: null });
  const [selectedShiftForAssignment, setSelectedShiftForAssignment] = useState(null);
  const [showStaffDetails, setShowStaffDetails] = useState(null);

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
      const requestData = {
        staff_id: staffId,
        status: 'preliminary'
      };
      
      if (positionId) {
        requestData.position_id = positionId;
      }
      
      await api.post(`/shifts/${shiftId}/assign`, requestData);
      
      toast.success('Mitarbeiter erfolgreich eingeteilt');
      loadEventAndShiftPlan();
    } catch (error) {
      console.error('Fehler beim Einteilen:', error);
      
      // Spezifische Fehlermeldungen anzeigen
      if (error.response?.data?.conflicts) {
        const conflicts = error.response.data.conflicts;
        toast.error(
          <div>
            <p className="font-semibold">{error.response.data.message}</p>
            <ul className="mt-2 text-sm">
              {conflicts.map((c, i) => (
                <li key={i}>• {c.event}: {c.time}</li>
              ))}
            </ul>
          </div>,
          { duration: 6000 }
        );
      } else if (error.response?.data?.details) {
        toast.error(
          <div>
            <p className="font-semibold">{error.response.data.message}</p>
            <p className="text-sm mt-1">{error.response.data.details.message}</p>
          </div>,
          { duration: 5000 }
        );
      } else {
        toast.error(error.response?.data?.message || 'Fehler beim Einteilen des Mitarbeiters');
      }
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

  // Filter verfügbare Mitarbeiter
  const getFilteredAvailableStaff = () => {
    if (!shiftPlan) return [];
    
    return shiftPlan.availableStaff.filter(staff => {
      // Qualifikationsfilter
      if (filterQualification && !staff.qualifications?.includes(filterQualification)) {
        return false;
      }
      
      // Filter für voll qualifizierte
      if (filterFullyQualified && selectedShiftForAssignment) {
        const shift = shiftPlan.shifts.find(s => s.id === selectedShiftForAssignment);
        if (shift && shift.required_qualifications) {
          const requiredQuals = shift.qualification_ids?.split(',') || [];
          const staffQuals = staff.qualification_ids?.split(',') || [];
          const hasAll = requiredQuals.every(reqId => staffQuals.includes(reqId));
          if (!hasAll) return false;
        }
      }
      
      // Filter für Konflikte
      if (filterNoConflicts && selectedShiftForAssignment) {
        const applicant = shiftPlan.shifts
          .find(s => s.id === selectedShiftForAssignment)
          ?.applications?.find(a => a.staff_id === staff.id);
        if (applicant?.has_conflicts) return false;
      }
      
      return true;
    });
  };

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

  const getQualificationBadge = (qual) => {
    const colors = {
      'Barkeeper': 'bg-orange-100 text-orange-800 border-orange-200',
      'Kassierer': 'bg-green-100 text-green-800 border-green-200',
      'Security': 'bg-red-100 text-red-800 border-red-200',
      'Auf-/Abbau': 'bg-blue-100 text-blue-800 border-blue-200',
      'Garderobe': 'bg-purple-100 text-purple-800 border-purple-200',
      'Einlass': 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    
    return colors[qual] || 'bg-gray-100 text-gray-800 border-gray-200';
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

  const filteredAvailableStaff = getFilteredAvailableStaff();

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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ios-gray-600">Schichten</p>
              <p className="text-2xl font-bold text-ios-gray-900">{shiftPlan.stats.totalShifts}</p>
            </div>
            <CalendarDaysIcon className="h-8 w-8 text-ios-blue" />
          </div>
        </div>
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ios-gray-600">Benötigt</p>
              <p className="text-2xl font-bold text-ios-gray-900">
                {shiftPlan.stats.totalPositionsNeeded}
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
                {shiftPlan.stats.totalAssigned}
              </p>
            </div>
            <UserIcon className="h-8 w-8 text-ios-orange" />
          </div>
        </div>
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ios-gray-600">Bewerbungen</p>
              <p className="text-2xl font-bold text-ios-purple">
                {shiftPlan.stats.totalApplications}
              </p>
            </div>
            <EnvelopeIcon className="h-8 w-8 text-ios-purple" />
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
                      
                      {/* Erforderliche Qualifikationen */}
                      {shift.required_qualifications && (
                        <div className="flex items-center mt-2 space-x-2">
                          <AcademicCapIcon className="h-4 w-4 text-ios-gray-500" />
                          <div className="flex flex-wrap gap-1">
                            {shift.required_qualifications.split(', ').map((qual, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getQualificationBadge(qual)}`}
                              >
                                {qual}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 mt-2 text-sm text-ios-gray-600">
                        <span>
                          <ClockIcon className="inline h-4 w-4 mr-1" />
                          {format(parseISO(shift.start_time), 'HH:mm')} - {format(parseISO(shift.end_time), 'HH:mm')}
                        </span>
                        <span className={coverageStatus.color}>
                          <UserGroupIcon className="inline h-4 w-4 mr-1" />
                          {shift.coverage.assigned}/{shift.required_staff} besetzt
                        </span>
                        {shift.coverage.applicants > 0 && (
                          <span className="text-ios-purple">
                            <EnvelopeIcon className="inline h-4 w-4 mr-1" />
                            {shift.coverage.applicants} Bewerbungen
                            {shift.coverage.qualified_applicants > 0 && (
                              <span className="text-ios-green ml-1">
                                ({shift.coverage.qualified_applicants} qualifiziert)
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {/* Coverage Bar */}
                      <div className="w-24 h-2 bg-ios-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${coverageStatus.bg} transition-all duration-300`}
                          style={{ width: `${Math.min(100, (shift.coverage.assigned / shift.required_staff) * 100)}%` }}
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
                                    {assignment.personal_code} • {assignment.staff_qualifications || 'Keine Qualifikationen'}
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

                    {/* Applicants */}
                    {shift.applications.length > 0 && (
                      <div className="p-4 bg-ios-gray-50">
                        <h4 className="text-sm font-medium text-ios-gray-700 mb-3">
                          Bewerbungen ({shift.applications.length})
                        </h4>
                        <div className="space-y-2">
                          {shift.applications.map((applicant) => (
                            <div 
                              key={applicant.id}
                              className={`flex items-center justify-between p-3 rounded-xl bg-white border ${
                                applicant.has_conflicts ? 'border-ios-red/20' : 'border-ios-gray-200'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                {applicant.profile_image ? (
                                  <img
                                    src={`/uploads/profiles/${applicant.profile_image}`}
                                    alt={applicant.staff_name}
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-ios-gray-200 flex items-center justify-center">
                                    <UserIcon className="h-4 w-4 text-ios-gray-500" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-ios-gray-900 flex items-center">
                                    {applicant.staff_name}
                                    {applicant.fully_qualified && (
                                      <CheckCircleIcon className="h-4 w-4 text-ios-green ml-2" title="Voll qualifiziert" />
                                    )}
                                    {applicant.has_conflicts && (
                                      <ExclamationTriangleIcon className="h-4 w-4 text-ios-red ml-2" title="Hat Zeitkonflikte" />
                                    )}
                                  </p>
                                  <p className="text-xs text-ios-gray-500">
                                    {applicant.qualifications || 'Keine Qualifikationen'}
                                  </p>
                                  {applicant.qualification_match && !applicant.fully_qualified && (
                                    <p className="text-xs text-ios-orange mt-1">
                                      {applicant.qualification_match.has} von {applicant.qualification_match.required} Qualifikationen
                                    </p>
                                  )}
                                  {applicant.has_conflicts && (
                                    <p className="text-xs text-ios-red mt-1">
                                      Konflikt mit: {applicant.conflicts.map(c => c.shift_name).join(', ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssignStaff(shift.id, applicant.staff_id, shift.position_id);
                                  }}
                                  disabled={applicant.has_conflicts}
                                  className={`ios-button-primary text-sm px-3 py-1 ${
                                    applicant.has_conflicts ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                >
                                  Einteilen
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
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedShiftForAssignment(shift.id);
                          }}
                          className="ios-button-secondary text-sm"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Mitarbeiter zuweisen
                        </button>
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

          {/* Filters */}
          <div className="ios-card p-4 space-y-3">
            <h3 className="text-sm font-medium text-ios-gray-700 flex items-center">
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filter
            </h3>
            
            {/* Qualification Filter */}
            <div>
              <label className="block text-xs text-ios-gray-600 mb-1">Qualifikation</label>
              <select
                value={filterQualification}
                onChange={(e) => setFilterQualification(e.target.value)}
                className="ios-input w-full text-sm"
              >
                <option value="">Alle Qualifikationen</option>
                {qualifications.map(qual => (
                  <option key={qual.id} value={qual.name}>{qual.name}</option>
                ))}
              </select>
            </div>
            
            {/* Checkboxes */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filterFullyQualified}
                  onChange={(e) => setFilterFullyQualified(e.target.checked)}
                  className="rounded text-ios-blue focus:ring-ios-blue mr-2"
                />
                <span className="text-sm text-ios-gray-700">Nur voll qualifizierte</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filterNoConflicts}
                  onChange={(e) => setFilterNoConflicts(e.target.checked)}
                  className="rounded text-ios-blue focus:ring-ios-blue mr-2"
                />
                <span className="text-sm text-ios-gray-700">Ohne Zeitkonflikte</span>
              </label>
            </div>
          </div>

          {/* Staff List */}
          <div className="ios-card p-4 max-h-[calc(100vh-400px)] overflow-y-auto">
            {selectedShiftForAssignment && (
              <div className="mb-3 p-3 bg-ios-blue/10 rounded-xl">
                <p className="text-sm font-medium text-ios-blue">
                  Mitarbeiter für "{shiftPlan.shifts.find(s => s.id === selectedShiftForAssignment)?.name}" auswählen
                </p>
              </div>
            )}
            
            {filteredAvailableStaff.length > 0 ? (
              <div className="space-y-2">
                {filteredAvailableStaff.map((staff) => {
                  // Check if staff is already assigned to any shift
                  const isAssigned = shiftPlan.shifts.some(shift => 
                    shift.assignments.some(a => a.staff_id === staff.id)
                  );
                  
                  // Get qualification match for selected shift
                  let qualificationMatch = null;
                  if (selectedShiftForAssignment) {
                    const shift = shiftPlan.shifts.find(s => s.id === selectedShiftForAssignment);
                    const applicant = shift?.applications?.find(a => a.staff_id === staff.id);
                    qualificationMatch = applicant?.qualification_match;
                  }
                  
                  return (
                    <div
                      key={staff.id}
                      className={`p-3 rounded-xl border ${
                        isAssigned 
                          ? 'border-ios-gray-200 bg-ios-gray-50 opacity-50' 
                          : 'border-ios-gray-200 hover:border-ios-gray-300 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!isAssigned && selectedShiftForAssignment) {
                          handleAssignStaff(selectedShiftForAssignment, staff.id);
                        }
                      }}
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
                          <p className="font-medium text-ios-gray-900 truncate flex items-center">
                            {staff.name}
                            {isAssigned && (
                              <CheckCircleIcon className="h-4 w-4 text-ios-green ml-2 flex-shrink-0" title="Bereits eingeteilt" />
                            )}
                          </p>
                          <p className="text-xs text-ios-gray-500 truncate">
                            {staff.personal_code} • {staff.qualifications || 'Keine'}
                          </p>
                          {qualificationMatch && !qualificationMatch.hasAll && (
                            <p className="text-xs text-ios-orange mt-1">
                              {qualificationMatch.has} von {qualificationMatch.required} Qualifikationen
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowStaffDetails(staff);
                          }}
                          className="p-1 hover:bg-ios-gray-100 rounded"
                        >
                          <InformationCircleIcon className="h-5 w-5 text-ios-gray-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-ios-gray-500 py-4">
                Keine verfügbaren Mitarbeiter mit den gewählten Filtern
              </p>
            )}
          </div>

          {/* Quick Assignment Info */}
          <div className="ios-card p-4">
            <h3 className="text-sm font-medium text-ios-gray-700 mb-3">Schnellzuweisung</h3>
            <p className="text-xs text-ios-gray-500 mb-3">
              Klicken Sie auf einen Mitarbeiter oder ziehen Sie ihn auf eine Schicht
            </p>
            
            {shiftPlan.shifts.map((shift) => (
              <div 
                key={shift.id}
                className={`mb-3 p-3 border-2 border-dashed rounded-xl transition-colors ${
                  selectedShiftForAssignment === shift.id 
                    ? 'border-ios-blue bg-ios-blue/5' 
                    : 'border-ios-gray-300 hover:border-ios-blue'
                }`}
                onClick={() => setSelectedShiftForAssignment(shift.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const staffId = parseInt(e.dataTransfer.getData('staffId'));
                  handleAssignStaff(shift.id, staffId);
                }}
              >
                <p className="text-sm font-medium text-ios-gray-700">{shift.name}</p>
                <p className="text-xs text-ios-gray-500 mt-1">
                  {shift.coverage.assigned}/{shift.required_staff} besetzt
                  {shift.required_qualifications && (
                    <span className="block mt-1">
                      Benötigt: {shift.required_qualifications}
                    </span>
                  )}
                </p>
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

      {/* Staff Details Modal */}
      {showStaffDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowStaffDetails(null)} />
            
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-ios-gray-900">
                  Mitarbeiter-Details
                </h3>
                <button
                  onClick={() => setShowStaffDetails(null)}
                  className="p-1 rounded-lg hover:bg-ios-gray-100"
                >
                  <XCircleIcon className="h-5 w-5 text-ios-gray-600" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  {showStaffDetails.profile_image ? (
                    <img
                      src={`/uploads/profiles/${showStaffDetails.profile_image}`}
                      alt={showStaffDetails.name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-ios-gray-200 flex items-center justify-center">
                      <UserIcon className="h-8 w-8 text-ios-gray-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-ios-gray-900">{showStaffDetails.name}</p>
                    <p className="text-sm text-ios-gray-500">{showStaffDetails.personal_code}</p>
                  </div>
                </div>
                
                {showStaffDetails.qualifications && (
                  <div>
                    <p className="text-sm font-medium text-ios-gray-700 mb-2">Qualifikationen</p>
                    <div className="flex flex-wrap gap-2">
                      {showStaffDetails.qualifications.split(', ').map((qual, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getQualificationBadge(qual)}`}
                        >
                          {qual}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium text-ios-gray-700 mb-2">Schicht-Kompatibilität</p>
                  <div className="space-y-2">
                    {shiftPlan.shifts.map(shift => {
                      const applicant = shift.applications?.find(a => a.staff_id === showStaffDetails.id);
                      const hasApplied = !!applicant;
                      const isQualified = applicant?.fully_qualified;
                      const hasConflicts = applicant?.has_conflicts;
                      
                      return (
                        <div key={shift.id} className="flex items-center justify-between p-2 bg-ios-gray-50 rounded-lg">
                          <span className="text-sm text-ios-gray-700">{shift.name}</span>
                          <div className="flex items-center space-x-2">
                            {hasApplied && (
                              <span className="text-xs text-ios-purple">Beworben</span>
                            )}
                            {isQualified ? (
                              <CheckCircleIcon className="h-4 w-4 text-ios-green" title="Qualifiziert" />
                            ) : shift.required_qualifications && (
                              <XCircleIcon className="h-4 w-4 text-ios-gray-400" title="Nicht qualifiziert" />
                            )}
                            {hasConflicts && (
                              <ShieldExclamationIcon className="h-4 w-4 text-ios-red" title="Zeitkonflikt" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => setShowStaffDetails(null)}
                  className="w-full ios-button-secondary"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftPlanning;


