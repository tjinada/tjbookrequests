// routes/webhooks.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Verify webhook comes from Readarr using a shared secret
router.post('/readarr', webhookController.validateWebhook, webhookController.processReadarrWebhook);

// Test webhook route for debugging
router.post('/test', webhookController.validateWebhook, webhookController.testWebhook);

module.exports = router;