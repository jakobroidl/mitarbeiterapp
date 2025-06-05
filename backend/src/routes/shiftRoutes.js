// backend/src/routes/shiftRoutes.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const shiftController = require('../controllers/shiftController');
const { authenticateToken, requireAdmin, requireStaff } = require('../middleware/auth');
const { handleValidationErrors, isOptionalInt } = require('../middleware/validation');
const emailService = require('../config/emailConfig');

// Alle Shift Routes benötigen Authentifizierung
router.use(authenticateToken);

// Staff Routes
router.get('/my', requireStaff, shiftController.getMyShifts);
router.get('/available', requireStaff, shiftController.getAvailableShifts);

router.post('/:shiftId/apply',
  requireStaff,
  [
    param('shiftId').isInt().withMessage('Ungültige Schicht ID')
  ],
  handleValidationErrors,
  shiftController.applyForShift
);

router.delete('/:shiftId/apply',
  requireStaff,
  [
    param('shiftId').isInt().withMessage('Ungültige Schicht ID')
  ],
  handleValidationErrors,
  shiftController.withdrawShiftApplication
);

router.post('/:shiftId/confirm',
  requireStaff,
  [
    param('shiftId').isInt().withMessage('Ungültige Schicht ID')
  ],
  handleValidationErrors,
  shiftController.confirmShiftAssignment
);

// Admin Routes
router.get('/:shiftId/applications',
  requireAdmin,
  [
    param('shiftId').isInt().withMessage('Ungültige Schicht ID')
  ],
  handleValidationErrors,
  shiftController.getShiftApplications
);

router.get('/event/:eventId/plan',
  requireAdmin,
  [
    param('eventId').isInt().withMessage('Ungültige Event ID')
  ],
  handleValidationErrors,
  shiftController.getEventShiftPlan
);

router.post('/:shiftId/assign',
  requireAdmin,
  [
    param('shiftId').isInt().withMessage('Ungültige Schicht ID'),
    body('staff_id')
      .isInt({ min: 1 }).withMessage('Mitarbeiter ist erforderlich'),
    body('position_id')
      .optional()
      .custom(isOptionalInt).withMessage('Ungültige Position ID'),
    body('status')
      .optional()
      .isIn(['preliminary', 'final']).withMessage('Ungültiger Status'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Notizen dürfen maximal 500 Zeichen lang sein')
  ],
  handleValidationErrors,
  shiftController.assignStaffToShift
);

router.post('/:shiftId/bulk-assign',
  requireAdmin,
  [
    param('shiftId').isInt().withMessage('Ungültige Schicht ID'),
    body('assignments')
      .isArray({ min: 1 }).withMessage('Mindestens eine Zuweisung erforderlich'),
    body('assignments.*.staff_id')
      .isInt({ min: 1 }).withMessage('Ungültige Mitarbeiter ID'),
    body('assignments.*.position_id')
      .optional()
      .custom(isOptionalInt).withMessage('Ungültige Position ID')
  ],
  handleValidationErrors,
  shiftController.bulkAssignStaff
);

router.delete('/:shiftId/assign/:staffId',
  requireAdmin,
  [
    param('shiftId').isInt().withMessage('Ungültige Schicht ID'),
    param('staffId').isInt().withMessage('Ungültige Mitarbeiter ID')
  ],
  handleValidationErrors,
  shiftController.removeShiftAssignment
);

router.patch('/:shiftId/status',
  requireAdmin,
  [
    param('shiftId').isInt().withMessage('Ungültige Schicht ID'),
    body('status')
      .isIn(['preliminary', 'final']).withMessage('Ungültiger Status')
  ],
  handleValidationErrors,
  shiftController.updateShiftAssignmentStatus
);

module.exports = router;
