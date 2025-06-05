// backend/src/routes/timeclockRoutes.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const timeclockController = require('../controllers/timeclockController');
const { authenticateToken, requireAdmin, requireStaff } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const db = require('../config/database'); 
const emailService = require('../config/emailConfig');

// Kiosk Routes (ohne Authentifizierung)
router.post('/kiosk/clock-in',
  [
    body('personal_code')
      .trim()
      .notEmpty().withMessage('Personal-Code ist erforderlich')
      .isLength({ min: 3, max: 20 }).withMessage('Personal-Code muss zwischen 3 und 20 Zeichen lang sein'),
    body('position_id')
      .isInt({ min: 1 }).withMessage('Position ist erforderlich'),
    body('event_id')
      .optional()
      .isInt({ min: 1 }).withMessage('Ungültige Event ID'),
    body('kiosk_token')
      .optional()
      .trim()
  ],
  handleValidationErrors,
  timeclockController.kioskClockIn
);

router.post('/kiosk/clock-out',
  [
    body('personal_code')
      .trim()
      .notEmpty().withMessage('Personal-Code ist erforderlich')
      .isLength({ min: 3, max: 20 }).withMessage('Personal-Code muss zwischen 3 und 20 Zeichen lang sein'),
    body('kiosk_token')
      .optional()
      .trim()
  ],
  handleValidationErrors,
  timeclockController.kioskClockOut
);

router.get('/kiosk/status/:personal_code',
  [
    param('personal_code')
      .trim()
      .notEmpty().withMessage('Personal-Code ist erforderlich')
  ],
  handleValidationErrors,
  timeclockController.checkClockStatus
);

// Öffentliche Routes
router.get('/positions', timeclockController.getAvailablePositions);

// Geschützte Routes (benötigen Authentifizierung)
router.use(authenticateToken);

// Staff Routes
router.get('/my', requireStaff, timeclockController.getMyTimeEntries);



router.get('/report',
  requireStaff,
  async (req, res) => {
    if (req.query.staff_id === 'self') {
      const [staffResult] = await db.execute(
        'SELECT id FROM staff_profiles WHERE user_id = ?',
        [req.user.id]
      );
      if (staffResult.length > 0) {
        req.query.staff_id = staffResult[0].id;
      }
    }
    return timeclockController.exportTimeEntries(req, res);
  }
);


// Admin Routes
router.get('/', requireAdmin, timeclockController.getAllTimeEntries);

router.get('/export',
  requireAdmin,
  timeclockController.exportTimeEntries
);

router.get('/report',
  requireAdmin,
  timeclockController.generateTimeReport
);

router.get('/active',
  requireAdmin,
  timeclockController.getAllTimeEntries
);

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
        if (value && new Date(value) <= new Date(req.body.clock_in)) {
          throw new Error('Ausstempelzeit muss nach Einstempelzeit liegen');
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
    param('id').isInt().withMessage('Ungültige Eintrag ID'),
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
    param('id').isInt().withMessage('Ungültige Eintrag ID')
  ],
  handleValidationErrors,
  timeclockController.deleteTimeEntry
);

module.exports = router;
