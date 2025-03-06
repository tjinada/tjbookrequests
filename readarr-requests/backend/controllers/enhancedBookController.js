// backend/controllers/enhancedBookController.js
const recommendationService = require('../services/recommendationService');
const openLibraryAPI = require('../config/openLibrary');
const googleBooksAPI = require('../config/googleBooks');

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

// Get books by genre with enhanced relevance
exports.getBooksByGenre = async (req, res) => {
  try {
    const { genre } = req.params;
    if (!genre) {
      return res.status(400).json({ message: 'Genre parameter is required' });
    }

    const books = await recommendationService.getBooksByGenre(genre);
    res.json(books);
  } catch (err) {
    console.error(`Error getting books for genre ${req.params.genre}:`, err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get trending books
exports.getLatestBooks = async (req, res) => {
  try {
    const trendingBooks = await recommendationService.getTrendingBooks();
    res.json(trendingBooks);
  } catch (err) {
    console.error('Error getting trending books:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get popular books
exports.getPopularBooks = async (req, res) => {
  try {
    const popularBooks = await recommendationService.getPopularBooks();
    res.json(popularBooks);
  } catch (err) {
    console.error('Error getting popular books:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get NYT bestsellers
exports.getNytBestsellers = async (req, res) => {
  try {
    const nytBooks = await recommendationService.getNYTBestsellers();
    res.json(nytBooks);
  } catch (err) {
    console.error('Error getting NYT bestsellers:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get award-winning books
exports.getAwardWinners = async (req, res) => {
  try {
    const awardBooks = await recommendationService.getAwardWinners();
    res.json(awardBooks);
  } catch (err) {
    console.error('Error getting award-winning books:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get recent books
exports.getRecentBooks = async (req, res) => {
  try {
    const recentBooks = await recommendationService.getRecentBooks();
    res.json(recentBooks);
  } catch (err) {
    console.error('Error getting recent books:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get personalized recommendations
exports.getPersonalizedRecommendations = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userId = req.user.id;
    const recommendations = await recommendationService.getPersonalizedRecommendations(userId);
    res.json(recommendations);
  } catch (err) {
    console.error('Error getting personalized recommendations:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get book details
exports.getBookDetails = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Book details requested for ID: ${id}`);

    // Add validation to prevent reserved route names
    if (['genres', 'genre', 'latest', 'popular', 'search', 'nyt', 'awards', 'recent', 'personalized'].includes(id)) {
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

// Get Google book details
exports.getGoogleBookDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Call Google Books API to get the book details
    const bookDetails = await googleBooksAPI.getBookDetails(id);
    
    if (!bookDetails) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json(bookDetails);
  } catch (err) {
    console.error('Error getting Google book details:', err);
    res.status(500).json({ message: 'Failed to get book details' });
  }
};

// Search books
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

// Purge all recommendation caches
exports.purgeRecommendationCache = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to purge cache' });
    }

    // Purge recommendation service cache
    const success = recommendationService.purgeCache();

    // Return success
    return res.json({ 
      success, 
      message: 'Recommendation cache successfully purged. New recommendations will be generated on next request.' 
    });
  } catch (error) {
    console.error('Error purging recommendation cache:', error);
    return res.status(500).json({ message: 'Error purging recommendation cache' });
  }
};