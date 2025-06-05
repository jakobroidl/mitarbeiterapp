// frontend/src/pages/staff/MyShifts.js
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
  InformationCircleIcon,
  ShieldExclamationIcon,
  AcademicCapIcon,
  ChevronRightIcon,
  FunnelIcon,
  ArrowPathIcon,
  XMarkIcon,
  UserGroupIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

const MyShifts = () => {
  // State für beide Tabs
  const [activeTab, setActiveTab] = useState('my-shifts');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // State für "Meine Schichten"
  const [myShifts, setMyShifts] = useState([]);
  const [myShiftsFilter, setMyShiftsFilter] = useState('all'); // all, preliminary, final, confirmed
  const [myShiftsStats, setMyShiftsStats] = useState({
    total: 0,
    preliminary: 0,
    final: 0,
    confirmed: 0
  });
  
  // State für "Verfügbare Schichten"
  const [availableShifts, setAvailableShifts] = useState([]);
  const [availableFilter, setAvailableFilter] = useState('all'); // all, qualified, available
  const [showAll, setShowAll] = useState(false);
  const [availableStats, setAvailableStats] = useState({
    total: 0,
    available: 0,
    qualified: 0,
    with_conflicts: 0
  });
  
  // Gemeinsame States
  const [selectedShift, setSelectedShift] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (activeTab === 'my-shifts') {
      loadMyShifts();
    } else {
      loadAvailableShifts();
    }
  }, [activeTab, showAll]);

  const loadMyShifts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/staff/shifts/my');
      setMyShifts(response.data.shifts);
      setMyShiftsStats(response.data.stats);
    } catch (error) {
      console.error('Fehler beim Laden der Schichten:', error);
      toast.error('Fehler beim Laden deiner Schichten');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableShifts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/staff/shifts/available?showAll=${showAll}`);
      setAvailableShifts(response.data.shifts);
      setAvailableStats(response.data.stats);
    } catch (error) {
      console.error('Fehler beim Laden der verfügbaren Schichten:', error);
      toast.error('Fehler beim Laden der verfügbaren Schichten');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'my-shifts') {
        await loadMyShifts();
      } else {
        await loadAvailableShifts();
      }
      toast.success('Daten aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setRefreshing(false);
    }
  };

  const confirmShift = async (shiftId) => {
    setConfirming(true);
    try {
      await api.post(`/staff/shifts/${shiftId}/confirm`);
      toast.success('Schicht erfolgreich bestätigt');
      await loadMyShifts();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Fehler beim Bestätigen:', error);
      toast.error('Fehler beim Bestätigen der Schicht');
    } finally {
      setConfirming(false);
    }
  };

  const applyForShift = async (shiftId) => {
    setApplying(true);
    try {
      await api.post(`/staff/shifts/${shiftId}/apply`);
      toast.success('Bewerbung erfolgreich eingereicht');
      await loadAvailableShifts();
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

  const getQualificationStatus = (shift) => {
    if (!shift.required_qualifications || shift.required_qualification_count === 0) {
      return { type: 'none', text: 'Keine Qualifikationen erforderlich', color: 'text-ios-gray-500' };
    }
    
    if (shift.fully_qualified || (shift.matching_qualifications === shift.required_qualification_count)) {
      return { type: 'full', text: 'Voll qualifiziert', color: 'text-ios-green' };
    }
    
    if (shift.partially_qualified || (shift.matching_qualifications > 0)) {
      return { 
        type: 'partial', 
        text: `${shift.matching_qualifications} von ${shift.required_qualification_count} Qualifikationen`, 
        color: 'text-ios-orange' 
      };
    }
    
    return { type: 'none', text: 'Nicht qualifiziert', color: 'text-ios-red' };
  };

  const getShiftAvailabilityStatus = (shift) => {
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

  // Komponente für Meine Schichten Tab
  const MyShiftsTab = () => {
    const filteredShifts = myShifts.filter(shift => {
      if (myShiftsFilter === 'all') return true;
      return shift.status === myShiftsFilter;
    });

    return (
      <div className="space-y-4">
        {/* Filter */}
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-ios-gray-600" />
              <span className="font-medium text-ios-gray-900">Filter</span>
            </div>
          </div>
          
          <div className="flex rounded-lg overflow-hidden border border-ios-gray-300 mt-3">
            {[
              { value: 'all', label: 'Alle' },
              { value: 'preliminary', label: 'Vorläufig' },
              { value: 'final', label: 'Endgültig' },
              { value: 'confirmed', label: 'Bestätigt' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setMyShiftsFilter(option.value)}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  myShiftsFilter === option.value
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
              <div key={shift.id} className="ios-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-ios-gray-900">{shift.event_name}</h3>
                    <p className="text-sm text-ios-gray-600">{shift.shift_name}</p>
                    {shift.position_name && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-ios-purple/10 text-ios-purple mt-1">
                        {shift.position_name}
                      </span>
                    )}
                  </div>
                  {getStatusBadge(shift.status)}
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
                  
                  {shift.status === 'final' && !shift.confirmed_at && (
                    <button
                      onClick={() => confirmShift(shift.shift_id)}
                      disabled={confirming}
                      className="ios-button-primary text-sm px-4 py-2 disabled:opacity-50"
                    >
                      {confirming ? 'Wird bestätigt...' : 'Bestätigen'}
                    </button>
                  )}
                  
                  {shift.confirmed_at && (
                    <span className="text-xs text-green-600 flex items-center">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Bestätigt am {format(parseISO(shift.confirmed_at), 'dd.MM.', { locale: de })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ios-card p-12 text-center">
            <CalendarIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
            <p className="text-ios-gray-500">Keine Schichten gefunden</p>
            <p className="text-sm text-ios-gray-400 mt-2">
              {myShiftsFilter !== 'all' 
                ? `Keine ${myShiftsFilter === 'preliminary' ? 'vorläufigen' : myShiftsFilter === 'final' ? 'endgültigen' : 'bestätigten'} Schichten`
                : 'Du hast noch keine Schichteinteilungen'}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Komponente für Verfügbare Schichten Tab
  const AvailableShiftsTab = () => {
    const filteredShifts = availableShifts.filter(shift => {
      if (availableFilter === 'qualified') return shift.fully_qualified;
      if (availableFilter === 'available') return shift.can_apply;
      return true;
    });

    return (
      <div className="space-y-4">
        {/* Filter */}
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
                onClick={() => setAvailableFilter(option.value)}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  availableFilter === option.value
                    ? 'bg-ios-blue text-white'
                    : 'bg-white text-ios-gray-700 hover:bg-ios-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="ios-card p-4 bg-ios-blue/5 border border-ios-blue/20">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-ios-blue flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-ios-gray-900">
                Verfügbare Schichten
              </p>
              <p className="text-ios-gray-600 mt-1">
                Hier siehst du alle Schichten, für die du dich bewerben kannst. 
                {!showAll && ' Aktiviere "Alle Schichten anzeigen" um auch Schichten ohne passende Qualifikationen zu sehen.'}
              </p>
            </div>
          </div>
        </div>

        {/* Shifts List */}
        {filteredShifts.length > 0 ? (
          <div className="grid gap-4">
            {filteredShifts.map(shift => {
              const qualStatus = getQualificationStatus(shift);
              const shiftStatus = getShiftAvailabilityStatus(shift);
              
              return (
                <div key={shift.id} className={`ios-card p-4 ${!shift.can_apply ? 'opacity-75' : ''}`}>
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
                    
                    {shift.has_conflicts && shift.conflicts && shift.conflicts.length > 0 && (
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
                        {applying ? 'Wird gesendet...' : 'Bewerben'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ios-card p-12 text-center">
            <MagnifyingGlassIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
            <p className="text-ios-gray-500">Keine Schichten gefunden</p>
            <p className="text-sm text-ios-gray-400 mt-2">
              {availableFilter === 'qualified' 
                ? 'Du bist für keine der verfügbaren Schichten qualifiziert'
                : availableFilter === 'available'
                ? 'Keine Schichten ohne Konflikte oder Qualifikationsprobleme'
                : 'Momentan sind keine Schichten verfügbar'}
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading && myShifts.length === 0 && availableShifts.length === 0) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ios-gray-900">Schichtenverwaltung</h1>
          <p className="text-ios-gray-600">Verwalte deine Schichten und finde neue Einsätze</p>
        </div>
        
        <button
          onClick={refreshData}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-ios-gray-100 disabled:opacity-50"
          title="Aktualisieren"
        >
          <ArrowPathIcon className={`h-5 w-5 text-ios-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats based on active tab */}
      {activeTab === 'my-shifts' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="ios-card p-4 text-center">
            <p className="text-2xl font-bold text-ios-gray-900">{myShiftsStats.total}</p>
            <p className="text-sm text-ios-gray-600">Gesamt</p>
          </div>
          <div className="ios-card p-4 text-center border-l-4 border-yellow-400">
            <p className="text-2xl font-bold text-yellow-600">{myShiftsStats.preliminary}</p>
            <p className="text-sm text-ios-gray-600">Vorläufig</p>
          </div>
          <div className="ios-card p-4 text-center border-l-4 border-blue-400">
            <p className="text-2xl font-bold text-blue-600">{myShiftsStats.final}</p>
            <p className="text-sm text-ios-gray-600">Endgültig</p>
          </div>
          <div className="ios-card p-4 text-center border-l-4 border-green-400">
            <p className="text-2xl font-bold text-green-600">{myShiftsStats.confirmed}</p>
            <p className="text-sm text-ios-gray-600">Bestätigt</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="ios-card p-4 text-center">
            <p className="text-2xl font-bold text-ios-gray-900">{availableStats.total}</p>
            <p className="text-sm text-ios-gray-600">Gesamt</p>
          </div>
          <div className="ios-card p-4 text-center border-l-4 border-green-400">
            <p className="text-2xl font-bold text-green-600">{availableStats.qualified}</p>
            <p className="text-sm text-ios-gray-600">Qualifiziert</p>
          </div>
          <div className="ios-card p-4 text-center border-l-4 border-blue-400">
            <p className="text-2xl font-bold text-blue-600">{availableStats.available}</p>
            <p className="text-sm text-ios-gray-600">Verfügbar</p>
          </div>
          <div className="ios-card p-4 text-center border-l-4 border-red-400">
            <p className="text-2xl font-bold text-red-600">{availableStats.with_conflicts}</p>
            <p className="text-sm text-ios-gray-600">Mit Konflikten</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-ios-gray-100 rounded-xl">
        <button
          onClick={() => setActiveTab('my-shifts')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'my-shifts'
              ? 'bg-white shadow-sm text-ios-gray-900'
              : 'text-ios-gray-600 hover:text-ios-gray-900'
          }`}
        >
          <CalendarIcon className="h-5 w-5" />
          <span>Meine Schichten</span>
          {myShiftsStats.total > 0 && (
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              activeTab === 'my-shifts' 
                ? 'bg-ios-blue text-white' 
                : 'bg-ios-gray-200 text-ios-gray-700'
            }`}>
              {myShiftsStats.total}
            </span>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'available'
              ? 'bg-white shadow-sm text-ios-gray-900'
              : 'text-ios-gray-600 hover:text-ios-gray-900'
          }`}
        >
          <MagnifyingGlassIcon className="h-5 w-5" />
          <span>Schichten finden</span>
          {availableStats.available > 0 && (
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              activeTab === 'available' 
                ? 'bg-ios-blue text-white' 
                : 'bg-ios-gray-200 text-ios-gray-700'
            }`}>
              {availableStats.available}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'my-shifts' ? <MyShiftsTab /> : <AvailableShiftsTab />}

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
                </div>
                
                <div>
                  <p className="text-sm text-ios-gray-600">Schicht</p>
                  <p className="font-medium text-ios-gray-900">{selectedShift.shift_name || selectedShift.name}</p>
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
                
                {activeTab === 'my-shifts' && (
                  <div>
                    <p className="text-sm text-ios-gray-600">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedShift.status)}</div>
                  </div>
                )}
                
                {activeTab === 'available' && (
                  <>
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
                            {getQualificationStatus(selectedShift).type === 'none' && !selectedShift.required_qualifications && (
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                            )}
                            {getQualificationStatus(selectedShift).text}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {selectedShift.has_conflicts && selectedShift.conflicts && selectedShift.conflicts.length > 0 && (
                      <div className="p-3 bg-ios-red/10 rounded-xl">
                        <p className="text-sm font-medium text-ios-red flex items-center">
                          <ShieldExclamationIcon className="h-4 w-4 mr-2" />
                          Zeitkonflikt mit anderen Schichten
                        </p>
                        <ul className="mt-2 text-xs text-ios-red space-y-1">
                          {selectedShift.conflicts.map((conflict, idx) => (
                            <li key={idx}>
                              • {conflict.event_name}: {conflict.shift_name} ({conflict.time || 'Zeit nicht verfügbar'})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 ios-button-secondary"
                >
                  Schließen
                </button>
                
                {activeTab === 'my-shifts' && selectedShift.status === 'final' && !selectedShift.confirmed_at && (
                  <button
                    onClick={() => confirmShift(selectedShift.shift_id)}
                    disabled={confirming}
                    className="flex-1 ios-button-primary disabled:opacity-50"
                  >
                    {confirming ? 'Wird bestätigt...' : 'Schicht bestätigen'}
                  </button>
                )}
                
                {activeTab === 'available' && selectedShift.can_apply && (
                  <button
                    onClick={() => applyForShift(selectedShift.id)}
                    disabled={applying}
                    className="flex-1 ios-button-primary disabled:opacity-50"
                  >
                    {applying ? 'Wird gesendet...' : 'Bewerben'}
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


