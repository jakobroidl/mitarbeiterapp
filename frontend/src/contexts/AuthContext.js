import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

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
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Error loading user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      
      toast.success('Erfolgreich angemeldet');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Anmeldung fehlgeschlagen';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (data) => {
    try {
      await loadUser();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const resetPassword = async (token, password) => {
    try {
      await api.post('/auth/reset-password', { token, password });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Fehler beim Zurücksetzen';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      await api.post('/auth/request-reset', { email });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Fehler beim Anfordern';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const setInitialPassword = async (token, password) => {
    try {
      const response = await api.post('/auth/set-password', { token, password });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        setToken(response.data.token);
        setUser(response.data.user);
        return { success: true, autoLogin: true };
      }
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Fehler beim Setzen des Passworts';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const validateToken = async (token) => {
    try {
      const response = await api.get(`/auth/validate-token/${token}`);
      return response.data;
    } catch (error) {
      return { valid: false };
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  const isStaff = () => {
    return user?.role === 'staff';
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateProfile,
    resetPassword,
    requestPasswordReset,
    setInitialPassword,
    validateToken,
    isAdmin,
    isStaff
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
