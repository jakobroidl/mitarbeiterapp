import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const KioskMode = () => {
  const [positions, setPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [staffNumber, setStaffNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Zeit aktualisieren
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Positionen laden
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const response = await api.get('/timestamps/positions');
        setPositions(response.data);
      } catch (error) {
        console.error('Fehler beim Laden der Positionen:', error);
        setMessage('Fehler beim Laden der Positionen');
      }
    };

    fetchPositions();
  }, []);

  const handleClockIn = async (e) => {
    e.preventDefault();
    
    if (!staffNumber || !selectedPosition) {
      setMessage('Bitte Personalnummer und Position auswählen');
      return;
    }

    setLoading(true);
    try {
      await api.post('/timestamps/kiosk', {
        staff_number: staffNumber,
        position_id: selectedPosition
      });
      
      setMessage('Erfolgreich eingestempelt!');
      setStaffNumber('');
      setSelectedPosition('');
      
      // Nachricht nach 3 Sekunden ausblenden
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Fehler beim Einstempeln');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Zeiterfassung
          </h1>
          <div className="text-lg text-gray-600">
            {format(currentTime, 'EEEE, dd.MM.yyyy', { locale: de })}
          </div>
          <div className="text-2xl font-mono text-blue-600">
            {format(currentTime, 'HH:mm:ss')}
          </div>
        </div>

        {/* Formular */}
        <form onSubmit={handleClockIn} className="space-y-6">
          {/* Personalnummer */}
          <div>
            <label htmlFor="staffNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Personalnummer
            </label>
            <input
              type="text"
              id="staffNumber"
              value={staffNumber}
              onChange={(e) => setStaffNumber(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              placeholder="Ihre Personalnummer"
              disabled={loading}
            />
          </div>

          {/* Position */}
          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
              Position
            </label>
            <select
              id="position"
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              disabled={loading}
            >
              <option value="">Position auswählen</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !staffNumber || !selectedPosition}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Wird verarbeitet...' : 'Einstempeln'}
          </button>
        </form>

        {/* Nachricht */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg text-center ${
            message.includes('Erfolgreich') 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Hinweis */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Bei Problemen wenden Sie sich an die Verwaltung</p>
        </div>
      </div>
    </div>
  );
};

export default KioskMode;
