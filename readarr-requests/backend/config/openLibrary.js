// backend/config/openLibrary.js
const axios = require('axios');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

/**
 * Open Library API service with enhanced cover support
 */
class OpenLibraryAPI {
  constructor() {
    this.baseUrl = 'https://openlibrary.org';
    this.coversUrl = 'https://covers.openlibrary.org';
    this.apiUrl = 'https://openlibrary.org/api';
    this.genresList = [
      { id: 'fiction', name: 'Fiction' },
      { id: 'nonfiction', name: 'Non-Fiction' },
      { id: 'mystery', name: 'Mystery' },
      { id: 'romance', name: 'Romance' },
      { id: 'science_fiction', name: 'Science Fiction' },
      { id: 'fantasy', name: 'Fantasy' },
      { id: 'biography', name: 'Biography' },
      { id: 'history', name: 'History' },
      { id: 'horror', name: 'Horror' },
      { id: 'thriller', name: 'Thriller' },
      { id: 'young_adult', name: 'Young Adult' },
      { id: 'childrens', name: 'Children\'s' },
      { id: 'poetry', name: 'Poetry' },
      { id: 'classics', name: 'Classics' },
      { id: 'self_help', name: 'Self-Help' }
    ];
  }

  /**
   * Get genres list
   * @returns {Array} - List of genres
   */
  getGenres() {
    return this.genresList;
  }

  /**
   * Search books in Open Library
   * @param {string} query - Search query
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} - Array of books
   */
  async searchBooks(query, limit = 20) {
    try {
      const cacheKey = `search_${query}_${limit}`;
      const cachedResults = cache.get(cacheKey);
      
      if (cachedResults) {
        return cachedResults;
      }
      
      const response = await axios.get(`${this.baseUrl}/search.json`, {
        params: {
          q: query,
          limit: limit * 2 // Request more to ensure enough good results
        }
      });
      
      const books = response.data.docs
        .filter(book => book.title && (book.author_name || book.author_key))
        .map(book => this.mapOpenLibraryData(book))
        .slice(0, limit);
      
      cache.set(cacheKey, books);
      return books;
    } catch (error) {
      console.error('Error searching Open Library:', error);
      return [];
    }
  }

  /**
   * Get book details from Open Library
   * @param {string} id - Open Library ID
   * @returns {Promise<Object>} - Book details
   */
  async getBookDetails(id) {
    try {
      const cacheKey = `details_${id}`;
      const cachedDetails = cache.get(cacheKey);
      
      if (cachedDetails) {
        return cachedDetails;
      }
      
      // Remove any prefix
      const bookId = id.startsWith('ol-') ? id.substring(3) : id;
      
      let response;
      
      // Try works endpoint first
      if (bookId.toLowerCase().includes('w')) {
        response = await axios.get(`${this.baseUrl}/works/${bookId}.json`);
      } 
      // Try editions endpoint if not a work
      else if (bookId.toLowerCase().includes('m')) {
        response = await axios.get(`${this.baseUrl}/books/${bookId}.json`);
      }
      // Otherwise try by ISBN
      else {
        response = await axios.get(`${this.baseUrl}/isbn/${bookId}.json`);
      }
      
      const details = response.data;
      
      // Get author details if needed
      let authorName = '';
      if (details.authors && details.authors.length > 0) {
        try {
          // Get first author's details
          const authorKey = details.authors[0].author.key;
          const authorResponse = await axios.get(`${this.baseUrl}${authorKey}.json`);
          authorName = authorResponse.data.name;
        } catch (authorError) {
          console.error('Error fetching author details:', authorError);
        }
      }
      
      // Create cover URL
      let coverUrl = null;
      if (details.covers && details.covers.length > 0) {
        coverUrl = `${this.coversUrl}/b/id/${details.covers[0]}-L.jpg`;
      }
      
      // Process descriptions
      let description = '';
      if (details.description) {
        description = typeof details.description === 'object' ? 
          details.description.value : details.description;
      }
      
      // Map to standard format
      const book = {
        id: `ol-${bookId}`,
        title: details.title,
        author: authorName || (details.author_name ? details.author_name[0] : 'Unknown'),
        overview: description,
        cover: coverUrl,
        rating: details.ratings_average || null,
        year: details.first_publish_date ? parseInt(details.first_publish_date) : null,
        genres: details.subjects ? details.subjects.slice(0, 5) : [],
        isbn: details.isbn_13 ? details.isbn_13[0] : (details.isbn_10 ? details.isbn_10[0] : null),
        pageCount: details.number_of_pages || null,
        publisher: details.publishers ? details.publishers[0] : null,
        language: details.language ? details.language.key : null,
        source: 'openLibrary',
        olid: bookId
      };
      
      cache.set(cacheKey, book);
      return book;
    } catch (error) {
      console.error(`Error fetching book details for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get books by genre
   * @param {string} genre - Genre ID
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} - Array of books
   */
  async getBooksByGenre(genre, limit = 20) {
    try {
      const cacheKey = `genre_${genre}_${limit}`;
      const cachedResults = cache.get(cacheKey);
      
      if (cachedResults) {
        return cachedResults;
      }
      
      const response = await axios.get(`${this.baseUrl}/subjects/${genre}.json`, {
        params: {
          limit: limit * 2 // Request more to filter better results
        }
      });
      
      if (!response.data.works || !Array.isArray(response.data.works)) {
        return [];
      }
      
      // Process books and add cover URLs
      const books = await Promise.all(
        response.data.works
          .filter(work => work.title && work.authors && work.authors.length > 0)
          .map(async work => {
            let coverUrl = null;
            
            // Get cover if available
            if (work.cover_id) {
              coverUrl = `${this.coversUrl}/b/id/${work.cover_id}-L.jpg`;
            } else if (work.cover_edition_key) {
              coverUrl = `${this.coversUrl}/b/olid/${work.cover_edition_key}-L.jpg`;
            }
            
            // Check for ISBN and get better cover if possible
            let isbn = null;
            if (work.cover_edition_key) {
              try {
                const editionResponse = await axios.get(`${this.baseUrl}/books/${work.cover_edition_key}.json`);
                if (editionResponse.data.isbn_13) {
                  isbn = editionResponse.data.isbn_13[0];
                  // Use ISBN for cover if we have it (typically better quality)
                  coverUrl = `${this.coversUrl}/b/isbn/${isbn}-L.jpg`;
                } else if (editionResponse.data.isbn_10) {
                  isbn = editionResponse.data.isbn_10[0];
                  coverUrl = `${this.coversUrl}/b/isbn/${isbn}-L.jpg`;
                }
              } catch (error) {
                // Continue if edition fetch fails
              }
            }
            
            // Extract year from first_publish_date
            let year = null;
            if (work.first_publish_date) {
              const yearMatch = work.first_publish_date.match(/\d{4}/);
              if (yearMatch) {
                year = parseInt(yearMatch[0]);
              }
            }
            
            return {
              id: `ol-${work.key.split('/').pop()}`,
              title: work.title,
              author: work.authors[0].name,
              overview: work.description ? 
                (typeof work.description === 'object' ? work.description.value : work.description) : '',
              cover: coverUrl,
              rating: work.ratings_average || null,
              year,
              genres: [genre],
              source: 'openLibrary',
              olid: work.key.split('/').pop(),
              isbn
            };
          })
      );
      
      // Filter out books without covers and limit results
      const booksWithCovers = books
        .filter(book => book.cover !== null)
        .slice(0, limit);
      
      cache.set(cacheKey, booksWithCovers);
      return booksWithCovers;
    } catch (error) {
      console.error(`Error fetching books for genre ${genre}:`, error);
      return [];
    }
  }

  /**
   * Get popular books from Open Library
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} - Array of books
   */
  async getPopularBooks(limit = 20) {
    try {
      const cacheKey = `popular_${limit}`;
      const cachedResults = cache.get(cacheKey);
      
      if (cachedResults) {
        return cachedResults;
      }
      
      // We'll get "most read" books from OpenLibrary
      const response = await axios.get(`${this.baseUrl}/trending/daily.json`, {
        params: {
          limit: limit * 2
        }
      });
      
      // Process the book data
      const books = response.data.works
        .filter(work => work.title && work.author_name)
        .map(work => {
          // Generate cover URL if cover_i exists
          let coverUrl = null;
          if (work.cover_i) {
            coverUrl = `${this.coversUrl}/b/id/${work.cover_i}-L.jpg`;
          } else if (work.cover_edition_key) {
            coverUrl = `${this.coversUrl}/b/olid/${work.cover_edition_key}-L.jpg`;
          }
          
          // Extract year from first_publish_year
          let year = work.first_publish_year || null;
          
          return {
            id: `ol-${work.key.split('/').pop()}`,
            title: work.title,
            author: work.author_name[0],
            cover: coverUrl,
            rating: work.ratings_average || null,
            year,
            genres: work.subject ? work.subject.slice(0, 5) : [],
            source: 'openLibrary',
            olid: work.key.split('/').pop()
          };
        })
        .slice(0, limit);
      
      cache.set(cacheKey, books);
      return books;
    } catch (error) {
      console.error('Error fetching popular books from Open Library:', error);
      return [];
    }
  }

  /**
   * Get trending books from Open Library
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} - Array of books
   */
  async getTrendingBooks(limit = 20) {
    try {
      const cacheKey = `trending_${limit}`;
      const cachedResults = cache.get(cacheKey);
      
      if (cachedResults) {
        return cachedResults;
      }
      
      // Get trending weekly books from OpenLibrary
      const response = await axios.get(`${this.baseUrl}/trending/weekly.json`, {
        params: {
          limit: limit * 2
        }
      });
      
      // Process the book data
      const books = response.data.works
        .filter(work => work.title && work.author_name)
        .map(work => {
          // Generate cover URL if cover_i exists
          let coverUrl = null;
          if (work.cover_i) {
            coverUrl = `${this.coversUrl}/b/id/${work.cover_i}-L.jpg`;
          } else if (work.cover_edition_key) {
            coverUrl = `${this.coversUrl}/b/olid/${work.cover_edition_key}-L.jpg`;
          }
          
          // Extract year from first_publish_year
          let year = work.first_publish_year || null;
          
          return {
            id: `ol-${work.key.split('/').pop()}`,
            title: work.title,
            author: work.author_name[0],
            cover: coverUrl,
            rating: work.ratings_average || null,
            year,
            genres: work.subject ? work.subject.slice(0, 5) : [],
            source: 'openLibrary',
            olid: work.key.split('/').pop()
          };
        })
        .slice(0, limit);
      
      cache.set(cacheKey, books);
      return books;
    } catch (error) {
      console.error('Error fetching trending books from Open Library:', error);
      return [];
    }
  }

  /**
   * Get recent books from Open Library
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} - Array of books
   */
  async getRecentBooks(limit = 20) {
    try {
      const cacheKey = `recent_${limit}`;
      const cachedResults = cache.get(cacheKey);
      
      if (cachedResults) {
        return cachedResults;
      }
      
      // Get current year
      const currentYear = new Date().getFullYear();
      
      // Get books published in last 2 years
      const response = await axios.get(`${this.baseUrl}/search.json`, {
        params: {
          q: `publishDate:${currentYear - 2} OR publishDate:${currentYear - 1} OR publishDate:${currentYear}`,
          limit: limit * 2,
          sort: 'new'
        }
      });
      
      // Process the book data
      const books = response.data.docs
        .filter(book => book.title && (book.author_name || book.author_key))
        .map(book => this.mapOpenLibraryData(book))
        .slice(0, limit);
      
      cache.set(cacheKey, books);
      return books;
    } catch (error) {
      console.error('Error fetching recent books from Open Library:', error);
      return [];
    }
  }

  /**
   * Get award-winning books from Open Library
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} - Array of books
   */
  async getAwardWinners(limit = 20) {
    try {
      const cacheKey = `awards_${limit}`;
      const cachedResults = cache.get(cacheKey);
      
      if (cachedResults) {
        return cachedResults;
      }
      
      // We'll search for specific award terms
      const awardTerms = [
        'pulitzer prize',
        'booker prize',
        'national book award',
        'hugo award',
        'nebula award'
      ];
      
      // Make parallel requests for each award type
      const requests = awardTerms.map(term => 
        axios.get(`${this.baseUrl}/search.json`, {
          params: {
            q: term,
            limit: Math.ceil(limit / awardTerms.length) * 2
          }
        })
      );
      
      const responses = await Promise.all(requests);
      
      // Combine and process results
      let allBooks = [];
      responses.forEach((response, index) => {
        const awardBooks = response.data.docs
          .filter(book => book.title && (book.author_name || book.author_key))
          .map(book => {
            const mappedBook = this.mapOpenLibraryData(book);
            // Add award info
            mappedBook.awards = [awardTerms[index]];
            return mappedBook;
          });
        
        allBooks = [...allBooks, ...awardBooks];
      });
      
      // Deduplicate books (same book might win multiple awards)
      const uniqueBooks = [];
      const bookIds = new Set();
      
      allBooks.forEach(book => {
        if (!bookIds.has(book.id)) {
          uniqueBooks.push(book);
          bookIds.add(book.id);
        }
      });
      
      // Sort by rating and limit results
      const sortedBooks = uniqueBooks
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, limit);
      
      cache.set(cacheKey, sortedBooks);
      return sortedBooks;
    } catch (error) {
      console.error('Error fetching award winners from Open Library:', error);
      return [];
    }
  }

  /**
   * Map OpenLibrary search data to standard book format
   * @param {Object} data - OpenLibrary book data
   * @returns {Object} - Standardized book object
   */
  mapOpenLibraryData(data) {
    // Generate cover URL if cover_i exists
    let coverUrl = null;
    if (data.cover_i) {
      coverUrl = `${this.coversUrl}/b/id/${data.cover_i}-L.jpg`;
    } else if (data.cover_edition_key) {
      coverUrl = `${this.coversUrl}/b/olid/${data.cover_edition_key}-L.jpg`;
    } else if (data.isbn && data.isbn.length > 0) {
      coverUrl = `${this.coversUrl}/b/isbn/${data.isbn[0]}-L.jpg`;
    }
    
    // Extract year from first_publish_year or publish_year
    let year = null;
    if (data.first_publish_year) {
      year = data.first_publish_year;
    } else if (data.publish_year && data.publish_year.length > 0) {
      year = Math.max(...data.publish_year);
    } else if (data.publish_date) {
      const yearMatch = data.publish_date.match(/\d{4}/);
      if (yearMatch) {
        year = parseInt(yearMatch[0]);
      }
    }
    
    const workKey = data.key ? data.key.split('/').pop() : '';
    
    return {
      id: `ol-${workKey}`,
      title: data.title,
      author: data.author_name ? data.author_name[0] : 'Unknown',
      cover: coverUrl,
      rating: data.ratings_average || null,
      year,
      genres: data.subject ? data.subject.slice(0, 5) : [],
      source: 'openLibrary',
      olid: workKey,
      isbn: data.isbn ? data.isbn[0] : null
    };
  }

  /**
   * Get high-quality cover URL for a book by ISBN
   * @param {string} isbn - ISBN number
   * @returns {string|null} - Cover URL or null if not found
   */
  getCoverByISBN(isbn) {
    if (!isbn) return null;
    
    // Clean ISBN - keep only digits and X
    const cleanIsbn = isbn.replace(/[^0-9X]/g, '');
    
    // Return large cover URL
    return `${this.coversUrl}/b/isbn/${cleanIsbn}-L.jpg`;
  }

  /**
   * Get high-quality cover URL for a book by OpenLibrary ID
   * @param {string} olid - OpenLibrary ID
   * @returns {string|null} - Cover URL or null if not found
   */
  getCoverByOLID(olid) {
    if (!olid) return null;
    
    // Return large cover URL
    return `${this.coversUrl}/b/olid/${olid}-L.jpg`;
  }

  /**
   * Get high-quality cover URL for a book by cover ID
   * @param {number} coverId - Cover ID
   * @returns {string|null} - Cover URL or null if not found
   */
  getCoverById(coverId) {
    if (!coverId) return null;
    
    // Return large cover URL
    return `${this.coversUrl}/b/id/${coverId}-L.jpg`;
  }
}

module.exports = new OpenLibraryAPI();