// backend/services/recommendationService.js
const openLibraryAPI = require('../config/openLibrary');
const googleBooksAPI = require('../config/googleBooks');
const coverService = require('./coverService');
const Request = require('../models/Request');
const fs = require('fs');
const path = require('path');

// Set up logging
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(__dirname, '../logs/recommendations.log');

const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.log(message);
};

/**
 * Book recommendation service that blends data from multiple sources
 * and applies intelligent filtering
 */
class RecommendationService {
  constructor() {
    // Initialize cache for recommendations
    this.cache = {
      trending: null,
      popular: null,
      nytBestsellers: null,
      awardWinners: null,
      recentBooks: null,
      genreRecommendations: {},
      personalizedRecommendations: {},
      // Timestamps to manage cache expiration
      timestamps: {
        trending: 0,
        popular: 0,
        nytBestsellers: 0,
        awardWinners: 0,
        recentBooks: 0,
        genreRecommendations: {},
        personalizedRecommendations: {}
      }
    };
    
    // Cache expiration time (2 hours)
    this.CACHE_EXPIRY = 2 * 60 * 60 * 1000;
  }

  /**
   * Get trending books with improved relevance
   * @param {number} limit - Number of books to return
   * @returns {Array} - Array of trending books
   */
  async getTrendingBooks(limit = 40) {
    try {
      // Check cache first
      if (this.cache.trending && Date.now() - this.cache.timestamps.trending < this.CACHE_EXPIRY) {
        log('Using cached trending books');
        return this.cache.trending;
      }

      log('Fetching trending books from Google Books (prioritizing recent 5 years)');
      
      // Current year for filtering
      const currentYear = new Date().getFullYear();
      const lastFiveYearsStart = currentYear - 5;
      
      // Use Google Books API for trending books with recent date filter
      // We'll prioritize Google Books since it tends to have better data for recent books
      const googleTrendingResponse = await googleBooksAPI.searchBooks(
        `publishedDate:${lastFiveYearsStart}-${currentYear}`, 
        80
      );
      
      // Generate a highly targeted search for recent popular books
      const googlePopularRecent = await googleBooksAPI.searchBooks(
        `subject:fiction+publishedDate:${lastFiveYearsStart}-${currentYear}+bestseller`, 
        40
      );
      
      // Get OpenLibrary trending as backup/supplementary
      const openLibraryTrending = await openLibraryAPI.getTrendingBooks(40);
      
      // Combine all results
      const allBooks = [
        ...googleTrendingResponse,
        ...googlePopularRecent, 
        ...openLibraryTrending
      ];
      
      // Deduplicate and clean results
      const uniqueBooks = new Map();
      
      allBooks.forEach(book => {
        // Skip books without year or with year before our cutoff (we want recent books)
        if (book.year && book.year >= lastFiveYearsStart) {
          const key = `${book.title}|${book.author}`.toLowerCase();
          
          // If book already exists, keep the one with the cover image
          if (uniqueBooks.has(key)) {
            const existingBook = uniqueBooks.get(key);
            // Prefer the version with a cover
            if (!existingBook.cover && book.cover) {
              uniqueBooks.set(key, book);
            }
          } else {
            uniqueBooks.set(key, book);
          }
        }
      });
      
      // Convert to array
      const recentBooks = Array.from(uniqueBooks.values());
      
      // Sort primarily by year (most recent first) and then by rating
      recentBooks.sort((a, b) => {
        // First prioritize by year
        if (b.year !== a.year) {
          return b.year - a.year;
        }
        // Then by rating
        return (b.rating || 0) - (a.rating || 0);
      });
      
      // Apply post-processing to improve result quality with cover enhancement
      const processedBooks = await this.postProcessResults(recentBooks, limit);
      
      // Update cache
      this.cache.trending = processedBooks;
      this.cache.timestamps.trending = Date.now();
      
      return processedBooks;
    } catch (error) {
      log(`Error fetching trending books: ${error.message}`);
      
      // Return cached results if available, even if expired
      if (this.cache.trending) {
        return this.cache.trending;
      }
      
      // Fallback to Google Books if there's an error
      try {
        return await googleBooksAPI.getRecentBooks(limit);
      } catch (fallbackError) {
        log(`Fallback error: ${fallbackError.message}`);
        return [];
      }
    }
  }

  /**
   * Get popular books with improved relevance
   * @param {number} limit - Number of books to return
   * @returns {Array} - Array of popular books
   */
  async getPopularBooks(limit = 40) {
    try {
      // Check cache first
      if (this.cache.popular && Date.now() - this.cache.timestamps.popular < this.CACHE_EXPIRY) {
        log('Using cached popular books');
        return this.cache.popular;
      }

      log('Fetching popular books from multiple sources');
      
      // Fetch from both sources
      const [googlePopular, openLibraryPopular] = await Promise.all([
        googleBooksAPI.getPopularBooks(limit),
        openLibraryAPI.getPopularBooks(limit)
      ]);
      
      // Blend and deduplicate results
      const blendedBooks = this.blendAndDeduplicate(
        googlePopular, 
        openLibraryPopular,
        // Rank weights - prioritize rating and popularity
        { recencyWeight: 0.2, ratingWeight: 0.5, popularityWeight: 0.3 }
      );
      
      // Apply post-processing to improve result quality with cover enhancement
      const processedBooks = await this.postProcessResults(blendedBooks, limit);
      
      // Update cache
      this.cache.popular = processedBooks;
      this.cache.timestamps.popular = Date.now();
      
      return processedBooks;
    } catch (error) {
      log(`Error fetching popular books: ${error.message}`);
      
      // Return cached results if available, even if expired
      if (this.cache.popular) {
        return this.cache.popular;
      }
      
      // Fallback to Google Books if there's an error
      try {
        return await googleBooksAPI.getPopularBooks(limit);
      } catch (fallbackError) {
        log(`Fallback error: ${fallbackError.message}`);
        return [];
      }
    }
  }

  /**
   * Get NYT bestsellers with improved relevance
   * @param {number} limit - Number of books to return
   * @returns {Array} - Array of NYT bestsellers
   */
  async getNYTBestsellers(limit = 40) {
    try {
      // Check cache first
      if (this.cache.nytBestsellers && Date.now() - this.cache.timestamps.nytBestsellers < this.CACHE_EXPIRY) {
        log('Using cached NYT bestsellers');
        return this.cache.nytBestsellers;
      }

      log('Fetching NYT bestsellers');
      
      // Get NYT bestsellers from Google Books
      const nytBooks = await googleBooksAPI.getNytBestsellers(limit);
      
      // Apply post-processing to improve result quality with cover enhancement
      const processedBooks = await this.postProcessResults(nytBooks, limit);
      
      // Update cache
      this.cache.nytBestsellers = processedBooks;
      this.cache.timestamps.nytBestsellers = Date.now();
      
      return processedBooks;
    } catch (error) {
      log(`Error fetching NYT bestsellers: ${error.message}`);
      
      // Return cached results if available, even if expired
      if (this.cache.nytBestsellers) {
        return this.cache.nytBestsellers;
      }
      
      return [];
    }
  }

  /**
   * Get award-winning books with improved relevance
   * @param {number} limit - Number of books to return
   * @returns {Array} - Array of award-winning books
   */
  async getAwardWinners(limit = 40) {
    try {
      // Check cache first
      if (this.cache.awardWinners && Date.now() - this.cache.timestamps.awardWinners < this.CACHE_EXPIRY) {
        log('Using cached award winners');
        return this.cache.awardWinners;
      }

      log('Fetching award-winning books');
      
      // Get award winners from OpenLibrary
      const awardBooks = await openLibraryAPI.getAwardWinners(limit);
      
      // Apply post-processing to improve result quality with cover enhancement
      const processedBooks = await this.postProcessResults(awardBooks, limit);
      
      // Update cache
      this.cache.awardWinners = processedBooks;
      this.cache.timestamps.awardWinners = Date.now();
      
      return processedBooks;
    } catch (error) {
      log(`Error fetching award winners: ${error.message}`);
      
      // Return cached results if available, even if expired
      if (this.cache.awardWinners) {
        return this.cache.awardWinners;
      }
      
      return [];
    }
  }

  /**
   * Get recent books with improved relevance
   * @param {number} limit - Number of books to return
   * @returns {Array} - Array of recent books
   */
  async getRecentBooks(limit = 40) {
    try {
      // Check cache first
      if (this.cache.recentBooks && Date.now() - this.cache.timestamps.recentBooks < this.CACHE_EXPIRY) {
        log('Using cached recent books');
        return this.cache.recentBooks;
      }

      log('Fetching recent books from multiple sources');
      
      // Fetch from both sources
      const [googleRecent, openLibraryRecent] = await Promise.all([
        googleBooksAPI.getRecentBooks(limit),
        openLibraryAPI.getRecentBooks(limit)
      ]);
      
      // Blend and deduplicate results
      const blendedBooks = this.blendAndDeduplicate(
        googleRecent, 
        openLibraryRecent,
        // Rank weights - heavily prioritize recency
        { recencyWeight: 0.8, ratingWeight: 0.1, popularityWeight: 0.1 }
      );
      
      // Apply post-processing to improve result quality with cover enhancement
      const processedBooks = await this.postProcessResults(blendedBooks, limit);
      
      // Update cache
      this.cache.recentBooks = processedBooks;
      this.cache.timestamps.recentBooks = Date.now();
      
      return processedBooks;
    } catch (error) {
      log(`Error fetching recent books: ${error.message}`);
      
      // Return cached results if available, even if expired
      if (this.cache.recentBooks) {
        return this.cache.recentBooks;
      }
      
      // Fallback to Google Books if there's an error
      try {
        return await googleBooksAPI.getRecentBooks(limit);
      } catch (fallbackError) {
        log(`Fallback error: ${fallbackError.message}`);
        return [];
      }
    }
  }

  /**
   * Get personalized recommendations for a user
   * @param {string} userId - User ID
   * @param {number} limit - Number of books to return
   * @returns {Array} - Array of personalized book recommendations
   */
  async getPersonalizedRecommendations(userId, limit = 40) {
    try {
      // Check cache first
      if (this.cache.personalizedRecommendations[userId] && 
          Date.now() - this.cache.timestamps.personalizedRecommendations[userId] < this.CACHE_EXPIRY) {
        log(`Using cached personalized recommendations for user ${userId}`);
        return this.cache.personalizedRecommendations[userId];
      }

      log(`Generating personalized recommendations for user ${userId}`);
      
      // Get user's requests to understand their preferences
      const userRequests = await Request.find({ user: userId });
      
      if (userRequests.length === 0) {
        // If user has no requests, return popular books
        return await this.getPopularBooks(limit);
      }
      
      // Extract authors and genres from user's requests
      const authorSet = new Set();
      const genreSet = new Set();
      
      for (const request of userRequests) {
        if (request.author) {
          authorSet.add(request.author);
        }
        
        // If we have source and bookId, try to get more detailed info
        if (request.source && request.bookId) {
          try {
            let bookDetails;
            
            if (request.source === 'google') {
              const googleId = request.bookId.startsWith('gb-') ? 
                request.bookId.substring(3) : request.bookId;
                
              bookDetails = await googleBooksAPI.getBookDetails(googleId);
            } else if (request.source === 'openLibrary') {
              const olId = request.bookId.startsWith('ol-') ? 
                request.bookId.substring(3) : request.bookId;
                
              bookDetails = await openLibraryAPI.getBookDetails(olId);
            }
            
            if (bookDetails && bookDetails.genres) {
              bookDetails.genres.forEach(genre => genreSet.add(genre));
            }
          } catch (error) {
            log(`Error fetching details for book ${request.bookId}: ${error.message}`);
          }
        }
      }
      
      // Convert sets to arrays
      const authors = Array.from(authorSet);
      const genres = Array.from(genreSet);
      
      // Get recommendations based on user's preferred authors and genres
      const recommendationsPromises = [];
      
      // Get books by authors the user has requested
      for (const author of authors.slice(0, 3)) { // Limit to top 3 authors
        recommendationsPromises.push(
          googleBooksAPI.searchBooksByAuthor(author, Math.ceil(limit / 4))
            .catch(error => {
              log(`Error fetching books by author ${author}: ${error.message}`);
              return [];
            })
        );
      }
      
      // Get books in genres the user has requested
      for (const genre of genres.slice(0, 3)) { // Limit to top 3 genres
        recommendationsPromises.push(
          openLibraryAPI.getBooksByGenre(genre, Math.ceil(limit / 4))
            .catch(error => {
              log(`Error fetching books in genre ${genre}: ${error.message}`);
              return [];
            })
        );
      }
      
      // Also add some trending and popular books to ensure good recommendations
      recommendationsPromises.push(this.getTrendingBooks(Math.ceil(limit / 4)));
      recommendationsPromises.push(this.getPopularBooks(Math.ceil(limit / 4)));
      
      // Wait for all recommendation queries to complete
      const allRecommendations = await Promise.all(recommendationsPromises);
      
      // Flatten and deduplicate
      const bookMap = new Map();
      
      allRecommendations.forEach(books => {
        books.forEach(book => {
          // Create a unique key combining title and author
          const key = `${book.title}|${book.author}`.toLowerCase();
          
          // Only add book if we haven't seen it before
          if (!bookMap.has(key)) {
            bookMap.set(key, book);
          }
        });
      });
      
      // Convert map values to array
      let recommendations = Array.from(bookMap.values());
      
      // Filter out books the user has already requested
      const requestedBookIds = new Set(userRequests.map(request => request.bookId));
      recommendations = recommendations.filter(book => !requestedBookIds.has(book.id));
      
      // Process and sort the results to boost personalized relevance
      const processedRecommendations = await this.processPersonalizedResults(
        recommendations, 
        {
          authors, 
          genres, 
          recencyWeight: 0.3,
          ratingWeight: 0.4,
          relevanceWeight: 0.3
        }, 
        limit
      );
      
      // Update cache
      this.cache.personalizedRecommendations[userId] = processedRecommendations;
      this.cache.timestamps.personalizedRecommendations[userId] = Date.now();
      
      return processedRecommendations;
    } catch (error) {
      log(`Error getting personalized recommendations: ${error.message}`);
      
      // Return cached results if available, even if expired
      if (this.cache.personalizedRecommendations[userId]) {
        return this.cache.personalizedRecommendations[userId];
      }
      
      // Fallback to popular books
      return await this.getPopularBooks(limit);
    }
  }

  /**
   * Get books by genre with improved relevance and quality
   * @param {string} genreId - Genre ID
   * @param {number} limit - Number of books to return
   * @returns {Array} - Array of books in the specified genre
   */
  async getBooksByGenre(genreId, limit = 40) {
    try {
      // Check cache first
      if (this.cache.genreRecommendations[genreId] && 
          Date.now() - this.cache.timestamps.genreRecommendations[genreId] < this.CACHE_EXPIRY) {
        log(`Using cached books for genre ${genreId}`);
        return this.cache.genreRecommendations[genreId];
      }

      log(`Fetching books for genre ${genreId}`);
      
      // Get books from OpenLibrary for this genre
      const genreBooks = await openLibraryAPI.getBooksByGenre(genreId, limit);
      
      // Apply post-processing to improve result quality with cover enhancement
      const processedBooks = await this.postProcessResults(genreBooks, limit);
      
      // Update cache
      this.cache.genreRecommendations[genreId] = processedBooks;
      this.cache.timestamps.genreRecommendations[genreId] = Date.now();
      
      return processedBooks;
    } catch (error) {
      log(`Error fetching books for genre ${genreId}: ${error.message}`);
      
      // Return cached results if available, even if expired
      if (this.cache.genreRecommendations[genreId]) {
        return this.cache.genreRecommendations[genreId];
      }
      
      return [];
    }
  }

  /**
   * Blend and deduplicate books from multiple sources
   * @param {Array} source1Books - Books from first source
   * @param {Array} source2Books - Books from second source
   * @param {Object} weights - Weights for ranking
   * @returns {Array} - Blended and deduplicated books
   */
  blendAndDeduplicate(source1Books, source2Books, weights) {
    // Combine books from both sources
    const allBooks = [...source1Books, ...source2Books];
    
    // Deduplicate by title and author
    const uniqueBooks = new Map();
    
    allBooks.forEach(book => {
      const key = `${book.title}|${book.author}`.toLowerCase();
      
      // If book already exists, keep the one with more information
      if (uniqueBooks.has(key)) {
        const existingBook = uniqueBooks.get(key);
        
        // Prefer book with cover image
        if (!existingBook.cover && book.cover) {
          uniqueBooks.set(key, book);
        }
        // If both or neither have covers, prefer book with more fields
        else if (this.calculateInfoScore(book) > this.calculateInfoScore(existingBook)) {
          uniqueBooks.set(key, book);
        }
      } else {
        uniqueBooks.set(key, book);
      }
    });
    
    return Array.from(uniqueBooks.values());
  }

  /**
   * Post-process results to improve quality
   * @param {Array} books - Books to process
   * @param {number} limit - Number of books to return
   * @returns {Array} - Processed books
   */
  async postProcessResults(books, limit) {
    if (!books || !Array.isArray(books)) return [];
    
    // Current date for age calculations
    const currentYear = new Date().getFullYear();
    
    // Score books for ranking
    const scoredBooks = books.map(book => {
      // Start with base score
      let score = 0;
      
      // Convert year to number if it's a string
      const year = typeof book.year === 'string' ? parseInt(book.year) : book.year;
      
      // Boost for recent books (0-5 points)
      if (year) {
        // Books from current year get maximum points
        if (year === currentYear) {
          score += 5;
        }
        // Books from last 5 years get gradually fewer points
        else if (year >= currentYear - 5) {
          score += 5 - (currentYear - year);
        }
        // Books from last 10 years get a smaller boost
        else if (year >= currentYear - 10) {
          score += 1;
        }
      }
      
      // Boost for books with ratings (0-5 points)
      if (book.rating) {
        score += Math.min(book.rating, 5);
      }
      
      // Boost for books with cover images (3 points)
      if (book.cover) {
        score += 3;
      }
      
      // Boost for books with genres/categories (0-2 points)
      if (book.genres && book.genres.length > 0) {
        score += Math.min(book.genres.length, 2);
      }
      
      // Penalize books with no year or very old books
      if (!year || year < currentYear - 50) {
        score -= 2;
      }
      
      return { ...book, score };
    });
    
    // Sort by score (descending)
    const sortedBooks = scoredBooks.sort((a, b) => b.score - a.score);
    
    // Take only as many books as requested (plus some extras for cover enhancement)
    const topBooks = sortedBooks.slice(0, limit * 1.5);
    
    // Enhance book covers for results that don't have them
    log(`Enhancing covers for ${topBooks.length} books`);
    const enhancedBooks = await coverService.enhanceBookCovers(topBooks);
    
    // Re-score books after cover enhancement
    const rescoredBooks = enhancedBooks.map(book => {
      // Start with the existing score
      let score = book.score || 0;
      
      // Boost books that now have covers
      if (book.cover) {
        score += 3;
      }
      
      return { ...book, score };
    });
    
    // Re-sort by score and limit to requested number
    const finalBooks = rescoredBooks
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return finalBooks;
  }

  /**
   * Process personalized results
   * @param {Array} books - Books to process
   * @param {Object} preferences - User preferences
   * @param {number} limit - Number of books to return
   * @returns {Array} - Processed books
   */
  async processPersonalizedResults(books, preferences, limit) {
    if (!books || !Array.isArray(books)) return [];
    
    const { authors, genres, recencyWeight, ratingWeight, relevanceWeight } = preferences;
    const currentYear = new Date().getFullYear();
    
    // Score books for ranking
    const scoredBooks = books.map(book => {
      // Start with base score
      let score = 0;
      
      // Recency score (0-10)
      const year = typeof book.year === 'string' ? parseInt(book.year) : book.year;
      let recencyScore = 0;
      
      if (year) {
        if (year === currentYear) {
          recencyScore = 10;
        } else if (year >= currentYear - 5) {
          recencyScore = 8 - (currentYear - year);
        } else if (year >= currentYear - 10) {
          recencyScore = 3;
        } else {
          recencyScore = 1;
        }
      }
      
      // Rating score (0-10)
      let ratingScore = 0;
      if (book.rating) {
        ratingScore = book.rating * 2; // Convert 0-5 to 0-10
      }
      
      // Relevance score (0-10)
      let relevanceScore = 0;
      
      // Author match
      if (authors.some(author => book.author.toLowerCase().includes(author.toLowerCase()))) {
        relevanceScore += 5;
      }
      
      // Genre match
      if (book.genres && genres.some(genre => book.genres.includes(genre))) {
        relevanceScore += 5;
      }
      
      // Apply weights
      score = (recencyScore * recencyWeight) + 
              (ratingScore * ratingWeight) + 
              (relevanceScore * relevanceWeight);
      
      return { ...book, score };
    });
    
    // Sort by score (descending)
    const sortedBooks = scoredBooks.sort((a, b) => b.score - a.score);
    
    // Take top books (plus some extras for cover enhancement)
    const topBooks = sortedBooks.slice(0, limit * 1.5);
    
    // Enhance book covers
    log(`Enhancing covers for ${topBooks.length} personalized recommendation books`);
    const enhancedBooks = await coverService.enhanceBookCovers(topBooks);
    
    // Re-score books after cover enhancement
    const rescoredBooks = enhancedBooks.map(book => {
      // Start with the existing score
      let score = book.score || 0;
      
      // Boost books that now have covers
      if (book.cover) {
        score += 2;
      }
      
      return { ...book, score };
    });
    
    // Re-sort by score and limit to requested number
    const finalBooks = rescoredBooks
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return finalBooks;
  }

  /**
   * Calculate info score for a book based on available fields
   * Used to determine which duplicate to keep
   * @param {Object} book - Book object
   * @returns {number} - Info score
   */
  calculateInfoScore(book) {
    let score = 0;
    
    // Award points for each important field that exists
    if (book.title) score++;
    if (book.author) score++;
    if (book.overview) score += 2;
    if (book.cover) score += 3;
    if (book.releaseDate) score++;
    if (book.year) score++;
    if (book.rating) score += 2;
    if (book.genres && book.genres.length) score += book.genres.length;
    if (book.isbn) score += 2;
    
    return score;
  }

  /**
   * Clear all cached recommendations
   */
  purgeCache() {
    log('Purging recommendation cache');
    
    this.cache = {
      trending: null,
      popular: null,
      nytBestsellers: null,
      awardWinners: null,
      recentBooks: null,
      genreRecommendations: {},
      personalizedRecommendations: {},
      timestamps: {
        trending: 0,
        popular: 0,
        nytBestsellers: 0,
        awardWinners: 0,
        recentBooks: 0,
        genreRecommendations: {},
        personalizedRecommendations: {}
      }
    };
    
    return true;
  }
}

// Export a singleton instance
module.exports = new RecommendationService();