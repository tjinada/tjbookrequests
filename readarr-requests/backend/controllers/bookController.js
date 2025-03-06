// controllers/bookController.js
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
    // Use Google Books API for popular recent books
    const popularBooks = await googleBooksAPI.getPopularBooks();
    res.json(popularBooks);
  } catch (err) {
    console.error('Error getting popular books:', err);

    // Fall back to OpenLibrary if Google Books fails
    try {
      const fallbackBooks = await openLibraryAPI.getPopularBooks();
      res.json(fallbackBooks);
    } catch (fallbackErr) {
      console.error('Error with fallback popular books:', fallbackErr);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

// Get NYT bestsellers
exports.getNytBestsellers = async (req, res) => {
  try {
    // Use Google Books API for NYT bestsellers
    const nytBooks = await googleBooksAPI.getNytBestsellers();
    res.json(nytBooks);
  } catch (err) {
    console.error('Error getting NYT bestsellers:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getRecentBooks = async (req, res) => {
  try {
    // Use Google Books API for recent books
    const recentBooks = await googleBooksAPI.getRecentBooks();
    res.json(recentBooks);
  } catch (err) {
    console.error('Error getting recent books:', err);
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

exports.getGoogleBookDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Call Google Books API to get the book details
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes/${id}`);

    if (!response.data) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const book = response.data;
    const info = book.volumeInfo || {};

    // Format the response to match our standard book format
    const formattedBook = {
      id: `google-${book.id}`,
      title: info.title || 'Unknown Title',
      author: info.authors ? info.authors.join(', ') : 'Unknown Author',
      overview: info.description || '',
      cover: info.imageLinks ? (info.imageLinks.large || info.imageLinks.medium || info.imageLinks.thumbnail) : null,
      releaseDate: info.publishedDate,
      year: info.publishedDate ? parseInt(info.publishedDate.substring(0, 4)) : null,
      genres: info.categories || [],
      rating: info.averageRating || 0,
      ratings_count: info.ratingsCount || 0,
      pageCount: info.pageCount || 0,
      publisher: info.publisher || '',
      isbn: info.industryIdentifiers ? 
        info.industryIdentifiers.find(id => id.type === 'ISBN_13')?.identifier || 
        info.industryIdentifiers.find(id => id.type === 'ISBN_10')?.identifier : null,
      source: 'google'
    };

    res.json(formattedBook);
  } catch (err) {
    console.error('Error getting Google book details:', err);
    res.status(500).json({ message: 'Failed to get book details' });
  }
};

// Search books (assuming you have this already)
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