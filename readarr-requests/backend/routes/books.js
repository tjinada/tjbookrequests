// routes/books.js
const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const auth = require('../middleware/auth');

// SPECIFIC ROUTES FIRST
// Get all genres
router.get('/genres', auth, bookController.getGenres);

// Get books by genre
router.get('/genre/:genre', auth, bookController.getBooksByGenre);

// Get latest/trending books
router.get('/latest', auth, bookController.getLatestBooks);

// Get popular books
router.get('/popular', auth, bookController.getPopularBooks);

// Search books (make sure this is before the :id route)
router.get('/search', auth, bookController.searchBooks);

// PARAMETER ROUTES LAST
// Get book details (this must be last because it will match any /books/:something)
router.get('/:id', auth, bookController.getBookDetails);

module.exports = router;