const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken } = require('../middleware/auth');

// Vereinfachter Login für Mock-Datenbank
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login-Versuch für:', email);

    // Direkte Prüfung für Mock-User
    if (email === 'admin@example.com' && password === 'admin123') {
      // Mock Token generieren
      const token = 'mock-jwt-token-' + Date.now();
      
      // Mock User Daten
      const user = {
        id: 1,
        email: 'admin@example.com',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        profileImage: null,
        personalCode: '20240001'
      };

      console.log('Login erfolgreich für:', email);

      res.json({
        message: 'Login erfolgreich',
        token,
        user
      });
    } else {
      console.log('Login fehlgeschlagen - falsches Passwort');
      res.status(401).json({ 
        message: 'E-Mail oder Passwort falsch' 
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Fehler beim Login',
      error: error.message 
    });
  }
};

// Get current user - auch vereinfacht
const getMe = async (req, res) => {
  try {
    // Mock User zurückgeben
    const user = {
      id: 1,
      email: 'admin@example.com',
      role: 'admin',
      profile: {
        firstName: 'Admin',
        lastName: 'User',
        birthDate: '1990-01-01',
        address: {
          street: 'Musterstraße',
          houseNumber: '1',
          postalCode: '12345',
          city: 'Musterstadt'
        },
        phone: '+49 123 456789',
        tshirtSize: 'L',
        profileImage: null,
        personalCode: '20240001'
      },
      qualifications: []
    };

    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Benutzerdaten' 
    });
  }
};

// Andere Funktionen bleiben erstmal leer
const requestPasswordReset = async (req, res) => {
  res.json({ message: 'Password reset würde gesendet (Mock)' });
};

const resetPassword = async (req, res) => {
  res.json({ message: 'Password wurde zurückgesetzt (Mock)' });
};

const changePassword = async (req, res) => {
  res.json({ message: 'Password wurde geändert (Mock)' });
};

const updateProfile = async (req, res) => {
  res.json({ message: 'Profil wurde aktualisiert (Mock)' });
};

module.exports = {
  login,
  getMe,
  requestPasswordReset,
  resetPassword,
  changePassword,
  updateProfile
};



