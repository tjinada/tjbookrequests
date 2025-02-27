// controllers/bookController.js
const openLibraryAPI = require('../config/openLibrary');

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

// Get trending books
exports.getLatestBooks = async (req, res) => {
  try {
    const trendingBooks = await openLibraryAPI.getTrendingBooks();
    res.json(trendingBooks);
  } catch (err) {
    console.error('Error getting trending books:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get popular books
exports.getPopularBooks = async (req, res) => {
  try {
    const popularBooks = await openLibraryAPI.getPopularBooks();
    res.json(popularBooks);
  } catch (err) {
    console.error('Error getting popular books:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get NYT bestsellers
exports.getNytBestsellers = async (req, res) => {
  try {
    const nytBooks = await openLibraryAPI.getNytBestsellers();
    res.json(nytBooks);
  } catch (err) {
    console.error('Error getting NYT bestsellers:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get award-winning books
exports.getAwardWinners = async (req, res) => {
  try {
    const awardBooks = await openLibraryAPI.getAwardWinners();
    res.json(awardBooks);
  } catch (err) {
    console.error('Error getting award-winning books:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get recent books
exports.getRecentBooks = async (req, res) => {
  try {
    const recentBooks = await openLibraryAPI.getRecentBooks();
    res.json(recentBooks);
  } catch (err) {
    console.error('Error getting recent books:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get book details
exports.getBookDetails = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Book details requested for ID: ${id}`);

    // Add validation to prevent reserved route names
    if (['genres', 'genre', 'latest', 'popular', 'search', 'nyt', 'awards', 'recent'].includes(id)) {
      return res.status(400).json({ 
        message: `Invalid book ID: ${id} is a reserved route name` 
      });
    }

    const bookDetails = await openLibraryAPI.getBookDetails(id);
    res.json(bookDetails);
  } catch (err) {
    console.error('Error getting book details:', err);
    res.status(500).json({ message: 'Failed to get book details' });
  }
};

// Search books (assuming you have this already)
exports.searchBooks = async (req, res) => {
  // Your existing search implementation
};