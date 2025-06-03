import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Cog6ToothIcon,
  SparklesIcon,
  MapPinIcon,
  EnvelopeIcon,
  BellIcon,
  KeyIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    company_name: '',
    admin_email: '',
    default_shift_duration: 8,
    break_threshold: 6,
    break_duration: 30
  });

  // Qualifications
  const [qualifications, setQualifications] = useState([]);
  const [newQualification, setNewQualification] = useState({ name: '', color: '#007AFF' });
  const [editingQualification, setEditingQualification] = useState(null);

  // Positions
  const [positions, setPositions] = useState([]);
  const [newPosition, setNewPosition] = useState({ name: '', color: '#007AFF' });
  const [editingPosition, setEditingPosition] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      const [generalRes, qualRes, posRes] = await Promise.all([
        api.get('/settings/general'),
        api.get('/settings/qualifications'),
        api.get('/settings/positions')
      ]);
      
      setGeneralSettings(generalRes.data);
      setQualifications(qualRes.data.qualifications);
      setPositions(posRes.data.positions);
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
      toast.error('Einstellungen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const saveGeneralSettings = async () => {
    setSaving(true);
    try {
      await api.put('/settings/general', generalSettings);
      toast.success('Einstellungen gespeichert');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Einstellungen konnten nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const addQualification = async () => {
    if (!newQualification.name) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }

    try {
      await api.post('/settings/qualifications', newQualification);
      toast.success('Qualifikation hinzugefügt');
      setNewQualification({ name: '', color: '#007AFF' });
      loadSettings();
    } catch (error) {
      console.error('Fehler beim Hinzufügen:', error);
      toast.error('Qualifikation konnte nicht hinzugefügt werden');
    }
  };

  const updateQualification = async (id, data) => {
    try {
      await api.put(`/settings/qualifications/${id}`, data);
      toast.success('Qualifikation aktualisiert');
      setEditingQualification(null);
      loadSettings();
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
      toast.error('Qualifikation konnte nicht aktualisiert werden');
    }
  };

  const deleteQualification = async (id) => {
    if (!window.confirm('Qualifikation wirklich löschen?')) return;

    try {
      await api.delete(`/settings/qualifications/${id}`);
      toast.success('Qualifikation gelöscht');
      loadSettings();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error('Qualifikation konnte nicht gelöscht werden');
    }
  };

  const addPosition = async () => {
    if (!newPosition.name) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }

    try {
      await api.post('/settings/positions', newPosition);
      toast.success('Position hinzugefügt');
      setNewPosition({ name: '', color: '#007AFF' });
      loadSettings();
    } catch (error) {
      console.error('Fehler beim Hinzufügen:', error);
      toast.error('Position konnte nicht hinzugefügt werden');
    }
  };

  const updatePosition = async (id, data) => {
    try {
      await api.put(`/settings/positions/${id}`, data);
      toast.success('Position aktualisiert');
      setEditingPosition(null);
      loadSettings();
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
      toast.error('Position konnte nicht aktualisiert werden');
    }
  };

  const deletePosition = async (id) => {
    if (!window.confirm('Position wirklich löschen?')) return;

    try {
      await api.delete(`/settings/positions/${id}`);
      toast.success('Position gelöscht');
      loadSettings();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error('Position konnte nicht gelöscht werden');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-ios-gray-200 rounded w-1/4 mb-6"></div>
          <div className="ios-card p-6 h-96"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ios-gray-900">Einstellungen</h1>
        <p className="text-ios-gray-600">Verwalten Sie die App-Einstellungen</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-ios-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'general'
              ? 'bg-white text-ios-gray-900 shadow-sm'
              : 'text-ios-gray-600 hover:text-ios-gray-900'
          }`}
        >
          <Cog6ToothIcon className="h-5 w-5 inline mr-2" />
          Allgemein
        </button>
        <button
          onClick={() => setActiveTab('qualifications')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'qualifications'
              ? 'bg-white text-ios-gray-900 shadow-sm'
              : 'text-ios-gray-600 hover:text-ios-gray-900'
          }`}
        >
          <SparklesIcon className="h-5 w-5 inline mr-2" />
          Qualifikationen
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'positions'
              ? 'bg-white text-ios-gray-900 shadow-sm'
              : 'text-ios-gray-600 hover:text-ios-gray-900'
          }`}
        >
          <MapPinIcon className="h-5 w-5 inline mr-2" />
          Positionen
        </button>
      </div>

      {/* Content */}
      {activeTab === 'general' && (
        <div className="ios-card p-6">
          <h2 className="text-lg font-semibold text-ios-gray-900 mb-6">Allgemeine Einstellungen</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Firmenname
              </label>
              <input
                type="text"
                value={generalSettings.company_name}
                onChange={(e) => setGeneralSettings({ ...generalSettings, company_name: e.target.value })}
                className="ios-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Admin E-Mail
              </label>
              <input
                type="email"
                value={generalSettings.admin_email}
                onChange={(e) => setGeneralSettings({ ...generalSettings, admin_email: e.target.value })}
                className="ios-input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                  Standard Schichtdauer (Stunden)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={generalSettings.default_shift_duration}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, default_shift_duration: parseInt(e.target.value) })}
                  className="ios-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                  Pausenschwelle (Stunden)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={generalSettings.break_threshold}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, break_threshold: parseInt(e.target.value) })}
                  className="ios-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                  Pausendauer (Minuten)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={generalSettings.break_duration}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, break_duration: parseInt(e.target.value) })}
                  className="ios-input"
                />
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t">
              <button
                onClick={saveGeneralSettings}
                disabled={saving}
                className="ios-button-primary disabled:opacity-50"
              >
                {saving ? 'Speichern...' : 'Einstellungen speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'qualifications' && (
        <div className="ios-card p-6">
          <h2 className="text-lg font-semibold text-ios-gray-900 mb-6">Qualifikationen verwalten</h2>
          
          {/* Add new */}
          <div className="flex items-end space-x-3 mb-6 pb-6 border-b">
            <div className="flex-1">
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={newQualification.name}
                onChange={(e) => setNewQualification({ ...newQualification, name: e.target.value })}
                placeholder="z.B. Barkeeper"
                className="ios-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Farbe
              </label>
              <input
                type="color"
                value={newQualification.color}
                onChange={(e) => setNewQualification({ ...newQualification, color: e.target.value })}
                className="h-[42px] w-20 rounded-xl border border-ios-gray-300"
              />
            </div>
            <button
              onClick={addQualification}
              className="ios-button-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Hinzufügen
            </button>
          </div>

          {/* List */}
          <div className="space-y-2">
            {qualifications.map((qual) => (
              <div key={qual.id} className="flex items-center justify-between p-3 rounded-xl bg-ios-gray-50">
                {editingQualification === qual.id ? (
                  <>
                    <div className="flex items-center space-x-3 flex-1">
                      <input
                        type="text"
                        value={qual.name}
                        onChange={(e) => setQualifications(qualifications.map(q => 
                          q.id === qual.id ? { ...q, name: e.target.value } : q
                        ))}
                        className="ios-input py-1"
                      />
                      <input
                        type="color"
                        value={qual.color}
                        onChange={(e) => setQualifications(qualifications.map(q => 
                          q.id === qual.id ? { ...q, color: e.target.value } : q
                        ))}
                        className="h-8 w-16 rounded border border-ios-gray-300"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQualification(qual.id, qual)}
                        className="text-ios-green hover:text-green-600"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingQualification(null);
                          loadSettings();
                        }}
                        className="text-ios-red hover:text-red-600"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: qual.color }}
                      />
                      <span className="font-medium text-ios-gray-900">{qual.name}</span>
                      {!qual.is_active && (
                        <span className="text-xs text-ios-gray-500">(Inaktiv)</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingQualification(qual.id)}
                        className="text-ios-blue hover:text-blue-600"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteQualification(qual.id)}
                        className="text-ios-red hover:text-red-600"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'positions' && (
        <div className="ios-card p-6">
          <h2 className="text-lg font-semibold text-ios-gray-900 mb-6">Positionen verwalten</h2>
          
          {/* Add new */}
          <div className="flex items-end space-x-3 mb-6 pb-6 border-b">
            <div className="flex-1">
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={newPosition.name}
                onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}

placeholder="z.B. Service"
               className="ios-input"
             />
           </div>
           <div>
             <label className="block text-sm font-medium text-ios-gray-700 mb-2">
               Farbe
             </label>
             <input
               type="color"
               value={newPosition.color}
               onChange={(e) => setNewPosition({ ...newPosition, color: e.target.value })}
               className="h-[42px] w-20 rounded-xl border border-ios-gray-300"
             />
           </div>
           <button
             onClick={addPosition}
             className="ios-button-primary"
           >
             <PlusIcon className="h-5 w-5 mr-2" />
             Hinzufügen
           </button>
         </div>

         {/* List */}
         <div className="space-y-2">
           {positions.map((pos) => (
             <div key={pos.id} className="flex items-center justify-between p-3 rounded-xl bg-ios-gray-50">
               {editingPosition === pos.id ? (
                 <>
                   <div className="flex items-center space-x-3 flex-1">
                     <input
                       type="text"
                       value={pos.name}
                       onChange={(e) => setPositions(positions.map(p => 
                         p.id === pos.id ? { ...p, name: e.target.value } : p
                       ))}
                       className="ios-input py-1"
                     />
                     <input
                       type="color"
                       value={pos.color}
                       onChange={(e) => setPositions(positions.map(p => 
                         p.id === pos.id ? { ...p, color: e.target.value } : p
                       ))}
                       className="h-8 w-16 rounded border border-ios-gray-300"
                     />
                   </div>
                   <div className="flex items-center space-x-2">
                     <button
                       onClick={() => updatePosition(pos.id, pos)}
                       className="text-ios-green hover:text-green-600"
                     >
                       <CheckIcon className="h-5 w-5" />
                     </button>
                     <button
                       onClick={() => {
                         setEditingPosition(null);
                         loadSettings();
                       }}
                       className="text-ios-red hover:text-red-600"
                     >
                       <XMarkIcon className="h-5 w-5" />
                     </button>
                   </div>
                 </>
               ) : (
                 <>
                   <div className="flex items-center space-x-3">
                     <div 
                       className="w-4 h-4 rounded-full"
                       style={{ backgroundColor: pos.color }}
                     />
                     <span className="font-medium text-ios-gray-900">{pos.name}</span>
                     {!pos.is_active && (
                       <span className="text-xs text-ios-gray-500">(Inaktiv)</span>
                     )}
                   </div>
                   <div className="flex items-center space-x-2">
                     <button
                       onClick={() => setEditingPosition(pos.id)}
                       className="text-ios-blue hover:text-blue-600"
                     >
                       <PencilIcon className="h-5 w-5" />
                     </button>
                     <button
                       onClick={() => deletePosition(pos.id)}
                       className="text-ios-red hover:text-red-600"
                     >
                       <TrashIcon className="h-5 w-5" />
                     </button>
                   </div>
                 </>
               )}
             </div>
           ))}
         </div>
       </div>
     )}
   </div>
 );
};

export default Settings;


