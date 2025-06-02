const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, requireStaff } = require('../middleware/auth');
const eventController = require('../controllers/eventController'); // WICHTIG: Den echten Controller importieren!

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

// Respond to invitation (accept/decline)
router.post('/:id/respond', requireStaff, eventController.respondToInvitation);

// Admin only routes
router.post('/', requireAdmin, eventController.createEvent);
router.put('/:id', requireAdmin, eventController.updateEvent);
router.delete('/:id', requireAdmin, eventController.deleteEvent);
router.post('/:id/invite', requireAdmin, eventController.inviteStaff);

module.exports = router;
