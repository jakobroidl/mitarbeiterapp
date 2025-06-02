// frontend/src/components/ShiftFormModal.js
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import toast from 'react-hot-toast';

const ShiftFormModal = ({ isOpen, onClose, eventId, shift, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm();

  useEffect(() => {
    if (shift) {
      // Setze Werte für Bearbeitung
      setValue('name', shift.name);
      setValue('start_time', shift.start_time);
      setValue('end_time', shift.end_time);
      setValue('required_staff', shift.required_staff);
      setValue('notes', shift.notes);
    } else {
      reset();
    }
  }, [shift, setValue, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (shift) {
        await api.put(`/shifts/${shift.id}`, data);
        toast.success('Schicht aktualisiert');
      } else {
        await api.post(`/events/${eventId}/shifts`, data);
        toast.success('Schicht erstellt');
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {shift ? 'Schicht bearbeiten' : 'Neue Schicht'}
            </h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Schichtname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schichtname *
                </label>
                <input
                  {...register('name', { required: 'Name erforderlich' })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Bar-Service Früh"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Zeiten */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Von *
                  </label>
                  <input
                    {...register('start_time', { required: 'Startzeit erforderlich' })}
                    type="time"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bis *
                  </label>
                  <input
                    {...register('end_time', { required: 'Endzeit erforderlich' })}
                    type="time"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              {/* Benötigte Mitarbeiter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Benötigte Mitarbeiter *
                </label>
                <input
                  {...register('required_staff', { 
                    required: 'Anzahl erforderlich',
                    min: { value: 1, message: 'Mindestens 1' }
                  })}
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg"
                  defaultValue={1}
                />
              </div>

              {/* Notizen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notizen
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Zusätzliche Informationen..."
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShiftFormModal;
