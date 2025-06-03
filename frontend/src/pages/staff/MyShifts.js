// frontend/src/pages/staff/MyShifts.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronRightIcon,
  FunnelIcon,
  ArrowPathIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { format, parseISO, isPast, isFuture, isToday, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';

const MyShifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, upcoming, past
  const [statusFilter, setStatusFilter] = useState('all'); // all, preliminary, final, confirmed
  const [selectedShift, setSelectedShift] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    preliminary: 0,
    final: 0,
    confirmed: 0
  });

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/staff/shifts/my');
      setShifts(response.data.shifts);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Fehler beim Laden der Schichten:', error);
      toast.error('Fehler beim Laden der Schichten');
    } finally {
      setLoading(false);
    }
  };

  const refreshShifts = async () => {
    setRefreshing(true);
    await loadShifts();
    setRefreshing(false);
    toast.success('Schichten aktualisiert');
  };

  const confirmShift = async (shiftId) => {
    try {
      await api.post(`/shifts/${shiftId}/confirm`);
      toast.success('Schicht erfolgreich bestätigt');
      await loadShifts();
    } catch (error) {
      console.error('Fehler beim Bestätigen:', error);
      toast.error('Fehler beim Bestätigen der Schicht');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      preliminary: { 
        text: 'Vorläufig', 
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: ExclamationCircleIcon
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

  const getShiftTimeStatus = (shift) => {
    const start = parseISO(shift.start_time);
    const now = new Date();
    
    if (isPast(start)) {
      return { text: 'Vergangen', color: 'text-ios-gray-500' };
    } else if (isToday(start)) {
      return { text: 'Heute', color: 'text-ios-blue font-semibold' };
    } else {
      const daysUntil = differenceInDays(start, now);
      if (daysUntil === 1) {
        return { text: 'Morgen', color: 'text-ios-purple font-semibold' };
      } else if (daysUntil <= 7) {
        return { text: `In ${daysUntil} Tagen`, color: 'text-ios-orange' };
      } else {
        return { text: format(start, 'dd.MM.yyyy'), color: 'text-ios-gray-600' };
      }
    }
  };

  const filteredShifts = shifts.filter(shift => {
    // Zeit-Filter
    const start = parseISO(shift.start_time);
    if (filter === 'upcoming' && isPast(start)) return false;
    if (filter === 'past' && isFuture(start)) return false;
    
    // Status-Filter
    if (statusFilter !== 'all' && shift.status !== statusFilter) return false;
    
    return true;
  });

  const ShiftCard = ({ shift }) => {
    const timeStatus = getShiftTimeStatus(shift);
    const needsConfirmation = shift.status === 'final' && !isPast(parseISO(shift.start_time));
    
    return (
      <div className="ios-card p-4 hover:shadow-ios-lg transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-ios-gray-900">{shift.event_name}</h3>
            <p className="text-sm text-ios-gray-600">{shift.shift_name}</p>
          </div>
          {getStatusBadge(shift.status)}
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-ios-gray-600">
            <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className={timeStatus.color}>{timeStatus.text}</span>
          </div>
          
          <div className="flex items-center text-sm text-ios-gray-600">
            <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>
              {format(parseISO(shift.start_time), 'HH:mm')} - 
              {format(parseISO(shift.end_time), 'HH:mm')} Uhr
            </span>
          </div>
          
          <div className="flex items-center text-sm text-ios-gray-600">
            <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{shift.location}</span>
          </div>
          
          {shift.position_name && (
            <div className="flex items-center text-sm text-ios-gray-600">
              <span className="font-medium mr-2">Position:</span>
              <span>{shift.position_name}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-ios-gray-200">
          {needsConfirmation ? (
            <button
              onClick={() => confirmShift(shift.shift_id)}
              className="ios-button-primary text-sm px-4 py-2"
            >
              Schicht bestätigen
            </button>
          ) : (
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
          )}
          
          {shift.confirmed_at && (
            <span className="text-xs text-ios-green flex items-center">
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              Bestätigt am {format(parseISO(shift.confirmed_at), 'dd.MM.yy')}
            </span>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ios-gray-900">Meine Schichten</h1>
          <p className="text-ios-gray-600">Verwalte deine Schichteinteilungen</p>
        </div>
        
        <button
          onClick={refreshShifts}
          disabled={refreshing}
          className="ios-button-secondary p-2"
        >
          <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
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

      {/* Filters */}
      <div className="ios-card p-4">
        <div className="flex items-center space-x-2 mb-3">
          <FunnelIcon className="h-5 w-5 text-ios-gray-600" />
          <span className="font-medium text-ios-gray-900">Filter</span>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Zeit-Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-ios-gray-600">Zeit:</span>
            <div className="flex rounded-lg overflow-hidden border border-ios-gray-300">
              {[
                { value: 'all', label: 'Alle' },
                { value: 'upcoming', label: 'Zukünftig' },
                { value: 'past', label: 'Vergangen' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
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
          
          {/* Status-Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-ios-gray-600">Status:</span>
            <div className="flex rounded-lg overflow-hidden border border-ios-gray-300">
              {[
                { value: 'all', label: 'Alle' },
                { value: 'preliminary', label: 'Vorläufig' },
                { value: 'final', label: 'Endgültig' },
                { value: 'confirmed', label: 'Bestätigt' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    statusFilter === option.value
                      ? 'bg-ios-blue text-white'
                      : 'bg-white text-ios-gray-700 hover:bg-ios-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
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
            Versuche die Filter anzupassen oder warte auf neue Einteilungen
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
                  <p className="font-medium text-ios-gray-900">{selectedShift.shift_name}</p>
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
                  <p className="text-sm text-ios-gray-600">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedShift.status)}</div>
                </div>
                
                {selectedShift.notes && (
                  <div>
                    <p className="text-sm text-ios-gray-600">Notizen</p>
                    <p className="font-medium text-ios-gray-900">{selectedShift.notes}</p>
                  </div>
                )}
                
                {selectedShift.event_description && (
                  <div>
                    <p className="text-sm text-ios-gray-600">Veranstaltungsbeschreibung</p>
                    <p className="text-sm text-ios-gray-700">{selectedShift.event_description}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="ios-button-secondary"
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

export default MyShifts;


