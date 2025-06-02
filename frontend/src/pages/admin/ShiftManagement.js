// frontend/src/pages/admin/ShiftManagement.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const ShiftManagement = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchEventAndShifts();
  }, [eventId]);

  const fetchEventAndShifts = async () => {
    try {
      setLoading(true);
      
      // Fetch event details
      const eventResponse = await api.get(`/events/${eventId}`);
      setEvent(eventResponse.data);
      
      // Fetch shifts with registrations
      const shiftsResponse = await api.get(`/events/${eventId}/shifts`);
      setShifts(shiftsResponse.data.shifts || []);
    } catch (error) {
      toast.error('Fehler beim Laden der Daten');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  // Icons
  const ClockIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const UsersIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  const PlusIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );

  const ChevronLeftIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-2 text-gray-600">Lade Schichten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/events/${eventId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeftIcon />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Schichtverwaltung
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {event?.name} • {event?.location}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedShift(null);
              setShowShiftModal(true);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center space-x-2"
          >
            <PlusIcon />
            <span>Neue Schicht</span>
          </button>
        </div>
      </div>

      {/* Event Info Bar */}
      <div className="bg-blue-50 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm">
              <ClockIcon />
              <span className="text-gray-700">
                {format(new Date(event?.start_date), 'dd.MM.yyyy HH:mm', { locale: de })} - 
                {format(new Date(event?.end_date), 'dd.MM.yyyy HH:mm', { locale: de })}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <UsersIcon />
              <span className="text-gray-700">
                {event?.accepted_count || 0} Mitarbeiter zugesagt
              </span>
            </div>
          </div>
        </div>
      </div>


{shifts.length > 0 && (
  <div className="space-y-4">
    {shifts.map((shift) => (
      <div key={shift.id} className="border rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold">{shift.name}</h3>
            <p className="text-sm text-gray-600">
              {format(new Date(shift.start_time), 'HH:mm')} - 
              {format(new Date(shift.end_time), 'HH:mm')} Uhr
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {shift.confirmed_count || 0} / {shift.required_staff} bestätigt
            </p>
            <p className="text-xs text-gray-500">
              {shift.interested_count || 0} interessiert
            </p>
          </div>
        </div>
        
        <div className="mt-3 flex justify-end space-x-2">
          <button
            onClick={() => handleAssignStaff(shift)}
            className="text-sm px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
          >
            Mitarbeiter zuteilen
          </button>
          <button
            onClick={() => handleEditShift(shift)}
            className="text-sm px-3 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
          >
            Bearbeiten
          </button>
        </div>
      </div>
    ))}
  </div>
)}


export default ShiftManagement;