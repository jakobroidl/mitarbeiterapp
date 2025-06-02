const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Placeholder controller
const timeStampController = {
  clockIn: (req, res) => res.json({ message: 'Clocked in successfully' }),
  clockOut: (req, res) => res.json({ message: 'Clocked out successfully' }),
  getMyStamps: (req, res) => res.json({ stamps: [] }),
  getAllStamps: (req, res) => res.json({ stamps: [] }),
  exportStamps: (req, res) => res.json({ message: 'Export created' }),
  kioskClockIn: (req, res) => res.json({ message: 'Kiosk clock in successful' }),
};

router.use(authenticateToken);

// Staff routes
router.post('/clock-in', timeStampController.clockIn);
router.post('/clock-out', timeStampController.clockOut);
router.get('/my-stamps', timeStampController.getMyStamps);

// Admin routes
router.get('/all', requireAdmin, timeStampController.getAllStamps);
router.get('/export', requireAdmin, timeStampController.exportStamps);

// Kiosk mode (special authentication)
router.post('/kiosk', timeStampController.kioskClockIn);

module.exports = router;
