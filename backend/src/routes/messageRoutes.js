const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Placeholder controller
const messageController = {
  getMessages: (req, res) => res.json({ messages: [] }),
  sendMessage: (req, res) => res.status(201).json({ message: 'Message sent' }),
  deleteMessage: (req, res) => res.json({ message: 'Message deleted' }),
  sendAnnouncement: (req, res) => res.json({ message: 'Announcement sent' }),
};

router.use(authenticateToken);

// Public routes
router.get('/', messageController.getMessages);
router.post('/', messageController.sendMessage);

// Admin routes
router.delete('/:id', requireAdmin, messageController.deleteMessage);
router.post('/announcement', requireAdmin, messageController.sendAnnouncement);

module.exports = router;
