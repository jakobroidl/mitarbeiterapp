// frontend/src/pages/admin/EventDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, parseISO, isPast, isFuture, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  BellIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'team', 'shifts'
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [processing, setProcessing] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [positions, setPositions] = useState([]);
  const [newShift, setNewShift] = useState({
    name: '',
    start_time: '09:00',
    end_time: '17:00',
    required_staff: 1,
    position_id: '',
    description: ''
  });

  useEffect(() => {
    loadEvent();
    loadPositions();
  }, [id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/${id}`);
      setEvent(response.data);
      setEditData({
        name: response.data.name,
        description: response.data.description || '',
        location: response.data.location,
        start_date: format(parseISO(response.data.start_date), 'yyyy-MM-dd'),
        start_time: format(parseISO(response.data.start_date), 'HH:mm'),
        end_date: format(parseISO(response.data.end_date), 'yyyy-MM-dd'),
        end_time: format(parseISO(response.data.end_date), 'HH:mm'),
        max_staff: response.data.max_staff || 0
      });
    } catch (error) {
      console.error('Fehler beim Laden der Veranstaltung:', error);
      toast.error('Veranstaltung konnte nicht geladen werden');
      navigate('/admin/events');
    } finally {
      setLoading(false);
    }
  };

  const loadPositions = async () => {
    try {
      const response = await api.get('/settings/positions');
      setPositions(response.data.positions.filter(p => p.is_active));
    } catch (error) {
      console.error('Fehler beim Laden der Positionen:', error);
    }
  };

  const loadAvailableStaff = async () => {
    try {
      const response = await api.get('/staff?status=active');
      const alreadyInvited = event.invitations.map(inv => inv.staff_id);
      setAvailableStaff(response.data.staff.filter(s => !alreadyInvited.includes(s.id)));
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiter:', error);
    }
  };

  const handleSave = async () => {
    setProcessing(true);
    try {
      const startDateTime = `${editData.start_date}T${editData.start_time}:00`;
      const endDateTime = `${editData.end_date}T${editData.end_time}:00`;

      await api.put(`/events/${id}`, {
        name: editData.name,
        description: editData.description,
        location: editData.location,
        start_date: startDateTime,
        end_date: endDateTime,
        max_staff: parseInt(editData.max_staff) || 0
      });
      
      toast.success('Veranstaltung erfolgreich aktualisiert');
      setEditMode(false);
      loadEvent();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern der Änderungen');
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Status wirklich auf '${newStatus}' ändern?`)) return;

    setProcessing(true);
    try {
      await api.patch(`/events/${id}/status`, { status: newStatus });
      toast.success('Status erfolgreich geändert');
      loadEvent();
    } catch (error) {
      console.error('Fehler beim Ändern des Status:', error);
      toast.error('Status konnte nicht geändert werden');
    } finally {
      setProcessing(false);
    }
  };

  const handleInviteStaff = async () => {
    if (selectedStaffIds.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Mitarbeiter aus');
      return;
    }

    setProcessing(true);
    try {
      await api.post(`/events/${id}/invite`, { staff_ids: selectedStaffIds });
      toast.success(`${selectedStaffIds.length} Mitarbeiter erfolgreich eingeladen`);
      setShowInviteDialog(false);
      setSelectedStaffIds([]);
      loadEvent();
    } catch (error) {
      console.error('Fehler beim Einladen:', error);
      toast.error('Fehler beim Einladen der Mitarbeiter');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveInvitation = async (staffId) => {
    if (!window.confirm('Einladung wirklich zurückziehen?')) return;

    try {
      await api.delete(`/events/${id}/invite/${staffId}`);
      toast.success('Einladung zurückgezogen');
      loadEvent();
    } catch (error) {
      console.error('Fehler beim Entfernen der Einladung:', error);
      toast.error('Einladung konnte nicht entfernt werden');
    }
  };

  const handleAddShift = async () => {
    setProcessing(true);
    try {
      const shiftData = {
        ...newShift,
        start_time: `${format(parseISO(event.start_date), 'yyyy-MM-dd')}T${newShift.start_time}:00`,
        end_time: `${format(parseISO(event.start_date), 'yyyy-MM-dd')}T${newShift.end_time}:00`,
        position_id: newShift.position_id || null
      };

      await api.post(`/events/${id}/shifts`, shiftData);
      toast.success('Schicht erfolgreich hinzugefügt');
      setShowAddShiftDialog(false);
      setNewShift({
        name: '',
        start_time: '09:00',
        end_time: '17:00',
        required_staff: 1,
        position_id: '',
        description: ''
      });
      loadEvent();
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Schicht:', error);
      toast.error('Schicht konnte nicht hinzugefügt werden');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm('Schicht wirklich löschen?')) return;

    try {
      await api.delete(`/events/${id}/shifts/${shiftId}`);
      toast.success('Schicht gelöscht');
      loadEvent();
    } catch (error) {
      console.error('Fehler beim Löschen der Schicht:', error);
      toast.error('Schicht konnte nicht gelöscht werden');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-ios-gray-200 rounded w-1/4 mb-6"></div>
          <div className="ios-card p-6 space-y-4">
            <div className="h-32 bg-ios-gray-200 rounded"></div>
            <div className="h-20 bg-ios-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const getEventStatus = () => {
    const now = new Date();
    const startDate = parseISO(event.start_date);
    const endDate = parseISO(event.end_date);
    
    if (event.status === 'cancelled') {
      return { text: 'Abgesagt', color: 'bg-ios-red text-white', icon: XCircleIcon };
    } else if (event.status === 'draft') {
      return { text: 'Entwurf', color: 'bg-ios-gray-400 text-white', icon: ExclamationTriangleIcon };
    } else if (isPast(endDate)) {
      return { text: 'Beendet', color: 'bg-ios-gray-500 text-white', icon: CheckCircleIcon };
    } else if (now >= startDate && now <= endDate) {
      return { text: 'Läuft', color: 'bg-ios-green text-white', icon: ClockIcon };
    } else if (isToday(startDate)) {
      return { text: 'Heute', color: 'bg-ios-orange text-white', icon: CalendarIcon };
    } else {
      return { text: 'Geplant', color: 'bg-ios-blue text-white', icon: CalendarDaysIcon };
    }
  };

  const eventStatus = getEventStatus();
  const isEventPast = isPast(parseISO(event.end_date));

  return (
    <div className="p-6 max-w-6xl mx-auto">
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
            <h1 className="text-2xl font-bold text-ios-gray-900">
              {editMode ? 'Veranstaltung bearbeiten' : event.name}
            </h1>
            <p className="text-ios-gray-600">
              Erstellt von {event.creator_name} am {format(parseISO(event.created_at), 'dd.MM.yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${eventStatus.color}`}>
            <eventStatus.icon className="w-4 h-4 mr-1.5" />
            {eventStatus.text}
          </span>
          {!isEventPast && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="ios-button-secondary"
            >
              <PencilIcon className="h-4 w-4 mr-1.5" />
              Bearbeiten
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-ios-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-white text-ios-gray-900 shadow-sm'
              : 'text-ios-gray-600 hover:text-ios-gray-900'
          }`}
        >
          Übersicht
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'team'
              ? 'bg-white text-ios-gray-900 shadow-sm'
              : 'text-ios-gray-600 hover:text-ios-gray-900'
          }`}
        >
          Team ({event.invitations?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'shifts'
              ? 'bg-white text-ios-gray-900 shadow-sm'
              : 'text-ios-gray-600 hover:text-ios-gray-900'
          }`}
        >
          Schichten ({event.shifts?.length || 0})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <>
          {/* Event Info */}
          <div className="ios-card p-6 mb-6">
            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="ios-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">Beschreibung</label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={3}
                    className="ios-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">Ort</label>
                  <input
                    type="text"
                    value={editData.location}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    className="ios-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">Startdatum</label>
                    <input
                      type="date"
                      value={editData.start_date}
                      onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                      className="ios-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">Startzeit</label>
                    <input
                      type="time"
                      value={editData.start_time}
                      onChange={(e) => setEditData({ ...editData, start_time: e.target.value })}
                      className="ios-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">Enddatum</label>
                    <input
                      type="date"
                      value={editData.end_date}
                      onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                      className="ios-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">Endzeit</label>
                    <input
                      type="time"
                      value={editData.end_time}
                      onChange={(e) => setEditData({ ...editData, end_time: e.target.value })}
                      className="ios-input"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setEditData({
                        name: event.name,
                        description: event.description || '',
                        location: event.location,
                        start_date: format(parseISO(event.start_date), 'yyyy-MM-dd'),
                        start_time: format(parseISO(event.start_date), 'HH:mm'),
                        end_date: format(parseISO(event.end_date), 'yyyy-MM-dd'),
                        end_time: format(parseISO(event.end_date), 'HH:mm'),
                        max_staff: event.max_staff || 0
                      });
                    }}
                    className="flex-1 ios-button-secondary"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={processing}
                    className="flex-1 ios-button-primary disabled:opacity-50"
                  >
                    {processing ? 'Speichern...' : 'Speichern'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <MapPinIcon className="h-5 w-5 text-ios-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-ios-gray-700">Veranstaltungsort</p>
                      <p className="text-ios-gray-900">{event.location}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CalendarIcon className="h-5 w-5 text-ios-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-ios-gray-700">Zeitraum</p>
                      <p className="text-ios-gray-900">
                        {format(parseISO(event.start_date), 'dd.MM.yyyy HH:mm', { locale: de })} - 
                        {format(parseISO(event.end_date), ' dd.MM.yyyy HH:mm', { locale: de })} Uhr
                      </p>
                    </div>
                  </div>

                  {event.description && (
                    <div className="flex items-start space-x-3">
                      <DocumentTextIcon className="h-5 w-5 text-ios-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-ios-gray-700">Beschreibung</p>
                        <p className="text-ios-gray-900 whitespace-pre-wrap">{event.description}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-ios-gray-200">
                  <div>
                    <p className="text-sm text-ios-gray-600">Schichten</p>
                    <p className="text-2xl font-bold text-ios-gray-900">{event.stats?.total_shifts || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-ios-gray-600">Benötigte Mitarbeiter</p>
                    <p className="text-2xl font-bold text-ios-gray-900">{event.stats?.total_positions_needed || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-ios-gray-600">Eingeladen</p>
                    <p className="text-2xl font-bold text-ios-gray-900">{event.stats?.invited_staff || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-ios-gray-600">Zugesagt</p>
                    <p className="text-2xl font-bold text-ios-green">{event.stats?.accepted_invitations || 0}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          {!editMode && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {event.status === 'draft' && (
                <button
                  onClick={() => handleStatusChange('published')}
                  disabled={processing}
                  className="ios-card p-4 text-center hover:shadow-ios-lg transition-shadow disabled:opacity-50"
                >
                  <BellIcon className="h-8 w-8 text-ios-blue mx-auto mb-2" />
                  <p className="font-medium text-ios-gray-900">Veröffentlichen</p>
                  <p className="text-xs text-ios-gray-500 mt-1">Einladungen versenden</p>
                </button>
              )}
              
              <Link
                to={`/admin/events/${id}/planning`}
                className="ios-card p-4 text-center hover:shadow-ios-lg transition-shadow"
              >
                <CalendarDaysIcon className="h-8 w-8 text-ios-purple mx-auto mb-2" />
                <p className="font-medium text-ios-gray-900">Schichtplanung</p>
                <p className="text-xs text-ios-gray-500 mt-1">Mitarbeiter einteilen</p>
              </Link>

              {!isEventPast && event.status !== 'cancelled' && (
                <button
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={processing}
                  className="ios-card p-4 text-center hover:shadow-ios-lg transition-shadow disabled:opacity-50"
                >
                  <XCircleIcon className="h-8 w-8 text-ios-red mx-auto mb-2" />
                  <p className="font-medium text-ios-gray-900">Absagen</p>
                  <p className="text-xs text-ios-gray-500 mt-1">Event stornieren</p>
                </button>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Invite Button */}
          {!isEventPast && event.status !== 'cancelled' && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowInviteDialog(true);
                  loadAvailableStaff();
                }}
                className="ios-button-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Mitarbeiter einladen
              </button>
            </div>
          )}

          {/* Invitations List */}
          <div className="ios-card overflow-hidden">
            {event.invitations && event.invitations.length > 0 ? (
              <div className="divide-y divide-ios-gray-200">
                {event.invitations.map((invitation) => (
                  <div key={invitation.id} className="p-4 hover:bg-ios-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {invitation.profile_image ? (
                          <img
                            src={`/uploads/profiles/${invitation.profile_image}`}
                            alt={invitation.staff_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-ios-gray-200 flex items-center justify-center">
                            <UserGroupIcon className="h-5 w-5 text-ios-gray-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-ios-gray-900">{invitation.staff_name}</p>
                          <p className="text-sm text-ios-gray-500">{invitation.personal_code} • {invitation.staff_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {invitation.status === 'pending' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ios-orange/10 text-ios-orange">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            Ausstehend
                          </span>
                        )}
                        {invitation.status === 'accepted' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ios-green/10 text-ios-green">
                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                            Zugesagt
                          </span>
                        )}
                        {invitation.status === 'declined' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ios-red/10 text-ios-red">
                            <XCircleIcon className="w-3 h-3 mr-1" />
                            Abgesagt
                          </span>
                        )}
                        {!isEventPast && (
                          <button
                            onClick={() => handleRemoveInvitation(invitation.staff_id)}
                            className="text-ios-red hover:text-red-600"
                            title="Einladung zurückziehen"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <UserGroupIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
                <p className="text-ios-gray-500">Noch keine Mitarbeiter eingeladen</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'shifts' && (
        <div className="space-y-6">
          {/* Add Shift Button */}
          {!isEventPast && event.status !== 'cancelled' && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddShiftDialog(true)}
                className="ios-button-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Schicht hinzufügen
              </button>
            </div>
          )}

          {/* Shifts List */}
          {event.shifts && event.shifts.length > 0 ? (
            <div className="grid gap-4">
              {event.shifts.map((shift) => (
                <div key={shift.id} className="ios-card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-ios-gray-900">{shift.name}</h3>
                      {shift.position_name && (
                        <p className="text-sm text-ios-gray-600 mt-1">Position: {shift.position_name}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        shift.assigned_count >= shift.required_staff
                          ? 'bg-ios-green/10 text-ios-green'
                          : shift.assigned_count > 0
                          ? 'bg-ios-orange/10 text-ios-orange'
                          : 'bg-ios-gray-100 text-ios-gray-600'
                      }`}>
                        {shift.assigned_count}/{shift.required_staff} besetzt
                      </span>
                      {!isEventPast && (
                        <button
                          onClick={() => handleDeleteShift(shift.id)}
                          className="text-ios-red hover:text-red-600"
                          title="Schicht löschen"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-ios-gray-600">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1.5" />
                      {format(parseISO(shift.start_time), 'HH:mm')} - {format(parseISO(shift.end_time), 'HH:mm')} Uhr
                    </div>
                    <div className="flex items-center">
                      <UserGroupIcon className="h-4 w-4 mr-1.5" />
                      {shift.required_staff} Mitarbeiter benötigt
                    </div>
                  </div>

                  {shift.description && (
                    <p className="mt-3 text-sm text-ios-gray-600">{shift.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="ios-card p-8 text-center">
              <ClockIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
              <p className="text-ios-gray-500">Noch keine Schichten erstellt</p>
            </div>
          )}
        </div>
      )}

      {/* Invite Staff Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowInviteDialog(false)} />
            
            <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-ios-gray-200">
                <h3 className="text-lg font-semibold text-ios-gray-900">Mitarbeiter einladen</h3>
                <p className="text-sm text-ios-gray-600 mt-1">Wählen Sie die Mitarbeiter aus, die Sie einladen möchten</p>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[50vh]">
                {availableStaff.length > 0 ? (
                  <div className="space-y-2">
                    {availableStaff.map((staff) => (
                      <label
                        key={staff.id}
                        className="flex items-center p-3 rounded-xl hover:bg-ios-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStaffIds.includes(staff.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStaffIds([...selectedStaffIds, staff.id]);
                            } else {
                              setSelectedStaffIds(selectedStaffIds.filter(id => id !== staff.id));
                            }
                          }}
                          className="h-4 w-4 rounded text-ios-blue focus:ring-ios-blue"
                        />
                        <div className="ml-3 flex items-center space-x-3 flex-1">
                          {staff.profile_image_url ? (
                            <img
                              src={staff.profile_image_url}
                              alt={staff.full_name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-ios-gray-200 flex items-center justify-center">
                              <span className="text-xs font-medium text-ios-gray-600">
                                {staff.first_name[0]}{staff.last_name[0]}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-ios-gray-900">{staff.full_name}</p>
                            <p className="text-xs text-ios-gray-500">{staff.personal_code} • {staff.qualifications || 'Keine Qualifikationen'}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-ios-gray-500 py-8">
                    Alle aktiven Mitarbeiter wurden bereits eingeladen
                  </p>
                )}
              </div>
              
              <div className="p-6 border-t border-ios-gray-200 flex space-x-3">
                <button
                  onClick={() => {
                    setShowInviteDialog(false);
                    setSelectedStaffIds([]);
                  }}
                  className="flex-1 ios-button-secondary"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleInviteStaff}
                  disabled={processing || selectedStaffIds.length === 0}
                  className="flex-1 ios-button-primary disabled:opacity-50"
                >
                  {processing ? 'Einladen...' : `${selectedStaffIds.length} Mitarbeiter einladen`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Shift Dialog */}
      {showAddShiftDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddShiftDialog(false)} />
            
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-ios-gray-900 mb-4">Neue Schicht hinzufügen</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={newShift.name}
                    onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                    className="ios-input"
                    placeholder="z.B. Frühdienst"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">Von</label>
                    <input
                      type="time"
                      value={newShift.start_time}
                      onChange={(e) => setNewShift({ ...newShift, start_time: e.target.value })}
                      className="ios-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">Bis</label>
                    <input
                      type="time"
                      value={newShift.end_time}
                      onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                      className="ios-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">Position (optional)</label>
                  <select
                    value={newShift.position_id}
                    onChange={(e) => setNewShift({ ...newShift, position_id: e.target.value })}
                    className="ios-input"
                  >
                    <option value="">Alle Positionen</option>
                    {positions.map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">Benötigte Mitarbeiter</label>
                  <input
                    type="number"
                    min="1"
                    value={newShift.required_staff}
                    onChange={(e) => setNewShift({ ...newShift, required_staff: parseInt(e.target.value) || 1 })}
                    className="ios-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">Beschreibung (optional)</label>
                  <textarea
                    value={newShift.description}
                    onChange={(e) => setNewShift({ ...newShift, description: e.target.value })}
                    rows={3}
                    className="ios-input"
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddShiftDialog(false);
                    setNewShift({
                      name: '',
                      start_time: '09:00',
                      end_time: '17:00',
                      required_staff: 1,
                      position_id: '',
                      description: ''
                    });
                  }}
                  className="flex-1 ios-button-secondary"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAddShift}
                  disabled={processing || !newShift.name}
                  className="flex-1 ios-button-primary disabled:opacity-50"
                >
                  {processing ? 'Hinzufügen...' : 'Hinzufügen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetail;


