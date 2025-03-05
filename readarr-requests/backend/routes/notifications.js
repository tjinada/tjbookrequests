// routes/notifications.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

// @route   GET api/notifications/vapid-public-key
// @desc    Get VAPID public key for push subscription
// @access  Private
router.get('/vapid-public-key', auth, notificationController.getVapidPublicKey);

// @route   POST api/notifications/subscribe
// @desc    Subscribe to push notifications
// @access  Private
router.post('/subscribe', auth, notificationController.subscribe);

// @route   POST api/notifications/unsubscribe
// @desc    Unsubscribe from push notifications
// @access  Private
router.post('/unsubscribe', auth, notificationController.unsubscribe);

// @route   POST api/notifications/test
// @desc    Send a test notification
// @access  Private
router.post('/test', auth, notificationController.sendTestNotification);

// @route   POST api/notifications/admin-test
// @desc    Send a test notification to all admins
// @access  Private/Admin
router.post('/admin-test', auth, notificationController.sendAdminTestNotification);

module.exports = router;