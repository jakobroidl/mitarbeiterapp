import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';

const MessageCompose = () => {
  const navigate = useNavigate();
  const [recipients, setRecipients] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [staff, setStaff] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    defaultValues: {
      subject: '',
      content: '',
      priority: 'normal'
    }
  });

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [staffRes, eventsRes] = await Promise.all([
        api.get('/staff?status=active'),
        api.get('/events?status=published&upcoming=true')
      ]);
      
      setStaff(staffRes.data.staff);
      setEvents(eventsRes.data.events);
    } catch (error) {
      console.error('Fehler beim Laden der Optionen:', error);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    
    try {
      let recipientData = {};
      
      switch (recipients) {
        case 'all':
          recipientData = { recipient_type: 'all' };
          break;
        case 'active':
          recipientData = { recipient_type: 'active' };
          break;
        case 'specific':
          if (selectedStaff.length === 0) {
            toast.error('Bitte wählen Sie mindestens einen Empfänger');
            setLoading(false);
            return;
          }
          recipientData = { 
            recipient_type: 'specific',
            recipient_ids: selectedStaff 
          };
          break;
        case 'event':
          if (!selectedEvent) {
            toast.error('Bitte wählen Sie eine Veranstaltung');
            setLoading(false);
            return;
          }
          recipientData = { 
            recipient_type: 'event',
            event_id: selectedEvent 
          };
          break;
      }

      await api.post('/messages/send', {
        ...data,
        ...recipientData
      });
      
      toast.success('Nachricht erfolgreich gesendet');
      navigate('/admin/messages');
    } catch (error) {
      console.error('Fehler beim Senden:', error);
      toast.error('Fehler beim Senden der Nachricht');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate('/admin/messages')}
          className="p-2 rounded-lg hover:bg-ios-gray-100"
        >
          <ArrowLeftIcon className="h-5 w-5 text-ios-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-ios-gray-900">Neue Nachricht</h1>
          <p className="text-ios-gray-600">Senden Sie eine Nachricht an Ihre Mitarbeiter</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Recipients */}
        <div className="ios-card p-6">
          <h2 className="text-lg font-semibold text-ios-gray-900 mb-4 flex items-center">
            <UserGroupIcon className="h-5 w-5 mr-2" />
            Empfänger
          </h2>

          <div className="space-y-3">
            <label className="flex items-center p-3 rounded-xl border-2 cursor-pointer hover:bg-ios-gray-50">
              <input
                type="radio"
                value="all"
                checked={recipients === 'all'}
                onChange={(e) => setRecipients(e.target.value)}
                className="h-4 w-4 text-ios-blue"
              />
              <div className="ml-3">
                <p className="font-medium text-ios-gray-900">Alle Mitarbeiter</p>
                <p className="text-sm text-ios-gray-500">Nachricht an alle Mitarbeiter senden</p>
              </div>
            </label>

            <label className="flex items-center p-3 rounded-xl border-2 cursor-pointer hover:bg-ios-gray-50">
              <input
                type="radio"
                value="active"
                checked={recipients === 'active'}
                onChange={(e) => setRecipients(e.target.value)}
                className="h-4 w-4 text-ios-blue"
              />
              <div className="ml-3">
                <p className="font-medium text-ios-gray-900">Aktive Mitarbeiter</p>
                <p className="text-sm text-ios-gray-500">Nur an aktive Mitarbeiter senden</p>
              </div>
            </label>

            <label className="flex items-center p-3 rounded-xl border-2 cursor-pointer hover:bg-ios-gray-50">
              <input
                type="radio"
                value="event"
                checked={recipients === 'event'}
                onChange={(e) => setRecipients(e.target.value)}
                className="h-4 w-4 text-ios-blue"
              />
              <div className="ml-3">
                <p className="font-medium text-ios-gray-900">Event-Teilnehmer</p>
                <p className="text-sm text-ios-gray-500">An Teilnehmer einer Veranstaltung</p>
              </div>
            </label>

            {recipients === 'event' && (
              <div className="ml-7 mt-2">
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="ios-input"
                >
                  <option value="">Veranstaltung wählen...</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-center p-3 rounded-xl border-2 cursor-pointer hover:bg-ios-gray-50">
              <input
                type="radio"
                value="specific"
                checked={recipients === 'specific'}
                onChange={(e) => setRecipients(e.target.value)}
                className="h-4 w-4 text-ios-blue"
              />
              <div className="ml-3">
                <p className="font-medium text-ios-gray-900">Bestimmte Mitarbeiter</p>
                <p className="text-sm text-ios-gray-500">Mitarbeiter einzeln auswählen</p>
              </div>
            </label>

            {recipients === 'specific' && (
              <div className="ml-7 mt-2 max-h-48 overflow-y-auto space-y-2">
                {staff.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center p-2 rounded hover:bg-ios-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStaff.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStaff([...selectedStaff, member.id]);
                        } else {
                          setSelectedStaff(selectedStaff.filter(id => id !== member.id));
                        }
                      }}
                      className="h-4 w-4 rounded text-ios-blue"
                    />
                    <span className="ml-3 text-sm text-ios-gray-900">
                      {member.first_name} {member.last_name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Content */}
        <div className="ios-card p-6">
          <h2 className="text-lg font-semibold text-ios-gray-900 mb-4 flex items-center">
            <EnvelopeIcon className="h-5 w-5 mr-2" />
            Nachricht
          </h2>

          <div className="space-y-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Priorität
              </label>
              <select
                {...register('priority')}
                className="ios-input"
              >
                <option value="low">Niedrig</option>
                <option value="normal">Normal</option>
                <option value="high">Hoch</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Betreff *
              </label>
              <input
                {...register('subject', {
                  required: 'Betreff ist erforderlich',
                  maxLength: {
                    value: 255,
                    message: 'Maximal 255 Zeichen'
                  }
                })}
                type="text"
                className={`ios-input ${errors.subject ? 'border-ios-red' : ''}`}
                placeholder="Betreff der Nachricht"
              />
              {errors.subject && (
                <p className="mt-1 text-xs text-ios-red">{errors.subject.message}</p>
              )}
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Nachricht *
              </label>
              <textarea
                {...register('content', {
                  required: 'Nachricht ist erforderlich',
                  maxLength: {
                    value: 5000,
                    message: 'Maximal 5000 Zeichen'
                  }
                })}
                rows={8}
                className={`ios-input ${errors.content ? 'border-ios-red' : ''}`}
                placeholder="Ihre Nachricht..."
              />
              {errors.content && (
                <p className="mt-1 text-xs text-ios-red">{errors.content.message}</p>
              )}
              <p className="mt-1 text-xs text-ios-gray-500">
                {watch('content')?.length || 0} / 5000 Zeichen
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => navigate('/admin/messages')}
            className="flex-1 ios-button-secondary"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 ios-button-primary disabled:opacity-50"
          >
            {loading ? (
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
                Wird gesendet...
              </span>
            ) : (
              <>
                <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                Nachricht senden
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageCompose;


