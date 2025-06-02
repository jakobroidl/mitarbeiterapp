import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ShiftModal from '../../components/ShiftModal';
import { PlusIcon, PencilIcon, TrashIcon, ChevronLeftIcon, ClockIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const ShiftManagement = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/${eventId}/shifts`);
      setShifts(response.data);
    } catch (error) {
      toast.error('Fehler beim Laden der Schichten');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShift = () => {
    setSelectedShift(null);
    setShowCreateModal(true);
  };

  const handleUpdateShift = (shift) => {
    setSelectedShift(shift);
    setShowCreateModal(true);
  };

  const handleDeleteShift = async (shiftId) => {
    if (window.confirm('Möchten Sie diese Schicht wirklich löschen?')) {
      try {
        await api.delete(`/shifts/${shiftId}`);
        toast.success('Schicht gelöscht');
        fetchShifts();
      } catch (error) {
        toast.error('Fehler beim Löschen der Schicht');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/events/${eventId}`)}
            className="p-2 bg-white rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Schichtverwaltung</h1>
        </div>
        <button
          onClick={handleCreateShift}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Neue Schicht</span>
        </button>
      </div>

      {/* Shift List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Lädt...</span>
          </div>
        </div>
      ) : shifts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Keine Schichten gefunden</h2>
          <p className="text-gray-600 mb-4">Es wurden noch keine Schichten für dieses Event erstellt.</p>
          <button
            onClick={handleCreateShift}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Erste Schicht erstellen
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md">
          <ul className="divide-y divide-gray-200">
            {shifts.map((shift) => (
              <li key={shift.id} className="px-6 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{shift.name}</h3>
                    <p className="text-gray-600 mt-1">
                      {format(new Date(shift.start_time), 'dd.MM.yyyy HH:mm', { locale: de })}
                      {' - '}
                      {format(new Date(shift.end_time), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUpdateShift(shift)}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteShift(shift.id)}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Shift Modal */}
      <ShiftModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={fetchShifts}
        eventId={eventId}
        shift={selectedShift}
      />
    </div>
  );
};

export default ShiftManagement;
