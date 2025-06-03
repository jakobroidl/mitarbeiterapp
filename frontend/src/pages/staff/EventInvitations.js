// frontend/src/pages/staff/EventInvitations.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  CalendarDaysIcon,
  MapPinIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserGroupIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { format, parseISO, isFuture, isPast } from 'date-fns';
import { de } from 'date-fns/locale';

const EventInvitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // all, pending, accepted, declined
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [processingIds, setProcessingIds] = useState(new Set());
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    declined: 0
  });

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/events/invitations/my');
      const invitationsData = response.data.invitations;
      
      setInvitations(invitationsData);
      
      // Berechne Statistiken
      const stats = invitationsData.reduce((acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      }, { pending: 0, accepted: 0, declined: 0 });
      
      setStats(stats);
    } catch (error) {
      console.error('Fehler beim Laden der Einladungen:', error);
      toast.error('Fehler beim Laden der Einladungen');
    } finally {
      setLoading(false);
    }
  };

  const respondToInvitation = async (invitationId, response) => {
    setProcessingIds(prev => new Set([...prev, invitationId]));
    
    try {
      await api.post(`/events/invitations/${invitationId}/respond`, { response });
      
      const responseText = response === 'accepted' ? 'angenommen' : 'abgelehnt';
      toast.success(`Einladung erfolgreich ${responseText}`);
      
      // Aktualisiere lokalen State
      setInvitations(prev => prev.map(inv => 
        inv.id === invitationId 
          ? { ...inv, status: response, responded_at: new Date().toISOString() }
          : inv
      ));
      
      // Aktualisiere Stats
      setStats(prev => ({
        ...prev,
        pending: prev.pending - 1,
        [response]: prev[response] + 1
      }));
      
    } catch (error) {
      console.error('Fehler beim Beantworten der Einladung:', error);
      toast.error('Fehler beim Beantworten der Einladung');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    }
  };

  const toggleCardExpansion = (invitationId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invitationId)) {
        newSet.delete(invitationId);
      } else {
        newSet.add(invitationId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { 
        text: 'Offen', 
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: ExclamationTriangleIcon
      },
      accepted: { 
        text: 'Angenommen', 
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckIcon
      },
      declined: { 
        text: 'Abgelehnt', 
        className: 'bg-red-100 text-red-800 border-red-200',
        icon: XMarkIcon
      }
    };
    
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
        <Icon className="h-3.5 w-3.5" />
        {badge.text}
      </span>
    );
  };

  const filteredInvitations = invitations.filter(invitation => {
    if (filter === 'all') return true;
    return invitation.status === filter;
  });

  const InvitationCard = ({ invitation }) => {
    const isExpanded = expandedCards.has(invitation.id);
    const isProcessing = processingIds.has(invitation.id);
    const eventDate = parseISO(invitation.start_date);
    const isPastEvent = isPast(eventDate);
    const canRespond = invitation.status === 'pending' && !isPastEvent;
    
    return (
      <div className={`ios-card overflow-hidden transition-all ${
        isPastEvent ? 'opacity-75' : ''
      }`}>
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-ios-gray-900 text-lg">
                {invitation.event_name}
              </h3>
              <div className="flex items-center mt-1 space-x-4">
                {getStatusBadge(invitation.status)}
                {isPastEvent && (
                  <span className="text-xs text-ios-gray-500">
                    Veranstaltung vorbei
                  </span>
                )}
              </div>
            </div>
            
            <button
              onClick={() => toggleCardExpansion(invitation.id)}
              className="p-2 rounded-lg hover:bg-ios-gray-100 transition-colors"
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-5 w-5 text-ios-gray-600" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-ios-gray-600" />
              )}
            </button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm text-ios-gray-600">
              <CalendarIcon className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>
                {format(eventDate, "EEEE, d. MMMM yyyy", { locale: de })}
              </span>
            </div>
            
            <div className="flex items-center text-sm text-ios-gray-600">
              <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>
                {format(eventDate, 'HH:mm')} - {format(parseISO(invitation.end_date), 'HH:mm')} Uhr
              </span>
            </div>
            
            <div className="flex items-center text-sm text-ios-gray-600">
              <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{invitation.location}</span>
            </div>
            
            {invitation.shift_count > 0 && (
              <div className="flex items-center text-sm text-ios-gray-600">
                <UserGroupIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{invitation.shift_count} Schichten verfügbar</span>
              </div>
            )}
          </div>
          
          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-ios-gray-200">
              {invitation.event_description && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-ios-gray-700 mb-1">
                    Beschreibung
                  </h4>
                  <p className="text-sm text-ios-gray-600">
                    {invitation.event_description}
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-ios-gray-500">
                  Eingeladen am: {format(parseISO(invitation.invited_at), 'dd.MM.yyyy HH:mm')}
                </div>
                
                {invitation.responded_at && (
                  <div className="text-xs text-ios-gray-500">
                    Beantwortet am: {format(parseISO(invitation.responded_at), 'dd.MM.yyyy HH:mm')}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          {canRespond && (
            <div className="mt-4 pt-4 border-t border-ios-gray-200 flex space-x-3">
              <button
                onClick={() => respondToInvitation(invitation.id, 'accepted')}
                disabled={isProcessing}
                className="flex-1 ios-button-primary disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="animate-pulse">Wird verarbeitet...</span>
                ) : (
                  <>
                    <CheckIcon className="h-5 w-5 mr-2 inline" />
                    Annehmen
                  </>
                )}
              </button>
              
              <button
                onClick={() => respondToInvitation(invitation.id, 'declined')}
                disabled={isProcessing}
                className="flex-1 ios-button-secondary text-ios-red hover:bg-red-50 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="animate-pulse">Wird verarbeitet...</span>
                ) : (
                  <>
                    <XMarkIcon className="h-5 w-5 mr-2 inline" />
                    Ablehnen
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-ios-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 h-48"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ios-gray-900">Event-Einladungen</h1>
        <p className="text-ios-gray-600">Verwalte deine Veranstaltungseinladungen</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="ios-card p-4 text-center border-l-4 border-yellow-400">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-sm text-ios-gray-600">Offen</p>
        </div>
        <div className="ios-card p-4 text-center border-l-4 border-green-400">
          <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
          <p className="text-sm text-ios-gray-600">Angenommen</p>
        </div>
        <div className="ios-card p-4 text-center border-l-4 border-red-400">
          <p className="text-2xl font-bold text-red-600">{stats.declined}</p>
          <p className="text-sm text-ios-gray-600">Abgelehnt</p>
        </div>
      </div>

      {/* Filter */}
      <div className="ios-card p-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-ios-gray-700">Filter:</span>
          <div className="flex rounded-lg overflow-hidden border border-ios-gray-300">
            {[
              { value: 'all', label: 'Alle' },
              { value: 'pending', label: 'Offen' },
              { value: 'accepted', label: 'Angenommen' },
              { value: 'declined', label: 'Abgelehnt' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
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

      {/* Invitations List */}
      {filteredInvitations.length > 0 ? (
        <div className="grid gap-4">
          {filteredInvitations.map(invitation => (
            <InvitationCard key={invitation.id} invitation={invitation} />
          ))}
        </div>
      ) : (
        <div className="ios-card p-12 text-center">
          <CalendarDaysIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-4" />
          <p className="text-ios-gray-500">Keine Einladungen gefunden</p>
          <p className="text-sm text-ios-gray-400 mt-2">
            {filter === 'pending' 
              ? 'Du hast momentan keine offenen Einladungen'
              : 'Keine Einladungen in dieser Kategorie'}
          </p>
        </div>
      )}

      {/* Info Box für offene Einladungen */}
      {filter === 'pending' && stats.pending > 0 && (
        <div className="ios-card p-4 bg-ios-blue/5 border border-ios-blue/20">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-ios-blue flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-ios-gray-900">
                Du hast {stats.pending} offene Einladung{stats.pending > 1 ? 'en' : ''}
              </p>
              <p className="text-ios-gray-600 mt-1">
                Bitte antworte rechtzeitig, damit die Einteilung geplant werden kann.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventInvitations;


