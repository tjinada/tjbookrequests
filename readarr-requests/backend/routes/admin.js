// routes/admin.js (or create if doesn't exist)
const express = require('express');
const router = express.Router();
const cacheController = require('../controllers/cacheController');
const auth = require('../middleware/auth');

// Purge all caches - Admin only
router.post('/purge-cache', auth, cacheController.purgeAllCaches);

module.exports = router;