// routes/recommendations.js
const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const auth = require('../middleware/auth');

// Get personalized recommendations based on user's request history
router.get('/', auth, recommendationController.getRecommendations);

module.exports = router;