// frontend/src/pages/admin/StaffDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ArrowLeftIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  IdentificationIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  KeyIcon,
  TrashIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CameraIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

const StaffDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [availableQualifications, setAvailableQualifications] = useState([]);
  const [selectedQualifications, setSelectedQualifications] = useState([]);
  const [showPersonalCodeDialog, setShowPersonalCodeDialog] = useState(false);
  const [newPersonalCode, setNewPersonalCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'shifts', 'stats'

  useEffect(() => {
    loadMember();
    loadQualifications();
  }, [id]);

  const loadMember = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/staff/${id}`);
      setMember(response.data);
      setEditData({
        first_name: response.data.first_name,
        last_name: response.data.last_name,
        email: response.data.email,
        phone: response.data.phone,
        street: response.data.street,
        house_number: response.data.house_number,
        postal_code: response.data.postal_code,
        city: response.data.city,
        tshirt_size: response.data.tshirt_size,
        emergency_contact: response.data.emergency_contact || '',
        emergency_phone: response.data.emergency_phone || '',
        notes: response.data.notes || ''
      });
      setSelectedQualifications(response.data.qualifications.map(q => q.id));
    } catch (error) {
      console.error('Fehler beim Laden des Mitarbeiters:', error);
      toast.error('Mitarbeiter konnte nicht geladen werden');
      navigate('/admin/staff');
    } finally {
      setLoading(false);
    }
  };

  const loadQualifications = async () => {
    try {
      const response = await api.get('/settings/qualifications');
      setAvailableQualifications(response.data.qualifications.filter(q => q.is_active));
    } catch (error) {
      console.error('Fehler beim Laden der Qualifikationen:', error);
    }
  };

  const handleSave = async () => {
    setProcessing(true);
    try {
      await api.put(`/staff/${id}`, {
        ...editData,
        qualifications: selectedQualifications
      });
      
      toast.success('Mitarbeiter erfolgreich aktualisiert');
      setEditing(false);
      loadMember();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Fehler beim Speichern der Änderungen');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!window.confirm(`Möchten Sie diesen Mitarbeiter wirklich ${member.is_active ? 'deaktivieren' : 'aktivieren'}?`)) return;

    setProcessing(true);
    try {
      await api.patch(`/staff/${id}/status`, {
        is_active: !member.is_active
      });
      
      toast.success(`Mitarbeiter ${!member.is_active ? 'aktiviert' : 'deaktiviert'}`);
      loadMember();
    } catch (error) {
      console.error('Fehler beim Ändern des Status:', error);
      toast.error('Status konnte nicht geändert werden');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePersonalCode = async () => {
    if (!newPersonalCode || newPersonalCode.length < 6) {
      toast.error('Personal-Code muss mindestens 6 Zeichen lang sein');
      return;
    }

    setProcessing(true);
    try {
      await api.patch(`/staff/${id}/personal-code`, {
        personal_code: newPersonalCode.toUpperCase()
      });
      
      toast.success('Personal-Code erfolgreich geändert');
      setShowPersonalCodeDialog(false);
      setNewPersonalCode('');
      loadMember();
    } catch (error) {
      console.error('Fehler beim Ändern des Personal-Codes:', error);
      toast.error(error.response?.data?.message || 'Personal-Code konnte nicht geändert werden');
    } finally {
      setProcessing(false);
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm('Möchten Sie wirklich ein Passwort-Reset für diesen Mitarbeiter auslösen?')) return;

    setProcessing(true);
    try {
      await api.post(`/staff/${id}/reset-password`);
      toast.success('Passwort-Reset E-Mail wurde versendet');
    } catch (error) {
      console.error('Fehler beim Passwort-Reset:', error);
      toast.error('Passwort-Reset konnte nicht durchgeführt werden');
    } finally {
      setProcessing(false);
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

  if (!member) return null;

  const age = new Date().getFullYear() - new Date(member.birth_date).getFullYear();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/staff')}
            className="p-2 rounded-lg hover:bg-ios-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-ios-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-ios-gray-900">Mitarbeiterdetails</h1>
            <p className="text-ios-gray-600">
              Mitglied seit {format(parseISO(member.hired_date || member.user_created_at), 'MMMM yyyy', { locale: de })}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {member.is_active ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-ios-green/10 text-ios-green">
              <CheckCircleIcon className="w-4 h-4 mr-1.5" />
              Aktiv
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-ios-red/10 text-ios-red">
              <XCircleIcon className="w-4 h-4 mr-1.5" />
              Inaktiv
            </span>
          )}
          {member.role === 'admin' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-ios-purple/10 text-ios-purple">
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-ios-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'info'
              ? 'bg-white text-ios-gray-900 shadow-sm'
              : 'text-ios-gray-600 hover:text-ios-gray-900'
          }`}
        >
          Informationen
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'shifts'
              ? 'bg-white text-ios-gray-900 shadow-sm'
              : 'text-ios-gray-600 hover:text-ios-gray-900'
          }`}
        >
          Schichten
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'stats'
              ? 'bg-white text-ios-gray-900 shadow-sm'
              : 'text-ios-gray-600 hover:text-ios-gray-900'
          }`}
        >
          Statistiken
        </button>
      </div>

      {activeTab === 'info' && (
        <>
          {/* Basic Info */}
          <div className="ios-card p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-ios-gray-900">Persönliche Daten</h2>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="ios-button-secondary text-sm"
                >
                  <PencilIcon className="h-4 w-4 mr-1.5" />
                  Bearbeiten
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditing(false);
                      loadMember();
                    }}
                    className="ios-button-secondary text-sm"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={processing}
                    className="ios-button-primary text-sm"
                  >
                    {processing ? 'Speichern...' : 'Speichern'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-start space-x-6">
              {/* Profile Image */}
              <div className="flex-shrink-0">
                {member.profile_image_url ? (
                  <img
                    src={member.profile_image_url}
                    alt={`${member.first_name} ${member.last_name}`}
                    className="h-32 w-32 rounded-2xl object-cover shadow-lg"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-2xl bg-ios-gray-200 flex items-center justify-center">
                    <UserCircleIcon className="h-16 w-16 text-ios-gray-400" />
                  </div>
                )}
                {editing && (
                  <button className="mt-2 w-full ios-button-secondary text-xs">
                    <CameraIcon className="h-3 w-3 mr-1" />
                    Bild ändern
                  </button>
                )}
              </div>

              {/* Info Grid */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                {editing ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-1">Vorname</label>
                      <input
                        type="text"
                        value={editData.first_name}
                        onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                        className="ios-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-1">Nachname</label>
                      <input
                        type="text"
                        value={editData.last_name}
                        onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                        className="ios-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-1">E-Mail</label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="ios-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ios-gray-700 mb-1">Telefon</label>
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="ios-input"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-ios-gray-600">Name</p>
                      <p className="font-medium text-ios-gray-900">{member.first_name} {member.last_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-ios-gray-600">Geburtsdatum</p>
                      <p className="font-medium text-ios-gray-900">
                        {format(parseISO(member.birth_date), 'dd.MM.yyyy')} ({age} Jahre)
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-ios-gray-600">E-Mail</p>
                      <a href={`mailto:${member.email}`} className="font-medium text-ios-blue hover:underline">
                        {member.email}
                      </a>
                    </div>
                    <div>
                      <p className="text-sm text-ios-gray-600">Telefon</p>
                      <a href={`tel:${member.phone}`} className="font-medium text-ios-blue hover:underline">
                        {member.phone}
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Address & Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="ios-card p-6">
              <h3 className="font-semibold text-ios-gray-900 mb-4 flex items-center">
                <MapPinIcon className="h-5 w-5 mr-2" />
                Adresse
              </h3>
              {editing ? (
                <div className="space-y-3">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={editData.street}
                      onChange={(e) => setEditData({ ...editData, street: e.target.value })}
                      placeholder="Straße"
                      className="ios-input flex-1"
                    />
                    <input
                      type="text"
                      value={editData.house_number}
                      onChange={(e) => setEditData({ ...editData, house_number: e.target.value })}
                      placeholder="Nr."
                      className="ios-input w-20"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={editData.postal_code}
                      onChange={(e) => setEditData({ ...editData, postal_code: e.target.value })}
                      placeholder="PLZ"
                      className="ios-input w-24"
                    />
                    <input
                      type="text"
                      value={editData.city}
                      onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                      placeholder="Stadt"
                      className="ios-input flex-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-sm text-ios-gray-600">
                  <p>{member.street} {member.house_number}</p>
                  <p>{member.postal_code} {member.city}</p>
                </div>
              )}
            </div>

            <div className="ios-card p-6">
              <h3 className="font-semibold text-ios-gray-900 mb-4 flex items-center">
                <IdentificationIcon className="h-5 w-5 mr-2" />
                Zusätzliche Informationen
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ios-gray-600">Personal-Code</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-medium text-ios-gray-900">{member.personal_code}</span>
                    <button
                      onClick={() => setShowPersonalCodeDialog(true)}
                      className="text-ios-blue hover:text-blue-600"
                      title="Personal-Code ändern"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-ios-gray-600">T-Shirt Größe</span>
                  {editing ? (
                    <select
                      value={editData.tshirt_size}
                      onChange={(e) => setEditData({ ...editData, tshirt_size: e.target.value })}
                      className="ios-input py-1 px-2 text-sm"
                    >
                      <option value="XS">XS</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="XXL">XXL</option>
                      <option value="3XL">3XL</option>
                    </select>
                  ) : (
                    <span className="font-medium text-ios-gray-900">{member.tshirt_size}</span>
                  )}
                </div>
                {editing && (
                  <>
                    <div>
                      <label className="block text-sm text-ios-gray-600 mb-1">Notfallkontakt</label>
                      <input
                        type="text"
                        value={editData.emergency_contact}
                        onChange={(e) => setEditData({ ...editData, emergency_contact: e.target.value })}
                        placeholder="Name des Notfallkontakts"
                        className="ios-input text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-ios-gray-600 mb-1">Notfallnummer</label>
                      <input
                        type="tel"
                        value={editData.emergency_phone}
                        onChange={(e) => setEditData({ ...editData, emergency_phone: e.target.value })}
                        placeholder="Telefonnummer"
                        className="ios-input text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Qualifications */}
          <div className="ios-card p-6 mb-6">
            <h3 className="font-semibold text-ios-gray-900 mb-4 flex items-center">
              <SparklesIcon className="h-5 w-5 mr-2" />
              Qualifikationen
            </h3>
            {editing ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableQualifications.map((qual) => (
                  <button
                    key={qual.id}
                    onClick={() => {
                      if (selectedQualifications.includes(qual.id)) {
                        setSelectedQualifications(prev => prev.filter(id => id !== qual.id));
                      } else {
                        setSelectedQualifications(prev => [...prev, qual.id]);
                      }
                    }}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      selectedQualifications.includes(qual.id)
                        ? 'border-ios-blue bg-ios-blue/10 text-ios-blue'
                        : 'border-ios-gray-300 text-ios-gray-700 hover:border-ios-gray-400'
                    }`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full mx-auto mb-2"
                      style={{ backgroundColor: qual.color }}
                    />
                    {qual.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {member.qualifications.length > 0 ? (
                  member.qualifications.map((qual) => (
                    <span
                      key={qual.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-ios-gray-100"
                    >
                      <div 
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: qual.color }}
                      />
                      {qual.name}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-ios-gray-500">Keine Qualifikationen zugewiesen</p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleToggleStatus}
              disabled={processing}
              className={`flex-1 ios-button ${
                member.is_active 
                  ? 'bg-ios-orange text-white hover:bg-orange-600' 
                  : 'bg-ios-green text-white hover:bg-green-600'
              } disabled:opacity-50`}
            >
              {member.is_active ? (
                <>
                  <XCircleIcon className="h-5 w-5 mr-2" />
                  Mitarbeiter deaktivieren
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  Mitarbeiter aktivieren
                </>
              )}
            </button>
            <button
              onClick={handleResetPassword}
              disabled={processing}
              className="flex-1 ios-button-secondary disabled:opacity-50"
            >
              <KeyIcon className="h-5 w-5 mr-2" />
              Passwort zurücksetzen
            </button>
          </div>
        </>
      )}

      {activeTab === 'shifts' && (
        <div className="ios-card p-6">
          <h3 className="font-semibold text-ios-gray-900 mb-4">Schicht-Historie</h3>
          {member.shiftHistory && member.shiftHistory.length > 0 ? (
            <div className="space-y-3">
              {member.shiftHistory.map((shift) => (
                <div key={shift.shift_id} className="p-4 bg-ios-gray-50 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-ios-gray-900">{shift.event_name}</p>
                      <p className="text-sm text-ios-gray-600">
                        {shift.shift_name} • {shift.position_name}
                      </p>
                      <p className="text-xs text-ios-gray-500 mt-1">
                        {format(parseISO(shift.start_time), 'dd.MM.yyyy HH:mm')} - 
                        {format(parseISO(shift.end_time), 'HH:mm')} Uhr
                      </p>
                    </div>
                    {shift.status === 'confirmed' && (
                      <CheckCircleIcon className="h-5 w-5 text-ios-green flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ios-gray-500 text-center py-8">
              Noch keine Schichten zugewiesen
            </p>
          )}
        </div>
      )}

      {activeTab === 'stats' && member.workStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="ios-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ios-gray-600">Gesamtstunden</p>
                <p className="text-2xl font-bold text-ios-gray-900">{member.workStats.total_hours}h</p>
              </div>
              <ClockIcon className="h-8 w-8 text-ios-blue" />
            </div>
          </div>
          <div className="ios-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ios-gray-600">Arbeitstage</p>
                <p className="text-2xl font-bold text-ios-gray-900">{member.workStats.days_worked}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-ios-purple" />
            </div>
          </div>
          <div className="ios-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ios-gray-600">Einträge</p>
                <p className="text-2xl font-bold text-ios-gray-900">{member.workStats.total_entries}</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-ios-green" />
            </div>
          </div>
          <div className="ios-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ios-gray-600">Monate aktiv</p>
                <p className="text-2xl font-bold text-ios-gray-900">{member.workStats.months_worked}</p>
              </div>
              <CalendarDaysIcon className="h-8 w-8 text-ios-orange" />
            </div>
          </div>
        </div>
      )}

      {/* Personal Code Dialog */}
      {showPersonalCodeDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPersonalCodeDialog(false)} />
            
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-ios-gray-900 mb-4">
                Personal-Code ändern
              </h3>
              
              <p className="text-sm text-ios-gray-600 mb-4">
                Der aktuelle Code ist: <span className="font-mono font-medium">{member.personal_code}</span>
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                  Neuer Personal-Code
                </label>
                <input
                  type="text"
                  value={newPersonalCode}
                  onChange={(e) => setNewPersonalCode(e.target.value.toUpperCase())}
                  placeholder="Mindestens 6 Zeichen"
                  className="ios-input font-mono"
                  maxLength="20"
                />
                <p className="mt-1 text-xs text-ios-gray-500">
                  Nur Großbuchstaben und Zahlen erlaubt
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPersonalCodeDialog(false);
                    setNewPersonalCode('');
                  }}
                  className="flex-1 ios-button-secondary"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleUpdatePersonalCode}
                  disabled={processing || newPersonalCode.length < 6}
                  className="flex-1 ios-button-primary disabled:opacity-50"
                >
                  {processing ? 'Ändern...' : 'Ändern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDetail;


