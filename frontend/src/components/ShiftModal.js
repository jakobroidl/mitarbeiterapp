
// frontend/src/components/ShiftModal.js
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ShiftModal = ({ isOpen, onClose, onSuccess, eventId, shift = null, eventStartDate, eventEndDate }) => {
  const [loading, setLoading] = useState(false);
  const [qualifications, setQualifications] = useState([]);
  const [selectedQualifications, setSelectedQualifications] = useState([]);
  
  const isEdit = !!shift;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm({
    defaultValues: {
      required_staff: 1
    }
  });

  const watchStartTime = watch('start_time');
  const watchEndTime = watch('end_time');

  useEffect(() => {
    if (isOpen) {
      fetchQualifications();
      if (isEdit && shift) {
        // Setze Formwerte für Bearbeitung
        setValue('name', shift.name);
        setValue('start_time', format(new Date(shift.start_time), "yyyy-MM-dd'T'HH:mm"));
        setValue('end_time', format(new Date(shift.end_time), "yyyy-MM-dd'T'HH:mm"));
        setValue('required_staff', shift.required_staff);
        setValue('notes', shift.notes || '');
        
        // Setze ausgewählte Qualifikationen
        if (shift.required_qualifications) {
          const quals = JSON.parse(shift.required_qualifications);
          setSelectedQualifications(quals);
        }
      } else {
        // Setze Standardwerte für neue Schicht
        const defaultStart = format(new Date(eventStartDate), "yyyy-MM-dd'T'HH:mm");
        const defaultEnd = format(new Date(eventEndDate), "yyyy-MM-dd'T'HH:mm");
        setValue('start_time', defaultStart);
        setValue('end_time', defaultEnd);
      }
    }
  }, [isOpen, shift, isEdit, eventStartDate, eventEndDate, setValue]);

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
      const shiftData = {
        ...data,
        required_qualifications: selectedQualifications.length > 0 ? selectedQualifications : null
      };

      if (isEdit) {
        await api.put(`/shifts/${shift.id}`, shiftData);
        toast.success('Schicht aktualisiert');
      } else {
        await api.post(`/events/${eventId}/shifts`, shiftData);
        toast.success('Schicht erstellt');
      }
      
      onSuccess();
      onClose();
      reset();
      setSelectedQualifications([]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern der Schicht');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    reset();
    setSelectedQualifications([]);
  };

  if (!isOpen) return null;

  // Icons
  const CloseIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const UsersIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={handleClose} />
      
      {/* Modal Content */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClockIcon />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEdit ? 'Schicht bearbeiten' : 'Neue Schicht erstellen'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
            <div className="space-y-6">
              {/* Schichtname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schichtname *
                </label>
                <input
                  {...register('name', {
                    required: 'Schichtname ist erforderlich',
                    maxLength: {
                      value: 100,
                      message: 'Maximal 100 Zeichen'
                    }
                  })}
                  type="text"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="z.B. Bar-Service, Einlass, Aufbau"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Zeit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Startzeit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Startzeit *
                  </label>
                  <input
                    {...register('start_time', {
                      required: 'Startzeit ist erforderlich',
                      validate: value => {
                        const startTime = new Date(value);
                        const eventStart = new Date(eventStartDate);
                        const eventEnd = new Date(eventEndDate);
                        
                        if (startTime < eventStart || startTime > eventEnd) {
                          return 'Startzeit muss innerhalb der Veranstaltungszeit liegen';
                        }
                        return true;
                      }
                    })}
                    type="datetime-local"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.start_time ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.start_time && (
                    <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
                  )}
                </div>

                {/* Endzeit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endzeit *
                  </label>
                  <input
                    {...register('end_time', {
                      required: 'Endzeit ist erforderlich',
                      validate: value => {
                        if (watchStartTime && new Date(value) <= new Date(watchStartTime)) {
                          return 'Endzeit muss nach der Startzeit liegen';
                        }
                        
                        const endTime = new Date(value);
                        const eventStart = new Date(eventStartDate);
                        const eventEnd = new Date(eventEndDate);
                        
                        if (endTime < eventStart || endTime > eventEnd) {
                          return 'Endzeit muss innerhalb der Veranstaltungszeit liegen';
                        }
                        return true;
                      }
                    })}
                    type="datetime-local"
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
                <div className="relative">
                  <UsersIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    {...register('required_staff', {
                      required: 'Anzahl ist erforderlich',
                      min: {
                        value: 1,
                        message: 'Mindestens 1 Mitarbeiter erforderlich'
                      },
                      max: {
                        value: 50,
                        message: 'Maximal 50 Mitarbeiter'
                      }
                    })}
                    type="number"
                    min="1"
                    max="50"
                    className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.required_staff ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="1"
                  />
                </div>
                {errors.required_staff && (
                  <p className="mt-1 text-sm text-red-600">{errors.required_staff.message}</p>
                )}
              </div>

              {/* Erforderliche Qualifikationen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Erforderliche Qualifikationen
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3">
                  {qualifications.map((qualification) => (
                    <label
                      key={qualification.id}
                      className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedQualifications.includes(qualification.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQualifications([...selectedQualifications, qualification.id]);
                          } else {
                            setSelectedQualifications(selectedQualifications.filter(id => id !== qualification.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 flex-1">
                        <span className="text-sm font-medium text-gray-900">{qualification.name}</span>
                        {qualification.description && (
                          <span className="text-sm text-gray-500 block">{qualification.description}</span>
                        )}
                      </span>
                      <span
                        className="ml-2 h-3 w-3 rounded-full"
                        style={{ backgroundColor: qualification.color }}
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Nur Mitarbeiter mit diesen Qualifikationen können sich anmelden
                </p>
              </div>

              {/* Notizen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notizen
                </label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Zusätzliche Informationen für diese Schicht..."
                />
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
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
                isEdit ? 'Änderungen speichern' : 'Schicht erstellen'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShiftModal;

