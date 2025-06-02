// backend/src/routes/shiftRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const shiftController = require('../controllers/shiftController');

router.use(authenticateToken);

// Get shifts for an event
router.get('/events/:eventId/shifts', requireAdmin, shiftController.getEventShifts);

// Shift management
router.post('/events/:eventId/shifts', requireAdmin, shiftController.createShift);
router.put('/shifts/:id', requireAdmin, shiftController.updateShift);
router.delete('/shifts/:id', requireAdmin, shiftController.deleteShift);

// Staff assignment
router.post('/shifts/:id/assign', requireAdmin, shiftController.assignStaff);
router.delete('/shifts/:id/staff/:staffId', requireAdmin, shiftController.removeStaff);

// Staff confirmation
router.post('/shifts/:id/confirm', requireStaff, shiftController.confirmAssignment);

module.exports = router;
