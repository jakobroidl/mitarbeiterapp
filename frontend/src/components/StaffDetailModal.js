// frontend/src/components/StaffDetailModal.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const StaffDetailModal = ({ staff, isOpen, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qualifications, setQualifications] = useState([]);
  const [staffQualifications, setStaffQualifications] = useState([]);
  const [selectedQualifications, setSelectedQualifications] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    street: '',
    house_number: '',
    postal_code: '',
    city: '',
    tshirt_size: '',
    birth_date: ''
  });

  useEffect(() => {
    if (staff && isOpen) {
      setFormData({
        first_name: staff.first_name || '',
        last_name: staff.last_name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        street: staff.street || '',
        house_number: staff.house_number || '',
        postal_code: staff.postal_code || '',
        city: staff.city || '',
        tshirt_size: staff.tshirt_size || '',
        birth_date: staff.birth_date || ''
      });
      fetchQualifications();
      fetchStaffDetails();
    }
  }, [staff, isOpen]);

  const fetchQualifications = async () => {
    try {
      const response = await api.get('/qualifications');
      setQualifications(response.data);
    } catch (error) {
      console.error('Error fetching qualifications:', error);
    }
  };

  const fetchStaffDetails = async () => {
    try {
      const response = await api.get(`/users/${staff.id}`);
      const userData = response.data;
      if (userData.qualifications) {
        setStaffQualifications(userData.qualifications);
        setSelectedQualifications(userData.qualifications.map(q => q.id));
      }
    } catch (error) {
      console.error('Error fetching staff details:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put(`/users/${staff.id}`, formData);
      toast.success('Mitarbeiterdaten aktualisiert');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast.error('Fehler beim Speichern der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQualifications = async () => {
    setLoading(true);
    try {
      await api.put(`/users/${staff.id}/qualifications`, {
        qualifications: selectedQualifications
      });
      toast.success('Qualifikationen aktualisiert');
      fetchStaffDetails();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Qualifikationen');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    setLoading(true);
    try {
      await api.patch(`/users/${staff.id}/toggle-active`);
      toast.success(staff.is_active ? 'Mitarbeiter deaktiviert' : 'Mitarbeiter aktiviert');
      onUpdate();
    } catch (error) {
      toast.error('Fehler beim Ändern des Status');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !staff) return null;

  const InfoRow = ({ label, value, editable = true }) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
        {isEditing && editable ? (
          <input
            type="text"
            value={value}
            onChange={(e) => setFormData({ ...formData, [label.toLowerCase().replace(' ', '_')]: e.target.value })}
            className="w-full px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          value || '-'
        )}
      </dd>
    </div>
  );

  const Tab = ({ id, label, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
                  {staff.first_name?.[0]}{staff.last_name?.[0]}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {staff.first_name} {staff.last_name}
                  </h2>
                  <p className="text-blue-100">
                    {staff.personal_code} • {staff.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Status Badge */}
            <div className="mt-4 flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                staff.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {staff.is_active ? 'Aktiv' : 'Inaktiv'}
              </span>
              <span className="text-sm text-blue-100">
                Mitglied seit {new Date(staff.created_at).toLocaleDateString('de-DE')}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 px-6 pt-4">
            <div className="flex space-x-2">
              <Tab
                id="info"
                label="Stammdaten"
                isActive={activeTab === 'info'}
                onClick={setActiveTab}
              />
              <Tab
                id="qualifications"
                label="Qualifikationen"
                isActive={activeTab === 'qualifications'}
                onClick={setActiveTab}
              />
              <Tab
                id="history"
                label="Historie"
                isActive={activeTab === 'history'}
                onClick={setActiveTab}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 320px)' }}>
            {/* Personal Information Tab */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                {/* Contact Information */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Kontaktdaten</h3>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Bearbeiten
                      </button>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="divide-y divide-gray-200">
                      <InfoRow label="E-Mail" value={formData.email} editable={false} />
                      <InfoRow label="Telefon" value={formData.phone} />
                      <InfoRow label="Geburtsdatum" value={formData.birth_date} />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Adresse</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="divide-y divide-gray-200">
                      <InfoRow label="Straße" value={formData.street} />
                      <InfoRow label="Hausnummer" value={formData.house_number} />
                      <InfoRow label="PLZ" value={formData.postal_code} />
                      <InfoRow label="Stadt" value={formData.city} />
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Weitere Informationen</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="divide-y divide-gray-200">
                      <InfoRow label="T-Shirt Größe" value={formData.tshirt_size} />
                    </div>
                  </div>
                </div>

                {/* Edit Actions */}
                {isEditing && (
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        // Reset form data
                        setFormData({
                          first_name: staff.first_name || '',
                          last_name: staff.last_name || '',
                          email: staff.email || '',
                          phone: staff.phone || '',
                          street: staff.street || '',
                          house_number: staff.house_number || '',
                          postal_code: staff.postal_code || '',
                          city: staff.city || '',
                          tshirt_size: staff.tshirt_size || '',
                          birth_date: staff.birth_date || ''
                        });
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"
                    >
                      Speichern
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Qualifications Tab */}
            {activeTab === 'qualifications' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Qualifikationen verwalten</h3>
                <div className="space-y-2">
                  {qualifications.map((qual) => (
                    <label
                      key={qual.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedQualifications.includes(qual.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQualifications([...selectedQualifications, qual.id]);
                          } else {
                            setSelectedQualifications(selectedQualifications.filter(id => id !== qual.id));
                          }
                        }}
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
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleUpdateQualifications}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"
                  >
                    Qualifikationen speichern
                  </button>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Aktivitätsverlauf</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>Historie wird in einer zukünftigen Version verfügbar sein</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex justify-between">
              <button
                onClick={handleToggleActive}
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium rounded-xl ${
                  staff.is_active
                    ? 'text-white bg-red-600 hover:bg-red-700'
                    : 'text-white bg-green-600 hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {staff.is_active ? 'Deaktivieren' : 'Aktivieren'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StaffDetailModal;


