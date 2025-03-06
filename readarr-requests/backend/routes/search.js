// routes/search.js
const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const auth = require('../middleware/auth');

// Multi-source book search
router.get('/books', auth, searchController.searchBooks);

// Get book details from specific source
router.get('/books/:source/:id', auth, searchController.getBookDetails);

// Search for books by author
router.get('/author', auth, searchController.searchBooksByAuthor);

// Get author information
router.get('/author/info', auth, searchController.getAuthorInfo);

// Add book from metadata
router.post('/add', auth, searchController.addBookFromMetadata);

// Direct Readarr search
router.get('/readarr', auth, searchController.searchReadarr);

module.exports = router;