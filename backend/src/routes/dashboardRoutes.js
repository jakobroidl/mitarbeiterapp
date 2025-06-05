// backend/src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireAdmin, requireStaff } = require('../middleware/auth');
const emailService = require('../config/emailConfig');

// Alle Dashboard Routes benötigen Authentifizierung
router.use(authenticateToken);

// Admin Dashboard Routes
router.get('/admin/dashboard/stats', requireAdmin, dashboardController.getAdminDashboardStats);
router.get('/admin/activity', requireAdmin, dashboardController.getRecentActivities);

// Staff Dashboard Routes
router.get('/staff/dashboard/stats', requireStaff, dashboardController.getStaffDashboardStats);
router.get('/staff/shifts/upcoming', requireStaff, dashboardController.getUpcomingShifts);
router.get('/staff/invitations', requireStaff, dashboardController.getPendingInvitations);
router.get('/staff/messages/unread', requireStaff, dashboardController.getUnreadMessages);
router.get('/staff/timeclock/current', requireStaff, dashboardController.getCurrentTimeclockEntry);

// Shared Routes (beide Rollen)
router.get('/timeclock/active', requireAdmin, dashboardController.getActiveTimeclockEntries);

module.exports = router;
