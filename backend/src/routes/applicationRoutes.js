const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const applicationController = require('../controllers/applicationController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { handleValidationErrors, isValidGermanPhoneNumber, isValidPostalCode, isValidBirthDate } = require('../middleware/validation');

// Public route - Submit application
router.post('/submit', [
  upload.single('profileImage'),
  handleUploadError,
  body('email')
    .isEmail()
    .withMessage('Ungültige E-Mail-Adresse')
    .normalizeEmail(),
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
    .isISO8601()
    .withMessage('Ungültiges Datumsformat')
    .custom(isValidBirthDate)
    .withMessage('Ungültiges Geburtsdatum'),
  body('street')
    .trim()
    .notEmpty()
    .withMessage('Straße ist erforderlich'),
  body('houseNumber')
    .trim()
    .notEmpty()
    .withMessage('Hausnummer ist erforderlich'),
  body('postalCode')
    .trim()
    .custom(isValidPostalCode)
    .withMessage('Ungültige Postleitzahl'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('Stadt ist erforderlich'),
  body('phone')
    .trim()
    .custom(isValidGermanPhoneNumber)
    .withMessage('Ungültige Telefonnummer'),
  body('tshirtSize')
    .isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'])
    .withMessage('Ungültige T-Shirt Größe'),
  body('privacyAgreed')
    .equals('true')
    .withMessage('Datenschutzzustimmung ist erforderlich'),
  handleValidationErrors
], applicationController.submitApplication);

// Admin routes
router.use(authenticateToken, requireAdmin);

// Get all applications
router.get('/', [
  query('status')
    .optional()
    .isIn(['pending', 'accepted', 'rejected'])
    .withMessage('Ungültiger Status'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Seite muss eine positive Zahl sein'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit muss zwischen 1 und 100 liegen'),
  handleValidationErrors
], applicationController.getApplications);

// Get single application
router.get('/:id', [
  param('id')
    .isInt()
    .withMessage('Ungültige Bewerbungs-ID'),
  handleValidationErrors
], applicationController.getApplication);

// Accept application
router.post('/:id/accept', [
  param('id')
    .isInt()
    .withMessage('Ungültige Bewerbungs-ID'),
  body('qualifications')
    .optional()
    .isArray()
    .withMessage('Qualifikationen müssen ein Array sein'),
  body('qualifications.*')
    .optional()
    .isInt()
    .withMessage('Ungültige Qualifikations-ID'),
  handleValidationErrors
], applicationController.acceptApplication);

// Reject application
router.post('/:id/reject', [
  param('id')
    .isInt()
    .withMessage('Ungültige Bewerbungs-ID'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notizen dürfen maximal 500 Zeichen lang sein'),
  handleValidationErrors
], applicationController.rejectApplication);

// Delete application
router.delete('/:id', [
  param('id')
    .isInt()
    .withMessage('Ungültige Bewerbungs-ID'),
  handleValidationErrors
], applicationController.deleteApplication);

module.exports = router;
