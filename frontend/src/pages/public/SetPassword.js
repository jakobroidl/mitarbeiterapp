// frontend/src/pages/public/SetPassword.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  CheckCircleIcon,
  UserCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const SetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setInitialPassword, validateToken } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenData, setTokenData] = useState(null);
  const [checkingToken, setCheckingToken] = useState(true);

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const password = watch('password');

  // Prüfe Token beim Laden
  useEffect(() => {
    if (token) {
      checkToken();
    } else {
      setCheckingToken(false);
    }
  }, [token]);

  const checkToken = async () => {
    setCheckingToken(true);
    const result = await validateToken(token);
    
    if (result.valid) {
      setTokenValid(true);
      setTokenData(result);
    } else {
      toast.error('Der Link ist ungültig oder abgelaufen');
    }
    setCheckingToken(false);
  };

  const onSubmit = async (data) => {
    if (!token) return;

    setIsLoading(true);
    const result = await setInitialPassword(token, data.password);
    
    if (result.success) {
      toast.success('Passwort erfolgreich gesetzt!');
      
      if (result.autoLogin) {
        // Automatischer Login erfolgt
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        // Weiterleitung zum Login
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    }
    setIsLoading(false);
  };

  if (checkingToken) {
    return (
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-ios p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ios-blue mx-auto"></div>
          <p className="mt-4 text-ios-gray-600">Link wird überprüft...</p>
        </div>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-ios p-8 text-center">
          <ExclamationCircleIcon className="h-16 w-16 text-ios-red mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-ios-gray-900 mb-2">
            Ungültiger Link
          </h2>
          <p className="text-ios-gray-600 mb-6">
            Dieser Link ist ungültig oder abgelaufen. Bitte kontaktieren Sie 
            den Administrator für einen neuen Link.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="ios-button-secondary"
          >
            Zum Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full">
      <div className="bg-white rounded-2xl shadow-ios p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full 
                        bg-ios-green/10 mb-4">
            <UserCircleIcon className="h-12 w-12 text-ios-green" />
          </div>
          <h2 className="text-3xl font-bold text-ios-gray-900">
            Willkommen!
          </h2>
          {tokenData?.name && (
            <p className="mt-2 text-lg text-ios-gray-600">
              Hallo {tokenData.name}
            </p>
          )}
          <p className="mt-2 text-sm text-ios-gray-500">
            Ihre Bewerbung wurde angenommen. Bitte legen Sie ein Passwort 
            für Ihren Account fest.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-ios-gray-700 mb-2">
              Passwort
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
                autoFocus
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
              Ihr Passwort muss enthalten:
            </p>
            <ul className="space-y-1 text-xs">
              <li className={`flex items-center space-x-2 ${
                password?.length >= 8 ? 'text-ios-green' : 'text-ios-gray-500'
              }`}>
                <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                <span>Mindestens 8 Zeichen</span>
              </li>
              <li className={`flex items-center space-x-2 ${
                password && /[A-Z]/.test(password) ? 'text-ios-green' : 'text-ios-gray-500'
              }`}>
                <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                <span>Einen Großbuchstaben (A-Z)</span>
              </li>
              <li className={`flex items-center space-x-2 ${
                password && /[a-z]/.test(password) ? 'text-ios-green' : 'text-ios-gray-500'
              }`}>
                <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                <span>Einen Kleinbuchstaben (a-z)</span>
              </li>
              <li className={`flex items-center space-x-2 ${
                password && /\d/.test(password) ? 'text-ios-green' : 'text-ios-gray-500'
              }`}>
                <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                <span>Eine Zahl (0-9)</span>
              </li>
            </ul>
          </div>

          {/* Terms Info */}
          <div className="bg-ios-blue/10 rounded-xl p-4">
            <p className="text-xs text-ios-gray-700">
              Mit dem Setzen Ihres Passworts akzeptieren Sie unsere 
              Nutzungsbedingungen und Datenschutzrichtlinien.
            </p>
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
                Wird gespeichert...
              </span>
            ) : (
              'Account aktivieren'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;


