// routes/requests.js
const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const auth = require('../middleware/auth');

// @route   POST api/requests
// @desc    Create a request
// @access  Private
router.post('/', auth, requestController.createRequest);

// @route   GET api/requests/me
// @desc    Get user's requests
// @access  Private
router.get('/me', auth, requestController.getUserRequests);

// @route   GET api/requests
// @desc    Get all requests (admin only)
// @access  Private/Admin
router.get('/', auth, requestController.getAllRequests);

// @route   PUT api/requests/:id
// @desc    Update request status (admin only)
// @access  Private/Admin
router.put('/:id', auth, requestController.updateRequestStatus);

module.exports = router;