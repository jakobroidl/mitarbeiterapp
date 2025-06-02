// backend/src/routes/timeStampRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const timeStampController = require('../controllers/timeStampController');

// Kiosk Mode - Öffentlich zugänglich (kein Auth erforderlich)
router.post('/kiosk', timeStampController.kioskClockIn);
router.get('/positions', timeStampController.getPositions);

// Authentifizierte Routes
router.use(authenticateToken);

// Staff routes
router.post('/clock-in', timeStampController.clockIn);
router.post('/clock-out', timeStampController.clockOut);
router.get('/my-stamps', timeStampController.getMyStamps);

// Admin routes
router.get('/all', requireAdmin, timeStampController.getAllStamps);
router.get('/export', requireAdmin, timeStampController.exportStamps);

module.exports = router;
