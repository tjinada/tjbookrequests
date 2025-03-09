// routes/library.js
const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const auth = require('../middleware/auth');

// @route   GET api/library
// @desc    Get user's library books (books tagged with user's username)
// @access  Private
router.get('/', auth, libraryController.getUserLibrary);

// @route   GET api/library/book/:bookId/formats
// @desc    Get available formats for a book
// @access  Private
router.get('/book/:bookId/formats', auth, libraryController.getBookFormats);

// @route   GET api/library/book/:bookId/download/:format
// @desc    Download a book in a specific format
// @access  Private
router.get('/book/:bookId/download/:format', auth, libraryController.getBookDownloadLink);

// @route   POST api/library/book/:bookId/send-to-ereader
// @desc    Send book to user's e-reader device
// @access  Private
router.post('/book/:bookId/send-to-ereader', auth, libraryController.sendToEreader);

module.exports = router;