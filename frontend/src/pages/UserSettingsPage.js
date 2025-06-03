// frontend/src/pages/UserSettingsPage.js
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const UserSettingsPage = () => {
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await api.get('/users/me/profile');
        setUserProfile(response.data);
        reset(response.data);
      } catch (error) {
        toast.error('Fehler beim Laden des Benutzerprofils');
      }
    };

    fetchUserProfile();
  }, [reset]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await api.put('/users/me/profile', data);
      updateUser(response.data.user);
      toast.success('Profil erfolgreich aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Profils');
    }
    setIsLoading(false);
  };

  if (!userProfile) {
    return <div>Lade Benutzerprofil...</div>;
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Benutzereinstellungen</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Vorname */}
        <div>
          {/* ... */}
        </div>

        {/* Nachname */}
        <div>
          {/* ... */}
        </div>

        {/* E-Mail */}
        <div>
          {/* ... */}
        </div>

        {/* Telefonnummer */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Telefonnummer
          </label>
          <input
            {...register('phone')}
            id="phone"
            type="tel"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Adresse */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Adresse
          </label>
          <input
            {...register('address')}
            id="address"
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* PLZ */}
        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
            Postleitzahl
          </label>
          <input
            {...register('postalCode')}
            id="postalCode"
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Stadt */}
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            Stadt
          </label>
          <input
            {...register('city')}
            id="city"
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Wird gespeichert...' : 'Speichern'}
        </button>
      </form>
    </div>
  );
};

export default UserSettingsPage;
