const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All user routes require authentication
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', requireAdmin, userController.getAllUsers);

// Get single user
router.get('/:id', userController.getUser);

// Update user (admin or self)
router.put('/:id', userController.updateUser);

// Delete user (admin only)
router.delete('/:id', requireAdmin, userController.deleteUser);

// Toggle user active status (admin only)
router.patch('/:id/toggle-active', requireAdmin, userController.toggleUserActive);

// Update user qualifications (admin only)
router.put('/:id/qualifications', requireAdmin, userController.updateUserQualifications);

// Update user profile
router.put('/me/profile', userController.updateUserProfile);

// Update user profile
router.put('/me/profile', userController.updateUserProfile);



module.exports = router;
