// backend/src/routes/shiftRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const shiftController = require('../controllers/shiftController');

router.use(authenticateToken);

// Create shift for an event (Admin route)
router.post('/events/:eventId/shifts', requireAdmin, shiftController.createShift);

// Get shifts for an event (Admin route)
router.get('/events/:eventId/shifts', requireAdmin, shiftController.getEventShifts);

// Update shift (Admin route)
router.put('/:id', requireAdmin, shiftController.updateShift);

// Delete shift (Admin route)
router.delete('/:id', requireAdmin, shiftController.deleteShift);

// Assign staff to shift (Admin route)
router.post('/:id/assign', requireAdmin, shiftController.assignStaff);

// Remove staff from shift (Admin route)
router.delete('/:id/staff/:staffId', requireAdmin, shiftController.removeStaff);

// Confirm shift assignment (Staff route)
router.post('/:id/confirm', shiftController.confirmAssignment);

module.exports = router;
