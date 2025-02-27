// controllers/bookController.js
const openLibraryAPI = require('../config/openLibrary');
const readarrAPI = require('../config/readarr');

exports.searchBooks = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const books = await openLibraryAPI.searchBooks(query);
    res.json(books);
  } catch (err) {
    console.error('Error searching books:', err);
    res.status(500).send('Server error');
  }
};

exports.getLatestBooks = async (req, res) => {
  try {
    const latestBooks = await openLibraryAPI.getTrendingBooks();
    res.json(latestBooks);
  } catch (err) {
    console.error('Error getting latest books:', err);
    res.status(500).send('Server error');
  }
};

exports.getPopularBooks = async (req, res) => {
  try {
    const popularBooks = await openLibraryAPI.getPopularBooks();
    res.json(popularBooks);
  } catch (err) {
    console.error('Error getting popular books:', err);
    res.status(500).send('Server error');
  }
};

exports.getBookDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const bookDetails = await openLibraryAPI.getBookDetails(id);
    res.json(bookDetails);
  } catch (err) {
    console.error('Error getting book details:', err);
    res.status(500).send('Server error');
  }
};

// Get genres list
exports.getGenres = async (req, res) => {
  try {
    const genres = openLibraryAPI.getGenres();
    res.json(genres);
  } catch (err) {
    console.error('Error getting genres:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get books by genre
exports.getBooksByGenre = async (req, res) => {
  try {
    const { genre } = req.params;
    if (!genre) {
      return res.status(400).json({ message: 'Genre parameter is required' });
    }

    const books = await openLibraryAPI.getBooksByGenre(genre);
    res.json(books);
  } catch (err) {
    console.error(`Error getting books for genre ${req.params.genre}:`, err);
    res.status(500).json({ message: 'Server error' });
  }
};