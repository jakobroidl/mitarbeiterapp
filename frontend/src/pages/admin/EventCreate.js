// frontend/src/pages/admin/EventCreate.js - ERWEITERTE VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, addHours, startOfHour, parseISO } from 'date-fns';
import {
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  SparklesIcon,
  AcademicCapIcon,
  HashtagIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

const EventCreate = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [positions, setPositions] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [showShifts, setShowShifts] = useState(false);
  
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      location: '',
      start_date: '',
      start_time: '09:00',
      end_date: '',
      end_time: '18:00',
      max_staff: 0,
      shifts: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'shifts'
  });

  const watchStartDate = watch('start_date');
  const watchEndDate = watch('end_date');

  useEffect(() => {
    loadPositions();
    loadQualifications();
  }, []);

  // Auto-fill end date when start date changes
  useEffect(() => {
    if (watchStartDate && !watchEndDate) {
      setValue('end_date', watchStartDate);
    }
  }, [watchStartDate, watchEndDate, setValue]);

  const loadPositions = async () => {
    try {
      const response = await api.get('/settings/positions');
      setPositions(response.data.positions.filter(p => p.is_active));
    } catch (error) {
      console.error('Fehler beim Laden der Positionen:', error);
    }
  };

  const loadQualifications = async () => {
    try {
      const response = await api.get('/settings/qualifications');
      setQualifications(response.data.qualifications.filter(q => q.is_active));
    } catch (error) {
      console.error('Fehler beim Laden der Qualifikationen:', error);
    }
  };

  const addShift = () => {
    const lastShift = fields[fields.length - 1];
    const newStartTime = lastShift 
      ? format(addHours(parseISO(`2000-01-01T${lastShift.end_time}`), 1), 'HH:mm')
      : '09:00';
    const newEndTime = format(addHours(parseISO(`2000-01-01T${newStartTime}`), 8), 'HH:mm');

    append({
      name: `Schicht ${fields.length + 1}`,
      start_time: newStartTime,
      end_time: newEndTime,
      required_staff: 1,
      min_staff: 0,
      max_staff: 0,
      position_id: '',
      qualification_ids: [],
      description: ''
    });
  };

  const generateStandardShifts = () => {
    const standardShifts = [
      { name: 'Frühdienst', start: '06:00', end: '14:00', required: 3, min: 2, max: 5 },
      { name: 'Spätdienst', start: '14:00', end: '22:00', required: 4, min: 3, max: 6 },
      { name: 'Nachtdienst', start: '22:00', end: '06:00', required: 2, min: 1, max: 3 }
    ];

    // Clear existing shifts
    while (fields.length > 0) {
      remove(0);
    }

    // Add standard shifts
    standardShifts.forEach(shift => {
      append({
        name: shift.name,
        start_time: shift.start,
        end_time: shift.end,
        required_staff: shift.required,
        min_staff: shift.min,
        max_staff: shift.max,
        position_id: '',
        qualification_ids: [],
        description: ''
      });
    });

    toast.success('Standard-Schichten hinzugefügt');
  };

  const onSubmit = async (data) => {
    setIsLoading(true);

    try {
      // Combine date and time
      const startDateTime = `${data.start_date}T${data.start_time}:00`;
      const endDateTime = `${data.end_date}T${data.end_time}:00`;

      // Prepare shifts with full datetime
      const shiftsWithDateTime = data.shifts.map(shift => ({
        ...shift,
        start_time: `${data.start_date}T${shift.start_time}:00`,
        end_time: shift.end_time < shift.start_time 
          ? `${data.end_date}T${shift.end_time}:00`
          : `${data.start_date}T${shift.end_time}:00`,
        position_id: shift.position_id || null,
        qualification_ids: shift.qualification_ids || [],
        min_staff: parseInt(shift.min_staff) || 0,
        max_staff: parseInt(shift.max_staff) || 0
      }));

      const eventData = {
        name: data.name,
        description: data.description || '',
        location: data.location,
        start_date: startDateTime,
        end_date: endDateTime,
        max_staff: parseInt(data.max_staff) || 0,
        shifts: shiftsWithDateTime
      };

      const response = await api.post('/events', eventData);
      
      toast.success('Veranstaltung erfolgreich erstellt!');
      navigate(`/admin/events/${response.data.eventId}`);
    } catch (error) {
      console.error('Fehler beim Erstellen der Veranstaltung:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Erstellen der Veranstaltung');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/events')}
            className="p-2 rounded-lg hover:bg-ios-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-ios-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-ios-gray-900">Neue Veranstaltung</h1>
            <p className="text-ios-gray-600">Erstellen Sie eine neue Veranstaltung mit erweiterten Schichtoptionen</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="ios-card p-6">
          <h2 className="text-lg font-semibold text-ios-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Grundinformationen
          </h2>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
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
                className={`ios-input ${errors.name ? 'border-ios-red' : ''}`}
                placeholder="z.B. Sommerfest 2024"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-ios-red">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Beschreibung
              </label>
              <textarea
                {...register('description', {
                  maxLength: {
                    value: 1000,
                    message: 'Maximal 1000 Zeichen'
                  }
                })}
                rows={3}
                className={`ios-input ${errors.description ? 'border-ios-red' : ''}`}
                placeholder="Weitere Details zur Veranstaltung..."
              />
              {errors.description && (
                <p className="mt-1 text-xs text-ios-red">{errors.description.message}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Veranstaltungsort *
              </label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-ios-gray-400" />
                <input
                  {...register('location', {
                    required: 'Ort ist erforderlich',
                    maxLength: {
                      value: 255,
                      message: 'Maximal 255 Zeichen'
                    }
                  })}
                  type="text"
                  className={`ios-input pl-10 ${errors.location ? 'border-ios-red' : ''}`}
                  placeholder="Adresse oder Locationname"
                />
              </div>
              {errors.location && (
                <p className="mt-1 text-xs text-ios-red">{errors.location.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Date and Time */}
        <div className="ios-card p-6">
          <h2 className="text-lg font-semibold text-ios-gray-900 mb-4 flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Datum und Uhrzeit
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Startdatum *
              </label>
              <input
                {...register('start_date', {
                  required: 'Startdatum ist erforderlich',
                  validate: value => {
                    const date = new Date(value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date >= today || 'Datum muss in der Zukunft liegen';
                  }
                })}
                type="date"
                className={`ios-input ${errors.start_date ? 'border-ios-red' : ''}`}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
              {errors.start_date && (
                <p className="mt-1 text-xs text-ios-red">{errors.start_date.message}</p>
              )}
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Startzeit *
              </label>
              <input
                {...register('start_time', {
                  required: 'Startzeit ist erforderlich'
                })}
                type="time"
                className={`ios-input ${errors.start_time ? 'border-ios-red' : ''}`}
              />
              {errors.start_time && (
                <p className="mt-1 text-xs text-ios-red">{errors.start_time.message}</p>
              )}
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Enddatum *
              </label>
              <input
                {...register('end_date', {
                  required: 'Enddatum ist erforderlich',
                  validate: value => {
                    const start = new Date(watchStartDate);
                    const end = new Date(value);
                    return end >= start || 'Enddatum muss nach dem Startdatum liegen';
                  }
                })}
                type="date"
                className={`ios-input ${errors.end_date ? 'border-ios-red' : ''}`}
                min={watchStartDate || format(new Date(), 'yyyy-MM-dd')}
              />
              {errors.end_date && (
                <p className="mt-1 text-xs text-ios-red">{errors.end_date.message}</p>
              )}
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Endzeit *
              </label>
              <input
                {...register('end_time', {
                  required: 'Endzeit ist erforderlich'
                })}
                type="time"
                className={`ios-input ${errors.end_time ? 'border-ios-red' : ''}`}
              />
              {errors.end_time && (
                <p className="mt-1 text-xs text-ios-red">{errors.end_time.message}</p>
              )}
            </div>
          </div>

          {/* Max Staff */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-ios-gray-700 mb-2">
              Maximale Mitarbeiterzahl
            </label>
            <div className="relative">
              <UserGroupIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-ios-gray-400" />
              <input
                {...register('max_staff')}
                type="number"
                min="0"
                className="ios-input pl-10"
                placeholder="0 = unbegrenzt"
              />
            </div>
          </div>
        </div>

        {/* Enhanced Shifts Section */}
        <div className="ios-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ios-gray-900 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Schichten
            </h2>
            <div className="flex items-center space-x-2">
              {!showShifts && (
                <button
                  type="button"
                  onClick={() => setShowShifts(true)}
                  className="text-sm text-ios-blue hover:text-blue-600"
                >
                  Schichten hinzufügen
                </button>
              )}
              {showShifts && fields.length === 0 && (
                <button
                  type="button"
                  onClick={generateStandardShifts}
                  className="ios-button-secondary text-sm"
                >
                  <SparklesIcon className="h-4 w-4 mr-1.5" />
                  Standard-Schichten
                </button>
              )}
            </div>
          </div>

          {showShifts ? (
            <>
              {fields.length === 0 ? (
                <div className="text-center py-8 bg-ios-gray-50 rounded-xl">
                  <ClockIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-ios-gray-500 mb-4">
                    Noch keine Schichten hinzugefügt
                  </p>
                  <button
                    type="button"
                    onClick={addShift}
                    className="ios-button-secondary"
                  >
                    <PlusIcon className="h-4 w-4 mr-1.5" />
                    Erste Schicht hinzufügen
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 bg-ios-gray-50 rounded-xl">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-ios-gray-900">Schicht {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-ios-red hover:text-red-600"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Shift Name */}
                        <div>
                          <label className="block text-xs font-medium text-ios-gray-600 mb-1">
                            Name
                          </label>
                          <input
                            {...register(`shifts.${index}.name`, {
                              required: 'Name ist erforderlich'
                            })}
                            type="text"
                            className="ios-input py-2 text-sm"
                            placeholder="z.B. Frühdienst"
                          />
                        </div>

                        {/* Position */}
                        <div>
                          <label className="block text-xs font-medium text-ios-gray-600 mb-1">
                            Position (optional)
                          </label>
                          <select
                            {...register(`shifts.${index}.position_id`)}
                            className="ios-input py-2 text-sm"
                          >
                            <option value="">Alle Positionen</option>
                            {positions.map(pos => (
                              <option key={pos.id} value={pos.id}>{pos.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Times */}
                        <div className="flex space-x-2">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-ios-gray-600 mb-1">
                              Von
                            </label>
                            <input
                              {...register(`shifts.${index}.start_time`, {
                                required: 'Startzeit erforderlich'
                              })}
                              type="time"
                              className="ios-input py-2 text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-ios-gray-600 mb-1">
                              Bis
                            </label>
                            <input
                              {...register(`shifts.${index}.end_time`, {
                                required: 'Endzeit erforderlich'
                              })}
                              type="time"
                              className="ios-input py-2 text-sm"
                            />
                          </div>
                        </div>

                        {/* Staff Numbers */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-ios-gray-600 mb-1">
                              <UsersIcon className="inline h-3 w-3 mr-1" />
                              Soll
                            </label>
                            <input
                              {...register(`shifts.${index}.required_staff`, {
                                min: { value: 1, message: 'Min. 1' }
                              })}
                              type="number"
                              min="1"
                              className="ios-input py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-ios-gray-600 mb-1">
                              <HashtagIcon className="inline h-3 w-3 mr-1" />
                              Min
                            </label>
                            <input
                              {...register(`shifts.${index}.min_staff`)}
                              type="number"
                              min="0"
                              className="ios-input py-2 text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-ios-gray-600 mb-1">
                              <HashtagIcon className="inline h-3 w-3 mr-1" />
                              Max
                            </label>
                            <input
                              {...register(`shifts.${index}.max_staff`)}
                              type="number"
                              min="0"
                              className="ios-input py-2 text-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Required Qualifications */}
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-ios-gray-600 mb-1">
                          <AcademicCapIcon className="inline h-3 w-3 mr-1" />
                          Erforderliche Qualifikationen
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {qualifications.map(qual => (
                            <label key={qual.id} className="flex items-center">
                              <input
                                type="checkbox"
                                value={qual.id}
                                {...register(`shifts.${index}.qualification_ids`)}
                                className="rounded text-ios-blue focus:ring-ios-blue mr-1.5"
                              />
                              <span className="text-sm text-ios-gray-700">{qual.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Shift Description */}
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-ios-gray-600 mb-1">
                          Beschreibung (optional)
                        </label>
                        <textarea
                          {...register(`shifts.${index}.description`)}
                          rows={2}
                          className="ios-input py-2 text-sm"
                          placeholder="Zusätzliche Informationen..."
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addShift}
                    className="w-full py-3 border-2 border-dashed border-ios-gray-300 rounded-xl
                             text-ios-gray-600 hover:border-ios-gray-400 hover:text-ios-gray-700
                             transition-colors"
                  >
                    <PlusIcon className="h-5 w-5 mx-auto" />
                    <span className="text-sm">Weitere Schicht hinzufügen</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-sm text-ios-gray-500">
              <p>Schichten können später in der Detailansicht hinzugefügt werden</p>
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/events')}
            className="flex-1 ios-button-secondary"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 ios-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Wird erstellt...
              </span>
            ) : (
              <>
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Veranstaltung erstellen
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventCreate;


