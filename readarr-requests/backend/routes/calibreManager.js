// routes/calibreManager.js
const express = require('express');
const router = express.Router();
const calibreManagerController = require('../controllers/calibreManagerController');
const auth = require('../middleware/auth');

// All routes require authentication and admin role

// @route   GET api/calibre-manager/books
// @desc    Get all books from Calibre
// @access  Private/Admin
router.get('/books', auth, calibreManagerController.getAllBooks);

// @route   GET api/calibre-manager/books/:id
// @desc    Get book details from Calibre
// @access  Private/Admin
router.get('/books/:id', auth, calibreManagerController.getBookDetails);

// @route   PUT api/calibre-manager/books/:id/tags
// @desc    Update tags for a book
// @access  Private/Admin
router.put('/books/:id/tags', auth, calibreManagerController.updateBookTags);

// @route   POST api/calibre-manager/books/bulk-update-tags
// @desc    Update tags for multiple books
// @access  Private/Admin
router.post('/books/bulk-update-tags', auth, calibreManagerController.bulkUpdateTags);

module.exports = router;