// controllers/googleBooksController.js
const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// Set up logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(__dirname, '../logs/google-books.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

// Create axios instance for Google Books API
const googleBooksAPI = axios.create({
  baseURL: 'https://www.googleapis.com/books/v1',
  timeout: 10000,
  params: {
    key: process.env.GOOGLE_BOOKS_API_KEY
  }
});

// Cache for Google Books API responses
const cache = {
  trending: null,
  popular: null,
  nyt: null,
  awards: null,
  genres: null,
  genreBooks: {},
  searches: {},
  trendingTimestamp: 0,
  popularTimestamp: 0,
  nytTimestamp: 0,
  awardsTimestamp: 0,
  genresTimestamp: 0,
  genreBooksTimestamps: {},
  searchTimestamps: {},
  bookDetails: {},
  bookDetailsTimestamps: {}
};

// Cache expiration time (2 hours for most data)
const CACHE_EXPIRY = 2 * 60 * 60 * 1000;
// Cache expiration for searches (30 minutes)
const SEARCH_CACHE_EXPIRY = 30 * 60 * 1000;

// Process Google Books data to match our format
const processGoogleBook = (book) => {
  if (!book.volumeInfo) return null;

  const info = book.volumeInfo;
  
  // Extract primary ISBN
  let isbn = null;
  if (info.industryIdentifiers && info.industryIdentifiers.length > 0) {
    // Prefer ISBN_13, fallback to ISBN_10
    const isbn13 = info.industryIdentifiers.find(id => id.type === 'ISBN_13');
    const isbn10 = info.industryIdentifiers.find(id => id.type === 'ISBN_10');
    isbn = isbn13 ? isbn13.identifier : (isbn10 ? isbn10.identifier : null);
  }
  
  // Extract best available image
  let coverImage = null;
  if (info.imageLinks) {
    // Try to get the best available image in this order
    coverImage = info.imageLinks.extraLarge || 
               info.imageLinks.large || 
               info.imageLinks.medium || 
               info.imageLinks.small || 
               info.imageLinks.thumbnail;
  }
  
  return {
    id: `gb-${book.id}`,
    title: info.title || 'Unknown Title',
    author: info.authors ? info.authors.join(', ') : 'Unknown Author',
    overview: info.description || '',
    cover: coverImage,
    releaseDate: info.publishedDate,
    year: info.publishedDate ? parseInt(info.publishedDate.substring(0, 4)) : null,
    rating: info.averageRating || 0,
    ratings_count: info.ratingsCount || 0,
    source: 'google',
    genres: info.categories || [],
    isbn: isbn,
    pageCount: info.pageCount || 0,
    publisher: info.publisher || '',
    language: info.language || 'en',
    googleId: book.id,
    // Add detailed author information for better matching
    authorInfo: info.authors ? info.authors.map(author => ({
      name: author,
    })) : [{name: 'Unknown Author'}]
  };
};

// Define our standard genres
const standardGenres = [
  { id: 'fiction', name: 'Fiction' },
  { id: 'science-fiction', name: 'Science Fiction' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'mystery', name: 'Mystery' },
  { id: 'thriller', name: 'Thriller' },
  { id: 'romance', name: 'Romance' },
  { id: 'history', name: 'History' },
  { id: 'biography', name: 'Biography' },
  { id: 'horror', name: 'Horror' },
  { id: 'young-adult', name: 'Young Adult' },
  { id: 'childrens', name: 'Children\'s' },
  { id: 'poetry', name: 'Poetry' },
  { id: 'business', name: 'Business' },
  { id: 'philosophy', name: 'Philosophy' },
  { id: 'self-help', name: 'Self-Help' },
  { id: 'comics', name: 'Comics & Graphic Novels' }
];

/**
 * Get list of available genres
 */
exports.getGenres = (req, res) => {
  try {
    // Check cache first
    const now = Date.now();
    if (cache.genres && now - cache.genresTimestamp < CACHE_EXPIRY) {
      return res.json(cache.genres);
    }
    
    // Return standard genres
    cache.genres = standardGenres;
    cache.genresTimestamp = now;
    
    return res.json(standardGenres);
  } catch (error) {
    log(`Error getting genres: ${error.message}`);
    res.status(500).json({ message: 'Error fetching genres' });
  }
};

/**
 * Get trending books
 */
exports.getTrendingBooks = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 40;
    
    // Check cache first
    const now = Date.now();
    if (cache.trending && now - cache.trendingTimestamp < CACHE_EXPIRY) {
      log('Using cached Google Books trending books');
      return res.json(cache.trending.slice(0, limit));
    }

    // Current year and month for recency
    const currentYear = new Date().getFullYear();
    const lastTwoYears = `${currentYear-2}-${currentYear}`;

    // Search for trending books - recent + popular
    const response = await googleBooksAPI.get('/volumes', {
      params: {
        q: `subject:fiction+publishedDate:${lastTwoYears}+orderBy:newest`,
        orderBy: 'relevance',
        printType: 'books',
        maxResults: Math.min(40, limit)
      }
    });

    if (!response.data || !response.data.items) {
      return res.json([]);
    }

    // Process books and filter out any without covers or with incomplete data
    const books = response.data.items
      .map(processGoogleBook)
      .filter(book => book && book.cover);

    // Cache the results
    cache.trending = books;
    cache.trendingTimestamp = now;

    return res.json(books.slice(0, limit));
  } catch (error) {
    log(`Error getting trending books: ${error.message}`);
    res.status(500).json({ message: 'Error fetching trending books' });
  }
};

/**
 * Get popular books
 */
exports.getPopularBooks = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 40;
    
    // Check cache first
    const now = Date.now();
    if (cache.popular && now - cache.popularTimestamp < CACHE_EXPIRY) {
      log('Using cached Google Books popular books');
      return res.json(cache.popular.slice(0, limit));
    }

    // Search for popular books
    const response = await googleBooksAPI.get('/volumes', {
      params: {
        q: 'subject:fiction',
        orderBy: 'relevance',
        printType: 'books',
        maxResults: Math.min(40, limit),
        langRestrict: 'en'
      }
    });

    if (!response.data || !response.data.items) {
      return res.json([]);
    }

    // Process books and filter out any without covers
    const books = response.data.items
      .map(processGoogleBook)
      .filter(book => book && book.cover);

    // Sort by rating (descending) and then by year (descending)
    books.sort((a, b) => {
      // First sort by rating
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      
      // If ratings are equal, sort by year (newer first)
      return (b.year || 0) - (a.year || 0);
    });

    // Cache the results
    cache.popular = books;
    cache.popularTimestamp = now;

    return res.json(books.slice(0, limit));
  } catch (error) {
    log(`Error getting popular books: ${error.message}`);
    res.status(500).json({ message: 'Error fetching popular books' });
  }
};

/**
 * Get NYT bestsellers
 */
exports.getNytBestsellers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 40;
    
    // Check cache first
    const now = Date.now();
    if (cache.nyt && now - cache.nytTimestamp < CACHE_EXPIRY) {
      log('Using cached Google Books NYT bestsellers');
      return res.json(cache.nyt.slice(0, limit));
    }

    // Search for NYT bestsellers
    const response = await googleBooksAPI.get('/volumes', {
      params: {
        q: 'subject:fiction+bestseller+new+york+times',
        orderBy: 'relevance',
        printType: 'books',
        maxResults: Math.min(40, limit)
      }
    });

    if (!response.data || !response.data.items) {
      return res.json([]);
    }

    // Process books and filter out any without covers
    const books = response.data.items
      .map(processGoogleBook)
      .filter(book => book && book.cover);

    // Cache the results
    cache.nyt = books;
    cache.nytTimestamp = now;

    return res.json(books.slice(0, limit));
  } catch (error) {
    log(`Error getting NYT bestsellers: ${error.message}`);
    res.status(500).json({ message: 'Error fetching NYT bestsellers' });
  }
};

/**
 * Get award-winning books
 */
exports.getAwardWinners = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 40;
    
    // Check cache first
    const now = Date.now();
    if (cache.awards && now - cache.awardsTimestamp < CACHE_EXPIRY) {
      log('Using cached Google Books award winners');
      return res.json(cache.awards.slice(0, limit));
    }

    // Search for award-winning books
    const response = await googleBooksAPI.get('/volumes', {
      params: {
        q: 'award+winner+subject:fiction',
        orderBy: 'relevance',
        printType: 'books',
        maxResults: Math.min(40, limit)
      }
    });

    if (!response.data || !response.data.items) {
      return res.json([]);
    }

    // Process books and filter out any without covers
    const books = response.data.items
      .map(processGoogleBook)
      .filter(book => book && book.cover);

    // Cache the results
    cache.awards = books;
    cache.awardsTimestamp = now;

    return res.json(books.slice(0, limit));
  } catch (error) {
    log(`Error getting award-winning books: ${error.message}`);
    res.status(500).json({ message: 'Error fetching award-winning books' });
  }
};

/**
 * Get books by genre
 */
exports.getBooksByGenre = async (req, res) => {
  try {
    const { genre } = req.params;
    const limit = parseInt(req.query.limit) || 40;
    
    if (!genre) {
      return res.status(400).json({ message: 'Genre parameter is required' });
    }
    
    // Check if it's a valid genre
    const validGenre = standardGenres.find(g => g.id === genre);
    if (!validGenre) {
      return res.status(400).json({ message: 'Invalid genre' });
    }
    
    // Check cache first
    const now = Date.now();
    if (cache.genreBooks[genre] && now - (cache.genreBooksTimestamps[genre] || 0) < CACHE_EXPIRY) {
      log(`Using cached books for genre: ${genre}`);
      return res.json(cache.genreBooks[genre].slice(0, limit));
    }
    
    // Convert genre ID to proper search term
    const searchTerm = validGenre.name.replace('\'s', 's');
    
    // Search for books in this genre
    const response = await googleBooksAPI.get('/volumes', {
      params: {
        q: `subject:${searchTerm}`,
        orderBy: 'relevance',
        printType: 'books',
        maxResults: Math.min(40, limit)
      }
    });
    
    if (!response.data || !response.data.items) {
      return res.json([]);
    }
    
    // Process books and filter out any without covers
    const books = response.data.items
      .map(processGoogleBook)
      .filter(book => book && book.cover);
    
    // Sort by rating and then by year
    books.sort((a, b) => {
      // First sort by rating
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      
      // If ratings are equal, sort by year (newer first)
      return (b.year || 0) - (a.year || 0);
    });
    
    // Cache the results
    cache.genreBooks[genre] = books;
    cache.genreBooksTimestamps[genre] = now;
    
    return res.json(books.slice(0, limit));
  } catch (error) {
    log(`Error getting books for genre ${req.params.genre}: ${error.message}`);
    res.status(500).json({ message: 'Error fetching genre books' });
  }
};

/**
 * Search books
 */
exports.searchBooks = async (req, res) => {
  try {
    const { query } = req.query;
    const limit = parseInt(req.query.limit) || 40;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Check cache first
    const cacheKey = `${query}-${limit}`;
    const now = Date.now();
    if (cache.searches[cacheKey] && now - (cache.searchTimestamps[cacheKey] || 0) < SEARCH_CACHE_EXPIRY) {
      log(`Using cached search results for: "${query}"`);
      return res.json(cache.searches[cacheKey]);
    }
    
    // Perform API search
    const response = await googleBooksAPI.get('/volumes', {
      params: {
        q: query,
        maxResults: Math.min(40, limit),
        orderBy: 'relevance',
        printType: 'books'
      }
    });
    
    if (!response.data || !response.data.items) {
      return res.json([]);
    }
    
    // Process books and filter out incomplete data
    const books = response.data.items
      .map(processGoogleBook)
      .filter(book => book !== null);
    
    // Cache the results
    cache.searches[cacheKey] = books;
    cache.searchTimestamps[cacheKey] = now;
    
    return res.json(books);
  } catch (error) {
    log(`Error searching books: ${error.message}`);
    res.status(500).json({ message: 'Error searching books' });
  }
};

/**
 * Get book details
 */
exports.getBookDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'Book ID is required' });
    }
    
    // Strip 'gb-' prefix if present
    const googleId = id.startsWith('gb-') ? id.substring(3) : id;
    
    // Check cache first
    const now = Date.now();
    if (cache.bookDetails[googleId] && now - (cache.bookDetailsTimestamps[googleId] || 0) < CACHE_EXPIRY) {
      log(`Using cached book details for ID: ${googleId}`);
      return res.json(cache.bookDetails[googleId]);
    }
    
    // Fetch book details
    const response = await googleBooksAPI.get(`/volumes/${googleId}`);
    
    if (!response.data || !response.data.volumeInfo) {
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Process the book data
    const bookDetails = processGoogleBook(response.data);
    
    if (!bookDetails) {
      return res.status(500).json({ message: 'Failed to process book details' });
    }
    
    // Add extra information from the detailed response
    if (response.data.volumeInfo) {
      const info = response.data.volumeInfo;
      
      // Add additional fields
      bookDetails.subtitle = info.subtitle || '';
      bookDetails.previewLink = info.previewLink || '';
      bookDetails.infoLink = info.infoLink || '';
      bookDetails.canonicalVolumeLink = info.canonicalVolumeLink || '';
      
      // Add all available image links
      if (info.imageLinks) {
        bookDetails.imageLinks = info.imageLinks;
      }
      
      // Add all industry identifiers
      if (info.industryIdentifiers) {
        bookDetails.identifiers = info.industryIdentifiers.reduce((acc, id) => {
          acc[id.type] = id.identifier;
          return acc;
        }, {});
      }
    }
    
    // Cache the results
    cache.bookDetails[googleId] = bookDetails;
    cache.bookDetailsTimestamps[googleId] = now;
    
    return res.json(bookDetails);
  } catch (error) {
    log(`Error getting book details: ${error.message}`);
    res.status(500).json({ message: 'Error fetching book details' });
  }
};

/**
 * Search for books by an author
 */
exports.searchBooksByAuthor = async (req, res) => {
  try {
    const { author } = req.query;
    const limit = parseInt(req.query.limit) || 20;
    
    if (!author) {
      return res.status(400).json({ message: 'Author name is required' });
    }
    
    // Check cache first
    const cacheKey = `author-${author}-${limit}`;
    const now = Date.now();
    if (cache.searches[cacheKey] && now - (cache.searchTimestamps[cacheKey] || 0) < SEARCH_CACHE_EXPIRY) {
      log(`Using cached author books for: "${author}"`);
      return res.json(cache.searches[cacheKey]);
    }
    
    // Use the inauthor: prefix for author search
    const query = `inauthor:"${author}"`;
    
    // Perform search
    const response = await googleBooksAPI.get('/volumes', {
      params: {
        q: query,
        maxResults: Math.min(40, limit),
        orderBy: 'relevance',
        printType: 'books'
      }
    });
    
    if (!response.data || !response.data.items) {
      return res.json([]);
    }
    
    // Process and filter books
    const books = response.data.items
      .map(processGoogleBook)
      .filter(book => book !== null && book.author.toLowerCase().includes(author.toLowerCase()));
    
    // Cache the results
    cache.searches[cacheKey] = books;
    cache.searchTimestamps[cacheKey] = now;
    
    return res.json(books);
  } catch (error) {
    log(`Error searching books by author: ${error.message}`);
    res.status(500).json({ message: 'Error searching books by author' });
  }
};

// Export a function to purge the cache
exports.purgeCache = (req, res) => {
  try {
    log('Purging Google Books cache...');
    
    // Reset all cache objects
    cache.trending = null;
    cache.popular = null;
    cache.nyt = null;
    cache.awards = null;
    cache.genres = null;
    cache.genreBooks = {};
    cache.searches = {};
    cache.bookDetails = {};
    
    // Reset all timestamps
    cache.trendingTimestamp = 0;
    cache.popularTimestamp = 0;
    cache.nytTimestamp = 0;
    cache.awardsTimestamp = 0;
    cache.genresTimestamp = 0;
    cache.genreBooksTimestamps = {};
    cache.searchTimestamps = {};
    cache.bookDetailsTimestamps = {};
    
    log('Google Books cache has been purged');
    
    if (res) {
      return res.json({ 
        success: true,
        message: 'Google Books cache has been purged successfully'
      });
    }
    
    return true;
  } catch (error) {
    log(`Error purging cache: ${error.message}`);
    
    if (res) {
      return res.status(500).json({ 
        message: 'Error purging cache',
        error: error.message
      });
    }
    
    return false;
  }
};