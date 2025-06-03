// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Lade User beim App-Start
  useEffect(() => {
    loadUser();
  }, []);

  // Lade User aus Token
  const loadUser = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Fehler beim Laden des Users:', error);
      // Token ungültig - entfernen
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Login
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      const { token, user } = response.data;
      
      // Speichere Token
      localStorage.setItem('token', token);
      
      // Setze User
      setUser(user);
      
      toast.success(`Willkommen zurück, ${user.firstName || user.email}!`);
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login fehlgeschlagen';
      toast.error(message);
      
      return { 
        success: false, 
        message 
      };
    }
  };

  // Logout
  const logout = async () => {
    try {
      // Informiere Backend über Logout
      await api.post('/auth/logout').catch(() => {
        // Ignoriere Fehler beim Logout
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Lösche lokale Daten
      localStorage.removeItem('token');
      setUser(null);
      
      // Navigiere zur Login-Seite
      navigate('/login');
      
      toast.success('Erfolgreich abgemeldet');
    }
  };

  // Passwort zurücksetzen anfordern
  const requestPasswordReset = async (email) => {
    try {
      const response = await api.post('/auth/request-reset', { email });
      
      toast.success('Überprüfen Sie Ihre E-Mails für weitere Anweisungen');
      
      return { 
        success: true, 
        message: response.data.message 
      };
    } catch (error) {
      const message = error.response?.data?.message || 'Fehler beim Zurücksetzen des Passworts';
      toast.error(message);
      
      return { 
        success: false, 
        message 
      };
    }
  };

  // Passwort zurücksetzen
  const resetPassword = async (token, password) => {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password
      });
      
      toast.success('Passwort erfolgreich zurückgesetzt');
      
      return { 
        success: true, 
        message: response.data.message 
      };
    } catch (error) {
      const message = error.response?.data?.message || 'Fehler beim Zurücksetzen des Passworts';
      toast.error(message);
      
      return { 
        success: false, 
        message 
      };
    }
  };

  // Passwort erstmalig setzen
  const setInitialPassword = async (token, password) => {
    try {
      const response = await api.post('/auth/set-password', {
        token,
        password
      });
      
      const { token: loginToken, user } = response.data;
      
      // Automatischer Login nach Passwort-Setzung
      if (loginToken && user) {
        localStorage.setItem('token', loginToken);
        setUser(user);
        toast.success('Passwort gesetzt und erfolgreich angemeldet!');
      } else {
        toast.success('Passwort erfolgreich gesetzt');
      }
      
      return { 
        success: true, 
        autoLogin: !!loginToken 
      };
    } catch (error) {
      const message = error.response?.data?.message || 'Fehler beim Setzen des Passworts';
      toast.error(message);
      
      return { 
        success: false, 
        message 
      };
    }
  };

  // Passwort ändern
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      toast.success('Passwort erfolgreich geändert');
      
      return { 
        success: true, 
        message: response.data.message 
      };
    } catch (error) {
      const message = error.response?.data?.message || 'Fehler beim Ändern des Passworts';
      toast.error(message);
      
      return { 
        success: false, 
        message 
      };
    }
  };

  // Token validieren
  const validateToken = async (token) => {
    try {
      const response = await api.get(`/auth/validate-token/${token}`);
      
      return {
        success: true,
        valid: response.data.valid,
        email: response.data.email,
        name: response.data.name
      };
    } catch (error) {
      return {
        success: false,
        valid: false,
        message: error.response?.data?.message || 'Ungültiger Token'
      };
    }
  };

  // Profil aktualisieren
  const updateProfile = async (updates) => {
    try {
      const response = await api.put('/staff/profile', updates);
      
      // Aktualisiere lokalen User
      const updatedUser = {
        ...user,
        ...updates
      };
      setUser(updatedUser);
      
      toast.success('Profil erfolgreich aktualisiert');
      
      return { 
        success: true, 
        user: updatedUser 
      };
    } catch (error) {
      const message = error.response?.data?.message || 'Fehler beim Aktualisieren des Profils';
      toast.error(message);
      
      return { 
        success: false, 
        message 
      };
    }
  };

  // Helper Funktionen
  const isAdmin = () => user?.role === 'admin';
  const isStaff = () => user?.role === 'staff' || user?.role === 'admin';
  const isAuthenticated = () => !!user;

  const value = {
    user,
    loading,
    login,
    logout,
    requestPasswordReset,
    resetPassword,
    setInitialPassword,
    changePassword,
    validateToken,
    updateProfile,
    loadUser,
    isAdmin,
    isStaff,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};


