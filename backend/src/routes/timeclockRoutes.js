// backend/src/routes/timeclockRoutes.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const timeclockController = require('../controllers/timeclockController');
const { authenticateToken, requireAdmin, requireStaff } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Kiosk Mode Routes (keine Authentifizierung erforderlich)
router.post('/kiosk/clock-in',
  [
    body('personal_code')
      .trim()
      .notEmpty().withMessage('Personal-Code ist erforderlich')
      .isLength({ min: 6, max: 20 }).withMessage('Ungültiger Personal-Code'),
    body('position_id')
      .isInt({ min: 1 }).withMessage('Position ist erforderlich'),
    body('event_id')
      .optional()
      .isInt({ min: 1 }).withMessage('Ungültige Event ID'),
    body('kiosk_token')
      .notEmpty().withMessage('Kiosk-Token ist erforderlich')
  ],
  handleValidationErrors,
  timeclockController.kioskClockIn
);

router.post('/kiosk/clock-out',
  [
    body('personal_code')
      .trim()
      .notEmpty().withMessage('Personal-Code ist erforderlich')
      .isLength({ min: 6, max: 20 }).withMessage('Ungültiger Personal-Code'),
    body('kiosk_token')
      .notEmpty().withMessage('Kiosk-Token ist erforderlich')
  ],
  handleValidationErrors,
  timeclockController.kioskClockOut
);

router.get('/kiosk/status/:personal_code',
  [
    param('personal_code')
      .trim()
      .notEmpty().withMessage('Personal-Code ist erforderlich')
      .isLength({ min: 6, max: 20 }).withMessage('Ungültiger Personal-Code')
  ],
  handleValidationErrors,
  timeclockController.checkClockStatus
);

// Verfügbare Positionen (öffentlich für Kiosk)
router.get('/positions', timeclockController.getAvailablePositions);

// Authentifizierte Routes
router.use(authenticateToken);

// Staff Routes
router.get('/my', requireStaff, timeclockController.getMyTimeEntries);

// Admin Routes
router.get('/', requireAdmin, timeclockController.getAllTimeEntries);
router.get('/report', requireAdmin, timeclockController.generateTimeReport);
router.get('/export', requireAdmin, timeclockController.exportTimeEntries);

router.post('/manual',
  requireAdmin,
  [
    body('staff_id')
      .isInt({ min: 1 }).withMessage('Mitarbeiter ist erforderlich'),
    body('position_id')
      .isInt({ min: 1 }).withMessage('Position ist erforderlich'),
    body('event_id')
      .optional()
      .isInt({ min: 1 }).withMessage('Ungültige Event ID'),
    body('clock_in')
      .isISO8601().withMessage('Ungültige Einstempelzeit'),
    body('clock_out')
      .optional()
      .isISO8601().withMessage('Ungültige Ausstempelzeit')
      .custom((value, { req }) => {
        if (value) {
          const clockIn = new Date(req.body.clock_in);
          const clockOut = new Date(value);
          if (clockOut <= clockIn) {
            throw new Error('Ausstempelzeit muss nach Einstempelzeit liegen');
          }
        }
        return true;
      }),
    body('break_minutes')
      .optional()
      .isInt({ min: 0 }).withMessage('Pausenzeit muss eine positive Zahl sein'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Notizen dürfen maximal 500 Zeichen lang sein')
  ],
  handleValidationErrors,
  timeclockController.manualClockEntry
);

router.put('/:id',
  requireAdmin,
  [
    param('id').isInt().withMessage('Ungültige Eintrags ID'),
    body('clock_in')
      .optional()
      .isISO8601().withMessage('Ungültige Einstempelzeit'),
    body('clock_out')
      .optional()
      .isISO8601().withMessage('Ungültige Ausstempelzeit'),
    body('break_minutes')
      .optional()
      .isInt({ min: 0 }).withMessage('Pausenzeit muss eine positive Zahl sein'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Notizen dürfen maximal 500 Zeichen lang sein')
  ],
  handleValidationErrors,
  timeclockController.updateTimeEntry
);

router.delete('/:id',
  requireAdmin,
  [
    param('id').isInt().withMessage('Ungültige Eintrags ID')
  ],
  handleValidationErrors,
  timeclockController.deleteTimeEntry
);

module.exports = router;


