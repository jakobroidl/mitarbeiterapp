// frontend/src/pages/staff/MyTimeclock.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ClockIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  StopIcon,
  PauseIcon,
  BuildingOfficeIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { format, parseISO, startOfMonth, endOfMonth, differenceInMinutes, isSameDay, addMonths, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';

const MyTimeclock = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthStats, setMonthStats] = useState({
    total_hours: '0.00',
    days_worked: 0,
    entries_count: 0
  });
  const [expandedDays, setExpandedDays] = useState(new Set());

  useEffect(() => {
    loadTimeEntries();
  }, [currentMonth]);

  const loadTimeEntries = async () => {
    try {
      setLoading(true);
      const from = startOfMonth(currentMonth).toISOString();
      const to = endOfMonth(currentMonth).toISOString();
      
      const response = await api.get('/timeclock/my', {
        params: { from, to, limit: 100 }
      });
      
      setEntries(response.data.entries);
      setMonthStats(response.data.current_month_stats);
    } catch (error) {
      console.error('Fehler beim Laden der Zeiteinträge:', error);
      toast.error('Fehler beim Laden der Zeiteinträge');
    } finally {
      setLoading(false);
    }
  };

const exportMonth = async () => {
  try {
    const response = await api.get('/timeclock/report', {
      params: { 
        staff_id: 'self',
        from: startOfMonth(currentMonth).toISOString(),
        to: endOfMonth(currentMonth).toISOString(),
        format: 'csv'
      },
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `arbeitszeiten_${format(currentMonth, 'yyyy-MM')}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    toast.success('Export erfolgreich heruntergeladen');
  } catch (error) {
    console.error('Fehler beim Export:', error);
    toast.error('Fehler beim Exportieren der Daten');
  }
};


  const toggleDayExpansion = (date) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0:00';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (entry) => {
    if (entry.status === 'active') {
      return <PlayIcon className="h-4 w-4 text-green-600" />;
    } else if (entry.break_minutes > 0) {
      return <PauseIcon className="h-4 w-4 text-yellow-600" />;
    } else {
      return <StopIcon className="h-4 w-4 text-ios-gray-600" />;
    }
  };

  // Gruppiere Einträge nach Tag
  const entriesByDay = entries.reduce((acc, entry) => {
    const date = format(parseISO(entry.clock_in), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {});

  const DayGroup = ({ date, dayEntries }) => {
    const isExpanded = expandedDays.has(date);
    const dayTotal = dayEntries.reduce((sum, entry) => sum + (entry.total_minutes || 0), 0);
    const dayDate = parseISO(date);
    
    return (
      <div className="ios-card overflow-hidden">
        <button
          onClick={() => toggleDayExpansion(date)}
          className="w-full p-4 flex items-center justify-between hover:bg-ios-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-4">
            <div className="text-left">
              <p className="font-medium text-ios-gray-900">
                {format(dayDate, 'EEEE', { locale: de })}
              </p>
              <p className="text-sm text-ios-gray-600">
                {format(dayDate, 'd. MMMM yyyy', { locale: de })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-semibold text-ios-gray-900">
                {formatDuration(dayTotal)}h
              </p>
              <p className="text-xs text-ios-gray-500">
                {dayEntries.length} Einträge
              </p>
            </div>
            <ChevronRightIcon className={`h-5 w-5 text-ios-gray-400 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`} />
          </div>
        </button>
        
        {isExpanded && (
          <div className="border-t border-ios-gray-200">
            {dayEntries.map((entry, index) => (
              <div
                key={entry.id}
                className={`p-4 ${index > 0 ? 'border-t border-ios-gray-100' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(entry)}
                    
                    <div>
                      <p className="font-medium text-ios-gray-900">
                        {entry.position_name}
                      </p>
                      
                      {entry.event_name && (
                        <p className="text-sm text-ios-gray-600 mt-1">
                          <BuildingOfficeIcon className="h-3.5 w-3.5 inline mr-1" />
                          {entry.event_name}
                        </p>
                      )}
                      
                      <div className="text-sm text-ios-gray-500 mt-2 space-y-1">
                        <p>
                          <ClockIcon className="h-3.5 w-3.5 inline mr-1" />
                          {format(parseISO(entry.clock_in), 'HH:mm')} - 
                          {entry.clock_out 
                            ? format(parseISO(entry.clock_out), 'HH:mm')
                            : 'läuft'
                          } Uhr
                        </p>
                        
                        {entry.break_minutes > 0 && (
                          <p>
                            <PauseIcon className="h-3.5 w-3.5 inline mr-1" />
                            {entry.break_minutes} Min. Pause
                          </p>
                        )}
                      </div>
                      
                      {entry.notes && (
                        <p className="text-sm text-ios-gray-600 mt-2 italic">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-ios-gray-900">
                      {formatDuration(entry.total_minutes)}h
                    </p>
                    {entry.status === 'active' && (
                      <p className="text-xs text-green-600 mt-1">Aktiv</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-ios-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 h-24"></div>
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
          <h1 className="text-2xl font-bold text-ios-gray-900">Meine Arbeitszeiten</h1>
          <p className="text-ios-gray-600">Übersicht deiner gestempelten Zeiten</p>
        </div>
        
        <button
          onClick={exportMonth}
          className="ios-button-secondary flex items-center space-x-2"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          <span>Export</span>
        </button>
      </div>

      {/* Month Navigation */}
      <div className="ios-card p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-ios-gray-100"
          >
            <ChevronLeftIcon className="h-5 w-5 text-ios-gray-600" />
          </button>
          
          <h2 className="text-lg font-semibold text-ios-gray-900">
            {format(currentMonth, 'MMMM yyyy', { locale: de })}
          </h2>
          
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-ios-gray-100"
            disabled={currentMonth.getMonth() === new Date().getMonth()}
          >
            <ChevronRightIcon className="h-5 w-5 text-ios-gray-600" />
          </button>
        </div>
      </div>

      {/* Month Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="ios-card p-4 text-center">
          <ChartBarIcon className="h-8 w-8 text-ios-blue mx-auto mb-2" />
          <p className="text-2xl font-bold text-ios-gray-900">{monthStats.total_hours}h</p>
          <p className="text-sm text-ios-gray-600">Gesamt</p>
        </div>
        
        <div className="ios-card p-4 text-center">
          <CalendarIcon className="h-8 w-8 text-ios-purple mx-auto mb-2" />
          <p className="text-2xl font-bold text-ios-gray-900">{monthStats.days_worked}</p>
          <p className="text-sm text-ios-gray-600">Arbeitstage</p>
        </div>
        
        <div className="ios-card p-4 text-center">
          <ClockIcon className="h-8 w-8 text-ios-green mx-auto mb-2" />
          <p className="text-2xl font-bold text-ios-gray-900">
            {monthStats.days_worked > 0 
              ? (parseFloat(monthStats.total_hours) / monthStats.days_worked).toFixed(1)
              : '0.0'
            }h
          </p>
          <p className="text-sm text-ios-gray-600">Ø pro Tag</p>
        </div>
      </div>

      {/* Time Entries */}
      {Object.keys(entriesByDay).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(entriesByDay)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dayEntries]) => (
              <DayGroup key={date} date={date} dayEntries={dayEntries} />
            ))}
        </div>
      ) : (
        <div className="ios-card p-12 text-center">
          <ClockIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
          <p className="text-ios-gray-500">Keine Zeiteinträge in diesem Monat</p>
          <p className="text-sm text-ios-gray-400 mt-2">
            Stempeleinträge werden hier angezeigt
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="ios-card p-4 bg-ios-blue/5 border border-ios-blue/20">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-ios-blue flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-ios-gray-900">
              Hinweise zur Stempeluhr
            </p>
            <ul className="text-ios-gray-600 mt-2 space-y-1">
              <li>• Bei Arbeitszeiten über 6 Stunden werden automatisch 30 Min. Pause abgezogen</li>
              <li>• Vergiss nicht dich aus- und einzustempeln</li>
              <li>• Bei Problemen wende dich an deinen Vorgesetzten</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyTimeclock;



