// frontend/src/pages/staff/MyMessages.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  EnvelopeIcon,
  EnvelopeOpenIcon,
  ExclamationCircleIcon,
  TrashIcon,
  ArrowLeftIcon,
  UserCircleIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

const MyMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, high
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    unread: 0,
    total_received: 0,
    unread_high_priority: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadMessages();
    loadStats();
  }, [currentPage, filter]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20
      };
      
      if (filter === 'unread') {
        params.unread = true;
      }
      
      const response = await api.get('/messages/', { params });
      setMessages(response.data.messages);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Fehler beim Laden der Nachrichten:', error);
      toast.error('Fehler beim Laden der Nachrichten');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/messages/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  };

  const viewMessage = async (message) => {
    setSelectedMessage(message);
    setShowDetails(true);
    
    // Markiere als gelesen wenn ungelesen
    if (!message.is_read) {
      try {
        await api.patch(`/messages/${message.id}/read`);
        
        // Update lokalen State
        setMessages(prev => prev.map(msg => 
          msg.id === message.id ? { ...msg, is_read: true, read_at: new Date().toISOString() } : msg
        ));
        
        // Update Stats
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
          unread_high_priority: message.priority === 'high' 
            ? Math.max(0, prev.unread_high_priority - 1) 
            : prev.unread_high_priority
        }));
      } catch (error) {
        console.error('Fehler beim Markieren als gelesen:', error);
      }
    }
  };

  const markAsUnread = async (messageId) => {
    try {
      await api.patch(`/messages/${messageId}/unread`);
      
      // Update lokalen State
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, is_read: false, read_at: null } : msg
      ));
      
      // Update Stats
      const message = messages.find(m => m.id === messageId);
      setStats(prev => ({
        ...prev,
        unread: prev.unread + 1,
        unread_high_priority: message?.priority === 'high' 
          ? prev.unread_high_priority + 1
          : prev.unread_high_priority
      }));
      
      toast.success('Als ungelesen markiert');
    } catch (error) {
      console.error('Fehler beim Markieren als ungelesen:', error);
      toast.error('Fehler beim Markieren');
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Möchtest du diese Nachricht wirklich löschen?')) return;
    
    try {
      await api.delete(`/messages/${messageId}`);
      
      // Update lokalen State
      const deletedMessage = messages.find(m => m.id === messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      // Update Stats wenn ungelesen
      if (!deletedMessage?.is_read) {
        setStats(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
          unread_high_priority: deletedMessage.priority === 'high' 
            ? Math.max(0, prev.unread_high_priority - 1)
            : prev.unread_high_priority
        }));
      }
      
      // Schließe Details wenn gelöschte Nachricht angezeigt wird
      if (selectedMessage?.id === messageId) {
        setShowDetails(false);
        setSelectedMessage(null);
      }
      
      toast.success('Nachricht gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error('Fehler beim Löschen der Nachricht');
    }
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      high: { text: 'Wichtig', className: 'bg-red-100 text-red-800 border-red-200' },
      normal: { text: 'Normal', className: 'bg-ios-gray-100 text-ios-gray-700 border-ios-gray-200' },
      low: { text: 'Niedrig', className: 'bg-blue-100 text-blue-800 border-blue-200' }
    };
    
    const badge = badges[priority] || badges.normal;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}>
        {badge.text}
      </span>
    );
  };

  const filteredMessages = messages.filter(message => {
    if (filter === 'high' && message.priority !== 'high') return false;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        message.subject.toLowerCase().includes(search) ||
        message.sender_name.toLowerCase().includes(search) ||
        message.content.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  const MessageListItem = ({ message }) => {
    const isUnread = !message.is_read;
    
    return (
      <div
        onClick={() => viewMessage(message)}
        className={`p-4 border-b border-ios-gray-200 hover:bg-ios-gray-50 cursor-pointer transition-colors ${
          isUnread ? 'bg-ios-blue/5' : ''
        }`}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {message.sender_image ? (
              <img
                src={`/uploads/profiles/${message.sender_image}`}
                alt={message.sender_name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-ios-gray-300 flex items-center justify-center">
                <UserCircleIcon className="h-6 w-6 text-ios-gray-600" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'} text-ios-gray-900 truncate`}>
                  {message.subject}
                </p>
                <p className="text-sm text-ios-gray-600 mt-0.5">
                  {message.sender_name}
                </p>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                {message.priority === 'high' && (
                  <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
                )}
                {isUnread && (
                  <div className="h-2 w-2 rounded-full bg-ios-blue" />
                )}
              </div>
            </div>
            
            <p className="text-sm text-ios-gray-500 mt-1 line-clamp-2">
              {message.content}
            </p>
            
            <p className="text-xs text-ios-gray-400 mt-2">
              {formatDistanceToNow(parseISO(message.created_at), { 
                addSuffix: true, 
                locale: de 
              })}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading && messages.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-ios-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-ios-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-ios-gray-900">Nachrichten</h1>
            <p className="text-ios-gray-600">
              {stats.unread} ungelesene von {stats.total_received} Nachrichten
            </p>
          </div>
          
          {stats.unread_high_priority > 0 && (
            <div className="flex items-center space-x-2 text-sm text-red-600">
              <ExclamationCircleIcon className="h-5 w-5" />
              <span>{stats.unread_high_priority} wichtige ungelesen</span>
            </div>
          )}
        </div>
        
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-ios-gray-400" />
            <input
              type="text"
              placeholder="Nachrichten durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-ios-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ios-blue focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <XMarkIcon className="h-5 w-5 text-ios-gray-400 hover:text-ios-gray-600" />
              </button>
            )}
          </div>
          
          {/* Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-ios-gray-600" />
            <div className="flex rounded-lg overflow-hidden border border-ios-gray-300">
              {[
                { value: 'all', label: 'Alle' },
                { value: 'unread', label: 'Ungelesen' },
                { value: 'high', label: 'Wichtig' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFilter(option.value);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    filter === option.value
                      ? 'bg-ios-blue text-white'
                      : 'bg-white text-ios-gray-700 hover:bg-ios-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Message List */}
        <div className={`${showDetails ? 'hidden sm:block sm:w-1/3 lg:w-2/5' : 'w-full'} border-r border-ios-gray-200 overflow-y-auto`}>
          {filteredMessages.length > 0 ? (
            <div>
              {filteredMessages.map(message => (
                <MessageListItem key={message.id} message={message} />
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 flex items-center justify-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg border border-ios-gray-300 disabled:opacity-50"
                  >
                    Zurück
                  </button>
                  <span className="text-sm text-ios-gray-600">
                    Seite {currentPage} von {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg border border-ios-gray-300 disabled:opacity-50"
                  >
                    Weiter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center">
              <EnvelopeIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
              <p className="text-ios-gray-500">
                {searchTerm ? 'Keine Nachrichten gefunden' : 'Keine Nachrichten vorhanden'}
              </p>
            </div>
          )}
        </div>
        
        {/* Message Detail */}
        {showDetails && selectedMessage ? (
          <div className="flex-1 overflow-y-auto bg-white">
            {/* Detail Header */}
            <div className="sticky top-0 bg-white border-b border-ios-gray-200 p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedMessage(null);
                  }}
                  className="sm:hidden flex items-center text-ios-blue"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  Zurück
                </button>
                
                <div className="flex items-center space-x-2">
                  {!selectedMessage.is_read ? (
                    <button
                      onClick={() => markAsUnread(selectedMessage.id)}
                      className="p-2 rounded-lg hover:bg-ios-gray-100"
                      title="Als ungelesen markieren"
                    >
                      <EnvelopeIcon className="h-5 w-5 text-ios-gray-600" />
                    </button>
                  ) : (
                    <button
                      onClick={() => markAsUnread(selectedMessage.id)}
                      className="p-2 rounded-lg hover:bg-ios-gray-100"
                      title="Als ungelesen markieren"
                    >
                      <EnvelopeOpenIcon className="h-5 w-5 text-ios-gray-600" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => deleteMessage(selectedMessage.id)}
                    className="p-2 rounded-lg hover:bg-ios-gray-100 text-red-600"
                    title="Löschen"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Message Content */}
            <div className="p-6">
              {/* Subject and Priority */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-xl font-semibold text-ios-gray-900">
                    {selectedMessage.subject}
                  </h2>
                  {getPriorityBadge(selectedMessage.priority)}
                </div>
              </div>
              
              {/* Sender Info */}
              <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-ios-gray-200">
                {selectedMessage.sender_image ? (
                  <img
                    src={`/uploads/profiles/${selectedMessage.sender_image}`}
                    alt={selectedMessage.sender_name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-ios-gray-300 flex items-center justify-center">
                    <UserCircleIcon className="h-7 w-7 text-ios-gray-600" />
                  </div>
                )}
                
                <div>
                  <p className="font-medium text-ios-gray-900">
                    {selectedMessage.sender_name}
                  </p>
                  <p className="text-sm text-ios-gray-600">
                    {selectedMessage.sender_email}
                  </p>
                </div>
                
                <div className="flex-1 text-right">
                  <p className="text-sm text-ios-gray-500">
                    <ClockIcon className="h-4 w-4 inline mr-1" />
                    {format(parseISO(selectedMessage.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </p>
                  {selectedMessage.read_at && (
                    <p className="text-xs text-ios-gray-400 mt-1">
                      Gelesen: {format(parseISO(selectedMessage.read_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Message Body */}
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap text-ios-gray-700">
                  {selectedMessage.content}
                </p>
              </div>
            </div>
          </div>
        ) : (
          !showDetails && messages.length > 0 && (
            <div className="hidden sm:flex flex-1 items-center justify-center bg-ios-gray-50">
              <div className="text-center">
                <EnvelopeOpenIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
                <p className="text-ios-gray-500">Wähle eine Nachricht aus</p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default 

MyMessages;


