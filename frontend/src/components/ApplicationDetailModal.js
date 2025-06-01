
// frontend/src/components/ApplicationDetailModal.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ApplicationDetailModal = ({ application, isOpen, onClose, onUpdate }) => {
  const [qualifications, setQualifications] = useState([]);
  const [selectedQualifications, setSelectedQualifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchQualifications();
    }
  }, [isOpen]);

  const fetchQualifications = async () => {
    try {
      const response = await api.get('/qualifications');
      setQualifications(response.data);
    } catch (error) {
      console.error('Error fetching qualifications:', error);
    }
  };

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await api.post(`/applications/${application.id}/accept`, {
        qualifications: selectedQualifications
      });
      toast.success('Bewerbung erfolgreich angenommen!');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Fehler beim Annehmen der Bewerbung');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await api.post(`/applications/${application.id}/reject`, {
        notes: rejectNotes
      });
      toast.success('Bewerbung abgelehnt');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Fehler beim Ablehnen der Bewerbung');
    } finally {
      setIsLoading(false);
      setShowRejectDialog(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('de-DE');
  };

  if (!isOpen || !application) return null;

  const InfoRow = ({ label, value }) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{value || '-'}</dd>
    </div>
  );

  const CheckIcon = () => (
    <svg className="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );

  const XIcon = () => (
    <svg className="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  const CloseIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Bewerbungsdetails
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {/* Status Badge */}
            <div className="mb-6">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full
                ${application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                ${application.status === 'accepted' ? 'bg-green-100 text-green-800' : ''}
                ${application.status === 'rejected' ? 'bg-red-100 text-red-800' : ''}
              `}>
                {application.status === 'pending' && 'Offen'}
                {application.status === 'accepted' && 'Angenommen'}
                {application.status === 'rejected' && 'Abgelehnt'}
              </span>
            </div>

            {/* Profile Image & Basic Info */}
            <div className="flex items-start space-x-6 mb-6">
              {application.profile_image_url ? (
                <img
                  src={`http://localhost:3001${application.profile_image_url}`}
                  alt={`${application.first_name} ${application.last_name}`}
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-gray-200"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-gray-500">
                    {application.first_name?.[0]}{application.last_name?.[0]}
                  </span>
                </div>
              )}
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {application.first_name} {application.last_name}
                </h3>
                <p className="text-sm text-gray-600">{application.email}</p>
                <p className="text-sm text-gray-500">
                  Beworben am {formatDate(application.created_at)}
                </p>
              </div>
            </div>

            {/* Detailed Information */}
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                  Persönliche Daten
                </h4>
                <div className="divide-y divide-gray-200">
                  <InfoRow 
                    label="Geburtsdatum" 
                    value={formatDate(application.birth_date)} 
                  />
                  <InfoRow label="Telefon" value={application.phone} />
                  <InfoRow label="T-Shirt Größe" value={application.tshirt_size} />
                </div>
              </div>

              {/* Address */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                  Adresse
                </h4>
                <div className="divide-y divide-gray-200">
                  <InfoRow 
                    label="Straße" 
                    value={`${application.street} ${application.house_number}`} 
                  />
                  <InfoRow 
                    label="PLZ / Stadt" 
                    value={`${application.postal_code} ${application.city}`} 
                  />
                </div>
              </div>

              {/* Qualifications (only for pending applications) */}
              {application.status === 'pending' && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                    Qualifikationen zuweisen
                  </h4>
                  <div className="space-y-2">
                    {qualifications.map((qual) => (
                      <label
                        key={qual.id}
                        className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
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
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-3 flex-1">
                          <span className="text-sm font-medium text-gray-900">{qual.name}</span>
                          {qual.description && (
                            <span className="text-sm text-gray-500 block">{qual.description}</span>
                          )}
                        </span>
                        <span
                          className="ml-2 h-3 w-3 rounded-full"
                          style={{ backgroundColor: qual.color }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Review Info */}
              {application.status !== 'pending' && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                    Bearbeitungsinformationen
                  </h4>
                  <div className="divide-y divide-gray-200">
                    <InfoRow label="Bearbeitet von" value={application.reviewer_name} />
                    <InfoRow 
                      label="Bearbeitet am" 
                      value={formatDateTime(application.reviewed_at)} 
                    />
                    {application.notes && (
                      <InfoRow label="Notizen" value={application.notes} />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          {application.status === 'pending' && (
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowRejectDialog(true)}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XIcon />
                Ablehnen
              </button>
              <button
                onClick={handleAccept}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckIcon />
                Annehmen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowRejectDialog(false)} />
          
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Bewerbung ablehnen
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                Möchten Sie diese Bewerbung wirklich ablehnen?
              </p>
              
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Optionale Notizen zur Ablehnung..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowRejectDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleReject}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50"
                >
                  Ablehnen
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ApplicationDetailModal;
