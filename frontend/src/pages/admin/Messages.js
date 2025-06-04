// frontend/src/pages/admin/Messages.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  EnvelopeIcon,
  PaperAirplaneIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  StarIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserGroupIcon,
  ClockIcon,
  EnvelopeOpenIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

const Messages = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [folder, setFolder] = useState('inbox');
  const [filters, setFilters] = useState({
    search: '',
    unread: false,
    priority: ''
  });
  const [stats, setStats] = useState({
    unread: 0,
    total_received: 0,
    total_sent: 0,
    unread_high_priority: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadMessages();
    setSelectedMessage(null); // Reset selected message when changing folder/filters
  }, [folder, filters, pagination.page]);

  const loadStats = async () => {
    try {
      const response = await api.get('/messages/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit
      });

      // Add filters only if they have values
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.unread) {
        params.append('unread', 'true');
      }
      if (filters.priority) {
        params.append('priority', filters.priority);
      }

      const endpoint = folder === 'sent' ? '/messages/sent' : '/messages';
      const response = await api.get(`${endpoint}?${params.toString()}`);
      
      setMessages(response.data.messages || []);
      setPagination(response.data.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      });
    } catch (error) {
      console.error('Fehler beim Laden der Nachrichten:', error);
      toast.error('Fehler beim Laden der Nachrichten');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessage = async (messageId) => {
    try {
      const response = await api.get(`/messages/${messageId}`);
      setSelectedMessage(response.data);
      
      // Mark as read if unread and in inbox
      if (folder === 'inbox' && !response.data.is_read) {
        await markAsRead(messageId);
        // Update the message in the list
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === messageId ? { ...msg, is_read: true } : msg
          )
        );
        // Update stats
        loadStats();
      }
    } catch (error) {
      console.error('Fehler beim Laden der Nachricht:', error);
      toast.error('Fehler beim Laden der Nachricht');
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await api.patch(`/messages/${messageId}/read`);
    } catch (error) {
      console.error('Fehler beim Markieren als gelesen:', error);
    }
  };

  const markAsUnread = async (messageId) => {
    try {
      await api.patch(`/messages/${messageId}/unread`);
      
      // Update local state
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId ? { ...msg, is_read: false } : msg
        )
      );
      
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, is_read: false });
      }
      
      loadStats();
      toast.success('Als ungelesen markiert');
    } catch (error) {
      console.error('Fehler beim Markieren als ungelesen:', error);
      toast.error('Fehler beim Markieren');
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Nachricht wirklich löschen?')) return;

    try {
      await api.delete(`/messages/${messageId}`);
      
      // Remove from local state
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
      
      toast.success('Nachricht gelöscht');
      loadStats();
    } catch (error) {
      console.error('Fehler beim Löschen der Nachricht:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <ExclamationTriangleIcon className="h-5 w-5 text-ios-red" />;
      case 'low':
        return <StarIcon className="h-5 w-5 text-ios-gray-400" />;
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-ios-red/10 text-ios-red">
            Hohe Priorität
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-ios-gray-100 text-ios-gray-500">
            Niedrige Priorität
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-ios-gray-200 flex flex-col">
        <div className="p-4">
          <button
            onClick={() => navigate('/admin/messages/compose')}
            className="w-full ios-button-primary flex items-center justify-center"
          >
            <PaperAirplaneIcon className="h-5 w-5 mr-2" />
            Neue Nachricht
          </button>
        </div>

        <nav className="flex-1 px-2">
          <button
            onClick={() => setFolder('inbox')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-1 transition-colors ${
              folder === 'inbox' 
                ? 'bg-ios-blue text-white' 
                : 'text-ios-gray-700 hover:bg-ios-gray-100'
            }`}
          >
            <div className="flex items-center">
              <InboxIcon className="h-5 w-5 mr-3" />
              <span>Posteingang</span>
            </div>
            {stats.unread > 0 && (
              <span className={`px-2 py-1 text-xs rounded-full ${
                folder === 'inbox' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-ios-blue text-white'
              }`}>
                {stats.unread}
              </span>
            )}
          </button>

          <button
            onClick={() => setFolder('sent')}
            className={`w-full flex items-center px-4 py-3 rounded-xl mb-1 transition-colors ${
              folder === 'sent' 
                ? 'bg-ios-blue text-white' 
                : 'text-ios-gray-700 hover:bg-ios-gray-100'
            }`}
          >
            <PaperAirplaneIcon className="h-5 w-5 mr-3" />
            <span>Gesendet</span>
          </button>
        </nav>

        <div className="p-4 border-t border-ios-gray-200">
          <div className="text-sm text-ios-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Ungelesen:</span>
              <span className="font-medium">{stats.unread}</span>
            </div>
            <div className="flex justify-between">
              <span>Hoch Priorität:</span>
              <span className="font-medium text-ios-red">{stats.unread_high_priority}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="w-96 bg-ios-gray-50 border-r border-ios-gray-200 flex flex-col">
        {/* Filters */}
        <div className="p-4 bg-white border-b border-ios-gray-200">
          <div className="relative mb-3">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-ios-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Nachrichten durchsuchen..."
              className="ios-input pl-10"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            {folder === 'inbox' && (
              <button
                onClick={() => setFilters({ ...filters, unread: !filters.unread })}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  filters.unread 
                    ? 'bg-ios-blue text-white' 
                    : 'bg-ios-gray-100 text-ios-gray-700 hover:bg-ios-gray-200'
                }`}
              >
                Ungelesen
              </button>
            )}
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="flex-1 px-3 py-1 rounded-lg text-sm bg-ios-gray-100 border-0 focus:ring-2 focus:ring-ios-blue"
            >
              <option value="">Alle Prioritäten</option>
              <option value="high">Hoch</option>
              <option value="normal">Normal</option>
              <option value="low">Niedrig</option>
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ios-blue mx-auto"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-ios-gray-500">
              <EnvelopeIcon className="h-12 w-12 mx-auto mb-3 text-ios-gray-300" />
              <p>Keine Nachrichten</p>
            </div>
          ) : (
            <div className="divide-y divide-ios-gray-200">
              {messages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => loadMessage(message.id)}
                  className={`w-full p-4 text-left hover:bg-white transition-colors ${
                    selectedMessage?.id === message.id ? 'bg-white shadow-sm' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {getPriorityIcon(message.priority)}
                      {folder === 'inbox' && !message.is_read && (
                        <div className="w-2 h-2 bg-ios-blue rounded-full flex-shrink-0" />
                      )}
                      <span className={`text-sm truncate ${
                        folder === 'inbox' && !message.is_read ? 'font-semibold text-ios-gray-900' : 'text-ios-gray-700'
                      }`}>
                        {folder === 'sent' 
                          ? `An ${message.recipient_count || 0} Empfänger` 
                          : (message.sender_name || 'Unbekannt')
                        }
                      </span>
                    </div>
                    <span className="text-xs text-ios-gray-500 flex-shrink-0">
                      {format(parseISO(message.created_at), 'dd.MM. HH:mm')}
                    </span>
                  </div>
                  <p className={`text-sm ${
                    folder === 'inbox' && !message.is_read ? 'font-medium text-ios-gray-900' : 'text-ios-gray-700'
                  } truncate`}>
                    {message.subject}
                  </p>
                  {message.content && (
                    <p className="text-sm text-ios-gray-500 truncate mt-1">
                      {message.content.substring(0, 100)}...
                    </p>
                  )}
                  {folder === 'sent' && message.read_count !== undefined && (
                    <div className="flex items-center mt-2 text-xs text-ios-gray-500">
                      <EnvelopeOpenIcon className="h-4 w-4 mr-1" />
                      {message.read_count} von {message.recipient_count} gelesen
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 bg-white border-t border-ios-gray-200 flex items-center justify-between">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg hover:bg-ios-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <span className="text-sm text-ios-gray-700">
              Seite {pagination.page} von {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
              disabled={pagination.page === pagination.pages}
              className="p-2 rounded-lg hover:bg-ios-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Message Detail */}
      <div className="flex-1 bg-white flex flex-col">
        {selectedMessage ? (
          <>
            {/* Message Header */}
            <div className="p-6 border-b border-ios-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-ios-gray-900 mb-2">
                    {selectedMessage.subject}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-ios-gray-600">
                    <span>
                      {folder === 'sent' ? 'Gesendet' : 'Von'}: {selectedMessage.sender_name || 'System'}
                    </span>
                    <span>•</span>
                    <span>
                      {format(parseISO(selectedMessage.created_at), 'dd. MMMM yyyy HH:mm', { locale: de })}
                    </span>
                    {selectedMessage.priority !== 'normal' && (
                      <>
                        <span>•</span>
                        {getPriorityBadge(selectedMessage.priority)}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {folder === 'inbox' && (
                    <button
                      onClick={() => selectedMessage.is_read ? markAsUnread(selectedMessage.id) : markAsRead(selectedMessage.id)}
                      className="p-2 rounded-lg hover:bg-ios-gray-100"
                      title={selectedMessage.is_read ? 'Als ungelesen markieren' : 'Als gelesen markieren'}
                    >
                      <EnvelopeIcon className="h-5 w-5 text-ios-gray-600" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMessage(selectedMessage.id)}
                    className="p-2 rounded-lg hover:bg-ios-gray-100"
                    title="Löschen"
                  >
                    <TrashIcon className="h-5 w-5 text-ios-gray-600" />
                  </button>
                </div>
              </div>

              {/* Recipients (for sent messages) */}
              {folder === 'sent' && selectedMessage.recipients && selectedMessage.recipients.length > 0 && (
                <div className="mt-4 p-3 bg-ios-gray-50 rounded-xl">
                  <div className="flex items-center mb-2">
                    <UserGroupIcon className="h-4 w-4 text-ios-gray-500 mr-2" />
                    <span className="text-sm font-medium text-ios-gray-700">
                      Empfänger ({selectedMessage.recipients.length})
                    </span>
                  </div>
                  <div className="text-sm text-ios-gray-600">
                    {selectedMessage.is_global ? (
                      <span>An alle Mitarbeiter</span>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {selectedMessage.recipients.map((recipient) => (
                          <div key={recipient.recipient_id} className="flex items-center justify-between">
                            <span>{recipient.name || recipient.email}</span>
                            <div className="flex items-center space-x-2 text-xs">
                              {recipient.is_read ? (
                                <>
                                  <CheckIcon className="h-4 w-4 text-ios-green" />
                                  <span className="text-ios-gray-500">
                                    {recipient.read_at && format(parseISO(recipient.read_at), 'dd.MM. HH:mm')}
                                  </span>
                                </>
                              ) : (
                                <span className="text-ios-gray-400">Ungelesen</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap text-ios-gray-700">
                  {selectedMessage.content}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-ios-gray-400">
            <div className="text-center">
              <EnvelopeIcon className="h-16 w-16 mx-auto mb-4" />
              <p>Wählen Sie eine Nachricht aus</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;


