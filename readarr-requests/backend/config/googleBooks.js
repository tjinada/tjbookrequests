// config/googleBooks.js - Enhanced version with better search results
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

const googleBooksAPI = axios.create({
  baseURL: 'https://www.googleapis.com/books/v1',
  timeout: 10000,
  params: {
    key: process.env.GOOGLE_BOOKS_API_KEY, // Retrieve the API key from the environment
  }
});

// Cache for Google Books API responses
const cache = {
  recent: null,
  popular: null,
  nyt: null,
  recentTimestamp: 0,
  popularTimestamp: 0,
  nytTimestamp: 0,
  searches: {}, // Search query cache
  searchTimestamps: {},
  bookDetails: {}, // Book details cache
  bookDetailsTimestamps: {}
};

// Cache expiration time (4 hours)
const CACHE_EXPIRY = 4 * 60 * 60 * 1000;
// Search cache expiration (1 hour)
const SEARCH_CACHE_EXPIRY = 1 * 60 * 60 * 1000;

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
    // Request higher quality images by trying to get the best available in this order
    coverImage = info.imageLinks.extraLarge || 
                info.imageLinks.large || 
                info.imageLinks.medium || 
                info.imageLinks.small || 
                info.imageLinks.thumbnail;
                
    // If the URL starts with http:// instead of https://, swap it
    if (coverImage && coverImage.startsWith('http://')) {
      coverImage = coverImage.replace('http://', 'https://');
    }
    
    // Remove any zoom parameters that might reduce quality
    if (coverImage) {
      coverImage = coverImage.replace('&zoom=1', '&zoom=0')
                            .replace('&edge=curl', '');
                            
      // For Google Books API, try to get higher resolution by replacing zoom level
      if (coverImage.includes('books.google.com')) {
        // Replace any existing zoom parameter or add a new one for max quality
        if (coverImage.includes('zoom=')) {
          coverImage = coverImage.replace(/zoom=\d/, 'zoom=0');
        } else {
          coverImage = coverImage + '&zoom=0';
        }
      }
    }
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
      // In a real implementation, you might want to query for more author details
    })) : [{name: 'Unknown Author'}]
  };
};

module.exports = {
  /**
   * Enhanced search function with better result processing
   * @param {string} query - Search query
   * @param {number} maxResults - Maximum results to return (default: 40)
   * @returns {array} - Array of formatted book objects
   */
  searchBooks: async (query, maxResults = 40) => {
    try {
      log(`Searching Google Books for: "${query}"`);
      
      // Check cache first
      const cacheKey = `${query}-${maxResults}`;
      const now = Date.now();
      if (cache.searches[cacheKey] && now - cache.searchTimestamps[cacheKey] < SEARCH_CACHE_EXPIRY) {
        log(`Using cached search results for: "${query}"`);
        return cache.searches[cacheKey];
      }
      
      // Perform API search
      const response = await googleBooksAPI.get('/volumes', {
        params: {
          q: query,
          maxResults: maxResults,
          orderBy: 'relevance',
          printType: 'books'
        }
      });

      if (!response.data || !response.data.items) {
        log(`No results found for search: "${query}"`);
        return [];
      }

      // Process books and filter out any with incomplete data
      const books = response.data.items
        .map(processGoogleBook)
        .filter(book => book !== null);

      log(`Found ${books.length} books for search: "${query}"`);
      
      // Cache the results
      cache.searches[cacheKey] = books;
      cache.searchTimestamps[cacheKey] = now;

      return books;
    } catch (error) {
      log(`Error searching Google Books: ${error.message}`);
      return [];
    }
  },
  
  /**
   * Get detailed information about a specific book
   * @param {string} bookId - Google Books ID
   * @returns {object} - Formatted book object with detailed information
   */
  getBookDetails: async (bookId) => {
    try {
      log(`Getting book details for ID: ${bookId}`);
      
      // Strip 'gb-' prefix if present
      const googleId = bookId.startsWith('gb-') ? bookId.substring(3) : bookId;
      
      // Check cache first
      const now = Date.now();
      if (cache.bookDetails[googleId] && now - cache.bookDetailsTimestamps[googleId] < CACHE_EXPIRY) {
        log(`Using cached book details for ID: ${googleId}`);
        return cache.bookDetails[googleId];
      }
      
      // Fetch book details
      const response = await googleBooksAPI.get(`/volumes/${googleId}`);
      
      if (!response.data || !response.data.volumeInfo) {
        throw new Error(`Book not found: ${googleId}`);
      }
      
      // Process the book data
      const bookDetails = processGoogleBook(response.data);
      
      if (!bookDetails) {
        throw new Error(`Failed to process book details: ${googleId}`);
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
      
      return bookDetails;
    } catch (error) {
      log(`Error getting book details: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get recent books from Google Books API
   */
  getRecentBooks: async (limit = 40) => {
    try {
      // Check cache first
      const now = Date.now();
      if (cache.recent && now - cache.recentTimestamp < CACHE_EXPIRY) {
        log('Using cached Google Books recent books');
        return cache.recent;
      }

      // Current year for filtering recent books
      const currentYear = new Date().getFullYear();
      const lastFiveYears = `${currentYear-5}-${currentYear}`;

      // Search for recent fiction books with good ratings
      const response = await googleBooksAPI.get('/volumes', {
        params: {
          q: `subject:fiction+publishedDate:${lastFiveYears}`,
          orderBy: 'relevance',
          printType: 'books',
          maxResults: limit
        }
      });

      if (!response.data || !response.data.items) {
        return [];
      }

      // Process books and filter out any without covers or with incomplete data
      const books = response.data.items
        .map(processGoogleBook)
        .filter(book => book && book.cover);

      // Sort by combination of recency and rating
      books.sort((a, b) => {
        // Start with rating (0-5 points)
        let scoreA = a.rating || 0;
        let scoreB = b.rating || 0;

        // Add recency points - newer books get higher scores
        const yearA = a.year || 0;
        const yearB = b.year || 0;

        // More recent books get higher scores
        scoreA += (yearA - 2000) * 0.05; // 0.05 points per year since 2000
        scoreB += (yearB - 2000) * 0.05;

        return scoreB - scoreA;
      });

      // Cache the results
      cache.recent = books.slice(0, limit);
      cache.recentTimestamp = now;

      return cache.recent;
    } catch (error) {
      log(`Error fetching recent books from Google Books: ${error.message}`);
      return [];
    }
  },

  /**
   * Get popular books from Google Books
   */
  getPopularBooks: async (limit = 40) => {
    try {
      // Check cache first
      const now = Date.now();
      if (cache.popular && now - cache.popularTimestamp < CACHE_EXPIRY) {
        log('Using cached Google Books popular books');
        return cache.popular;
      }

      // Search for popular fiction with sorting by relevance
      const response = await googleBooksAPI.get('/volumes', {
        params: {
          q: 'subject:fiction',
          orderBy: 'relevance',
          printType: 'books',
          maxResults: limit,
          langRestrict: 'en'
        }
      });

      if (!response.data || !response.data.items) {
        return [];
      }

      // Process books and filter out any without covers
      const books = response.data.items
        .map(processGoogleBook)
        .filter(book => book && book.cover);

      // Sort by rating
      books.sort((a, b) => (b.rating || 0) - (a.rating || 0));

      // Cache the results
      cache.popular = books.slice(0, limit);
      cache.popularTimestamp = now;

      return cache.popular;
    } catch (error) {
      log(`Error fetching popular books from Google Books: ${error.message}`);
      return [];
    }
  },

  getNytBestsellers: async (limit = 100) => {
    try {
      // Check cache first
      const now = Date.now();
      if (cache.nyt && now - cache.nytTimestamp < CACHE_EXPIRY) {
        console.log('Using cached Google Books NYT bestsellers');
        return cache.nyt;
      }

      // Search for bestsellers - there's no direct NYT integration, so use keyword
      const response = await googleBooksAPI.get('/volumes', {
        params: {
          q: 'bestseller',
          orderBy: 'newest',
          printType: 'books',
          maxResults: 40
        }
      });

      if (!response.data || !response.data.items) {
        return [];
      }

      // Process books and filter out any without covers
      const books = response.data.items
        .map(processGoogleBook)
        .filter(book => book && book.cover);

      // Filter for recent books (last 5 years)
      const currentYear = new Date().getFullYear();
      const recentBooks = books.filter(book => 
        book.year && book.year >= currentYear - 5
      );

      // Use recent books if we have enough, otherwise use all
      const finalBooks = recentBooks.length >= limit ? recentBooks : books;

      // Sort by year (descending), then by rating
      finalBooks.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return (b.rating || 0) - (a.rating || 0);
      });

      // Cache the results
      cache.nyt = finalBooks.slice(0, limit);
      cache.nytTimestamp = now;

      return cache.nyt;
    } catch (error) {
      console.error('Error fetching NYT bestsellers from Google Books:', error);
      return [];
    }
  },



  /**
   * Search for books by a specific author
   * @param {string} author - Author name
   * @param {number} maxResults - Maximum results to return
   * @returns {array} - Array of formatted book objects by the author
   */
  searchBooksByAuthor: async (author, maxResults = 20) => {
    try {
      log(`Searching for books by author: "${author}"`);
      
      // Use the inauthor: prefix for author search
      const query = `inauthor:"${author}"`;
      
      // Perform search
      const response = await googleBooksAPI.get('/volumes', {
        params: {
          q: query,
          maxResults: maxResults,
          orderBy: 'relevance',
          printType: 'books'
        }
      });

      if (!response.data || !response.data.items) {
        log(`No books found for author: "${author}"`);
        return [];
      }

      // Process and filter books
      const books = response.data.items
        .map(processGoogleBook)
        .filter(book => book !== null && book.author.toLowerCase().includes(author.toLowerCase()));

      log(`Found ${books.length} books by author: "${author}"`);
      return books;
    } catch (error) {
      log(`Error searching books by author: ${error.message}`);
      return [];
    }
  },
  
  /**
   * Search for an author to get detailed information
   * @param {string} authorName - Author name to search
   * @returns {object} - Author information
   */
  searchAuthor: async (authorName) => {
    try {
      log(`Searching for author information: "${authorName}"`);
      
      // Use the inauthor: prefix for author search
      const query = `inauthor:"${authorName}"`;
      
      // Perform search
      const response = await googleBooksAPI.get('/volumes', {
        params: {
          q: query,
          maxResults: 10,
          orderBy: 'relevance',
          printType: 'books'
        }
      });

      if (!response.data || !response.data.items || response.data.items.length === 0) {
        log(`No information found for author: "${authorName}"`);
        return null;
      }

      // Extract author information from the books
      const books = response.data.items
        .map(processGoogleBook)
        .filter(book => book !== null);
      
      // Find books that exactly match the author name
      const exactMatchBooks = books.filter(book => {
        const bookAuthors = book.author.split(', ');
        return bookAuthors.some(author => author.toLowerCase() === authorName.toLowerCase());
      });
      
      // If no exact matches, use the closest matches
      const relevantBooks = exactMatchBooks.length > 0 ? exactMatchBooks : books;
      
      // Extract unique author names
      const authorNames = new Set();
      relevantBooks.forEach(book => {
        book.author.split(', ').forEach(author => {
          authorNames.add(author);
        });
      });
      
      // Find the most likely author match
      let mostLikelyAuthor = null;
      let highestScore = -1;
      
      authorNames.forEach(author => {
        // Calculate a score based on exact match and frequency
        let score = 0;
        
        // Exact match gets a big boost
        if (author.toLowerCase() === authorName.toLowerCase()) {
          score += 100;
        }
        
        // Count frequency in the books
        const frequency = relevantBooks.filter(book => 
          book.author.toLowerCase().includes(author.toLowerCase())).length;
        
        score += frequency * 10;
        
        if (score > highestScore) {
          highestScore = score;
          mostLikelyAuthor = author;
        }
      });
      
      if (!mostLikelyAuthor) {
        return null;
      }
      
      // Compile author information
      const authorInfo = {
        name: mostLikelyAuthor,
        books: relevantBooks.filter(book => 
          book.author.toLowerCase().includes(mostLikelyAuthor.toLowerCase())),
        // Calculate average rating across books
        averageRating: relevantBooks.reduce((sum, book) => sum + (book.rating || 0), 0) / relevantBooks.length,
        bookCount: relevantBooks.length,
        // Use the genre from the most popular book as the author's primary genre
        primaryGenres: extractTopGenres(relevantBooks)
      };
      
      return authorInfo;
    } catch (error) {
      log(`Error searching for author information: ${error.message}`);
      return null;
    }
  }
};

// Helper function to extract the top genres from a list of books
function extractTopGenres(books) {
  const genreCount = {};
  
  // Count genre occurrences
  books.forEach(book => {
    if (book.genres && book.genres.length > 0) {
      book.genres.forEach(genre => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });
    }
  });
  
  // Sort genres by frequency
  const sortedGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  // Return top genres (maximum 5)
  return sortedGenres.slice(0, 5);
}

// Export a function to purge the cache
module.exports.purgeCache = function() {
  log('Purging Google Books cache...');
  
  // Reset all cache objects
  cache.recent = null;
  cache.popular = null;
  cache.nyt = null;
  cache.searches = {};
  cache.bookDetails = {};
  
  // Reset all timestamps
  cache.recentTimestamp = 0;
  cache.popularTimestamp = 0;
  cache.nytTimestamp = 0;
  cache.searchTimestamps = {};
  cache.bookDetailsTimestamps = {};

  log('Google Books cache has been purged');
  return true;
};