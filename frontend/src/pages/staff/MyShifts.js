// frontend/src/pages/staff/MyShifts.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
  AcademicCapIcon,
  ChevronRightIcon,
  FunnelIcon,
  ArrowPathIcon,
  XMarkIcon,
  EyeIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const MyShifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assigned'); // assigned, applications
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedShift, setSelectedShift] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [confirmingShift, setConfirmingShift] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    preliminary: 0,
    final: 0,
    confirmed: 0
  });
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    if (activeTab === 'assigned') {
      loadMyShifts();
    } else {
      loadMyApplications();
    }
  }, [activeTab, statusFilter]);

  const loadMyShifts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const response = await api.get('/staff/shifts/my', { params });
      setShifts(response.data.shifts);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Fehler beim Laden der Schichten:', error);
      toast.error('Fehler beim Laden der Schichten');
    } finally {
      setLoading(false);
    }
  };

  const loadMyApplications = async () => {
    try {
      setLoading(true);
      // Lade Bewerbungen über available shifts endpoint mit filter
      const response = await api.get('/staff/shifts/available?showAll=true');
      const myApplications = response.data.shifts.filter(s => s.my_status === 'applied');
      setApplications(myApplications);
    } catch (error) {
      console.error('Fehler beim Laden der Bewerbungen:', error);
      toast.error('Fehler beim Laden der Bewerbungen');
    } finally {
      setLoading(false);
    }
  };

  const confirmShift = async (shiftId) => {
    if (confirmingShift) return;
    
    setConfirmingShift(shiftId);
    try {
      await api.post(`/staff/shifts/${shiftId}/confirm`);
      toast.success('Schicht erfolgreich bestätigt');
      await loadMyShifts();
    } catch (error) {
      console.error('Fehler beim Bestätigen:', error);
      toast.error('Fehler beim Bestätigen der Schicht');
    } finally {
      setConfirmingShift(null);
    }
  };

  const withdrawApplication = async (shiftId) => {
    if (!window.confirm('Möchtest du deine Bewerbung wirklich zurückziehen?')) return;
    
    try {
      await api.delete(`/staff/shifts/${shiftId}/apply`);
      toast.success('Bewerbung erfolgreich zurückgezogen');
      await loadMyApplications();
    } catch (error) {
      console.error('Fehler beim Zurückziehen:', error);
      toast.error('Fehler beim Zurückziehen der Bewerbung');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDateTime = (dateString) => {
    return `${formatDate(dateString)} ${formatTime(dateString)}`;
  };

  const getWeekday = (dateString) => {
    const date = new Date(dateString);
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    return weekdays[date.getDay()];
  };

  const isPastShift = (endTime) => {
    return new Date(endTime) < new Date();
  };

  const getStatusBadge = (status) => {
    const badges = {
      preliminary: {
        text: 'Vorläufig',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: ExclamationTriangleIcon
      },
      final: {
        text: 'Endgültig',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: InformationCircleIcon
      },
      confirmed: {
        text: 'Bestätigt',
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircleIcon
      }
    };

    const badge = badges[status] || badges.preliminary;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
        <Icon className="h-3.5 w-3.5" />
        {badge.text}
      </span>
    );
  };

  const ShiftCard = ({ shift, showActions = true }) => {
    const isPast = isPastShift(shift.end_time);
    const needsConfirmation = shift.status === 'final' && !shift.confirmed_at;
    
    return (
      <div className={`ios-card p-4 ${isPast ? 'opacity-75' : ''}`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-ios-gray-900">{shift.event_name}</h3>
            <p className="text-sm text-ios-gray-600">{shift.shift_name}</p>
            {shift.position_name && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-ios-purple/10 text-ios-purple mt-1">
                {shift.position_name}
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(shift.status)}
            {isPast && (
              <span className="text-xs text-ios-gray-500">Beendet</span>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-ios-gray-600">
            <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{getWeekday(shift.start_time)}, {formatDate(shift.start_time)}</span>
          </div>
          
          <div className="flex items-center text-sm text-ios-gray-600">
            <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{shift.start_time_only || formatTime(shift.start_time)} - {shift.end_time_only || formatTime(shift.end_time)} Uhr</span>
          </div>
          
          <div className="flex items-center text-sm text-ios-gray-600">
            <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{shift.location}</span>
          </div>
        </div>

        {showActions && (
          <div className="flex items-center justify-between pt-3 border-t border-ios-gray-200">
            <button
              onClick={() => {
                setSelectedShift(shift);
                setShowDetailsModal(true);
              }}
              className="text-sm text-ios-blue hover:text-blue-600 font-medium flex items-center"
            >
              Details anzeigen
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </button>
            
            {needsConfirmation && !isPast && (
              <button
                onClick={() => confirmShift(shift.shift_id)}
                disabled={confirmingShift === shift.shift_id}
                className="ios-button-primary text-sm px-4 py-2 disabled:opacity-50"
              >
                {confirmingShift === shift.shift_id ? 'Wird bestätigt...' : 'Bestätigen'}
              </button>
            )}
            
            {shift.confirmed_at && (
              <span className="text-xs text-green-600 flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Bestätigt am {formatDate(shift.confirmed_at)}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const ApplicationCard = ({ shift }) => {
    return (
      <div className="ios-card p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-ios-gray-900">{shift.event_name}</h3>
            <p className="text-sm text-ios-gray-600">{shift.name}</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-ios-purple/10 text-ios-purple border border-ios-purple/20">
            <ClockIcon className="h-3.5 w-3.5 mr-1" />
            Beworben
          </span>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-ios-gray-600">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span>{formatDate(shift.start_time)}</span>
          </div>
          
          <div className="flex items-center text-sm text-ios-gray-600">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span>{shift.start_time_only} - {shift.end_time_only} Uhr</span>
          </div>
          
          <div className="flex items-center text-sm text-ios-gray-600">
            <MapPinIcon className="h-4 w-4 mr-2" />
            <span>{shift.location}</span>
          </div>
          
          <div className="flex items-center text-sm text-ios-gray-600">
            <UserGroupIcon className="h-4 w-4 mr-2" />
            <span>{shift.current_staff}/{shift.required_staff} Plätze besetzt</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-ios-gray-200">
          <button
            onClick={() => withdrawApplication(shift.id)}
            className="text-sm text-ios-red hover:text-red-600 font-medium"
          >
            Bewerbung zurückziehen
          </button>
          
          <span className="text-xs text-ios-gray-500">
            Beworben am {formatDate(new Date())}
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-ios-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 h-48"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-ios-gray-900">Meine Schichten</h1>
          <p className="text-ios-gray-600">Verwalte deine Schichteinteilungen</p>
        </div>
        
        <button
          onClick={() => activeTab === 'assigned' ? loadMyShifts() : loadMyApplications()}
          className="p-2 ios-card hover:bg-ios-gray-100"
          title="Aktualisieren"
        >
          <ArrowPathIcon className="h-5 w-5 text-ios-gray-600" />
        </button>
      </div>

      {/* Stats (nur bei assigned) */}
      {activeTab === 'assigned' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="ios-card p-4 text-center">
            <p className="text-2xl font-bold text-ios-gray-900">{stats.total}</p>
            <p className="text-sm text-ios-gray-600">Gesamt</p>
          </div>
          <div className="ios-card p-4 text-center border-l-4 border-yellow-400">
            <p className="text-2xl font-bold text-yellow-600">{stats.preliminary}</p>
            <p className="text-sm text-ios-gray-600">Vorläufig</p>
          </div>
          <div className="ios-card p-4 text-center border-l-4 border-blue-400">
            <p className="text-2xl font-bold text-blue-600">{stats.final}</p>
            <p className="text-sm text-ios-gray-600">Endgültig</p>
          </div>
          <div className="ios-card p-4 text-center border-l-4 border-green-400">
            <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
            <p className="text-sm text-ios-gray-600">Bestätigt</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-ios-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`flex-1 py-2 px-4 rounded transition-colors ${
            activeTab === 'assigned' 
              ? 'bg-white shadow-sm text-ios-gray-900 font-medium' 
              : 'text-ios-gray-600'
          }`}
        >
          Zugewiesene Schichten
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`flex-1 py-2 px-4 rounded transition-colors ${
            activeTab === 'applications' 
              ? 'bg-white shadow-sm text-ios-gray-900 font-medium' 
              : 'text-ios-gray-600'
          }`}
        >
          Meine Bewerbungen
        </button>
      </div>

      {/* Filter (nur bei assigned) */}
      {activeTab === 'assigned' && (
        <div className="ios-card p-4">
          <div className="flex items-center space-x-2 mb-3">
            <FunnelIcon className="h-5 w-5 text-ios-gray-600" />
            <span className="font-medium">Filter nach Status</span>
          </div>
          <div className="flex gap-2">
            {['all', 'preliminary', 'final', 'confirmed'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  statusFilter === status
                    ? 'bg-ios-blue text-white'
                    : 'bg-ios-gray-100 text-ios-gray-700 hover:bg-ios-gray-200'
                }`}
              >
                {status === 'all' ? 'Alle' : 
                 status === 'preliminary' ? 'Vorläufig' :
                 status === 'final' ? 'Endgültig' : 'Bestätigt'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'assigned' ? (
        // Zugewiesene Schichten
        shifts.length > 0 ? (
          <div className="grid gap-4">
            {shifts
              .filter(shift => statusFilter === 'all' || shift.status === statusFilter)
              .map(shift => (
                <ShiftCard key={shift.id} shift={shift} />
              ))}
          </div>
        ) : (
          <div className="ios-card p-12 text-center">
            <CalendarDaysIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
            <p className="text-ios-gray-500">Keine Schichten gefunden</p>
            <p className="text-sm text-ios-gray-400 mt-2">
              Du hast momentan keine zugewiesenen Schichten
            </p>
          </div>
        )
      ) : (
        // Bewerbungen
        applications.length > 0 ? (
          <div className="grid gap-4">
            {applications.map(app => (
              <ApplicationCard key={app.id} shift={app} />
            ))}
          </div>
        ) : (
          <div className="ios-card p-12 text-center">
            <DocumentTextIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
            <p className="text-ios-gray-500">Keine offenen Bewerbungen</p>
            <p className="text-sm text-ios-gray-400 mt-2">
              Du hast dich noch für keine Schichten beworben
            </p>
          </div>
        )
      )}

      {/* Info Box bei endgültigen Schichten */}
      {activeTab === 'assigned' && stats.final > 0 && (
        <div className="ios-card p-4 bg-ios-blue/5 border border-ios-blue/20">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-ios-blue flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-ios-gray-900">
                Du hast {stats.final} endgültige Schichteinteilung{stats.final > 1 ? 'en' : ''}
              </p>
              <p className="text-ios-gray-600 mt-1">
                Bitte bestätige diese Schichten, um dem Admin mitzuteilen, dass du die Einteilung gesehen hast.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedShift && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="ios-modal-backdrop" onClick={() => setShowDetailsModal(false)} />
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative bg-white rounded-2xl shadow-ios-xl max-w-md w-full p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-ios-gray-900">Schichtdetails</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 rounded-lg hover:bg-ios-gray-100"
                >
                  <XMarkIcon className="h-5 w-5 text-ios-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-ios-gray-600">Veranstaltung</p>
                  <p className="font-medium text-ios-gray-900">{selectedShift.event_name}</p>
                  {selectedShift.event_description && (
                    <p className="text-sm text-ios-gray-600 mt-1">{selectedShift.event_description}</p>
                  )}
                </div>
                
                <div>
                  <p className="text-sm text-ios-gray-600">Schicht</p>
                  <p className="font-medium text-ios-gray-900">{selectedShift.shift_name}</p>
                  {selectedShift.shift_description && (
                    <p className="text-sm text-ios-gray-600 mt-1">{selectedShift.shift_description}</p>
                  )}
                </div>
                
                <div>
                  <p className="text-sm text-ios-gray-600">Zeit</p>
                  <p className="font-medium text-ios-gray-900">
                    {getWeekday(selectedShift.start_time)}, {formatDate(selectedShift.start_time)}
                  </p>
                  <p className="text-sm text-ios-gray-700">
                    {selectedShift.start_time_only || formatTime(selectedShift.start_time)} - {selectedShift.end_time_only || formatTime(selectedShift.end_time)} Uhr
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-ios-gray-600">Ort</p>
                  <p className="font-medium text-ios-gray-900">{selectedShift.location}</p>
                </div>
                
                {selectedShift.position_name && (
                  <div>
                    <p className="text-sm text-ios-gray-600">Position</p>
                    <p className="font-medium text-ios-gray-900">{selectedShift.position_name}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-ios-gray-600">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedShift.status)}</div>
                  {selectedShift.confirmed_at && (
                    <p className="text-xs text-ios-gray-500 mt-1">
                      Bestätigt am {formatDateTime(selectedShift.confirmed_at)}
                    </p>
                  )}
                </div>
                
                {selectedShift.notes && (
                  <div>
                    <p className="text-sm text-ios-gray-600">Notizen</p>
                    <p className="text-sm text-ios-gray-700">{selectedShift.notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="ios-button-secondary"
                >
                  Schließen
                </button>
                
                {selectedShift.status === 'final' && !selectedShift.confirmed_at && (
                  <button
                    onClick={() => {
                      confirmShift(selectedShift.shift_id);
                      setShowDetailsModal(false);
                    }}
                    disabled={confirmingShift === selectedShift.shift_id}
                    className="ios-button-primary disabled:opacity-50"
                  >
                    {confirmingShift === selectedShift.shift_id ? 'Wird bestätigt...' : 'Bestätigen'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyShifts;
