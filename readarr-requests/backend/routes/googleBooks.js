// routes/googleBooks.js
const express = require('express');
const router = express.Router();
const googleBooksController = require('../controllers/googleBooksController');
const auth = require('../middleware/auth');

// All routes require authentication

// Get genres list
router.get('/genres', auth, googleBooksController.getGenres);

// Get books by genre
router.get('/genre/:genre', auth, googleBooksController.getBooksByGenre);

// Get trending books
router.get('/trending', auth, googleBooksController.getTrendingBooks);

// Get popular books
router.get('/popular', auth, googleBooksController.getPopularBooks);

// Get NYT bestsellers
router.get('/nyt', auth, googleBooksController.getNytBestsellers);

// Get award-winning books
router.get('/awards', auth, googleBooksController.getAwardWinners);

// Search books
router.get('/search', auth, googleBooksController.searchBooks);

// Search books by author
router.get('/author', auth, googleBooksController.searchBooksByAuthor);

// Get book details
router.get('/book/:id', auth, googleBooksController.getBookDetails);

// Purge cache (admin only)
router.post('/purge-cache', auth, (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized to purge cache' });
  }
  
  // Call controller method
  googleBooksController.purgeCache(req, res);
});

module.exports = router;