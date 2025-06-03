// backend/src/routes/applicationRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const applicationController = require('../controllers/applicationController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { handleValidationErrors, isValidGermanPhoneNumber, isValidPostalCode, isValidBirthDate } = require('../middleware/validation');

// Öffentliche Route - Bewerbung einreichen
router.post('/submit',
  upload.single('profileImage'),
  [
    // Validierung
    body('email')
      .isEmail().withMessage('Ungültige E-Mail-Adresse')
      .normalizeEmail(),
    body('firstName')
      .trim()
      .notEmpty().withMessage('Vorname ist erforderlich')
      .isLength({ max: 100 }).withMessage('Vorname darf maximal 100 Zeichen lang sein'),
    body('lastName')
      .trim()
      .notEmpty().withMessage('Nachname ist erforderlich')
      .isLength({ max: 100 }).withMessage('Nachname darf maximal 100 Zeichen lang sein'),
    body('birthDate')
      .isISO8601().withMessage('Ungültiges Datumsformat')
      .custom(isValidBirthDate).withMessage('Ungültiges Geburtsdatum oder Mindestalter nicht erreicht'),
    body('phone')
      .trim()
      .notEmpty().withMessage('Telefonnummer ist erforderlich')
      .custom(isValidGermanPhoneNumber).withMessage('Ungültige Telefonnummer'),
    body('street')
      .trim()
      .notEmpty().withMessage('Straße ist erforderlich')
      .isLength({ max: 255 }).withMessage('Straße darf maximal 255 Zeichen lang sein'),
    body('houseNumber')
      .trim()
      .notEmpty().withMessage('Hausnummer ist erforderlich')
      .isLength({ max: 20 }).withMessage('Hausnummer darf maximal 20 Zeichen lang sein'),
    body('postalCode')
      .trim()
      .notEmpty().withMessage('Postleitzahl ist erforderlich')
      .custom(isValidPostalCode).withMessage('Ungültige Postleitzahl'),
    body('city')
      .trim()
      .notEmpty().withMessage('Stadt ist erforderlich')
      .isLength({ max: 100 }).withMessage('Stadt darf maximal 100 Zeichen lang sein'),
    body('tshirtSize')
      .isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']).withMessage('Ungültige T-Shirt Größe'),
    body('privacyAgreed')
      .custom(value => value === 'true' || value === true).withMessage('Datenschutzerklärung muss akzeptiert werden')
  ],
  handleValidationErrors,
  handleUploadError,
  applicationController.submitApplication
);

// Admin-geschützte Routen
router.use(authenticateToken, requireAdmin);

// Alle Bewerbungen abrufen
router.get('/', applicationController.getApplications);

// Statistiken abrufen
router.get('/stats', applicationController.getApplicationStats);

// Einzelne Bewerbung abrufen
router.get('/:id', applicationController.getApplication);

// Bewerbung annehmen
router.post('/:id/accept',
  [
    body('qualifications')
      .optional()
      .isArray().withMessage('Qualifikationen müssen als Array übergeben werden')
      .custom(value => {
        if (!Array.isArray(value)) return true;
        return value.every(id => Number.isInteger(parseInt(id)));
      }).withMessage('Ungültige Qualifikations-IDs')
  ],
  handleValidationErrors,
  applicationController.acceptApplication
);

// Bewerbung ablehnen
router.post('/:id/reject',
  [
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Ablehnungsgrund darf maximal 500 Zeichen lang sein')
  ],
  handleValidationErrors,
  applicationController.rejectApplication
);

// Bewerbung löschen (nur abgelehnte)
router.delete('/:id', applicationController.deleteApplication);

module.exports = router;
