const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const shiftController = require('../controllers/shiftController');

router.use(authenticateToken, requireAdmin);

router.get('/events/:eventId/shifts', shiftController.getEventShifts);
router.post('/events/:eventId/shifts', requireAdmin, shiftController.createShift);
router.put('/:shiftId', shiftController.updateShift);
router.delete('/:shiftId', shiftController.deleteShift);

module.exports = router;
