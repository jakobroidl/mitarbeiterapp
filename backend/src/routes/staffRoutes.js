// backend/src/routes/staffRoutes.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const staffController = require('../controllers/staffController');
const { authenticateToken, requireAdmin, requireStaff } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { handleValidationErrors, isValidGermanPhoneNumber, isValidPostalCode } = require('../middleware/validation');

// Alle Staff Routes benötigen Authentifizierung
router.use(authenticateToken);

// Staff eigenes Profil
router.get('/profile', requireStaff, staffController.getOwnProfile);
router.put('/profile',
  requireStaff,
  upload.single('profileImage'),
  [
    body('phone')
      .optional()
      .custom(isValidGermanPhoneNumber).withMessage('Ungültige Telefonnummer'),
    body('street')
      .optional()
      .trim()
      .isLength({ max: 255 }).withMessage('Straße darf maximal 255 Zeichen lang sein'),
    body('house_number')
      .optional()
      .trim()
      .isLength({ max: 20 }).withMessage('Hausnummer darf maximal 20 Zeichen lang sein'),
    body('postal_code')
      .optional()
      .custom(isValidPostalCode).withMessage('Ungültige Postleitzahl'),
    body('city')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Stadt darf maximal 100 Zeichen lang sein'),
    body('tshirt_size')
      .optional()
      .isIn(['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']).withMessage('Ungültige T-Shirt Größe'),
    body('emergency_contact')
      .optional()
      .trim()
      .isLength({ max: 255 }).withMessage('Notfallkontakt darf maximal 255 Zeichen lang sein'),
    body('emergency_phone')
      .optional()
      .custom(isValidGermanPhoneNumber).withMessage('Ungültige Notfallnummer')
  ],
  handleValidationErrors,
  handleUploadError,
  staffController.updateOwnProfile
);

// Admin Routes
router.get('/', requireAdmin, staffController.getAllStaff);
router.get('/statistics', requireAdmin, staffController.getStaffStatistics);
router.get('/:id', requireAdmin, staffController.getStaffById);

router.put('/:id',
  requireAdmin,
  upload.single('profileImage'),
  [
    param('id').isInt().withMessage('Ungültige Mitarbeiter ID'),
    body('email')
      .optional()
      .isEmail().withMessage('Ungültige E-Mail-Adresse')
      .normalizeEmail(),
    body('first_name')
      .optional()
      .trim()
      .notEmpty().withMessage('Vorname darf nicht leer sein')
      .isLength({ max: 100 }).withMessage('Vorname darf maximal 100 Zeichen lang sein'),
    body('last_name')
      .optional()
      .trim()
      .notEmpty().withMessage('Nachname darf nicht leer sein')
      .isLength({ max: 100 }).withMessage('Nachname darf maximal 100 Zeichen lang sein'),
    body('birth_date')
      .optional()
      .isISO8601().withMessage('Ungültiges Geburtsdatum'),
    body('phone')
      .optional()
      .custom(isValidGermanPhoneNumber).withMessage('Ungültige Telefonnummer'),
    body('qualifications')
      .optional()
      .isArray().withMessage('Qualifikationen müssen als Array übergeben werden')
  ],
  handleValidationErrors,
  handleUploadError,
  staffController.updateStaff
);

router.patch('/:id/status',
  requireAdmin,
  [
    param('id').isInt().withMessage('Ungültige Mitarbeiter ID'),
    body('is_active')
      .isBoolean().withMessage('Status muss ein Boolean sein')
  ],
  handleValidationErrors,
  staffController.toggleStaffStatus
);

router.patch('/:id/personal-code',
  requireAdmin,
  [
    param('id').isInt().withMessage('Ungültige Mitarbeiter ID'),
   body('personal_code')
  .trim()
  .notEmpty().withMessage('Personal-Code ist erforderlich')
  .isLength({ min: 6, max: 20 }).withMessage('Personal-Code muss zwischen 6 und 20 Zeichen lang sein')
  .matches(/^[0-9]+$/).withMessage('Personal-Code darf nur Zahlen enthalten')

  ],
  handleValidationErrors,
  staffController.updatePersonalCode
);

router.post('/:id/reset-password',
  requireAdmin,
  [
    param('id').isInt().withMessage('Ungültige Mitarbeiter ID')
  ],
  handleValidationErrors,
  staffController.resetStaffPassword
);

// Staff Schichten Routes - Weiterleitung an shiftController
const shiftController = require('../controllers/shiftController');
router.get('/shifts/my', requireStaff, shiftController.getMyShifts);
router.get('/shifts/available', requireStaff, shiftController.getAvailableShifts);
router.post('/shifts/:shiftId/apply', requireStaff, shiftController.applyForShift);
router.delete('/shifts/:shiftId/apply', requireStaff, shiftController.withdrawShiftApplication);
router.post('/shifts/:shiftId/confirm', requireStaff, shiftController.confirmShiftAssignment);


module.exports = router;


