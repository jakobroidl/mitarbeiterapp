const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, requireStaff } = require('../middleware/auth');

// Placeholder controllers - to be implemented
const eventController = {
  getAllEvents: (req, res) => res.json({ events: [] }),
  getEvent: (req, res) => res.json({ event: {} }),
  createEvent: (req, res) => res.status(201).json({ message: 'Event created' }),
  updateEvent: (req, res) => res.json({ message: 'Event updated' }),
  deleteEvent: (req, res) => res.json({ message: 'Event deleted' }),
  inviteStaff: (req, res) => res.json({ message: 'Staff invited' }),
  getEventShifts: (req, res) => res.json({ shifts: [] }),
  registerForShift: (req, res) => res.json({ message: 'Registered for shift' }),
};

// Public routes (for staff)
router.use(authenticateToken);

// Get all events (staff see only invited events)
router.get('/', requireStaff, eventController.getAllEvents);

// Get single event
router.get('/:id', requireStaff, eventController.getEvent);

// Get event shifts
router.get('/:id/shifts', requireStaff, eventController.getEventShifts);

// Register for shift
router.post('/:eventId/shifts/:shiftId/register', requireStaff, eventController.registerForShift);

// Admin only routes
router.post('/', requireAdmin, eventController.createEvent);
router.put('/:id', requireAdmin, eventController.updateEvent);
router.delete('/:id', requireAdmin, eventController.deleteEvent);
router.post('/:id/invite', requireAdmin, eventController.inviteStaff);

module.exports = router;
