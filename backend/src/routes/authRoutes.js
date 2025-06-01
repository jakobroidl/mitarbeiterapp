const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Login
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Passwort ist erforderlich'),
  handleValidationErrors
], authController.login);

// Get current user
router.get('/me', authenticateToken, authController.getMe);

// Request password reset
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .withMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein')
    .normalizeEmail(),
  handleValidationErrors
], authController.requestPasswordReset);

// Reset password
router.post('/reset-password', [
  body('token')
    .notEmpty()
    .withMessage('Token ist erforderlich'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Passwort muss mindestens 8 Zeichen lang sein')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Passwort muss mindestens einen Kleinbuchstaben, einen Großbuchstaben und eine Zahl enthalten'),
  handleValidationErrors
], authController.resetPassword);

// Change password (authenticated)
router.post('/change-password', [
  authenticateToken,
  body('currentPassword')
    .notEmpty()
    .withMessage('Aktuelles Passwort ist erforderlich'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Neues Passwort muss mindestens 8 Zeichen lang sein')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Passwort muss mindestens einen Kleinbuchstaben, einen Großbuchstaben und eine Zahl enthalten'),
  handleValidationErrors
], authController.changePassword);

// Update profile
router.put('/profile', [
  authenticateToken,
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('Vorname ist erforderlich')
    .isLength({ max: 100 })
    .withMessage('Vorname darf maximal 100 Zeichen lang sein'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Nachname ist erforderlich')
    .isLength({ max: 100 })
    .withMessage('Nachname darf maximal 100 Zeichen lang sein'),
  body('birthDate')
    .optional()
    .isISO8601()
    .withMessage('Ungültiges Geburtsdatum')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      const age = (now - date) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 16 || age > 100) {
        throw new Error('Alter muss zwischen 16 und 100 Jahren liegen');
      }
      return true;
    }),
  body('phone')
    .optional()
    .trim()
    .matches(/^(\+49|0049|0)?[1-9]\d{1,14}$/)
    .withMessage('Ungültige Telefonnummer'),
  body('postalCode')
    .optional()
    .trim()
    .matches(/^\d{5}$/)
    .withMessage('Postleitzahl muss 5 Ziffern haben'),
  body('tshirtSize')
    .optional()
    .isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'])
    .withMessage('Ungültige T-Shirt Größe'),
  handleValidationErrors
], authController.updateProfile);

module.exports = router; 
