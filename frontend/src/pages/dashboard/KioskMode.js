// frontend/src/pages/dashboard/KioskMode.js
import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const KioskMode = () => {
  const [position, setPosition] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (action) => {
    setIsLoading(true);
    try {
      await api.post('/kiosk', {
        action,
        position,
      });
      toast.success(
        action === 'in'
          ? 'Erfolgreich eingestempelt'
          : 'Erfolgreich ausgestempelt'
      );
      setPosition('');
    } catch (error) {
      toast.error('Fehler beim Stempeln');
    }
    setIsLoading(false);
  };

  return (
    <div>
      <h1>Kiosk-Modus</h1>
      <div>
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          required
        >
          <option value="">Position auswählen...</option>
          <option value="1">Position 1</option>
          <option value="2">Position 2</option>
          {/* Weitere Positionen */}
        </select>
        <button
          onClick={() => handleSubmit('in')}
          disabled={isLoading || !position}
        >
          Einstempeln
        </button>
        <button
          onClick={() => handleSubmit('out')}
          disabled={isLoading}
        >
          Ausstempeln
        </button>
      </div>
    </div>
  );
};

export default KioskMode;


	
