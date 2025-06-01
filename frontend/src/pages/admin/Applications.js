import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  TrashIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [qualifications, setQualifications] = useState([]);
  const [selectedQualifications, setSelectedQualifications] = useState([]);
  const [rejectNotes, setRejectNotes] = useState('');

  useEffect(() => {
    fetchApplications();
    fetchQualifications();
  }, [searchTerm, statusFilter]);

  const fetchApplications = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 20,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
      };

      const response = await api.get('/applications', { params });
      setApplications(response.data.applications);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Fehler beim Laden der Bewerbungen');
    } finally {
      setLoading(false);
    }
  };

  const fetchQualifications = async () => {
    try {
      const response = await api.get('/qualifications');
      setQualifications(response.data);
    } catch (error) {
      console.error('Error fetching qualifications:', error);
    }
  };

  const handleViewDetails = async (application) => {
    setSelectedApplication(application);
    setShowDetailModal(true);
  };

  const handleAcceptClick = (application) => {
    setSelectedApplication(application);
    setSelectedQualifications([]);
    setShowAcceptModal(true);
  };

  const handleRejectClick = (application) => {
    setSelectedApplication(application);
    setRejectNotes('');
    setShowRejectModal(true);
  };

  const handleAccept = async () => {
    try {
      await api.post(`/applications/${selectedApplication.id}/accept`, {
        qualifications: selectedQualifications,
      });
      toast.success('Bewerbung erfolgreich angenommen');
      setShowAcceptModal(false);
      fetchApplications();
    } catch (error) {
      console.error('Error accepting application:', error);
      toast.error('Fehler beim Annehmen der Bewerbung');
    }
  };

  const handleReject = async () => {
    try {
      await api.post(`/applications/${selectedApplication.id}/reject`, {
        notes: rejectNotes,
      });
      toast.success('Bewerbung abgelehnt');
      setShowRejectModal(false);
      fetchApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Fehler beim Ablehnen der Bewerbung');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Möchten Sie diese Bewerbung wirklich löschen?')) {
      return;
    }

    try {
      await api.delete(`/applications/${id}`);
      toast.success('Bewerbung gelöscht');
      fetchApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error('Fehler beim Löschen der Bewerbung');
    }
  };

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      pending: { color: 'bg-ios-orange text-white', text: 'Offen' },
      accepted: { color: 'bg-ios-green text-white', text: 'Angenommen' },
      rejected: { color: 'bg-ios-red text-white', text: 'Abgelehnt' },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`ios-badge ${config.color}`}>
        {config.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ios-gray-900">Bewerbungen</h1>
        <p className="mt-1 text-sm text-ios-gray-600">
          Verwalten Sie eingehende Bewerbungen
        </p>
      </div>

      {/* Filters */}
      <div className="ios-card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ios-gray-400" />
              <input
                type="text"
                placeholder="Suche nach Name oder E-Mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ios-input pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-ios-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="ios-input"
            >
              <option value="">Alle Status</option>
              <option value="pending">Offen</option>
              <option value="accepted">Angenommen</option>
              <option value="rejected">Abgelehnt</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-ios-blue border-t-transparent rounded-full mx-auto" />
            <p className="mt-2 text-ios-gray-600">Wird geladen...</p>
          </div>
        </div>
      ) : applications.length === 0 ? (
        <div className="ios-card p-8 text-center">
          <p className="text-ios-gray-600">Keine Bewerbungen gefunden</p>
        </div>
      ) : (
        <div className="ios-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ios-gray-100 border-b border-ios-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-600 uppercase tracking-wider">
                    Bewerber
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-600 uppercase tracking-wider">
                    Kontakt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-600 uppercase tracking-wider">
                    Eingereicht
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-ios-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-ios-gray-600 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-ios-gray-200">
                {applications.map((application) => (
                  <tr key={application.id} className="hover:bg-ios-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {application.profile_image_url ? (
                          <img
                            src={`${process.env.REACT_APP_API_URL.replace('/api', '')}${application.profile_image_url}`}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-ios-gray-300 flex items-center justify-center">
                            <UserCircleIcon className="h-6 w-6 text-ios-gray-600" />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-ios-gray-900">
                            {application.first_name} {application.last_name}
                          </div>
                          <div className="text-sm text-ios-gray-500">
                            {format(new Date(application.birth_date), 'dd.MM.yyyy')} ({
                              new Date().getFullYear() - new Date(application.birth_date).getFullYear()
                            } Jahre)
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-ios-gray-900">{application.email}</div>
                      <div className="text-sm text-ios-gray-500">{application.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ios-gray-600">
                      {format(new Date(application.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={application.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(application)}
                          className="text-ios-blue hover:text-blue-600"
                          title="Details anzeigen"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        {application.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAcceptClick(application)}
                              className="text-ios-green hover:text-green-600"
                              title="Annehmen"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleRejectClick(application)}
                              className="text-ios-red hover:text-red-600"
                              title="Ablehnen"
                            >
                              <XCircleIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        {application.status !== 'accepted' && (
                          <button
                            onClick={() => handleDelete(application.id)}
                            className="text-ios-gray-600 hover:text-ios-gray-900"
                            title="Löschen"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-ios-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ios-gray-600">
                  Seite {pagination.page} von {pagination.pages} ({pagination.total} Einträge)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchApplications(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="ios-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Zurück
                  </button>
                  <button
                    onClick={() => fetchApplications(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="ios-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Weiter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="ios-modal-backdrop" onClick={() => setShowDetailModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-ios-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-ios-gray-200 px-6 py-4">
                <h3 className="text-lg font-semibold text-ios-gray-900">
                  Bewerbungsdetails
                </h3>
              </div>
              <div className="p-6 space-y-6">
                {/* Profile Image */}
                <div className="flex items-center justify-center">
                  {selectedApplication.profile_image_url ? (
                    <img
                      src={`${process.env.REACT_APP_API_URL.replace('/api', '')}${selectedApplication.profile_image_url}`}
                      alt=""
                      className="h-32 w-32 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-full bg-ios-gray-300 flex items-center justify-center">
                      <UserCircleIcon className="h-16 w-16 text-ios-gray-600" />
                    </div>
                  )}
                </div>

                {/* Personal Information */}
                <div>
                  <h4 className="text-sm font-medium text-ios-gray-900 mb-3">
                    Persönliche Daten
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-ios-gray-600">Name</p>
                      <p className="font-medium">
                        {selectedApplication.first_name} {selectedApplication.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-ios-gray-600">Geburtsdatum</p>
                      <p className="font-medium">
                        {format(new Date(selectedApplication.birth_date), 'dd.MM.yyyy')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h4 className="text-sm font-medium text-ios-gray-900 mb-3">
                    Kontaktdaten
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-5 w-5 text-ios-gray-400 mr-2" />
                      <span>{selectedApplication.email}</span>
                    </div>
                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-ios-gray-400 mr-2" />
                      <span>{selectedApplication.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPinIcon className="h-5 w-5 text-ios-gray-400 mr-2" />
                      <span>
                        {selectedApplication.street} {selectedApplication.house_number},
                        {' '}{selectedApplication.postal_code} {selectedApplication.city}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h4 className="text-sm font-medium text-ios-gray-900 mb-3">
                    Weitere Informationen
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-ios-gray-600">T-Shirt Größe</p>
                      <p className="font-medium">{selectedApplication.tshirt_size}</p>
                    </div>
                    <div>
                      <p className="text-sm text-ios-gray-600">Status</p>
                      <StatusBadge status={selectedApplication.status} />
                    </div>
                  </div>
                </div>

                {/* Review Information */}
                {selectedApplication.reviewed_at && (
                  <div>
                    <h4 className="text-sm font-medium text-ios-gray-900 mb-3">
                      Bearbeitung
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-ios-gray-600">Bearbeitet von</p>
                        <p className="font-medium">{selectedApplication.reviewer_name || selectedApplication.reviewer_email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-ios-gray-600">Bearbeitet am</p>
                        <p className="font-medium">
                          {format(new Date(selectedApplication.reviewed_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </p>
                      </div>
                      {selectedApplication.notes && (
                        <div>
                          <p className="text-sm text-ios-gray-600">Notizen</p>
                          <p className="font-medium">{selectedApplication.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 bg-white border-t border-ios-gray-200 px-6 py-4">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full ios-button-secondary"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accept Modal */}
      {showAcceptModal && selectedApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="ios-modal-backdrop" onClick={() => setShowAcceptModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-ios-lg max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-ios-gray-900 mb-4">
                  Bewerbung annehmen
                </h3>
                <p className="text-sm text-ios-gray-600 mb-6">
                  Möchten Sie die Bewerbung von {selectedApplication.first_name} {selectedApplication.last_name} annehmen?
                </p>

                {/* Qualifications */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Qualifikationen zuweisen (optional)
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {qualifications.map((qual) => (
                      <label key={qual.id} className="flex items-center">
                        <input
                          type="checkbox"
                          value={qual.id}
                          checked={selectedQualifications.includes(qual.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedQualifications([...selectedQualifications, qual.id]);
                            } else {
                              setSelectedQualifications(selectedQualifications.filter(id => id !== qual.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-ios-gray-300 text-ios-blue focus:ring-ios-blue"
                        />
                        <span className="ml-2 text-sm text-ios-gray-700">{qual.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAcceptModal(false)}
                    className="flex-1 ios-button-secondary"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleAccept}
                    className="flex-1 ios-button-primary"
                  >
                    Annehmen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="ios-modal-backdrop" onClick={() => setShowRejectModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-ios-lg max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-ios-gray-900 mb-4">
                  Bewerbung ablehnen
                </h3>
                <p className="text-sm text-ios-gray-600 mb-6">
                  Möchten Sie die Bewerbung von {selectedApplication.first_name} {selectedApplication.last_name} ablehnen?
                </p>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Notizen (optional)
                  </label>
                  <textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    rows={3}
                    className="ios-input"
                    placeholder="Grund für die Ablehnung..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="flex-1 ios-button-secondary"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex-1 bg-ios-red text-white px-6 py-3 rounded-xl font-semibold text-center transition-all duration-200 active:scale-95 hover:bg-red-600"
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Applications;
