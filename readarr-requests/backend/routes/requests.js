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

router.post('/check-status', auth, requestController.checkRequestsStatus);

// @route   POST api/requests/:id/metadata
// @desc    Manually update metadata for a specific request (admin only)
// @access  Private/Admin
router.post('/:id/metadata', auth, requestController.updateRequestMetadata);

// @route   PUT api/requests/:id/reset-readarr
// @desc    Reset Readarr status for a request (admin only)
// @access  Private/Admin
router.put('/:id/reset-readarr', auth, requestController.resetReadarrStatus);

// @route   PUT api/requests/:id/external-download
// @desc    Mark book as externally downloaded (admin only)
// @access  Private/Admin
router.put('/:id/external-download', auth, requestController.markExternallyDownloaded);


module.exports = router;