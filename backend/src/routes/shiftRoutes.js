const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const shiftController = require('../controllers/shiftController');

// All shift routes require authentication
router.use(authenticateToken);

// Get single shift details
router.get('/:shiftId', shiftController.getShift);

// Update shift (admin only) - für direkte Updates ohne Event-Context
router.put('/:shiftId', requireAdmin, shiftController.updateShift);

// Delete shift (admin only) - für direkte Löschung ohne Event-Context
router.delete('/:shiftId', requireAdmin, shiftController.deleteShift);

// Get shift registrations (admin only)
router.get('/:shiftId/registrations', requireAdmin, shiftController.getShiftRegistrations);

module.exports = router;
