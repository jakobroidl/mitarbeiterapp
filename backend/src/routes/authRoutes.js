// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const emailService = require('../config/emailConfig');

// Öffentliche Routen

// Login
router.post('/login',
  [
    body('email')
      .isEmail().withMessage('Ungültige E-Mail-Adresse')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Passwort ist erforderlich')
  ],
  handleValidationErrors,
  authController.login
);

// Passwort zurücksetzen anfordern
router.post('/request-reset',
  [
    body('email')
      .isEmail().withMessage('Ungültige E-Mail-Adresse')
      .normalizeEmail()
  ],
  handleValidationErrors,
  authController.requestPasswordReset
);

// Passwort zurücksetzen mit Token
router.post('/reset-password',
  [
    body('token')
      .notEmpty().withMessage('Token ist erforderlich')
      .isLength({ min: 32 }).withMessage('Ungültiger Token'),
    body('password')
      .isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen lang sein')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Passwort muss mindestens einen Kleinbuchstaben, einen Großbuchstaben und eine Zahl enthalten')
  ],
  handleValidationErrors,
  authController.resetPassword
);

// Passwort erstmalig setzen (für neue Mitarbeiter)
router.post('/set-password',
  [
    body('token')
      .notEmpty().withMessage('Token ist erforderlich')
      .isLength({ min: 32 }).withMessage('Ungültiger Token'),
    body('password')
      .isLength({ min: 8 }).withMessage('Passwort muss mindestens 8 Zeichen lang sein')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Passwort muss mindestens einen Kleinbuchstaben, einen Großbuchstaben und eine Zahl enthalten')
  ],
  handleValidationErrors,
  authController.setPassword
);

// Token validieren
router.get('/validate-token/:token', authController.validateToken);

// Geschützte Routen (Login erforderlich)

// Aktuellen User abrufen
router.get('/me', authenticateToken, authController.getCurrentUser);

// Logout
router.post('/logout', authenticateToken, authController.logout);

// Passwort ändern
router.post('/change-password',
  authenticateToken,
  [
    body('currentPassword')
      .notEmpty().withMessage('Aktuelles Passwort ist erforderlich'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('Neues Passwort muss mindestens 8 Zeichen lang sein')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Passwort muss mindestens einen Kleinbuchstaben, einen Großbuchstaben und eine Zahl enthalten')
      .custom((value, { req }) => value !== req.body.currentPassword).withMessage('Neues Passwort muss sich vom aktuellen unterscheiden')
  ],
  handleValidationErrors,
  authController.changePassword
);

module.exports = router;


