// frontend/src/pages/kiosk/KioskMode.js
import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ClockIcon,
  UserCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const KioskMode = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [personalCode, setPersonalCode] = useState('');
  const [step, setStep] = useState('code'); // 'code', 'status', 'position', 'success', 'error'
  const [staffInfo, setStaffInfo] = useState(null);
  const [positions, setPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success', 'error', 'warning'
  const [loading, setLoading] = useState(false);
  
  const kioskToken = process.env.REACT_APP_KIOSK_TOKEN || localStorage.getItem('kiosk_token');
  const inputRef = useRef(null);
  const resetTimeoutRef = useRef(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load positions on mount
  useEffect(() => {
    loadPositions();
  }, []);

  // Auto-focus input
  useEffect(() => {
    if (step === 'code' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  // Auto-reset after success/error
  useEffect(() => {
    if (step === 'success' || step === 'error') {
      resetTimeoutRef.current = setTimeout(() => {
        resetToStart();
      }, 5000);
    }
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [step]);

  const loadPositions = async () => {
    try {
      const response = await api.get('/timeclock/positions');
      setPositions(response.data.positions);
    } catch (error) {
      console.error('Fehler beim Laden der Positionen:', error);
    }
  };

  const resetToStart = () => {
    setStep('code');
    setPersonalCode('');
    setStaffInfo(null);
    setSelectedPosition(null);
    setSelectedEvent(null);
    setMessage('');
    setMessageType('');
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!personalCode || personalCode.length < 3) return;

    setLoading(true);
    try {
      const response = await api.get(`/timeclock/kiosk/status/${personalCode}`);
      setStaffInfo(response.data);
      
      if (response.data.is_clocked_in) {
        // Mitarbeiter ist eingestempelt - zeige Status zum Ausstempeln
        setStep('status');
      } else {
        // Mitarbeiter ist nicht eingestempelt - zeige Positionsauswahl
        setStep('position');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Ungültiger Personal-Code');
      setMessageType('error');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!selectedPosition) {
      setMessage('Bitte wählen Sie eine Position');
      setMessageType('warning');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        personal_code: personalCode,
        position_id: selectedPosition,
        kiosk_token: kioskToken
      };
      
      // Nur event_id hinzufügen, wenn es einen Wert hat
      if (selectedEvent) {
        requestData.event_id = selectedEvent;
      }
      
      const response = await api.post('/timeclock/kiosk/clock-in', requestData);

      setMessage(response.data.message);
      setMessageType('success');
      setStep('success');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Fehler beim Einstempeln');
      setMessageType('error');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      const requestData = {
        personal_code: personalCode,
        kiosk_token: kioskToken
      };
      
      const response = await api.post('/timeclock/kiosk/clock-out', requestData);

      setMessage(response.data.message);
      setMessageType('success');
      setStep('success');

      // Zeige Arbeitszusammenfassung
      if (response.data.summary) {
        const { total_hours, break_minutes } = response.data.summary;
        setMessage(prev => `${prev}\n\nArbeitszeit: ${total_hours} Stunden${break_minutes > 0 ? ` (inkl. ${break_minutes} Min. Pause)` : ''}`);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Fehler beim Ausstempeln');
      setMessageType('error');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const renderCodeInput = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-md">
        {/* Clock Display */}
        <div className="text-center mb-12">
          <div className="text-6xl font-light text-white mb-2">
            {format(currentTime, 'HH:mm:ss')}
          </div>
          <div className="text-xl text-white/80">
            {format(currentTime, 'EEEE, d. MMMM yyyy', { locale: de })}
          </div>
        </div>

        {/* Input Card */}
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <ClockIcon className="h-16 w-16 text-ios-blue mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-ios-gray-900">Stempeluhr</h1>
            <p className="text-ios-gray-600 mt-2">Geben Sie Ihren Personal-Code ein</p>
          </div>

          <form onSubmit={handleCodeSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={personalCode}
              onChange={(e) => setPersonalCode(e.target.value.toUpperCase())}
              placeholder="Personal-Code"
              className="w-full px-6 py-4 text-2xl text-center font-mono bg-ios-gray-100 rounded-2xl 
                       border-2 border-ios-gray-300 focus:border-ios-blue focus:outline-none 
                       focus:ring-4 focus:ring-ios-blue/20 transition-all"
              maxLength="20"
              autoComplete="off"
              disabled={loading}
            />
            
            <button
              type="submit"
              disabled={loading || personalCode.length < 3}
              className="w-full mt-6 py-4 bg-ios-blue text-white text-xl font-semibold rounded-2xl
                       hover:bg-blue-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
            >
              {loading ? 'Wird geprüft...' : 'Weiter'}
            </button>
          </form>
        </div>

        {/* Numeric Keypad for Touch */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '←'].map((key) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'C') {
                  setPersonalCode('');
                } else if (key === '←') {
                  setPersonalCode(prev => prev.slice(0, -1));
                } else {
                  setPersonalCode(prev => prev + key);
                }
                inputRef.current?.focus();
              }}
              className="bg-white/90 hover:bg-white text-ios-gray-900 text-2xl font-semibold 
                       py-4 rounded-2xl shadow-lg active:scale-95 transition-all"
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStatus = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8">
          {/* Staff Info */}
          <div className="text-center mb-8">
            {staffInfo?.staff?.profile_image ? (
              <img
                src={`/uploads/profiles/${staffInfo.staff.profile_image}`}
                alt={staffInfo.staff.name}
                className="h-24 w-24 rounded-full mx-auto mb-4 border-4 border-white shadow-lg"
              />
            ) : (
              <UserCircleIcon className="h-24 w-24 text-ios-gray-400 mx-auto mb-4" />
            )}
            <h2 className="text-2xl font-bold text-ios-gray-900">{staffInfo?.staff?.name}</h2>
            <p className="text-lg text-ios-gray-600">{personalCode}</p>
          </div>

          {/* Current Status */}
          {staffInfo?.is_clocked_in && staffInfo?.current_entry && (
            <div className="bg-ios-green/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <CheckCircleIcon className="h-6 w-6 text-ios-green" />
                <span className="text-lg font-semibold text-ios-gray-900">Eingestempelt</span>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm text-ios-gray-600">
                  Seit: {format(new Date(staffInfo.current_entry.clock_in), 'HH:mm')} Uhr
                </p>
                <p className="text-sm text-ios-gray-600">
                  Position: {staffInfo.current_entry.position_name}
                </p>
                {staffInfo.current_entry.event_name && (
                  <p className="text-sm text-ios-gray-600">
                    Event: {staffInfo.current_entry.event_name}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {staffInfo?.is_clocked_in ? (
              <button
                onClick={handleClockOut}
                disabled={loading}
                className="w-full py-4 bg-ios-red text-white text-xl font-semibold rounded-2xl
                         hover:bg-red-600 active:scale-95 disabled:opacity-50 
                         transition-all duration-200"
              >
                {loading ? 'Wird ausgestempelt...' : 'Ausstempeln'}
              </button>
            ) : (
              <button
                onClick={() => setStep('position')}
                disabled={loading}
                className="w-full py-4 bg-ios-green text-white text-xl font-semibold rounded-2xl
                         hover:bg-green-600 active:scale-95 disabled:opacity-50 
                         transition-all duration-200"
              >
                Einstempeln
              </button>
            )}
            
            <button
              onClick={resetToStart}
              className="w-full py-3 bg-ios-gray-200 text-ios-gray-700 text-lg font-semibold 
                       rounded-2xl hover:bg-ios-gray-300 active:scale-95 transition-all duration-200"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPositionSelection = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-2xl">
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-ios-gray-900 text-center mb-6">
            Position wählen
          </h2>

          {/* Positions Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {positions.map((position) => (
              <button
                key={position.id}
                onClick={() => setSelectedPosition(position.id)}
                className={`p-6 rounded-2xl border-2 transition-all duration-200 ${
                  selectedPosition === position.id
                    ? 'border-ios-blue bg-ios-blue/10'
                    : 'border-ios-gray-300 hover:border-ios-gray-400'
                }`}
              >
                <div
                  className="h-3 w-3 rounded-full mx-auto mb-3"
                  style={{ backgroundColor: position.color }}
                />
                <p className="font-semibold text-ios-gray-900">{position.name}</p>
              </button>
            ))}
          </div>

          {/* Events (if available) */}
          {staffInfo?.today_events?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-ios-gray-900 mb-3">
                Heutige Veranstaltung (optional)
              </h3>
              <div className="space-y-2">
                {staffInfo.today_events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event.id === selectedEvent ? null : event.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedEvent === event.id
                        ? 'border-ios-purple bg-ios-purple/10'
                        : 'border-ios-gray-300 hover:border-ios-gray-400'
                    }`}
                  >
                    <p className="font-medium text-ios-gray-900">{event.name}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={resetToStart}
              className="flex-1 py-3 bg-ios-gray-200 text-ios-gray-700 font-semibold 
                       rounded-2xl hover:bg-ios-gray-300 active:scale-95 transition-all"
            >
              <ArrowLeftIcon className="inline h-5 w-5 mr-2" />
              Zurück
            </button>
            <button
              onClick={handleClockIn}
              disabled={!selectedPosition || loading}
              className="flex-1 py-3 bg-ios-green text-white font-semibold rounded-2xl
                       hover:bg-green-600 active:scale-95 disabled:opacity-50 
                       disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Wird eingestempelt...' : 'Einstempeln'}
              <ArrowRightIcon className="inline h-5 w-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMessage = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 text-center">
          {messageType === 'success' && (
            <CheckCircleIcon className="h-24 w-24 text-ios-green mx-auto mb-6" />
          )}
          {messageType === 'error' && (
            <XCircleIcon className="h-24 w-24 text-ios-red mx-auto mb-6" />
          )}
          {messageType === 'warning' && (
            <ExclamationCircleIcon className="h-24 w-24 text-ios-orange mx-auto mb-6" />
          )}
          
          <p className="text-xl font-semibold text-ios-gray-900 whitespace-pre-line">
            {message}
          </p>
          
          <div className="mt-8 text-sm text-ios-gray-500">
            Automatische Weiterleitung in 5 Sekunden...
          </div>
        </div>
      </div>
    </div>
  );

  // Render based on current step
  switch (step) {
    case 'status':
      return renderStatus();
    case 'position':
      return renderPositionSelection();
    case 'success':
    case 'error':
      return renderMessage();
    default:
      return renderCodeInput();
  }
};

export default KioskMode;


