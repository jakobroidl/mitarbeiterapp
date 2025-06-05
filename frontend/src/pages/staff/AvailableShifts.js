// frontend/src/pages/staff/AvailableShifts.js - KORRIGIERT
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  ShieldExclamationIcon,
  FunnelIcon,
  UserGroupIcon,
  InformationCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { format, parseISO, isFuture } from 'date-fns';
import { de } from 'date-fns/locale';

const AvailableShifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, qualified, available
  const [showAll, setShowAll] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    qualified: 0,
    with_conflicts: 0
  });

  useEffect(() => {
    loadAvailableShifts();
  }, [showAll]);

  const loadAvailableShifts = async () => {
    try {
      setLoading(true);
      // KORRIGIERT: Richtiger API-Pfad ohne /staff
      const response = await api.get(`/shifts/available?showAll=${showAll}`);
      setShifts(response.data.shifts);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Fehler beim Laden der Schichten:', error);
      toast.error('Fehler beim Laden der verfügbaren Schichten');
    } finally {
      setLoading(false);
    }
  };

  const applyForShift = async (shiftId) => {
    setApplying(true);
    try {
      // KORRIGIERT: Richtiger API-Pfad ohne /staff
      await api.post(`/shifts/${shiftId}/apply`);
      toast.success('Bewerbung erfolgreich eingereicht');
      loadAvailableShifts();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Fehler beim Bewerben:', error);
      
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
        toast.error(error.response?.data?.message || 'Fehler beim Einreichen der Bewerbung');
      }
    } finally {
      setApplying(false);
    }
  };

  const getQualificationStatus = (shift) => {
    if (!shift.required_qualifications || shift.required_qualification_count === 0) {
      return { type: 'none', text: 'Keine Qualifikationen erforderlich', color: 'text-ios-gray-500' };
    }
    
    if (shift.fully_qualified) {
      return { type: 'full', text: 'Voll qualifiziert', color: 'text-ios-green' };
    }
    
    if (shift.partially_qualified) {
      return { 
        type: 'partial', 
        text: `${shift.matching_qualifications} von ${shift.required_qualification_count} Qualifikationen`, 
        color: 'text-ios-orange' 
      };
    }
    
    return { type: 'none', text: 'Nicht qualifiziert', color: 'text-ios-red' };
  };

  const getShiftStatus = (shift) => {
    if (shift.my_status === 'assigned') {
      return { text: 'Bereits eingeteilt', color: 'bg-ios-green/10 text-ios-green border-ios-green/20' };
    }
    if (shift.my_status === 'applied') {
      return { text: 'Beworben', color: 'bg-ios-purple/10 text-ios-purple border-ios-purple/20' };
    }
    if (!shift.can_apply) {
      if (shift.has_conflicts) {
        return { text: 'Zeitkonflikt', color: 'bg-ios-red/10 text-ios-red border-ios-red/20' };
      }
      if (!shift.fully_qualified && !shift.partially_qualified) {
        return { text: 'Nicht qualifiziert', color: 'bg-ios-gray-100 text-ios-gray-600 border-ios-gray-200' };
      }
    }
    return { text: 'Verfügbar', color: 'bg-ios-blue/10 text-ios-blue border-ios-blue/20' };
  };

  const filteredShifts = shifts.filter(shift => {
    if (filter === 'qualified') return shift.fully_qualified;
    if (filter === 'available') return shift.can_apply;
    return true;
  });

  const ShiftCard = ({ shift }) => {
    const qualStatus = getQualificationStatus(shift);
    const shiftStatus = getShiftStatus(shift);
    
    return (
      <div className={`ios-card p-4 ${!shift.can_apply ? 'opacity-75' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-ios-gray-900">{shift.event_name}</h3>
            <p className="text-sm text-ios-gray-600">{shift.name}</p>
            {shift.position_name && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-ios-purple/10 text-ios-purple mt-1">
                {shift.position_name}
              </span>
            )}
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${shiftStatus.color}`}>
            {shiftStatus.text}
          </span>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-ios-gray-600">
            <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{format(parseISO(shift.start_time), 'dd.MM.yyyy', { locale: de })}</span>
          </div>
          
          <div className="flex items-center text-sm text-ios-gray-600">
            <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{shift.start_time_only} - {shift.end_time_only} Uhr</span>
          </div>
          
          <div className="flex items-center text-sm text-ios-gray-600">
            <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{shift.location}</span>
          </div>
          
          <div className="flex items-center text-sm text-ios-gray-600">
            <UserGroupIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{shift.current_staff}/{shift.required_staff} besetzt</span>
          </div>
          
          {shift.required_qualifications && (
            <div className="flex items-start text-sm">
              <AcademicCapIcon className={`h-4 w-4 mr-2 flex-shrink-0 mt-0.5 ${qualStatus.color}`} />
              <div>
                <p className={`font-medium ${qualStatus.color}`}>{qualStatus.text}</p>
                {qualStatus.type !== 'none' && (
                  <p className="text-xs text-ios-gray-500 mt-0.5">
                    Benötigt: {shift.required_qualifications}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {shift.has_conflicts && shift.conflicts.length > 0 && (
            <div className="flex items-start text-sm text-ios-red">
              <ShieldExclamationIcon className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Zeitkonflikt</p>
                <p className="text-xs mt-0.5">
                  mit: {shift.conflicts.map(c => c.shift_name).join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-ios-gray-200">
          <button
            onClick={() => {
              setSelectedShift(shift);
              setShowDetailsModal(true);
            }}
            className="text-sm text-ios-blue hover:text-blue-600 font-medium flex items-center"
          >
            Details anzeigen
            <ArrowRightIcon className="h-4 w-4 ml-1" />
          </button>
          
          {shift.can_apply && (
            <button
              onClick={() => applyForShift(shift.id)}
              disabled={applying}
              className="ios-button-primary text-sm px-4 py-2 disabled:opacity-50"
            >
              Bewerben
            </button>
          )}
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
      <div>
        <h1 className="text-2xl font-bold text-ios-gray-900">Verfügbare Schichten</h1>
        <p className="text-ios-gray-600">Bewirb dich für kommende Schichten</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="ios-card p-4 text-center">
          <p className="text-2xl font-bold text-ios-gray-900">{stats.total}</p>
          <p className="text-sm text-ios-gray-600">Gesamt</p>
        </div>
        <div className="ios-card p-4 text-center border-l-4 border-green-400">
          <p className="text-2xl font-bold text-green-600">{stats.qualified}</p>
          <p className="text-sm text-ios-gray-600">Qualifiziert</p>
        </div>
        <div className="ios-card p-4 text-center border-l-4 border-blue-400">
          <p className="text-2xl font-bold text-blue-600">{stats.available}</p>
          <p className="text-sm text-ios-gray-600">Verfügbar</p>
        </div>
        <div className="ios-card p-4 text-center border-l-4 border-red-400">
          <p className="text-2xl font-bold text-red-600">{stats.with_conflicts}</p>
          <p className="text-sm text-ios-gray-600">Mit Konflikten</p>
        </div>
      </div>

      {/* Filters */}
      <div className="ios-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-ios-gray-600" />
            <span className="font-medium text-ios-gray-900">Filter</span>
          </div>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="rounded text-ios-blue focus:ring-ios-blue mr-2"
            />
            <span className="text-sm text-ios-gray-700">Alle Schichten anzeigen</span>
          </label>
        </div>
        
        <div className="flex rounded-lg overflow-hidden border border-ios-gray-300 mt-3">
          {[
            { value: 'all', label: 'Alle' },
            { value: 'qualified', label: 'Qualifiziert' },
            { value: 'available', label: 'Verfügbar' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                filter === option.value
                  ? 'bg-ios-blue text-white'
                  : 'bg-white text-ios-gray-700 hover:bg-ios-gray-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shifts List */}
      {filteredShifts.length > 0 ? (
        <div className="grid gap-4">
          {filteredShifts.map(shift => (
            <ShiftCard key={shift.id} shift={shift} />
          ))}
        </div>
      ) : (
        <div className="ios-card p-12 text-center">
          <CalendarIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
          <p className="text-ios-gray-500">Keine Schichten gefunden</p>
          <p className="text-sm text-ios-gray-400 mt-2">
            {filter === 'qualified' 
              ? 'Du bist für keine der verfügbaren Schichten qualifiziert'
              : filter === 'available'
              ? 'Keine Schichten ohne Konflikte oder Qualifikationsprobleme'
              : 'Momentan sind keine Schichten verfügbar'}
          </p>
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
                  <XCircleIcon className="h-5 w-5 text-ios-gray-600" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-ios-gray-600">Veranstaltung</p>
                  <p className="font-medium text-ios-gray-900">{selectedShift.event_name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-ios-gray-600">Schicht</p>
                  <p className="font-medium text-ios-gray-900">{selectedShift.name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-ios-gray-600">Zeit</p>
                  <p className="font-medium text-ios-gray-900">
                    {format(parseISO(selectedShift.start_time), 'dd.MM.yyyy HH:mm')} - 
                    {format(parseISO(selectedShift.end_time), 'HH:mm')} Uhr
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
                  <p className="text-sm text-ios-gray-600">Besetzung</p>
                  <div className="flex items-center mt-1">
                    <div className="flex-1 bg-ios-gray-200 rounded-full h-2">
                      <div 
                        className="bg-ios-blue h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (selectedShift.current_staff / selectedShift.required_staff) * 100)}%` }}
                      />
                    </div>
                    <span className="ml-3 text-sm font-medium text-ios-gray-700">
                      {selectedShift.current_staff}/{selectedShift.required_staff}
                    </span>
                  </div>
                </div>
                
                {selectedShift.required_qualifications && (
                  <div>
                    <p className="text-sm text-ios-gray-600">Erforderliche Qualifikationen</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedShift.required_qualifications.split(', ').map((qual, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-ios-gray-100 text-ios-gray-700 border border-ios-gray-200"
                        >
                          {qual}
                        </span>
                      ))}
                    </div>
                    <div className={`mt-2 ${getQualificationStatus(selectedShift).color}`}>
                      <p className="text-sm font-medium flex items-center">
                        {getQualificationStatus(selectedShift).type === 'full' && (
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                        )}
                        {getQualificationStatus(selectedShift).type === 'none' && (
                          <XCircleIcon className="h-4 w-4 mr-1" />
                        )}
                        {getQualificationStatus(selectedShift).text}
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedShift.has_conflicts && selectedShift.conflicts.length > 0 && (
                  <div className="p-3 bg-ios-red/10 rounded-xl">
                    <p className="text-sm font-medium text-ios-red flex items-center">
                      <ShieldExclamationIcon className="h-4 w-4 mr-2" />
                      Zeitkonflikt mit anderen Schichten
                    </p>
                    <ul className="mt-2 text-xs text-ios-red space-y-1">
                      {selectedShift.conflicts.map((conflict, idx) => (
                        <li key={idx}>
                          • {conflict.event_name}: {conflict.shift_name} ({conflict.time})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 ios-button-secondary"
                >
                  Schließen
                </button>
                {selectedShift.can_apply && (
                  <button
                    onClick={() => applyForShift(selectedShift.id)}
                    disabled={applying}
                    className="flex-1 ios-button-primary disabled:opacity-50"
                  >
                    {applying ? 'Wird verarbeitet...' : 'Bewerben'}
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

export default AvailableShifts;
