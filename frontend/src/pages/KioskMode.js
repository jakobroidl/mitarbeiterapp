// frontend/src/pages/KioskMode.js
import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const KioskMode = () => {
  const [personalCode, setPersonalCode] = useState('');
  const [positions, setPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState('');
  
  const handleStamp = async () => {
    try {
      const response = await api.post('/timestamps/kiosk', {
        personal_code: personalCode,
        position_id: selectedPosition
      });
      
      toast.success(response.data.message);
      setPersonalCode('');
      setSelectedPosition('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler');
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8">Stempeluhr</h1>
        
        <input
          type="text"
          value={personalCode}
          onChange={(e) => setPersonalCode(e.target.value)}
          placeholder="Personal-Code eingeben"
          className="w-full text-2xl p-4 border rounded-xl text-center"
          maxLength={10}
        />
        
        {/* Position auswählen */}
        <select
          value={selectedPosition}
          onChange={(e) => setSelectedPosition(e.target.value)}
          className="w-full mt-4 p-3 border rounded-xl"
        >
          <option value="">Position wählen...</option>
          {positions.map(pos => (
            <option key={pos.id} value={pos.id}>{pos.name}</option>
          ))}
        </select>
        
        <button
          onClick={handleStamp}
          disabled={!personalCode || !selectedPosition}
          className="w-full mt-6 py-4 bg-blue-600 text-white text-xl font-semibold rounded-xl disabled:opacity-50"
        >
          Ein-/Ausstempeln
        </button>
      </div>
    </div>
  );
};
