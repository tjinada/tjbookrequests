// backend/config/openLibrary.js
const axios = require('axios');

// Create axios instance for OpenLibrary
const openLibraryAPI = axios.create({
  baseURL: 'https://openlibrary.org',
  timeout: 10000,
});

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
  'classics': 'classics'
};

// Simple in-memory cache for API responses
const cache = {
  genres: {},
  trending: null,
  trendingTimestamp: 0,
  popularTimestamp: 0,
  genreTimestamps: {}
};

// Cache expiration time (4 hours in milliseconds)
const CACHE_EXPIRY = 4 * 60 * 60 * 1000;

module.exports = {
  /**
   * Get trending books from OpenLibrary
   */
  getGenres: () => {
    return Object.keys(genres).map(key => ({
      id: key,
      name: key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }));
  },

  /**
   * Get books by genre using the subjects API with sorting
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
      const requestLimit = Math.min(100, limit * 5);
  
      // Use the subjects API - for newer books we don't sort by editions
      // as that tends to favor classics
      const response = await openLibraryAPI.get(`/subjects/${subjectKey}.json?limit=${requestLimit}`);
  
      // Check for valid response
      if (!response.data || !response.data.works || !Array.isArray(response.data.works)) {
        console.error(`Invalid response for genre ${genre}:`, response.data);
        return [];
      }
  
      // Map to consistent format and filter for better quality data
      let books = response.data.works.map(work => {
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
          genre: genre,
          editions_count: work.edition_count || 0,
          rating: work.ratings_average || 0,
          ratings_count: work.ratings_count || 0
        };
      });
  
      // Filter out books with no cover image (improves quality)
      books = books.filter(book => book.cover !== null);
  
      // Filter for more recent books (at least from 1990 onward)
      // but keep some classics too (don't filter too aggressively)
      const currentYear = new Date().getFullYear();
  
      // First, try to get books from last 30 years
      let recentBooks = books.filter(book => 
        book.year && book.year >= (currentYear - 30)
      );
  
      // If we got enough recent books, use those
      if (recentBooks.length >= limit / 2) {
        books = recentBooks;
      } else {
        // Otherwise, just make sure we have at least some recent books
        // by sorting to prioritize newer books with higher ratings
        console.log(`Not enough recent books for ${genre}, using mixed results`);
      }
  
      // Sort by a combination of ratings, year, and edition count
      books.sort((a, b) => {
        // Scoring system:
        // 1. Rating is most important (0-5 points)
        // 2. Recent publication bonus (0-3 points)
        // 3. Popularity/editions tiebreaker (0-2 points)
  
        // Start with the raw rating (0-5)
        let scoreA = a.rating || 0;
        let scoreB = b.rating || 0;
  
        // Add recency bonus - max 3 points for books published in the last 5 years
        const recentYearThreshold = currentYear - 5;
        if (a.year && a.year >= recentYearThreshold) {
          scoreA += 3;
        } else if (a.year && a.year >= currentYear - 15) {
          scoreA += 2; // Some bonus for books from last 15 years
        } else if (a.year && a.year >= currentYear - 30) {
          scoreA += 1; // Small bonus for books from last 30 years
        }
  
        if (b.year && b.year >= recentYearThreshold) {
          scoreB += 3;
        } else if (b.year && b.year >= currentYear - 15) {
          scoreB += 2;
        } else if (b.year && b.year >= currentYear - 30) {
          scoreB += 1;
        }
  
        // Add popularity bonus (based on edition count)
        if (a.editions_count > 50) scoreA += 1;
        if (a.editions_count > 100) scoreA += 1;
        if (b.editions_count > 50) scoreB += 1;
        if (b.editions_count > 100) scoreB += 1;
  
        // Sort descending by total score
        return scoreB - scoreA;
      });
  
      // Take only the requested number of books
      books = books.slice(0, limit);
  
      console.log(`Returning ${books.length} ${genre} books after filtering and sorting`);
  
      // Update cache
      cache.genres[genre] = books;
      cache.genreTimestamps[genre] = now;
  
      return books;
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
  
  getTrendingBooks: async () => {
    try {
      // Get trending books from OpenLibrary
      const response = await openLibraryAPI.get('/trending/daily.json');

      // Map the response to a consistent format
      const books = await Promise.all(
        response.data.works.slice(0, 20).map(async (work) => {
          // Get cover if available
          let coverUrl = null;
          if (work.cover_i) {
            coverUrl = `https://covers.openlibrary.org/b/id/${work.cover_i}-L.jpg`;
          }

          // Format author names
          const authorNames = work.author_name ? work.author_name.join(', ') : 'Unknown Author';

          return {
            id: work.key.replace('/works/', ''),
            title: work.title,
            author: authorNames,
            overview: work.excerpt || work.description || '',
            cover: coverUrl,
            releaseDate: work.first_publish_year ? `${work.first_publish_year}-01-01` : null,
            olid: work.key,
            isbn: work.isbn ? work.isbn[0] : null
          };
        })
      );

      return books;
    } catch (error) {
      console.error('Error fetching trending books from OpenLibrary:', error);
      throw error;
    }
  },

  getPopularBooks: async () => {
    try {
      // Get popular books from OpenLibrary's subjects API
      const response = await openLibraryAPI.get('/subjects/fiction.json?limit=10');
      console.log("Getting Data");
      console.log(response.data.works);
  
      // Map to consistent format
      const books = response.data.works.map(work => {
        let coverUrl = null;
        if (work.cover_id) {
          coverUrl = `https://covers.openlibrary.org/b/id/${work.cover_id}-L.jpg`;
        }
  
        return {
          id: work.key.replace('/works/', ''),
          title: work.title,
          author: work.authors?.map(a => a.name).join(', ') || 'Unknown Author',
          overview: work.description || '',
          cover: coverUrl,
          releaseDate: work.first_publish_year ? `${work.first_publish_year}-01-01` : null,
          rating: work.ratings_average || 0
        };
      });
  
      return books;
    } catch (error) {
      console.error('Error fetching popular books from OpenLibrary:', error);
      throw error;
    }
  },

  /**
   * Search books in OpenLibrary
   */
  searchBooks: async (query) => {
    try {
      const response = await openLibraryAPI.get(`/search.json?q=${encodeURIComponent(query)}`);

      // Map the response to a consistent format
      const books = response.data.docs.slice(0, 30).map(book => {
        // Get cover if available
        let coverUrl = null;
        if (book.cover_i) {
          coverUrl = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
        }

        // Format author names
        const authorNames = book.author_name ? book.author_name.join(', ') : 'Unknown Author';

        return {
          id: book.key.replace('/works/', ''),
          title: book.title,
          author: authorNames,
          overview: book.excerpt || book.description || '',
          cover: coverUrl,
          releaseDate: book.first_publish_year ? `${book.first_publish_year}-01-01` : null,
          olid: book.key,
          isbn: book.isbn ? book.isbn[0] : null
        };
      });

      return books;
    } catch (error) {
      console.error('Error searching books from OpenLibrary:', error);
      throw error;
    }
  },

  /**
   * Get book details from OpenLibrary by ID
   */
  getBookDetails: async (bookId) => {
    try {
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
        genres: bookData.subjects ? bookData.subjects.slice(0, 5) : []
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