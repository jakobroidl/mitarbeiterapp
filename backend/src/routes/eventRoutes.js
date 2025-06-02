const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, requireStaff } = require('../middleware/auth');
const eventController = require('../controllers/eventController');

// Public routes (for staff)
router.use(authenticateToken);

// Get all events (staff see only invited events)
router.get('/', requireStaff, eventController.getAllEvents);

// Get single event
router.get('/:id', requireStaff, eventController.getEvent);

// Get shifts for an event
router.get('/:eventId/shifts', requireStaff, eventController.getEventShifts);

// Register for shift
router.post('/:eventId/shifts/:shiftId/register', requireStaff, eventController.registerForShift);

// Respond to invitation (accept/decline)
router.post('/:id/respond', requireStaff, eventController.respondToInvitation);

// Admin only routes
router.post('/', requireAdmin, eventController.createEvent);
router.put('/:id', requireAdmin, eventController.updateEvent);
router.delete('/:id', requireAdmin, eventController.deleteEvent);
router.post('/:id/invite', requireAdmin, eventController.inviteStaff);

// Admin shift management
router.post('/:eventId/shifts', requireAdmin, eventController.createEventShift);
router.put('/:eventId/shifts/:shiftId', requireAdmin, eventController.updateEventShift);
router.delete('/:eventId/shifts/:shiftId', requireAdmin, eventController.deleteEventShift);

module.exports = router;
