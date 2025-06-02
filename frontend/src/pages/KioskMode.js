// frontend/src/pages/KioskMode.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const KioskMode = () => {
  const [personalCode, setPersonalCode] = useState('');
  const [positions, setPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [showPositionSelect, setShowPositionSelect] = useState(false);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchPositions();
    
    // Update clock every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchPositions = async () => {
    try {
      const response = await api.get('/timestamps/positions');
      setPositions(response.data);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  const handleKeyPress = (key) => {
    if (key === 'clear') {
      setPersonalCode('');
    } else if (key === 'submit') {
      handleSubmit();
    } else if (personalCode.length < 10) {
      setPersonalCode(personalCode + key);
    }
  };

  const handleSubmit = async () => {
    if (personalCode.length < 4) {
      showMessage('Personal-Code muss mindestens 4 Zeichen haben', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      // Erster Versuch ohne Position
      const response = await api.post('/timestamps/kiosk', {
        personal_code: personalCode.toUpperCase(),
        position_id: selectedPosition || null
      });

      if (response.data.requires_position) {
        // Position wird benötigt
        setShowPositionSelect(true);
        showMessage('Bitte Position auswählen', 'info');
      } else {
        // Erfolgreich gestempelt
        handleSuccess(response.data);
      }
    } catch (error) {
      showMessage(
        error.response?.data?.message || 'Fehler beim Stempeln',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePositionSelect = async (positionId) => {
    setSelectedPosition(positionId);
    setShowPositionSelect(false);
    setIsLoading(true);

    try {
      const response = await api.post('/timestamps/kiosk', {
        personal_code: personalCode.toUpperCase(),
        position_id: positionId
      });

      handleSuccess(response.data);
    } catch (error) {
      showMessage(
        error.response?.data?.message || 'Fehler beim Stempeln',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = (data) => {
    const type = data.stamp_type === 'in' ? 'check-in' : 'check-out';
    const duration = data.work_duration ? ` (${data.work_duration})` : '';
    
    showMessage(
      `${data.staff_name}${duration}`,
      type
    );
    
    // Reset nach 5 Sekunden
    setTimeout(() => {
      setPersonalCode('');
      setSelectedPosition('');
      setMessage(null);
    }, 5000);
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
  };

  // Icons
  const ClockIcon = () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const CheckInIcon = () => (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );

  const CheckOutIcon = () => (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
    </svg>
  );

  const LoadingIcon = () => (
    <svg className="animate-spin h-16 w-16" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ClockIcon />
            <h1 className="text-3xl font-bold text-gray-900">Stempeluhr</h1>
          </div>
          <div className="text-2xl font-semibold text-gray-700">
            {format(currentTime, 'HH:mm:ss')}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Message Display */}
          {message && (
            <div className={`mb-8 p-6 rounded-2xl text-center transform animate-pulse ${
              message.type === 'error' ? 'bg-red-100 text-red-800' :
              message.type === 'check-in' ? 'bg-green-100 text-green-800' :
              message.type === 'check-out' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              <div className="flex justify-center mb-4">
                {message.type === 'check-in' && <CheckInIcon />}
                {message.type === 'check-out' && <CheckOutIcon />}
              </div>
              <p className="text-2xl font-bold">{message.text}</p>
              {message.type === 'check-in' && <p className="text-lg mt-2">Eingestempelt</p>}
              {message.type === 'check-out' && <p className="text-lg mt-2">Ausgestempelt</p>}
            </div>
          )}

          {/* Position Selection */}
          {showPositionSelect && !message && (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                Position auswählen
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {positions.map((position) => (
                  <button
                    key={position.id}
                    onClick={() => handlePositionSelect(position.id)}
                    className="p-4 rounded-xl text-center transition-all hover:scale-105"
                    style={{ 
                      backgroundColor: position.color + '20',
                      borderColor: position.color,
                      borderWidth: '2px'
                    }}
                  >
                    <span className="font-medium text-gray-900">
                      {position.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Personal Code Display */}
          {!showPositionSelect && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-6">
                <p className="text-lg text-gray-600 mb-2">Personal-Code eingeben</p>
                <div className="text-5xl font-bold text-gray-900 tracking-wider min-h-[60px] flex items-center justify-center">
                  {personalCode || <span className="text-gray-300">----</span>}
                </div>
              </div>

              {/* Loading State */}
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingIcon />
                </div>
              ) : (
                <>
                  {/* Number Pad */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleKeyPress(num.toString())}
                        className="p-6 text-2xl font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-95"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={() => handleKeyPress('clear')}
                      className="p-6 text-xl font-semibold bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-all active:scale-95"
                    >
                      C
                    </button>
                    <button
                      onClick={() => handleKeyPress('0')}
                      className="p-6 text-2xl font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-95"
                    >
                      0
                    </button>
                    <button
                      onClick={() => handleKeyPress('submit')}
                      disabled={personalCode.length < 4}
                      className="p-6 text-xl font-semibold bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      OK
                    </button>
                  </div>

                  {/* Info Text */}
                  <p className="text-center text-sm text-gray-500">
                    Geben Sie Ihren Personal-Code ein und drücken Sie OK
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-8 py-4">
        <p className="text-center text-sm text-gray-500">
          {format(currentTime, 'EEEE, dd. MMMM yyyy', { locale: de })}
        </p>
      </div>
    </div>
  );
};

export default KioskMode; // frontend/src/pages/KioskMode.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const KioskMode = () => {
  const [personalCode, setPersonalCode] = useState('');
  const [positions, setPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [showPositionSelect, setShowPositionSelect] = useState(false);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchPositions();
    
    // Update clock every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchPositions = async () => {
    try {
      const response = await api.get('/timestamps/positions');
      setPositions(response.data);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  const handleKeyPress = (key) => {
    if (key === 'clear') {
      setPersonalCode('');
    } else if (key === 'submit') {
      handleSubmit();
    } else if (personalCode.length < 10) {
      setPersonalCode(personalCode + key);
    }
  };

  const handleSubmit = async () => {
    if (personalCode.length < 4) {
      showMessage('Personal-Code muss mindestens 4 Zeichen haben', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      // Erster Versuch ohne Position
      const response = await api.post('/timestamps/kiosk', {
        personal_code: personalCode.toUpperCase(),
        position_id: selectedPosition || null
      });

      if (response.data.requires_position) {
        // Position wird benötigt
        setShowPositionSelect(true);
        showMessage('Bitte Position auswählen', 'info');
      } else {
        // Erfolgreich gestempelt
        handleSuccess(response.data);
      }
    } catch (error) {
      showMessage(
        error.response?.data?.message || 'Fehler beim Stempeln',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePositionSelect = async (positionId) => {
    setSelectedPosition(positionId);
    setShowPositionSelect(false);
    setIsLoading(true);

    try {
      const response = await api.post('/timestamps/kiosk', {
        personal_code: personalCode.toUpperCase(),
        position_id: positionId
      });

      handleSuccess(response.data);
    } catch (error) {
      showMessage(
        error.response?.data?.message || 'Fehler beim Stempeln',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = (data) => {
    const type = data.stamp_type === 'in' ? 'check-in' : 'check-out';
    const duration = data.work_duration ? ` (${data.work_duration})` : '';
    
    showMessage(
      `${data.staff_name}${duration}`,
      type
    );
    
    // Reset nach 5 Sekunden
    setTimeout(() => {
      setPersonalCode('');
      setSelectedPosition('');
      setMessage(null);
    }, 5000);
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
  };

  // Icons
  const ClockIcon = () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const CheckInIcon = () => (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );

  const CheckOutIcon = () => (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
    </svg>
  );

  const LoadingIcon = () => (
    <svg className="animate-spin h-16 w-16" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ClockIcon />
            <h1 className="text-3xl font-bold text-gray-900">Stempeluhr</h1>
          </div>
          <div className="text-2xl font-semibold text-gray-700">
            {format(currentTime, 'HH:mm:ss')}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Message Display */}
          {message && (
            <div className={`mb-8 p-6 rounded-2xl text-center transform animate-pulse ${
              message.type === 'error' ? 'bg-red-100 text-red-800' :
              message.type === 'check-in' ? 'bg-green-100 text-green-800' :
              message.type === 'check-out' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              <div className="flex justify-center mb-4">
                {message.type === 'check-in' && <CheckInIcon />}
                {message.type === 'check-out' && <CheckOutIcon />}
              </div>
              <p className="text-2xl font-bold">{message.text}</p>
              {message.type === 'check-in' && <p className="text-lg mt-2">Eingestempelt</p>}
              {message.type === 'check-out' && <p className="text-lg mt-2">Ausgestempelt</p>}
            </div>
          )}

          {/* Position Selection */}
          {showPositionSelect && !message && (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                Position auswählen
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {positions.map((position) => (
                  <button
                    key={position.id}
                    onClick={() => handlePositionSelect(position.id)}
                    className="p-4 rounded-xl text-center transition-all hover:scale-105"
                    style={{ 
                      backgroundColor: position.color + '20',
                      borderColor: position.color,
                      borderWidth: '2px'
                    }}
                  >
                    <span className="font-medium text-gray-900">
                      {position.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Personal Code Display */}
          {!showPositionSelect && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-6">
                <p className="text-lg text-gray-600 mb-2">Personal-Code eingeben</p>
                <div className="text-5xl font-bold text-gray-900 tracking-wider min-h-[60px] flex items-center justify-center">
                  {personalCode || <span className="text-gray-300">----</span>}
                </div>
              </div>

              {/* Loading State */}
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingIcon />
                </div>
              ) : (
                <>
                  {/* Number Pad */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleKeyPress(num.toString())}
                        className="p-6 text-2xl font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-95"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={() => handleKeyPress('clear')}
                      className="p-6 text-xl font-semibold bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-all active:scale-95"
                    >
                      C
                    </button>
                    <button
                      onClick={() => handleKeyPress('0')}
                      className="p-6 text-2xl font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-95"
                    >
                      0
                    </button>
                    <button
                      onClick={() => handleKeyPress('submit')}
                      disabled={personalCode.length < 4}
                      className="p-6 text-xl font-semibold bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      OK
                    </button>
                  </div>

                  {/* Info Text */}
                  <p className="text-center text-sm text-gray-500">
                    Geben Sie Ihren Personal-Code ein und drücken Sie OK
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-8 py-4">
        <p className="text-center text-sm text-gray-500">
          {format(currentTime, 'EEEE, dd. MMMM yyyy', { locale: de })}
        </p>
      </div>
    </div>
  );
};

export default KioskMode;
