// backend/src/routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Alle Message Routes benötigen Authentifizierung
router.use(authenticateToken);

// Nachrichten abrufen
router.get('/', messageController.getMessages);
router.get('/sent', messageController.getSentMessages);
router.get('/stats', messageController.getMessageStats);
router.get('/recipients', messageController.getAvailableRecipients);

router.get('/:id',
  [
    param('id').isInt().withMessage('Ungültige Nachrichten ID')
  ],
  handleValidationErrors,
  messageController.getMessage
);

// Nachricht senden
router.post('/send',
  [
    body('subject')
      .trim()
      .notEmpty().withMessage('Betreff ist erforderlich')
      .isLength({ max: 255 }).withMessage('Betreff darf maximal 255 Zeichen lang sein'),
    body('content')
      .trim()
      .notEmpty().withMessage('Nachrichteninhalt ist erforderlich')
      .isLength({ max: 5000 }).withMessage('Nachricht darf maximal 5000 Zeichen lang sein'),
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high']).withMessage('Ungültige Priorität'),
    body('send_to_all')
      .optional()
      .isBoolean().withMessage('send_to_all muss ein Boolean sein'),
    body('recipient_ids')
      .optional()
      .isArray().withMessage('Empfänger müssen als Array übergeben werden')
      .custom((value, { req }) => {
        // Entweder send_to_all oder recipient_ids muss gesetzt sein
        if (!req.body.send_to_all && (!value || value.length === 0)) {
          throw new Error('Mindestens ein Empfänger muss ausgewählt werden');
        }
        return true;
      })
  ],
  handleValidationErrors,
  messageController.sendMessage
);

// Nachrichtenstatus ändern
router.patch('/:id/read',
  [
    param('id').isInt().withMessage('Ungültige Nachrichten ID')
  ],
  handleValidationErrors,
  messageController.markAsRead
);

router.patch('/:id/unread',
  [
    param('id').isInt().withMessage('Ungültige Nachrichten ID')
  ],
  handleValidationErrors,
  messageController.markAsUnread
);

// Nachricht löschen
router.delete('/:id',
  [
    param('id').isInt().withMessage('Ungültige Nachrichten ID')
  ],
  handleValidationErrors,
  messageController.deleteMessage
);

module.exports = router;
