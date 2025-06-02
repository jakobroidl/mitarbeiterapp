// frontend/src/components/ShiftFormModal.js
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ShiftFormModal = ({ isOpen, onClose, eventId, eventDate, shift, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [qualifications, setQualifications] = useState([]);
  const [selectedQualifications, setSelectedQualifications] = useState([]);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm();

  const watchStartTime = watch('start_time');

  useEffect(() => {
    if (isOpen) {
      fetchQualifications();
      
      if (shift) {
        // Bearbeitungsmodus
        setValue('name', shift.name);
        setValue('start_time', format(new Date(shift.start_time), 'HH:mm'));
        setValue('end_time', format(new Date(shift.end_time), 'HH:mm'));
        setValue('required_staff', shift.required_staff);
        setValue('notes', shift.notes || '');
        
        // Qualifikationen laden
        if (shift.required_qualifications) {
          const quals = JSON.parse(shift.required_qualifications);
          setSelectedQualifications(quals);
        }
      } else {
        // Neue Schicht
        reset();
        setSelectedQualifications([]);
      }
    }
  }, [isOpen, shift, setValue, reset]);

  const fetchQualifications = async () => {
    try {
      const response = await api.get('/qualifications');
      setQualifications(response.data);
    } catch (error) {
      console.error('Error fetching qualifications:', error);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // Konvertiere Zeiten zu vollständigen Datetime-Werten
      const baseDate = eventDate ? new Date(eventDate) : new Date();
      const year = baseDate.getFullYear();
      const month = String(baseDate.getMonth() + 1).padStart(2, '0');
      const day = String(baseDate.getDate()).padStart(2, '0');
      
      const startDateTime = `${year}-${month}-${day}T${data.start_time}:00`;
      const endDateTime = `${year}-${month}-${day}T${data.end_time}:00`;
      
      const payload = {
        name: data.name,
        start_time: startDateTime,
        end_time: endDateTime,
        required_staff: parseInt(data.required_staff),
        required_qualifications: selectedQualifications.length > 0 ? selectedQualifications : null,
        notes: data.notes || null
      };

      if (shift) {
        await api.put(`/shifts/${shift.id}`, payload);
        toast.success('Schicht aktualisiert');
      } else {
        await api.post(`/events/${eventId}/shifts`, payload);
        toast.success('Schicht erstellt');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const toggleQualification = (qualId) => {
    setSelectedQualifications(prev => 
      prev.includes(qualId) 
        ? prev.filter(id => id !== qualId)
        : [...prev, qualId]
    );
  };

  if (!isOpen) return null;

  // Icons
  const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {shift ? 'Schicht bearbeiten' : 'Neue Schicht erstellen'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <CloseIcon />
            </button>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            <div className="space-y-6">
              {/* Schichtname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schichtname *
                </label>
                <input
                  {...register('name', { 
                    required: 'Schichtname ist erforderlich',
                    maxLength: { value: 100, message: 'Maximal 100 Zeichen' }
                  })}
                  type="text"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="z.B. Bar-Service, Einlasskontrolle, Auf-/Abbau"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Zeiten */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Startzeit *
                  </label>
                  <input
                    {...register('start_time', { 
                      required: 'Startzeit ist erforderlich' 
                    })}
                    type="time"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.start_time ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.start_time && (
                    <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endzeit *
                  </label>
                  <input
                    {...register('end_time', { 
                      required: 'Endzeit ist erforderlich',
                      validate: value => {
                        if (watchStartTime && value <= watchStartTime) {
                          return 'Endzeit muss nach Startzeit liegen';
                        }
                        return true;
                      }
                    })}
                    type="time"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.end_time ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.end_time && (
                    <p className="mt-1 text-sm text-red-600">{errors.end_time.message}</p>
                  )}
                </div>
              </div>

              {/* Benötigte Mitarbeiter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benötigte Mitarbeiter *
                </label>
                <input
                  {...register('required_staff', { 
                    required: 'Anzahl ist erforderlich',
                    min: { value: 1, message: 'Mindestens 1 Mitarbeiter erforderlich' },
                    max: { value: 100, message: 'Maximal 100 Mitarbeiter' }
                  })}
                  type="number"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.required_staff ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Anzahl der benötigten Mitarbeiter"
                  defaultValue={1}
                />
                {errors.required_staff && (
                  <p className="mt-1 text-sm text-red-600">{errors.required_staff.message}</p>
                )}
              </div>

              {/* Erforderliche Qualifikationen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Erforderliche Qualifikationen (optional)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3">
                  {qualifications.map((qual) => (
                    <label
                      key={qual.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedQualifications.includes(qual.id)}
                        onChange={() => toggleQualification(qual.id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 flex-1">
                        <span className="text-sm font-medium text-gray-900">{qual.name}</span>
                        {qual.description && (
                          <span className="text-sm text-gray-500 block">{qual.description}</span>
                        )}
                      </span>
                      <span
                        className="ml-2 h-3 w-3 rounded-full"
                        style={{ backgroundColor: qual.color }}
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Nur Mitarbeiter mit diesen Qualifikationen können sich für diese Schicht anmelden
                </p>
              </div>

              {/* Notizen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notizen (optional)
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Zusätzliche Informationen zur Schicht..."
                />
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={loading}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Speichern...
                </span>
              ) : (
                shift ? 'Änderungen speichern' : 'Schicht erstellen'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShiftFormModal;
