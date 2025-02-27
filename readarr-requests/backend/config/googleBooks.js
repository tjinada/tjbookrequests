// config/googleBooks.js
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

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
  nytTimestamp: 0
};

// Cache expiration time (4 hours)
const CACHE_EXPIRY = 4 * 60 * 60 * 1000;

// Process Google Books data to match our format
const processGoogleBook = (book) => {
  if (!book.volumeInfo) return null;

  const info = book.volumeInfo;
  return {
    id: `gb-${book.id}`,
    title: info.title,
    author: info.authors ? info.authors.join(', ') : 'Unknown Author',
    overview: info.description || '',
    cover: info.imageLinks ? info.imageLinks.thumbnail : null,
    releaseDate: info.publishedDate,
    year: info.publishedDate ? parseInt(info.publishedDate.substring(0, 4)) : null,
    rating: info.averageRating || 0,
    ratings_count: info.ratingsCount || 0,
    source: 'google'
  };
};

module.exports = {
  /**
   * Get recent books from Google Books API
   */
  getRecentBooks: async (limit = 100) => {
    try {
      // Check cache first
      const now = Date.now();
      if (cache.recent && now - cache.recentTimestamp < CACHE_EXPIRY) {
        console.log('Using cached Google Books recent books');
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
          maxResults: 40
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
      console.error('Error fetching recent books from Google Books:', error);
      return [];
    }
  },

  /**
   * Get popular books from Google Books
   */
  getPopularBooks: async (limit = 100) => {
    try {
      // Check cache first
      const now = Date.now();
      if (cache.popular && now - cache.popularTimestamp < CACHE_EXPIRY) {
        console.log('Using cached Google Books popular books');
        return cache.popular;
      }

      // Search for popular fiction with sorting by relevance
      const response = await googleBooksAPI.get('/volumes', {
        params: {
          q: 'subject:fiction',
          orderBy: 'relevance',
          printType: 'books',
          maxResults: 40,
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
      console.error('Error fetching popular books from Google Books:', error);
      return [];
    }
  },

  /**
   * Get NYT bestsellers or similar from Google Books
   */
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
  }
};

// Export a function to purge the cache
module.exports.purgeCache = function() {
  console.log('Purging Google Books cache...');
  // Reset all cache objects
  cache.recent = null;
  cache.popular = null;
  cache.nyt = null;
  // Reset all timestamps
  cache.recentTimestamp = 0;
  cache.popularTimestamp = 0;
  cache.nytTimestamp = 0;

  console.log('Google Books cache has been purged');
  return true;
};