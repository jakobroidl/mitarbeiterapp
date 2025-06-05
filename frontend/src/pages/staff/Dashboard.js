// frontend/src/pages/staff/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  CalendarIcon,
  ClockIcon,
  EnvelopeIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, isToday, isTomorrow, parseISO, differenceInHours } from 'date-fns';
import { de } from 'date-fns/locale';

<Link to="/staff/shifts/available" className="...">
  <CalendarDaysIcon className="h-5 w-5 mr-2" />
  Verfügbare Schichten
</Link>


const StaffDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    upcomingShifts: 0,
    pendingInvitations: 0,
    unreadMessages: 0,
    hoursThisMonth: 0,
    lastClockIn: null
  });
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Lade alle Daten parallel
      const [
        statsRes,
        shiftsRes,
        invitationsRes,
        messagesRes,
        timeclockRes
      ] = await Promise.all([
        api.get('/staff/dashboard/stats'),
        api.get('/staff/shifts/upcoming?limit=5'),
        api.get('/staff/invitations?status=pending&limit=5'),
        api.get('/staff/messages/unread?limit=5'),
        api.get('/staff/timeclock/current')
      ]);

      setStats(statsRes.data);
      setUpcomingShifts(shiftsRes.data.shifts);
      setPendingInvitations(invitationsRes.data.invitations);
      setRecentMessages(messagesRes.data.messages);
      setCurrentShift(timeclockRes.data.entry);
      
    } catch (error) {
      console.error('Fehler beim Laden der Dashboard-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatShiftTime = (start, end) => {
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    
    if (format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
      return `${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')} Uhr`;
    } else {
      return `${format(startDate, 'dd.MM. HH:mm')} - ${format(endDate, 'dd.MM. HH:mm')}`;
    }
  };

  const getShiftStatus = (shift) => {
    const now = new Date();
    const start = parseISO(shift.start_time);
    const hoursUntilStart = differenceInHours(start, now);
    
    if (hoursUntilStart < 0) {
      return { text: 'Läuft', color: 'bg-ios-green text-white' };
    } else if (hoursUntilStart < 24) {
      return { text: `In ${hoursUntilStart}h`, color: 'bg-ios-orange text-white' };
    } else if (isToday(start)) {
      return { text: 'Heute', color: 'bg-ios-blue text-white' };
    } else if (isTomorrow(start)) {
      return { text: 'Morgen', color: 'bg-ios-purple text-white' };
    } else {
      return { text: format(start, 'dd.MM.'), color: 'bg-ios-gray-100 text-ios-gray-700' };
    }
  };

  const InfoCard = ({ title, value, icon: Icon, color, link, description }) => (
    <Link to={link} className="ios-card p-6 hover:shadow-ios-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-ios-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-ios-gray-900">{value}</p>
          {description && (
            <p className="mt-1 text-sm text-ios-gray-500">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </Link>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-ios-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ios-gray-900">
            Hallo {user.firstName}!
          </h1>
          <p className="text-ios-gray-600">
            {format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}
          </p>
        </div>
        
        {/* Personal Code Badge */}
        <div className="ios-card px-4 py-2">
          <p className="text-xs text-ios-gray-500">Dein Code</p>
          <p className="text-lg font-bold text-ios-gray-900">{user.personalCode}</p>
        </div>
      </div>

      {/* Current Shift Alert */}
      {currentShift && (
        <div className="ios-card p-4 bg-ios-green/10 border border-ios-green/20">
          <div className="flex items-center space-x-3">
            <ClockIcon className="h-6 w-6 text-ios-green flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-ios-gray-900">
                Du bist seit {format(parseISO(currentShift.clock_in), 'HH:mm')} Uhr eingestempelt
              </p>
              <p className="text-xs text-ios-gray-600 mt-0.5">
                Position: {currentShift.position_name} • {currentShift.event_name || 'Allgemein'}
              </p>
            </div>
            <Link 
              to="/staff/timeclock" 
              className="ios-button-secondary text-sm px-4 py-2"
            >
              Zur Stempeluhr
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <InfoCard
          title="Anstehende Schichten"
          value={stats.upcomingShifts}
          description="in den nächsten 30 Tagen"
          icon={CalendarIcon}
          color="ios-blue"
          link="/staff/shifts"
        />
        <InfoCard
          title="Offene Einladungen"
          value={stats.pendingInvitations}
          description="warten auf Antwort"
          icon={BellIcon}
          color="ios-orange"
          link="/staff/invitations"
        />
        <InfoCard
          title="Ungelesene Nachrichten"
          value={stats.unreadMessages}
          description="neue Nachrichten"
          icon={EnvelopeIcon}
          color="ios-red"
          link="/staff/messages"
        />
        <InfoCard
          title="Stunden diesen Monat"
          value={`${stats.hoursThisMonth}h`}
          description={format(new Date(), 'MMMM yyyy', { locale: de })}
          icon={ClockIcon}
          color="ios-green"
          link="/staff/timeclock"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Shifts */}
        <div className="ios-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-ios-gray-900">Nächste Schichten</h2>
            <Link to="/staff/shifts" className="text-sm text-ios-blue hover:text-blue-600">
              Alle anzeigen
              <ArrowRightIcon className="inline h-4 w-4 ml-1" />
            </Link>
          </div>
          
          {upcomingShifts.length > 0 ? (
            <div className="space-y-3">
              {upcomingShifts.map((shift) => {
                const status = getShiftStatus(shift);
                return (
                  <Link
                    key={shift.id}
                    to="/staff/shifts"
                    className="block p-4 rounded-xl border border-ios-gray-200 hover:border-ios-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-ios-gray-900">{shift.event_name}</p>
                        <p className="text-sm text-ios-gray-600 mt-1">
                          {shift.shift_name} • {shift.position_name}
                        </p>
                        <p className="text-xs text-ios-gray-500 mt-2">
                          <ClockIcon className="inline h-3 w-3 mr-1" />
                          {formatShiftTime(shift.start_time, shift.end_time)}
                        </p>
                        <p className="text-xs text-ios-gray-500 mt-1">
                          <MapPinIcon className="inline h-3 w-3 mr-1" />
                          {shift.location}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-ios-gray-300 mx-auto mb-3" />
              <p className="text-sm text-ios-gray-500">Keine anstehenden Schichten</p>
            </div>
          )}
        </div>

        {/* Pending Invitations & Messages */}
        <div className="space-y-6">
          {/* Pending Invitations */}
          <div className="ios-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ios-gray-900">Offene Einladungen</h2>
              <Link to="/staff/invitations" className="text-sm text-ios-blue hover:text-blue-600">
                Alle anzeigen
                <ArrowRightIcon className="inline h-4 w-4 ml-1" />
              </Link>
            </div>
            
            {pendingInvitations.length > 0 ? (
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="p-3 rounded-xl bg-ios-orange/10 border border-ios-orange/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-ios-gray-900">
                          {invitation.event_name}
                        </p>
                        <p className="text-xs text-ios-gray-600 mt-1">
                          {format(parseISO(invitation.event_date), 'dd.MM.yyyy')} • {invitation.location}
                        </p>
                      </div>
                      <ExclamationTriangleIcon className="h-5 w-5 text-ios-orange flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ios-gray-500 text-center py-4">
                Keine offenen Einladungen
              </p>
            )}
          </div>

          {/* Recent Messages */}
          <div className="ios-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ios-gray-900">Neue Nachrichten</h2>
              <Link to="/staff/messages" className="text-sm text-ios-blue hover:text-blue-600">
                Alle anzeigen
                <ArrowRightIcon className="inline h-4 w-4 ml-1" />
              </Link>
            </div>
            
            {recentMessages.length > 0 ? (
              <div className="space-y-3">
                {recentMessages.map((message) => (
                  <Link
                    key={message.id}
                    to={`/staff/messages/${message.id}`}
                    className="block p-3 rounded-xl hover:bg-ios-gray-50 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-ios-red/10 rounded-lg flex-shrink-0">
                        <EnvelopeIcon className="h-4 w-4 text-ios-red" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ios-gray-900 truncate">
                          {message.subject}
                        </p>
                        <p className="text-xs text-ios-gray-500 mt-0.5">
                          von {message.sender_name} • {format(parseISO(message.created_at), 'dd.MM. HH:mm')}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ios-gray-500 text-center py-4">
                Keine neuen Nachrichten
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="ios-card p-6">
        <h2 className="text-lg font-semibold text-ios-gray-900 mb-4">Schnellzugriff</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/staff/timeclock"
            className="flex flex-col items-center p-4 rounded-xl bg-ios-gray-50 hover:bg-ios-gray-100 transition-colors"
          >
            <ClockIcon className="h-8 w-8 text-ios-blue mb-2" />
            <span className="text-sm text-ios-gray-700">Stempeluhr</span>
          </Link>
          <Link
            to="/staff/schedule"
            className="flex flex-col items-center p-4 rounded-xl bg-ios-gray-50 hover:bg-ios-gray-100 transition-colors"
          >
            <CalendarIcon className="h-8 w-8 text-ios-purple mb-2" />
            <span className="text-sm text-ios-gray-700">Kalender</span>
          </Link>
          <Link
            to="/staff/profile"
            className="flex flex-col items-center p-4 rounded-xl bg-ios-gray-50 hover:bg-ios-gray-100 transition-colors"
          >
            <DocumentTextIcon className="h-8 w-8 text-ios-green mb-2" />
            <span className="text-sm text-ios-gray-700">Mein Profil</span>
          </Link>
          <Link
            to="/staff/messages"
            className="flex flex-col items-center p-4 rounded-xl bg-ios-gray-50 hover:bg-ios-gray-100 transition-colors"
          >
            <EnvelopeIcon className="h-8 w-8 text-ios-red mb-2" />
            <span className="text-sm text-ios-gray-700">Nachrichten</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;


