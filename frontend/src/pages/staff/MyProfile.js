// frontend/src/pages/staff/MyProfile.js
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  UserCircleIcon,
  CameraIcon,
  PhoneIcon,
  HomeIcon,
  EnvelopeIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  KeyIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

const MyProfile = () => {
  const { user, updateProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch
  } = useForm();

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch: watchPassword
  } = useForm();

  const newPassword = watchPassword('newPassword');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/staff/profile');
      setProfile(response.data);
      reset({
        phone: response.data.phone,
        street: response.data.street,
        house_number: response.data.house_number,
        postal_code: response.data.postal_code,
        city: response.data.city,
        emergency_contact: response.data.emergency_contact,
        emergency_phone: response.data.emergency_phone,
        tshirt_size: response.data.tshirt_size
      });
    } catch (error) {
      console.error('Fehler beim Laden des Profils:', error);
      toast.error('Fehler beim Laden des Profils');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      await api.put('/staff/profile', data);
      
      // Update Auth Context
      await updateProfile(data);
      
      toast.success('Profil erfolgreich aktualisiert');
      setIsEditing(false);
      await loadProfile();
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
      toast.error('Fehler beim Aktualisieren des Profils');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validierung
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Bild darf maximal 5MB groß sein');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Nur Bilddateien sind erlaubt');
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      await api.put('/staff/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Profilbild erfolgreich aktualisiert');
      await loadProfile();
    } catch (error) {
      console.error('Fehler beim Upload:', error);
      toast.error('Fehler beim Hochladen des Bildes');
      setPreviewImage(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const onPasswordSubmit = async (data) => {
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      
      toast.success('Passwort erfolgreich geändert');
      setShowPasswordModal(false);
      resetPassword();
    } catch (error) {
      console.error('Fehler beim Ändern des Passworts:', error);
      const message = error.response?.data?.message || 'Fehler beim Ändern des Passworts';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-ios-gray-200 rounded w-1/4 mb-6"></div>
          <div className="ios-card p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-24 w-24 bg-ios-gray-200 rounded-full"></div>
              <div className="space-y-2 flex-1">
                <div className="h-6 bg-ios-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-ios-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ios-gray-900">Mein Profil</h1>
        <p className="text-ios-gray-600">Verwalte deine persönlichen Daten</p>
      </div>

      {/* Profile Card */}
      <div className="ios-card p-6">
        {/* Profile Header */}
        <div className="flex items-start space-x-4 mb-6 pb-6 border-b border-ios-gray-200">
          <div className="relative">
            {previewImage || profile?.profile_image_url ? (
              <img
                src={previewImage || profile.profile_image_url}
                alt={`${profile?.first_name} ${profile?.last_name}`}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-ios-gray-300 flex items-center justify-center">
                <UserCircleIcon className="h-16 w-16 text-ios-gray-600" />
              </div>
            )}
            
            {/* Upload Button */}
            <label className="absolute bottom-0 right-0 bg-ios-blue text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
              <CameraIcon className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploadingImage}
              />
            </label>
            
            {uploadingImage && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-ios-gray-900">
              {profile?.first_name} {profile?.last_name}
            </h2>
            <p className="text-ios-gray-600">{profile?.email}</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-ios-blue/10 text-ios-blue">
                <IdentificationIcon className="h-4 w-4 mr-1" />
                {profile?.personal_code}
              </span>
              <span className="text-sm text-ios-gray-500">
                Mitglied seit {profile?.hired_date && format(parseISO(profile.hired_date), 'MMMM yyyy', { locale: de })}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={isEditing ? "ios-button-secondary" : "ios-button-primary"}
          >
            {isEditing ? 'Abbrechen' : 'Bearbeiten'}
          </button>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info (Read-only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Geburtsdatum
              </label>
              <div className="flex items-center space-x-2 text-ios-gray-900">
                <CalendarIcon className="h-5 w-5 text-ios-gray-400" />
                <span>{profile?.birth_date && format(parseISO(profile.birth_date), 'dd.MM.yyyy')}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                T-Shirt Größe
              </label>
              {isEditing ? (
                <select
                  {...register('tshirt_size')}
                  className="ios-input"
                >
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                  <option value="3XL">3XL</option>
                </select>
              ) : (
                <span className="text-ios-gray-900">{profile?.tshirt_size}</span>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-medium text-ios-gray-900 mb-4 flex items-center">
              <PhoneIcon className="h-5 w-5 mr-2" />
              Kontaktdaten
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                  Telefonnummer
                </label>
                {isEditing ? (
                  <>
                    <input
                      {...register('phone', {
                        required: 'Telefonnummer ist erforderlich',
                        pattern: {
                          value: /^(\+49|0049|0)?[1-9]\d{1,14}$/,
                          message: 'Ungültige Telefonnummer'
                        }
                      })}
                      type="tel"
                      className={`ios-input ${errors.phone ? 'border-ios-red' : ''}`}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-ios-red">{errors.phone.message}</p>
                    )}
                  </>
                ) : (
                  <span className="text-ios-gray-900">{profile?.phone}</span>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                  E-Mail
                </label>
                <div className="flex items-center space-x-2 text-ios-gray-900">
                  <EnvelopeIcon className="h-5 w-5 text-ios-gray-400" />
                  <span>{profile?.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-medium text-ios-gray-900 mb-4 flex items-center">
              <HomeIcon className="h-5 w-5 mr-2" />
              Adresse
            </h3>
            
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                      Straße
                    </label>
                    <input
                      {...register('street', { required: 'Straße ist erforderlich' })}
                      type="text"
                      className={`ios-input ${errors.street ? 'border-ios-red' : ''}`}
                    />
                    {errors.street && (
                      <p className="mt-1 text-xs text-ios-red">{errors.street.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                      Hausnummer
                    </label>
                    <input
                      {...register('house_number', { required: 'Hausnummer ist erforderlich' })}
                      type="text"
                      className={`ios-input ${errors.house_number ? 'border-ios-red' : ''}`}
                    />
                    {errors.house_number && (
                      <p className="mt-1 text-xs text-ios-red">{errors.house_number.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                      PLZ
                    </label>
                    <input
                      {...register('postal_code', {
                        required: 'PLZ ist erforderlich',
                        pattern: {
                          value: /^\d{5}$/,
                          message: 'PLZ muss 5 Ziffern haben'
                        }
                      })}
                      type="text"
                      className={`ios-input ${errors.postal_code ? 'border-ios-red' : ''}`}
                    />
                    {errors.postal_code && (
                      <p className="mt-1 text-xs text-ios-red">{errors.postal_code.message}</p>
                    )}
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                      Stadt
                    </label>
                    <input
                      {...register('city', { required: 'Stadt ist erforderlich' })}
                      type="text"
                      className={`ios-input ${errors.city ? 'border-ios-red' : ''}`}
                    />
                    {errors.city && (
                      <p className="mt-1 text-xs text-ios-red">{errors.city.message}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-ios-gray-900">
                {profile?.street} {profile?.house_number}, {profile?.postal_code} {profile?.city}
              </p>
            )}
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-lg font-medium text-ios-gray-900 mb-4 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              Notfallkontakt
            </h3>
            
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    {...register('emergency_contact')}
                    type="text"
                    className="ios-input"
                    placeholder="Optional"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Telefonnummer
                  </label>
                  <input
                    {...register('emergency_phone', {
                      pattern: {
                        value: /^(\+49|0049|0)?[1-9]\d{1,14}$/,
                        message: 'Ungültige Telefonnummer'
                      }
                    })}
                    type="tel"
                    className={`ios-input ${errors.emergency_phone ? 'border-ios-red' : ''}`}
                    placeholder="Optional"
                  />
                  {errors.emergency_phone && (
                    <p className="mt-1 text-xs text-ios-red">{errors.emergency_phone.message}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-ios-gray-900">
                {profile?.emergency_contact || 'Nicht angegeben'} 
                {profile?.emergency_phone && ` - ${profile.emergency_phone}`}
              </p>
            )}
          </div>

          {/* Qualifications */}
          {profile?.qualifications && profile.qualifications.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-ios-gray-900 mb-4 flex items-center">
                <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                Qualifikationen
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {profile.qualifications.map((qual) => (
                  <span
                    key={qual.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `${qual.color}20`,
                      color: qual.color
                    }}
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    {qual.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions */}
          {isEditing && (
            <div className="flex justify-end space-x-3 pt-6 border-t border-ios-gray-200">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  reset();
                }}
                className="ios-button-secondary"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={!isDirty}
                className="ios-button-primary disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Security Section */}
      <div className="ios-card p-6">
        <h3 className="text-lg font-medium text-ios-gray-900 mb-4 flex items-center">
          <ShieldCheckIcon className="h-5 w-5 mr-2" />
          Sicherheit
        </h3>
        
        <button
          onClick={() => setShowPasswordModal(true)}
          className="ios-button-secondary flex items-center space-x-2"
        >
          <KeyIcon className="h-5 w-5" />
          <span>Passwort ändern</span>
        </button>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="ios-modal-backdrop" onClick={() => setShowPasswordModal(false)} />
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative bg-white rounded-2xl shadow-ios-xl max-w-md w-full p-6 z-10">
              <h3 className="text-lg font-semibold text-ios-gray-900 mb-6">
                Passwort ändern
              </h3>
              
              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Aktuelles Passwort
                  </label>
                  <input
                    {...registerPassword('currentPassword', {
                      required: 'Aktuelles Passwort ist erforderlich'
                    })}
                    type="password"
                    className={`ios-input ${passwordErrors.currentPassword ? 'border-ios-red' : ''}`}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="mt-1 text-xs text-ios-red">{passwordErrors.currentPassword.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Neues Passwort
                  </label>
                  <input
                    {...registerPassword('newPassword', {
                      required: 'Neues Passwort ist erforderlich',
                      minLength: {
                        value: 8,
                        message: 'Passwort muss mindestens 8 Zeichen lang sein'
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message: 'Passwort muss Groß-, Kleinbuchstaben und Zahlen enthalten'
                      }
                    })}
                    type="password"
                    className={`ios-input ${passwordErrors.newPassword ? 'border-ios-red' : ''}`}
                  />
                  {passwordErrors.newPassword && (
                    <p className="mt-1 text-xs text-ios-red">{passwordErrors.newPassword.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Neues Passwort bestätigen
                  </label>
                  <input
                    {...registerPassword('confirmPassword', {
                      required: 'Bitte bestätige dein neues Passwort',
                      validate: value => value === newPassword || 'Passwörter stimmen nicht überein'
                    })}
                    type="password"
                    className={`ios-input ${passwordErrors.confirmPassword ? 'border-ios-red' : ''}`}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-1 text-xs text-ios-red">{passwordErrors.confirmPassword.message}</p>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      resetPassword();
                    }}
                    className="ios-button-secondary"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="ios-button-primary"
                  >
                    Passwort ändern
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;


