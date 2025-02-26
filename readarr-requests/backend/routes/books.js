// routes/books.js
const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const auth = require('../middleware/auth');

// @route   GET api/books/search
// @desc    Search books
// @access  Private
router.get('/search', auth, bookController.searchBooks);

// @route   GET api/books/latest
// @desc    Get latest books
// @access  Private
router.get('/latest', auth, bookController.getLatestBooks);

// @route   GET api/books/:id
// @desc    Get book details
// @access  Private
router.get('/:id', auth, bookController.getBookDetails);

module.exports = router;