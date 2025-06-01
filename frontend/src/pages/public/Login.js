import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    const result = await login(data.email, data.password);
    setIsLoading(false);

    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-ios p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-ios-gray-900">
              Willkommen zurück
            </h2>
            <p className="mt-2 text-sm text-ios-gray-600">
              Melden Sie sich in Ihrem Konto an
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ios-gray-700 mb-2">
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

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ios-gray-700 mb-2">
                Passwort
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Passwort ist erforderlich',
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`ios-input pr-10 ${errors.password ? 'border-ios-red' : ''}`}
                  placeholder="••••••••"
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

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-ios-gray-300 text-ios-blue 
                           focus:ring-ios-blue"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-ios-gray-700">
                  Angemeldet bleiben
                </label>
              </div>

              <Link
                to="/reset-password"
                className="text-sm text-ios-blue hover:text-blue-600"
              >
                Passwort vergessen?
              </Link>
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
                  Wird angemeldet...
                </span>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>

          {/* Apply Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-ios-gray-600">
              Noch kein Konto?{' '}
              <Link to="/apply" className="font-medium text-ios-blue hover:text-blue-600">
                Jetzt bewerben
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
