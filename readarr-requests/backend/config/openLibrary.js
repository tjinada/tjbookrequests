// config/openLibrary.js
const axios = require('axios');

// Create axios instance for OpenLibrary
const openLibraryAPI = axios.create({
  baseURL: 'https://openlibrary.org',
  timeout: 10000,
});

// List of popular genres with their subject identifiers
const genres = {
  'fiction': 'fiction',
  'science-fiction': 'science_fiction',
  'romance': 'romance',
  'historical-fiction': 'historical_fiction',
  'mystery': 'mystery',
  'thriller': 'thriller',
  'fantasy': 'fantasy',
  'biography': 'biography',
  'horror': 'horror',
  'classics': 'classics',
  'non-fiction': 'non-fiction',
  'young-adult': 'young_adult',
  'children': 'children',
  'poetry': 'poetry',
  'comics': 'comics'
};

// Simple in-memory cache for API responses
const cache = {
  genres: {},
  trending: null,
  popular: null,
  nytBestsellers: null,
  awardWinners: null,
  recentBooks: null,
  genreTimestamps: {},
  trendingTimestamp: 0,
  popularTimestamp: 0,
  nytTimestamp: 0,
  awardsTimestamp: 0,
  recentTimestamp: 0
};

// Cache expiration time (4 hours in milliseconds)
const CACHE_EXPIRY = 4 * 60 * 60 * 1000;

// Helper function to process book data into consistent format
const processBookData = (work, genreOrCategory = '') => {
  // Get cover URL
  let coverUrl = null;
  if (work.cover_id) {
    coverUrl = `https://covers.openlibrary.org/b/id/${work.cover_id}-L.jpg`;
  }

  // Extract author names
  const authorNames = work.authors 
    ? work.authors.map(a => a.name).join(', ') 
    : 'Unknown Author';

  // Format publish year
  const publishYear = work.first_publish_year || 0;
  const publishDate = publishYear 
    ? new Date(publishYear, 0, 1).toISOString().split('T')[0]
    : null;

  return {
    id: work.key.replace('/works/', ''),
    title: work.title,
    author: authorNames,
    overview: work.description || '',
    cover: coverUrl,
    releaseDate: publishDate,
    year: publishYear,
    genre: genreOrCategory,
    rating: work.ratings_average || 0,
    ratings_count: work.ratings_count || 0
  };
};

// Helper function to filter and sort books
const filterAndSortBooks = (books, limit = 20) => {
  // Filter out books with no cover image (improves quality)
  let filteredBooks = books.filter(book => book.cover !== null);

  // Get current year for age calculations
  const currentYear = new Date().getFullYear();

  // First, try to get books from last 30 years but don't exclude classics entirely
  const recentBooks = filteredBooks.filter(book => 
    book.year && book.year >= (currentYear - 30)
  );

  // If we have enough recent books, prioritize them
  if (recentBooks.length >= limit / 2) {
    filteredBooks = recentBooks;
  }

  // Sort primarily by rating, with a bonus for recent books
  filteredBooks.sort((a, b) => {
    // Start with the raw rating (0-5)
    let scoreA = a.rating || 0;
    let scoreB = b.rating || 0;

    // Add recency bonus - max 1.5 points for very recent books
    const recentYearThreshold = currentYear - 5;
    if (a.year && a.year >= recentYearThreshold) {
      scoreA += 1.5;
    } else if (a.year && a.year >= currentYear - 15) {
      scoreA += 1; // Smaller bonus for books from last 15 years
    } else if (a.year && a.year >= currentYear - 30) {
      scoreA += 0.5; // Minimal bonus for books from last 30 years
    }

    if (b.year && b.year >= recentYearThreshold) {
      scoreB += 1.5;
    } else if (b.year && b.year >= currentYear - 15) {
      scoreB += 1;
    } else if (b.year && b.year >= currentYear - 30) {
      scoreB += 0.5;
    }

    // Sort descending by total score
    return scoreB - scoreA;
  });

  // Take only the requested number of books
  return filteredBooks.slice(0, limit);
};

module.exports = {
  /**
   * Get list of available genres
   */
  getGenres: () => {
    return Object.keys(genres).map(key => ({
      id: key,
      name: key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }));
  },

  /**
   * Get books by genre using the subjects API
   */
  getBooksByGenre: async (genre, limit = 20) => {
    try {
      // Check cache first
      const now = Date.now();
      if (
        cache.genres[genre] && 
        cache.genreTimestamps[genre] && 
        now - cache.genreTimestamps[genre] < CACHE_EXPIRY
      ) {
        console.log(`Using cached data for genre: ${genre}`);
        return cache.genres[genre];
      }

      // Get the correct subject key for the requested genre
      const subjectKey = genres[genre] || genre;

      console.log(`Fetching books for genre: ${genre} (subject: ${subjectKey})`);

      // Request more books than we need so we can filter and sort
      const requestLimit = Math.min(100, limit * 3);

      // Use the subjects API without editions sorting
      const response = await openLibraryAPI.get(`/subjects/${subjectKey}.json?limit=${requestLimit}`);

      // Check for valid response
      if (!response.data || !response.data.works || !Array.isArray(response.data.works)) {
        console.error(`Invalid response for genre ${genre}:`, response.data);
        return [];
      }

      // Map to consistent format
      const books = response.data.works.map(work => processBookData(work, genre));

      // Filter and sort by rating/recency
      const processedBooks = filterAndSortBooks(books, limit);

      console.log(`Returning ${processedBooks.length} ${genre} books`);

      // Update cache
      cache.genres[genre] = processedBooks;
      cache.genreTimestamps[genre] = now;

      return processedBooks;
    } catch (error) {
      console.error(`Error fetching ${genre} books from OpenLibrary:`, error);

      // Return cached data if available
      if (cache.genres[genre]) {
        console.log(`Returning expired cache for ${genre} due to API error`);
        return cache.genres[genre];
      }

      // Return empty array as fallback
      return [];
    }
  },

  /**
   * Get trending books
   */
  getTrendingBooks: async (limit = 20) => {
    try {
      // Check cache first
      const now = Date.now();
      if (cache.trending && now - cache.trendingTimestamp < CACHE_EXPIRY) {
        console.log('Using cached trending books');
        return cache.trending;
      }

      // Use a popular subject
      const requestLimit = Math.min(100, limit * 3);
      const response = await openLibraryAPI.get(`/subjects/bestseller.json?limit=${requestLimit}`);

      if (!response.data || !response.data.works) {
        return [];
      }

      // Process and filter books
      const books = response.data.works.map(work => processBookData(work, 'trending'));
      const processedBooks = filterAndSortBooks(books, limit);

      // Update cache
      cache.trending = processedBooks;
      cache.trendingTimestamp = now;

      return processedBooks;
    } catch (error) {
      console.error('Error fetching trending books:', error);

      // Return cached data if available
      if (cache.trending) {
        return cache.trending;
      }

      return [];
    }
  },

  /**
   * Get popular books
   */
  getPopularBooks: async (limit = 20) => {
    try {
      // Check cache first
      const now = Date.now();
      if (cache.popular && now - cache.popularTimestamp < CACHE_EXPIRY) {
        console.log('Using cached popular books');
        return cache.popular;
      }

      // Use a different subject for popular books
      const requestLimit = Math.min(100, limit * 3);
      const response = await openLibraryAPI.get(`/subjects/popular.json?limit=${requestLimit}`);

      if (!response.data || !response.data.works) {
        return [];
      }

      // Process and filter books
      const books = response.data.works.map(work => processBookData(work, 'popular'));
      const processedBooks = filterAndSortBooks(books, limit);

      // Update cache
      cache.popular = processedBooks;
      cache.popularTimestamp = now;

      return processedBooks;
    } catch (error) {
      console.error('Error fetching popular books:', error);

      if (cache.popular) {
        return cache.popular;
      }

      return [];
    }
  },

  /**
   * Get New York Times bestsellers
   */
  getNytBestsellers: async (limit = 20) => {
    try {
      // Check cache first
      const now = Date.now();
      if (cache.nytBestsellers && now - cache.nytTimestamp < CACHE_EXPIRY) {
        console.log('Using cached NYT bestsellers');
        return cache.nytBestsellers;
      }

      // Fetch New York Times bestsellers
      const requestLimit = Math.min(100, limit * 3);
      const response = await openLibraryAPI.get(`/subjects/new_york_times_bestseller.json?limit=${requestLimit}`);

      if (!response.data || !response.data.works) {
        return [];
      }

      // Process and filter books
      const books = response.data.works.map(work => processBookData(work, 'nyt_bestseller'));
      const processedBooks = filterAndSortBooks(books, limit);

      // Update cache
      cache.nytBestsellers = processedBooks;
      cache.nytTimestamp = now;

      return processedBooks;
    } catch (error) {
      console.error('Error fetching NYT bestsellers:', error);

      if (cache.nytBestsellers) {
        return cache.nytBestsellers;
      }

      return [];
    }
  },

  /**
   * Get award-winning books
   */
  getAwardWinners: async (limit = 20) => {
    try {
      // Check cache first
      const now = Date.now();
      if (cache.awardWinners && now - cache.awardsTimestamp < CACHE_EXPIRY) {
        console.log('Using cached award winners');
        return cache.awardWinners;
      }

      // Fetch award-winning books
      const requestLimit = Math.min(100, limit * 3);
      const response = await openLibraryAPI.get(`/subjects/awards.json?limit=${requestLimit}`);

      if (!response.data || !response.data.works) {
        return [];
      }

      // Process and filter books
      const books = response.data.works.map(work => processBookData(work, 'award_winner'));
      const processedBooks = filterAndSortBooks(books, limit);

      // Update cache
      cache.awardWinners = processedBooks;
      cache.awardsTimestamp = now;

      return processedBooks;
    } catch (error) {
      console.error('Error fetching award-winning books:', error);

      if (cache.awardWinners) {
        return cache.awardWinners;
      }

      return [];
    }
  },

  /**
   * Get recently published books
   */
  getRecentBooks: async (limit = 20) => {
    try {
      // Check cache first
      const now = Date.now();
      if (cache.recentBooks && now - cache.recentTimestamp < CACHE_EXPIRY) {
        console.log('Using cached recent books');
        return cache.recentBooks;
      }

      // Fetch a large set of books and filter by publication year
      const requestLimit = Math.min(150, limit * 5); // Need more books to filter effectively
      const response = await openLibraryAPI.get(`/subjects/accessible_book.json?limit=${requestLimit}`);

      if (!response.data || !response.data.works) {
        return [];
      }

      // Map to our format
      const allBooks = response.data.works.map(work => processBookData(work, 'recent'));

      // Filter for books published in the last 5 years
      const currentYear = new Date().getFullYear();
      const recentYearThreshold = currentYear - 5;

      let recentBooks = allBooks.filter(book => 
        book.year && book.year >= recentYearThreshold && book.cover !== null
      );

      // If we don't have enough recent books, expand the range
      if (recentBooks.length < limit) {
        recentBooks = allBooks.filter(book => 
          book.year && book.year >= (currentYear - 10) && book.cover !== null
        );
      }

      // Sort by year (descending) and then by rating
      recentBooks.sort((a, b) => {
        // First by year (newest first)
        if (b.year !== a.year) {
          return b.year - a.year;
        }
        // Then by rating
        return b.rating - a.rating;
      });

      // Take only what we need
      const processedBooks = recentBooks.slice(0, limit);

      // Update cache
      cache.recentBooks = processedBooks;
      cache.recentTimestamp = now;

      return processedBooks;
    } catch (error) {
      console.error('Error fetching recent books:', error);

      if (cache.recentBooks) {
        return cache.recentBooks;
      }

      return [];
    }
  },

  /**
   * Get book details from OpenLibrary by ID
   */
  getBookDetails: async (bookId) => {
    try {
      // Check if bookId is one of our special routes
      if (['genres', 'genre', 'latest', 'popular', 'search'].includes(bookId)) {
        throw new Error(`Invalid book ID: ${bookId} is a reserved route name`);
      }

      // Format the work ID if needed
      let workId = bookId;
      if (!workId.includes('/')) {
        // If the ID doesn't include a slash, assume it's a works ID
        if (!workId.startsWith('OL')) {
          workId = `OL${workId}`;
        }
        if (!workId.endsWith('W')) {
          workId = `${workId}W`;
        }
      }

      // Make sure we're requesting the JSON format
      if (!workId.endsWith('.json')) {
        workId = `${workId}.json`;
      }

      // Remove any leading slash
      workId = workId.replace(/^\//, '');

      const url = workId.includes('/') ? workId : `works/${workId}`;
      console.log(`Fetching book details from: ${url}`);

      // Get work details
      const workResponse = await openLibraryAPI.get(`/${url}`);

      // Process response
      const bookData = workResponse.data;

      // Create standard format object
      const bookDetails = {
        id: bookId,
        title: bookData.title,
        author: 'Unknown Author', // Will be updated if author info is available
        overview: typeof bookData.description === 'object' 
          ? bookData.description.value 
          : (bookData.description || ''),
        cover: null,
        releaseDate: bookData.first_publish_date || null,
        year: bookData.first_publish_year || null,
        genres: bookData.subjects ? bookData.subjects.slice(0, 5) : [],
        rating: bookData.ratings_average || 0,
        ratings_count: bookData.ratings_count || 0
      };

      // Get cover if available
      if (bookData.covers && bookData.covers.length > 0) {
        bookDetails.cover = `https://covers.openlibrary.org/b/id/${bookData.covers[0]}-L.jpg`;
      }

      // Get author information if available
      if (bookData.authors && bookData.authors.length > 0) {
        try {
          const authorKey = bookData.authors[0].author.key;
          if (authorKey) {
            // OpenLibrary author keys start with /authors/
            const authorResponse = await openLibraryAPI.get(`${authorKey}.json`);
            bookDetails.author = authorResponse.data.name;
          }
        } catch (authorError) {
          console.error('Error fetching author information:', authorError);
          // Continue with unknown author
        }
      }

      return bookDetails;
    } catch (error) {
      console.error('Error getting book details from OpenLibrary:', error);
      throw error;
    }
  }
};