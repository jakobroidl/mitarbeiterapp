// frontend/src/pages/admin/ApplicationDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  ArrowLeftIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  SparklesIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [qualifications, setQualifications] = useState([]);
  const [selectedQualifications, setSelectedQualifications] = useState([]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadApplication();
    loadQualifications();
  }, [id]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/applications/${id}`);
      setApplication(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Bewerbung:', error);
      toast.error('Bewerbung konnte nicht geladen werden');
      navigate('/admin/applications');
    } finally {
      setLoading(false);
    }
  };

  const loadQualifications = async () => {
    try {
      const response = await api.get('/settings/qualifications');
      setQualifications(response.data.qualifications.filter(q => q.is_active));
    } catch (error) {
      console.error('Fehler beim Laden der Qualifikationen:', error);
    }
  };

  const handleAccept = async () => {
    if (!window.confirm('Möchten Sie diese Bewerbung wirklich annehmen?')) return;

    setProcessing(true);
    try {
      await api.post(`/applications/${id}/accept`, {
        qualifications: selectedQualifications
      });
      
      toast.success('Bewerbung erfolgreich angenommen! Der Bewerber erhält eine E-Mail.');
      navigate('/admin/applications');
    } catch (error) {
      console.error('Fehler beim Annehmen der Bewerbung:', error);
      toast.error('Fehler beim Annehmen der Bewerbung');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      await api.post(`/applications/${id}/reject`, {
        reason: rejectReason
      });
      
      toast.success('Bewerbung abgelehnt. Der Bewerber erhält eine E-Mail.');
      navigate('/admin/applications');
    } catch (error) {
      console.error('Fehler beim Ablehnen der Bewerbung:', error);
      toast.error('Fehler beim Ablehnen der Bewerbung');
    } finally {
      setProcessing(false);
      setShowRejectDialog(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Möchten Sie diese Bewerbung wirklich löschen? Dies kann nicht rückgängig gemacht werden.')) return;

    setProcessing(true);
    try {
      await api.delete(`/applications/${id}`);
      toast.success('Bewerbung gelöscht');
      navigate('/admin/applications');
    } catch (error) {
      console.error('Fehler beim Löschen der Bewerbung:', error);
      toast.error('Fehler beim Löschen der Bewerbung');
    } finally {
      setProcessing(false);
    }
  };

  const toggleQualification = (qualId) => {
    setSelectedQualifications(prev => 
      prev.includes(qualId)
        ? prev.filter(id => id !== qualId)
        : [...prev, qualId]
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-ios-gray-200 rounded w-1/4 mb-6"></div>
          <div className="ios-card p-6 space-y-4">
            <div className="h-32 bg-ios-gray-200 rounded"></div>
            <div className="h-20 bg-ios-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!application) return null;

  const getStatusBadge = () => {
    switch (application.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-ios-orange/10 text-ios-orange">
            <ClockIcon className="w-4 h-4 mr-1.5" />
            Offen
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-ios-green/10 text-ios-green">
            <CheckCircleIcon className="w-4 h-4 mr-1.5" />
            Angenommen
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-ios-red/10 text-ios-red">
            <XCircleIcon className="w-4 h-4 mr-1.5" />
            Abgelehnt
          </span>
        );
      default:
        return null;
    }
  };

  const age = new Date().getFullYear() - new Date(application.birth_date).getFullYear();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/applications')}
            className="p-2 rounded-lg hover:bg-ios-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-ios-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-ios-gray-900">Bewerbungsdetails</h1>
            <p className="text-ios-gray-600">
              Eingegangen am {format(parseISO(application.created_at), 'dd. MMMM yyyy HH:mm', { locale: de })} Uhr
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Applicant Info */}
      <div className="ios-card p-6 mb-6">
        <div className="flex items-start space-x-6">
          {/* Profile Image */}
          <div className="flex-shrink-0">
            {application.profile_image_url ? (
              <img
                src={application.profile_image_url}
                alt={`${application.first_name} ${application.last_name}`}
                className="h-32 w-32 rounded-2xl object-cover shadow-lg"
              />
            ) : (
              <div className="h-32 w-32 rounded-2xl bg-ios-gray-200 flex items-center justify-center">
                <UserCircleIcon className="h-16 w-16 text-ios-gray-400" />
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-ios-gray-900 mb-1">
              {application.first_name} {application.last_name}
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-ios-gray-600">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(parseISO(application.birth_date), 'dd.MM.yyyy')} ({age} Jahre)
              </div>
              <div className="flex items-center text-ios-gray-600">
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                <a href={`mailto:${application.email}`} className="text-ios-blue hover:underline">
                  {application.email}
                </a>
              </div>
              <div className="flex items-center text-ios-gray-600">
                <PhoneIcon className="h-4 w-4 mr-2" />
                <a href={`tel:${application.phone}`} className="text-ios-blue hover:underline">
                  {application.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address & Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="ios-card p-6">
          <h3 className="font-semibold text-ios-gray-900 mb-4 flex items-center">
            <MapPinIcon className="h-5 w-5 mr-2" />
            Adresse
          </h3>
          <div className="space-y-1 text-sm text-ios-gray-600">
            <p>{application.street} {application.house_number}</p>
            <p>{application.postal_code} {application.city}</p>
          </div>
        </div>

        <div className="ios-card p-6">
          <h3 className="font-semibold text-ios-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Weitere Angaben
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ios-gray-600">T-Shirt Größe:</span>
              <span className="font-medium text-ios-gray-900">{application.tshirt_size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ios-gray-600">Datenschutz:</span>
              <span className="font-medium text-ios-green">
                <CheckCircleIcon className="inline h-4 w-4" /> Akzeptiert
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Info */}
      {application.status !== 'pending' && (
        <div className="ios-card p-6 mb-6 bg-ios-gray-50">
          <h3 className="font-semibold text-ios-gray-900 mb-2">Bearbeitungsinformationen</h3>
          <div className="space-y-1 text-sm text-ios-gray-600">
            <p>
              Bearbeitet von: <span className="font-medium">{application.processor_name || application.processor_email}</span>
            </p>
            <p>
              Bearbeitet am: <span className="font-medium">
                {format(parseISO(application.processed_at), 'dd.MM.yyyy HH:mm', { locale: de })} Uhr
              </span>
            </p>
            {application.rejection_reason && (
              <p className="mt-2">
                Ablehnungsgrund: <span className="italic">{application.rejection_reason}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions for Pending Applications */}
      {application.status === 'pending' && (
        <>
          {/* Qualifications Selection */}
          <div className="ios-card p-6 mb-6">
            <h3 className="font-semibold text-ios-gray-900 mb-4 flex items-center">
              <SparklesIcon className="h-5 w-5 mr-2" />
              Qualifikationen zuweisen (optional)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {qualifications.map((qual) => (
                <button
                  key={qual.id}
                  onClick={() => toggleQualification(qual.id)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    selectedQualifications.includes(qual.id)
                      ? 'border-ios-blue bg-ios-blue/10 text-ios-blue'
                      : 'border-ios-gray-300 text-ios-gray-700 hover:border-ios-gray-400'
                  }`}
                >
                  <div 
                    className="w-3 h-3 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: qual.color }}
                  />
                  {qual.name}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleAccept}
              disabled={processing}
              className="flex-1 ios-button bg-ios-green text-white hover:bg-green-600 disabled:opacity-50"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Bewerbung annehmen
            </button>
            <button
              onClick={() => setShowRejectDialog(true)}
              disabled={processing}
              className="flex-1 ios-button bg-ios-red text-white hover:bg-red-600 disabled:opacity-50"
            >
              <XCircleIcon className="h-5 w-5 mr-2" />
              Bewerbung ablehnen
            </button>
          </div>
        </>
      )}

      {/* Delete Button for Rejected Applications */}
      {application.status === 'rejected' && (
        <div className="flex justify-end">
          <button
            onClick={handleDelete}
            disabled={processing}
            className="ios-button bg-ios-red text-white hover:bg-red-600 disabled:opacity-50"
          >
            <TrashIcon className="h-5 w-5 mr-2" />
            Bewerbung löschen
          </button>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowRejectDialog(false)} />
            
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-ios-red/10 rounded-xl">
                  <ExclamationTriangleIcon className="h-6 w-6 text-ios-red" />
                </div>
                <h3 className="text-lg font-semibold text-ios-gray-900">Bewerbung ablehnen</h3>
              </div>
              
              <p className="text-sm text-ios-gray-600 mb-4">
                Sind Sie sicher, dass Sie diese Bewerbung ablehnen möchten? 
                Der Bewerber erhält eine Ablehnungs-E-Mail.
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                  Ablehnungsgrund (optional, intern)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="ios-input"
                  placeholder="Grund für die Ablehnung..."
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowRejectDialog(false)}
                  className="flex-1 ios-button-secondary"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1 ios-button bg-ios-red text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {processing ? 'Wird abgelehnt...' : 'Ablehnen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationDetail;


