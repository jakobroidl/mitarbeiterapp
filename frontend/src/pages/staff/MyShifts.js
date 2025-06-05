import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Info,
  ShieldAlert,
  GraduationCap,
  ChevronRight,
  Filter,
  RefreshCw,
  X,
  FileText,
  Eye
} from 'lucide-react';

const MyShiftsEnhanced = () => {
  const [shifts, setShifts] = useState([
    {
      id: 1,
      shift_name: "Frühdienst Bar",
      event_name: "Sommerfest 2024",
      location: "Stadtpark München",
      start_time: "2024-06-20T08:00:00",
      end_time: "2024-06-20T16:00:00",
      position_name: "Bar",
      status: "final",
      confirmed_at: null,
      required_qualifications: "Barkeeper, Kassierer",
      my_qualifications: ["Barkeeper", "Kassierer", "Security"],
      qualification_match: { has: 2, required: 2, fully_qualified: true }
    },
    {
      id: 2,
      shift_name: "Spätdienst Einlass",
      event_name: "Stadtfest 2024",
      location: "Marktplatz",
      start_time: "2024-06-25T16:00:00",
      end_time: "2024-06-26T00:00:00",
      position_name: "Einlass",
      status: "confirmed",
      confirmed_at: "2024-06-15T14:30:00",
      required_qualifications: "Security, Einlass",
      my_qualifications: ["Security"],
      qualification_match: { has: 1, required: 2, fully_qualified: false }
    },
    {
      id: 3,
      shift_name: "Ganztagesschicht",
      event_name: "Musikfestival",
      location: "Olympiapark",
      start_time: "2024-07-01T10:00:00",
      end_time: "2024-07-01T22:00:00",
      position_name: "Kasse",
      status: "preliminary",
      confirmed_at: null,
      required_qualifications: "Kassierer",
      my_qualifications: ["Kassierer"],
      qualification_match: { has: 1, required: 1, fully_qualified: true }
    }
  ]);

  const [availableShifts, setAvailableShifts] = useState([
    {
      id: 4,
      shift_name: "Frühdienst Security",
      event_name: "Open Air Festival",
      location: "Theresienwiese",
      start_time: "2024-07-10T06:00:00",
      end_time: "2024-07-10T14:00:00",
      position_name: "Security",
      required_qualifications: "Security",
      qualification_match: { has: 1, required: 1, fully_qualified: true },
      has_conflicts: false,
      can_apply: true
    },
    {
      id: 5,
      shift_name: "Nachtdienst Bar",
      event_name: "Club Night",
      location: "Downtown Club",
      start_time: "2024-07-15T22:00:00",
      end_time: "2024-07-16T06:00:00",
      position_name: "Bar",
      required_qualifications: "Barkeeper, Kassierer",
      qualification_match: { has: 2, required: 2, fully_qualified: true },
      has_conflicts: false,
      can_apply: true
    },
    {
      id: 6,
      shift_name: "VIP Service",
      event_name: "Gala Dinner",
      location: "Hotel Bayerischer Hof",
      start_time: "2024-07-20T18:00:00",
      end_time: "2024-07-21T02:00:00",
      position_name: "Service",
      required_qualifications: "Service, Barkeeper",
      qualification_match: { has: 1, required: 2, fully_qualified: false },
      has_conflicts: false,
      can_apply: true
    }
  ]);

  const [activeTab, setActiveTab] = useState('my-shifts');
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedShift, setSelectedShift] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    total: 3,
    preliminary: 1,
    final: 1,
    confirmed: 1
  });

  const getStatusBadge = (status) => {
    const badges = {
      preliminary: {
        text: 'Vorläufig',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: AlertTriangle
      },
      final: {
        text: 'Endgültig',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Info
      },
      confirmed: {
        text: 'Bestätigt',
        className: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle
      }
    };

    const badge = badges[status] || badges.preliminary;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${badge.className}`}>
        <Icon className="h-3.5 w-3.5" />
        {badge.text}
      </span>
    );
  };

  const getQualificationBadge = (match) => {
    if (!match) return null;
    
    const color = match.fully_qualified 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-orange-100 text-orange-800 border-orange-200';
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${color}`}>
        <GraduationCap className="h-3 w-3" />
        {match.has}/{match.required} Qualifikationen
      </span>
    );
  };

  const confirmShift = (shiftId) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (shift && shift.status === 'final') {
      setShifts(shifts.map(s => 
        s.id === shiftId 
          ? { ...s, status: 'confirmed', confirmed_at: new Date().toISOString() }
          : s
      ));
      setStats(prev => ({
        ...prev,
        final: prev.final - 1,
        confirmed: prev.confirmed + 1
      }));
    }
  };

  const MyShiftsTab = () => {
    const filteredShifts = shifts.filter(shift => {
      if (statusFilter !== 'all' && shift.status !== statusFilter) return false;
      return true;
    });

    return (
      <div className="space-y-4">
        {/* Filter */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-2 mb-3">
            <Filter className="h-5 w-5 text-gray-600" />
            <span className="font-medium">Filter</span>
          </div>
          <div className="flex gap-2">
            {['all', 'preliminary', 'final', 'confirmed'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded text-sm ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Alle' : 
                 status === 'preliminary' ? 'Vorläufig' :
                 status === 'final' ? 'Endgültig' : 'Bestätigt'}
              </button>
            ))}
          </div>
        </div>

        {/* Shifts List */}
        {filteredShifts.map(shift => {
          const needsConfirmation = shift.status === 'final';

          return (
            <div key={shift.id} className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{shift.event_name}</h3>
                  <p className="text-sm text-gray-600">{shift.shift_name}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(shift.status)}
                  {getQualificationBadge(shift.qualification_match)}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>20.06.2024</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>08:00 - 16:00 Uhr</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{shift.location}</span>
                </div>
                {shift.position_name && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium mr-2">Position:</span>
                    <span>{shift.position_name}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                {needsConfirmation ? (
                  <button
                    onClick={() => confirmShift(shift.id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
                  >
                    Schicht bestätigen
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedShift(shift);
                      setShowDetailsModal(true);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                  >
                    Details anzeigen
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                )}

                {shift.confirmed_at && (
                  <span className="text-xs text-green-600 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Bestätigt am 15.06.24
                  </span>
                )}
              </div>

              {/* Warning if not fully qualified */}
              {!shift.qualification_match.fully_qualified && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
                  <p className="text-xs text-orange-800 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Du erfüllst nicht alle Qualifikationsanforderungen für diese Schicht
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const AvailableShiftsTab = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <Info className="inline h-4 w-4 mr-1" />
          Hier siehst du alle Schichten, für die du dich bewerben kannst. Schichten mit fehlenden Qualifikationen werden trotzdem angezeigt.
        </p>
      </div>

      {availableShifts.map(shift => (
        <div key={shift.id} className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">{shift.event_name}</h3>
              <p className="text-sm text-gray-600">{shift.shift_name}</p>
            </div>
            {getQualificationBadge(shift.qualification_match)}
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              <span>10.07.2024</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-2" />
              <span>06:00 - 14:00 Uhr</span>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              <span>{shift.location}</span>
            </div>
            {shift.required_qualifications && (
              <div className="flex items-center text-sm text-gray-600">
                <GraduationCap className="h-4 w-4 mr-2" />
                <span>Benötigt: {shift.required_qualifications}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <button
              disabled={shift.has_conflicts || !shift.can_apply}
              className={`px-4 py-2 rounded text-sm font-medium ${
                shift.has_conflicts || !shift.can_apply
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : shift.qualification_match.fully_qualified
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {shift.has_conflicts ? 'Zeitkonflikt' : 
               !shift.can_apply ? 'Nicht verfügbar' :
               'Bewerben'}
            </button>

            {!shift.qualification_match.fully_qualified && shift.can_apply && (
              <span className="text-xs text-orange-600">
                Teilweise qualifiziert
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Meine Schichten</h1>
          <p className="text-gray-600">Verwalte deine Schichteinteilungen und Bewerbungen</p>
        </div>
        <button className="p-2 bg-white rounded-lg shadow-sm border hover:bg-gray-50">
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-gray-600">Gesamt</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border text-center border-l-4 border-yellow-400">
          <p className="text-2xl font-bold text-yellow-600">{stats.preliminary}</p>
          <p className="text-sm text-gray-600">Vorläufig</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border text-center border-l-4 border-blue-400">
          <p className="text-2xl font-bold text-blue-600">{stats.final}</p>
          <p className="text-sm text-gray-600">Endgültig</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border text-center border-l-4 border-green-400">
          <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
          <p className="text-sm text-gray-600">Bestätigt</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('my-shifts')}
          className={`flex-1 py-2 px-4 rounded ${
            activeTab === 'my-shifts' ? 'bg-white shadow-sm' : 'text-gray-600'
          }`}
        >
          Meine Schichten ({shifts.length})
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-2 px-4 rounded ${
            activeTab === 'available' ? 'bg-white shadow-sm' : 'text-gray-600'
          }`}
        >
          Verfügbare Schichten ({availableShifts.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'my-shifts' ? <MyShiftsTab /> : <AvailableShiftsTab />}

      {/* Details Modal */}
      {showDetailsModal && selectedShift && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-black bg-opacity-40" onClick={() => setShowDetailsModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Schichtdetails</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Veranstaltung</p>
                  <p className="font-medium">{selectedShift.event_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Schicht</p>
                  <p className="font-medium">{selectedShift.shift_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Zeit</p>
                  <p className="font-medium">20.06.2024 08:00 - 16:00 Uhr</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ort</p>
                  <p className="font-medium">{selectedShift.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Position</p>
                  <p className="font-medium">{selectedShift.position_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedShift.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Qualifikationen</p>
                  <div className="mt-1">{getQualificationBadge(selectedShift.qualification_match)}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Benötigt: {selectedShift.required_qualifications}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
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

export default MyShiftsEnhanced;


