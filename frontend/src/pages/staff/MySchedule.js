// frontend/src/pages/staff/MySchedule.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  ViewColumnsIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  addMonths,
  subMonths,
  getDay
} from 'date-fns';
import { de } from 'date-fns/locale';

const MySchedule = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month'); // month, week
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);

  useEffect(() => {
    loadShifts();
  }, [currentMonth]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const from = startOfMonth(currentMonth);
      const to = endOfMonth(currentMonth);
      
      const response = await api.get('/staff/shifts/my', {
        params: {
          from: from.toISOString(),
          to: to.toISOString()
        }
      });
      
      setShifts(response.data.shifts);
    } catch (error) {
      console.error('Fehler beim Laden der Schichten:', error);
      toast.error('Fehler beim Laden der Schichten');
    } finally {
      setLoading(false);
    }
  };

  const refreshSchedule = async () => {
    await loadShifts();
    toast.success('Kalender aktualisiert');
  };

  const confirmShift = async (shiftId) => {
    try {
      await api.post(`/shifts/${shiftId}/confirm`);
      toast.success('Schicht erfolgreich bestätigt');
      await loadShifts();
      setShowShiftModal(false);
    } catch (error) {
      console.error('Fehler beim Bestätigen:', error);
      toast.error('Fehler beim Bestätigen der Schicht');
    }
  };

  const getShiftStatus = (shift) => {
    const badges = {
      preliminary: { 
        color: 'bg-yellow-100 border-yellow-300',
        icon: ExclamationCircleIcon,
        iconColor: 'text-yellow-600'
      },
      final: { 
        color: 'bg-blue-100 border-blue-300',
        icon: InformationCircleIcon,
        iconColor: 'text-blue-600'
      },
      confirmed: { 
        color: 'bg-green-100 border-green-300',
        icon: CheckCircleIcon,
        iconColor: 'text-green-600'
      }
    };
    
    return badges[shift.status] || badges.preliminary;
  };

  const getDaysInMonth = () => {
    const start = startOfWeek(startOfMonth(currentMonth), { locale: de });
    const end = endOfWeek(endOfMonth(currentMonth), { locale: de });
    
    return eachDayOfInterval({ start, end });
  };

  const getShiftsForDay = (date) => {
    return shifts.filter(shift => 
      isSameDay(parseISO(shift.start_time), date)
    );
  };

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const DayCell = ({ date }) => {
    const dayShifts = getShiftsForDay(date);
    const isCurrentMonth = isSameMonth(date, currentMonth);
    const isCurrentDay = isToday(date);
    const isWeekend = getDay(date) === 0 || getDay(date) === 6;
    
    return (
      <div
        className={`min-h-[100px] p-2 border border-ios-gray-200 ${
          !isCurrentMonth ? 'bg-ios-gray-50' : 'bg-white'
        } ${isCurrentDay ? 'ring-2 ring-ios-blue ring-inset' : ''} ${
          isWeekend ? 'bg-ios-gray-50' : ''
        } hover:bg-ios-gray-50 transition-colors cursor-pointer`}
        onClick={() => {
          setSelectedDate(date);
          if (dayShifts.length === 1) {
            setSelectedShift(dayShifts[0]);
            setShowShiftModal(true);
          } else if (dayShifts.length > 1) {
            // Show day detail view
          }
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${
            !isCurrentMonth ? 'text-ios-gray-400' : 
            isCurrentDay ? 'text-ios-blue' : 'text-ios-gray-700'
          }`}>
            {format(date, 'd')}
          </span>
          {dayShifts.length > 0 && (
            <span className="text-xs text-ios-gray-500">
              {dayShifts.length} {dayShifts.length === 1 ? 'Schicht' : 'Schichten'}
            </span>
          )}
        </div>
        
        <div className="space-y-1">
          {dayShifts.slice(0, 2).map((shift, index) => {
            const status = getShiftStatus(shift);
            const Icon = status.icon;
            
            return (
              <div
                key={shift.id}
                className={`text-xs p-1 rounded border ${status.color} truncate`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedShift(shift);
                  setShowShiftModal(true);
                }}
              >
                <div className="flex items-center space-x-1">
                  <Icon className={`h-3 w-3 ${status.iconColor} flex-shrink-0`} />
                  <span className="truncate">
                    {format(parseISO(shift.start_time), 'HH:mm')} - {shift.shift_name}
                  </span>
                </div>
              </div>
            );
          })}
          
          {dayShifts.length > 2 && (
            <div className="text-xs text-ios-gray-500 text-center">
              +{dayShifts.length - 2} weitere
            </div>
          )}
        </div>
      </div>
    );
  };

  const WeekView = () => {
    const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const days = getDaysInMonth();
    const currentWeekStart = startOfWeek(new Date(), { locale: de });
    const currentWeekEnd = endOfWeek(new Date(), { locale: de });
    const currentWeekDays = days.filter(day => 
      day >= currentWeekStart && day <= currentWeekEnd
    );
    
    return (
      <div>
        <div className="grid grid-cols-7 gap-px bg-ios-gray-200 rounded-t-xl overflow-hidden">
          {weekDays.map((day, index) => (
            <div 
              key={day} 
              className={`p-3 text-center text-sm font-medium ${
                index >= 5 ? 'bg-ios-gray-100' : 'bg-white'
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-px bg-ios-gray-200 rounded-b-xl overflow-hidden">
          {currentWeekDays.map((date) => (
            <DayCell key={date.toISOString()} date={date} />
          ))}
        </div>
      </div>
    );
  };

  const MonthView = () => {
    const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const days = getDaysInMonth();
    
    return (
      <div>
        <div className="grid grid-cols-7 gap-px bg-ios-gray-200 rounded-t-xl overflow-hidden">
          {weekDays.map((day, index) => (
            <div 
              key={day} 
              className={`p-3 text-center text-sm font-medium ${
                index >= 5 ? 'bg-ios-gray-100' : 'bg-white'
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-px bg-ios-gray-200 rounded-b-xl overflow-hidden">
          {days.map((date) => (
            <DayCell key={date.toISOString()} date={date} />
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-ios-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-xl p-6 h-96"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ios-gray-900">Mein Kalender</h1>
          <p className="text-ios-gray-600">Übersicht deiner Schichten</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshSchedule}
            className="p-2 rounded-lg hover:bg-ios-gray-100"
            title="Aktualisieren"
          >
            <ArrowPathIcon className="h-5 w-5 text-ios-gray-600" />
          </button>
          
          <div className="flex rounded-lg overflow-hidden border border-ios-gray-300">
            <button
              onClick={() => setView('week')}
              className={`p-2 ${
                view === 'week' 
                  ? 'bg-ios-blue text-white' 
                  : 'bg-white text-ios-gray-600 hover:bg-ios-gray-100'
              }`}
              title="Wochenansicht"
            >
              <ViewColumnsIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setView('month')}
              className={`p-2 ${
                view === 'month' 
                  ? 'bg-ios-blue text-white' 
                  : 'bg-white text-ios-gray-600 hover:bg-ios-gray-100'
              }`}
              title="Monatsansicht"
            >
              <Squares2X2Icon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="ios-card p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg hover:bg-ios-gray-100"
          >
            <ChevronLeftIcon className="h-5 w-5 text-ios-gray-600" />
          </button>
          
          <h2 className="text-lg font-semibold text-ios-gray-900">
            {format(currentMonth, 'MMMM yyyy', { locale: de })}
          </h2>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-lg hover:bg-ios-gray-100"
          >
            <ChevronRightIcon className="h-5 w-5 text-ios-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="ios-card p-4">
        {view === 'month' ? <MonthView /> : <WeekView />}
      </div>

      {/* Legend */}
      <div className="ios-card p-4">
        <h3 className="text-sm font-medium text-ios-gray-700 mb-3">Legende</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries({
            preliminary: 'Vorläufig',
            final: 'Endgültig',
            confirmed: 'Bestätigt'
          }).map(([status, label]) => {
            const style = getShiftStatus({ status });
            const Icon = style.icon;
            
            return (
              <div key={status} className="flex items-center space-x-2">
                <div className={`px-2 py-1 rounded border ${style.color} flex items-center space-x-1`}>
                  <Icon className={`h-3 w-3 ${style.iconColor}`} />
                  <span className="text-xs font-medium">{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shift Detail Modal */}
      {showShiftModal && selectedShift && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="ios-modal-backdrop" onClick={() => setShowShiftModal(false)} />
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative bg-white rounded-2xl shadow-ios-xl max-w-md w-full p-6 z-10">
              <h3 className="text-lg font-semibold text-ios-gray-900 mb-4">
                Schichtdetails
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-ios-gray-600">Veranstaltung</p>
                  <p className="font-medium text-ios-gray-900">{selectedShift.event_name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-ios-gray-600">Schicht</p>
                  <p className="font-medium text-ios-gray-900">{selectedShift.shift_name}</p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <CalendarDaysIcon className="h-5 w-5 text-ios-gray-400" />
                  <div>
                    <p className="text-sm text-ios-gray-600">Datum & Zeit</p>
                    <p className="font-medium text-ios-gray-900">
                      {format(parseISO(selectedShift.start_time), 'EEEE, d. MMMM yyyy', { locale: de })}
                    </p>
                    <p className="text-sm text-ios-gray-700">
                      {format(parseISO(selectedShift.start_time), 'HH:mm')} - 
                      {format(parseISO(selectedShift.end_time), 'HH:mm')} Uhr
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <MapPinIcon className="h-5 w-5 text-ios-gray-400" />
                  <div>
                    <p className="text-sm text-ios-gray-600">Ort</p>
                    <p className="font-medium text-ios-gray-900">{selectedShift.location}</p>
                  </div>
                </div>
                
                {selectedShift.position_name && (
                  <div>
                    <p className="text-sm text-ios-gray-600">Position</p>
                    <p className="font-medium text-ios-gray-900">{selectedShift.position_name}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-ios-gray-600">Status</p>
                  <div className="mt-1">
                    {(() => {
                      const status = getShiftStatus(selectedShift);
                      const Icon = status.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${status.color}`}>
                          <Icon className={`h-4 w-4 ${status.iconColor}`} />
                          {selectedShift.status === 'preliminary' && 'Vorläufig'}
                          {selectedShift.status === 'final' && 'Endgültig'}
                          {selectedShift.status === 'confirmed' && 'Bestätigt'}
                        </span>
                      );
                    })()}
                  </div>
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
                  onClick={() => setShowShiftModal(false)}
                  className="ios-button-secondary"
                >
                  Schließen
                </button>
                
                {selectedShift.status === 'final' && (
                  <button
                    onClick={() => confirmShift(selectedShift.shift_id)}
                    className="ios-button-primary"
                  >
                    Schicht bestätigen
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

export default MySchedule;


