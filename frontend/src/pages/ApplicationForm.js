import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ApplicationForm = () => {
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Bild darf maximal 5MB groß sein');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      
      // Alle Textfelder hinzufügen
      Object.keys(data).forEach(key => {
        if (key !== 'image') {
          formData.append(key, data[key]);
        }
      });
      
      // Bild hinzufügen
      if (data.image[0]) {
        formData.append('image', data.image[0]);
      }

      const response = await axios.post(
        'http://localhost:3001/api/applications',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      toast.success('Bewerbung erfolgreich eingereicht! Wir melden uns bald bei dir.');
      
      // Nach 2 Sekunden zur Login-Seite
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error) {
      console.error('Bewerbungsfehler:', error);
      toast.error(error.response?.data?.message || 'Fehler beim Einreichen der Bewerbung');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Bewirb dich bei uns!</h2>
          <p className="mt-2 text-gray-600">
            Werde Teil unseres Teams und arbeite bei spannenden Veranstaltungen mit.
          </p>
        </div>

        {/* Formular */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Bild Upload - iOS Style */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-32 h-32 bg-gray-100 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Vorschau"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <CameraIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <label
                  htmlFor="image"
                  className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-2 cursor-pointer hover:bg-blue-600 transition-colors shadow-lg"
                >
                  <CameraIcon className="w-6 h-6 text-white" />
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    {...register('image', { required: 'Bitte lade ein Bild hoch' })}
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            </div>
            {errors.image && (
              <p className="text-center text-red-500 text-sm">{errors.image.message}</p>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vorname
                </label>
                <input
                  type="text"
                  {...register('firstName', { required: 'Vorname ist erforderlich' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Max"
                />
                {errors.firstName && (
                  <p className="mt-1 text-red-500 text-sm">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nachname
                </label>
                <input
                  type="text"
                  {...register('lastName', { required: 'Nachname ist erforderlich' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Mustermann"
                />
                {errors.lastName && (
                  <p className="mt-1 text-red-500 text-sm">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Geburtsdatum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Geburtsdatum
              </label>
              <input
                type="date"
                {...register('birthDate', { 
                  required: 'Geburtsdatum ist erforderlich',
                  validate: value => {
                    const age = new Date().getFullYear() - new Date(value).getFullYear();
                    return age >= 16 || 'Du musst mindestens 16 Jahre alt sein';
                  }
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {errors.birthDate && (
                <p className="mt-1 text-red-500 text-sm">{errors.birthDate.message}</p>
              )}
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse
              </label>
              <input
                type="text"
                {...register('address', { required: 'Adresse ist erforderlich' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Musterstraße 123, 12345 Musterstadt"
              />
              {errors.address && (
                <p className="mt-1 text-red-500 text-sm">{errors.address.message}</p>
              )}
            </div>

            {/* T-Shirt Größe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                T-Shirt Größe
              </label>
              <select
                {...register('tshirtSize', { required: 'Bitte wähle eine Größe' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
              >
                <option value="">Größe wählen...</option>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
                <option value="XXXL">XXXL</option>
              </select>
              {errors.tshirtSize && (
                <p className="mt-1 text-red-500 text-sm">{errors.tshirtSize.message}</p>
              )}
            </div>

            {/* Kontakt */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Handynummer
                </label>
                <input
                  type="tel"
                  {...register('phone', { 
                    required: 'Handynummer ist erforderlich',
                    pattern: {
                      value: /^[\d\s\-+()]+$/,
                      message: 'Ungültige Telefonnummer'
                    }
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="+49 123 456789"
                />
                {errors.phone && (
                  <p className="mt-1 text-red-500 text-sm">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail Adresse
                </label>
                <input
                  type="email"
                  {...register('email', { 
                    required: 'E-Mail ist erforderlich',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Ungültige E-Mail Adresse'
                    }
                  })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="max@beispiel.de"
                />
                {errors.email && (
                  <p className="mt-1 text-red-500 text-sm">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Zusätzliche Infos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warum möchtest du bei uns arbeiten? (Optional)
              </label>
              <textarea
                {...register('motivation')}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Erzähl uns etwas über dich..."
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 px-6 rounded-xl font-medium transition-all transform ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98]'
                } text-white shadow-lg`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Wird gesendet...
                  </span>
                ) : (
                  'Bewerbung abschicken'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplicationForm;


