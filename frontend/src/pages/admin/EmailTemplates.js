import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const EmailTemplates = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const templateTypes = {
    application_received: {
      name: 'Bewerbung eingegangen',
      description: 'Wird an Bewerber gesendet, wenn Bewerbung eingegangen ist',
      variables: ['{{applicant_name}}', '{{application_date}}']
    },
    application_accepted: {
      name: 'Bewerbung angenommen',
      description: 'Wird bei Annahme der Bewerbung gesendet',
      variables: ['{{applicant_name}}', '{{set_password_link}}', '{{personal_code}}']
    },
    application_rejected: {
      name: 'Bewerbung abgelehnt',
      description: 'Wird bei Ablehnung der Bewerbung gesendet',
      variables: ['{{applicant_name}}']
    },
    event_invitation: {
      name: 'Event-Einladung',
      description: 'Einladung zu einer Veranstaltung',
      variables: ['{{staff_name}}', '{{event_name}}', '{{event_date}}', '{{event_location}}']
    },
    shift_assignment: {
      name: 'Schichteinteilung',
      description: 'Benachrichtigung über finale Schichteinteilung',
      variables: ['{{staff_name}}', '{{event_name}}', '{{shift_name}}', '{{shift_time}}']
    },
    password_reset: {
      name: 'Passwort zurücksetzen',
      description: 'Link zum Zurücksetzen des Passworts',
      variables: ['{{user_name}}', '{{reset_link}}']
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings/email-templates');
      setTemplates(response.data.templates);
      
      // Select first template by default
      if (response.data.templates.length > 0) {
        setSelectedTemplate(response.data.templates[0]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Vorlagen:', error);
      toast.error('E-Mail-Vorlagen konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      await api.put(`/settings/email-templates/${selectedTemplate.id}`, {
        subject: selectedTemplate.subject,
        content: selectedTemplate.content,
        is_active: selectedTemplate.is_active
      });
      
      toast.success('Vorlage erfolgreich gespeichert');
      setEditing(false);
      loadTemplates();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      toast.error('Vorlage konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await api.post(`/settings/email-templates/${selectedTemplate.id}/preview`);
      setPreviewData(response.data);
      setShowPreview(true);
    } catch (error) {
      console.error('Fehler bei der Vorschau:', error);
      toast.error('Vorschau konnte nicht generiert werden');
    }
  };

  const handleReset = async () => {
    if (!selectedTemplate) return;
    if (!window.confirm('Möchten Sie diese Vorlage wirklich auf die Standardeinstellung zurücksetzen?')) return;

    try {
      await api.post(`/settings/email-templates/${selectedTemplate.id}/reset`);
      toast.success('Vorlage wurde zurückgesetzt');
      loadTemplates();
    } catch (error) {
      console.error('Fehler beim Zurücksetzen:', error);
      toast.error('Vorlage konnte nicht zurückgesetzt werden');
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

  const templateInfo = selectedTemplate ? templateTypes[selectedTemplate.type] : null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate('/admin/settings')}
          className="p-2 rounded-lg hover:bg-ios-gray-100"
        >
          <ArrowLeftIcon className="h-5 w-5 text-ios-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-ios-gray-900">E-Mail-Vorlagen</h1>
          <p className="text-ios-gray-600">Passen Sie die E-Mail-Vorlagen an</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <div className="ios-card p-4">
            <h3 className="font-semibold text-ios-gray-900 mb-3">Vorlagen</h3>
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setEditing(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'bg-ios-blue text-white'
                      : 'hover:bg-ios-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {templateTypes[template.type]?.name || template.type}
                    </span>
                    {template.is_active ? (
                      <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-3">
          {selectedTemplate ? (
            <div className="ios-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-ios-gray-900">
                    {templateInfo?.name}
                  </h2>
                  <p className="text-sm text-ios-gray-600">{templateInfo?.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {!editing ? (
                    <>
                      <button
                        onClick={handlePreview}
                        className="ios-button-secondary"
                      >
                        <EyeIcon className="h-4 w-4 mr-1.5" />
                        Vorschau
                      </button>
                      <button
                        onClick={() => setEditing(true)}
                        className="ios-button-primary"
                      >
                        <PencilIcon className="h-4 w-4 mr-1.5" />
                        Bearbeiten
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleReset}
                        className="ios-button-secondary text-ios-red"
                      >
                        Zurücksetzen
                      </button>
                      <button
                        onClick={() => {
                          setEditing(false);
                          loadTemplates();
                        }}
                        className="ios-button-secondary"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="ios-button-primary disabled:opacity-50"
                      >
                        {saving ? 'Speichern...' : 'Speichern'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center space-x-3 mb-6 p-4 bg-ios-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={selectedTemplate.is_active}
                  onChange={(e) => {
                    if (editing) {
                      setSelectedTemplate({
                        ...selectedTemplate,
                        is_active: e.target.checked
                      });
                    }
                  }}
                  disabled={!editing}
                  className="h-4 w-4 rounded text-ios-blue"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-ios-gray-700">
                  Vorlage ist aktiv (E-Mails werden versendet)
                </label>
              </div>

              {/* Subject */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                  Betreff
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={selectedTemplate.subject}
                    onChange={(e) => setSelectedTemplate({
                      ...selectedTemplate,
                      subject: e.target.value
                    })}
                    className="ios-input"
                  />
                ) : (
                  <p className="p-3 bg-ios-gray-50 rounded-xl">{selectedTemplate.subject}</p>
                )}
              </div>

              {/* Content */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                  Inhalt
                </label>
                {editing ? (
                  <textarea
                    value={selectedTemplate.content}
                    onChange={(e) => setSelectedTemplate({
                      ...selectedTemplate,
                      content: e.target.value
                    })}
                    rows={15}
                    className="ios-input font-mono text-sm"
                  />
                ) : (
                  <pre className="p-3 bg-ios-gray-50 rounded-xl font-mono text-sm whitespace-pre-wrap">
                    {selectedTemplate.content}
                  </pre>
                )}
              </div>

              {/* Available Variables */}
              {templateInfo?.variables && (
                <div className="bg-ios-blue/10 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-ios-gray-900 mb-2">
                    Verfügbare Variablen
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {templateInfo.variables.map((variable) => (
                      <code
                        key={variable}
                        className="px-2 py-1 bg-white rounded text-xs font-mono text-ios-blue"
                      >
                        {variable}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="ios-card p-12 text-center">
              <EnvelopeIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
              <p className="text-ios-gray-500">Wählen Sie eine Vorlage aus</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
            
            <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-ios-gray-200">
                <h3 className="text-lg font-semibold text-ios-gray-900">E-Mail Vorschau</h3>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="mb-4">
                  <p className="text-sm text-ios-gray-600">Betreff</p>
                  <p className="font-medium text-ios-gray-900">{previewData.subject}</p>
                </div>
                
                <div className="border-t pt-4">
                  <p className="text-sm text-ios-gray-600 mb-2">Inhalt</p>
                  <div className="bg-ios-gray-50 rounded-xl p-4">
                    <pre className="whitespace-pre-wrap text-sm">{previewData.content}</pre>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-ios-gray-200">
                <button
                  onClick={() => setShowPreview(false)}
                  className="w-full ios-button-secondary"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;


