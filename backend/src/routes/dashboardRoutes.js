const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// All dashboard routes require authentication
router.use(authenticateToken);

// Get dashboard overview
router.get('/overview', dashboardController.getOverview);

// Get activity feed
router.get('/activity', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Seite muss eine positive Zahl sein'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit muss zwischen 1 und 50 liegen'),
  handleValidationErrors
], dashboardController.getActivityFeed);

// Get quick stats
router.get('/stats', dashboardController.getQuickStats);

module.exports = router;
