// routes/adminUsers.js
const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const auth = require('../middleware/auth');

// @route   GET api/admin/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/users', auth, adminUserController.getAllUsers);

// @route   DELETE api/admin/users/:id
// @desc    Delete a user
// @access  Private (Admin)
router.delete('/users/:id', auth, adminUserController.deleteUser);

// @route   GET api/admin/users/stats
// @desc    Get user statistics
// @access  Private (Admin)
router.get('/users/stats', auth, adminUserController.getUserStats);

module.exports = router;