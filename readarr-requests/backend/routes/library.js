// routes/library.js
const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const auth = require('../middleware/auth');

// @route   GET api/library
// @desc    Get user's library (books tagged with their username)
// @access  Private
router.get('/', auth, libraryController.getUserLibrary);

// @route   GET api/library/download/:id/:format
// @desc    Download a book in specific format
// @access  Private
router.get('/download/:id/:format', auth, libraryController.downloadBook);

// @route   POST api/library/send-to-device
// @desc    Send book to e-reader device
// @access  Private
router.post('/send-to-device', auth, libraryController.sendToDevice);

// @route   GET api/library/reading/:id/:format
// @desc    Get book content for in-app reading
// @access  Private
router.get('/reading/:id/:format', auth, libraryController.getBookForReading);

// @route   GET api/library/formats/:id
// @desc    Get available formats for a book
// @access  Private
router.get('/formats/:id', auth, libraryController.getBookFormats);

// NEW PROXY ROUTES

// @route   GET api/library/cover/:id
// @desc    Proxy for book cover images
// @access  Private
router.get('/cover/:id', libraryController.getBookCover);

// @route   GET api/library/thumbnail/:id
// @desc    Proxy for book thumbnail images
// @access  Private
router.get('/thumbnail/:id', libraryController.getBookThumbnail);

// @route   GET api/library/asset/:type/:id
// @desc    Generic proxy for any Calibre asset
// @access  Private
router.get('/asset/:type/:id', auth, libraryController.getCalibreAsset);

module.exports = router;