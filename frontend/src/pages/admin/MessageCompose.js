// frontend/src/pages/admin/MessageCompose.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  PaperAirplaneIcon,
  XMarkIcon,
  UserGroupIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const MessageCompose = () => {
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendToAll, setSendToAll] = useState(false);
  const [message, setMessage] = useState({
    subject: '',
    content: '',
    priority: 'normal'
  });

  useEffect(() => {
    loadRecipients();
  }, [searchQuery]);

  const loadRecipients = async () => {
    try {
      const params = searchQuery ? `?search=${searchQuery}` : '';
      const response = await api.get(`/messages/recipients${params}`);
      setRecipients(response.data.recipients);
    } catch (error) {
      console.error('Fehler beim Laden der Empfänger:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.subject.trim()) {
      toast.error('Bitte geben Sie einen Betreff ein');
      return;
    }

    if (!message.content.trim()) {
      toast.error('Bitte geben Sie einen Nachrichtentext ein');
      return;
    }

    if (!sendToAll && selectedRecipients.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Empfänger');
      return;
    }

    setSending(true);

    try {
      await api.post('/messages/send', {
        subject: message.subject,
        content: message.content,
        priority: message.priority,
        send_to_all: sendToAll,
        recipient_ids: sendToAll ? [] : selectedRecipients.map(r => r.id)
      });

      toast.success('Nachricht erfolgreich gesendet');
      navigate('/admin/messages');
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Senden der Nachricht');
    } finally {
      setSending(false);
    }
  };

  const toggleRecipient = (recipient) => {
    setSelectedRecipients(prev => {
      const exists = prev.find(r => r.id === recipient.id);
      if (exists) {
        return prev.filter(r => r.id !== recipient.id);
      } else {
        return [...prev, recipient];
      }
    });
  };

  const selectAllVisible = () => {
    const newRecipients = [...selectedRecipients];
    recipients.forEach(recipient => {
      if (!newRecipients.find(r => r.id === recipient.id)) {
        newRecipients.push(recipient);
      }
    });
    setSelectedRecipients(newRecipients);
  };

  const clearSelection = () => {
    setSelectedRecipients([]);
    setSendToAll(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ios-gray-900">Neue Nachricht</h1>
        <p className="text-ios-gray-600">Senden Sie eine Nachricht an Mitarbeiter</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipients */}
        <div className="ios-card p-6">
          <h2 className="text-lg font-semibold text-ios-gray-900 mb-4">Empfänger</h2>
          
          <div className="flex items-center mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={sendToAll}
                onChange={(e) => {
                  setSendToAll(e.target.checked);
                  if (e.target.checked) {
                    setSelectedRecipients([]);
                  }
                }}
                className="rounded border-ios-gray-300 text-ios-blue focus:ring-ios-blue"
              />
              <span className="ml-2 text-sm font-medium text-ios-gray-700">
                An alle Mitarbeiter senden
              </span>
            </label>
          </div>

          {!sendToAll && (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-ios-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Mitarbeiter suchen..."
                  className="ios-input pl-10"
                />
              </div>

              {/* Selected Recipients */}
              {selectedRecipients.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-ios-gray-700">
                      Ausgewählt ({selectedRecipients.length})
                    </span>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-sm text-ios-red hover:text-red-600"
                    >
                      Alle entfernen
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipients.map((recipient) => (
                      <span
                        key={recipient.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-ios-blue/10 text-ios-blue"
                      >
                        {recipient.name}
                        <button
                          type="button"
                          onClick={() => toggleRecipient(recipient)}
                          className="ml-2 hover:text-ios-blue"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipient List */}
              <div className="space-y-1 max-h-60 overflow-y-auto">
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="w-full text-left px-3 py-2 text-sm text-ios-blue hover:bg-ios-gray-50 rounded-lg"
                >
                  Alle sichtbaren auswählen
                </button>
                {recipients.map((recipient) => {
                  const isSelected = selectedRecipients.find(r => r.id === recipient.id);
                  return (
                    <button
                      key={recipient.id}
                      type="button"
                      onClick={() => toggleRecipient(recipient)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        isSelected 
                          ? 'bg-ios-blue/10 text-ios-blue' 
                          : 'hover:bg-ios-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{recipient.name}</span>
                          <span className="text-sm text-ios-gray-500 ml-2">
                            {recipient.personal_code}
                          </span>
                        </div>
                        {isSelected && <CheckIcon className="h-5 w-5 text-ios-blue" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Message Details */}
        <div className="ios-card p-6">
          <h2 className="text-lg font-semibold text-ios-gray-900 mb-4">Nachricht</h2>
          
          <div className="space-y-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Priorität
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="low"
                    checked={message.priority === 'low'}
                    onChange={(e) => setMessage({ ...message, priority: e.target.value })}
                    className="text-ios-blue focus:ring-ios-blue"
                  />
                  <span className="ml-2 text-sm">Niedrig</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="normal"
                    checked={message.priority === 'normal'}
                    onChange={(e) => setMessage({ ...message, priority: e.target.value })}
                    className="text-ios-blue focus:ring-ios-blue"
                  />
                  <span className="ml-2 text-sm">Normal</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="high"
                    checked={message.priority === 'high'}
                    onChange={(e) => setMessage({ ...message, priority: e.target.value })}
                    className="text-ios-blue focus:ring-ios-blue"
                  />
                  <span className="ml-2 text-sm">Hoch</span>
                </label>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Betreff
              </label>
              <input
                type="text"
                value={message.subject}
                onChange={(e) => setMessage({ ...message, subject: e.target.value })}
                className="ios-input"
                placeholder="Betreff eingeben..."
                required
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Nachricht
              </label>
              <textarea
                value={message.content}
                onChange={(e) => setMessage({ ...message, content: e.target.value })}
                rows={10}
                className="ios-input resize-none"
                placeholder="Nachricht eingeben..."
                required
              />
              <p className="mt-1 text-sm text-ios-gray-500">
                {message.content.length} / 5000 Zeichen
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/admin/messages')}
            className="ios-button-secondary"
          >
            Abbrechen
          </button>
          
          <div className="flex items-center space-x-3">
            {message.priority === 'high' && (
              <div className="flex items-center text-ios-orange">
                <ExclamationCircleIcon className="h-5 w-5 mr-2" />
                <span className="text-sm">Hohe Priorität</span>
              </div>
            )}
            
            <button
              type="submit"
              disabled={sending}
              className="ios-button-primary flex items-center"
            >
              <PaperAirplaneIcon className="h-5 w-5 mr-2" />
              {sending ? 'Wird gesendet...' : 'Nachricht senden'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MessageCompose;
