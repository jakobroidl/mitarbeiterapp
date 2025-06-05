// backend/src/routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const eventController = require('../controllers/eventController');
const { authenticateToken, requireAdmin, requireStaff } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Alle Event Routes benötigen Authentifizierung
router.use(authenticateToken);

// Admin Routes
router.get('/', requireAdmin, eventController.getAllEvents);
router.get('/statistics', requireAdmin, eventController.getEventStatistics);
router.get('/:id', requireAdmin, eventController.getEventById);

router.post('/',
  requireAdmin,
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name ist erforderlich')
      .isLength({ max: 255 }).withMessage('Name darf maximal 255 Zeichen lang sein'),
    body('location')
      .trim()
      .notEmpty().withMessage('Ort ist erforderlich')
      .isLength({ max: 255 }).withMessage('Ort darf maximal 255 Zeichen lang sein'),
    body('start_date')
      .isISO8601().withMessage('Ungültiges Startdatum')
      .custom((value, { req }) => {
        const start = new Date(value);
        const now = new Date();
        if (start < now) {
          throw new Error('Startdatum muss in der Zukunft liegen');
        }
        return true;
      }),
    body('end_date')
      .isISO8601().withMessage('Ungültiges Enddatum')
      .custom((value, { req }) => {
        const start = new Date(req.body.start_date);
        const end = new Date(value);
        if (end < start) {
          throw new Error('Enddatum muss nach dem Startdatum liegen');
        }
        return true;
      }),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Beschreibung darf maximal 1000 Zeichen lang sein'),
    body('max_staff')
      .optional()
      .isInt({ min: 0 }).withMessage('Maximale Mitarbeiterzahl muss eine positive Zahl sein'),
    body('shifts')
      .optional()
      .isArray().withMessage('Schichten müssen als Array übergeben werden'),
    body('shifts.*.name')
      .if(body('shifts').exists())
      .trim()
      .notEmpty().withMessage('Schichtname ist erforderlich'),
    body('shifts.*.start_time')
      .if(body('shifts').exists())
      .isISO8601().withMessage('Ungültige Schicht-Startzeit'),
    body('shifts.*.end_time')
      .if(body('shifts').exists())
      .isISO8601().withMessage('Ungültige Schicht-Endzeit')
  ],
  handleValidationErrors,
  eventController.createEvent
);

router.put('/:id',
  requireAdmin,
  [
    param('id').isInt().withMessage('Ungültige Event ID'),
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Name darf nicht leer sein')
      .isLength({ max: 255 }).withMessage('Name darf maximal 255 Zeichen lang sein'),
    body('location')
      .optional()
      .trim()
      .notEmpty().withMessage('Ort darf nicht leer sein')
      .isLength({ max: 255 }).withMessage('Ort darf maximal 255 Zeichen lang sein'),
    body('start_date')
      .optional()
      .isISO8601().withMessage('Ungültiges Startdatum'),
    body('end_date')
      .optional()
      .isISO8601().withMessage('Ungültiges Enddatum')
      .custom((value, { req }) => {
        if (req.body.start_date) {
          const start = new Date(req.body.start_date);
          const end = new Date(value);
          if (end < start) {
            throw new Error('Enddatum muss nach dem Startdatum liegen');
          }
        }
        return true;
      })
  ],
  handleValidationErrors,
  eventController.updateEvent
);

router.patch('/:id/status',
  requireAdmin,
  [
    param('id').isInt().withMessage('Ungültige Event ID'),
    body('status')
      .isIn(['draft', 'published', 'cancelled', 'completed'])
      .withMessage('Ungültiger Status')
  ],
  handleValidationErrors,
  eventController.updateEventStatus
);

// Einladungen
router.post('/:id/invite',
  requireAdmin,
  [
    param('id').isInt().withMessage('Ungültige Event ID'),
    body('staff_ids')
      .isArray({ min: 1 }).withMessage('Mindestens ein Mitarbeiter muss ausgewählt werden')
      .custom(value => value.every(id => Number.isInteger(parseInt(id))))
      .withMessage('Ungültige Mitarbeiter IDs')
  ],
  handleValidationErrors,
  eventController.inviteStaffToEvent
);

router.delete('/:id/invite/:staffId',
  requireAdmin,
  [
    param('id').isInt().withMessage('Ungültige Event ID'),
    param('staffId').isInt().withMessage('Ungültige Mitarbeiter ID')
  ],
  handleValidationErrors,
  eventController.removeInvitation
);
// Aktualisierte Validierungen für Schichten in eventRoutes.js

// Schicht hinzufügen - AKTUALISIERT
router.post('/:id/shifts',
  requireAdmin,
  [
    param('id').isInt().withMessage('Ungültige Event ID'),
    body('name')
      .trim()
      .notEmpty().withMessage('Schichtname ist erforderlich')
      .isLength({ max: 100 }).withMessage('Schichtname darf maximal 100 Zeichen lang sein'),
    body('start_time')
      .isISO8601().withMessage('Ungültige Startzeit'),
    body('end_time')
      .isISO8601().withMessage('Ungültige Endzeit')
      .custom((value, { req }) => {
        const start = new Date(req.body.start_time);
        const end = new Date(value);
        if (end <= start) {
          throw new Error('Endzeit muss nach der Startzeit liegen');
        }
        return true;
      }),
    body('required_staff')
      .optional()
      .isInt({ min: 1 }).withMessage('Benötigte Mitarbeiterzahl muss mindestens 1 sein'),
    body('min_staff')
      .optional()
      .isInt({ min: 0 }).withMessage('Minimale Mitarbeiterzahl muss 0 oder größer sein'),
    body('max_staff')
      .optional()
      .isInt({ min: 0 }).withMessage('Maximale Mitarbeiterzahl muss 0 oder größer sein')
      .custom((value, { req }) => {
        if (value > 0 && req.body.min_staff && value < req.body.min_staff) {
          throw new Error('Maximale Mitarbeiterzahl muss größer als minimale sein');
        }
        return true;
      }),
    body('position_id')
      .optional()
      .isInt().withMessage('Ungültige Positions ID'),
    body('qualification_ids')
      .optional()
      .isArray().withMessage('Qualifikationen müssen als Array übergeben werden')
      .custom(value => {
        if (!Array.isArray(value)) return true;
        return value.every(id => Number.isInteger(parseInt(id)));
      }).withMessage('Ungültige Qualifikations-IDs'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Beschreibung darf maximal 1000 Zeichen lang sein')
  ],
  handleValidationErrors,
  eventController.addShift
);


// Schicht aktualisieren - AKTUALISIERT
router.put('/:id/shifts/:shiftId',
  requireAdmin,
  [
    param('id').isInt().withMessage('Ungültige Event ID'),
    param('shiftId').isInt().withMessage('Ungültige Schicht ID'),
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Schichtname darf nicht leer sein')
      .isLength({ max: 100 }).withMessage('Schichtname darf maximal 100 Zeichen lang sein'),
    body('start_time')
      .optional()
      .isISO8601().withMessage('Ungültige Startzeit'),
    body('end_time')
      .optional()
      .isISO8601().withMessage('Ungültige Endzeit')
      .custom((value, { req }) => {
        if (req.body.start_time) {
          const start = new Date(req.body.start_time);
          const end = new Date(value);
          if (end <= start) {
            throw new Error('Endzeit muss nach der Startzeit liegen');
          }
        }
        return true;
      }),
    body('required_staff')
      .optional()
      .isInt({ min: 1 }).withMessage('Benötigte Mitarbeiterzahl muss mindestens 1 sein'),
    body('min_staff')
      .optional()
      .isInt({ min: 0 }).withMessage('Minimale Mitarbeiterzahl muss 0 oder größer sein'),
    body('max_staff')
      .optional()
      .isInt({ min: 0 }).withMessage('Maximale Mitarbeiterzahl muss 0 oder größer sein'),
    body('position_id')
      .optional()
      .custom(isOptionalInt).withMessage('Ungültige Positions ID'),
    body('qualification_ids')
      .optional()
      .isArray().withMessage('Qualifikationen müssen als Array übergeben werden')
      .custom(value => {
        if (!Array.isArray(value)) return true;
        return value.every(id => Number.isInteger(parseInt(id)));
      }).withMessage('Ungültige Qualifikations-IDs'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Beschreibung darf maximal 1000 Zeichen lang sein')
  ],
  handleValidationErrors,
  eventController.updateShift
);





// Staff Routes
router.get('/invitations/my', requireStaff, eventController.getMyInvitations);

router.post('/invitations/:invitationId/respond',
  requireStaff,
  [
    param('invitationId').isInt().withMessage('Ungültige Einladungs ID'),
    body('response')
      .isIn(['accepted', 'declined'])
      .withMessage('Antwort muss "accepted" oder "declined" sein')
  ],
  handleValidationErrors,
  eventController.respondToInvitation
);

module.exports = router;


