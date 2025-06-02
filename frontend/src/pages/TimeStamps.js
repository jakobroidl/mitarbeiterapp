import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const TimeStamps = () => {
  const [stamps, setStamps] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastStamp, setLastStamp] = useState(null);

  useEffect(() => {
    fetchMyStamps();
    fetchPositions();
  }, []);

  const fetchMyStamps = async () => {
    try {
      const response = await api.get('/timestamps/my-stamps');
      setStamps(response.data.stamps || []);
      setLastStamp(response.data.lastStamp);
    } catch (error) {
      console.error('Fehler beim Laden der Stempel:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await api.get('/timestamps/positions');
      setPositions(response.data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Positionen:', error);
    }
  };

  const handleClockIn = async () => {
    if (!selectedPosition) {
      setMessage('Bitte Position auswählen');
      return;
    }

    setLoading(true);
    try {
      await api.post('/timestamps/clock-in', {
        position_id: selectedPosition
      });
      setMessage('Erfolgreich eingestempelt!');
      fetchMyStamps();
      setSelectedPosition('');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Fehler beim Einstempeln');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      await api.post('/timestamps/clock-out');
      setMessage('Erfolgreich ausgestempelt!');
      fetchMyStamps();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Fehler beim Ausstempeln');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const isClocked = lastStamp?.stamp_type === 'in';

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Zeiterfassung</h1>
        
        {/* Status */}
        <div className="mb-6">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isClocked 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isClocked ? '✓ Eingestempelt' : '○ Nicht eingestempelt'}
          </div>
        </div>

        {/* Aktionen */}
        <div className="space-y-4">
          {!isClocked ? (
            <div className="flex space-x-4">
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Position auswählen</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleClockIn}
                disabled={loading || !selectedPosition}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Lädt...' : 'Einstempeln'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleClockOut}
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Lädt...' : 'Ausstempeln'}
            </button>
          )}
        </div>

        {/* Nachricht */}
        {message && (
          <div className={`mt-4 p-3 rounded-md ${
            message.includes('Erfolgreich') 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Stempel Historie */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Meine Stempel</h2>
        
        {stamps.length === 0 ? (
          <p className="text-gray-500">Noch keine Stempel vorhanden</p>
        ) : (
          <div className="space-y-2">
            {stamps.map((stamp, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200">
                <div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    stamp.stamp_type === 'in' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {stamp.stamp_type === 'in' ? 'Ein' : 'Aus'}
                  </span>
                  <span className="ml-2 text-sm text-gray-600">
                    {stamp.position_name}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {format(new Date(stamp.stamp_time), 'dd.MM.yyyy HH:mm', { locale: de })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeStamps;
