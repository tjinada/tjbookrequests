// routes/adminUsers.js
const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const userActivityController = require('../controllers/userActivityController');
const auth = require('../middleware/auth');

// @route   GET api/admin/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/users', auth, adminUserController.getAllUsers);

// @route   PUT api/admin/users/:id/reset-password
// @desc    Reset a user's password
// @access  Private (Admin)
router.put('/users/:id/reset-password', auth, adminUserController.resetUserPassword);

// @route   DELETE api/admin/users/:id
// @desc    Delete a user
// @access  Private (Admin)
router.delete('/users/:id', auth, adminUserController.deleteUser);

// @route   GET api/admin/users/stats
// @desc    Get user statistics
// @access  Private (Admin)
router.get('/users/stats', auth, adminUserController.getUserStats);

// @route   GET api/admin/users/activity/metrics
// @desc    Get user activity metrics
// @access  Private (Admin)
router.get('/users/activity/metrics', auth, adminUserController.getUserActivityMetrics);

// @route   GET api/admin/users/:userId/activities
// @desc    Get activities for a specific user
// @access  Private (Admin)
router.get('/users/:userId/activities', auth, userActivityController.getUserActivities);

// @route   GET api/admin/users/:userId/activity-summary
// @desc    Get activity summary for a specific user
// @access  Private (Admin)
router.get('/users/:userId/activity-summary', auth, userActivityController.getUserActivitySummary);

module.exports = router;