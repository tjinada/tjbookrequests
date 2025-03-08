// routes/library.js
const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const auth = require('../middleware/auth');

// @route   GET api/library
// @desc    Get user's library
// @access  Private
router.get('/', auth, libraryController.getUserLibrary);

// @route   GET api/library/:id
// @desc    Get library book details
// @access  Private
router.get('/:id', auth, libraryController.getBookDetails);

// @route   GET api/library/:id/download
// @desc    Download book file
// @access  Private
router.get('/:id/download', auth, libraryController.downloadBook);

// @route   PUT api/library/:id
// @desc    Update library book (favorite, reading position)
// @access  Private
router.put('/:id', auth, libraryController.updateLibraryBook);

// @route   POST api/library/:id/send
// @desc    Send book to e-reader device
// @access  Private
router.post('/:id/send', auth, libraryController.sendToDevice);

// @route   POST api/library/sync
// @desc    Sync library from available requests (admin only)
// @access  Private/Admin
router.post('/sync', auth, libraryController.syncLibraryFromRequests);

module.exports = router;