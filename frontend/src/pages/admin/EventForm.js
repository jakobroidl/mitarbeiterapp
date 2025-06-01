// frontend/src/pages/admin/EventForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const EventForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    defaultValues: {
      status: 'draft'
    }
  });

  const watchStartDate = watch('start_date');
  const watchEndDate = watch('end_date');

  useEffect(() => {
    if (isEdit) {
      fetchEvent();
    }
  }, [id]);

  const fetchEvent = async () => {
    try {
      setFetching(true);
      const response = await api.get(`/events/${id}`);
      const event = response.data;
      
      // Set form values
      setValue('name', event.name);
      setValue('description', event.description);
      setValue('location', event.location);
      setValue('status', event.status);
      setValue('start_date', format(new Date(event.start_date), "yyyy-MM-dd'T'HH:mm"));
      setValue('end_date', format(new Date(event.end_date), "yyyy-MM-dd'T'HH:mm"));
    } catch (error) {
      toast.error('Fehler beim Laden der Veranstaltung');
      navigate('/events');
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    
    try {
      if (isEdit) {
        await api.put(`/events/${id}`, data);
        toast.success('Veranstaltung aktualisiert');
      } else {
        await api.post('/events', data);
        toast.success('Veranstaltung erstellt');
      }
      navigate('/events');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-2 text-gray-600">Lade Veranstaltung...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Veranstaltung bearbeiten' : 'Neue Veranstaltung'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {isEdit ? 'Bearbeiten Sie die Veranstaltungsdetails' : 'Erstellen Sie eine neue Veranstaltung'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Veranstaltungsname *
            </label>
            <input
              {...register('name', {
                required: 'Name ist erforderlich',
                maxLength: {
                  value: 255,
                  message: 'Maximal 255 Zeichen'
                }
              })}
              type="text"
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="z.B. Sommerfest 2024"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung
            </label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Beschreiben Sie die Veranstaltung..."
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Veranstaltungsort *
            </label>
            <input
              {...register('location', {
                required: 'Ort ist erforderlich',
                maxLength: {
                  value: 255,
                  message: 'Maximal 255 Zeichen'
                }
              })}
              type="text"
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="z.B. Stadtpark München"
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Startdatum & Zeit *
              </label>
              <input
                {...register('start_date', {
                  required: 'Startdatum ist erforderlich',
                  validate: value => {
                    const date = new Date(value);
                    if (date < new Date()) {
                      return 'Startdatum muss in der Zukunft liegen';
                    }
                    return true;
                  }
                })}
                type="datetime-local"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.start_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>
              )}
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enddatum & Zeit *
              </label>
              <input
                {...register('end_date', {
                  required: 'Enddatum ist erforderlich',
                  validate: value => {
                    if (watchStartDate && new Date(value) < new Date(watchStartDate)) {
                      return 'Enddatum muss nach dem Startdatum liegen';
                    }
                    return true;
                  }
                })}
                type="datetime-local"
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.end_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-red-600">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              {...register('status')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="draft">Entwurf</option>
              <option value="published">Veröffentlicht</option>
              {isEdit && (
                <>
                  <option value="completed">Abgeschlossen</option>
                  <option value="cancelled">Abgesagt</option>
                </>
              )}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Nur veröffentlichte Veranstaltungen sind für Mitarbeiter sichtbar
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
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
                isEdit ? 'Änderungen speichern' : 'Veranstaltung erstellen'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;
