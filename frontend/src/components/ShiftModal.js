import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const ShiftModal = ({ isOpen, onClose, onSave, eventId, shift }) => {
  const [formData, setFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    requiredStaff: '1',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (shift) {
      // Beim Bearbeiten: Konvertiere die Zeiten ins richtige Format
      setFormData({
        name: shift.name || '',
        startTime: shift.start_time ? format(new Date(shift.start_time), "yyyy-MM-dd'T'HH:mm") : '',
        endTime: shift.end_time ? format(new Date(shift.end_time), "yyyy-MM-dd'T'HH:mm") : '',
        requiredStaff: shift.required_staff?.toString() || '1',
        notes: shift.notes || '',
      });
    } else {
      // Beim Erstellen: Setze Default-Werte
      setFormData({
        name: '',
        startTime: '',
        endTime: '',
        requiredStaff: '1',
        notes: '',
      });
    }
  }, [shift, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validierung
      if (!formData.name || !formData.startTime || !formData.endTime) {
        toast.error('Bitte füllen Sie alle Pflichtfelder aus');
        setLoading(false);
        return;
      }

      // Zeitvalidierung
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      
      if (end <= start) {
        toast.error('Die Endzeit muss nach der Startzeit liegen');
        setLoading(false);
        return;
      }

      // Konvertiere die Feldnamen für das Backend
      const payload = {
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        requiredStaff: parseInt(formData.requiredStaff) || 1,
        notes: formData.notes || null
      };
      
      if (shift) {
        // Update existing shift
        await api.put(`/events/${eventId}/shifts/${shift.id}`, {
          name: payload.name,
          start_time: payload.startTime,
          end_time: payload.endTime,
          required_staff: payload.requiredStaff,
          notes: payload.notes
        });
        toast.success('Schicht erfolgreich aktualisiert');
      } else {
        // Create new shift
        await api.post(`/events/${eventId}/shifts`, payload);
        toast.success('Schicht erfolgreich erstellt');
      }
      
      // Erfolg - Modal schließen und Liste aktualisieren
      onSave();
      onClose();
      
      // Form zurücksetzen
      setFormData({
        name: '',
        startTime: '',
        endTime: '',
        requiredStaff: '1',
        notes: '',
      });
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error.response?.data?.message || 'Fehler beim Speichern der Schicht';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {shift ? 'Schicht bearbeiten' : 'Neue Schicht erstellen'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              type="button"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            {/* Schichtname */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schichtname *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="z.B. Bar-Schicht, Einlass, Aufbau"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Zeit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Startzeit *
                </label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endzeit *
                </label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                  min={formData.startTime}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Anzahl Mitarbeiter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Benötigte Mitarbeiter *
              </label>
              <input
                type="number"
                name="requiredStaff"
                value={formData.requiredStaff}
                onChange={handleChange}
                required
                min="1"
                placeholder="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Wie viele Mitarbeiter werden für diese Schicht benötigt?
              </p>
            </div>
            
            {/* Notizen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notizen (optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Zusätzliche Informationen zur Schicht..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            
            {/* Actions */}
            <div className="pt-4 flex justify-end space-x-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Speichert...
                  </span>
                ) : (
                  shift ? 'Änderungen speichern' : 'Schicht erstellen'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ShiftModal;
