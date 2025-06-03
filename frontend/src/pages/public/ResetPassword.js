// frontend/src/pages/public/ResetPassword.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword, requestPasswordReset, validateToken } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState('request'); // 'request', 'reset', 'success'
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenData, setTokenData] = useState(null);

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  // Prüfe Token wenn vorhanden
  useEffect(() => {
    if (token) {
      checkToken();
    }
  }, [token]);

  const checkToken = async () => {
    setIsLoading(true);
    const result = await validateToken(token);
    
    if (result.valid) {
      setTokenValid(true);
      setTokenData(result);
      setStep('reset');
    } else {
      toast.error('Der Link ist ungültig oder abgelaufen');
      setStep('request');
    }
    setIsLoading(false);
  };

  const onSubmitRequest = async (data) => {
    setIsLoading(true);
    const result = await requestPasswordReset(data.email);
    
    if (result.success) {
      setStep('success');
    }
    setIsLoading(false);
  };

  const onSubmitReset = async (data) => {
    if (!token) return;

    setIsLoading(true);
    const result = await resetPassword(token, data.password);
    
    if (result.success) {
      toast.success('Passwort erfolgreich zurückgesetzt');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
    setIsLoading(false);
  };

  const password = watch('password');

  if (isLoading && step === 'reset' && !tokenValid) {
    return (
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-ios p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ios-blue mx-auto"></div>
          <p className="mt-4 text-ios-gray-600">Link wird überprüft...</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-ios p-8 text-center">
          <CheckCircleIcon className="h-16 w-16 text-ios-green mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-ios-gray-900 mb-2">
            E-Mail versendet!
          </h2>
          <p className="text-ios-gray-600 mb-6">
            Falls ein Account mit dieser E-Mail-Adresse existiert, haben wir Ihnen 
            einen Link zum Zurücksetzen des Passworts gesendet.
          </p>
          <p className="text-sm text-ios-gray-500 mb-6">
            Bitte überprüfen Sie auch Ihren Spam-Ordner.
          </p>
          <Link
            to="/login"
            className="inline-block ios-button-secondary"
          >
            Zurück zum Login
          </Link>
        </div>
      </div>
    );
  }

  if (step === 'reset' && tokenValid) {
    return (
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-ios p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-ios-gray-900">
              Neues Passwort festlegen
            </h2>
            {tokenData?.name && (
              <p className="mt-2 text-sm text-ios-gray-600">
                Hallo {tokenData.name}
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmitReset)} className="space-y-6">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Neues Passwort
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Passwort ist erforderlich',
                    minLength: {
                      value: 8,
                      message: 'Passwort muss mindestens 8 Zeichen lang sein',
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Passwort muss Groß-, Kleinbuchstaben und Zahlen enthalten',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className={`ios-input pr-10 ${errors.password ? 'border-ios-red' : ''}`}
                  placeholder="Mindestens 8 Zeichen"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-ios-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-ios-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-ios-red">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-ios-gray-700 mb-2">
                Passwort bestätigen
              </label>
              <input
                {...register('confirmPassword', {
                  required: 'Bitte bestätigen Sie Ihr Passwort',
                  validate: (value) =>
                    value === password || 'Passwörter stimmen nicht überein',
                })}
                type={showPassword ? 'text' : 'password'}
                className={`ios-input ${errors.confirmPassword ? 'border-ios-red' : ''}`}
                placeholder="Passwort wiederholen"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-ios-red">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-ios-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-ios-gray-700 mb-2">
                Passwort-Anforderungen:
              </p>
              <ul className="space-y-1 text-xs">
                <li className={`flex items-center space-x-2 ${
                  password?.length >= 8 ? 'text-ios-green' : 'text-ios-gray-500'
                }`}>
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Mindestens 8 Zeichen</span>
                </li>
                <li className={`flex items-center space-x-2 ${
                  password && /[A-Z]/.test(password) ? 'text-ios-green' : 'text-ios-gray-500'
                }`}>
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Ein Großbuchstabe</span>
                </li>
                <li className={`flex items-center space-x-2 ${
                  password && /[a-z]/.test(password) ? 'text-ios-green' : 'text-ios-gray-500'
                }`}>
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Ein Kleinbuchstabe</span>
                </li>
                <li className={`flex items-center space-x-2 ${
                  password && /\d/.test(password) ? 'text-ios-green' : 'text-ios-gray-500'
                }`}>
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Eine Zahl</span>
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full ios-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Wird gespeichert...' : 'Passwort zurücksetzen'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Request Form (default)
  return (
    <div className="max-w-md w-full">
      <div className="bg-white rounded-2xl shadow-ios p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-ios-gray-900">
            Passwort vergessen?
          </h2>
          <p className="mt-2 text-sm text-ios-gray-600">
            Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link 
            zum Zurücksetzen Ihres Passworts.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmitRequest)} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-ios-gray-700 mb-2">
              E-Mail-Adresse
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
              autoComplete="email"
              className={`ios-input ${errors.email ? 'border-ios-red' : ''}`}
              placeholder="name@beispiel.de"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-ios-red">{errors.email.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full ios-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Wird gesendet...' : 'Link senden'}
          </button>

          {/* Back to Login */}
          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-ios-blue hover:text-blue-600"
            >
              Zurück zum Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;


