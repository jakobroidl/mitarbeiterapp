import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { PhotoIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const Apply = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const watchImage = watch('profileImage');

  React.useEffect(() => {
    if (watchImage && watchImage[0]) {
      const file = watchImage[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewImage(null);
    }
  }, [watchImage]);

  const onSubmit = async (data) => {
    setIsLoading(true);

    try {
      const formData = new FormData();
      
      // Add all form fields
      Object.keys(data).forEach(key => {
        if (key === 'profileImage') {
          if (data[key][0]) {
            formData.append('profileImage', data[key][0]);
          }
        } else {
          formData.append(key, data[key]);
        }
      });

      await api.post('/applications/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setApplicationSubmitted(true);
      toast.success('Bewerbung erfolgreich eingereicht!');
    } catch (error) {
      console.error('Application error:', error);
      toast.error('Fehler beim Einreichen der Bewerbung');
    } finally {
      setIsLoading(false);
    }
  };

  if (applicationSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-ios p-8 text-center">
          <CheckCircleIcon className="h-16 w-16 text-ios-green mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-ios-gray-900 mb-2">
            Bewerbung erfolgreich eingereicht!
          </h2>
          <p className="text-ios-gray-600 mb-6">
            Vielen Dank für Ihre Bewerbung. Wir werden uns in Kürze bei Ihnen melden.
          </p>
          <button
            onClick={() => navigate('/')}
            className="ios-button-primary"
          >
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-ios p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-ios-gray-900">
              Jetzt bewerben
            </h2>
            <p className="mt-2 text-sm text-ios-gray-600">
              Werden Sie Teil unseres Teams
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-ios-gray-900">
                Persönliche Daten
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Vorname *
                  </label>
                  <input
                    {...register('firstName', {
                      required: 'Vorname ist erforderlich',
                      maxLength: {
                        value: 100,
                        message: 'Maximal 100 Zeichen',
                      },
                    })}
                    type="text"
                    className={`ios-input ${errors.firstName ? 'border-ios-red' : ''}`}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-ios-red">{errors.firstName.message}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Nachname *
                  </label>
                  <input
                    {...register('lastName', {
                      required: 'Nachname ist erforderlich',
                      maxLength: {
                        value: 100,
                        message: 'Maximal 100 Zeichen',
                      },
                    })}
                    type="text"
                    className={`ios-input ${errors.lastName ? 'border-ios-red' : ''}`}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-ios-red">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                  Geburtsdatum *
                </label>
                <input
                  {...register('birthDate', {
                    required: 'Geburtsdatum ist erforderlich',
                    validate: (value) => {
                      const date = new Date(value);
                      const now = new Date();
                      const age = (now - date) / (365.25 * 24 * 60 * 60 * 1000);
                      if (age < 16) return 'Mindestalter ist 16 Jahre';
                      if (age > 100) return 'Bitte gültiges Geburtsdatum eingeben';
                      return true;
                    },
                  })}
                  type="date"
                  className={`ios-input ${errors.birthDate ? 'border-ios-red' : ''}`}
                />
                {errors.birthDate && (
                  <p className="mt-1 text-xs text-ios-red">{errors.birthDate.message}</p>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-ios-gray-900">
                Kontaktdaten
              </h3>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                  E-Mail-Adresse *
                </label>
                <input
                  {...register('email', {
                    required: 'E-Mail ist erforderlich',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Ungültige E-Mail-Adresse',
                    },
                  })}
                  type="email"
                  className={`ios-input ${errors.email ? 'border-ios-red' : ''}`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-ios-red">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                  Handynummer *
                </label>
                <input
                  {...register('phone', {
                    required: 'Handynummer ist erforderlich',
                    pattern: {
                      value: /^(\+49|0049|0)?[1-9]\d{1,14}$/,
                      message: 'Ungültige Telefonnummer',
                    },
                  })}
                  type="tel"
                  className={`ios-input ${errors.phone ? 'border-ios-red' : ''}`}
                  placeholder="+49 123 456789"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-ios-red">{errors.phone.message}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-ios-gray-900">
                Adresse
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Street */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Straße *
                  </label>
                  <input
                    {...register('street', {
                      required: 'Straße ist erforderlich',
                    })}
                    type="text"
                    className={`ios-input ${errors.street ? 'border-ios-red' : ''}`}
                  />
                  {errors.street && (
                    <p className="mt-1 text-xs text-ios-red">{errors.street.message}</p>
                  )}
                </div>

                {/* House Number */}
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Hausnummer *
                  </label>
                  <input
                    {...register('houseNumber', {
                      required: 'Hausnummer ist erforderlich',
                    })}
                    type="text"
                    className={`ios-input ${errors.houseNumber ? 'border-ios-red' : ''}`}
                  />
                  {errors.houseNumber && (
                    <p className="mt-1 text-xs text-ios-red">{errors.houseNumber.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Postal Code */}
                <div>
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Postleitzahl *
                  </label>
                  <input
                    {...register('postalCode', {
                      required: 'PLZ ist erforderlich',
                      pattern: {
                        value: /^\d{5}$/,
                        message: 'PLZ muss 5 Ziffern haben',
                      },
                    })}
                    type="text"
                    className={`ios-input ${errors.postalCode ? 'border-ios-red' : ''}`}
                  />
                  {errors.postalCode && (
                    <p className="mt-1 text-xs text-ios-red">{errors.postalCode.message}</p>
                  )}
                </div>

                {/* City */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                    Stadt *
                  </label>
                  <input
                    {...register('city', {
                      required: 'Stadt ist erforderlich',
                    })}
                    type="text"
                    className={`ios-input ${errors.city ? 'border-ios-red' : ''}`}
                  />
                  {errors.city && (
                    <p className="mt-1 text-xs text-ios-red">{errors.city.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-ios-gray-900">
                Weitere Angaben
              </h3>

              {/* T-Shirt Size */}
              <div>
                <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                  T-Shirt Größe *
                </label>
                <select
                  {...register('tshirtSize', {
                    required: 'T-Shirt Größe ist erforderlich',
                  })}
                  className={`ios-input ${errors.tshirtSize ? 'border-ios-red' : ''}`}
                >
                  <option value="">Bitte wählen</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                  <option value="3XL">3XL</option>
                </select>
                {errors.tshirtSize && (
                  <p className="mt-1 text-xs text-ios-red">{errors.tshirtSize.message}</p>
                )}
              </div>

              {/* Profile Image */}
              <div>
                <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                  Profilbild *
                </label>
                <div className="mt-2 flex items-center space-x-4">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-ios-gray-200 flex items-center justify-center">
                      <PhotoIcon className="h-8 w-8 text-ios-gray-400" />
                    </div>
                  )}
                  <label className="ios-button-secondary cursor-pointer">
                    <span>Bild auswählen</span>
                    <input
                      {...register('profileImage', {
                        required: 'Profilbild ist erforderlich',
                        validate: {
                          size: (files) => {
                            if (!files[0]) return true;
                            return files[0].size <= 5 * 1024 * 1024 || 'Maximale Dateigröße: 5MB';
                          },
                          type: (files) => {
                            if (!files[0]) return true;
                            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                            return validTypes.includes(files[0].type) || 'Nur Bilddateien erlaubt';
                          },
                        },
                      })}
                      type="file"
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                </div>
                {errors.profileImage && (
                  <p className="mt-1 text-xs text-ios-red">{errors.profileImage.message}</p>
                )}
              </div>
            </div>

            {/* Privacy Agreement */}
            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  {...register('privacyAgreed', {
                    required: 'Bitte stimmen Sie den Datenschutzbestimmungen zu',
                  })}
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-ios-gray-300 text-ios-blue focus:ring-ios-blue"
                />
                <label className="ml-3 text-sm text-ios-gray-700">
                  Ich stimme zu, dass meine Daten zur Bearbeitung meiner Bewerbung 
                  gespeichert und verarbeitet werden. *
                </label>
              </div>
              {errors.privacyAgreed && (
                <p className="text-xs text-ios-red">{errors.privacyAgreed.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full ios-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Wird gesendet...
                </span>
              ) : (
                'Bewerbung absenden'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Apply;
