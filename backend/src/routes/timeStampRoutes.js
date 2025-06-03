const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const timeStampController = require('../controllers/timeStampController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Public route - Get positions (for kiosk mode)
router.get('/positions', timeStampController.getPositions);

// Kiosk mode - special route without regular auth
router.post('/kiosk', [
  body('personal_code')
    .trim()
    .notEmpty()
    .withMessage('Personal-Code ist erforderlich'),
  body('pin')
    .matches(/^\d{4}$/)
    .withMessage('PIN muss genau 4 Ziffern haben'),
  body('position_id')
    .optional()
    .isInt()
    .withMessage('Ungültige Positions-ID'),
  body('action')
    .optional()
    .isIn(['in', 'out', 'auto'])
    .withMessage('Ungültige Aktion'),
  handleValidationErrors
], timeStampController.kioskClock);

// All other routes require authentication
router.use(authenticateToken);

// Staff routes
router.post('/clock-in', [
  body('position_id')
    .isInt()
    .withMessage('Position ist erforderlich'),
  handleValidationErrors
], timeStampController.clockIn);

router.post('/clock-out', timeStampController.clockOut);

router.get('/my-stamps', [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Ungültiges Startdatum'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Ungültiges Enddatum'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Seite muss eine positive Zahl sein'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit muss zwischen 1 und 100 liegen'),
  handleValidationErrors
], timeStampController.getMyStamps);

// Generate/Update PIN
router.post('/generate-pin', [
  body('pin')
    .matches(/^\d{4}$/)
    .withMessage('PIN muss genau 4 Ziffern haben'),
  handleValidationErrors
], timeStampController.generatePin);

// Admin routes
router.get('/all', [
  requireAdmin,
  query('staffId')
    .optional()
    .isInt()
    .withMessage('Ungültige Mitarbeiter-ID'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Ungültiges Startdatum'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Ungültiges Enddatum'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Seite muss eine positive Zahl sein'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit muss zwischen 1 und 100 liegen'),
  handleValidationErrors
], timeStampController.getAllStamps);

// Export stamps
router.get('/export', [
  requireAdmin,
  query('staffId')
    .optional()
    .isInt()
    .withMessage('Ungültige Mitarbeiter-ID'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Ungültiges Startdatum'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Ungültiges Enddatum'),
  query('format')
    .optional()
    .isIn(['json', 'excel', 'pdf'])
    .withMessage('Ungültiges Export-Format'),
  handleValidationErrors
], timeStampController.exportStamps);

// Position management (admin only)
router.post('/positions', [
  requireAdmin,
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name ist erforderlich')
    .isLength({ max: 100 })
    .withMessage('Name darf maximal 100 Zeichen lang sein'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Beschreibung darf maximal 500 Zeichen lang sein'),
  body('sort_order')
    .optional()
    .isInt()
    .withMessage('Sortierreihenfolge muss eine Zahl sein'),
  handleValidationErrors
], timeStampController.createPosition);

router.put('/positions/:id', [
  requireAdmin,
  param('id')
    .isInt()
    .withMessage('Ungültige Positions-ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name darf nicht leer sein')
    .isLength({ max: 100 })
    .withMessage('Name darf maximal 100 Zeichen lang sein'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Beschreibung darf maximal 500 Zeichen lang sein'),
  body('sort_order')
    .optional()
    .isInt()
    .withMessage('Sortierreihenfolge muss eine Zahl sein'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('Aktiv-Status muss ein Boolean sein'),
  handleValidationErrors
], timeStampController.updatePosition);

module.exports = router;

