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

// Get trending/latest books
router.get('/latest', auth, bookController.getLatestBooks);

// Get popular books
router.get('/popular', auth, bookController.getPopularBooks);

// Get NYT bestsellers
router.get('/nyt', auth, bookController.getNytBestsellers);

// Get award-winning books
router.get('/awards', auth, bookController.getAwardWinners);

// Get recent books
router.get('/recent', auth, bookController.getRecentBooks);

// Search books
router.get('/search', auth, bookController.searchBooks);

// PARAMETER ROUTES LAST
// Get book details
router.get('/:id', auth, bookController.getBookDetails);

module.exports = router;